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
    ...e, // garde tous les champs propres à l'exercice (muscles, bloc, dosage, notes de série…)
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

MIGRATIONS.push({ id: '2026-11-21-mobilite-hanche', run(st) {
  const byId = new Map(st.exercises.map(e => [e.id, e]));
  // 1) exercices de mobilité de hanche + le bloc qui les regroupe
  EXTRA.filter(p => p.id.startsWith('mh-') || p.id === 'mobilite-hanche').forEach(p => { const e = byId.get(p.id); if (e) Object.assign(e, { items: p.items, dose: p.dose, type: p.type }); else addIfMissing(st, p, false); });
  // 2) flexion de hanche poulie : 2e série avec un angle ouvert (position du pied en board-off)
  const ps = byId.get('psoas-march');
  if (ps) {
    ps.setNotes = { 1: 'Série 2 : angle ouvert — genou dirigé ~30-45° vers l\'extérieur (rotation externe + légère abduction), comme la jambe avant pendant le board-off' };
    if (!/série 2/i.test(ps.cue || '')) ps.cue = (ps.cue ? ps.cue + ' · ' : '') + 'série 2 : angle ouvert vers l\'extérieur (position du board-off)';
    if ((ps.sets || 0) < 2) ps.sets = 2;
  }
  // 3) séance custom 1 : bloc mobilité juste avant le 1er exercice de board-off, plus de travail de jambes après
  const t = (st.templates || []).find(x => /custom 1$/i.test(x.name)) || (st.templates || [])[0];
  if (t && !t.ex.includes('mobilite-hanche')) {
    const BO = ['harnais-planche', 'strap-finding-drill', 'tucks-explosifs', 'tuck-hold', 'tenue-barre-1-main'];
    const LEGS = ['squat', 'deadlift', 'mollets-pointe', 'squat-1-pied', 'chaise-quadriceps', 'swing-kettlebell', 'arrache-epaule-jete', 'extension-dos'];
    let i = t.ex.findIndex(id => BO.includes(id)); if (i < 0) i = t.ex.length;
    const late = t.ex.slice(i).filter(id => LEGS.includes(id));
    t.ex = [...t.ex.slice(0, i), ...late, 'mobilite-hanche', ...t.ex.slice(i).filter(id => !late.includes(id))];
    if (t.sets && t.sets['psoas-march'] < 2) delete t.sets['psoas-march'];
  }
  // 4) mardi : squat et deadlift avant le board-off (plus de musculation des jambes après)
  const h = byId.get('harnais-planche');
  if (h?.active) {
    const firstBO = Math.min(...['harnais-planche', 'tenue-barre-1-main', 'strap-finding-drill', 'tucks-explosifs', 'tuck-hold'].map(id => byId.get(id)).filter(e => e?.active && e.days.includes('mar')).map(e => e.order));
    ['squat', 'deadlift'].forEach((id, k) => { const e = byId.get(id); if (e?.active && e.days.includes('mar') && e.order > firstBO) e.order = firstBO - 0.3 + k * 0.1; });
    st.exercises.filter(e => e.active).sort((a, b) => a.order - b.order).forEach((e, n) => { e.order = n; });
  }
} });

MIGRATIONS.push({ id: '2026-11-22-boardoff-assis', run(st) {
  const byId = new Map(st.exercises.map(e => [e.id, e]));
  const P = new Map(EXTRA.map(p => [p.id, p]));
  const g = byId.get('mobilite-hanche'); if (g) Object.assign(g, { items: P.get('mobilite-hanche').items, dose: P.get('mobilite-hanche').dose });
  const b = byId.get('mh-boardoff-assis');
  if (b) { const p = P.get('mh-boardoff-assis'); Object.assign(b, { category: p.category, type: p.type, sets: p.sets, repMin: p.repMin, repMax: p.repMax, cue: p.cue }); delete b.dose; }
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche'));
  if (t) t.ex = [...t.ex.filter(id => id !== 'mh-boardoff-assis'), 'mh-boardoff-assis']; // en tout dernier
  if (st.draft) st.draft.entries.forEach(en => { if (en.ex === 'mh-boardoff-assis' && !en.sets?.length) { en.sets = [{}, {}]; delete en.checks; } });
} });

MIGRATIONS.push({ id: '2026-11-22-etirements', run(st) {
  EXTRA.filter(p => p.id.startsWith('st-')).forEach(p => addIfMissing(st, p, false));
} });

MIGRATIONS.push({ id: '2026-11-23-box-jump', run(st) {
  const p = EXTRA.find(x => x.id === 'box-jump'); if (p) addIfMissing(st, p, false);
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche')) || (st.templates || []).find(x => /custom 1$/i.test(x.name));
  if (t && !t.ex.includes('box-jump')) t.ex.push('box-jump'); // en tout dernier
} });

MIGRATIONS.push({ id: '2026-11-22-echauffement', run(st) {
  EXTRA.filter(p => p.id.startsWith('wu-') || p.id === 'echauffement').forEach(p => addIfMissing(st, p, false));
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche')) || (st.templates || []).find(x => /custom 1$/i.test(x.name));
  if (t && !t.ex.includes('echauffement')) t.ex.unshift('echauffement'); // en tout début
} });

MIGRATIONS.push({ id: '2026-11-22-custom1-v2', run(st) {
  // warm-up : une simple ligne à cocher (sans le détail des exercices)
  const wu = st.exercises.find(x => x.id === 'echauffement');
  if (wu) { Object.assign(wu, { name: 'Warm-up', type: 'check', dose: '', cue: '' }); delete wu.items; }
  const mh = st.exercises.find(x => x.id === 'mobilite-hanche'); if (mh) mh.name = mh.name.replace(/ \(avant board-off\)$/, '');
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche')) || (st.templates || []).find(x => /custom 1$/i.test(x.name));
  if (!t) return;
  // ordre de la séance du 22/11, mobilité de hanche puis warm-up en tout début, jambes avant le board-off,
  // exercices non faits ce jour-là gardés, board-off assis puis box jump en dernier
  const ORDER = ['mobilite-hanche', 'echauffement', 'tractions', 'dips', 'trapeze-moyen-incline', 'psoas-march', 'mollets-pointe', 'developpe-couche', 'squat', 'deadlift',
    'harnais-planche', 'deltoide-lateral', 'triceps', 'deltoide-anterieur', 'curl-biceps-incline', 'tenue-barre-1-main', 'releve-jambes-banc-45', 'strap-finding-drill',
    'iso-deltoide-90', 'hanging-leg-raises', 'compression-pike', 'tirage-vertical-poulie'];
  const LAST = ['mh-boardoff-assis', 'box-jump'];
  const has = id => st.exercises.some(x => x.id === id);
  const others = t.ex.filter(id => !ORDER.includes(id) && !LAST.includes(id));
  t.ex = [...ORDER, ...others, ...LAST].filter(has);
  const SETS = { tractions: 2, dips: 2, 'trapeze-moyen-incline': 1, 'psoas-march': 2, 'mollets-pointe': 1, 'developpe-couche': 1, squat: 1, deadlift: 1, 'harnais-planche': 1,
    'deltoide-lateral': 1, triceps: 2, 'deltoide-anterieur': 1, 'curl-biceps-incline': 2, 'tenue-barre-1-main': 1, 'releve-jambes-banc-45': 1, 'strap-finding-drill': 1,
    'iso-deltoide-90': 1, 'hanging-leg-raises': 1, 'compression-pike': 1, 'mh-boardoff-assis': 2, 'box-jump': 1 };
  t.sets = { ...(t.sets || {}), ...SETS };
  t.targets = {}; // charges et reps : calculées automatiquement sur la dernière séance (progression comprise)
} });

MIGRATIONS.push({ id: '2026-11-22-go-run-v2', run(st) {
  // éléments ajoutés à la main → rangés dans la liste (on garde ce qui était coché)
  const MAP = [[/^cl[eé] de voiture/i, 'cle'], [/^tour de cou/i, 'tour-cou'], [/^ventolin/i, 'ventolin'], [/^chaussettes de rechang/i, 'chaussettes-r']];
  for (const k of ['run', 'kite']) {
    const P = st.packs?.[k]; if (!P) continue;
    P.extra = (P.extra || []).filter(x => { const m = MAP.find(([re, id]) => re.test(x.label.trim()) && (k === 'run' || id === 'cle')); if (!m) return true; if (P.done[x.id]) P.done[m[1]] = true; delete P.done[x.id]; return false; });
    if (k === 'run') { if (P.done.the) P.done.cafe = true; delete P.done.the; }
  }
} });

MIGRATIONS.push({ id: '2026-11-23-copenhagen', run(st) {
  const p = EXTRA.find(x => x.id === 'copenhagen-plank'); if (p) addIfMissing(st, p, false);
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche')) || (st.templates || []).find(x => /custom 1$/i.test(x.name));
  if (!t || t.ex.includes('copenhagen-plank')) return;
  // avec les jambes, avant le board-off (pas de jambes après le board-off)
  const i = t.ex.indexOf('deadlift'), j = t.ex.indexOf('harnais-planche');
  t.ex.splice(i >= 0 ? i + 1 : j >= 0 ? j : t.ex.length, 0, 'copenhagen-plank');
  t.sets = { ...(t.sets || {}), 'copenhagen-plank': 2 };
} });

MIGRATIONS.push({ id: '2026-11-23-rotation-interne', run(st) {
  ['mh-ds-genoux', 'mh-grenouille-pied', 'rot-interne-hanche'].forEach(id => { const p = EXTRA.find(x => x.id === id); if (p) addIfMissing(st, p, false); });
  // grenouille : la levée de pied devient un exercice à part
  const gr = st.exercises.find(x => x.id === 'mh-grenouille'), grP = EXTRA.find(x => x.id === 'mh-grenouille');
  if (gr && grP) Object.assign(gr, { name: grP.name, dose: grP.dose, cue: grP.cue });
  const g = st.exercises.find(x => x.id === 'mobilite-hanche');
  if (g && Array.isArray(g.items)) {
    const ins = (id, after) => { if (g.items.includes(id)) return; const i = g.items.indexOf(after); g.items.splice(i >= 0 ? i + 1 : g.items.length, 0, id); };
    ins('mh-ds-genoux', 'mh-ds-rotation'); ins('mh-grenouille-pied', 'mh-grenouille');
    g.dose = `${g.items.length} exercices · ≈ 15 min`;
  }
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche')) || (st.templates || []).find(x => /custom 1$/i.test(x.name));
  if (t && !t.ex.includes('rot-interne-hanche')) {
    const i = ['copenhagen-plank', 'deadlift'].map(id => t.ex.indexOf(id)).find(i => i >= 0) ?? -1, j = t.ex.indexOf('harnais-planche');
    t.ex.splice(i >= 0 ? i + 1 : j >= 0 ? j : t.ex.length, 0, 'rot-interne-hanche');
    t.sets = { ...(t.sets || {}), 'rot-interne-hanche': 2 };
  }
} });

MIGRATIONS.push({ id: '2026-11-23-abduction', run(st) {
  const p = EXTRA.find(x => x.id === 'abduction-poulie'); if (p) addIfMissing(st, p, false);
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche')) || (st.templates || []).find(x => /custom 1$/i.test(x.name));
  if (t && !t.ex.includes('abduction-poulie')) {
    const i = ['rot-interne-hanche', 'copenhagen-plank', 'deadlift'].map(id => t.ex.indexOf(id)).find(i => i >= 0) ?? -1, j = t.ex.indexOf('harnais-planche');
    t.ex.splice(i >= 0 ? i + 1 : j >= 0 ? j : t.ex.length, 0, 'abduction-poulie');
    t.sets = { ...(t.sets || {}), 'abduction-poulie': 2 };
  }
} });

MIGRATIONS.push({ id: '2026-11-23-rotation-interne-mobilite', run(st) {
  ['mh-ir-baton', 'mh-ir-chaise'].forEach(id => { const p = EXTRA.find(x => x.id === id); if (p) addIfMissing(st, p, false); });
  const g = st.exercises.find(x => x.id === 'mobilite-hanche');
  if (g && Array.isArray(g.items)) {
    let after = g.items.includes('mh-grenouille-pied') ? 'mh-grenouille-pied' : 'mh-grenouille';
    for (const id of ['mh-ir-baton', 'mh-ir-chaise']) { if (!g.items.includes(id)) { const i = g.items.indexOf(after); g.items.splice(i >= 0 ? i + 1 : g.items.length, 0, id); } after = id; }
    g.dose = `${g.items.length} exercices · ≈ ${Math.round(g.items.length * 1.6)} min`;
  }
} });

MIGRATIONS.push({ id: '2026-11-23-knee-drop-pyramidal', run(st) {
  ['knee-drop-leste', 'clam-pyramidal'].forEach(id => { const p = EXTRA.find(x => x.id === id); if (p) addIfMissing(st, p, false); });
  const t = (st.templates || []).find(x => x.ex.includes('mobilite-hanche')) || (st.templates || []).find(x => /custom 1$/i.test(x.name));
  if (!t) return;
  let after = ['abduction-poulie', 'rot-interne-hanche', 'copenhagen-plank', 'deadlift'].find(id => t.ex.includes(id));
  for (const id of ['knee-drop-leste', 'clam-pyramidal']) {
    if (t.ex.includes(id)) { after = id; continue; }
    const i = after ? t.ex.indexOf(after) : -1, j = t.ex.indexOf('harnais-planche');
    t.ex.splice(i >= 0 ? i + 1 : j >= 0 ? j : t.ex.length, 0, id); after = id;
    t.sets = { ...(t.sets || {}), [id]: 2 };
  }
} });

MIGRATIONS.push({ id: '2026-11-23-90-90-pause', run(st) {
  const e = st.exercises.find(x => x.id === 'mh-90-90'), p = EXTRA.find(x => x.id === 'mh-90-90');
  if (e && p) Object.assign(e, { cue: p.cue, dose: p.dose });
} });

// Corrections de données importées du tableur (appliquées une fois, quelle que soit la version de départ).
const DATA_FIXES = [
  { id: 'hlr-erreur-2026-11-22', run(st) {
    // « Relevés de jambes suspendu 8 » saisi par erreur (confusion avec le relevé de jambes banc 45°, déjà noté) : pas fait ce jour-là
    const s = st.sessions.find(x => x.id === 'ranmldiy03t' && x.date === '2026-11-22');
    if (s) s.entries = s.entries.filter(en => !(en.ex === 'hanging-leg-raises' && en.sets.length === 1 && en.sets[0].r === 8));
  } },
  { id: 'duree-oubliee-2026-11-17', run(st) {
    // séance du 17/11 restée ouverte (10:03 → 22:33) : la durée enregistrée est fausse → effacée
    for (const s of st.sessions) if (s.date === '2026-11-17' && s.dur >= 600) { delete s.dur; delete s.end; }
  } },
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
  if (!st.packs || typeof st.packs !== 'object') st.packs = {};
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
