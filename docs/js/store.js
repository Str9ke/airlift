// Persistance : localStorage + miroir natif (Android) + synchro en ligne (sync.js) + seed initial.
//
// Règle d'or des mises à jour : TA configuration (exercices, ordre, jours, séries, réglages) est
// stockée dans tes données, jamais dans le code. Une nouvelle version de l'app ne la remplace pas :
// les évolutions passent par MIGRATIONS, exécutées une seule fois, qui ne font qu'AJOUTER
// (ex. un nouvel exercice proposé, rangé dans « anciens exercices ») sans écraser ce que tu as modifié.
import { PROGRAM, EXTRA, EQUIP, DEFAULT_DAYS, PREV_12 } from './program.js';
import * as sync from './sync.js';

const KEY = 'airlift.v1';
const native = () => (typeof window !== 'undefined' && window.AirLiftNative) || null;

export const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

let state = null;
let saveTimer = null;
const listeners = new Set();

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function S() { return state; }

function emptyState() {
  return {
    version: 2, exercises: [], sessions: [], body: [], templates: [], days: DEFAULT_DAYS.map(d => ({ ...d })), draft: null,
    settings: { density: 'compact', theme: 'auto', breakDays: 45, restSec: 120 },
    meta: { created: new Date().toISOString(), updatedAt: Date.now(), migrations: [] },
  };
}

const OLD_DAYS = { A: 'mar', BO: 'ven', B: 'dim' }; // jours de la 1.0.0

export function normalizeExercise(e, i = 0) {
  const eq = EQUIP[e.equip] || EQUIP.machine;
  return {
    id: e.id || uid(), name: e.name || 'Exercice', category: e.category || 'Autre',
    equip: e.equip || 'machine', type: e.type || 'load',
    inc: e.inc ?? eq.inc, sets: e.sets ?? 2,
    repMin: e.repMin ?? 8, repMax: e.repMax ?? 12, timeMin: e.timeMin ?? 20, timeMax: e.timeMax ?? 45,
    days: (e.days || []).map(d => OLD_DAYS[d] || d), active: e.active ?? false, order: e.order ?? 1000 + i,
    cue: e.cue || '', notes: e.notes || '', plan: e.plan || null, img: e.img ?? null,
    daySets: e.daySets || null, userEdited: !!e.userEdited, side: !!e.side, superset: !!e.superset,
  };
}

/** Première installation uniquement : applique le programme par défaut. */
function applyDefaultProgram(st) {
  const ids = new Set(PROGRAM.map(p => p.id));
  st.exercises.forEach(e => { if (!ids.has(e.id)) e.active = false; }); // ancien programme (1.0.0) rangé dans « anciens »
  const byId = new Map(st.exercises.map(e => [e.id, e]));
  PROGRAM.forEach((p, i) => {
    const cur = byId.get(p.id);
    if (cur) Object.assign(cur, { ...p, active: true, order: i, inc: EQUIP[p.equip].inc });
    else st.exercises.push(normalizeExercise({ ...p, active: true, order: i }, i));
  });
  EXTRA.forEach((p, i) => { if (!byId.has(p.id)) st.exercises.push(normalizeExercise({ ...p, active: false, order: 500 + i }, i)); });
  st.meta.programApplied = true;
  st.meta.migrations = MIGRATIONS.map(m => m.id); // déjà inclus dans le programme par défaut
}

// Ajoute un exercice seulement s'il n'existe pas (jamais d'écrasement).
// eslint-disable-next-line no-unused-vars
const addIfMissing = (st, p, active = false) => { if (!st.exercises.some(e => e.id === p.id)) st.exercises.push(normalizeExercise({ ...p, active, order: 900 })); };

// Évolutions futures du programme : { id: 'AAAA-MM-JJ-quoi', run(st) { addIfMissing(st, {...}) } }
const MIGRATIONS = [
  { id: '2026-11-16-programme-1.3', run(st) {
    // Applique le programme 1.3 aux exercices restés tels que la 1.2 les avait configurés ; ceux que tu as modifiés ne bougent pas.
    const byId = new Map(st.exercises.map(e => [e.id, e]));
    const untouched = e => { const pv = PREV_12[e.id]; return !e.userEdited && pv && e.sets === pv[0] && e.days.join(',') === pv[1]; };
    PROGRAM.forEach((p, i) => {
      const cur = byId.get(p.id);
      if (!cur) st.exercises.push(normalizeExercise({ ...p, active: true, order: i }, i));
      else if (untouched(cur) || !cur.active) Object.assign(cur, { ...p, active: true, order: cur.active ? cur.order : 100 + i, inc: EQUIP[p.equip].inc, daySets: p.daySets || null });
    });
    const ids = new Set(PROGRAM.map(p => p.id));
    st.exercises.forEach(e => { if (e.active && !ids.has(e.id) && untouched(e)) e.active = false; });
    if (!st.meta.userOrdered) { const order = new Map(PROGRAM.map((p, i) => [p.id, i])); st.exercises.forEach(e => { if (order.has(e.id)) e.order = order.get(e.id); }); }
    EXTRA.forEach((p, i) => { if (!byId.has(p.id)) st.exercises.push(normalizeExercise({ ...p, active: false, order: 500 + i }, i)); });
  } },
];

MIGRATIONS.push({ id: '2026-11-16-programme-1.4', run(st) {
  const P = new Map(PROGRAM.map(p => [p.id, p]));
  const byId = new Map(st.exercises.map(e => [e.id, e]));
  for (const id of ['deltoide-lateral', 'psoas-march', 'pallof-press']) { const e = byId.get(id); if (e) e.side = true; }
  const sq = byId.get('squat'); if (sq && !sq.userEdited) { sq.daySets = null; sq.cue = P.get('squat').cue; }
  const iso = byId.get('iso-deltoide-90'); if (iso && !iso.userEdited) Object.assign(iso, { type: 'load_time', timeMin: 20, timeMax: 40, cue: P.get('iso-deltoide-90').cue });
  if (!byId.has('tenue-barre-1-main')) st.exercises.push(normalizeExercise({ ...P.get('tenue-barre-1-main'), active: true, order: 1.5 }));
  if (!st.meta.userOrdered) { const order = new Map(PROGRAM.map((p, i) => [p.id, i])); st.exercises.forEach(e => { if (order.has(e.id)) e.order = order.get(e.id); }); }
} });

MIGRATIONS.push({ id: '2026-11-16-programme-1.5', run(st) {
  const P = new Map(PROGRAM.map(p => [p.id, p]));
  DEFAULT_DAYS.forEach(d => { if (!st.days.some(x => x.id === d.id)) st.days.push({ ...d }); });
  const byId = new Map(st.exercises.map(e => [e.id, e]));
  for (const p of PROGRAM) {
    const e = byId.get(p.id);
    if (!e) { st.exercises.push(normalizeExercise({ ...p, active: true, order: 200 })); continue; }
    if (e.userEdited) continue; // ta configuration prime
    Object.assign(e, { superset: !!p.superset, side: !!p.side, days: p.days.slice(), cue: p.cue || e.cue, category: p.category, active: true });
  }
  const m90 = byId.get('maintien-jambes-90'); if (m90 && !m90.userEdited) m90.active = false; // redondant avec le tuck hold (plus spécifique)
  if (!st.meta.userOrdered) { const order = new Map(PROGRAM.map((p, i) => [p.id, i])); st.exercises.forEach(e => { if (order.has(e.id)) e.order = order.get(e.id); }); }
  EXTRA.forEach((p, i) => { if (!byId.has(p.id)) st.exercises.push(normalizeExercise({ ...p, active: false, order: 500 + i }, i)); });
} });

MIGRATIONS.push({ id: '2026-11-17-sans-jeudi', run(st) {
  // demandé : plus de journée mobilité du jeudi (s'applique même aux exercices modifiés)
  st.days = st.days.filter(d => d.id !== 'jeu');
  for (const e of st.exercises) {
    if (!e.days.includes('jeu')) continue;
    e.days = e.days.filter(d => d !== 'jeu');
    if (e.daySets) delete e.daySets.jeu;
    if (!e.days.length) e.active = false;
  }
} });

MIGRATIONS.push({ id: '2026-11-19-mollets', run(st) {
  const p = EXTRA.find(x => x.id === 'mollets-pointe');
  if (p) addIfMissing(st, p, false); // créé, disponible (séance personnalisée, ajout à un jour), pas imposé dans le programme
} });

// Corrections de données importées du tableur (appliquées une fois, quelle que soit la version de départ).
const DATA_FIXES = [
  { id: 'custom-memo-2026-11-20', run(st) {
    // les séances personnalisées faites avant la 1.10 deviennent « Séance custom 1, 2… »
    st.templates = Array.isArray(st.templates) ? st.templates : [];
    for (const s of st.sessions) {
      if (s.source !== 'app' || s.day || s.tpl || s.date < '2026-11-19') continue;
      const ex = s.entries.map(e => e.ex);
      const same = st.templates.find(t => t.ex.length === ex.length && t.ex.every(x => ex.includes(x)));
      if (same) { s.tpl = same.id; continue; }
      const t = { id: 'tpl' + Math.random().toString(36).slice(2, 9), name: `Séance custom ${st.templates.length + 1}`, ex, created: s.date, used: s.date };
      st.templates.push(t); s.tpl = t.id;
    }
  } },
  { id: 'xlsx-2026-11-16', run(st) {
    const find = (date, ex) => { for (const s of st.sessions) if (s.date === date) { const en = s.entries.find(x => x.ex === ex); if (en) return { s, en }; } return null; };
    const move = (date, from, to) => { const f = find(date, from); if (!f) return; if (f.s.entries.some(x => x.ex === to)) f.s.entries.find(x => x.ex === to).sets.push(...f.en.sets); else f.s.entries.push({ ...f.en, ex: to }); f.s.entries = f.s.entries.filter(x => x !== f.en); };
    move('2022-10-07', 'tractions', 'tirage-vertical-poulie');   // « 57x10 » = tirage machine, pas 57 kg de lest
    move('2011-10-20', 'squat-1-pied', 'chaise-quadriceps');      // « (90x15) ext » = leg extension
    ['2020-03-13', '2020-03-17'].forEach(d => { const f = find(d, 'tirage-vertical-poulie'); if (f) f.en.sets = [{ w: 80, r: 10 }]; }); // « 80x80x10 »
    const v = find('2012-06-08', 'obliques-inclines');            // « 47.85 ml/o2/kg » = VO2max, pas des reps
    if (v) { v.s.entries = v.s.entries.filter(x => x !== v.en); v.s.note = [v.s.note, 'VO2max 47,85 ml/kg/min'].filter(Boolean).join(' · '); }
  } },
];

function migrate(st) {
  st.meta = st.meta || {};
  st.days = st.days?.length ? st.days : DEFAULT_DAYS.map(d => ({ ...d }));
  st.settings = { ...emptyState().settings, ...(st.settings || {}) };
  st.exercises = (st.exercises || []).map(normalizeExercise);
  st.sessions = st.sessions || []; st.body = st.body || [];
  if (!st.meta.programApplied) applyDefaultProgram(st);
  const done = new Set(st.meta.migrations || []);
  for (const m of MIGRATIONS) if (!done.has(m.id)) { m.run(st); done.add(m.id); }
  st.meta.migrations = [...done];
  const fx = new Set(st.meta.fixes || []);
  for (const f of DATA_FIXES) if (!fx.has(f.id)) { f.run(st); fx.add(f.id); }
  st.meta.fixes = [...fx];
  if (st.draft === undefined) st.draft = null;
  if (!Array.isArray(st.templates)) st.templates = [];
  return st;
}

function fromSeed(seed) {
  const st = emptyState();
  st.exercises = (seed.exercises || []).map((e, i) => normalizeExercise({ ...e, active: false }, i));
  st.sessions = (seed.sessions || []).map(s => ({ id: uid(), date: s.date, note: s.note || '', approx: !!s.approx, source: s.source || 'xlsx', entries: s.entries.map(en => ({ ex: en.ex, sets: en.sets, raw: en.raw })) }));
  st.body = (seed.body || []).map(b => ({ id: uid(), ...b }));
  st.meta.seeded = new Date().toISOString();
  st.meta.updatedAt = 1; // un seed ne doit jamais l'emporter sur une sauvegarde en ligne
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
  const before = JSON.stringify([state.meta?.migrations, state.meta?.fixes]);
  migrate(state);
  sortSessions();
  // une mise à jour a modifié tes données (programme, corrections) → on l'enregistre aussi en ligne
  if (state.meta.programApplied && before !== JSON.stringify([state.meta.migrations, state.meta.fixes]) && before !== '[null,null]') persist(true); else write();
  return state;
}

/** Récupère la sauvegarde en ligne si elle est plus récente (autre téléphone, réinstallation…). */
export async function pullRemote() {
  const remote = await sync.pull();
  if (!remote || !remote.exercises) return false;
  if ((remote.meta?.updatedAt || 0) <= (state.meta.updatedAt || 0)) return false;
  state = migrate(remote);
  sortSessions();
  write(); // pas de push : on vient de recevoir la version en ligne
  listeners.forEach(fn => fn(state));
  return true;
}

export function sortSessions() { state.sessions.sort((a, b) => a.date.localeCompare(b.date)); state.body.sort((a, b) => a.date.localeCompare(b.date)); }

function write() {
  const txt = JSON.stringify(state);
  try { localStorage.setItem(KEY, txt); } catch (e) { console.error('localStorage', e); }
  const n = native();
  try { if (n && n.saveBackup) n.saveBackup(txt); } catch (e) { /* ignore */ }
  return txt;
}

/** Enregistre (local immédiatement après 300 ms) puis envoie en ligne. */
export function persist(immediate = false) {
  state.meta.updatedAt = Date.now();
  const go = () => { write(); sync.schedule(() => JSON.stringify(state)); };
  clearTimeout(saveTimer);
  if (immediate) go(); else saveTimer = setTimeout(go, 300);
}
export function flush() { if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; write(); } sync.flush(() => JSON.stringify(state)); }

export function commit() { sortSessions(); persist(); listeners.forEach(fn => fn(state)); }

export function exportJSON() { return JSON.stringify(state, null, 1); }

export function importJSON(txt) {
  let obj = JSON.parse(txt);
  if (!obj.exercises || !obj.sessions) throw new Error('Fichier non reconnu');
  if (!obj.settings) obj = fromSeed(obj); // fichier d'historique brut (seed.json)
  state = migrate(obj);
  commit();
  persist(true);
}

export function ex(id) { return state.exercises.find(e => e.id === id); }
export const dayOf = id => state.days.find(d => d.id === id);
