import * as store from './store.js';
import { S, commit, uid, ex as getEx, normalizeExercise, dayOf } from './store.js';
import * as C from './calc.js';
import { fmt, today, toD, daysBetween } from './calc.js';
import { EQUIP, TYPES, CATEGORIES, WEEKDAYS, STRETCHES } from './program.js';
import { lineChart, sparkline, fdate } from './charts.js';
import { illuHTML, illuOf, shrinkPhoto, loadCatalog, catUrl } from './media.js';
import * as sync from './sync.js';
import * as MZ from './muscles.js';
import { PACKS, gearIcon } from './gear.js';

export const APP_VERSION = '1.19.0';
const DAYS_ = () => S().days;
const todayDay = () => DAYS_().find(d => d.wd === new Date().getDay());
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = { tab: 'prog', day: 'all', showArch: false, archFilter: '', statRange: 'all', bodyRange: 'all', histLimit: 60, histDay: 'all', histYear: '', histQ: '', bodyView: 'muscles', mzView: 'week' };
try { Object.assign(ui, JSON.parse(localStorage.getItem('airlift.ui') || '{}')); } catch (e) { /* */ }
const saveUi = () => { try { localStorage.setItem('airlift.ui', JSON.stringify({ tab: ui.tab, day: ui.day, statRange: ui.statRange, bodyRange: ui.bodyRange, bodyView: ui.bodyView, mzView: ui.mzView })); } catch (e) { /* */ } };

const ICON = {
  pause: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1.3" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.3" fill="currentColor"/></svg>',
  play: '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>',
  grip: '<svg viewBox="0 0 16 16"><circle cx="5" cy="3" r="1.4"/><circle cx="11" cy="3" r="1.4"/><circle cx="5" cy="8" r="1.4"/><circle cx="11" cy="8" r="1.4"/><circle cx="5" cy="13" r="1.4"/><circle cx="11" cy="13" r="1.4"/></svg>',
  dots: '<svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5 10 17 19 7"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  restore: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4"/></svg>',
  archive: '<svg viewBox="0 0 24 24"><path d="M4 7h16v3H4zM6 10v9h12v-9M10 14h4"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
};

// ---------------------------------------------------------------- utils UI
function toast(msg, ms = 2200) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms); }

function sheet(html, { full = false, onClose } = {}) {
  const root = $('#sheet-root');
  const back = document.createElement('div'); back.className = 'sheet-back';
  const sh = document.createElement('div'); sh.className = 'sheet' + (full ? ' full' : '');
  sh.innerHTML = (full ? '' : '<div class="grab"></div>') + html;
  root.append(back, sh);
  sh.back = back;
  sh.close = () => { back.remove(); sh.remove(); onClose && onClose(); };
  back.onclick = sh.close;
  $$('[data-close]', sh).forEach(b => b.onclick = () => sh.close());
  return sh;
}
const closeAllSheets = () => { $('#sheet-root').innerHTML = ''; };
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAllSheets(); });
// bouton retour Android : ferme la feuille ouverte
// Bouton « retour » (Android / navigateur) : ferme la fenêtre ouverte, sinon revient à l'écran précédent
// (onglet, jour sélectionné…). On ne quitte l'app que depuis l'écran d'accueil, après un 2e appui.
const navStack = [];
const navSnap = () => ({ tab: ui.tab, day: ui.day, y: window.scrollY });
function navPush() { const s = navSnap(), t = navStack.at(-1); if (!t || t.tab !== s.tab || t.day !== s.day) navStack.push(s); if (navStack.length > 30) navStack.shift(); }
let exitArmed = 0;
window.airliftBack = () => {
  if (kp.open) { kpClose(); return true; }
  const r = $('#sheet-root');
  const top = r.lastElementChild;
  if (top?.guard && top.guard()) return true;
  if (r.lastElementChild) { r.lastElementChild.remove(); if (r.lastElementChild?.classList.contains('sheet-back')) r.lastElementChild.remove(); if (!r.children.length) render(); return true; }
  const prev = navStack.pop();
  if (prev) { ui.tab = prev.tab; ui.day = prev.day; saveUi(); render(); window.scrollTo(0, prev.y || 0); return true; }
  if (ui.tab !== 'prog' || ui.day !== 'all') { ui.tab = 'prog'; ui.day = 'all'; saveUi(); render(); window.scrollTo(0, 0); return true; }
  if (Date.now() - exitArmed < 2500) return false;
  exitArmed = Date.now(); toast('Appuie encore sur retour pour quitter'); return true;
};

function confirmBox(msg, okLabel = 'Confirmer', danger = false) {
  return new Promise(res => {
    const sh = sheet(`<h2 style="margin-top:4px">${esc(msg)}</h2><div class="grid2" style="margin-top:16px"><button class="btn" data-no>Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button></div>`, { onClose: () => res(false) });
    $('[data-no]', sh).onclick = () => { sh.close(); };
    $('[data-ok]', sh).onclick = () => { res(true); sh.back.remove(); sh.remove(); };
  });
}

function setTab(t) { if (t !== ui.tab) navPush(); ui.tab = t; saveUi(); render(); window.scrollTo(0, 0); }
$$('#tabs button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
$('#btn-settings').onclick = () => openSettings();
$('#btn-sync').onclick = () => { openSettings(); setTimeout(() => $('#st-sync')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); };

function applyTheme() {
  const t = S().settings.theme;
  const dark = t === 'dark' || (t === 'auto' && !matchMedia('(prefers-color-scheme: light)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  $('meta[name=theme-color]').content = dark ? '#0b1220' : '#f3f6fb';
}

const dayTag = id => { const d = dayOf(id); return d ? `<span class="tag t-${esc(id)}">${esc(d.short)}</span>` : ''; };
const unitW = e => e.type === 'bw_load' ? 'lest kg' : e.type === 'assisted' ? 'assist. kg' : 'kg';

function render() {
  if (ui.day !== 'all' && !dayOf(ui.day)) ui.day = 'all';
  if (ui.histDay && ui.histDay !== 'all' && !dayOf(ui.histDay)) ui.histDay = 'all';
  if (kp.open) kpClose();
  applyTheme();
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  document.body.classList.toggle('in-session', ui.tab === 'log' && !!S().draft);
  const v = $('#view');
  v.className = S().settings.density === 'compact' ? 'compact' : '';
  ({ prog: renderProg, log: renderLog, stats: renderStats, body: renderBody, hist: renderHist })[ui.tab](v);
}

// ================================================================ PROGRAMME
const setsOn = (e, day) => (day && e.daySets?.[day]) ?? e.sets;
function rangeOf(e, day = null) {
  const per = !day && e.daySets && e.days.length > 1 ? e.days.map(d => setsOn(e, d)).join('/') : setsOn(e, day);
  const sd = e.side ? ' /côté' : '';
  if (e.type === 'time' || e.type === 'load_time') return `${per}×${e.timeMin}-${e.timeMax}s${sd}`;
  return `${per}×${e.repMin}${e.repMax !== e.repMin ? '-' + e.repMax : ''}${sd}`;
}

function exRow(e, archived = false) {
  const st = C.exStats(e.id);
  const vals = st.arr.slice(-4).map(h => h.perf);
  const recent = st.arr.slice(-3).map(h => C.fmtEntry(e, { sets: h.entry.sets.slice(0, 1) }) || '').join(' → ');
  let next = '';
  if (!archived) {
    const sg = C.suggest(e);
    const s0 = sg.sets[0];
    if (s0 && (s0.w != null || s0.r != null || s0.t != null)) next = `<span class="next ${sg.sets.some(s => s.up) ? 'up' : ''}">${sg.manual ? '✎ ' : sg.sets.some(s => s.up) ? '▲ ' : '→ '}${esc(C.fmtSet(e, s0))}</span>`;
  }
  const since = st.last ? C.daysBetween(st.last.date, today()) : null;
  return `<div class="ex-row ${archived ? 'archived' : ''}" data-id="${e.id}">
    ${archived ? '<span style="width:6px"></span>' : `<span class="handle" aria-label="Déplacer">${ICON.grip}</span>`}
    <div class="grow" data-open>
      <div class="name">${archived ? '' : e.days.map(dayTag).join('')}${esc(e.name)}${!archived && e.superset ? ' <span class="tag ss" title="Superset : enchaîner avec le suivant">⇄</span>' : ''}</div>
      ${MZ.musclesText(e) ? `<div class="mus">${esc(MZ.musclesText(e))}</div>` : ''}
      <div class="meta">${archived ? (st.last ? `${esc(recent)} · il y a ${C.fmtDuration(since)}` : 'Aucune donnée') : `${rangeOf(e, ui.day === 'all' ? null : ui.day)}${recent ? ' · ' + esc(recent) : ''}`}</div>
    </div>
    ${next}
    ${sparkline(vals)}
    ${archived ? `<button class="mini-btn" data-restore aria-label="Remettre dans le programme">${ICON.restore}</button>` : `<button class="mini-btn" data-menu aria-label="Options">${ICON.dots}</button>`}
  </div>`;
}

function renderProg(v) {
  const st = S();
  const active = st.exercises.filter(e => e.active).sort((a, b) => a.order - b.order);
  if (ui.day !== 'all' && !dayOf(ui.day)) ui.day = 'all';
  const shown = ui.day === 'all' ? active : active.filter(e => e.days.includes(ui.day));
  const dr = st.draft;
  const cl = C.currentLevel();
  const br = C.breaks();
  const ongoing = br.find(b => b.ongoing);
  const sc = C.sessionScores();
  const total = sc.at(-1)?.cum ?? 0;
  const archived = st.exercises.filter(e => !e.active && (!ui.archFilter || e.name.toLowerCase().includes(ui.archFilter.toLowerCase())))
    .map(e => ({ e, st: C.exStats(e.id) })).sort((a, b) => (b.st.last?.date || '').localeCompare(a.st.last?.date || ''));
  v.innerHTML = `${weekBanner()}
    <div class="card hero">
      <div class="row">
        <div class="grow">
          <div class="muted" style="font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase">Niveau actuel vs record</div>
          <div class="big-num">${cl.level != null ? fmt(cl.level, 0) + '<span style="font-size:22px">%</span>' : '–'}</div>
        </div>
        <div style="text-align:right">
          <div class="muted" style="font-size:12px">Points</div><div style="font-size:22px;font-weight:800">${fmt(total, 0)}</div>
        </div>
      </div>
      <div class="gauge"><i style="width:${Math.min(100, cl.level || 0)}%"></i></div>
      <div class="sub" style="margin:8px 0 0">${ongoing ? `Pause en cours : ${C.fmtDuration(ongoing.days)} depuis la dernière séance — reprise progressive conseillée.` : `${cl.rows.length} exercices du programme ont un historique. Il te reste <b>${fmt(100 - (cl.level || 100), 0)} %</b> à reconquérir en moyenne.`}</div>
    </div>
    ${dr ? `<div class="card live-banner"><div class="row"><div class="grow"><b>Séance en cours</b><div class="sub" style="margin:2px 0 0">${esc(dayOf(dr.day)?.label || 'Séance libre')} · <span ${dr.pausedAt ? '' : `data-clock="${dr.startedAt || ''}"`}>${dr.pausedAt ? '⏸ ' : ''}${clock(dr.startedAt, dr.pausedAt || undefined)}</span></div></div><button class="btn sm" id="dr-del">Supprimer</button><button class="btn sm primary" id="dr-go">Reprendre</button></div></div>` : ''}
    <div class="go-row">${Object.entries(PACKS).map(([k, pk]) => { const n = packCount(k); return `<button class="go-btn" data-pack="${k}"><span class="go-e">${pk.emoji}</span><span class="grow"><b>${pk.title}</b><small>${n.done ? `${n.done}/${n.total} pris` : `${n.total} affaires`}</small></span><span class="muted">›</span></button>`; }).join('')}</div>
    <div class="chips" style="margin-top:12px">
      <button class="chip ${ui.day === 'all' ? 'on' : ''}" data-day="all">Tous (${active.length})</button>
      ${DAYS_().map(d => `<button class="chip ${ui.day === d.id ? 'on' : ''}" data-day="${d.id}">${esc(d.label)}</button>`).join('')}
    </div>
    ${(() => { const L = C.dayLoad(ui.day === 'all' ? null : ui.day); return `<div class="day-load"><span><b>${L.n}</b> ${ui.day === 'all' ? 'passages' : 'exercices'}</span><span><b>${L.sets}</b> séries</span><span>≈ <b>${L.min >= 60 ? Math.floor(L.min / 60) + ' h ' + String(L.min % 60).padStart(2, '0') : L.min + ' min'}</b>${ui.day === 'all' ? ' / semaine' : ''}</span>${ui.day === 'all' ? `<small>${DAYS_().map(d => { const x = C.dayLoad(d.id); return `${esc(d.short)} ${x.sets} séries · ${x.min} min`; }).join(' — ')}</small>` : ''}</div>`; })()}
    <div class="row" style="margin-bottom:8px">
      <div class="grow sub" style="margin:0">Maintiens <b>⋮⋮</b> et glisse pour réordonner.</div>
      <button class="btn sm primary" id="start-day">Démarrer ${ui.day === 'all' ? 'la séance' : esc(dayOf(ui.day)?.short || '')}</button>
    </div>
    <div class="ex-list" id="active-list">${shown.map(e => exRow(e)).join('') || '<div class="empty">Aucun exercice pour ce jour.</div>'}</div>
    ${ui.day !== 'all' ? `<button class="btn block add-day" id="add-day">${ICON.plus.replace('<svg', '<svg width="18" height="18" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Ajouter un exercice au ${esc((dayOf(ui.day)?.label || '').split(' ·')[0].toLowerCase())}</button>` : ''}
    <button class="section-toggle" id="toggle-arch"><span>Anciens exercices · hors programme (${st.exercises.filter(e => !e.active).length})</span><span>${ui.showArch ? '▴' : '▾'}</span></button>
    ${ui.showArch ? `<input placeholder="Rechercher…" id="arch-filter" value="${esc(ui.archFilter)}" style="margin-bottom:8px">
    <div class="ex-list">${archived.map(x => exRow(x.e, true)).join('')}</div>` : ''}
    <button class="fab" id="fab-add" aria-label="Ajouter un exercice">${ICON.plus}</button>`;
  $$('[data-day]', v).forEach(b => b.onclick = () => { if (ui.day !== b.dataset.day) navPush(); ui.day = b.dataset.day; saveUi(); render(); });
  // le jour choisi reste visible à sa place (pas de retour au début de la liste)
  const chips = $('.chips', v);
  if (chips) { chips.scrollLeft = ui.chipsX || 0; chips.onscroll = () => { ui.chipsX = chips.scrollLeft; }; const on = $('.chip.on', chips); if (on && (on.offsetLeft < chips.scrollLeft || on.offsetLeft + on.offsetWidth > chips.scrollLeft + chips.clientWidth)) on.scrollIntoView({ inline: 'nearest', block: 'nearest' }); }
  const ad = $('#add-day', v); if (ad) ad.onclick = () => addToDay(ui.day);
  $('#toggle-arch').onclick = () => { ui.showArch = !ui.showArch; render(); };
  const af = $('#arch-filter'); if (af) af.oninput = () => { ui.archFilter = af.value; const pos = af.selectionStart; render(); const n = $('#arch-filter'); n.focus(); n.setSelectionRange(pos, pos); };
  $('#fab-add').onclick = () => editExercise(null);
  $$('[data-pack]', v).forEach(b => b.onclick = () => openPack(b.dataset.pack));
  const wb = $('[data-wkgo]', v); if (wb) wb.onclick = () => { ui.wk = +wb.dataset.wkgo; S().settings.weekSeen = wb.dataset.wkfrom; commit(); setTab('stats'); };
  $('#start-day').onclick = () => startSession(ui.day === 'all' ? null : ui.day);
  if (dr) { $('#dr-go').onclick = () => setTab('log'); $('#dr-del').onclick = () => deleteDraft(); }
  bindRows(v);
  if (window.Sortable) {
    new Sortable($('#active-list'), {
      handle: '.handle', animation: 160, delay: 0, ghostClass: 'sortable-ghost', chosenClass: 'sortable-chosen',
      onEnd: () => {
        const ids = $$('#active-list .ex-row').map(r => r.dataset.id);
        // positions occupées par le sous-ensemble filtré dans l'ordre global
        const all = S().exercises.filter(e => e.active).sort((a, b) => a.order - b.order);
        const slots = all.filter(e => ids.includes(e.id)).map(e => e.order);
        ids.forEach((id, i) => { getEx(id).order = slots[i]; });
        normalizeOrder(); S().meta.userOrdered = true; commit();
      },
    });
  }
}
/** Ajouter un exercice à un jour : d'abord ceux du programme (autres jours), puis seulement en bas les hors programme. */
function addToDay(day) {
  const dl = dayOf(day);
  const inProg = S().exercises.filter(e => e.active && !e.days.includes(day)).sort((a, b) => a.order - b.order);
  const outProg = S().exercises.filter(e => !e.active).map(e => ({ e, st: C.exStats(e.id) })).sort((a, b) => (b.st.last?.date || '').localeCompare(a.st.last?.date || ''));
  const sh = sheet(`<div class="sheet-head"><h2>Ajouter au ${esc(dl.label.split(' ·')[0].toLowerCase())}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <input id="ad-q" placeholder="Rechercher…" style="margin-bottom:10px">
    <div id="ad-list"></div>
    <button class="btn block" id="ad-new" style="margin-top:12px">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Créer un nouvel exercice</button>`, { full: true });
  const item = (e, extra) => `<button class="pick-row" data-id="${e.id}">${illuHTML(e, 'thumb')}<span class="grow"><b>${esc(e.name)}</b><small>${extra}</small></span><span class="pick-plus">${ICON.plus}</span></button>`;
  const draw = () => {
    const q = $('#ad-q', sh).value.toLowerCase();
    const f = e => e.name.toLowerCase().includes(q);
    const a = inProg.filter(f), b = outProg.filter(x => f(x.e));
    $('#ad-list', sh).innerHTML = `<h3 class="pick-h">Dans le programme · autres jours (${a.length})</h3>
      ${a.map(e => item(e, e.days.map(d => dayOf(d)?.short).join(' · ') + ' · ' + rangeOf(e))).join('') || '<div class="empty">Tous les exercices du programme sont déjà ce jour-là.</div>'}
      <h3 class="pick-h">Hors programme (${b.length})</h3>
      ${b.slice(0, 80).map(({ e, st }) => item(e, st.last ? `dernière fois ${fdate(st.last.date)}` : 'jamais fait')).join('')}`;
    $$('.pick-row', sh).forEach(btn => btn.onclick = () => {
      const e = getEx(btn.dataset.id);
      if (!e.days.includes(day)) e.days.push(day);
      if (!e.active) { e.active = true; e.order = 9999; normalizeOrder(); }
      e.userEdited = true; commit(); render(); toast(`« ${e.name} » ajouté au ${dl.short}`);
      btn.remove();
    });
  };
  $('#ad-q', sh).oninput = draw; draw();
  $('#ad-new', sh).onclick = () => { sh.close(); editExercise(null); };
}

// ---------------------------------------------------------------- Go Run / Go Kite : checklists des affaires à prendre
const packState = k => { const P = S().packs || (S().packs = {}); return P[k] || (P[k] = { done: {}, extra: [] }); };
function packItems(k) { return [...PACKS[k].groups.flatMap(g => g.items.map(([id]) => id)), ...packState(k).extra.map(x => x.id)]; }
function packCount(k) { const st = packState(k), all = packItems(k); return { total: all.length, done: all.filter(id => st.done[id]).length }; }
function openPack(k) {
  const pk = PACKS[k], st = packState(k);
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-close>${ICON.back}</button><h2>${pk.emoji} ${pk.title}</h2></div>
    <div class="pk-prog"><div class="pk-bar"><i></i></div><span id="pk-n"></span></div>
    <div id="pk-body"></div>
    <div class="field" style="margin-top:12px"><label>Ajouter quelque chose</label><div class="row"><input id="pk-new" placeholder="ex. crème solaire"><button class="btn sm primary" id="pk-add">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.4"')}</button></div></div>
    <button class="btn block" id="pk-reset" style="margin:8px 0 12px">Tout décocher (nouveau départ)</button>`, { full: true });
  const row = (id, label, icon, extra) => `<button class="pk-row ${st.done[id] ? 'on' : ''}" data-id="${esc(id)}">${gearIcon(icon)}<span class="grow">${esc(label)}</span>${extra ? `<span class="pk-del" data-del="${esc(id)}" aria-label="Supprimer">${ICON.x}</span>` : ''}<span class="pk-chk">${ICON.check}</span></button>`;
  const draw = () => {
    $('#pk-body', sh).innerHTML = pk.groups.map(g => `<h3 class="pick-h">${esc(g.title)}</h3>${g.items.map(([id, l, i]) => row(id, l, i)).join('')}`).join('')
      + (st.extra.length ? `<h3 class="pick-h">Ajouté par toi</h3>${st.extra.map(x => row(x.id, x.label, '➕', true)).join('')}` : '');
    const n = packCount(k);
    $('#pk-n', sh).textContent = n.done === n.total ? `Tout est prêt ✓ (${n.total})` : `${n.done}/${n.total} pris`;
    $('.pk-bar i', sh).style.width = `${n.total ? n.done / n.total * 100 : 0}%`;
    $$('.pk-row', sh).forEach(b => b.onclick = ev => {
      const del = ev.target.closest('[data-del]');
      if (del) { st.extra = st.extra.filter(x => x.id !== del.dataset.del); delete st.done[del.dataset.del]; commit(); draw(); return; }
      const id = b.dataset.id; if (st.done[id]) delete st.done[id]; else { st.done[id] = true; if (navigator.vibrate) navigator.vibrate(12); }
      commit(); draw();
      if (packCount(k).done === packCount(k).total) toast(`${pk.title} : tout est prêt, bonne session ! ${pk.emoji}`);
    });
  };
  draw();
  const add = () => { const v = $('#pk-new', sh).value.trim(); if (!v) return; st.extra.push({ id: 'x' + uid(), label: v }); $('#pk-new', sh).value = ''; commit(); draw(); };
  $('#pk-add', sh).onclick = add;
  $('#pk-new', sh).onkeydown = ev => { if (ev.key === 'Enter') add(); };
  $('#pk-reset', sh).onclick = () => { st.done = {}; commit(); draw(); toast('Liste remise à zéro'); };
  $$('[data-close]', sh).forEach(b => b.addEventListener('click', () => render()));
}

// ---------------------------------------------------------------- records en direct
function celebrateSet(e, s, d, card) {
  if (!e) return;
  const p = C.setPerf(e, s, d.date);
  const rec = C.recordCheck(e, p, d.date, d.id);
  if (!rec) return;
  d.records = d.records || {};
  const prevType = d.records[e.id];
  if (prevType === 'abs' || (prevType === 'rep' && rec.type === 'rep')) { flashBadge(card, rec.type); return; }
  d.records[e.id] = rec.type;
  flashBadge(card, rec.type);
  const abs = rec.type === 'abs';
  const unit = C.perfUnit(e);
  const ov = document.createElement('div');
  ov.className = 'rec-pop ' + (abs ? 'abs' : 'rep');
  ov.innerHTML = `<div class="rec-card"><div class="rec-ico">${abs ? '🏆' : '⚡'}</div><div class="rec-t">${abs ? 'Record absolu !' : 'Record de reprise !'}</div>
    <div class="rec-n">${esc(e.name)}</div><div class="rec-v">${fmt(p)} ${unit} <small>(avant : ${fmt(rec.prev)})</small></div>
    <div class="rec-s">${abs ? 'Ton meilleur niveau de tous les temps' : 'Ton meilleur depuis la reprise'}</div></div>
    ${abs ? Array.from({ length: 36 }, (_, i) => `<i style="--x:${Math.random() * 100}%;--d:${(Math.random() * .6).toFixed(2)}s;--c:${['#f5b942', '#4fd1c5', '#3b82f6', '#f97366'][i % 4]}"></i>`).join('') : ''}`;
  document.body.append(ov);
  if (navigator.vibrate) navigator.vibrate(abs ? [80, 60, 80, 60, 200] : [60, 40, 120]);
  const close = () => ov.remove();
  ov.onclick = close; setTimeout(close, abs ? 3200 : 2200);
}
function flashBadge(card, type) {
  const h = $('h3', card); if (!h) return;
  $('.rec-tag', h)?.remove();
  h.insertAdjacentHTML('beforeend', type === 'abs' ? ' <span class="rec-tag pr-badge">🏆 RECORD</span>' : ' <span class="rec-tag rep-badge">⚡ REPRISE</span>');
}

function normalizeOrder() { S().exercises.filter(e => e.active).sort((a, b) => a.order - b.order).forEach((e, i) => e.order = i); }

function bindRows(v) {
  $$('.ex-row', v).forEach(r => {
    const id = r.dataset.id;
    $('[data-open]', r).onclick = () => openExercise(id);
    const m = $('[data-menu]', r); if (m) m.onclick = () => exMenu(id);
    const rs = $('[data-restore]', r); if (rs) rs.onclick = () => { const e = getEx(id); e.active = true; if (!e.days.length) e.days = [DAYS_()[0].id]; e.order = 9999; normalizeOrder(); commit(); toast(`« ${e.name} » remis dans le programme`); render(); };
  });
}

function exMenu(id) {
  const e = getEx(id);
  const sh = sheet(`<h2 style="margin-top:0">${esc(e.name)}</h2><div class="menu">
    <button data-a="open">Voir la progression</button>
    <button data-a="edit">Modifier (jours, reps, incrément…)</button>
    <button data-a="plan">Marquer la charge pour la prochaine fois</button>
    <button data-a="arch">Retirer du programme (garder l'historique)</button>
    <button data-a="del" style="color:var(--bad)">Supprimer définitivement</button></div>`);
  $$('[data-a]', sh).forEach(b => b.onclick = async () => {
    sh.close();
    const a = b.dataset.a;
    if (a === 'open') openExercise(id);
    if (a === 'edit') editExercise(e);
    if (a === 'plan') editPlan(e);
    if (a === 'arch') { e.active = false; commit(); toast('Retiré du programme — retrouvable dans « Anciens exercices »'); render(); }
    if (a === 'del') {
      const n = C.exStats(id).n;
      if (await confirmBox(`Supprimer « ${e.name} »${n ? ` et ses ${n} séances d'historique` : ''} ?`, 'Supprimer', true)) {
        S().exercises = S().exercises.filter(x => x.id !== id);
        S().sessions.forEach(s => s.entries = s.entries.filter(en => en.ex !== id));
        S().sessions = S().sessions.filter(s => s.entries.length);
        C.invalidate(); commit(); render();
      }
    }
  });
}

// ---------------------------------------------------------------- édition exercice
function editExercise(e, { onSaved = null, free = false } = {}) {
  const isNew = !e;
  const d = e ? { ...e } : normalizeExercise({ name: '', active: true, days: !free && ui.day !== 'all' ? [ui.day] : [], equip: 'machine', type: 'load', category: 'Autre' });
  const mz = { p: [...MZ.muscleOf(d).p], s: [...MZ.muscleOf(d).s] };
  const sh = sheet(`<div class="sheet-head"><h2>${isNew ? 'Nouvel exercice' : 'Modifier'}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="field"><label>Nom</label><input id="f-name" value="${isNew ? '' : esc(d.name)}" placeholder="ex. Curl marteau"></div>
    <div class="field"><label>Illustration</label><div class="row" style="gap:10px;align-items:center">${illuHTML(d, 'thumb lg')}<div class="grow"><button class="btn sm" id="f-illu" type="button">Changer l'illustration…</button></div></div></div>
    <div class="field"><label>Jours du programme</label><div class="seg" id="f-days">${DAYS_().map(x => `<button data-v="${x.id}" class="${d.days.includes(x.id) ? 'on' : ''}">${esc(x.label)}</button>`).join('')}</div></div>
    <div class="field"><label>Matériel</label><div class="seg" id="f-equip">${Object.entries(EQUIP).map(([k, x]) => `<button data-v="${k}" class="${d.equip === k ? 'on' : ''}">${x.label}</button>`).join('')}</div><div class="hint" id="f-equip-hint">${EQUIP[d.equip]?.hint || ''}</div></div>
    <div class="field"><label>Mesure</label><div class="seg" id="f-type">${Object.entries(TYPES).filter(([k]) => k !== 'group' || d.type === 'group').map(([k, x]) => `<button data-v="${k}" class="${d.type === k ? 'on' : ''}">${x}</button>`).join('')}</div></div>
    <div class="grid3">
      <div class="field"><label>Séries</label><input id="f-sets" type="number" inputmode="numeric" value="${d.sets}"></div>
      <div class="field" data-rep><label>Reps min</label><input id="f-rmin" type="number" inputmode="numeric" value="${d.repMin}"></div>
      <div class="field" data-rep><label>Reps max</label><input id="f-rmax" type="number" inputmode="numeric" value="${d.repMax}"></div>
      <div class="field" data-time><label>Durée min (s)</label><input id="f-tmin" type="number" inputmode="numeric" value="${d.timeMin}"></div>
      <div class="field" data-time><label>Durée max (s)</label><input id="f-tmax" type="number" inputmode="numeric" value="${d.timeMax}"></div>
    </div>
    <div class="field" data-inc><label>Incrément de charge (kg)</label><input id="f-inc" type="number" inputmode="decimal" step="0.25" value="${d.inc}"><div class="hint">Quand tu réussis 12 reps sur une série, la séance suivante propose +1 ou 2 kg (selon le matériel) et le nombre de reps que ta force visée permet.</div></div>
    <label class="check-row"><input type="checkbox" id="f-side" ${d.side ? 'checked' : ''}> Par côté (un bras / une jambe à la fois : séries comptées ×2)</label>
    <label class="check-row"><input type="checkbox" id="f-ss" ${d.superset ? 'checked' : ''}> Superset : enchaîner avec l'exercice suivant du jour, puis repos (gain de temps)</label>
    <div class="field"><label>Catégorie</label><select id="f-cat">${CATEGORIES.map(c => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field" data-dose><label>Dosage (durée, répétitions)</label><input id="f-dose" value="${esc(d.dose || '')}" placeholder="ex. 2 × 45-60 s"></div>
    <div class="field"><label>Consigne / repère</label><input id="f-cue" value="${esc(d.cue)}" placeholder="ex. descente 3 s"></div>
    <div class="field"><label>Muscles <span class="muted">· 1 appui = principal, 2 = secondaire, 3 = aucun</span></label><div id="f-mz-fig"></div><div class="seg mz-seg" id="f-mz"></div></div>
    <button class="btn primary block" id="f-save">${isNew ? (free ? 'Créer l\'exercice' : 'Ajouter au programme') : 'Enregistrer'}</button>`);
  const drawMz = () => {
    $('#f-mz-fig', sh).innerHTML = MZ.bodySVG(id => mz.p.includes(id) ? { c: 'var(--mz-p)' } : mz.s.includes(id) ? { c: 'var(--mz-s)' } : { c: 'var(--mz-0)' }, { small: true });
    $('#f-mz', sh).innerHTML = MZ.MUSCLES.map(m => `<button type="button" data-m="${m.id}" class="${mz.p.includes(m.id) ? 'on' : mz.s.includes(m.id) ? 'half' : ''}">${esc(m.short)}</button>`).join('');
    $$('#f-mz button', sh).forEach(b => b.onclick = () => { const id = b.dataset.m; if (mz.p.includes(id)) { mz.p = mz.p.filter(x => x !== id); mz.s.push(id); } else if (mz.s.includes(id)) mz.s = mz.s.filter(x => x !== id); else mz.p.push(id); drawMz(); });
  };
  drawMz();
  const seg = (id, multi) => $$(`#${id} button`, sh).forEach(b => b.onclick = () => {
    if (multi) b.classList.toggle('on'); else { $$(`#${id} button`, sh).forEach(x => x.classList.remove('on')); b.classList.add('on'); }
    if (id === 'f-equip') { $('#f-equip-hint', sh).textContent = EQUIP[b.dataset.v].hint; $('#f-inc', sh).value = EQUIP[b.dataset.v].inc; }
    vis();
  });
  const vis = () => {
    const t = $('#f-type .on', sh)?.dataset.v;
    const tt = t === 'time' || t === 'load_time';
    $$('[data-rep]', sh).forEach(x => x.style.display = tt ? 'none' : '');
    $$('[data-time]', sh).forEach(x => x.style.display = tt ? '' : 'none');
    const ck = t === 'check' || t === 'group';
    $('[data-inc]', sh).style.display = (t === 'reps' || t === 'time' || ck) ? 'none' : '';
    if (ck) { $$('[data-rep], [data-time]', sh).forEach(x => x.style.display = 'none'); }
    $('[data-dose]', sh).style.display = ck ? '' : 'none';
  };
  seg('f-days', true); seg('f-equip'); seg('f-type'); vis();
  $('#f-illu', sh).onclick = () => pickIllustration(d, img => { d.img = img; if (e) e.img = img; const t = $('.illu', sh); t.outerHTML = illuHTML(d, 'thumb lg'); if (e) { commit(); } });
  $('#f-save', sh).onclick = () => {
    const name = $('#f-name', sh).value.trim();
    if (!name) { toast('Donne un nom à l\'exercice'); return; }
    const t = e || d;
    Object.assign(t, {
      name, days: $$('#f-days .on', sh).map(b => b.dataset.v), equip: $('#f-equip .on', sh).dataset.v, type: $('#f-type .on', sh).dataset.v,
      sets: +$('#f-sets', sh).value || 3, repMin: +$('#f-rmin', sh).value || 8, repMax: +$('#f-rmax', sh).value || 12,
      timeMin: +$('#f-tmin', sh).value || 20, timeMax: +$('#f-tmax', sh).value || 45, inc: +$('#f-inc', sh).value || 0,
      category: $('#f-cat', sh).value, cue: $('#f-cue', sh).value, dose: $('#f-dose', sh).value.trim(), side: $('#f-side', sh).checked, superset: $('#f-ss', sh).checked, img: d.img ?? t.img ?? null,
    });

    if (t.repMax < t.repMin) t.repMax = t.repMin;
    const auto = MZ.EX_MUSCLES[t.id];
    if (auto && auto.p.join() === mz.p.join() && auto.s.join() === mz.s.join()) delete t.muscles; else t.muscles = { p: mz.p, s: mz.s };
    if (isNew) { t.id = uid(); t.active = !free || t.days.length > 0; t.order = 9999; S().exercises.push(t); normalizeOrder(); }
    t.userEdited = true;
    C.invalidate(); S()._rev = (S()._rev || 0) + 1; commit(); sh.close();
    if (onSaved) onSaved(t); else render();
    toast(isNew ? 'Exercice créé' : 'Enregistré');
  };
}

// ---------------------------------------------------------------- plan manuel « prochaine fois »
function editPlan(e) {
  const sg = C.suggest({ ...e, plan: null });
  const cur = e.plan?.manual ? e.plan.sets : sg.sets;
  const time = e.type === 'time', repsOnly = e.type === 'reps', k2 = e.type === 'load_time' ? 't' : 'r';
  const rows = Array.from({ length: e.sets }, (_, i) => cur[i] || cur.at(-1) || {});
  const sh = sheet(`<div class="sheet-head"><h2>Prochaine fois · ${esc(e.name)}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <p class="sub">Suggestion automatique : <b>${esc(sg.sets.map(s => C.fmtSet(e, s)).join(' · '))}</b>${sg.note ? '<br>' + esc(sg.note) : ''}</p>
    <div class="col-h ${time || repsOnly ? 'time' : ''}"><span>#</span>${time ? '<span>secondes</span>' : repsOnly ? '<span>reps</span>' : `<span>${unitW(e)}</span><span>${k2 === 't' ? 'secondes' : 'reps'}</span>`}<span></span></div>
    ${rows.map((s, i) => `<div class="set-row ${time || repsOnly ? 'time' : ''}" data-i="${i}"><span class="n">${i + 1}</span>${time ? `<input data-k="t" type="number" inputmode="numeric" value="${s.t ?? ''}">` : repsOnly ? `<input data-k="r" type="number" inputmode="numeric" value="${s.r ?? ''}">` : `<input data-k="w" type="number" inputmode="decimal" step="0.25" value="${s.w ?? ''}"><input data-k="${k2}" type="number" inputmode="numeric" value="${s[k2] ?? ''}">`}<span></span></div>`).join('')}
    <div class="field"><label>Note</label><input id="p-note" value="${esc(e.plan?.note || '')}" placeholder="ex. passer aux haltères de 14"></div>
    <div class="grid2"><button class="btn" id="p-auto">Revenir à l'auto</button><button class="btn primary" id="p-save">Enregistrer</button></div>`);
  $('#p-auto', sh).onclick = () => { e.plan = null; commit(); sh.close(); render(); toast('Suggestion automatique rétablie'); };
  $('#p-save', sh).onclick = () => {
    const sets = $$('.set-row', sh).map(r => { const o = {}; $$('input', r).forEach(inp => { if (inp.value !== '') o[inp.dataset.k] = +inp.value; }); return o; });
    e.plan = { manual: true, sets, note: $('#p-note', sh).value, date: today() };
    commit(); sh.close(); render(); toast('Objectif enregistré pour la prochaine séance');
  };
}

// ---------------------------------------------------------------- détail exercice
function openExercise(id) {
  const e = getEx(id);
  const st = C.exStats(id);
  const br = C.breaks();
  const unit = C.perfUnit(e);
  const sg = C.suggest(e);
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-close>${ICON.back}</button><h2>${esc(e.name)}</h2><button class="icon-btn" id="d-menu">${ICON.dots}</button></div>
    <button class="illu-btn" id="d-illu" aria-label="Changer l'illustration">${illuHTML(e, 'hero')}</button>
    ${muscleCard(e)}
    <div class="sub">${e.active ? e.days.map(dayTag).join('') + rangeOf(e) : '<span class="tag">Hors programme</span>'} · ${EQUIP[e.equip]?.label || ''} · ${TYPES[e.type]}${e.cue ? ' · ' + esc(e.cue) : ''}</div>
    ${st.n ? `<div class="kpis">
      <div class="kpi"><b>${fmt(st.last.perf)}<small> ${unit}</small></b><span>${C.perfLabel(e)} actuel</span></div>
      <div class="kpi"><b>${fmt(st.best.perf)}<small> ${unit}</small></b><span>Record · ${fdate(st.best.date)}</span></div>
      <div class="kpi"><b>${st.gap > 0 ? '+' + fmt(st.gap) : '✓'}<small>${st.gap > 0 ? ' ' + unit : ''}</small></b><span>${st.gap > 0 ? `à regagner (${fmt(st.gapPct, 0)} %)` : 'Au record !'}</span></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row" style="margin-bottom:6px"><b class="grow">${C.perfLabel(e)}</b><div class="range" id="d-range">${['3m', '1a', '5a', 'all'].map(r => `<button data-r="${r}" class="${(ui.exRange || 'all') === r ? 'on' : ''}">${{ '3m': '3 m', '1a': '1 an', '5a': '5 ans', all: 'Tout' }[r]}</button>`).join('')}</div></div>
      <div id="d-chart"></div>
      <div class="legend"><span><i style="background:var(--series-1)"></i>${C.perfLabel(e)}</span><span><i class="pr"></i>Record absolu</span><span><i class="pr rep"></i>Record de reprise</span><span><i class="hatch"></i>Pause &gt; 2 mois</span></div>
      <div class="sub" style="margin:6px 0 0">Courbe = meilleure performance des 4 dernières semaines ; points gris = chaque séance.</div>
    </div>` : '<div class="empty">Pas encore d\'historique pour cet exercice.</div>'}
    ${e.active ? configCard(e) : ''}
    ${e.active ? `<div class="card" style="margin-top:12px"><div class="row"><b class="grow">Prochaine séance</b><button class="btn sm" id="d-plan">Modifier</button></div>
      <div style="margin-top:6px;font-size:16px;font-weight:700;color:var(--accent)">${esc(sg.sets.map(s => C.fmtSet(e, s)).join(' · ') || '—')}</div>
      <div class="sub" style="margin:4px 0 0">${sg.manual ? 'Objectif marqué manuellement.' + (sg.note ? ' ' + esc(sg.note) : '') : esc(sg.note || `${e.type === 'time' ? 'Vise ' + e.timeMax + ' s sur chaque série.' : 'Quand tu réussis 12 reps à une charge, la séance suivante ajoute 1 ou 2 kg et vise les reps que ta force permet (1RM estimé +1 %).'}`)}</div></div>` : ''}
    <h2>Séances (${st.n})</h2>
    <div class="legend" style="margin:-4px 0 6px"><span><span class="pr-badge">PR</span> record absolu</span><span><span class="rep-badge">R</span> record de reprise (meilleur depuis la dernière pause)</span></div>
    <table><thead><tr><th>Date</th><th>Séries</th><th class="r">${unit}</th></tr></thead><tbody>
    ${st.arr.slice().reverse().slice(0, 80).map((h, i, a) => { const prev = a[i + 1]; const d = prev ? h.perf - prev.perf : 0; return `<tr><td>${fdate(h.date)}${h.session.approx ? ' <span class="muted">≈</span>' : ''}</td><td>${esc(C.fmtEntry(e, h.entry))}${h.isPR ? ' <span class="pr-badge">PR</span>' : h.isSegPR ? ' <span class="rep-badge">R</span>' : ''}</td>
<td class="r">${fmt(h.perf)}${prev ? `<br><small class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${fmt(d)}</small>` : ''}</td></tr>`; }).join('')}
    </tbody></table>
    ${C.suspectsOf(id).length ? `<h2>Valeurs écartées (${C.suspectsOf(id).length})</h2><p class="sub">Trop éloignées de tes séances voisines (probable erreur de saisie) : elles ne comptent pas dans les records. Si c'était bien réel, réintègre-les.</p>
      ${C.suspectsOf(id).map(h => `<div class="row card" style="padding:8px 10px;margin-bottom:6px"><span class="grow">${fdate(h.date)} · ${esc(C.fmtEntry(e, h.entry))} <span class="muted">(${fmt(h.perf)} ${unit})</span></span><button class="btn sm" data-ok-sid="${h.session.id}">C'était réel</button></div>`).join('')}` : ''}
    <div class="grid2" style="margin-top:16px">${e.active ? `<button class="btn" id="d-arch">${ICON.archive.replace('<svg', '<svg width="18" height="18" style="fill:none;stroke:currentColor;stroke-width:1.8"')} Retirer du programme</button>` : `<button class="btn primary" id="d-restore">Remettre dans le programme</button>`}<button class="btn" id="d-edit">Modifier</button></div>`, { full: true });
  const draw = () => {
    const host = $('#d-chart', sh); if (!host) return;
    const from = rangeStart(ui.exRange || 'all');
    const raw = st.arr.filter(h => h.date >= from).map(h => ({ ...h, label: C.fmtEntry(e, h.entry) }));
    const pts = C.rollingMax(raw);
    lineChart(host, { points: pts, scatter: raw.map(h => ({ date: h.date, y: h.perf })), breaks: br, unit, refLine: { y: st.best.perf, label: 'Record ' + fmt(st.best.perf) }, height: 200, aria: `${C.perfLabel(e)} de ${e.name}` });
  };
  requestAnimationFrame(draw);
  $$('#d-range button', sh).forEach(b => b.onclick = () => { ui.exRange = b.dataset.r; $$('#d-range button', sh).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  $('#d-menu', sh).onclick = () => exMenu(id);
  if (e.active) bindConfig(sh, e);
  $$('[data-ok-sid]', sh).forEach(b => b.onclick = () => { const s = S().sessions.find(x => x.id === b.dataset.okSid); const en = s?.entries.find(x => x.ex === id); if (en) { en.ok = true; S()._rev++; C.invalidate(); commit(); sh.close(); openExercise(id); toast('Valeur réintégrée'); } });
  $('#d-illu', sh).onclick = () => pickIllustration(e, img => { e.img = img; commit(); $('#d-illu', sh).innerHTML = illuHTML(e, 'hero'); });
  const p = $('#d-plan', sh); if (p) p.onclick = () => { sh.close(); editPlan(e); };
  $('#d-edit', sh).onclick = () => { sh.close(); editExercise(e); };
  const a = $('#d-arch', sh); if (a) a.onclick = () => { e.active = false; commit(); sh.close(); render(); toast('Retiré du programme'); };
  const r = $('#d-restore', sh); if (r) r.onclick = () => { e.active = true; e.order = 9999; normalizeOrder(); commit(); sh.close(); render(); toast('Remis dans le programme'); };
}

// ---------------------------------------------------------------- réglages rapides de l'exercice (séries, reps, jours)
function configCard(e) {
  const time = e.type === 'time' || e.type === 'load_time';
  const step = (k, v, lbl) => `<div class="stepper" data-k="${k}"><span class="st-l">${lbl}</span><button data-d="-1" aria-label="moins">−</button><b>${v}</b><button data-d="1" aria-label="plus">+</button></div>`;
  return `<div class="card cfg" style="margin-top:12px"><b>Dans ton programme</b>
    <div class="cfg-days">${DAYS_().map(d => `<button class="chip ${e.days.includes(d.id) ? 'on' : ''}" data-cday="${d.id}">${esc(d.short)}</button>`).join('')}</div>
    <div class="cfg-row">${e.days.length ? e.days.map(d => step('sets:' + d, setsOn(e, d), `Séries ${esc(dayOf(d)?.short || d)}`)).join('') : step('sets', e.sets, 'Séries')}</div>
    <div class="cfg-row">${time ? step('timeMin', e.timeMin, 'Durée min (s)') + step('timeMax', e.timeMax, 'max') : step('repMin', e.repMin, 'Reps min') + step('repMax', e.repMax, 'max')}</div>
    <div class="hint">${time ? 'Quand tu tiens la durée max, l\'objectif augmente.' : 'Quand tu réussis 12 reps sur une série, la charge monte de 1 ou 2 kg la séance suivante.'}</div></div>`;
}
function bindConfig(sh, e) {
  const host = $('.cfg', sh); if (!host) return;
  const redraw = () => { e.userEdited = true; S()._rev++; C.invalidate(); commit(); host.outerHTML = configCard(e); bindConfig(sh, e); render(); };
  $$('[data-cday]', host).forEach(b => b.onclick = () => {
    const d = b.dataset.cday;
    if (e.days.includes(d)) { if (e.days.length === 1) { toast('Au moins un jour — sinon retire l\'exercice du programme'); return; } e.days = e.days.filter(x => x !== d); if (e.daySets) delete e.daySets[d]; }
    else e.days = DAYS_().map(x => x.id).filter(x => x === d || e.days.includes(x));
    redraw();
  });
  $$('.stepper', host).forEach(st => $$('button', st).forEach(b => b.onclick = () => {
    const [k, day] = st.dataset.k.split(':'), dlt = +b.dataset.d;
    if (k === 'sets') {
      const v = Math.max(1, Math.min(10, (day ? setsOn(e, day) : e.sets) + dlt));
      if (day && e.days.length > 1) {
        const vals = Object.fromEntries(e.days.map(x => [x, x === day ? v : setsOn(e, x)]));
        e.sets = Math.max(...Object.values(vals));
        const ds = Object.fromEntries(Object.entries(vals).filter(([, n]) => n !== e.sets));
        e.daySets = Object.keys(ds).length ? ds : null;
      }
      else { e.sets = v; e.daySets = null; }
    } else {
      const stp = k.startsWith('time') ? 5 : 1;
      e[k] = Math.max(stp, e[k] + dlt * stp);
      if (e.repMax < e.repMin) k === 'repMin' ? e.repMax = e.repMin : e.repMin = e.repMax;
      if (e.timeMax < e.timeMin) k === 'timeMin' ? e.timeMax = e.timeMin : e.timeMin = e.timeMax;
    }
    redraw();
  }));
}

function rangeStart(r) {

  const d = new Date();
  if (r === '3m') d.setMonth(d.getMonth() - 3); else if (r === '1a') d.setFullYear(d.getFullYear() - 1); else if (r === '5a') d.setFullYear(d.getFullYear() - 5); else return '0000';
  return C.iso(d);
}

// ================================================================ SÉANCE
// La séance en cours fait partie des données (S().draft) : elle est sauvegardée et synchronisée
// en continu — tu peux fermer l'app ou changer de téléphone sans la perdre.
const loadDraft = () => S().draft || null;
const saveDraft = d => { S().draft = d || null; store.persist(); };

// ---------------------------------------------------------------- chrono
const pad = n => String(n).padStart(2, '0');
function clock(start, end = Date.now()) {
  if (!start) return '0:00';
  const s = Math.max(0, Math.round((end - start) / 1000));
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60;
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
const hhmm = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
const fmtMin = m => m >= 60 ? `${Math.floor(m / 60)} h ${pad(m % 60)}` : `${m} min`;
setInterval(() => {
  $$('[data-clock], [data-since]').forEach(el => { const v = +(el.dataset.clock || el.dataset.since); if (v) el.textContent = clock(v); });
  const r = $('[data-rest]');
  if (r) {
    const v = +r.dataset.rest; if (!v) return;
    const s = Math.round((Date.now() - v) / 1000), goal = +r.dataset.goal || S().settings.restSec || 120;
    r.textContent = clock(v);
    r.parentElement.classList.toggle('over', s >= goal);
    if (s === goal && navigator.vibrate) navigator.vibrate([120, 80, 120]);
  }
}, 1000);

async function deleteDraft() {
  if (!(await confirmBox('Supprimer la séance en cours ? Rien ne sera enregistré.', 'Supprimer', true))) return;
  saveDraft(null); render(); toast('Séance supprimée');
}

const isCheck = e => e && (e.type === 'check' || e.type === 'group');
const checkItems = e => e.type === 'group' ? (e.items || []).map(id => getEx(id)).filter(Boolean) : [e];
const tplOf = id => (S().templates || []).find(t => t.id === id);
function startSession(day, ids = null, tpl = null) {
  const cur = loadDraft();
  if (cur) { setTab('log'); toast('Une séance est déjà en cours — termine-la ou supprime-la'); return; }
  const list = ids ? ids.map(getEx).filter(Boolean) : S().exercises.filter(e => e.active && (!day || e.days.includes(day))).sort((a, b) => a.order - b.order);
  const dl = !!C.deloadActive(); // décharge : ≈ −40 % de séries, objectifs fixés à la main ignorés
  const nSets = n => dl && n >= 2 ? Math.max(1, Math.round(n * 0.6)) : n;
  saveDraft({ id: uid(), date: today(), day, tpl: tpl || null, custom: !day, deload: dl || undefined, note: '', startedAt: Date.now(), lastSetAt: null, entries: list.map(e => { if (isCheck(e)) return { ex: e.id, checks: {}, sets: [] }; const tg = !dl && tpl && tplOf(tpl)?.targets?.[e.id]; return { ex: e.id, ...(tg ? { target: { ...tg } } : {}), sets: Array.from({ length: nSets((tpl && tplOf(tpl)?.sets?.[e.id]) || setsOn(e, day)) }, () => ({})) }; }) });
  setTab('log');
}

function renderLog(v) {
  const d = loadDraft();
  if (!d) {
    const last = S().sessions.at(-1);
    const td = todayDay();
    v.innerHTML = `<h1>Séance</h1><p class="sub">Choisis la séance du jour : le chrono démarre aussitôt. Les charges proposées tiennent compte de ta dernière fois et des incréments réels de chaque matériel.</p>
      ${deloadCard()}
      <div class="menu">${DAYS_().map(x => `<button data-start="${x.id}" class="${td?.id === x.id ? 'today' : ''}"><div class="row"><span class="grow">${esc(x.label)}${td?.id === x.id ? ' <span class="tag">aujourd\'hui</span>' : ''}</span><span class="muted">${S().exercises.filter(e => e.active && e.days.includes(x.id)).length} exos ›</span></div></button>`).join('')}
      <button data-custom><div class="row"><span class="grow">Nouvelle séance personnalisée<br><small class="muted">tes exercices actuels, les anciens ou un nouveau</small></span><span class="muted">›</span></div></button></div>
      ${(S().templates || []).length ? `<h2>Mes séances custom</h2><div class="menu">${S().templates.map(t => `<div class="tpl-row"><button class="grow" data-tpl="${t.id}"><div class="row"><span class="grow"><b>${esc(t.name)}</b><br><small class="muted">${t.ex.length} exercices · ${esc(t.ex.map(id => getEx(id)?.name).filter(Boolean).slice(0, 4).join(', '))}${t.ex.length > 4 ? '…' : ''}${t.used ? ` · dernière ${fdate(t.used)}` : ''}</small></span><span class="muted">›</span></div></button><button class="tpl-go" data-tpl-go="${t.id}" aria-label="Commencer directement">▶</button></div>`).join('')}</div><p class="sub" style="margin-top:6px">Appuie sur une séance pour la configurer, ▶ pour la commencer tout de suite.</p>` : ''}
      ${last ? `<p class="sub" style="margin-top:16px">Dernière séance : ${fdate(last.date)} (il y a ${C.fmtDuration(daysBetween(last.date, today()))}).</p>` : ''}`;
    $$('[data-start]', v).forEach(b => b.onclick = () => startSession(b.dataset.start || null));
    $('[data-custom]', v).onclick = () => customSession();
    bindDeload(v);
    $$('[data-tpl]', v).forEach(b => b.onclick = () => tplEdit(tplOf(b.dataset.tpl)));
    $$('[data-tpl-go]', v).forEach(b => b.onclick = () => startTpl(tplOf(b.dataset.tplGo)));
    return;
  }
  if (!d.startedAt) d.startedAt = Date.now();
  // exercices déjà terminés (avant cette version) : on garde leur ordre
  d.entries.forEach((en, i) => { if (!en.doneAt && en.sets.length && en.sets.every(x => x.done)) en.doneAt = 1 + i; });
  const name = d.day ? (dayOf(d.day)?.short || 'Séance') : (tplOf(d.tpl)?.name || 'Custom');
  const paused = !!d.pausedAt;
  v.innerHTML = `<div class="timer-bar ${paused ? 'paused' : ''}">
      <div class="tb-main"><span class="tb-l">${esc(name)} · ${paused ? 'en pause' : 'durée'}</span><b ${paused ? '' : `data-clock="${d.startedAt}"`}>${clock(d.startedAt, paused ? d.pausedAt : undefined)}</b></div>
      <div class="tb-rest"><span class="tb-l">Repos</span><b ${paused ? '' : `data-rest="${d.lastSetAt || ''}" data-goal="${d.restGoal || ''}"`}>${d.lastSetAt ? clock(d.lastSetAt, paused ? d.pausedAt : undefined) : '–'}</b><span class="tb-s">${esc(d.restLabel || 'objectif ' + clock(1, 1 + (S().settings.restSec || 120) * 1000))}</span></div>
      <span class="grow"></span>
      <button class="icon-btn tb-menu" id="l-menu" aria-label="Options de la séance">${ICON.dots}</button>
      <button class="icon-btn tb-pause ${paused ? 'on' : ''}" id="l-pause" aria-label="${paused ? 'Reprendre' : 'Pause'}">${paused ? ICON.play : ICON.pause}</button>
      <button class="btn sm primary" id="l-finish">Terminer</button>
    </div>
    ${paused ? `<div class="card pause-card"><div class="pause-t">${ICON.pause} Séance en pause</div><div class="sub" style="margin:2px 0 10px">depuis ${hhmm(d.pausedAt)} · <span data-since="${d.pausedAt}">${clock(d.pausedAt)}</span> · le chrono et le repos sont arrêtés</div><button class="btn primary block" id="l-resume">${ICON.play} Reprendre la séance</button></div>` : ''}
    ${!paused && Date.now() - lastActivity(d) > 3 * 3600e3 ? `<div class="card idle-card"><div class="pause-t">⏰ Séance oubliée ?</div><div class="sub" style="margin:2px 0 10px">Rien n'a été noté depuis ${hhmm(lastActivity(d))}. Le chrono continue de tourner.</div><div class="grid2"><button class="btn" id="l-idle-ok">Je continue</button><button class="btn primary" id="l-idle-end">Terminer à ${hhmm(lastActivity(d) + 5 * 60e3)}</button></div></div>` : ''}
    <div id="l-editor" class="${paused ? 'is-paused' : ''}"></div>
    <button class="btn sm" id="l-add" style="margin:2px 0 10px">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Exercice</button>
    <div class="field"><label>Notes de séance</label><textarea id="l-note" rows="2" placeholder="Sensations, douleurs, conditions…">${esc(d.note)}</textarea></div>`;
  const ed = $('#l-editor', v);
  const onSet = (e, nextEn) => {
    d.lastSetAt = Date.now();
    const nx = d.day && e?.superset && nextEn ? getEx(nextEn.ex) : null;
    d.restGoal = e ? C.restFor(e, !!nx) : (S().settings.restSec || 120);
    d.restLabel = nx ? `⇄ enchaîne : ${nx.name}` : `objectif ${clock(1, 1 + d.restGoal * 1000)}`;
    saveDraft(d);
    const r = $('[data-rest]', v); if (r) { r.dataset.rest = d.lastSetAt; r.dataset.goal = d.restGoal; r.textContent = '0:00'; r.parentElement.classList.remove('over'); $('.tb-s', r.parentElement).textContent = d.restLabel; }
  };
  // exercice terminé : il remonte avec les exercices faits (ordre chronologique), l'écran va au suivant
  const onDone = () => setTimeout(() => {
    if (loadDraft() !== d || !ed.isConnected) return;
    const dn = d.entries.filter(x => x.doneAt).sort((x, y) => x.doneAt - y.doneAt);
    d.entries = [...dn, ...d.entries.filter(x => !x.doneAt)];
    const nx = d.entries.find(x => !x.doneAt); if (nx && getEx(nx.ex)?.type === 'group') openGroups.add(nx.ex);
    saveDraft(d);
    const wasKp = kp.open;
    draw();
    const next = $$('.log-ex', ed).find(c => !d.entries[+c.dataset.ei]?.doneAt);
    if (next) { next.scrollIntoView({ block: 'start', behavior: 'smooth' }); const i = $('.set-row input', next); if (wasKp && i) kpOpen(i, false); else if (wasKp) kpClose(); }
    else { if (wasKp) kpClose(); $('#l-add', v).scrollIntoView({ block: 'center', behavior: 'smooth' }); toast('Tous les exercices sont faits 💪'); }
  }, 450);
  const draw = () => sessionEditor(ed, d, () => saveDraft(d), { suggest: true, onSet, live: true, onDone });
  draw();
  $('#l-menu', v).onclick = () => sessionMenu(d, name);
  const togglePause = () => {
    if (d.pausedAt) { const dt = Date.now() - d.pausedAt; d.startedAt += dt; if (d.lastSetAt) d.lastSetAt += dt; d.pausedTotal = (d.pausedTotal || 0) + dt; d.pausedAt = null; toast('Séance reprise'); }
    else { if (kp.open) kpClose(); d.realStart = d.realStart || d.startedAt; d.pausedAt = Date.now(); toast('Séance en pause'); }
    saveDraft(d); render(); window.scrollTo(0, 0);
  };
  $('#l-pause', v).onclick = togglePause;
  const rs = $('#l-resume', v); if (rs) rs.onclick = togglePause;
  $('#l-note', v).oninput = ev => { d.note = ev.target.value; saveDraft(d); };
  $('#l-add', v).onclick = () => pickExercise(id => { const e = getEx(id); d.entries.push(isCheck(e) ? { ex: id, checks: {}, sets: [] } : { ex: id, sets: Array.from({ length: e.sets || 3 }, () => ({})) }); saveDraft(d); render(); setTimeout(() => $$('.log-ex').at(-1)?.scrollIntoView({ block: 'start', behavior: 'smooth' }), 60); }, d.entries.map(en => en.ex));
  $('#l-finish', v).onclick = () => finishFlow(d);
  const io = $('#l-idle-ok', v); if (io) io.onclick = () => { d.idleOk = Date.now(); saveDraft(d); render(); };
  const ie = $('#l-idle-end', v); if (ie) ie.onclick = () => { d.endAt = lastActivity(d) + 5 * 60e3; saveDraft(d); finishFlow(d, false); };
}

// ---------------------------------------------------------------- semaine de décharge (simple proposition)
function deloadCard() {
  const on = C.deloadActive();
  if (on) return `<div class="card dl-card on"><b>🔋 Semaine de décharge en cours</b><div class="sub" style="margin:4px 0 8px">Jusqu'au ${fdate(on.to)} : moins de séries (≈ −40 %), charges −10 %, mêmes reps que la dernière fois, garde 2-3 reps en réserve. Ensuite la progression repart de tes chiffres d'avant.</div><button class="btn sm" data-dl-stop>Arrêter la décharge</button></div>`;
  const a = C.deloadAdvice(); if (!a) return '';
  return `<div class="card dl-card"><b>🔋 Une semaine de décharge serait utile</b><ul class="sub dl-why">${a.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
    <div class="sub" style="margin:0 0 10px">C'est une proposition : pendant 7 jours, ≈ −40 % de séries, charges −10 %, mêmes reps, loin de l'échec. Le corps récupère et la progression repart mieux ensuite.</div>
    <div class="grid2"><button class="btn" data-dl-no>Pas maintenant</button><button class="btn primary" data-dl-yes>Faire la décharge</button></div></div>`;
}
function bindDeload(v) {
  const st = S().settings, plus = n => { const x = toD(today()); x.setDate(x.getDate() + n); return C.iso(x); };
  const y = $('[data-dl-yes]', v); if (y) y.onclick = () => { st.deload = { from: today(), to: plus(6) }; commit(); render(); toast('Décharge activée pour 7 jours'); };
  const n = $('[data-dl-no]', v); if (n) n.onclick = () => { st.deloadSnooze = plus(7); commit(); render(); toast('Je te la reproposerai dans une semaine si besoin'); };
  const x = $('[data-dl-stop]', v); if (x) x.onclick = () => { st.deload.to = C.iso(new Date(Date.now() - 864e5)); commit(); render(); toast('Décharge arrêtée'); };
}

// dernière activité notée (série, exercice terminé, case cochée…)
const lastActivity = d => Math.max(d.startedAt || 0, d.lastSetAt || 0, d.idleOk || 0, ...d.entries.map(en => en.doneAt > 1e12 ? en.doneAt : 0));
// Terminer : si rien n'a été noté depuis plus d'1 h, on propose de finir à l'heure de la dernière série ; puis étirements
function finishFlow(d, askEnd = true) {
  if (!cleanEntries(d).length && !d.entries.some(en => en.checks && Object.values(en.checks).some(Boolean))) { toast('Aucune série remplie'); return; }
  const la = lastActivity(d);
  if (askEnd && !d.endAt && !d.pausedAt && Date.now() - la > 3600e3) {
    const e5 = la + 5 * 60e3;
    const q = sheet(`<h2 style="margin-top:4px">Heure de fin de la séance ?</h2>
      <p class="sub">Rien n'a été noté depuis ${hhmm(la)} (il y a ${fmtMin(Math.round((Date.now() - la) / 60000))}). Tu as peut-être oublié de terminer la séance.</p>
      <div class="menu" style="margin-top:10px"><button data-e="last"><b>Terminer à ${hhmm(e5)}</b><br><small class="muted">5 min après ta dernière série · durée ${fmtMin(Math.max(1, Math.round((e5 - d.startedAt) / 60000)))}</small></button>
      <button data-e="now"><b>Terminer maintenant (${hhmm(Date.now())})</b><br><small class="muted">j'étais encore en train de m'entraîner</small></button></div>`);
    $('[data-e=last]', q).onclick = () => { d.endAt = e5; saveDraft(d); q.close(); finishFlow(d, false); };
    $('[data-e=now]', q).onclick = () => { q.close(); finishFlow(d, false); };
    return;
  }
  const q = sheet(`<h2 style="margin-top:4px">Des étirements avant de clôturer ?</h2>
    <p class="sub">Une petite liste rapide (≈ 30 s par étirement) : tu coches ceux que tu fais.</p>
    <div class="grid2" style="margin-top:14px"><button class="btn" data-no>Non, clôturer</button><button class="btn primary" data-yes>🧘 Oui, étirements</button></div>`);
  $('[data-no]', q).onclick = () => { q.close(); finishSession(d); };
  $('[data-yes]', q).onclick = () => { q.close(); stretchSheet(d); };
}
function stretchSheet(d) {
  d.stretch = d.stretch || {};
  const list = STRETCHES.map(getEx).filter(Boolean);
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-close>${ICON.back}</button><h2>Étirements</h2></div>
    <p class="sub" id="sx-n"></p><div class="ck-list" id="sx-list"></div>
    <div class="grid2 sheet-foot"><button class="btn" data-close>Retour à la séance</button><button class="btn primary" id="sx-go">Clôturer la séance</button></div>`, { full: true });
  const draw = () => {
    const n = list.filter(x => d.stretch[x.id]).length;
    $('#sx-n', sh).textContent = `${n}/${list.length} faits · tiens chaque étirement sans à-coup, respire, relâche à l'expiration.`;
    $('#sx-list', sh).innerHTML = list.map(x => `<div class="ck-row ${d.stretch[x.id] ? 'on' : ''}" data-cid="${x.id}">
      <button class="chk ${d.stretch[x.id] ? 'on' : ''}" data-ck aria-label="Fait">${ICON.check}</button>
      <button class="illu-btn" data-cillu="${x.id}">${illuHTML(x, 'thumb')}</button>
      <div class="ck-t"><b>${esc(x.name)}</b>${x.dose ? `<div class="ck-dose">⏱ ${esc(x.dose)}</div>` : ''}${x.cue ? `<div class="ck-cue">${esc(x.cue)}</div>` : ''}</div></div>`).join('');
    $$('.ck-row', sh).forEach(r => {
      $('[data-ck]', r).onclick = () => { const id = r.dataset.cid; if (d.stretch[id]) delete d.stretch[id]; else { d.stretch[id] = true; if (navigator.vibrate) navigator.vibrate(15); } saveDraft(d); draw(); };
      $('[data-cillu]', r).onclick = () => showIllustration(getEx(r.dataset.cid));
      $('.ck-cue', r).onclick = ev => ev.currentTarget.classList.toggle('full');
    });
    $('#sx-go', sh).textContent = n ? `Clôturer · ${n} étirement${n > 1 ? 's' : ''}` : 'Clôturer la séance';
  };
  draw();
  $('#sx-go', sh).onclick = () => { sh.close(); finishSession(d); };
}

function sessionMenu(d, name) {
  const sh = sheet(`<div class="sheet-head"><h2>${esc(name)}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="field"><label>Date de la séance</label><input type="date" id="sm-date" value="${d.date}"></div>
    <div class="menu">
      <button id="sm-restart"><div class="row"><span class="grow">Je commence maintenant<br><small class="muted">remet le chrono à zéro · commencé à ${hhmm(d.startedAt)}</small></span></div></button>
      <button id="sm-del"><div class="row"><span class="grow" style="color:var(--bad)">Supprimer la séance<br><small class="muted">rien ne sera enregistré</small></span></div></button>
    </div>`);
  $('#sm-date', sh).onchange = ev => { d.date = ev.target.value || d.date; saveDraft(d); };
  $('#sm-restart', sh).onclick = () => { d.startedAt = Date.now(); d.pausedAt = null; delete d.realStart; delete d.pausedTotal; saveDraft(d); sh.close(); render(); toast('Chrono remis à zéro'); };
  $('#sm-del', sh).onclick = () => { sh.close(); deleteDraft(); };
}

const startTpl = t => startSession(null, t.ex.filter(id => getEx(id)), t.id);

/** Configurer une séance custom : nom, exercices, ordre (glisser), séries ; puis enregistrer et/ou commencer. */
function tplEdit(t) {
  const w = { name: t.name, ex: t.ex.filter(id => getEx(id)), sets: { ...(t.sets || {}) }, targets: JSON.parse(JSON.stringify(t.targets || {})) };
  const setsOf = id => isCheck(getEx(id)) ? 0 : (w.sets[id] || getEx(id).sets || 2);
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-back aria-label="Retour">${ICON.back}</button><h2>Configurer la séance</h2></div>
    <div class="field"><label>Nom</label><input id="te-name" value="${esc(t.name)}"></div>
    <div class="sub" id="te-sum"></div>
    <div id="te-list"></div>
    <button class="btn block" id="te-add" style="margin:8px 0 4px">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Ajouter un exercice</button>
    <button class="btn block" id="te-del" style="margin:8px 0 12px;color:var(--bad)">Supprimer cette séance custom</button>
    <div class="grid2 sheet-foot"><button class="btn" id="te-save">Enregistrer</button><button class="btn primary" id="te-go">▶ Commencer</button></div>`, { full: true });
  const orig = JSON.stringify(w);
  const snap = () => JSON.stringify({ ...w, name: $('#te-name', sh).value.trim() || t.name });
  const draw = () => {
    const list = $('#te-list', sh);
    list.innerHTML = w.ex.map(id => {
      const e = getEx(id), tg = w.targets[id] || {};
      if (isCheck(e)) return `<div class="te-row" data-id="${id}"><div class="te-l1"><span class="drag" aria-label="Glisser pour déplacer">${ICON.grip}</span>${illuHTML(e, 'thumb')}
        <div class="lx-t"><h3>${esc(e.name)}</h3><div class="mus">${esc(e.type === 'group' ? `${checkItems(e).map(x => x.name.replace(/^Deep squat : /, 'DS ')).join(' · ')}` : e.dose || '')}</div></div>
        <button class="mini-btn" data-rm aria-label="Retirer">${ICON.x}</button></div><div class="te-l2 te-ck">☑ ${esc(e.dose || 'à cocher')}</div></div>`;
      const g = C.suggest(e), auto = g.sets[0] || {};
      const keys = e.type === 'time' ? ['t'] : e.type === 'reps' ? ['r'] : e.type === 'load_time' ? ['w', 't'] : ['w', 'r'];
      const lbl = { w: e.type === 'bw_load' ? 'lest' : e.type === 'assisted' ? 'assist.' : 'kg', r: 'reps', t: 'sec' };
      const fld = k => `<label class="te-f"><input type="number" inputmode="${k === 'w' ? 'decimal' : 'numeric'}" step="${k === 'w' ? '0.25' : '1'}" data-k="${k}" data-lbl="${esc(e.name)} · objectif ${k === 'w' ? unitW(e) : k === 't' ? 'secondes' : 'reps'}" value="${tg[k] ?? ''}" placeholder="${auto[k] ?? ''}"><span>${lbl[k]}</span></label>`;
      return `<div class="te-row" data-id="${id}">
      <div class="te-l1"><span class="drag" aria-label="Glisser pour déplacer">${ICON.grip}</span>${illuHTML(e, 'thumb')}
        <div class="lx-t"><h3>${esc(e.name)}</h3><div class="mus">${esc(MZ.musclesText(e))}</div></div>
        <button class="mini-btn" data-rm aria-label="Retirer">${ICON.x}</button></div>
      <div class="te-l2"><div class="te-sets"><button data-d="-1" aria-label="Moins de séries">−</button><b>${setsOf(id)}</b><button data-d="1" aria-label="Plus de séries">+</button><span>séries</span></div>
        ${keys.map(fld).join('<span class="te-x">×</span>')}</div>${g.why && !Object.keys(tg).length ? `<div class="te-why">${esc(g.why)}</div>` : ''}</div>`; }).join('') || '<div class="empty">Aucun exercice.</div>';
    const n = w.ex.reduce((a, id) => a + setsOf(id), 0);
    $('#te-sum', sh).textContent = `${w.ex.length} exercices · ${n} séries · glisse ⠿ pour changer l'ordre · valeurs en doré = calculées sur ta dernière séance (progression comprise) · touche pour fixer une autre valeur`;
    $$('.te-row', list).forEach(r => {
      const id = r.dataset.id;
      $$('.te-sets button', r).forEach(bt => bt.onclick = () => { w.sets[id] = Math.max(1, Math.min(10, setsOf(id) + +bt.dataset.d)); draw(); });
      $('[data-rm]', r).onclick = () => { w.ex = w.ex.filter(x => x !== id); draw(); };
      $$('.te-f input', r).forEach(inp => inp.oninput = () => { const o = w.targets[id] || (w.targets[id] = {}); if (inp.value === '') delete o[inp.dataset.k]; else o[inp.dataset.k] = +inp.value; if (!Object.keys(o).length) delete w.targets[id]; });
    });
    list._sortable?.destroy();
    if (window.Sortable && w.ex.length > 1) list._sortable = new Sortable(list, { handle: '.drag', animation: 150, forceFallback: true, fallbackTolerance: 3, ghostClass: 'drag-ghost', onEnd: ev => { if (ev.oldIndex === ev.newIndex) return; const [m] = w.ex.splice(ev.oldIndex, 1); w.ex.splice(ev.newIndex, 0, m); draw(); } });
  };
  draw();
  const save = () => {
    if (!w.ex.length) { toast('Ajoute au moins un exercice'); return false; }
    t.name = $('#te-name', sh).value.trim() || t.name; t.ex = w.ex.slice();
    t.sets = Object.fromEntries(w.ex.filter(id => w.sets[id] && w.sets[id] !== getEx(id).sets).map(id => [id, w.sets[id]]));
    t.targets = Object.fromEntries(w.ex.filter(id => w.targets[id] && Object.keys(w.targets[id]).length).map(id => [id, w.targets[id]]));
    commit(); return true;
  };
  $('#te-add', sh).onclick = () => pickExercise(id => { w.ex.push(id); draw(); setTimeout(() => $$('.te-row', sh).at(-1)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); }, w.ex);
  $('#te-save', sh).onclick = () => { if (save()) { sh.close(); render(); toast(`« ${t.name} » enregistrée`); } };
  $('#te-go', sh).onclick = () => { if (snap() !== orig && !save()) return; sh.close(); startTpl(t); };
  $('#te-del', sh).onclick = async () => { if (await confirmBox(`Supprimer « ${t.name} » ? Les séances déjà faites restent dans l'historique.`, 'Supprimer', true)) { S().templates = S().templates.filter(x => x !== t); commit(); sh.close(); render(); } };
  sh.guard = () => {
    if (snap() === orig) return false;
    const c = sheet(`<h2 style="margin-top:4px">Enregistrer les modifications ?</h2><div class="grid2" style="margin-top:16px"><button class="btn" data-drop>Ne pas enregistrer</button><button class="btn primary" data-keep>Enregistrer</button></div>`);
    $('[data-drop]', c).onclick = () => { c.close(); sh.close(); };
    $('[data-keep]', c).onclick = () => { c.close(); if (save()) { sh.close(); render(); toast(`« ${t.name} » enregistrée`); } };
    return true;
  };
  $('[data-back]', sh).onclick = () => { if (!sh.guard()) sh.close(); };
}

/** Éditeur de séries — partagé entre la séance en cours (live) et l'édition d'historique. */
const openDone = new Set(); // exercices terminés que tu as rouverts
const openGroups = new Set(); // blocs (mobilité…) dépliés
function checkCard(en, e, ei, live) {
  en.checks = en.checks || {};
  const items = checkItems(e), n = items.filter(x => en.checks[x.id]).length, done = n === items.length && items.length > 0;
  const group = e.type === 'group', open = group ? openGroups.has(e.id) : true;
  if (done && !openDone.has(en.ex)) return `<div class="log-ex done folded" data-ei="${ei}" data-kind="chk"><div class="lx-head"><span class="drag" aria-label="Glisser pour déplacer">${ICON.grip}</span><button class="illu-btn" data-illu>${illuHTML(e, 'thumb')}</button><div class="lx-t" data-fold><h3>${esc(e.name)}</h3></div><button class="mini-btn" data-rm aria-label="Retirer">${ICON.x}</button></div><div class="lx-sum">✓ Effectué · ${n}/${items.length}</div></div>`;
  return `<div class="log-ex ck-card ${done ? 'done' : ''} ${group ? 'grp' : ''}" data-ei="${ei}" data-kind="chk">
    <div class="lx-head">${live ? `<span class="drag" aria-label="Glisser pour déplacer">${ICON.grip}</span>` : ''}<button class="illu-btn" data-illu>${illuHTML(e, 'thumb')}</button>
      <div class="lx-t" data-gopen><h3>${esc(e.name)}</h3><div class="mus">${group ? `${n}/${items.length} faits · ${esc(e.dose || '')}` : esc(e.dose || MZ.musclesText(e))}</div></div>
      ${group ? `<span class="ck-chev ${open ? 'on' : ''}">›</span>` : ''}<button class="mini-btn" data-rm aria-label="Retirer">${ICON.x}</button></div>
    ${group ? `<div class="ck-bar"><i style="width:${items.length ? n / items.length * 100 : 0}%"></i></div>` : ''}
    ${open ? `<div class="ck-list">${items.map(x => `<div class="ck-row ${en.checks[x.id] ? 'on' : ''}" data-cid="${x.id}">
      <button class="chk ${en.checks[x.id] ? 'on' : ''}" data-ck aria-label="Fait">${ICON.check}</button>
      ${group ? `<button class="illu-btn" data-cillu="${x.id}">${illuHTML(x, 'thumb')}</button>` : ''}
      <div class="ck-t"><b>${esc(group ? x.name : 'Fait')}</b>${x.dose ? `<div class="ck-dose">⏱ ${esc(x.dose)}</div>` : ''}${x.cue ? `<div class="ck-cue">${esc(x.cue)}</div>` : ''}</div></div>`).join('')}</div>` : `<div class="ck-hint">Touche pour ouvrir les ${items.length} exercices</div>`}
  </div>`;
}
function sessionEditor(host, d, onChange, opts = {}) {
  const { suggest = false, onSet = null, reorder = false, live = false, onDone = null } = opts;
  const redraw = () => sessionEditor(host, d, onChange, opts);
  host.innerHTML = d.entries.map((en, ei) => {
    const e = getEx(en.ex); if (!e) return '';
    if (isCheck(e)) return checkCard(en, e, ei, live);
    const st = C.exStats(e.id);
    const sg = suggest ? C.suggest(e, d.day) : { sets: [] };
    const time = e.type === 'time', repsOnly = e.type === 'reps', k2 = e.type === 'load_time' ? 't' : 'r';
    const rirOk = live && ['load', 'bw_load', 'assisted', 'reps'].includes(e.type) && !e.fixedReps;
    const prev = st.arr.filter(h => h.session.id !== d.id);
    const last = prev.at(-1);
    const done = en.sets.length && en.sets.every(s => s.done);
    const folded = live && done && !openDone.has(en.ex);
    const nx = d.day && e.superset && d.entries[ei + 1] ? getEx(d.entries[ei + 1].ex) : null; // supersets pensés pour les jours du programme
    const head = `<div class="lx-head">${live || reorder ? `<span class="drag" aria-label="Glisser pour déplacer">${ICON.grip}</span>` : ''}<button class="illu-btn" data-illu aria-label="Voir l'exercice et la consigne">${illuHTML(e, 'thumb')}</button>
      <div class="lx-t" data-fold><h3>${esc(e.name)}${nx ? ' <span class="tag ss">⇄</span>' : ''}</h3>${MZ.musclesText(e) ? `<div class="mus">${esc(MZ.musclesText(e))}</div>` : ''}</div>
      <span class="lx-sp">${sparkline(prev.slice(-3).map(h => h.perf), { w: 44, h: 18 })}</span><button class="mini-btn" data-rm aria-label="Retirer">${ICON.x}</button></div>`;
    if (folded) return `<div class="log-ex done folded" data-ei="${ei}">${head}<div class="lx-sum">✓ ${esc(C.fmtEntry(e, { sets: en.sets }))}</div></div>`;
    const info = [last ? `Dernière ${fdate(last.date).replace(/ \d{4}$/, '')} : ${C.fmtEntry(e, last.entry)}` : 'Première fois : note ta charge de départ', last && sg.note && !sg.why ? `${sg.manual ? '✎' : '▲'} ${sg.note}` : ''].filter(Boolean).join(' · ');
    return `<div class="log-ex ${done ? 'done' : ''}" data-ei="${ei}">${head}
      ${nx ? `<div class="lx-ss">⇄ enchaîne sans repos avec « ${esc(nx.name)} »</div>` : ''}
      <div class="lx-info" data-info>${esc(info)}</div>${sg.why && !en.target ? `<div class="te-why">${esc(sg.why)}</div>` : ''}
      <div class="col-h ${time || repsOnly ? 'time' : ''}"><span>#</span>${time ? '<span>secondes</span>' : repsOnly ? '<span>reps</span>' : `<span>${unitW(e)}${e.side ? ' · par côté' : ''}</span><span>${k2 === 't' ? 'secondes' : 'reps'}</span>`}<span>✓</span></div>
      ${en.sets.map((s, si) => { const p = { ...(sg.sets[si] || sg.sets.at(-1) || {}), ...(en.target || {}) }; return `<div class="set-row ${time || repsOnly ? 'time' : ''}" data-si="${si}"><span class="n">${si + 1}</span>
        ${time ? `<input data-k="t" type="number" inputmode="numeric" value="${s.t ?? ''}" placeholder="${p.t ?? e.timeMin}">`
        : repsOnly ? `<input data-k="r" type="number" inputmode="numeric" value="${s.r ?? ''}" placeholder="${p.r ?? e.repMin}">`
        : `<input data-k="w" type="number" inputmode="decimal" step="0.25" value="${s.w ?? ''}" placeholder="${p.w ?? (e.type === 'bw_load' ? 0 : '')}"><input data-k="${k2}" type="number" inputmode="numeric" value="${s[k2] ?? ''}" placeholder="${p[k2] ?? (k2 === 't' ? e.timeMin : e.repMin)}">`}
        <button class="chk ${s.done ? 'on' : ''}" data-chk aria-label="Série faite">${ICON.check}</button></div>${rirOk ? `<div class="rir-row ${s.done ? 'show' : ''}" data-rir="${si}"><span>Reps en réserve</span>${[0, 1, 2, 3].map(n => `<button class="${s.rir === n ? 'on' : ''}" data-v="${n}">${n === 3 ? '3+' : n}</button>`).join('')}</div>` : ''}${e.setNotes?.[si] ? `<div class="set-note">↗ ${esc(e.setNotes[si])}</div>` : ''}`; }).join('')}
      <div class="lx-foot"><button class="lnk" data-addset>+ série</button>${en.sets.length > 1 ? '<button class="lnk" data-delset>− série</button>' : ''}<span class="grow"></span><button class="lnk" data-plan>prochaine fois…</button></div>
    </div>`;
  }).join('') || '<div class="empty">Aucun exercice. Ajoute-en un.</div>';
  $$('.log-ex', host).forEach(card => {
    const en = d.entries[+card.dataset.ei];
    if (card.dataset.kind === 'chk') {
      const e = getEx(en.ex);
      $('[data-illu]', card).onclick = () => showIllustration(e);
      $('[data-rm]', card).onclick = () => { d.entries.splice(+card.dataset.ei, 1); onChange(); redraw(); };
      const fo = $('[data-fold]', card); if (fo) fo.onclick = () => { openDone.add(en.ex); openGroups.add(en.ex); redraw(); };
      const go = $('[data-gopen]', card);
      if (go) go.onclick = () => { if (e.type !== 'group') return; if (openGroups.has(e.id)) { openGroups.delete(e.id); if (en.doneAt) openDone.delete(en.ex); } else openGroups.add(e.id); redraw(); };
      $$('[data-cillu]', card).forEach(b => b.onclick = () => showIllustration(getEx(b.dataset.cillu)));
      $$('.ck-cue', card).forEach(c => c.onclick = () => c.classList.toggle('full'));
      $$('.ck-row', card).forEach(r => { $('[data-ck]', r).onclick = () => {
        const id = r.dataset.cid; en.checks[id] = !en.checks[id]; if (!en.checks[id]) delete en.checks[id];
        const items = checkItems(e), all = items.every(x => en.checks[x.id]), was = !!en.doneAt;
        if (live) { if (all && !en.doneAt) en.doneAt = Date.now(); if (!all) delete en.doneAt; }
        if (all && !was) { openDone.delete(en.ex); openGroups.delete(en.ex); } // complet → on referme
        if (en.checks[id] && navigator.vibrate) navigator.vibrate(all && !was ? [20, 60, 20] : 15);
        onChange(); redraw();
        if (live && all && !was) { toast(`✓ ${e.name.replace(/ \(.*\)$/, '')} : effectué`); onDone && onDone(en); }
      }; });
      return;
    }
    const fold = $('[data-fold]', card);
    if (live) fold.onclick = () => { if (!en.sets.every(x => x.done)) return; if (openDone.has(en.ex)) openDone.delete(en.ex); else openDone.add(en.ex); redraw(); };
    $('[data-illu]', card).onclick = () => showIllustration(getEx(en.ex));
    $('[data-rm]', card).onclick = () => { d.entries.splice(+card.dataset.ei, 1); onChange(); redraw(); };
    if (card.classList.contains('folded')) return;
    const inf = $('[data-info]', card); inf.onclick = () => inf.classList.toggle('full');
    $$('.set-row', card).forEach(row => {
      const s = en.sets[+row.dataset.si];
      $$('input', row).forEach(inp => inp.oninput = () => { if (inp.value === '') delete s[inp.dataset.k]; else s[inp.dataset.k] = +inp.value; onChange(); });
      $('[data-chk]', row).onclick = ev => {
        s.done = !s.done;
        if (s.done) $$('input', row).forEach(inp => { if (inp.value === '' && inp.placeholder !== '') { inp.value = inp.placeholder; s[inp.dataset.k] = +inp.placeholder; } });
        ev.currentTarget.classList.toggle('on', s.done);
        $(`.rir-row[data-rir="${row.dataset.si}"]`, card)?.classList.toggle('show', !!s.done);
        const all = en.sets.every(x => x.done), was = !!en.doneAt;
        card.classList.toggle('done', all);
        if (live) { if (all && !en.doneAt) en.doneAt = Date.now(); if (!all) delete en.doneAt; }
        if (s.done && navigator.vibrate) navigator.vibrate(15);
        if (s.done && onSet) onSet(getEx(en.ex), d.entries[+card.dataset.ei + 1]);
        if (s.done && suggest) celebrateSet(getEx(en.ex), s, d, card);
        onChange();
        if (live && all && !was) { openDone.delete(en.ex); onDone && onDone(en); }
      };
    });
    $$('.rir-row', card).forEach(rr => { const s = en.sets[+rr.dataset.rir]; $$('button', rr).forEach(b => b.onclick = () => {
      const n = +b.dataset.v; if (s.rir === n) delete s.rir; else s.rir = n;
      $$('button', rr).forEach(x => x.classList.toggle('on', +x.dataset.v === s.rir)); if (navigator.vibrate) navigator.vibrate(10); onChange();
    }); });
    $('[data-addset]', card).onclick = () => { en.sets.push({}); delete en.doneAt; onChange(); redraw(); };
    const ds = $('[data-delset]', card); if (ds) ds.onclick = () => { en.sets.pop(); onChange(); redraw(); };
    $('[data-plan]', card).onclick = () => editPlan(getEx(en.ex));
  });
  // glisser-déposer (poignée ⠿) pour changer l'ordre des exercices
  host._sortable?.destroy(); host._sortable = null;
  if ((live || reorder) && window.Sortable && d.entries.length > 1) {
    host._sortable = new Sortable(host, { handle: '.drag', animation: 150, delay: 0, forceFallback: true, fallbackTolerance: 3, scroll: true, bubbleScroll: true, ghostClass: 'drag-ghost', onEnd: ev => {
      if (ev.oldIndex === ev.newIndex) return;
      const [m] = d.entries.splice(ev.oldIndex, 1); d.entries.splice(ev.newIndex, 0, m); onChange(); redraw();
    } });
  }
}

function pickExercise(cb, exclude = []) {
  const ex0 = new Set(exclude);
  const inProg = S().exercises.filter(e => e.active && !ex0.has(e.id)).sort((a, b) => a.order - b.order);
  const outProg = S().exercises.filter(e => !e.active && !ex0.has(e.id)).map(e => ({ e, st: C.exStats(e.id) })).sort((a, b) => (b.st.last?.date || '').localeCompare(a.st.last?.date || ''));
  const sh = sheet(`<div class="sheet-head"><h2>Ajouter un exercice</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <input id="pk-q" placeholder="Rechercher…" style="margin-bottom:8px">
    <button class="btn block" id="pk-new" style="margin-bottom:6px">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Créer un nouvel exercice</button>
    <div id="pk-list"></div>`, { full: true });
  const item = (e, extra) => `<button class="pick-row" data-id="${e.id}">${illuHTML(e, 'thumb')}<span class="grow"><b>${esc(e.name)}</b><small>${extra}</small></span><span class="pick-plus">${ICON.plus}</span></button>`;
  const draw = () => {
    const q = $('#pk-q', sh).value.toLowerCase();
    const f = e => e.name.toLowerCase().includes(q) || MZ.musclesText(e).includes(q);
    const a1 = inProg.filter(f), b1 = outProg.filter(x => f(x.e));
    $('#pk-list', sh).innerHTML = `<h3 class="pick-h">Programme actuel (${a1.length})</h3>${a1.map(e => item(e, [e.days.map(d => dayOf(d)?.short).join(' · '), MZ.musclesText(e)].filter(Boolean).join(' · '))).join('') || '<div class="empty">—</div>'}
      <h3 class="pick-h">Anciens et hors programme (${b1.length})</h3>${b1.slice(0, 120).map(({ e, st }) => item(e, [st.last ? `dernière fois ${fdate(st.last.date)}` : 'jamais fait', MZ.musclesText(e)].filter(Boolean).join(' · '))).join('')}`;
    $$('.pick-row', sh).forEach(btn => btn.onclick = () => { sh.close(); cb(btn.dataset.id); });
  };
  $('#pk-q', sh).oninput = draw; draw();
  $('#pk-new', sh).onclick = () => { sh.close(); editExercise(null, { free: true, onSaved: t => cb(t.id) }); };
}

// ---------------------------------------------------------------- séance personnalisée
function customSession(tpl = null) {
  const sel = tpl ? tpl.ex.filter(id => getEx(id)) : [];
  const inProg = S().exercises.filter(e => e.active).sort((a, b) => a.order - b.order);
  const outProg = () => S().exercises.filter(e => !e.active).map(e => ({ e, st: C.exStats(e.id) })).sort((a, b) => (b.st.last?.date || '').localeCompare(a.st.last?.date || ''));
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-close>${ICON.back}</button><h2>${tpl ? esc(tpl.name) : 'Séance personnalisée'}</h2></div>
    <p class="sub">Coche les exercices dans l'ordre où tu veux les faire : programme actuel, anciens exercices, ou un nouveau.</p>
    <input id="cs-q" placeholder="Rechercher un exercice ou un muscle…" style="margin-bottom:8px">
    <button class="btn block" id="cs-new" style="margin-bottom:6px">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Créer un nouvel exercice</button>
    <div id="cs-mz"></div>
    <div id="cs-list"></div>
    <div class="sheet-foot"><button class="btn primary block" id="cs-go"></button></div>`, { full: true });
  const item = (e, extra) => { const i = sel.indexOf(e.id); return `<button class="pick-row ${i >= 0 ? 'sel' : ''}" data-id="${e.id}">${illuHTML(e, 'thumb')}<span class="grow"><b>${esc(e.name)}</b><small>${extra}</small></span><span class="pick-n">${i >= 0 ? i + 1 : ''}</span></button>`; };
  const foot = () => {
    const b = $('#cs-go', sh); b.textContent = sel.length ? `${tpl ? 'Enregistrer' : 'Démarrer'} · ${sel.length} exercice${sel.length > 1 ? 's' : ''}` : 'Choisis au moins un exercice'; b.disabled = !sel.length;
    const ms = new Set(sel.flatMap(id => MZ.muscleOf(getEx(id)).p));
    $('#cs-mz', sh).innerHTML = sel.length ? `<div class="card mz-mini">${MZ.bodySVG(id => ms.has(id) ? { c: 'var(--mz-p)' } : sel.some(x => MZ.muscleOf(getEx(x)).s.includes(id)) ? { c: 'var(--mz-s)' } : { c: 'var(--mz-0)' }, { small: true })}<div class="sub" style="margin:4px 0 0">Muscles travaillés : ${esc([...ms].map(id => MZ.MUSCLE[id].short).join(', '))}</div></div>` : '';
  };
  const draw = () => {
    const q = $('#cs-q', sh).value.toLowerCase();
    const f = e => e.name.toLowerCase().includes(q) || MZ.musclesText(e).includes(q);
    const a1 = inProg.filter(f), b1 = outProg().filter(x => f(x.e));
    $('#cs-list', sh).innerHTML = `<h3 class="pick-h">Programme actuel (${a1.length})</h3>${a1.map(e => item(e, [e.days.map(d => dayOf(d)?.short).join(' · '), MZ.musclesText(e)].filter(Boolean).join(' · '))).join('')}
      <h3 class="pick-h">Anciens et hors programme (${b1.length})</h3>${b1.slice(0, 150).map(({ e, st }) => item(e, [st.last ? `${st.n} séance${st.n > 1 ? 's' : ''} · dernière ${fdate(st.last.date)}` : 'jamais fait', MZ.musclesText(e)].filter(Boolean).join(' · '))).join('')}`;
    $$('.pick-row', sh).forEach(btn => btn.onclick = () => { const id = btn.dataset.id, i = sel.indexOf(id); if (i >= 0) sel.splice(i, 1); else sel.push(id); draw(); });
    foot();
  };
  $('#cs-q', sh).oninput = draw; draw();
  $('#cs-new', sh).onclick = () => editExercise(null, { free: true, onSaved: t => { sel.push(t.id); draw(); } });
  $('#cs-go', sh).onclick = () => {
    if (!sel.length) return; sh.close();
    if (tpl) { tpl.ex = sel.slice(); commit(); render(); toast(`« ${tpl.name} » enregistrée`); } else startSession(null, sel);
  };
}

function cleanEntries(d) {
  return d.entries.map(en => ({ ex: en.ex, sets: en.sets.filter(s => s.done || s.w != null || s.r != null || s.t != null).filter(s => s.r != null || s.t != null).map(s => { const o = {}; if (s.w != null) o.w = s.w; if (s.r != null) o.r = s.r; if (s.t != null) o.t = s.t; if (s.rir != null) o.rir = s.rir; return o; }) })).filter(en => en.sets.length);
}

function finishSession(d) {
  const entries = cleanEntries(d);
  const checks = [...d.entries.flatMap(en => en.checks ? Object.keys(en.checks).filter(k => en.checks[k]) : []), ...Object.keys(d.stretch || {}).filter(k => d.stretch[k])];
  const nSt = checks.filter(id => id.startsWith('st-')).length, nMob = checks.length - nSt;
  if (!entries.length && !checks.length) { toast('Aucune série remplie'); return; }
  const before = C.sessionScores().at(-1)?.cum || 0;
  const end = d.endAt || Date.now();
  if (d.pausedAt) { const dt = Math.max(0, end - d.pausedAt); d.startedAt += dt; d.pausedTotal = (d.pausedTotal || 0) + dt; d.pausedAt = null; }
  const sess = { id: d.id, date: d.date, note: d.note, source: 'app', entries };
  const pauseMin = Math.round((d.pausedTotal || 0) / 60000); if (pauseMin) sess.pause = pauseMin;
  if (d.day) sess.day = d.day;
  if (d.deload) sess.deload = true;
  if (checks.length) sess.checks = checks;
  let tplMsg = '';
  if (!d.day) {
    S().templates = S().templates || [];
    const ex = d.entries.map(en => en.ex);
    let t = tplOf(d.tpl) || S().templates.find(x => x.ex.length === ex.length && x.ex.every(id => ex.includes(id)));
    if (!t) { t = { id: 'tpl' + uid(), name: `Séance custom ${S().templates.length + 1}`, ex, created: d.date }; S().templates.push(t); tplMsg = `Mémorisée : « ${t.name} » (onglet Séance)`; }
    t.used = d.date; sess.tpl = t.id;
    if (t.targets) entries.forEach(en => delete t.targets[en.ex]);
  }
  if (d.startedAt) Object.assign(sess, { start: hhmm(d.realStart || d.startedAt), end: hhmm(end), dur: Math.max(1, Math.round((end - d.startedAt) / 60000)) });
  S().sessions.push(sess);
  entries.forEach(en => { const e = getEx(en.ex); if (e && e.plan?.manual) e.plan = null; });
  S()._rev = (S()._rev || 0) + 1;
  C.invalidate(); commit(); saveDraft(null);
  const sc = C.sessionScores().find(x => x.session.id === sess.id);
  const prs = C.history();
  const recOf = en => (prs.byEx.get(en.ex) || []).find(h => h.session.id === sess.id);
  const prNames = entries.filter(en => recOf(en)?.isPR).map(en => getEx(en.ex).name);
  const segNames = entries.filter(en => recOf(en)?.isSegPR).map(en => getEx(en.ex).name);
  const sh = sheet(`<div style="text-align:center;padding:10px 0">
      <div class="muted" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:12px">Séance enregistrée</div>
      <div class="summary-pts">${sc && sc.pts >= 0 ? '+' : ''}${sc ? sc.pts : 0} pts</div>
      ${tplMsg ? `<div class="sub" style="margin:4px 0">💾 ${esc(tplMsg)}</div>` : ''}
      ${sess.dur ? `<div class="summary-time">⏱ ${fmtMin(sess.dur)} <span class="muted">(${sess.start} → ${sess.end}${sess.pause ? ` · pause ${fmtMin(sess.pause)} non comptée` : ''})</span></div>` : ''}
      <div class="sub">Total : ${fmt((sc?.cum ?? before), 0)} pts · ${entries.length} exercices · facteur volume ×${fmt(sc?.vol ?? 1, 2)}</div>
      ${nMob ? `<div class="sub">🧘 Mobilité : ${nMob} exercice${nMob > 1 ? 's' : ''} coché${nMob > 1 ? 's' : ''}</div>` : ''}
      ${nSt ? `<div class="sub">🤸 Étirements : ${nSt}</div>` : ''}

      ${prNames.length ? `<p><span class="pr-badge">🏆 RECORD ABSOLU</span> ${prNames.map(esc).join(', ')}</p>` : ''}
      ${segNames.length ? `<p><span class="rep-badge">⚡ RECORD DE REPRISE</span> ${segNames.map(esc).join(', ')}</p>` : ''}

    </div>
    <h2>Prochaine fois</h2>
    <div class="menu">${entries.map(en => { const e = getEx(en.ex); const sg = C.suggest(e); return `<div class="card" style="padding:10px 12px"><b>${esc(e.name)}</b><div style="color:${sg.sets.some(s => s.up) ? 'var(--gold)' : 'var(--accent)'};font-weight:700">${esc(sg.sets.map(s => C.fmtSet(e, s)).join(' · '))}</div>${sg.note ? `<div class="sub" style="margin:2px 0 0">${esc(sg.note)}</div>` : ''}</div>`; }).join('')}</div>
    <button class="btn primary block" data-close style="margin-top:14px">Super</button>`);
  render();
}

// ================================================================ BILAN DE LA SEMAINE
const weekStart = off => { const x = toD(today()); x.setDate(x.getDate() - (x.getDay() + 6) % 7 - 7 * off); return C.iso(x); };
const addDays = (dIso, n) => { const x = toD(dIso); x.setDate(x.getDate() + n); return C.iso(x); };
function weekData(from) {
  const to = addDays(from, 6);
  const ss = S().sessions.filter(x => x.date >= from && x.date <= to);
  const sets = ss.reduce((a, x) => a + x.entries.reduce((b, en) => b + en.sets.length, 0), 0);
  const dur = ss.reduce((a, x) => a + (x.dur || 0), 0);
  const checks = ss.flatMap(x => x.checks || []);
  const H = C.history(), ids = new Set(ss.map(x => x.id));
  const prs = [], ups = [], downs = [];
  // un exercice = une ligne : meilleur de la semaine comparé à la dernière fois avant la semaine
  for (const [id, arr] of H.byEx) {
    const inW = arr.filter(h => ids.has(h.session.id)); if (!inW.length) continue;
    const e = getEx(id), best = inW.reduce((m, h) => h.perf > m.perf ? h : m), before = arr.filter(h => h.date < from).at(-1);
    const pr = inW.find(h => h.isPR) || inW.find(h => h.isSegPR);
    if (pr) prs.push({ e, h: inW.filter(h => h.isPR || h.isSegPR).at(-1), abs: inW.some(h => h.isPR) });
    if (before) { const pct = (best.perf / before.perf - 1) * 100; if (pct > 0.5) ups.push({ e, pct, h: best }); else if (pct < -3) downs.push({ e, pct, h: best }); }
  }
  prs.sort((x, y) => y.abs - x.abs);
  return { from, to, ss, sets, dur, checks, prs, ups: ups.sort((a, b) => b.pct - a.pct), downs: downs.sort((a, b) => a.pct - b.pct), vol: MZ.volumeBetween(from, to) };
}
function weekCard() {
  const off = ui.wk || 0, w = weekData(weekStart(off)), p = weekData(weekStart(off + 1));
  const dlt = (a, b) => b ? `<small class="${a >= b ? 'delta up' : 'delta down'}">${a >= b ? '+' : ''}${fmt((a / b - 1) * 100, 0)} %</small>` : '';
  const volFill = id => { const l = MZ.volLevel(w.vol.get(id)?.sets || 0, 'week'); return l ? { c: `var(--mzv${l})` } : { c: 'var(--mz-off)', cls: 'off' }; };
  const forgot = MZ.MUSCLES.filter(m => !(w.vol.get(m.id)?.sets > 0));
  const nMob = w.checks.filter(id => !id.startsWith('st-')).length, nSt = w.checks.length - nMob;
  const lbl = off === 0 ? 'Cette semaine' : off === 1 ? 'La semaine dernière' : `Semaine du ${fdate(w.from).replace(/ \d{4}$/, '')}`;
  return `<div class="card wk-card" id="wk"><div class="row"><button class="icon-btn" data-wk="1" aria-label="Semaine précédente">‹</button><div class="grow" style="text-align:center"><b>📊 Bilan · ${lbl}</b><div class="sub" style="margin:0">du ${fdate(w.from).replace(/ \d{4}$/, '')} au ${fdate(w.to)}</div></div><button class="icon-btn" data-wk="-1" ${off ? '' : 'disabled'} aria-label="Semaine suivante">›</button></div>
    ${!w.ss.length ? '<div class="empty">Aucune séance cette semaine.</div>' : `
    <div class="kpis wk-k"><div class="kpi"><b>${w.ss.length}</b><span>séance${w.ss.length > 1 ? 's' : ''} ${dlt(w.ss.length, p.ss.length)}</span></div><div class="kpi"><b>${w.sets}</b><span>séries ${dlt(w.sets, p.sets)}</span></div><div class="kpi"><b>${w.dur ? fmtMin(w.dur) : '–'}</b><span>d'entraînement</span></div></div>
    ${w.prs.length ? `<div class="wk-h">🏆 Records</div><div class="wk-l">${w.prs.map(x => `<div><b>${esc(x.e.name)}</b> <span class="${x.abs ? 'pr-badge' : 'rep-badge'}">${x.abs ? 'absolu' : 'reprise'}</span> <span class="muted">${esc(C.fmtEntry(x.e, x.h.entry))}</span></div>`).join('')}</div>` : ''}
    ${w.ups.length ? `<div class="wk-h">▲ En progrès (${w.ups.length})</div><div class="wk-l">${w.ups.slice(0, 6).map(x => `<div>${esc(x.e.name)} <b class="delta up">+${fmt(x.pct, 0)} %</b></div>`).join('')}</div>` : ''}
    ${w.downs.length ? `<div class="wk-h">▼ En baisse (${w.downs.length})</div><div class="wk-l">${w.downs.slice(0, 4).map(x => `<div>${esc(x.e.name)} <b class="delta down">${fmt(x.pct, 0)} %</b></div>`).join('')}</div>` : ''}
    <div class="wk-h">💪 Séries par muscle</div>${MZ.bodySVG(volFill, { small: true })}
    <div class="mz-legend"><span><i style="background:var(--mz-off)"></i>0</span><span><i style="background:var(--mzv1)"></i>≤ ${MZ.VOL_STEPS.week[0]}</span><span><i style="background:var(--mzv2)"></i>≤ ${MZ.VOL_STEPS.week[1]}</span><span><i style="background:var(--mzv3)"></i>≤ ${MZ.VOL_STEPS.week[2]}</span><span><i style="background:var(--mzv4)"></i>&gt; ${MZ.VOL_STEPS.week[2]} séries</span></div>
    ${forgot.length ? `<div class="sub" style="margin-top:6px"><span class="mz-off-tag">pas travaillés</span> ${esc(forgot.map(m => m.short).join(', '))}</div>` : '<div class="sub" style="margin-top:6px">Tous les muscles ont été travaillés ✓</div>'}
    ${nMob || nSt ? `<div class="sub" style="margin-top:4px">${nMob ? `🧘 ${nMob} exercices de mobilité` : ''}${nMob && nSt ? ' · ' : ''}${nSt ? `🤸 ${nSt} étirements` : ''}</div>` : ''}`}
  </div>`;
}
function bindWeek(v) { $$('[data-wk]', v).forEach(b => b.onclick = () => { ui.wk = Math.max(0, (ui.wk || 0) + +b.dataset.wk); render(); requestAnimationFrame(() => $('#wk')?.scrollIntoView({ block: 'start' })); }); }
// le dimanche (semaine en cours) et le lundi (semaine écoulée) : « ton bilan est prêt »
function weekBanner() {
  const wd = new Date().getDay(); if (wd !== 0 && wd !== 1) return '';
  const off = wd === 0 ? 0 : 1, from = weekStart(off);
  if (S().settings.weekSeen === from || !S().sessions.some(x => x.date >= from && x.date <= addDays(from, 6))) return '';
  return `<button class="card wk-banner" data-wkgo="${off}" data-wkfrom="${from}"><b>📊 Ton bilan de la semaine est prêt</b><span class="muted">séances, records, progrès, muscles travaillés ›</span></button>`;
}

// ================================================================ STATS
function renderStats(v) {
  const sc = C.sessionScores();
  const lv = C.levelSeries();
  const cl = C.currentLevel();
  const br = C.breaks();
  const from = rangeStart(ui.statRange);
  const last30 = S().sessions.filter(s => daysBetween(s.date, today()) <= 30).length;
  const best = lv.slice(15).filter(x => x.n >= 4).reduce((m, x) => x.level > (m?.level ?? 0) ? x : m, null);
  const totalBreak = br.reduce((a, b) => a + b.days, 0);
  v.innerHTML = `<h1>Statistiques</h1>${weekCard()}<p class="sub">${S().sessions.length} séances depuis ${S().sessions[0] ? fdate(S().sessions[0].date) : '—'} · ${br.length} pauses de plus de ${S().settings.breakDays} jours (${C.fmtDuration(totalBreak)} au total).</p>
    <div class="kpis">
      <div class="kpi"><b>${cl.level != null ? fmt(cl.level, 0) + ' %' : '–'}</b><span>Niveau programme vs records</span></div>
      <div class="kpi"><b>${fmt(sc.at(-1)?.cum ?? 0, 0)}</b><span>Points cumulés</span></div>
      <div class="kpi"><b>${last30}</b><span>Séances (30 j)</span></div>
    </div>
    <div class="row" style="margin-top:16px"><span class="grow"></span><div class="range" id="s-range">${['3m', '1a', '5a', 'all'].map(r => `<button data-r="${r}" class="${ui.statRange === r ? 'on' : ''}">${{ '3m': '3 m', '1a': '1 an', '5a': '5 ans', all: 'Tout' }[r]}</button>`).join('')}</div></div>
    <div class="card" style="margin-top:10px"><b>Niveau global</b><div class="sub" style="margin:2px 0 8px">Moyenne de (performance récente ÷ record) sur les exercices travaillés dans les 60 jours, lissée sur 5 séances. 100 % = tous tes records.</div><div id="c-level"></div>
      <div class="legend"><span><i style="background:var(--series-1)"></i>Niveau %</span><span><i class="hatch"></i>Pause &gt; 2 mois</span></div></div>
    <div class="card"><b>Points de progression cumulés</b><div class="sub" style="margin:2px 0 8px">Chaque séance rapporte la progression moyenne de ses exercices, pondérée par le volume — voir Réglages › Système de points.</div><div id="c-points"></div></div>
    <h2>Où j'en suis — exercices du programme</h2>
    <div class="card" style="padding:6px 10px"><table><thead><tr><th>Exercice</th><th class="r">Actuel</th><th class="r">Record</th><th class="r">À regagner</th></tr></thead><tbody>
    ${cl.rows.sort((a, b) => a.st.level - b.st.level).map(({ e, st }) => `<tr data-ex="${e.id}"><td>${esc(e.name)}<div class="gap-bar"><i style="width:${Math.min(100, st.level)}%"></i></div></td><td class="r">${fmt(st.last.perf)}<br><small class="muted">${fmt(st.level, 0)} %</small></td><td class="r">${fmt(st.best.perf)}<br><small class="muted">${st.best.date.slice(0, 4)}</small></td><td class="r">${st.gap > 0.05 ? '+' + fmt(st.gap) + ' ' + C.perfUnit(e) + `<br><small class="muted">+${fmt(st.gapPct, 0)} %</small>` : '<span class="delta up">record</span>'}</td></tr>`).join('') || '<tr><td colspan="4" class="muted">Aucun historique.</td></tr>'}
    </tbody></table></div>
    ${best ? `<p class="sub" style="margin-top:10px">Meilleur niveau global atteint : <b>${fmt(best.level, 0)} %</b> le ${fdate(best.date)}.</p>` : ''}
    <h2>Toutes les courbes 1RM</h2>
    <select id="s-ex">${S().exercises.map(e => ({ e, n: C.exStats(e.id).n })).filter(x => x.n > 1).sort((a, b) => (b.e.active - a.e.active) || b.n - a.n).map(x => `<option value="${x.e.id}">${x.e.active ? '● ' : ''}${esc(x.e.name)} (${x.n})</option>`).join('')}</select>
    <div class="card" style="margin-top:10px"><div id="c-ex"></div></div>`;
  bindWeek(v);
  $$('#s-range button', v).forEach(b => b.onclick = () => { ui.statRange = b.dataset.r; saveUi(); render(); });
  $$('tr[data-ex]', v).forEach(r => r.onclick = () => openExercise(r.dataset.ex));
  requestAnimationFrame(() => {
    lineChart($('#c-level', v), { points: C.rollingMean(lv).filter(x => x.date >= from).map(x => ({ date: x.date, y: x.y, label: `${x.n} exercices` })), breaks: br, unit: '%', decimals: 0, height: 180, refLine: { y: 100, label: 'Records' }, aria: 'niveau global' });
    lineChart($('#c-points', v), { points: sc.filter(x => x.date >= from).map(x => ({ date: x.date, y: x.cum, label: `${x.pts >= 0 ? '+' : ''}${x.pts} pts · ${x.n} exos` })), breaks: br, unit: 'pts', decimals: 0, height: 170, color: 'var(--series-2)', aria: 'points cumulés' });
    const sel = $('#s-ex', v);
    const drawEx = () => { const e = getEx(sel.value); if (!e) return; const st = C.exStats(e.id); const raw = st.arr.filter(h => h.date >= from).map(h => ({ ...h, label: C.fmtEntry(e, h.entry) })); lineChart($('#c-ex', v), { points: C.rollingMax(raw), scatter: raw.map(h => ({ date: h.date, y: h.perf })), breaks: br, unit: C.perfUnit(e), height: 180, refLine: { y: st.best.perf, label: 'Record ' + fmt(st.best.perf) } }); };
    if (sel) { sel.onchange = drawEx; drawEx(); }
  });
}

// ================================================================ CORPS
const MEAS = [
  { k: 'poids', label: 'Poids', unit: 'kg' },
  { k: 'ventre', label: 'Tour de ventre', unit: 'cm' },
  { k: 'taille', label: 'Tour de taille / fesses', unit: 'cm' },
  { k: 'cuisse', label: 'Tour de cuisse', unit: 'cm' },
];
function muscleCard(e) {
  const m = MZ.muscleOf(e);
  if (!m.p.length && !m.s.length) return '';
  const names = ids => ids.map(id => MZ.MUSCLE[id]?.label).filter(Boolean).join(', ');
  return `<div class="mz-ex">${MZ.exerciseBody(e)}<div class="mz-ex-t"><div><i class="mz-dot p"></i><b>Principaux</b> ${esc(names(m.p))}</div>${m.s.length ? `<div><i class="mz-dot s"></i><b>Secondaires</b> ${esc(names(m.s))}</div>` : ''}</div></div>`;
}

const mzTip = (host, info) => {
  $$('[data-m]', host).forEach(g => g.onclick = () => {
    $$('.mz.hl', host).forEach(x => x.classList.remove('hl'));
    $$(`[data-m="${g.dataset.m}"]`, host).forEach(x => x.classList.add('hl'));
    const t = $('.mz-tip', host); if (t) t.innerHTML = info(g.dataset.m);
  });
};
function renderMuscles(v) {
  const kind = ui.mzView === 'done' ? 'done' : ui.mzView === 'week' ? 'week' : 'day';
  if (kind === 'day' && !dayOf(ui.mzView)) ui.mzView = 'week';
  const vol = ui.mzView === 'done' ? MZ.doneVolume(28) : MZ.planVolume(ui.mzView === 'week' ? null : ui.mzView);
  const scale = kind === 'day' ? 'day' : 'week';
  const unit = kind === 'day' ? 'séries' : 'séries/sem';
  const b = MZ.VOL_STEPS[scale];
  const volFill = id => { const l = MZ.volLevel(vol.get(id)?.sets || 0, scale); return l ? { c: `var(--mzv${l})` } : { c: 'var(--mz-off)', cls: 'off' }; };
  const str = MZ.strengthByMuscle(90);
  const strFill = id => { const x = str.get(id); return x.status === 'ok' ? { c: `var(--mzs${MZ.strLevel(x.pct)})` } : x.status === 'old' ? { c: 'var(--mz-off)', cls: 'off' } : { c: 'var(--mz-0)' }; };
  const f1 = n => fmt(n, n % 1 ? 1 : 0);
  const volRows = MZ.MUSCLES.map(m => ({ m, r: vol.get(m.id) })).sort((x, y) => (y.r?.sets || 0) - (x.r?.sets || 0));
  const max = Math.max(1, ...volRows.map(x => x.r?.sets || 0));
  const exList = (r, k = 4) => { const l = [...r.ex.values()].sort((a, c) => (a.role > c.role) - (a.role < c.role) || c.n - a.n).map(x => `${x.e.name}${x.role === 's' ? ' (2nd)' : ''}`); return l.slice(0, k).join(', ') + (l.length > k ? ` +${l.length - k}` : ''); };
  const strRows = MZ.MUSCLES.map(m => ({ m, x: str.get(m.id) })).sort((a, c) => (a.x.status === 'ok' ? a.x.pct : a.x.status === 'old' ? -1 : -2) - (c.x.status === 'ok' ? c.x.pct : c.x.status === 'old' ? -1 : -2));
  v.insertAdjacentHTML('beforeend', `
    <div class="chips" id="mz-view">${[['week', 'Semaine complète'], ...DAYS_().map(d => [d.id, WEEKDAYS[d.wd] ?? d.label]), ['done', 'Réalisé (4 sem.)']].map(([k, l]) => `<button class="chip ${ui.mzView === k ? 'on' : ''}" data-v="${k}">${esc(l)}</button>`).join('')}</div>
    <div class="card" id="mz-vol"><b>Intensité de travail par muscle</b>
      <div class="sub" style="margin:2px 0 8px">${ui.mzView === 'done' ? 'Séries réellement faites ces 4 dernières semaines, ramenées à une semaine.' : kind === 'week' ? 'Séries prévues par semaine dans ton programme.' : `Séries prévues le ${esc((WEEKDAYS[dayOf(ui.mzView).wd] || '').toLowerCase())}.`} Muscle principal = 1 série, secondaire = ½. Touche un muscle pour le détail.</div>
      ${MZ.bodySVG(volFill)}
      <div class="mz-legend"><span><i style="background:var(--mz-off)"></i>Oublié (0)</span><span><i style="background:var(--mzv1)"></i>≤ ${b[0]}</span><span><i style="background:var(--mzv2)"></i>${b[0]}–${b[1]}</span><span><i style="background:var(--mzv3)"></i>${b[1]}–${b[2]}</span><span><i style="background:var(--mzv4)"></i>&gt; ${b[2]} ${unit}</span></div>
      <div class="mz-tip sub">Touche un muscle sur le schéma.</div>
      <table class="mz-table"><tbody>${volRows.map(({ m, r }) => `<tr data-row="${m.id}"><td>${esc(m.label)}${r ? `<div class="muted mz-exs">${esc(exList(r))}</div>` : ''}</td><td class="r" style="width:42%">${r ? `<div class="mz-bar"><i style="width:${r.sets / max * 100}%;background:var(--mzv${MZ.volLevel(r.sets, scale)})"></i></div><small>${f1(r.sets)} ${unit}</small>` : '<span class="mz-off-tag">oublié</span>'}</td></tr>`).join('')}</tbody></table>
    </div>
    <div class="card" id="mz-str"><b>Force par muscle vs ton record</b>
      <div class="sub" style="margin:2px 0 8px">Pour chaque muscle : moyenne de (dernière performance ÷ record) des exercices où il est moteur principal, faits dans les 90 derniers jours. Orange = muscle qui a des records mais n'a plus été travaillé depuis 90 jours.</div>
      ${MZ.bodySVG(strFill)}
      <div class="mz-legend"><span><i style="background:var(--mz-off)"></i>Oublié &gt; 90 j</span><span><i style="background:var(--mzs1)"></i>&lt; ${MZ.STR_STEPS[0]} %</span><span><i style="background:var(--mzs2)"></i>${MZ.STR_STEPS[0]}–${MZ.STR_STEPS[1]} %</span><span><i style="background:var(--mzs3)"></i>${MZ.STR_STEPS[1]}–${MZ.STR_STEPS[2]} %</span><span><i style="background:var(--mzs4)"></i>≥ ${MZ.STR_STEPS[2]} % du max</span><span><i style="background:var(--mz-0)"></i>pas de données</span></div>
      <div class="mz-tip sub">Touche un muscle sur le schéma.</div>
      <table class="mz-table"><tbody>${strRows.map(({ m, x }) => `<tr data-row="${m.id}"><td>${esc(m.label)}${x.rows.length ? `<div class="muted mz-exs">${esc(x.rows.map(r => `${r.e.name} ${fmt(Math.min(100, r.st.level), 0)} %`).join(', '))}</div>` : ''}</td><td class="r" style="width:30%">${x.status === 'ok' ? `<b style="color:var(--text)">${fmt(x.pct, 0)} %</b><div class="mz-bar"><i style="width:${x.pct}%;background:var(--mzs${MZ.strLevel(x.pct)})"></i></div>` : x.status === 'old' ? `<span class="mz-off-tag">oublié</span><br><small class="muted">depuis ${fdate(x.last)}</small>` : '<small class="muted">pas de données</small>'}</td></tr>`).join('')}</tbody></table>
    </div>`);
  $$('#mz-view .chip', v).forEach(c => c.onclick = () => { ui.mzView = c.dataset.v; saveUi(); render(); });
  mzTip($('#mz-vol', v), id => { const r = vol.get(id); return `<b>${esc(MZ.MUSCLE[id].label)}</b> · ${r ? `${f1(r.sets)} ${unit} · ${esc(exList(r, 99))}` : '<span class="mz-off-tag">oublié</span> aucun exercice ne le travaille ici'}`; });
  mzTip($('#mz-str', v), id => { const x = str.get(id); return `<b>${esc(MZ.MUSCLE[id].label)}</b> · ${x.status === 'ok' ? `${fmt(x.pct, 0)} % du record (${esc(x.rows.map(r => r.e.name).join(', '))})` : x.status === 'old' ? `<span class="mz-off-tag">oublié</span> pas travaillé depuis ${fdate(x.last)}` : 'aucun exercice avec historique'}`; });
}

function renderBody(v) {
  const seg = `<h1>Corps</h1><div class="seg body-seg" id="b-view">${[['muscles', 'Muscles'], ['mesures', 'Mesures']].map(([k, l]) => `<button data-v="${k}" class="${ui.bodyView === k ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  const bindSeg = () => $$('#b-view button', v).forEach(bt => bt.onclick = () => { ui.bodyView = bt.dataset.v; saveUi(); render(); });
  if (ui.bodyView !== 'mesures') { v.innerHTML = seg; bindSeg(); renderMuscles(v); return; }
  const b = S().body;
  const br = C.breaks();
  const from = rangeStart(ui.bodyRange);
  const lastOf = k => b.filter(x => x[k] != null).at(-1);
  const bestOf = k => b.filter(x => x[k] != null).reduce((m, x) => (m == null || x[k] < m[k]) ? x : m, null);
  v.innerHTML = `${seg}<p class="sub">${b.length} mesures depuis ${b[0] ? fdate(b[0].date) : '—'}. Les zones hachurées sont les pauses d'entraînement.</p>
    <div class="kpis">${MEAS.map(m => { const l = lastOf(m.k), be = bestOf(m.k); return `<div class="kpi"><b>${l ? fmt(l[m.k]) : '–'}<small> ${m.unit}</small></b><span>${m.label}${l ? ` · ${l.date.slice(0, 7)}` : ''}${be && l && be[m.k] < l[m.k] ? `<br>min ${fmt(be[m.k])} (${be.date.slice(0, 4)})` : ''}</span></div>`; }).join('')}</div>
    <button class="btn primary block" id="b-add" style="margin-top:12px">${ICON.plus.replace('<svg', '<svg width="18" height="18" style="fill:none;stroke:currentColor;stroke-width:2.4"')} Nouvelle mesure</button>
    <div class="row" style="margin-top:16px"><span class="grow"></span><div class="range" id="b-range">${['1a', '5a', 'all'].map(r => `<button data-r="${r}" class="${ui.bodyRange === r ? 'on' : ''}">${{ '1a': '1 an', '5a': '5 ans', all: 'Tout' }[r]}</button>`).join('')}</div></div>
    ${MEAS.map(m => `<div class="card" style="margin-top:10px"><b>${m.label}</b> <span class="muted">(${m.unit})</span><div id="bc-${m.k}" style="margin-top:6px"></div></div>`).join('')}
    <h2>Toutes les mesures</h2>
    <div class="card" style="padding:6px 10px"><table><thead><tr><th>Date</th>${MEAS.map(m => `<th class="r">${m.label.split(' ').pop()}</th>`).join('')}<th></th></tr></thead><tbody>
    ${b.slice().reverse().map(x => `<tr data-id="${x.id}"><td>${fdate(x.date)}</td>${MEAS.map(m => `<td class="r">${x[m.k] != null ? fmt(x[m.k]) : '<span class="muted">·</span>'}</td>`).join('')}<td class="r"><button class="mini-btn" data-edit style="width:28px;height:28px">${ICON.dots}</button></td></tr>`).join('')}
    </tbody></table></div>`;
  bindSeg();
  $('#b-add', v).onclick = () => editBody(null);
  $$('#b-range button', v).forEach(bt => bt.onclick = () => { ui.bodyRange = bt.dataset.r; saveUi(); render(); });
  $$('tr[data-id] [data-edit]', v).forEach(bt => bt.onclick = () => editBody(S().body.find(x => x.id === bt.closest('tr').dataset.id)));
  requestAnimationFrame(() => MEAS.forEach(m => lineChart($(`#bc-${m.k}`, v), { points: b.filter(x => x[m.k] != null && x.date >= from).map(x => ({ date: x.date, y: x[m.k] })), breaks: br, split: false, unit: m.unit, height: 150, aria: m.label })));
}

function editBody(x) {
  const isNew = !x;
  const d = x || { date: today() };
  const sh = sheet(`<div class="sheet-head"><h2>${isNew ? 'Nouvelle mesure' : 'Modifier la mesure'}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="field"><label>Date</label><input type="date" id="bm-date" value="${d.date}"></div>
    <div class="grid2">${MEAS.map(m => `<div class="field"><label>${m.label} (${m.unit})</label><input type="number" inputmode="decimal" step="0.1" data-k="${m.k}" value="${d[m.k] ?? ''}"></div>`).join('')}</div>
    <div class="grid2">${isNew ? '<span></span>' : '<button class="btn danger" id="bm-del">Supprimer</button>'}<button class="btn primary" id="bm-save">Enregistrer</button></div>`);
  $('#bm-save', sh).onclick = () => {
    const o = isNew ? { id: uid() } : x;
    o.date = $('#bm-date', sh).value || today();
    $$('[data-k]', sh).forEach(i => { if (i.value === '') delete o[i.dataset.k]; else o[i.dataset.k] = +i.value; });
    if (isNew) S().body.push(o);
    S()._rev = (S()._rev || 0) + 1; C.invalidate(); commit(); sh.close(); render(); toast('Mesure enregistrée');
  };
  const del = $('#bm-del', sh); if (del) del.onclick = () => { S().body = S().body.filter(y => y !== x); C.invalidate(); commit(); sh.close(); render(); };
}

// ================================================================ HISTORIQUE
// Toutes les séances : recherche, filtres (jour, année), groupées par mois, pauses visibles.
// Chaque séance est entièrement modifiable (date, jour, horaires, durée, exercices, séries, notes).
const MONTHS_L = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const sessDay = s => s.day || DAYS_().find(d => d.wd === toD(s.date).getDay())?.id || null;
const wdShort = date => WEEKDAYS[toD(date).getDay()].slice(0, 3).toLowerCase() + '.';
function renderHist(v) {
  const ss = S().sessions;
  const years = [...new Set(ss.map(s => s.date.slice(0, 4)))].sort().reverse();
  if (ui.histYear && !years.includes(ui.histYear)) ui.histYear = '';
  const chip = (attr, val, cur, lbl) => `<button class="chip ${cur === val ? 'on' : ''}" ${attr}="${esc(val)}">${esc(lbl)}</button>`;
  v.innerHTML = `<div class="row" style="margin-top:6px"><h1 class="grow" style="margin:0">Historique</h1><button class="btn sm" id="h-new">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Séance passée</button></div>
    <p class="sub" id="h-count"></p>
    <input type="search" id="h-q" placeholder="Rechercher un exercice ou une note…" value="${esc(ui.histQ || '')}" style="margin-bottom:6px">
    <div class="chips" id="h-days">${chip('data-hd', 'all', ui.histDay || 'all', 'Tous les jours')}${DAYS_().map(d => chip('data-hd', d.id, ui.histDay, WEEKDAYS[d.wd] ?? d.label)).join('')}</div>
    <div class="chips" id="h-years" style="padding-top:0">${chip('data-hy', '', ui.histYear || '', 'Toutes les années')}${years.map(y => chip('data-hy', y, ui.histYear, y)).join('')}</div>
    <div id="h-list"></div>`;
  const draw = () => {
    const q = (ui.histQ || '').trim().toLowerCase();
    const md = S().settings.breakDays;
    const sc = new Map(C.sessionScores().map(x => [x.session.id, x]));
    const match = s => (!ui.histYear || s.date.startsWith(ui.histYear))
      && (!ui.histDay || ui.histDay === 'all' || sessDay(s) === ui.histDay)
      && (!q || (s.note || '').toLowerCase().includes(q) || s.entries.some(en => (getEx(en.ex)?.name || '').toLowerCase().includes(q)));
    const all = ss.filter(match).reverse();
    const filtered = all.length !== ss.length;
    $('#h-count', v).textContent = filtered ? `${all.length} séance${all.length > 1 ? 's' : ''} sur ${ss.length}` : `${ss.length} séances. Appuie sur une séance pour la voir ou la modifier.`;
    const list = all.slice(0, ui.histLimit);
    let html = '', month = '';
    const lastS = ss.at(-1);
    if (!filtered && lastS && daysBetween(lastS.date, today()) >= md) html += `<div class="break-sep">Pause en cours · ${C.fmtDuration(daysBetween(lastS.date, today()))}</div>`;
    list.forEach((s, i) => {
      const m = s.date.slice(0, 7);
      if (m !== month) { month = m; const n = all.filter(x => x.date.startsWith(m)).length; html += `<div class="month-h"><span>${MONTHS_L[+m.slice(5) - 1]} ${m.slice(0, 4)}</span><span class="muted">${n} séance${n > 1 ? 's' : ''}</span></div>`; }
      const x = sc.get(s.id);
      const hl = name => q && name.toLowerCase().includes(q) ? `<mark>${esc(name)}</mark>` : esc(name);
      const hit = en => q && (getEx(en.ex)?.name || '').toLowerCase().includes(q);
      const names = s.entries.slice().sort((a, b) => hit(b) - hit(a)).map(en => { const e = getEx(en.ex); return e ? `${hl(e.name)} ${esc(C.fmtEntry(e, { sets: en.sets.slice(0, 2) }))}` : ''; }).filter(Boolean).join(' · ');
      const dy = sessDay(s);
      html += `<button class="hist-item" data-id="${s.id}"><div class="row"><span class="d grow">${dy ? dayTag(dy) : ''}${wdShort(s.date)} ${fdate(s.date)}${s.approx ? ' <span class="muted" title="date estimée">≈</span>' : ''}</span>${x ? `<span class="pts ${x.pts > 2 ? 'up' : x.pts < 0 ? 'down' : ''}">${x.pts > 0 ? '+' : ''}${x.pts} pts</span>` : ''}</div>
        <div class="s hm">${s.entries.length} exo${s.entries.length > 1 ? 's' : ''} · ${(n => `${n} série${n > 1 ? 's' : ''}`)(s.entries.reduce((a, en) => a + en.sets.length, 0))}${s.dur ? ` · ⏱ ${fmtMin(s.dur)}` : ''}${s.start ? ` <span class="muted">(${s.start}${s.end ? '→' + s.end : ''})</span>` : ''}</div>
        <div class="s">${names}</div>${s.checks?.some(id => !id.startsWith('st-')) ? `<div class="s">🧘 mobilité : ${esc(s.checks.filter(id => !id.startsWith('st-')).map(id => getEx(id)?.name).filter(Boolean).join(', '))}</div>` : ''}${s.checks?.some(id => id.startsWith('st-')) ? `<div class="s">🤸 étirements : ${esc(s.checks.filter(id => id.startsWith('st-')).map(id => getEx(id)?.name).filter(Boolean).join(', '))}</div>` : ''}${s.note ? `<div class="s" style="color:var(--muted)">📝 ${esc(s.note)}</div>` : ''}</button>`;
      const prev = list[i + 1];
      if (prev && !filtered) { const g = daysBetween(prev.date, s.date); if (g >= md) html += `<div class="break-sep">Pause · ${C.fmtDuration(g)}</div>`; }
    });
    if (!list.length) html += `<div class="empty">Aucune séance${filtered ? ' pour ces filtres' : ''}.</div>`;
    if (all.length > ui.histLimit) html += `<button class="btn block" id="h-more">Afficher plus (${all.length - ui.histLimit} restantes)</button>`;
    const host = $('#h-list', v); host.innerHTML = html;
    $$('.hist-item', host).forEach(b => b.onclick = () => editSession(ss.find(s => s.id === b.dataset.id)));
    const mo = $('#h-more', host); if (mo) mo.onclick = () => { ui.histLimit += 100; draw(); };
  };
  const chipGroup = (sel, attr, key) => $$(`${sel} .chip`, v).forEach(b => b.onclick = () => { ui[key] = b.getAttribute(attr); ui.histLimit = 60; $$(`${sel} .chip`, v).forEach(x => x.classList.toggle('on', x === b)); draw(); });
  chipGroup('#h-days', 'data-hd', 'histDay'); chipGroup('#h-years', 'data-hy', 'histYear');
  let qT; $('#h-q', v).oninput = ev => { clearTimeout(qT); qT = setTimeout(() => { ui.histQ = ev.target.value; ui.histLimit = 60; draw(); }, 150); };
  $('#h-new', v).onclick = () => editSession(null);
  draw();
}

const toMin = t => t ? +t.slice(0, 2) * 60 + +t.slice(3, 5) : null;
const fromMin = m => `${pad(Math.floor(((m % 1440) + 1440) % 1440 / 60))}:${pad(((m % 60) + 60) % 60)}`;

/** Voir / modifier une séance enregistrée (s = null : ajouter une séance passée oubliée). */
function editSession(s) {
  const isNew = !s;
  if (isNew) s = { id: uid(), date: today(), note: '', source: 'app', entries: [] };
  const d = { id: s.id, date: s.date, day: sessDay(s), note: s.note, entries: s.entries.map(en => ({ ex: en.ex, sets: en.sets.map(x => ({ ...x, done: true })) })) };
  const snap = () => JSON.stringify([d, $('#es-date', sh)?.value, $('#es-day', sh)?.value, $('#es-start', sh)?.value, $('#es-end', sh)?.value, $('#es-dur', sh)?.value, $('#es-note', sh)?.value]);
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-back aria-label="Retour">${ICON.back}</button><h2>${isNew ? 'Ajouter une séance' : `Séance du ${wdShort(s.date)} ${fdate(s.date)}`}</h2></div>
    ${s.entries.some(en => en.raw) ? `<p class="sub">Importé du tableur. Valeurs d'origine : ${esc(s.entries.map(en => en.raw).filter(Boolean).join(' · ').slice(0, 300))}</p>` : ''}
    <div class="grid2"><div class="field"><label>Date</label><input type="date" id="es-date" value="${s.date}"></div>
      <div class="field"><label>Jour du programme</label><select id="es-day"><option value="">—</option>${DAYS_().map(x => `<option value="${esc(x.id)}" ${d.day === x.id ? 'selected' : ''}>${esc(x.label)}</option>`).join('')}</select></div></div>
    <div class="grid3"><div class="field"><label>Début</label><input type="time" id="es-start" value="${s.start || ''}"></div><div class="field"><label>Fin</label><input type="time" id="es-end" value="${s.end || ''}"></div><div class="field"><label>Durée (min)</label><input type="number" inputmode="numeric" id="es-dur" value="${s.dur ?? ''}" placeholder="–"></div></div>
    <div id="es-ed"></div>
    <button class="btn sm" id="es-add" style="margin-bottom:12px">+ Exercice</button>
    <div class="field"><label>Notes</label><textarea id="es-note" rows="2" placeholder="Sensations, douleurs, conditions…">${esc(s.note || '')}</textarea></div>
    <div class="grid2 sheet-foot">${isNew ? '<button class="btn" data-close>Annuler</button>' : '<button class="btn danger" id="es-del">Supprimer</button>'}<button class="btn primary" id="es-save">Enregistrer</button></div>`, { full: true });
  const ed = () => sessionEditor($('#es-ed', sh), d, () => { }, { reorder: true });
  ed();
  const orig = snap();
  // horaires ↔ durée : changer le début/la fin recalcule la durée ; changer la durée recalcule la fin
  const iS = $('#es-start', sh), iE = $('#es-end', sh), iD = $('#es-dur', sh);
  iS.onchange = iE.onchange = () => { if (iS.value && iE.value) iD.value = (toMin(iE.value) - toMin(iS.value) + 1440) % 1440 || ''; else if (iS.value && iD.value) iE.value = fromMin(toMin(iS.value) + +iD.value); };
  iD.oninput = () => { if (iS.value && +iD.value > 0) iE.value = fromMin(toMin(iS.value) + +iD.value); };
  $('#es-add', sh).onclick = () => pickExercise(id => { const e = getEx(id); d.entries.push({ ex: id, sets: Array.from({ length: setsOn(e, $('#es-day', sh).value || null) || 2 }, () => ({})) }); ed(); setTimeout(() => $$('.log-ex', sh).at(-1)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 50); }, d.entries.map(en => en.ex));
  const save = () => {
    const entries = cleanEntries(d);
    if (!entries.length) { toast(isNew ? 'Ajoute au moins une série remplie' : 'Aucune série : utilise « Supprimer » pour effacer la séance'); return false; }
    s.date = $('#es-date', sh).value || s.date; s.note = $('#es-note', sh).value;
    const dy = $('#es-day', sh).value; if (dy) s.day = dy; else delete s.day;
    const st0 = iS.value, en0 = iE.value, dur = +iD.value;
    if (st0) s.start = st0; else delete s.start;
    if (en0) s.end = en0; else delete s.end;
    if (dur > 0) s.dur = Math.round(dur); else if (st0 && en0) s.dur = (toMin(en0) - toMin(st0) + 1440) % 1440; else delete s.dur;
    const raws = new Map(s.entries.map(en => [en.ex, en.raw]));
    s.entries = entries.map(en => (raws.get(en.ex) ? { ...en, raw: raws.get(en.ex) } : en));
    if (isNew) S().sessions.push(s);
    S()._rev = (S()._rev || 0) + 1; C.invalidate(); commit(); sh.close(); render(); toast(isNew ? 'Séance ajoutée' : 'Séance mise à jour');
    return true;
  };
  $('#es-save', sh).onclick = save;
  // quitter (← ou bouton retour Android) avec des modifications : on propose de les enregistrer
  sh.guard = () => {
    if (snap() === orig) return false;
    const c = sheet(`<h2 style="margin-top:4px">Enregistrer les modifications ?</h2><div class="grid2" style="margin-top:16px"><button class="btn" data-drop>Ne pas enregistrer</button><button class="btn primary" data-keep>Enregistrer</button></div>`);
    $('[data-drop]', c).onclick = () => { c.close(); sh.close(); };
    $('[data-keep]', c).onclick = () => { c.close(); save(); };
    return true;
  };
  $('[data-back]', sh).onclick = () => { if (!sh.guard()) sh.close(); };
  const del = $('#es-del', sh);
  if (del) del.onclick = async () => { if (await confirmBox('Supprimer cette séance ?', 'Supprimer', true)) { S().sessions = S().sessions.filter(x => x !== s); S()._rev = (S()._rev || 0) + 1; C.invalidate(); commit(); sh.close(); render(); toast('Séance supprimée'); } };
}

// ================================================================ RÉGLAGES
function openSettings() {
  const st = S().settings;
  const nat = window.AirLiftNative;
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-close>${ICON.back}</button><h2>Réglages</h2></div>
    <div class="field"><label>Thème</label><div class="seg" id="st-theme">${[['auto', 'Auto'], ['dark', 'Sombre'], ['light', 'Clair']].map(([k, l]) => `<button data-v="${k}" class="${st.theme === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="field"><label>Affichage de la liste</label><div class="seg" id="st-dens">${[['compact', 'Compact (tout à l\'écran)'], ['comfort', 'Confort']].map(([k, l]) => `<button data-v="${k}" class="${st.density === k ? 'on' : ''}">${l}</button>`).join('')}</div></div>
    <div class="grid2"><div class="field"><label>Pause d'entraînement après (jours)</label><input type="number" id="st-break" value="${st.breakDays}" inputmode="numeric"></div>
    <div class="field"><label>Repos entre séries (s)</label><input type="number" id="st-rest" value="${st.restSec || 120}" inputmode="numeric"><div class="hint">vibre quand c'est l'heure</div></div></div>
    <h2>Jours d'entraînement</h2>
    <div class="menu" id="st-days">${DAYS_().map(d => `<button data-day="${esc(d.id)}"><div class="row"><span class="tag">${esc(d.short)}</span><span class="grow">${esc(d.label)}</span><span class="muted">${WEEKDAYS[d.wd] ?? ''} ›</span></div></button>`).join('')}</div>
    <h2>Sauvegarde en ligne</h2>
    <div class="card explain" id="st-sync"></div>
    <h2>Système de points</h2>
    <div class="card explain">
      <p><b>Points de séance</b> = progression moyenne × facteur volume + records + présence.</p>
      <p>• <b>Progression moyenne</b> : pour chaque exercice, variation de ta performance (1RM estimé, reps ou secondes) par rapport à la dernière fois, bornée à ±15 %. On fait la <b>moyenne</b> — pas la somme — donc 3 ou 12 exercices sont comparables. +1 % ≈ +10 pts.</p>
      <p>• <b>Facteur volume</b> = √(exercices du jour ÷ exercices habituels), entre ×0,6 et ×1,3 : une grosse séance vaut un peu plus, une séance courte un peu moins, sans écraser l'une ou l'autre.</p>
      <p>• <b>+3 pts par record</b> personnel (max +15) et <b>+2 pts</b> de présence.</p>
      <p>• Après une longue pause (&gt; 4 mois), les baisses comptent moitié moins : la reprise n'est pas punie deux fois.</p>
      <p><b>Niveau %</b> = moyenne de « dernière performance ÷ record » des exercices récents. C'est ton indicateur « où j'en suis par rapport à mon meilleur ».</p>
      <p><b>1RM estimé</b> (Epley) = charge × (1 + reps/30). Pour les tractions/dips : poids du corps du jour + lest ; pour les machines d'assistance : poids du corps − assistance.</p>
    </div>
    <h2>Données</h2>
    <div class="menu">
      <button id="st-export">Exporter une sauvegarde (.json)</button>
      <button id="st-import">Importer une sauvegarde</button>
      <button id="st-merge">Fusionner deux exercices</button>
    </div>
    <input type="file" id="st-file" accept="application/json,.json" style="display:none">
    <h2>Application</h2>
    <div class="card explain">AirLift version <b>${APP_VERSION}</b>${nat?.appVersion ? ` · app Android ${esc(nat.appVersion())}` : ''}<br>Les mises à jour s'installent automatiquement au lancement.</div>
    <button class="btn block" id="st-update" style="margin-top:10px">Vérifier les mises à jour</button>`, { full: true });
  const seg = (id, key, after) => $$(`#${id} button`, sh).forEach(b => b.onclick = () => { $$(`#${id} button`, sh).forEach(x => x.classList.remove('on')); b.classList.add('on'); st[key] = b.dataset.v; commit(); render(); after && after(); });
  seg('st-theme', 'theme'); seg('st-dens', 'density');
  $('#st-break', sh).onchange = ev => { st.breakDays = Math.max(7, +ev.target.value || 30); commit(); render(); };
  $('#st-rest', sh).onchange = ev => { st.restSec = Math.max(15, +ev.target.value || 120); commit(); };
  $$('#st-days [data-day]', sh).forEach(b => b.onclick = () => editDay(dayOf(b.dataset.day), () => { sh.close(); openSettings(); }));
  drawSyncCard($('#st-sync', sh));

  $('#st-export', sh).onclick = () => {
    const txt = store.exportJSON(); const name = `airlift-sauvegarde-${today()}.json`;
    if (nat?.exportFile) { const r = nat.exportFile(name, txt); toast(r ? 'Sauvegardé dans Téléchargements' : 'Échec de la sauvegarde'); return; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' })); a.download = name; a.click();
  };
  $('#st-import', sh).onclick = () => $('#st-file', sh).click();
  $('#st-file', sh).onchange = async ev => {
    const f = ev.target.files[0]; if (!f) return;
    if (!(await confirmBox('Remplacer toutes les données actuelles par cette sauvegarde ?', 'Remplacer', true))) return;
    try { store.importJSON(await f.text()); C.invalidate(); closeAllSheets(); render(); toast('Sauvegarde importée'); } catch (e) { toast('Erreur : ' + e.message); }
  };
  $('#st-merge', sh).onclick = () => mergeDialog();
  $('#st-update', sh).onclick = () => checkUpdate(true);
}

function mergeDialog() {
  const opts = S().exercises.map(e => ({ e, n: C.exStats(e.id).n })).sort((a, b) => a.e.name.localeCompare(b.e.name)).map(x => `<option value="${x.e.id}">${esc(x.e.name)} (${x.n})</option>`).join('');
  const sh = sheet(`<div class="sheet-head"><h2>Fusionner</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <p class="sub">L'historique de l'exercice A est déplacé dans B, puis A est supprimé. Pratique si un même exercice a été noté sous deux noms.</p>
    <div class="field"><label>A (sera supprimé)</label><select id="m-a">${opts}</select></div>
    <div class="field"><label>B (conservé)</label><select id="m-b">${opts}</select></div>
    <button class="btn primary block" id="m-go">Fusionner</button>`);
  $('#m-go', sh).onclick = async () => {
    const a = $('#m-a', sh).value, b = $('#m-b', sh).value;
    if (a === b) { toast('Choisis deux exercices différents'); return; }
    if (!(await confirmBox(`Fusionner « ${getEx(a).name} » dans « ${getEx(b).name} » ?`, 'Fusionner'))) return;
    for (const s of S().sessions) {
      const ea = s.entries.find(x => x.ex === a); if (!ea) continue;
      const eb = s.entries.find(x => x.ex === b);
      if (eb) { eb.sets.push(...ea.sets); s.entries = s.entries.filter(x => x !== ea); } else ea.ex = b;
    }
    S().exercises = S().exercises.filter(e => e.id !== a);
    S()._rev = (S()._rev || 0) + 1; C.invalidate(); commit(); sh.close(); render(); toast('Exercices fusionnés');
  };
}

// ================================================================ JOURS
function editDay(d, done) {
  const sh = sheet(`<div class="sheet-head"><h2>Jour d'entraînement</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="grid2"><div class="field"><label>Abréviation</label><input id="dy-short" maxlength="4" value="${esc(d.short)}"></div>
    <div class="field"><label>Jour de la semaine</label><select id="dy-wd">${WEEKDAYS.map((w, i) => `<option value="${i}" ${d.wd === i ? 'selected' : ''}>${w}</option>`).join('')}</select></div></div>
    <div class="field"><label>Nom affiché</label><input id="dy-label" value="${esc(d.label)}"></div>
    <button class="btn primary block" id="dy-save">Enregistrer</button>`);
  $('#dy-save', sh).onclick = () => {
    d.short = $('#dy-short', sh).value.trim() || d.short; d.wd = +$('#dy-wd', sh).value; d.label = $('#dy-label', sh).value.trim() || d.label;
    commit(); sh.close(); render(); done && done(); toast('Jour enregistré');
  };
}

// ================================================================ ILLUSTRATIONS
function showIllustration(e) {
  const sh = sheet(`<div class="sheet-head"><h2>${esc(e.name)}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    ${illuHTML(e, 'hero')}${e.dose ? `<p class="ck-dose" style="margin:10px 0 0;font-size:15px">⏱ ${esc(e.dose)}</p>` : ''}${e.cue ? `<p class="cue" style="margin-top:10px">${esc(e.cue)}</p>` : ''}
    ${e.type === 'group' ? `<div class="menu" style="margin-top:8px">${checkItems(e).map(x => `<button data-sub="${x.id}"><b>${esc(x.name)}</b><br><small class="muted">⏱ ${esc(x.dose || '')}</small></button>`).join('')}</div>` : ''}
    <button class="btn block" id="si-change" style="margin-top:12px">Changer l'illustration…</button>`);
  $$('[data-sub]', sh).forEach(b => b.onclick = () => showIllustration(getEx(b.dataset.sub)));
  $('#si-change', sh).onclick = () => { sh.close(); pickIllustration(e, img => { e.img = img; commit(); render(); }); };
}

/** Choix d'une illustration : catalogue de ~870 exercices photographiés, ou tes propres photos (départ + arrivée). */
function pickIllustration(e, cb) {
  const sh = sheet(`<div class="sheet-head"><h2>Illustration</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="grid2"><button class="btn" id="pi-photo">Mes photos (départ + arrivée)</button><button class="btn" id="pi-none">Aucune</button></div>
    <input type="file" id="pi-file" accept="image/*" multiple style="display:none">
    <p class="sub">Ou cherche dans le catalogue (noms en anglais : squat, dip, raise, row, curl, leg raise…)</p>
    <input id="pi-q" placeholder="Rechercher…" value="${esc(guessQuery(e))}" style="margin-bottom:10px">
    <div class="pi-grid" id="pi-list"><div class="empty">Chargement…</div></div>`, { full: true });
  const pick = img => { sh.close(); cb(img); toast('Illustration enregistrée'); };
  $('#pi-none', sh).onclick = () => pick(false);
  $('#pi-photo', sh).onclick = () => $('#pi-file', sh).click();
  $('#pi-file', sh).onchange = async ev => {
    const files = [...ev.target.files].slice(0, 2); if (!files.length) return;
    try { pick({ photos: await Promise.all(files.map(f => shrinkPhoto(f))) }); } catch (err) { toast('Photo illisible'); }
  };
  loadCatalog().then(cat => {
    const draw = () => {
      const q = $('#pi-q', sh).value.toLowerCase().split(/\s+/).filter(Boolean);
      const res = cat.filter(([id, name, mus, eq]) => q.every(w => (name + ' ' + mus + ' ' + eq).toLowerCase().includes(w))).slice(0, 40);
      $('#pi-list', sh).innerHTML = res.map(([id, name]) => `<button class="pi-item" data-id="${esc(id)}"><span class="illu thumb anim"><img src="${catUrl(id, 0)}" loading="lazy" alt=""><img src="${catUrl(id, 1)}" loading="lazy" alt=""></span><span>${esc(name)}</span></button>`).join('') || '<div class="empty">Aucun résultat</div>';
      $$('.pi-item', sh).forEach(b => b.onclick = () => pick({ db: b.dataset.id }));
    };
    let t; $('#pi-q', sh).oninput = () => { clearTimeout(t); t = setTimeout(draw, 200); };
    draw();
  }).catch(() => { $('#pi-list', sh).innerHTML = '<div class="empty">Catalogue indisponible hors ligne.</div>'; });
}
const GUESS = [['squat', 'squat'], ['deadlift', 'deadlift'], ['couch', 'bench press'], ['traction', 'pull'], ['dips', 'dip'], ['curl', 'curl'], ['latéral', 'lateral raise'], ['frontal', 'front raise'], ['épaules', 'shoulder press'], ['triceps', 'triceps'], ['crunch', 'crunch'], ['jambes', 'leg raise'], ['tirage', 'row'], ['pec', 'fly'], ['gainage', 'plank']];
const guessQuery = e => (GUESS.find(([k]) => e.name.toLowerCase().includes(k)) || [, ''])[1];

// ================================================================ SAUVEGARDE EN LIGNE
const SYNC_TXT = { off: 'désactivée', idle: 'prête', pending: 'modifications en attente d\'envoi…', busy: 'synchronisation…', ok: 'à jour', offline: 'hors ligne — envoi dès le retour du réseau', error: 'erreur' };
function drawSyncCard(host) {
  if (!host) return;
  const c = sync.config();
  const st = sync.status;
  if (!sync.enabled()) {
    host.innerHTML = `<p>Toutes tes modifications (séances, exercices, ordre, réglages, séance en cours) sont envoyées automatiquement dans un dépôt GitHub <b>privé</b> à toi. Si tu changes de téléphone ou réinstalles l'app, tout revient tout seul — et je peux lire ta configuration pour t'aider.</p>
      <div class="field"><label>Dépôt privé</label><input id="sy-repo" value="${esc(c.repo || 'Str9ke/airlift-data')}" autocapitalize="off" spellcheck="false"></div>
      <div class="field"><label>Clé d'accès (fine-grained token)</label><input id="sy-token" type="password" autocomplete="off" placeholder="github_pat_…"><div class="hint">github.com › Settings › Developer settings › Fine-grained tokens › Generate : « Only select repositories » = ce dépôt, permission <b>Contents : Read and write</b>.</div></div>
      <button class="btn primary block" id="sy-go">Activer la sauvegarde en ligne</button>`;
    $('#sy-go', host).onclick = async () => {
      sync.configure({ repo: $('#sy-repo', host).value, token: $('#sy-token', host).value });
      try {
        await sync.test();
        const remote = await sync.pull();
        if (remote && remote.exercises) {
          const when = remote.meta?.updatedAt ? new Date(remote.meta.updatedAt).toLocaleString('fr-FR') : '?';
          if (await confirmBox(`Une sauvegarde en ligne existe (${when}, ${remote.sessions?.length || 0} séances). La récupérer sur ce téléphone ?`, 'Récupérer')) {
            remote.meta.updatedAt = Date.now() + 1; await applyRemote(remote);
          } else store.persist(true);
        } else store.persist(true);
        toast('Sauvegarde en ligne activée');
      } catch (err) { sync.disconnect(); toast('Échec : ' + err.message, 4000); }
      drawSyncCard(host);
    };
    return;
  }
  host.innerHTML = `<div class="row"><span class="sync-dot s-${st.state}"></span><span class="grow"><b>${esc(c.repo)}</b> · ${SYNC_TXT[st.state] || st.state}${st.state === 'error' && st.msg ? ' (' + esc(st.msg) + ')' : ''}</span></div>
    ${st.at ? `<div class="sub" style="margin:4px 0 0">Dernier envoi : ${new Date(st.at).toLocaleString('fr-FR')}</div>` : ''}
    <div class="grid2" style="margin-top:10px"><button class="btn" id="sy-now">Synchroniser maintenant</button><button class="btn" id="sy-off">Déconnecter</button></div>`;
  $('#sy-now', host).onclick = () => { store.persist(true); store.flush(); };
  $('#sy-off', host).onclick = async () => { if (await confirmBox('Arrêter la sauvegarde en ligne sur ce téléphone ? (les données restent sur le téléphone et en ligne)', 'Déconnecter')) { sync.disconnect(); drawSyncCard(host); } };
}
async function applyRemote(remote) {
  store.importJSON(JSON.stringify(remote));
  C.invalidate(); S()._rev = (S()._rev || 0) + 1; render();
}
sync.onStatus(() => { drawSyncCard($('#st-sync')); const d = $('#sync-ind'); if (d) d.className = 'sync-dot s-' + sync.status.state; });

// ================================================================ MISES À JOUR

async function checkUpdate(manual = false) {
  try {
    const r = await fetch('version.json?t=' + Date.now(), { cache: 'no-store' });
    const j = await r.json();
    if (j.version && j.version !== APP_VERSION) {
      toast('Nouvelle version ' + j.version + ' — installation…');
      const reg = await navigator.serviceWorker?.getRegistration();
      await reg?.update();
      setTimeout(() => location.reload(), 1200);
    } else if (manual) toast('AirLift est à jour (' + APP_VERSION + ')');
    if (manual && window.AirLiftNative?.checkApkUpdate) window.AirLiftNative.checkApkUpdate();
  } catch (e) { if (manual) toast('Hors ligne — vérification impossible'); }
}

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => { });
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
// Retour au premier plan : mise à jour de l'app + récupération des données plus récentes.
// Passage en arrière-plan : envoi immédiat de ce qui n'est pas encore en ligne.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { checkUpdate(false); pullAndRender(); } else store.flush();
});
// Le réseau revient (ex. premier lancement hors ligne) : mise à jour immédiate + envoi des données en attente.
addEventListener('online', () => { navigator.serviceWorker?.register('sw.js').catch(() => { }); checkUpdate(false); sync.retry(() => JSON.stringify(S())); });
addEventListener('pagehide', () => store.flush());
async function pullAndRender() {
  if (!sync.enabled()) return;
  if (await store.pullRemote()) { C.invalidate(); S()._rev = (S()._rev || 0) + 1; if (!$('#sheet-root').children.length) render(); toast('Données mises à jour depuis la sauvegarde en ligne'); }
  else sync.retry(() => JSON.stringify(S()));
}
matchMedia('(prefers-color-scheme: light)').addEventListener?.('change', () => applyTheme());
// Redessiner au changement de taille SEULEMENT s'il ne s'agit pas du clavier : sinon le champ perdait le focus
// et le clavier se refermait aussitôt (bug « je n'arrive pas à encoder les numéros »).
let resizeT, lastW = innerWidth;
addEventListener('resize', () => {
  clearTimeout(resizeT);
  resizeT = setTimeout(() => {
    if (innerWidth === lastW) return; // seule la hauteur change = clavier qui s'ouvre/se ferme
    lastW = innerWidth;
    const a = document.activeElement;
    if ($('#sheet-root').children.length || kp.open || (a && /INPUT|TEXTAREA|SELECT/.test(a.tagName))) return;
    render();
  }, 200);
});

// ================================================================ PAVÉ NUMÉRIQUE
// Remplace le clavier du téléphone pour tous les champs numériques : compact, toujours au même endroit,
// avec « Suivant » (champ suivant) et « ✓ » (valide la série et passe à la suivante).
const kp = { open: false, inp: null, buf: '', fresh: true, el: null };
function kpBuild() {
  const el = document.createElement('div');
  el.id = 'keypad'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', 'Pavé numérique');
  const k = (v, cls = '', lbl = v) => `<button type="button" class="kp-k ${cls}" data-v="${v}">${lbl}</button>`;
  el.innerHTML = `<div class="kp-top"><span class="kp-lbl"></span><b class="kp-val"></b><button type="button" class="kp-close" data-v="close" aria-label="Fermer">▾</button></div>
    <div class="kp-grid">
      ${k('7')}${k('8')}${k('9')}${k('back', 'fn', '⌫')}
      ${k('4')}${k('5')}${k('6')}${k('next', 'fn', 'Suivant')}
      ${k('1')}${k('2')}${k('3')}${k('ok', 'ok', '✓ Série')}
      ${k('.', '', ',')}${k('0')}${k('clear', 'fn', 'Effacer')}${k('done', 'fn', 'OK')}
    </div>`;
  el.addEventListener('pointerdown', ev => ev.preventDefault()); // garde le focus visuel, pas de clavier système
  el.addEventListener('click', ev => { const b = ev.target.closest('[data-v]'); if (b) kpKey(b.dataset.v); });
  document.body.append(el);
  kp.el = el;
}
const kpInputs = () => { const root = kp.inp?.closest('.sheet') || $('#view'); return $$('input[type=number]', root).filter(i => i.offsetParent); };
function kpLabel(inp) {
  if (inp.dataset.lbl) return inp.dataset.lbl;
  const row = inp.closest('.set-row'), card = inp.closest('.log-ex');
  const unit = inp.dataset.k === 'w' ? 'kg' : inp.dataset.k === 't' ? 'secondes' : inp.dataset.k === 'r' ? 'reps' : (inp.closest('.field')?.querySelector('label')?.textContent || '');
  if (card && row) return `${$('h3', card)?.firstChild?.textContent || ''} · série ${row.dataset.si != null ? +row.dataset.si + 1 : +row.dataset.i + 1} · ${unit}`;
  if (row) return `Série ${+row.dataset.i + 1} · ${unit}`;
  return unit;
}
function kpOpen(inp, scroll = true) {
  if (!kp.el) kpBuild();
  if (kp.inp && kp.inp !== inp) { kpCommit(); kp.inp.classList.remove('kp-on'); }
  kp.inp = inp; kp.buf = inp.value; kp.fresh = true; kp.open = true;
  inp.readOnly = true; inp.classList.add('kp-on');
  $('.kp-lbl', kp.el).textContent = kpLabel(inp);
  $('[data-v=ok]', kp.el).style.visibility = inp.closest('.set-row')?.querySelector('[data-chk]') ? '' : 'hidden';
  kpShow();
  kp.el.classList.add('on'); document.body.classList.add('kp-open');
  if (scroll) setTimeout(() => inp.scrollIntoView({ block: 'center', behavior: 'smooth' }), 30);
}
function kpShow() { const v = kp.buf.replace('.', ','); $('.kp-val', kp.el).textContent = v || (kp.inp?.placeholder ? kp.inp.placeholder.replace('.', ',') : '–'); $('.kp-val', kp.el).classList.toggle('ph', !v); }
function kpClose() {
  if (!kp.open) return;
  const i = kp.inp; kp.open = false;
  setTimeout(() => { if (i && kp.dirty) { kp.dirty = false; i.dispatchEvent(new Event('change', { bubbles: true })); } }, 0); kp.el?.classList.remove('on'); document.body.classList.remove('kp-open');
  i?.classList.remove('kp-on'); kp.inp = null;
}
function kpWrite() {
  const inp = kp.inp; if (!inp) return;
  const clean = kp.buf.endsWith('.') ? kp.buf.slice(0, -1) : kp.buf;
  inp.value = clean;
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  kp.dirty = true;
}
// « change » seulement en quittant le champ (comme le clavier natif) : certains champs redessinent l'écran
function kpCommit() { const i = kp.inp; if (i && kp.dirty) { kp.dirty = false; i.dispatchEvent(new Event('change', { bubbles: true })); } }
function kpMove(dir = 1) {
  const list = kpInputs(); const i = list.indexOf(kp.inp);
  const nx = list[i + dir];
  if (nx) kpOpen(nx); else kpClose();
}
function kpKey(v) {
  if (!kp.inp) return;
  if (navigator.vibrate) navigator.vibrate(8);
  if (/^\d$/.test(v) || v === '.') {
    if (kp.fresh) kp.buf = '';
    kp.fresh = false;
    if (v === '.' && (kp.buf.includes('.') || kp.inp.dataset.k === 'r' || kp.inp.dataset.k === 't')) return;
    if (kp.buf.replace('.', '').length >= 5) return;
    kp.buf = (kp.buf === '0' && v !== '.') ? v : (kp.buf === '' && v === '.' ? '0.' : kp.buf + v);
    kpWrite();
  } else if (v === 'back') { kp.fresh = false; kp.buf = kp.buf.slice(0, -1); kpWrite(); }
  else if (v === 'clear') { kp.fresh = false; kp.buf = ''; kpWrite(); }
  else if (v === 'next') return kpMove(1);
  else if (v === 'done' || v === 'close') return kpClose();
  else if (v === 'ok') {
    const row = kp.inp.closest('.set-row'); const chk = row?.querySelector('[data-chk]');
    if (chk && !chk.classList.contains('on')) chk.click();
    if (!row.isConnected) return;
    // passe au premier champ de la série suivante (ou de l'exercice suivant)
    const list = kpInputs(); const after = list.filter(i => row.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING && !row.contains(i));
    if (after[0]) kpOpen(after[0]); else kpClose();
    return;
  }
  kpShow();
}
// tous les champs numériques passent par le pavé (pointerdown : avant que le clavier système ne s'ouvre)
// Toucher un champ chiffré : lecture seule tout de suite (pas de clavier du téléphone) ; le pavé ne s'ouvre qu'au
// « clic », c.-à-d. un appui sans glisser. Faire défiler la page en partant d'un champ n'ouvre plus rien.
document.addEventListener('pointerdown', ev => { const inp = ev.target.closest?.('input[type=number]'); if (inp) inp.readOnly = true; }, true);
document.addEventListener('click', ev => {
  const inp = ev.target.closest?.('input[type=number]');
  if (inp) { ev.preventDefault(); kpOpen(inp); return; }
  if (kp.open && !ev.target.closest('#keypad')) kpClose();
}, true);
document.addEventListener('focusin', ev => { if (ev.target.matches?.('input[type=number]')) { ev.target.readOnly = true; if (kp.inp !== ev.target) ev.target.blur(); } });


// ================================================================ boot
store.init().then(() => { S()._rev = S()._rev || 0; render(); $('#sync-ind').className = 'sync-dot s-' + sync.status.state; pullAndRender(); setTimeout(() => checkUpdate(false), 1500); });

