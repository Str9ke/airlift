// Muscles : quels muscles travaille chaque exercice, schéma du corps (face / dos),
// volume de travail par muscle (programme ou réalisé) et niveau de force par muscle vs records.
import { S } from './store.js';
import * as C from './calc.js';
import { today, daysBetween } from './calc.js';

export const MUSCLES = [
  { id: 'trap', label: 'Trapèzes (haut)', short: 'trapèzes' },
  { id: 'rhomb', label: 'Trapèze moyen / rhomboïdes', short: 'haut du dos' },
  { id: 'delt_a', label: 'Deltoïde antérieur', short: 'épaule avant' },
  { id: 'delt_l', label: 'Deltoïde latéral', short: 'épaule côté' },
  { id: 'delt_p', label: 'Deltoïde postérieur', short: 'épaule arrière' },
  { id: 'coiffe', label: 'Coiffe des rotateurs', short: 'coiffe' },
  { id: 'pecs', label: 'Pectoraux', short: 'pecs' },
  { id: 'biceps', label: 'Biceps', short: 'biceps' },
  { id: 'triceps', label: 'Triceps', short: 'triceps' },
  { id: 'avbras', label: 'Avant-bras / grip', short: 'avant-bras' },
  { id: 'dorsaux', label: 'Grand dorsal', short: 'dorsaux' },
  { id: 'lombaires', label: 'Lombaires', short: 'lombaires' },
  { id: 'abdos', label: 'Abdominaux (grand droit)', short: 'abdos' },
  { id: 'obliques', label: 'Obliques', short: 'obliques' },
  { id: 'psoas', label: 'Fléchisseurs de hanche (psoas)', short: 'psoas' },
  { id: 'fessiers', label: 'Fessiers', short: 'fessiers' },
  { id: 'quadri', label: 'Quadriceps', short: 'quadriceps' },
  { id: 'ischios', label: 'Ischio-jambiers', short: 'ischios' },
  { id: 'adducteurs', label: 'Adducteurs', short: 'adducteurs' },
  { id: 'mollets', label: 'Mollets', short: 'mollets' },
];
export const MUSCLE = Object.fromEntries(MUSCLES.map(m => [m.id, m]));

// p = moteurs principaux, s = secondaires (stabilisation, assistance)
const M = (p, s = '') => ({ p: p.split(' ').filter(Boolean), s: s.split(' ').filter(Boolean) });
const PULL = M('dorsaux biceps', 'rhomb avbras delt_p');
const ROW = M('rhomb dorsaux', 'biceps delt_p');
const PULLDOWN = M('dorsaux', 'biceps rhomb');
const PRESS = M('pecs triceps', 'delt_a');
const CURL = M('biceps', 'avbras');
const TRI = M('triceps');
export const EX_MUSCLES = {
  // programme board-off
  'harnais-planche': M('abdos psoas', 'dorsaux avbras'),
  'strap-finding-drill': M('psoas abdos', 'adducteurs obliques'),
  'tucks-explosifs': M('abdos psoas', 'dorsaux avbras'),
  'tuck-hold': M('abdos psoas', 'avbras dorsaux'),
  'tenue-barre-1-main': M('avbras obliques', 'dorsaux abdos delt_p'),
  'psoas-march': M('psoas', 'abdos'),
  'compression-pike': M('psoas abdos', 'quadri triceps'),
  'pallof-press': M('obliques', 'abdos delt_a'),
  'hanging-leg-raises': M('abdos psoas', 'avbras'),
  'maintien-jambes-90': M('psoas abdos', 'avbras'),
  'seated-pike-lifts': M('psoas abdos', 'quadri'),
  'flexion-hanche-elastique': M('psoas'),
  'suspension-barre': M('avbras', 'dorsaux'),
  'hollow-body-hold': M('abdos', 'psoas'),
  // force
  'tractions': PULL, 'tractions-assistees': PULL, 'tractions-anneaux': PULL, 'tractions-moyennes': PULL,
  'traction-1-bras-excentrique': PULL, 'traction-isometrique-haut': PULL, 'traction-barre-haute': PULL,
  'traction-machine': PULL, 'traction-haute-machine': PULL,
  'tirage-vertical-poulie': PULLDOWN, 'grand-dorsal': PULLDOWN, 'nuque-arriere': PULLDOWN,
  'grand-dorsal-corde': M('dorsaux', 'triceps'), 'grand-dorsal-unilateral-corde': PULLDOWN, 'tirage-bras-tendus': M('dorsaux', 'triceps'),
  'trapeze-moyen-incline': M('rhomb delt_p', 'dorsaux biceps'), 'rowing-barre': M('dorsaux rhomb', 'biceps lombaires'),
  'tirage-trapeze-moyen-machine': ROW, 'dos-barre': ROW, 'dos-corde': ROW, 'traction-inclinee': ROW, 'traction-horizontale-corde': ROW,
  'traction-trapeze-sup': M('trap', 'delt_l'), 'trapeze-sup': M('trap'), 'extension-nuque': M('trap'),
  'developpe-couche': PRESS, 'developpe-couche-max': PRESS, 'developpe-inverse': PRESS, 'developpe-decline': PRESS,
  'developpe-incline': M('pecs delt_a', 'triceps'),
  'dips': PRESS, 'dips-anneaux': PRESS, 'dips-excentriques': PRESS, 'pompes-anneaux': M('pecs triceps', 'delt_a abdos'),
  'pec-corde': M('pecs', 'delt_a'), 'pec-corde-banc': M('pecs', 'delt_a'),
  'developpe-epaules': M('delt_a triceps', 'delt_l trap'), 'developpe-epaules-overhead': M('delt_a triceps', 'delt_l trap'),
  'poirier-pompes': M('delt_a triceps', 'trap'),
  'deltoide-lateral': M('delt_l', 'trap'), 'deltoide-moyen': M('delt_l', 'trap'), 'deltoide-corde': M('delt_l'),
  'iso-deltoide-90': M('delt_l delt_a', 'trap'), 'deltoide-anterieur': M('delt_a', 'pecs'),
  'rear-delt': M('delt_p', 'rhomb'), 'face-pull': M('delt_p rhomb', 'coiffe'), 'rotation-externe-epaule': M('coiffe', 'delt_p'),
  'curl-biceps': CURL, 'curl-biceps-barre': CURL, 'curl-biceps-haltere': CURL, 'curl-biceps-corde': CURL, 'curl-biceps-incline': CURL,
  'biceps': CURL, 'iso-coude-90': CURL, 'curl-marteau': M('biceps avbras'), 'curl-inverse': M('avbras biceps'),
  'triceps': TRI, 'triceps-overhead': TRI, 'triceps-corde-reverse': TRI, 'triceps-corde-vers-le-bas': TRI, 'triceps-corde-vers-le-haut': TRI, 'triceps-anneaux': TRI,
  'muscle-up-excentrique': M('dorsaux triceps', 'pecs biceps'),
  'front-lever-excentrique': M('dorsaux abdos', 'rhomb delt_p'), 'front-lever-45-exc': M('dorsaux abdos', 'rhomb delt_p'), 'front-lever-90-exc': M('dorsaux abdos', 'rhomb delt_p'),
  'drapeau-excentrique': M('obliques dorsaux', 'delt_l'), 'drapeau-bas': M('obliques dorsaux', 'delt_l'),
  'squat': M('quadri fessiers', 'adducteurs lombaires'), 'squat-1-pied': M('quadri fessiers', 'adducteurs ischios'),
  'deadlift': M('ischios fessiers lombaires', 'trap quadri avbras dorsaux'),
  'arrache-epaule-jete': M('quadri fessiers trap', 'ischios delt_a lombaires'),
  'chaise-quadriceps': M('quadri'), 'swing-kettlebell': M('fessiers ischios', 'lombaires'),
  'extension-dos': M('lombaires', 'fessiers ischios'),
  'mollets-pointe': M('mollets'),
  'abdominaux': M('abdos'), 'crunch-haltere': M('abdos'), 'crunch-jambes': M('abdos', 'psoas'), 'reverse-crunch': M('abdos', 'psoas'),
  'releve-jambes-banc-45': M('abdos psoas'), 'obliques-inclines': M('obliques', 'abdos'),
  'gainage': M('abdos', 'obliques'), 'plank-coudes': M('abdos', 'obliques'), 'plank-sous-coudes': M('abdos', 'obliques'),
  // mobilité (hors programme)
  'chat-chameau': M('lombaires abdos'), 'etirement-pike-assis': M('ischios'), 'ischios-pnf': M('ischios'),
  'ecart-actif': M('adducteurs', 'ischios'), 'figure-4-assis': M('fessiers'),
};
const BY_CAT = { Pecs: M('pecs triceps'), Dos: M('dorsaux', 'biceps'), 'Épaules': M('delt_l'), Biceps: CURL, Triceps: TRI, Jambes: M('quadri fessiers'), Abdos: M('abdos'), 'Board-off': M('abdos psoas') };

/** { p: [...], s: [...] } — ton choix dans l'éditeur prime, puis la table, puis la catégorie. */
export function muscleOf(e) {
  if (!e) return { p: [], s: [] };
  if (e.muscles && (e.muscles.p?.length || e.muscles.s?.length)) return { p: e.muscles.p || [], s: e.muscles.s || [] };
  return EX_MUSCLES[e.id] || BY_CAT[e.category] || { p: [], s: [] };
}
/** « quadriceps · fessiers » (principaux seulement, court) */
export const musclesText = e => muscleOf(e).p.map(id => MUSCLE[id]?.short).filter(Boolean).join(' · ');

// ---------------------------------------------------------------- schéma du corps
// Figures de 120 × 245 ; formes de la moitié gauche, symétrisées automatiquement.
const W = 120;
function mirror(d) {
  let x = true;
  return d.replace(/[A-Za-z]|-?\d*\.?\d+/g, t => { if (/[A-Za-z]/.test(t)) { x = true; return t; } const v = +t; const o = x ? +(W - v).toFixed(1) : v; x = !x; return String(o); });
}
const BASE_C = ['M55 27 L65 27 L66 36 L54 36 Z', 'M40 37 Q60 32 80 37 L85 46 L80 64 L77 104 Q60 114 43 104 L40 64 L35 46 Z'];
const BASE_L = ['M36 41 Q27 43 25 56 L23 84 L34 84 L38 60 Z', 'M23 84 L34 84 L31 116 L22 116 Q19 100 23 84 Z', 'M43 104 L60 112 L59 124 L57 176 L45 176 Q38 140 43 104 Z', 'M45 176 L57 176 L55 230 L48 230 Q43 200 45 176 Z'];
const SHAPES = {
  front: {
    trap: ['M54 29 L42 38 L55 37 Z'],
    delt_a: ['M41 38 Q32 38 29 47 Q30 55 34 57 L40 49 Z'],
    delt_l: ['M33 39 Q26 42 25 52 L28 57 Q28 47 35 40 Z'],
    pecs: ['M59 41 L42 40 Q37 47 40 55 Q48 63 59 61 Z'],
    biceps: ['M37 59 Q33 57 29 60 L27 78 Q31 82 35 78 Z'],
    avbras: ['M33 87 L25 87 Q22 100 24 112 L30 112 Q33 100 33 87 Z'],
    abdos: { c: ['M53.5 64 L66.5 64 L66 104 Q60 109 54 104 Z'] },
    obliques: ['M52.5 64 L42 62 Q41 82 45 100 L53 104 Z'],
    psoas: ['M47 106 L58 112 L56 123 L47 116 Z'],
    quadri: ['M46 118 L55.5 125 L55.5 170 L47 172 Q41 145 46 118 Z'],
    adducteurs: ['M56.5 121 L59.3 123 L58.4 160 L56.5 152 Z'],
    mollets: ['M47 182 Q44 198 47 214 L52 214 Q55 198 54 182 Z'],
  },
  back: {
    trap: { c: ['M54 28 L66 28 L79 38 L60 46 L41 38 Z'] },
    rhomb: { c: ['M50 43 L60 48 L70 43 L67 63 L60 69 L53 63 Z'] },
    delt_p: ['M41 38 Q32 38 29 47 Q30 55 34 57 L40 49 Z'],
    delt_l: ['M33 39 Q26 42 25 52 L28 57 Q28 47 35 40 Z'],
    coiffe: ['M41.5 43 L49 45.5 L51 59 L42.5 55 Z'],
    dorsaux: ['M41 58 L52 64 L58 72 L57 87 L47 96 Q41 80 40 62 Z'],
    lombaires: { c: ['M53 88 L60 86 L67 88 L67 104 L60 108 L53 104 Z'] },
    triceps: ['M37 59 Q33 57 29 60 L27 78 Q31 82 35 78 Z'],
    avbras: ['M33 87 L25 87 Q22 100 24 112 L30 112 Q33 100 33 87 Z'],
    fessiers: ['M44 105 Q52 102 59 110 L59 128 Q50 133 43 126 Z'],
    ischios: ['M43 130 L58 132 L57 172 L47 174 Q41 150 43 130 Z'],
    mollets: ['M46 180 Q42 196 47 213 L53 213 Q57 196 55 180 Z'],
  },
};
const paths = s => Array.isArray(s) ? s.flatMap(d => [d, mirror(d)]) : s.c;
function figure(view, fill, label) {
  const base = [...BASE_C, ...BASE_L.flatMap(d => [d, mirror(d)])].map(d => `<path d="${d}"/>`).join('')
    + `<ellipse cx="60" cy="16" rx="10" ry="12"/><ellipse cx="26" cy="121" rx="5" ry="7"/><ellipse cx="94" cy="121" rx="5" ry="7"/><ellipse cx="51" cy="235" rx="7" ry="4"/><ellipse cx="69" cy="235" rx="7" ry="4"/>`;
  const mus = Object.entries(SHAPES[view]).map(([id, s]) => {
    const f = fill(id);
    return `<g class="mz${f.cls ? ' ' + f.cls : ''}" data-m="${id}" style="--f:${f.c}"><title>${MUSCLE[id].label}</title>${paths(s).map(d => `<path d="${d}"/>`).join('')}</g>`;
  }).join('');
  const deco = view === 'front' ? '<path class="mz-line" d="M54 74 L66 74 M54 84 L66 84 M54 94 L66 94 M60 64 L60 106"/>' : '<path class="mz-line" d="M60 48 L60 106"/>';
  return `<svg class="body-fig" viewBox="0 0 ${W} 245" role="img" aria-label="${label}"><g class="mz-base">${base}</g>${mus}${deco}</svg>`;
}
/** fill(id) → { c: couleur CSS, cls? } */
export function bodySVG(fill, { small = false } = {}) {
  return `<div class="body-map ${small ? 'sm' : ''}"><div><span>Face</span>${figure('front', fill, 'Vue de face')}</div><div><span>Dos</span>${figure('back', fill, 'Vue de dos')}</div></div>`;
}
/** Petit schéma d'un exercice : principaux en couleur pleine, secondaires en clair. */
export function exerciseBody(e, small = true) {
  const m = muscleOf(e);
  return bodySVG(id => m.p.includes(id) ? { c: 'var(--mz-p)' } : m.s.includes(id) ? { c: 'var(--mz-s)' } : { c: 'var(--mz-0)' }, { small });
}

// ---------------------------------------------------------------- volume de travail par muscle
const setsOn = (e, day) => (day && e.daySets?.[day]) ?? e.sets;
const addTo = (map, id, n, e, role) => { const r = map.get(id) || { sets: 0, ex: new Map() }; r.sets += n; r.ex.set(e.id, { e, n: (r.ex.get(e.id)?.n || 0) + n, role }); map.set(id, r); };
/** Séries par muscle : day = id du jour, null = semaine complète du programme. Principal = 1 série, secondaire = ½. */
export function planVolume(day = null) {
  const map = new Map();
  for (const e of S().exercises) {
    if (!e.active) continue;
    for (const d of e.days) {
      if (day && d !== day) continue;
      if (!S().days.some(x => x.id === d)) continue;
      const n = setsOn(e, d), m = muscleOf(e);
      m.p.forEach(id => addTo(map, id, n, e, 'p'));
      m.s.forEach(id => addTo(map, id, n / 2, e, 's'));
    }
  }
  return map;
}
/** Réalisé sur les `days` derniers jours, ramené à une semaine. */
export function doneVolume(days = 28) {
  const map = new Map();
  const k = 7 / days;
  for (const s of S().sessions) {
    if (daysBetween(s.date, today()) > days) continue;
    for (const en of s.entries) {
      const e = S().exercises.find(x => x.id === en.ex); if (!e) continue;
      const n = en.sets.length * k, m = muscleOf(e);
      m.p.forEach(id => addTo(map, id, n, e, 'p'));
      m.s.forEach(id => addTo(map, id, n / 2, e, 's'));
    }
  }
  return map;
}

// ---------------------------------------------------------------- force par muscle vs records
/** Pour chaque muscle : moyenne de (dernière perf ÷ record) des exercices où il est moteur principal,
 *  travaillés dans les `recent` derniers jours. status : 'ok' | 'old' (plus travaillé = oublié) | 'none' (aucune donnée). */
export function strengthByMuscle(recent = 90) {
  const out = new Map();
  for (const m of MUSCLES) {
    const rows = S().exercises.filter(e => muscleOf(e).p.includes(m.id)).map(e => ({ e, st: C.exStats(e.id) })).filter(x => x.st.n >= 2 && x.e.category !== 'Mobilité');
    if (!rows.length) { out.set(m.id, { status: 'none', rows }); continue; }
    const rec = rows.filter(x => daysBetween(x.st.last.date, today()) <= recent);
    if (!rec.length) { const last = rows.reduce((a, x) => x.st.last.date > a ? x.st.last.date : a, ''); out.set(m.id, { status: 'old', rows, last }); continue; }
    out.set(m.id, { status: 'ok', rows: rec, pct: rec.reduce((a, x) => a + Math.min(100, x.st.level), 0) / rec.length });
  }
  return out;
}

// ---------------------------------------------------------------- échelles de couleur
export const VOL_STEPS = { week: [3, 6, 10], day: [1, 2, 4] }; // bornes entre les 4 niveaux
export function volLevel(sets, kind = 'week') {
  if (!(sets > 0)) return 0;
  const b = VOL_STEPS[kind];
  return sets <= b[0] ? 1 : sets <= b[1] ? 2 : sets <= b[2] ? 3 : 4;
}
export const STR_STEPS = [60, 75, 90];
export const strLevel = pct => pct < STR_STEPS[0] ? 1 : pct < STR_STEPS[1] ? 2 : pct < STR_STEPS[2] ? 3 : 4;
