// Moteur de calcul : 1RM estimé, performance, progression, points, pauses.
import { S, ex as getEx } from './store.js';
import { EQUIP } from './program.js';

export const DAY = 86400000;
export const toD = s => new Date(s + 'T12:00:00');
export const iso = d => { const z = new Date(d); z.setMinutes(z.getMinutes() - z.getTimezoneOffset()); return z.toISOString().slice(0, 10); };
export const today = () => iso(new Date());
export const daysBetween = (a, b) => Math.round((toD(b) - toD(a)) / DAY);
export const round = (x, step = 0.5) => Math.round(x / step) * step;
export const fmt = (x, d = 1) => x == null || isNaN(x) ? '–' : (Math.round(x * 10 ** d) / 10 ** d).toLocaleString('fr-FR');

// ---------------------------------------------------------------- poids du corps
export function bodyweightAt(date) {
  const pts = S().body.filter(b => b.poids);
  if (!pts.length) return 80;
  let prev = null;
  for (const b of pts) {
    if (b.date >= date) {
      if (!prev) return b.poids;
      const t = daysBetween(prev.date, date) / Math.max(1, daysBetween(prev.date, b.date));
      return prev.poids + (b.poids - prev.poids) * t;
    }
    prev = b;
  }
  return prev.poids;
}

// ---------------------------------------------------------------- 1RM
export const epley = (w, r) => r <= 0 ? 0 : r === 1 ? w : w * (1 + r / 30);

export function effLoad(e, set, date) {
  const w = set.w || 0;
  if (e.type === 'bw_load') return bodyweightAt(date) + w;
  if (e.type === 'assisted') return Math.max(5, bodyweightAt(date) - w);
  return w;
}

/** performance d'un set : 1RM estimé (kg) ou reps / secondes */
export function setPerf(e, set, date) {
  if (e.type === 'time') return set.t || set.r || 0;
  if (e.type === 'reps') return set.r || 0;
  if (set.r == null) return 0;
  if ((e.type === 'load') && !set.w) return 0;
  return epley(effLoad(e, set, date), Math.min(set.r, 15));
}

export function entryPerf(e, entry, date) {
  let best = 0;
  for (const s of entry.sets || []) best = Math.max(best, setPerf(e, s, date));
  return best;
}

export const perfUnit = e => e.type === 'time' ? 's' : e.type === 'reps' ? 'reps' : 'kg';
export const perfLabel = e => e.type === 'time' ? 'Meilleur temps' : e.type === 'reps' ? 'Meilleure série' : '1RM estimé';

// ---------------------------------------------------------------- historique par exercice (mis en cache)
let cache = null, cacheKey = '';
function key() { const s = S(); return s.sessions.length + ':' + (s.sessions.at(-1)?.date || '') + ':' + s.body.length + ':' + s._rev; }
export function invalidate() { cache = null; }

export function history() {
  if (cache && cacheKey === key()) return cache;
  const byEx = new Map();
  for (const s of S().sessions) {
    for (const en of s.entries) {
      const e = getEx(en.ex);
      if (!e) continue;
      const p = entryPerf(e, en, s.date);
      if (!(p > 0)) continue;
      if (!byEx.has(e.id)) byEx.set(e.id, []);
      byEx.get(e.id).push({ date: s.date, perf: p, entry: en, session: s });
    }
  }
  // records cumulés
  for (const arr of byEx.values()) {
    let pr = 0;
    for (const h of arr) { h.prBefore = pr; h.isPR = h.perf > pr * 1.0001 && pr > 0; pr = Math.max(pr, h.perf); h.prAfter = pr; }
  }
  cache = { byEx };
  cacheKey = key();
  return cache;
}

export function exStats(id) {
  const arr = history().byEx.get(id) || [];
  if (!arr.length) return { arr, n: 0 };
  const last = arr.at(-1);
  let best = arr[0];
  for (const h of arr) if (h.perf > best.perf) best = h;
  const level = last.perf / best.perf * 100;
  return { arr, n: arr.length, last, best, level, gap: best.perf - last.perf, gapPct: (best.perf / last.perf - 1) * 100, recent: arr.slice(-3) };
}

// ---------------------------------------------------------------- pauses
export function breaks(minDays) {
  const md = minDays ?? S().settings.breakDays ?? 30;
  const ss = S().sessions;
  const out = [];
  for (let i = 1; i < ss.length; i++) {
    const g = daysBetween(ss[i - 1].date, ss[i].date);
    if (g >= md) out.push({ from: ss[i - 1].date, to: ss[i].date, days: g });
  }
  const last = ss.at(-1);
  if (last) { const g = daysBetween(last.date, today()); if (g >= md) out.push({ from: last.date, to: today(), days: g, ongoing: true }); }
  return out;
}
/** Courbe lissée : meilleure performance sur une fenêtre glissante (jours). */
export function rollingMax(arr, days = 28) {
  return arr.map((h, i) => {
    let m = h.perf, pr = h.isPR;
    for (let j = i - 1; j >= 0 && daysBetween(arr[j].date, h.date) <= days; j--) m = Math.max(m, arr[j].perf);
    return { date: h.date, y: m, pr, label: h.label };
  });
}
export function rollingMean(arr, n = 5) {
  return arr.map((x, i) => { const w = arr.slice(Math.max(0, i - n + 1), i + 1).filter(y => daysBetween(y.date, x.date) <= 60); return { ...x, y: w.reduce((a, y) => a + y.level, 0) / w.length }; });
}
export const fmtDuration = d => d >= 365 ? `${fmt(d / 365, 1)} an${d >= 730 ? 's' : ''}` : d >= 60 ? `${Math.round(d / 30.4)} mois` : `${d} j`;

// ---------------------------------------------------------------- progression (double progression + incréments réels)
export function incOf(e) { return e.inc ?? EQUIP[e.equip]?.inc ?? 1; }

/** Suggestion pour la prochaine séance, set par set. */
export function suggest(e) {
  if (e.plan && e.plan.manual && e.plan.sets?.length) return { sets: e.plan.sets, manual: true, note: e.plan.note || '' };
  const st = exStats(e.id);
  const last = st.last;
  const n = e.sets || 2;
  if (!last) return { sets: Array.from({ length: n }, () => ({})), note: 'Première séance : trouve ta charge de travail.' };
  const lastSets = last.entry.sets.filter(s => (s.r != null) || s.t != null);
  const out = [];
  const inc = incOf(e);
  let up = false;
  for (let i = 0; i < n; i++) {
    const s = lastSets[Math.min(i, lastSets.length - 1)] || {};
    if (e.type === 'time') {
      const t = s.t || s.r || e.timeMin;
      out.push({ t: t >= e.timeMax ? t : t + 5 });
      continue;
    }
    if (e.type === 'reps' || inc === 0 || e.equip === 'band') {
      const r = s.r || e.repMin;
      out.push({ r: Math.min(r + 1, Math.max(e.repMax, r)), w: s.w ?? undefined });
      continue;
    }
    const w = s.w ?? 0, r = s.r ?? e.repMin;
    if (r >= e.repMax) {
      up = true;
      if (e.type === 'assisted') {
        const nw = Math.max(0, round(w - inc, 0.5));
        out.push({ w: nw, r: e.repMin, up: true });
      } else {
        const nw = round(w + inc, 0.5);
        const e1 = epley(effLoad(e, { w }, last.date), r);
        const eff = effLoad(e, { w: nw }, last.date);
        const est = Math.floor(30 * (e1 / eff - 1));
        out.push({ w: nw, r: Math.max(e.repMin, Math.min(e.repMax - 1, est)), up: true });
      }
    } else {
      out.push({ w, r: r + 1 });
    }
  }
  const note = up ? `Objectif atteint (${e.repMax} reps) → ${e.type === 'assisted' ? 'retire' : 'ajoute'} ${fmt(inc)} kg${e.equip === 'db2' ? ' par haltère (+' + fmt(inc * 2) + ' kg au total)' : e.equip === 'db2t' ? ' au total (+' + fmt(inc / 2) + ' kg par haltère)' : ''} sur les séries concernées.` : '';
  return { sets: out, note };
}

export function fmtSet(e, s) {
  if (!s) return '';
  if (e.type === 'time') return `${fmt(s.t ?? s.r, 0)} s`;
  if (e.type === 'reps') return s.w ? `${fmt(s.w)}×${fmt(s.r, 0)}` : `${fmt(s.r, 0)}`;
  if (s.w == null && s.r != null) return `${fmt(s.r, 0)}`;
  const w = e.type === 'bw_load' ? (s.w ? `+${fmt(s.w)}` : 'PC') : e.type === 'assisted' ? `−${fmt(s.w)}` : fmt(s.w);
  return s.r == null ? `${w}×?` : `${w}×${fmt(s.r, 0)}`;
}
export const fmtEntry = (e, en) => (en.sets || []).map(s => fmtSet(e, s)).join(' · ');

// ---------------------------------------------------------------- points & niveau global
/**
 * Points de séance (s'adaptent au nombre d'exercices) :
 *   progression = moyenne des variations de performance (%) × 10   → indépendant du nombre d'exercices
 *   facteur volume = √(n / n_habituel), borné [0,6 ; 1,3]         → une petite séance compte un peu moins, une grosse un peu plus
 *   + 3 pts par record personnel (max 15) + 2 pts de présence
 */
export function sessionScores() {
  const h = history();
  const map = new Map(); // session.id -> {deltas, prs, n}
  for (const [id, arr] of h.byEx) {
    for (let i = 0; i < arr.length; i++) {
      const cur = arr[i];
      const sid = cur.session.id;
      if (!map.has(sid)) map.set(sid, { deltas: [], prs: 0, n: 0 });
      const m = map.get(sid);
      m.n++;
      if (i > 0) {
        const prev = arr[i - 1];
        const gapDays = daysBetween(prev.date, cur.date);
        let d = (cur.perf / prev.perf - 1) * 100;
        d = Math.max(-15, Math.min(15, d));
        m.deltas.push({ d, w: gapDays > 120 ? 0.5 : 1 });
      }
      if (cur.isPR) m.prs++;
    }
  }
  const ss = S().sessions;
  const counts = [];
  const out = [];
  let cum = 0;
  for (const s of ss) {
    const m = map.get(s.id);
    if (!m) continue;
    const ref = counts.length ? median(counts.slice(-20)) : m.n;
    counts.push(m.n);
    const wsum = m.deltas.reduce((a, x) => a + x.w, 0);
    const prog = wsum ? m.deltas.reduce((a, x) => a + x.d * x.w, 0) / wsum * 10 : 0;
    const vol = Math.max(0.6, Math.min(1.3, Math.sqrt(m.n / Math.max(1, ref))));
    const pts = Math.round(prog * vol + Math.min(15, 3 * m.prs) + 2);
    cum += pts;
    out.push({ session: s, date: s.date, n: m.n, prog, vol, prs: m.prs, pts, cum });
  }
  return out;
}

function median(a) { const b = [...a].sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : 1; }

/** Niveau global : moyenne (perf récente / record) des exercices travaillés dans les 60 jours précédents. */
export function levelSeries() {
  const h = history();
  const ss = S().sessions;
  const lastPerf = new Map(); // ex -> {perf, date}
  const pr = new Map();
  const out = [];
  const perSession = new Map();
  for (const [id, arr] of h.byEx) for (const x of arr) { if (!perSession.has(x.session.id)) perSession.set(x.session.id, []); perSession.get(x.session.id).push([id, x.perf]); }
  for (const s of ss) {
    const lst = perSession.get(s.id);
    if (!lst) continue;
    for (const [id, p] of lst) { lastPerf.set(id, { perf: p, date: s.date }); pr.set(id, Math.max(pr.get(id) || 0, p)); }
    let sum = 0, n = 0;
    for (const [id, lp] of lastPerf) {
      if (daysBetween(lp.date, s.date) > 60) continue;
      sum += lp.perf / pr.get(id) * 100; n++;
    }
    if (n) out.push({ date: s.date, level: sum / n, n });
  }
  return out;
}

/** Niveau actuel du programme : exercices actifs avec historique. */
export function currentLevel() {
  const act = S().exercises.filter(e => e.active);
  const rows = act.map(e => ({ e, st: exStats(e.id) })).filter(x => x.st.n);
  if (!rows.length) return { level: null, rows };
  const level = rows.reduce((a, x) => a + x.st.level, 0) / rows.length;
  return { level, rows };
}
