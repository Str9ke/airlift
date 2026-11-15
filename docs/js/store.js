// Persistence: localStorage + miroir natif (Android) + seed initial.
import { PROGRAM, EXTRA, EQUIP } from './program.js';

const KEY = 'airlift.v1';
const native = () => (typeof window !== 'undefined' && window.AirLiftNative) || null;

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

let state = null;
let saveTimer = null;
const listeners = new Set();

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function S() { return state; }

function emptyState() {
  return { version: 1, exercises: [], sessions: [], body: [], settings: { density: 'compact', theme: 'auto', breakDays: 45 }, meta: { created: new Date().toISOString() } };
}

export function normalizeExercise(e, i = 0) {
  const eq = EQUIP[e.equip] || EQUIP.machine;
  return {
    id: e.id || uid(), name: e.name || 'Exercice', category: e.category || 'Autre',
    equip: e.equip || 'machine', type: e.type || 'load',
    inc: e.inc ?? eq.inc, sets: e.sets ?? 3,
    repMin: e.repMin ?? 8, repMax: e.repMax ?? 12, timeMin: e.timeMin ?? 20, timeMax: e.timeMax ?? 45,
    days: e.days || [], active: e.active ?? false, order: e.order ?? 1000 + i,
    cue: e.cue || '', notes: e.notes || '', plan: e.plan || null,
  };
}

function mergeProgram(st) {
  const byId = new Map(st.exercises.map(e => [e.id, e]));
  PROGRAM.forEach((p, i) => {
    const cur = byId.get(p.id);
    if (cur) {
      if (!st.meta.programMerged) Object.assign(cur, { ...p, name: cur.name || p.name, active: true, order: i, inc: cur.inc ?? EQUIP[p.equip].inc });
    } else {
      st.exercises.push(normalizeExercise({ ...p, active: true, order: i }, i));
    }
  });
  if (!st.meta.extraMerged) EXTRA.forEach((p, i) => { if (!byId.has(p.id)) st.exercises.push(normalizeExercise({ ...p, active: false, order: 500 + i }, i)); });
  st.meta.extraMerged = true;
  st.meta.programMerged = true;
}

function fromSeed(seed) {
  const st = emptyState();
  st.exercises = (seed.exercises || []).map((e, i) => normalizeExercise({ ...e, active: false }, i));
  st.sessions = (seed.sessions || []).map(s => ({ id: uid(), date: s.date, note: s.note || '', approx: !!s.approx, source: s.source || 'xlsx', entries: s.entries.map(en => ({ ex: en.ex, sets: en.sets, raw: en.raw })) }));
  st.body = (seed.body || []).map(b => ({ id: uid(), ...b }));
  st.meta.seeded = new Date().toISOString();
  return st;
}

async function loadSeed() {
  const n = native();
  try { if (n && n.getSeed) { const t = n.getSeed(); if (t) return JSON.parse(t); } } catch (e) { console.warn(e); }
  try { const r = await fetch('seed.json', { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (e) { /* pas de seed public */ }
  return null;
}

export async function init() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  if (!raw) {
    const n = native();
    try { if (n && n.loadBackup) raw = n.loadBackup() || null; } catch (e) { /* ignore */ }
  }
  if (raw) {
    try { state = JSON.parse(raw); } catch (e) { state = null; }
  }
  if (!state) {
    const seed = await loadSeed();
    state = seed ? fromSeed(seed) : emptyState();
  }
  state.settings = { ...emptyState().settings, ...(state.settings || {}) };
  state.meta = state.meta || {};
  state.exercises = state.exercises.map(normalizeExercise);
  mergeProgram(state);
  sortSessions();
  persist(true);
  return state;
}

export function sortSessions() { state.sessions.sort((a, b) => a.date.localeCompare(b.date)); state.body.sort((a, b) => a.date.localeCompare(b.date)); }

export function persist(immediate = false) {
  const write = () => {
    const txt = JSON.stringify(state);
    try { localStorage.setItem(KEY, txt); } catch (e) { console.error('localStorage', e); }
    const n = native();
    try { if (n && n.saveBackup) n.saveBackup(txt); } catch (e) { /* ignore */ }
  };
  clearTimeout(saveTimer);
  if (immediate) write(); else saveTimer = setTimeout(write, 300);
}

export function commit() { sortSessions(); persist(); listeners.forEach(fn => fn(state)); }

export function exportJSON() { return JSON.stringify(state, null, 1); }

export function importJSON(txt) {
  let obj = JSON.parse(txt);
  if (!obj.exercises || !obj.sessions) throw new Error('Fichier non reconnu');
  if (!obj.settings) { obj = fromSeed(obj); mergeProgram(obj); } // fichier d'historique brut (seed.json)
  state = obj;
  state.exercises = state.exercises.map(normalizeExercise);
  commit();
  persist(true);
}

export function ex(id) { return state.exercises.find(e => e.id === id); }
