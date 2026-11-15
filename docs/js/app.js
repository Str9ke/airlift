import * as store from './store.js';
import { S, commit, uid, ex as getEx, normalizeExercise, dayOf } from './store.js';
import * as C from './calc.js';
import { fmt, today, toD, daysBetween } from './calc.js';
import { EQUIP, TYPES, CATEGORIES, WEEKDAYS } from './program.js';
import { lineChart, sparkline, fdate } from './charts.js';
import { illuHTML, illuOf, shrinkPhoto, loadCatalog, catUrl } from './media.js';
import * as sync from './sync.js';

export const APP_VERSION = '1.1.0';
const DAYS_ = () => S().days;
const todayDay = () => DAYS_().find(d => d.wd === new Date().getDay());
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ui = { tab: 'prog', day: 'all', showArch: false, archFilter: '', statRange: 'all', bodyRange: 'all', histLimit: 60 };
try { Object.assign(ui, JSON.parse(localStorage.getItem('airlift.ui') || '{}')); } catch (e) { /* */ }
const saveUi = () => { try { localStorage.setItem('airlift.ui', JSON.stringify({ tab: ui.tab, day: ui.day, statRange: ui.statRange, bodyRange: ui.bodyRange })); } catch (e) { /* */ } };

const ICON = {
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
window.airliftBack = () => { const r = $('#sheet-root'); if (r.lastElementChild) { r.lastElementChild.remove(); r.lastElementChild?.remove(); if (ui.tab) render(); return true; } if (ui.tab !== 'prog') { setTab('prog'); return true; } return false; };

function confirmBox(msg, okLabel = 'Confirmer', danger = false) {
  return new Promise(res => {
    const sh = sheet(`<h2 style="margin-top:4px">${esc(msg)}</h2><div class="grid2" style="margin-top:16px"><button class="btn" data-no>Annuler</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button></div>`, { onClose: () => res(false) });
    $('[data-no]', sh).onclick = () => { sh.close(); };
    $('[data-ok]', sh).onclick = () => { res(true); sh.back.remove(); sh.remove(); };
  });
}

function setTab(t) { ui.tab = t; saveUi(); render(); window.scrollTo(0, 0); }
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
  applyTheme();
  $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === ui.tab));
  const v = $('#view');
  v.className = S().settings.density === 'compact' ? 'compact' : '';
  ({ prog: renderProg, log: renderLog, stats: renderStats, body: renderBody, hist: renderHist })[ui.tab](v);
}

// ================================================================ PROGRAMME
function rangeOf(e) {
  if (e.type === 'time') return `${e.sets}×${e.timeMin}-${e.timeMax}s`;
  return `${e.sets}×${e.repMin}${e.repMax !== e.repMin ? '-' + e.repMax : ''}`;
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
      <div class="name">${archived ? '' : e.days.map(dayTag).join('')}${esc(e.name)}</div>
      <div class="meta">${archived ? (st.last ? `${esc(recent)} · il y a ${C.fmtDuration(since)}` : 'Aucune donnée') : `${rangeOf(e)}${recent ? ' · ' + esc(recent) : ''}`}</div>
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
  v.innerHTML = `
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
    ${dr ? `<div class="card live-banner"><div class="row"><div class="grow"><b>Séance en cours</b><div class="sub" style="margin:2px 0 0">${esc(dayOf(dr.day)?.label || 'Séance libre')} · <span data-clock="${dr.startedAt || ''}">${clock(dr.startedAt)}</span></div></div><button class="btn sm" id="dr-del">Supprimer</button><button class="btn sm primary" id="dr-go">Reprendre</button></div></div>` : ''}
    <div class="chips" style="margin-top:12px">
      <button class="chip ${ui.day === 'all' ? 'on' : ''}" data-day="all">Tous (${active.length})</button>
      ${DAYS_().map(d => `<button class="chip ${ui.day === d.id ? 'on' : ''}" data-day="${d.id}">${esc(d.label)}</button>`).join('')}
    </div>
    <div class="row" style="margin-bottom:8px">
      <div class="grow sub" style="margin:0">Maintiens <b>⋮⋮</b> et glisse pour réordonner.</div>
      <button class="btn sm primary" id="start-day">Démarrer ${ui.day === 'all' ? 'la séance' : esc(dayOf(ui.day)?.short || '')}</button>
    </div>
    <div class="ex-list" id="active-list">${shown.map(e => exRow(e)).join('') || '<div class="empty">Aucun exercice pour ce jour.</div>'}</div>
    <button class="section-toggle" id="toggle-arch"><span>Anciens exercices · hors programme (${st.exercises.filter(e => !e.active).length})</span><span>${ui.showArch ? '▴' : '▾'}</span></button>
    ${ui.showArch ? `<input placeholder="Rechercher…" id="arch-filter" value="${esc(ui.archFilter)}" style="margin-bottom:8px">
    <div class="ex-list">${archived.map(x => exRow(x.e, true)).join('')}</div>` : ''}
    <button class="fab" id="fab-add" aria-label="Ajouter un exercice">${ICON.plus}</button>`;
  $$('[data-day]', v).forEach(b => b.onclick = () => { ui.day = b.dataset.day; saveUi(); render(); });
  $('#toggle-arch').onclick = () => { ui.showArch = !ui.showArch; render(); };
  const af = $('#arch-filter'); if (af) af.oninput = () => { ui.archFilter = af.value; const pos = af.selectionStart; render(); const n = $('#arch-filter'); n.focus(); n.setSelectionRange(pos, pos); };
  $('#fab-add').onclick = () => editExercise(null);
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
        normalizeOrder(); commit();
      },
    });
  }
}
function normalizeOrder() { S().exercises.filter(e => e.active).sort((a, b) => a.order - b.order).forEach((e, i) => e.order = i); }

function bindRows(v) {
  $$('.ex-row', v).forEach(r => {
    const id = r.dataset.id;
    $('[data-open]', r).onclick = () => openExercise(id);
    const m = $('[data-menu]', r); if (m) m.onclick = () => exMenu(id);
    const rs = $('[data-restore]', r); if (rs) rs.onclick = () => { const e = getEx(id); e.active = true; e.order = 9999; normalizeOrder(); commit(); toast(`« ${e.name} » remis dans le programme`); render(); };
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
function editExercise(e) {
  const isNew = !e;
  const d = e ? { ...e } : normalizeExercise({ name: '', active: true, days: ui.day !== 'all' ? [ui.day] : [], equip: 'machine', type: 'load', category: 'Autre' });
  const sh = sheet(`<div class="sheet-head"><h2>${isNew ? 'Nouvel exercice' : 'Modifier'}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <div class="field"><label>Nom</label><input id="f-name" value="${esc(d.name)}" placeholder="ex. Curl marteau"></div>
    <div class="field"><label>Illustration</label><div class="row" style="gap:10px;align-items:center">${illuHTML(d, 'thumb lg')}<div class="grow"><button class="btn sm" id="f-illu" type="button">Changer l'illustration…</button></div></div></div>
    <div class="field"><label>Jours du programme</label><div class="seg" id="f-days">${DAYS_().map(x => `<button data-v="${x.id}" class="${d.days.includes(x.id) ? 'on' : ''}">${esc(x.label)}</button>`).join('')}</div></div>
    <div class="field"><label>Matériel</label><div class="seg" id="f-equip">${Object.entries(EQUIP).map(([k, x]) => `<button data-v="${k}" class="${d.equip === k ? 'on' : ''}">${x.label}</button>`).join('')}</div><div class="hint" id="f-equip-hint">${EQUIP[d.equip]?.hint || ''}</div></div>
    <div class="field"><label>Mesure</label><div class="seg" id="f-type">${Object.entries(TYPES).map(([k, x]) => `<button data-v="${k}" class="${d.type === k ? 'on' : ''}">${x}</button>`).join('')}</div></div>
    <div class="grid3">
      <div class="field"><label>Séries</label><input id="f-sets" type="number" inputmode="numeric" value="${d.sets}"></div>
      <div class="field" data-rep><label>Reps min</label><input id="f-rmin" type="number" inputmode="numeric" value="${d.repMin}"></div>
      <div class="field" data-rep><label>Reps max</label><input id="f-rmax" type="number" inputmode="numeric" value="${d.repMax}"></div>
      <div class="field" data-time><label>Durée min (s)</label><input id="f-tmin" type="number" inputmode="numeric" value="${d.timeMin}"></div>
      <div class="field" data-time><label>Durée max (s)</label><input id="f-tmax" type="number" inputmode="numeric" value="${d.timeMax}"></div>
    </div>
    <div class="field" data-inc><label>Incrément de charge (kg)</label><input id="f-inc" type="number" inputmode="decimal" step="0.25" value="${d.inc}"><div class="hint">Quand tu atteins les reps max sur une série, la charge suivante = charge + incrément${d.equip === 'db2' ? ' (par haltère)' : ''}.</div></div>
    <div class="field"><label>Catégorie</label><select id="f-cat">${CATEGORIES.map(c => `<option ${c === d.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Consigne / repère</label><input id="f-cue" value="${esc(d.cue)}" placeholder="ex. descente 3 s"></div>
    <button class="btn primary block" id="f-save">${isNew ? 'Ajouter au programme' : 'Enregistrer'}</button>`);
  const seg = (id, multi) => $$(`#${id} button`, sh).forEach(b => b.onclick = () => {
    if (multi) b.classList.toggle('on'); else { $$(`#${id} button`, sh).forEach(x => x.classList.remove('on')); b.classList.add('on'); }
    if (id === 'f-equip') { $('#f-equip-hint', sh).textContent = EQUIP[b.dataset.v].hint; $('#f-inc', sh).value = EQUIP[b.dataset.v].inc; }
    vis();
  });
  const vis = () => {
    const t = $('#f-type .on', sh)?.dataset.v;
    $$('[data-rep]', sh).forEach(x => x.style.display = t === 'time' ? 'none' : '');
    $$('[data-time]', sh).forEach(x => x.style.display = t === 'time' ? '' : 'none');
    $('[data-inc]', sh).style.display = (t === 'reps' || t === 'time') ? 'none' : '';
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
      category: $('#f-cat', sh).value, cue: $('#f-cue', sh).value, img: d.img ?? t.img ?? null,
    });

    if (t.repMax < t.repMin) t.repMax = t.repMin;
    if (isNew) { t.id = uid(); t.active = true; t.order = 9999; S().exercises.push(t); normalizeOrder(); }
    C.invalidate(); S()._rev = (S()._rev || 0) + 1; commit(); sh.close(); render();
    toast(isNew ? 'Exercice ajouté' : 'Enregistré');
  };
}

// ---------------------------------------------------------------- plan manuel « prochaine fois »
function editPlan(e) {
  const sg = C.suggest({ ...e, plan: null });
  const cur = e.plan?.manual ? e.plan.sets : sg.sets;
  const time = e.type === 'time', repsOnly = e.type === 'reps';
  const rows = Array.from({ length: e.sets }, (_, i) => cur[i] || cur.at(-1) || {});
  const sh = sheet(`<div class="sheet-head"><h2>Prochaine fois · ${esc(e.name)}</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <p class="sub">Suggestion automatique : <b>${esc(sg.sets.map(s => C.fmtSet(e, s)).join(' · '))}</b>${sg.note ? '<br>' + esc(sg.note) : ''}</p>
    <div class="col-h ${time || repsOnly ? 'time' : ''}"><span>#</span>${time ? '<span>secondes</span>' : repsOnly ? '<span>reps</span>' : `<span>${unitW(e)}</span><span>reps</span>`}<span></span></div>
    ${rows.map((s, i) => `<div class="set-row ${time || repsOnly ? 'time' : ''}" data-i="${i}"><span class="n">${i + 1}</span>${time ? `<input data-k="t" type="number" inputmode="numeric" value="${s.t ?? ''}">` : repsOnly ? `<input data-k="r" type="number" inputmode="numeric" value="${s.r ?? ''}">` : `<input data-k="w" type="number" inputmode="decimal" step="0.25" value="${s.w ?? ''}"><input data-k="r" type="number" inputmode="numeric" value="${s.r ?? ''}">`}<span></span></div>`).join('')}
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
    <div class="sub">${e.active ? e.days.map(dayTag).join('') + rangeOf(e) : '<span class="tag">Hors programme</span>'} · ${EQUIP[e.equip]?.label || ''} · ${TYPES[e.type]}${e.cue ? ' · ' + esc(e.cue) : ''}</div>
    ${st.n ? `<div class="kpis">
      <div class="kpi"><b>${fmt(st.last.perf)}<small> ${unit}</small></b><span>${C.perfLabel(e)} actuel</span></div>
      <div class="kpi"><b>${fmt(st.best.perf)}<small> ${unit}</small></b><span>Record · ${fdate(st.best.date)}</span></div>
      <div class="kpi"><b>${st.gap > 0 ? '+' + fmt(st.gap) : '✓'}<small>${st.gap > 0 ? ' ' + unit : ''}</small></b><span>${st.gap > 0 ? `à regagner (${fmt(st.gapPct, 0)} %)` : 'Au record !'}</span></div>
    </div>
    <div class="card" style="margin-top:12px">
      <div class="row" style="margin-bottom:6px"><b class="grow">${C.perfLabel(e)}</b><div class="range" id="d-range">${['3m', '1a', '5a', 'all'].map(r => `<button data-r="${r}" class="${(ui.exRange || 'all') === r ? 'on' : ''}">${{ '3m': '3 m', '1a': '1 an', '5a': '5 ans', all: 'Tout' }[r]}</button>`).join('')}</div></div>
      <div id="d-chart"></div>
      <div class="legend"><span><i style="background:var(--series-1)"></i>${C.perfLabel(e)}</span><span><i class="pr"></i>Record battu</span><span><i class="hatch"></i>Pause &gt; 2 mois</span></div>
      <div class="sub" style="margin:6px 0 0">Courbe = meilleure performance des 4 dernières semaines ; points gris = chaque séance.</div>
    </div>` : '<div class="empty">Pas encore d\'historique pour cet exercice.</div>'}
    ${e.active ? `<div class="card" style="margin-top:12px"><div class="row"><b class="grow">Prochaine séance</b><button class="btn sm" id="d-plan">Modifier</button></div>
      <div style="margin-top:6px;font-size:16px;font-weight:700;color:var(--accent)">${esc(sg.sets.map(s => C.fmtSet(e, s)).join(' · ') || '—')}</div>
      <div class="sub" style="margin:4px 0 0">${sg.manual ? 'Objectif marqué manuellement.' + (sg.note ? ' ' + esc(sg.note) : '') : esc(sg.note || `Double progression : vise ${e.type === 'time' ? e.timeMax + ' s' : e.repMax + ' reps'} sur chaque série, puis la charge monte de ${fmt(C.incOf(e))} kg${e.equip === 'db2' ? ' par haltère' : ''}.`)}</div></div>` : ''}
    <h2>Séances (${st.n})</h2>
    <table><thead><tr><th>Date</th><th>Séries</th><th class="r">${unit}</th></tr></thead><tbody>
    ${st.arr.slice().reverse().slice(0, 80).map((h, i, a) => { const prev = a[i + 1]; const d = prev ? h.perf - prev.perf : 0; return `<tr><td>${fdate(h.date)}${h.session.approx ? ' <span class="muted">≈</span>' : ''}</td><td>${esc(C.fmtEntry(e, h.entry))}${h.isPR ? ' <span class="pr-badge">PR</span>' : ''}</td><td class="r">${fmt(h.perf)}${prev ? `<br><small class="delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d > 0 ? '+' : ''}${fmt(d)}</small>` : ''}</td></tr>`; }).join('')}
    </tbody></table>
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
  $('#d-illu', sh).onclick = () => pickIllustration(e, img => { e.img = img; commit(); $('#d-illu', sh).innerHTML = illuHTML(e, 'hero'); });
  const p = $('#d-plan', sh); if (p) p.onclick = () => { sh.close(); editPlan(e); };
  $('#d-edit', sh).onclick = () => { sh.close(); editExercise(e); };
  const a = $('#d-arch', sh); if (a) a.onclick = () => { e.active = false; commit(); sh.close(); render(); toast('Retiré du programme'); };
  const r = $('#d-restore', sh); if (r) r.onclick = () => { e.active = true; e.order = 9999; normalizeOrder(); commit(); sh.close(); render(); toast('Remis dans le programme'); };
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
  $$('[data-clock]').forEach(el => { const v = +el.dataset.clock; if (v) el.textContent = clock(v); });
  const r = $('[data-rest]');
  if (r) {
    const v = +r.dataset.rest; if (!v) return;
    const s = Math.round((Date.now() - v) / 1000), goal = S().settings.restSec || 120;
    r.textContent = clock(v);
    r.parentElement.classList.toggle('over', s >= goal);
    if (s === goal && navigator.vibrate) navigator.vibrate([120, 80, 120]);
  }
}, 1000);

async function deleteDraft() {
  if (!(await confirmBox('Supprimer la séance en cours ? Rien ne sera enregistré.', 'Supprimer', true))) return;
  saveDraft(null); render(); toast('Séance supprimée');
}

function startSession(day) {
  const cur = loadDraft();
  if (cur) { setTab('log'); toast('Une séance est déjà en cours — termine-la ou supprime-la'); return; }
  const list = S().exercises.filter(e => e.active && (!day || e.days.includes(day))).sort((a, b) => a.order - b.order);
  saveDraft({ id: uid(), date: today(), day, note: '', startedAt: Date.now(), lastSetAt: null, entries: list.map(e => ({ ex: e.id, sets: Array.from({ length: e.sets }, () => ({})) })) });
  setTab('log');
}

function renderLog(v) {
  const d = loadDraft();
  if (!d) {
    const last = S().sessions.at(-1);
    const td = todayDay();
    v.innerHTML = `<h1>Séance</h1><p class="sub">Choisis la séance du jour : le chrono démarre aussitôt. Les charges proposées tiennent compte de ta dernière fois et des incréments réels de chaque matériel.</p>
      <div class="menu">${DAYS_().map(x => `<button data-start="${x.id}" class="${td?.id === x.id ? 'today' : ''}"><div class="row"><span class="grow">${esc(x.label)}${td?.id === x.id ? ' <span class="tag">aujourd\'hui</span>' : ''}</span><span class="muted">${S().exercises.filter(e => e.active && e.days.includes(x.id)).length} exos ›</span></div></button>`).join('')}
      <button data-start=""><div class="row"><span class="grow">Séance libre (tout le programme)</span><span class="muted">›</span></div></button></div>
      ${last ? `<p class="sub" style="margin-top:16px">Dernière séance : ${fdate(last.date)} (il y a ${C.fmtDuration(daysBetween(last.date, today()))}).</p>` : ''}`;
    $$('[data-start]', v).forEach(b => b.onclick = () => startSession(b.dataset.start || null));
    return;
  }
  if (!d.startedAt) d.startedAt = Date.now();
  v.innerHTML = `<div class="row" style="margin-top:6px"><h1 class="grow" style="margin:0">${d.day ? esc(dayOf(d.day)?.label || 'Séance') : 'Séance libre'}</h1></div>
    <div class="timer-bar">
      <div class="tb-main"><span class="tb-l">Durée</span><b data-clock="${d.startedAt}">${clock(d.startedAt)}</b><span class="tb-s">depuis ${hhmm(d.startedAt)}</span></div>
      <div class="tb-rest"><span class="tb-l">Repos</span><b data-rest="${d.lastSetAt || ''}">${d.lastSetAt ? clock(d.lastSetAt) : '–'}</b><span class="tb-s">objectif ${clock(1, 1 + (S().settings.restSec || 120) * 1000)}</span></div>
      <button class="btn sm" id="l-restart" title="Remettre le chrono à zéro">Je commence maintenant</button>
    </div>
    <div class="row" style="margin:8px 0 12px"><input type="date" id="l-date" value="${d.date}" style="max-width:170px"><span class="grow"></span><button class="btn sm" id="l-add">${ICON.plus.replace('<svg', '<svg width="16" height="16" style="fill:none;stroke:currentColor;stroke-width:2.2"')} Exercice</button></div>
    <div id="l-editor"></div>
    <div class="field"><label>Notes de séance</label><textarea id="l-note" rows="2" placeholder="Sensations, douleurs, conditions…">${esc(d.note)}</textarea></div>
    <div class="grid2 sticky-bottom"><button class="btn danger" id="l-cancel">Supprimer la séance</button><button class="btn primary" id="l-finish">Terminer · <span data-clock="${d.startedAt}">${clock(d.startedAt)}</span></button></div>`;
  const ed = $('#l-editor', v);
  const onSet = () => { d.lastSetAt = Date.now(); saveDraft(d); const r = $('[data-rest]', v); if (r) { r.dataset.rest = d.lastSetAt; r.textContent = '0:00'; r.parentElement.classList.remove('over'); } };
  sessionEditor(ed, d, () => saveDraft(d), { suggest: true, onSet });
  $('#l-restart', v).onclick = () => { d.startedAt = Date.now(); saveDraft(d); render(); toast('Chrono remis à zéro'); };
  $('#l-date', v).onchange = ev => { d.date = ev.target.value; saveDraft(d); };
  $('#l-note', v).oninput = ev => { d.note = ev.target.value; saveDraft(d); };
  $('#l-add', v).onclick = () => pickExercise(id => { const e = getEx(id); d.entries.push({ ex: id, sets: Array.from({ length: e.sets || 3 }, () => ({})) }); saveDraft(d); render(); });
  $('#l-cancel', v).onclick = () => deleteDraft();
  $('#l-finish', v).onclick = () => finishSession(d);
}

/** Éditeur de séries — partagé entre la séance en cours et l'édition d'historique. */
function sessionEditor(host, d, onChange, { suggest = false, onSet = null } = {}) {
  host.innerHTML = d.entries.map((en, ei) => {
    const e = getEx(en.ex); if (!e) return '';
    const st = C.exStats(e.id);
    const sg = suggest ? C.suggest(e) : { sets: [] };
    const time = e.type === 'time', repsOnly = e.type === 'reps';
    const prev = st.arr.filter(h => h.session.id !== d.id).slice(-3);
    const done = en.sets.length && en.sets.every(s => s.done);
    return `<div class="log-ex ${done ? 'done' : ''}" data-ei="${ei}">
      <div class="row" style="gap:10px"><button class="illu-btn" data-illu aria-label="Voir l'exercice">${illuHTML(e, 'thumb')}</button><h3 class="grow">${esc(e.name)}</h3><span style="margin-right:4px">${sparkline(prev.map(h => h.perf), { w: 54, h: 20 })}</span><button class="mini-btn" data-rm aria-label="Retirer">${ICON.x}</button></div>
      ${e.cue ? `<div class="cue">${esc(e.cue)}</div>` : ''}
      ${prev.length ? `<div class="prev">${prev.map(h => `${fdate(h.date).replace(/ \d{4}$/, '')} : ${esc(C.fmtEntry(e, h.entry))}`).join('<br>')}</div>` : '<div class="prev">Première fois — note ta charge de départ.</div>'}
      ${sg.note ? `<div class="sugg">${sg.manual ? '✎ ' : '▲ '}${esc(sg.note)}</div>` : ''}
      <div class="col-h ${time || repsOnly ? 'time' : ''}"><span>#</span>${time ? '<span>secondes</span>' : repsOnly ? '<span>reps</span>' : `<span>${unitW(e)}</span><span>reps</span>`}<span>✓</span></div>
      ${en.sets.map((s, si) => { const p = sg.sets[si] || sg.sets.at(-1) || {}; return `<div class="set-row ${time || repsOnly ? 'time' : ''}" data-si="${si}"><span class="n">${si + 1}</span>
        ${time ? `<input data-k="t" type="number" inputmode="numeric" value="${s.t ?? ''}" placeholder="${p.t ?? e.timeMin}">`
        : repsOnly ? `<input data-k="r" type="number" inputmode="numeric" value="${s.r ?? ''}" placeholder="${p.r ?? e.repMin}">`
        : `<input data-k="w" type="number" inputmode="decimal" step="0.25" value="${s.w ?? ''}" placeholder="${p.w ?? ''}"><input data-k="r" type="number" inputmode="numeric" value="${s.r ?? ''}" placeholder="${p.r ?? e.repMin}">`}
        <button class="chk ${s.done ? 'on' : ''}" data-chk aria-label="Série faite">${ICON.check}</button></div>`; }).join('')}
      <div class="row"><button class="btn sm" data-addset>+ Série</button>${en.sets.length > 1 ? '<button class="btn sm" data-delset>− Série</button>' : ''}<span class="grow"></span><button class="btn sm" data-plan>Prochaine fois…</button></div>
    </div>`;
  }).join('') || '<div class="empty">Aucun exercice. Ajoute-en un.</div>';
  $$('.log-ex', host).forEach(card => {
    const en = d.entries[+card.dataset.ei];
    $$('.set-row', card).forEach(row => {
      const s = en.sets[+row.dataset.si];
      $$('input', row).forEach(inp => inp.oninput = () => { if (inp.value === '') delete s[inp.dataset.k]; else s[inp.dataset.k] = +inp.value; s.done = true; $('[data-chk]', row).classList.add('on'); onChange(); });
      $('[data-chk]', row).onclick = ev => {
        s.done = !s.done;
        if (s.done) $$('input', row).forEach(inp => { if (inp.value === '' && inp.placeholder !== '') { inp.value = inp.placeholder; s[inp.dataset.k] = +inp.placeholder; } });
        ev.currentTarget.classList.toggle('on', s.done);
        card.classList.toggle('done', en.sets.every(x => x.done));
        if (s.done && navigator.vibrate) navigator.vibrate(15);
        if (s.done && onSet) onSet();
        onChange();
      };
    });
    $('[data-addset]', card).onclick = () => { en.sets.push({}); onChange(); sessionEditor(host, d, onChange, { suggest }); };
    const ds = $('[data-delset]', card); if (ds) ds.onclick = () => { en.sets.pop(); onChange(); sessionEditor(host, d, onChange, { suggest }); };
    $('[data-rm]', card).onclick = () => { d.entries.splice(+card.dataset.ei, 1); onChange(); sessionEditor(host, d, onChange, { suggest }); };
    $('[data-plan]', card).onclick = () => editPlan(getEx(en.ex));
    $('[data-illu]', card).onclick = () => showIllustration(getEx(en.ex));
  });
}

function pickExercise(cb) {
  const all = S().exercises.slice().sort((a, b) => (b.active - a.active) || a.name.localeCompare(b.name));
  const sh = sheet(`<div class="sheet-head"><h2>Ajouter un exercice</h2><button class="icon-btn" data-close>${ICON.x}</button></div>
    <input id="pk-q" placeholder="Rechercher…" style="margin-bottom:10px"><div class="menu" id="pk-list"></div>`);
  const draw = () => { const q = $('#pk-q', sh).value.toLowerCase(); $('#pk-list', sh).innerHTML = all.filter(e => e.name.toLowerCase().includes(q)).slice(0, 60).map(e => `<button data-id="${e.id}">${esc(e.name)} ${e.active ? '' : '<span class="muted">· ancien</span>'}</button>`).join(''); $$('#pk-list button', sh).forEach(b => b.onclick = () => { sh.close(); cb(b.dataset.id); }); };
  $('#pk-q', sh).oninput = draw; draw();
}

function cleanEntries(d) {
  return d.entries.map(en => ({ ex: en.ex, sets: en.sets.filter(s => s.done || s.w != null || s.r != null || s.t != null).filter(s => s.r != null || s.t != null).map(s => { const o = {}; if (s.w != null) o.w = s.w; if (s.r != null) o.r = s.r; if (s.t != null) o.t = s.t; return o; }) })).filter(en => en.sets.length);
}

function finishSession(d) {
  const entries = cleanEntries(d);
  if (!entries.length) { toast('Aucune série remplie'); return; }
  const before = C.sessionScores().at(-1)?.cum || 0;
  const end = Date.now();
  const sess = { id: d.id, date: d.date, note: d.note, source: 'app', entries };
  if (d.startedAt) Object.assign(sess, { start: hhmm(d.startedAt), end: hhmm(end), dur: Math.max(1, Math.round((end - d.startedAt) / 60000)) });
  S().sessions.push(sess);
  entries.forEach(en => { const e = getEx(en.ex); if (e && e.plan?.manual) e.plan = null; });
  S()._rev = (S()._rev || 0) + 1;
  C.invalidate(); commit(); saveDraft(null);
  const sc = C.sessionScores().find(x => x.session.id === sess.id);
  const prs = C.history();
  const prNames = entries.filter(en => (prs.byEx.get(en.ex) || []).find(h => h.session.id === sess.id && h.isPR)).map(en => getEx(en.ex).name);
  const sh = sheet(`<div style="text-align:center;padding:10px 0">
      <div class="muted" style="font-weight:700;letter-spacing:.06em;text-transform:uppercase;font-size:12px">Séance enregistrée</div>
      <div class="summary-pts">${sc && sc.pts >= 0 ? '+' : ''}${sc ? sc.pts : 0} pts</div>
      ${sess.dur ? `<div class="summary-time">⏱ ${fmtMin(sess.dur)} <span class="muted">(${sess.start} → ${sess.end})</span></div>` : ''}
      <div class="sub">Total : ${fmt((sc?.cum ?? before), 0)} pts · ${entries.length} exercices · facteur volume ×${fmt(sc?.vol ?? 1, 2)}</div>

      ${prNames.length ? `<p><span class="pr-badge">RECORD</span> ${prNames.map(esc).join(', ')}</p>` : ''}
    </div>
    <h2>Prochaine fois</h2>
    <div class="menu">${entries.map(en => { const e = getEx(en.ex); const sg = C.suggest(e); return `<div class="card" style="padding:10px 12px"><b>${esc(e.name)}</b><div style="color:${sg.sets.some(s => s.up) ? 'var(--gold)' : 'var(--accent)'};font-weight:700">${esc(sg.sets.map(s => C.fmtSet(e, s)).join(' · '))}</div>${sg.note ? `<div class="sub" style="margin:2px 0 0">${esc(sg.note)}</div>` : ''}</div>`; }).join('')}</div>
    <button class="btn primary block" data-close style="margin-top:14px">Super</button>`);
  render();
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
  v.innerHTML = `<h1>Statistiques</h1><p class="sub">${S().sessions.length} séances depuis ${S().sessions[0] ? fdate(S().sessions[0].date) : '—'} · ${br.length} pauses de plus de ${S().settings.breakDays} jours (${C.fmtDuration(totalBreak)} au total).</p>
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
function renderBody(v) {
  const b = S().body;
  const br = C.breaks();
  const from = rangeStart(ui.bodyRange);
  const lastOf = k => b.filter(x => x[k] != null).at(-1);
  const bestOf = k => b.filter(x => x[k] != null).reduce((m, x) => (m == null || x[k] < m[k]) ? x : m, null);
  v.innerHTML = `<h1>Corps</h1><p class="sub">${b.length} mesures depuis ${b[0] ? fdate(b[0].date) : '—'}. Les zones hachurées sont les pauses d'entraînement.</p>
    <div class="kpis">${MEAS.map(m => { const l = lastOf(m.k), be = bestOf(m.k); return `<div class="kpi"><b>${l ? fmt(l[m.k]) : '–'}<small> ${m.unit}</small></b><span>${m.label}${l ? ` · ${l.date.slice(0, 7)}` : ''}${be && l && be[m.k] < l[m.k] ? `<br>min ${fmt(be[m.k])} (${be.date.slice(0, 4)})` : ''}</span></div>`; }).join('')}</div>
    <button class="btn primary block" id="b-add" style="margin-top:12px">${ICON.plus.replace('<svg', '<svg width="18" height="18" style="fill:none;stroke:currentColor;stroke-width:2.4"')} Nouvelle mesure</button>
    <div class="row" style="margin-top:16px"><span class="grow"></span><div class="range" id="b-range">${['1a', '5a', 'all'].map(r => `<button data-r="${r}" class="${ui.bodyRange === r ? 'on' : ''}">${{ '1a': '1 an', '5a': '5 ans', all: 'Tout' }[r]}</button>`).join('')}</div></div>
    ${MEAS.map(m => `<div class="card" style="margin-top:10px"><b>${m.label}</b> <span class="muted">(${m.unit})</span><div id="bc-${m.k}" style="margin-top:6px"></div></div>`).join('')}
    <h2>Toutes les mesures</h2>
    <div class="card" style="padding:6px 10px"><table><thead><tr><th>Date</th>${MEAS.map(m => `<th class="r">${m.label.split(' ').pop()}</th>`).join('')}<th></th></tr></thead><tbody>
    ${b.slice().reverse().map(x => `<tr data-id="${x.id}"><td>${fdate(x.date)}</td>${MEAS.map(m => `<td class="r">${x[m.k] != null ? fmt(x[m.k]) : '<span class="muted">·</span>'}</td>`).join('')}<td class="r"><button class="mini-btn" data-edit style="width:28px;height:28px">${ICON.dots}</button></td></tr>`).join('')}
    </tbody></table></div>`;
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
function renderHist(v) {
  const ss = S().sessions;
  const sc = new Map(C.sessionScores().map(x => [x.session.id, x]));
  const md = S().settings.breakDays;
  const list = ss.slice().reverse().slice(0, ui.histLimit);
  let html = `<h1>Historique</h1><p class="sub">${ss.length} séances. Appuie sur une séance pour la corriger.</p>`;
  const lastS = ss.at(-1);
  if (lastS && daysBetween(lastS.date, today()) >= md) html += `<div class="break-sep">Pause en cours · ${C.fmtDuration(daysBetween(lastS.date, today()))}</div>`;
  list.forEach((s, i) => {
    const x = sc.get(s.id);
    const names = s.entries.map(en => { const e = getEx(en.ex); return e ? `${e.name} ${C.fmtEntry(e, { sets: en.sets.slice(0, 2) })}` : ''; }).filter(Boolean).join(' · ');
    html += `<button class="hist-item" data-id="${s.id}"><div class="row"><span class="d grow">${fdate(s.date)}${s.approx ? ' <span class="muted" title="date estimée">≈</span>' : ''}${s.dur ? ` <span class="muted">· ⏱ ${fmtMin(s.dur)}</span>` : ''}</span>${x ? `<span class="pts ${x.pts > 2 ? 'up' : x.pts < 0 ? 'down' : ''}">${x.pts > 0 ? '+' : ''}${x.pts} pts</span>` : ''}</div><div class="s">${esc(names)}</div>${s.note ? `<div class="s" style="color:var(--muted)">📝 ${esc(s.note)}</div>` : ''}</button>`;
    const prev = list[i + 1];
    if (prev) { const g = daysBetween(prev.date, s.date); if (g >= md) html += `<div class="break-sep">Pause · ${C.fmtDuration(g)}</div>`; }
  });
  if (ss.length > ui.histLimit) html += `<button class="btn block" id="h-more">Afficher plus</button>`;
  v.innerHTML = html;
  $$('.hist-item', v).forEach(b => b.onclick = () => editSession(ss.find(s => s.id === b.dataset.id)));
  const m = $('#h-more', v); if (m) m.onclick = () => { ui.histLimit += 100; render(); };
}

function editSession(s) {
  const d = { id: s.id, date: s.date, note: s.note, entries: s.entries.map(en => ({ ex: en.ex, sets: en.sets.map(x => ({ ...x, done: true })) })) };
  const sh = sheet(`<div class="sheet-head"><button class="icon-btn" data-close>${ICON.back}</button><h2>Séance du ${fdate(s.date)}</h2></div>
    ${s.entries.some(en => en.raw) ? `<p class="sub">Importé du tableur. Valeurs d'origine conservées : ${esc(s.entries.map(en => en.raw).filter(Boolean).join(' · ').slice(0, 300))}</p>` : ''}
    <div class="grid3"><div class="field"><label>Date</label><input type="date" id="es-date" value="${s.date}"></div><div class="field"><label>Début</label><input type="time" id="es-start" value="${s.start || ''}"></div><div class="field"><label>Fin</label><input type="time" id="es-end" value="${s.end || ''}"></div></div>
    <div id="es-ed"></div>
    <button class="btn sm" id="es-add" style="margin-bottom:12px">+ Exercice</button>
    <div class="field"><label>Notes</label><textarea id="es-note" rows="2">${esc(s.note || '')}</textarea></div>
    <div class="grid2"><button class="btn danger" id="es-del">Supprimer</button><button class="btn primary" id="es-save">Enregistrer</button></div>`, { full: true });
  sessionEditor($('#es-ed', sh), d, () => { });
  $('#es-add', sh).onclick = () => pickExercise(id => { d.entries.push({ ex: id, sets: [{}, {}, {}] }); sessionEditor($('#es-ed', sh), d, () => { }); });
  $('#es-save', sh).onclick = () => {
    s.date = $('#es-date', sh).value || s.date; s.note = $('#es-note', sh).value;
    const st0 = $('#es-start', sh).value, en0 = $('#es-end', sh).value;
    if (st0 && en0) { const toM = t => +t.slice(0, 2) * 60 + +t.slice(3, 5); Object.assign(s, { start: st0, end: en0, dur: (toM(en0) - toM(st0) + 1440) % 1440 }); } else { delete s.start; delete s.end; delete s.dur; }
    const raws = new Map(s.entries.map(en => [en.ex, en.raw]));
    s.entries = cleanEntries(d).map(en => ({ ...en, raw: raws.get(en.ex) }));
    if (!s.entries.length) S().sessions = S().sessions.filter(x => x !== s);
    S()._rev = (S()._rev || 0) + 1; C.invalidate(); commit(); sh.close(); render(); toast('Séance mise à jour');
  };
  $('#es-del', sh).onclick = async () => { if (await confirmBox('Supprimer cette séance ?', 'Supprimer', true)) { S().sessions = S().sessions.filter(x => x !== s); S()._rev = (S()._rev || 0) + 1; C.invalidate(); commit(); sh.close(); render(); } };
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
    ${illuHTML(e, 'hero')}${e.cue ? `<p class="cue" style="margin-top:10px">${esc(e.cue)}</p>` : ''}
    <button class="btn block" id="si-change" style="margin-top:12px">Changer l'illustration…</button>`);
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
let resizeT; addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => { if (!$('#sheet-root').children.length) render(); }, 200); });

// ================================================================ boot
store.init().then(() => { S()._rev = S()._rev || 0; render(); $('#sync-ind').className = 'sync-dot s-' + sync.status.state; pullAndRender(); setTimeout(() => checkUpdate(false), 1500); });

