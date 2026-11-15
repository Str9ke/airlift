// Graphiques SVG légers : courbe temporelle avec pauses, tooltip tactile, sparkline.
import { toD, fmt } from './calc.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(NS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
export const fdate = s => { const d = toD(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const span = max - min, step0 = span / count, mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= step0) || mag * 10;
  const t = []; for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) t.push(+v.toFixed(6));
  return t;
}

/**
 * opts: { points:[{date,y,label?,pr?}], breaks:[{from,to}], unit, height, refLine:{y,label}, area:true, color, yMin }
 */
export function lineChart(host, opts) {
  host.innerHTML = '';
  host.classList.add('chart');
  const pts = opts.points.filter(p => p.y != null && !isNaN(p.y));
  if (pts.length < 1) { host.innerHTML = '<div class="chart-empty">Pas encore de données</div>'; return; }
  const W = host.clientWidth || 340, H = opts.height || 180;
  const m = { l: 38, r: 10, t: 12, b: 22 };
  const xs = pts.map(p => toD(p.date).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 864e5 * 15; x1 += 864e5 * 15; }
  let ys = pts.map(p => p.y).concat((opts.scatter || []).map(p => p.y)); if (opts.refLine) ys.push(opts.refLine.y);
  let y0 = opts.yMin ?? Math.min(...ys), y1 = Math.max(...ys);
  const pad = (y1 - y0) * 0.08 || 1; y0 -= opts.yMin != null ? 0 : pad; y1 += pad;
  const X = t => m.l + (t - x0) / (x1 - x0) * (W - m.l - m.r);
  const Y = v => m.t + (1 - (v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': opts.aria || 'graphique' }, host);
  const defs = el('defs', {}, svg);
  const gid = 'g' + Math.random().toString(36).slice(2, 7);
  const lg = el('linearGradient', { id: gid, x1: 0, x2: 0, y1: 0, y2: 1 }, defs);
  el('stop', { offset: '0%', 'stop-color': opts.color || 'var(--series-1)', 'stop-opacity': 0.28 }, lg);
  el('stop', { offset: '100%', 'stop-color': opts.color || 'var(--series-1)', 'stop-opacity': 0 }, lg);
  const hid = 'h' + gid;
  const pat = el('pattern', { id: hid, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, defs);
  el('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'var(--break-line)', 'stroke-width': 2 }, pat);

  // pauses
  const bands = (opts.breaks || []).filter(b => b.days == null || b.days >= (opts.bandMin ?? 60));
  for (const b of bands) {
    const a = Math.max(x0, toD(b.from).getTime()), z = Math.min(x1, toD(b.to).getTime());
    if (z <= a) continue;
    el('rect', { x: X(a), y: m.t, width: Math.max(1, X(z) - X(a)), height: H - m.t - m.b, fill: `url(#${hid})`, class: 'break-band' }, svg);
  }
  // grille
  for (const v of niceTicks(y0, y1, 4)) {
    if (v < y0 || v > y1) continue;
    el('line', { x1: m.l, x2: W - m.r, y1: Y(v), y2: Y(v), class: 'grid' }, svg);
    const t = el('text', { x: m.l - 6, y: Y(v) + 3.5, class: 'axis', 'text-anchor': 'end' }, svg); t.textContent = fmt(v, v % 1 ? 1 : 0);
  }
  const yrs = (x1 - x0) / (365 * 864e5);
  const ticks = [];
  const d0 = new Date(x0), d1 = new Date(x1);
  if (yrs > 2.5) { const st = yrs > 9 ? 3 : yrs > 5 ? 2 : 1; for (let y = d0.getFullYear() + 1; y <= d1.getFullYear(); y += st) ticks.push([new Date(y, 0, 1).getTime(), String(y)]); }
  else { const stepM = yrs > 1 ? 4 : yrs > 0.4 ? 2 : 1; const d = new Date(d0.getFullYear(), d0.getMonth() + 1, 1); while (d <= d1) { if (d.getMonth() % stepM === 0) ticks.push([d.getTime(), MONTHS[d.getMonth()] + (d.getMonth() === 0 ? ' ' + String(d.getFullYear()).slice(2) : '')]); d.setMonth(d.getMonth() + 1); } }
  for (const [t, lab] of ticks) { const tx = el('text', { x: X(t), y: H - 6, class: 'axis', 'text-anchor': 'middle' }, svg); tx.textContent = lab; }
  // ligne de référence (record)
  if (opts.refLine) {
    el('line', { x1: m.l, x2: W - m.r, y1: Y(opts.refLine.y), y2: Y(opts.refLine.y), class: 'ref' }, svg);
    const t = el('text', { x: W - m.r - 2, y: Y(opts.refLine.y) - 4, class: 'ref-label', 'text-anchor': 'end' }, svg); t.textContent = opts.refLine.label;
  }
  // segments (coupés aux pauses)
  const segs = [[]];
  const brk = opts.split === false ? [] : bands;
  pts.forEach((p, i) => {
    if (i > 0 && brk.some(b => pts[i - 1].date <= b.from && p.date >= b.to)) segs.push([]);
    segs.at(-1).push(p);
  });
  for (const s of segs) {
    if (!s.length) continue;
    const d = s.map((p, i) => `${i ? 'L' : 'M'}${X(toD(p.date).getTime()).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    if (opts.area !== false && s.length > 1) el('path', { d: `${d}L${X(toD(s.at(-1).date).getTime())},${Y(y0)}L${X(toD(s[0].date).getTime())},${Y(y0)}Z`, fill: `url(#${gid})` }, svg);
    el('path', { d, class: 'line', stroke: opts.color || 'var(--series-1)' }, svg);
    if (s.length === 1) el('circle', { cx: X(toD(s[0].date).getTime()), cy: Y(s[0].y), r: 3, fill: opts.color || 'var(--series-1)' }, svg);
  }
  // points bruts (discrets)
  for (const p of opts.scatter || []) if (toD(p.date).getTime() >= x0) el('circle', { cx: X(toD(p.date).getTime()), cy: Y(p.y), r: 1.8, class: 'scatter' }, svg);
  // records
  for (const p of pts) if (p.pr || p.rep) el('circle', { cx: X(toD(p.date).getTime()), cy: Y(p.y), r: p.pr ? 3.4 : 2.8, class: p.pr ? 'pr-dot' : 'rep-dot' }, svg);
  const last = pts.at(-1);
  el('circle', { cx: X(toD(last.date).getTime()), cy: Y(last.y), r: 4.5, class: 'last-dot', stroke: opts.color || 'var(--series-1)' }, svg);

  // crosshair + tooltip
  const cross = el('line', { y1: m.t, y2: H - m.b, class: 'cross', visibility: 'hidden' }, svg);
  const dot = el('circle', { r: 5, class: 'hover-dot', visibility: 'hidden', stroke: opts.color || 'var(--series-1)' }, svg);
  const tip = document.createElement('div'); tip.className = 'tip'; host.appendChild(tip);
  const px = pts.map(p => X(toD(p.date).getTime()));
  const show = ev => {
    const r = svg.getBoundingClientRect();
    const x = (ev.touches ? ev.touches[0].clientX : ev.clientX) - r.left;
    let bi = 0, bd = 1e9; px.forEach((v, i) => { const d = Math.abs(v - x); if (d < bd) { bd = d; bi = i; } });
    const p = pts[bi];
    cross.setAttribute('x1', px[bi]); cross.setAttribute('x2', px[bi]); cross.setAttribute('visibility', 'visible');
    dot.setAttribute('cx', px[bi]); dot.setAttribute('cy', Y(p.y)); dot.setAttribute('visibility', 'visible');
    tip.innerHTML = `<b>${fmt(p.y, opts.decimals ?? 1)} ${opts.unit || ''}</b><span>${fdate(p.date)}</span>${p.label ? `<em>${p.label}</em>` : ''}`;
    tip.style.display = 'block';
    const tw = tip.offsetWidth; tip.style.left = Math.min(W - tw - 2, Math.max(2, px[bi] - tw / 2)) + 'px'; tip.style.top = Math.max(0, Y(p.y) - tip.offsetHeight - 12) + 'px';
  };
  const hide = () => { cross.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); tip.style.display = 'none'; };
  svg.addEventListener('pointermove', show); svg.addEventListener('pointerdown', show); svg.addEventListener('pointerleave', hide);
}

/** Petite courbe des dernières séances (3 à 6 points). */
export function sparkline(values, { w = 64, h = 22, up = true } = {}) {
  if (!values.length) return '<svg class="spark" width="' + w + '" height="' + h + '"></svg>';
  const mn = Math.min(...values), mx = Math.max(...values), sp = mx - mn || 1;
  const X = i => values.length === 1 ? w / 2 : 3 + i / (values.length - 1) * (w - 6);
  const Y = v => h - 4 - (v - mn) / sp * (h - 8);
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join('');
  const trend = values.length > 1 ? Math.sign(values.at(-1) - values[0]) : 0;
  const cls = trend > 0 ? 'up' : trend < 0 ? 'down' : 'flat';
  return `<svg class="spark ${cls}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}"/>${values.map((v, i) => `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="${i === values.length - 1 ? 2.6 : 1.6}"/>`).join('')}</svg>`;
}
