// Synchronisation en ligne vers un dépôt GitHub PRIVÉ (ex. Str9ke/airlift-data, fichier airlift.json).
// Chaque modification est envoyée quelques secondes après (ou dès que le réseau revient).
// La clé d'accès reste sur le téléphone (localStorage) et n'est jamais incluse dans les données.
const CFG_KEY = 'airlift.sync';
const API = 'https://api.github.com';
const listeners = new Set();

let cfg = load();
let timer = null;
let busy = false;
let again = null;
export const status = { state: cfg.token ? 'idle' : 'off', at: cfg.lastPush || null, msg: '' };

function load() { try { return JSON.parse(localStorage.getItem(CFG_KEY) || '{}'); } catch (e) { return {}; } }
function save() { try { localStorage.setItem(CFG_KEY, JSON.stringify(cfg)); } catch (e) { /* */ } }
function set(st, msg = '') { status.state = st; status.msg = msg; listeners.forEach(fn => fn(status)); }

export const onStatus = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export const config = () => ({ repo: cfg.repo || '', path: cfg.path || 'airlift.json', hasToken: !!cfg.token });
export const enabled = () => !!(cfg.token && cfg.repo);

export function configure({ token, repo, path }) {
  if (token !== undefined) cfg.token = token.trim();
  if (repo !== undefined) cfg.repo = repo.trim().replace(/^https:\/\/github.com\//, '').replace(/\/$/, '');
  if (path !== undefined) cfg.path = path.trim() || 'airlift.json';
  delete cfg.sha;
  save();
  set(enabled() ? 'idle' : 'off');
}
export function disconnect() { cfg = {}; save(); set('off'); }

function b64enc(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64dec(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

async function gh(method, url, body) {
  const r = await fetch(API + url, {
    method, cache: 'no-store',
    headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 404) return null;
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const err = new Error(r.status === 401 ? 'clé d\'accès refusée' : r.status === 403 ? 'accès interdit (droits « Contents : Read and write » ?)' : `GitHub ${r.status}`);
    err.status = r.status; err.body = t;
    throw err;
  }
  return r.status === 204 ? {} : r.json();
}
const fileUrl = () => `/repos/${cfg.repo}/contents/${encodeURIComponent(cfg.path || 'airlift.json')}`;

async function remoteSha() { const m = await gh('GET', fileUrl()); return m ? m.sha : null; }

/** Lit la sauvegarde en ligne. Retourne l'objet, ou null s'il n'y en a pas / hors ligne. */
export async function pull() {
  if (!enabled()) return null;
  try {
    set('busy', 'lecture');
    const meta = await gh('GET', fileUrl());
    if (!meta) { set('idle', 'aucune sauvegarde en ligne'); return null; }
    cfg.sha = meta.sha; save();
    const content = meta.content && meta.encoding === 'base64' ? meta.content : (await gh('GET', `/repos/${cfg.repo}/git/blobs/${meta.sha}`)).content;
    const obj = JSON.parse(b64dec(content));
    set('ok');
    return obj;
  } catch (e) {
    set(navigator.onLine === false ? 'offline' : 'error', e.message);
    return null;
  }
}

async function push(txt) {
  if (busy) { again = txt; return; }
  busy = true;
  try {
    set('busy', 'envoi');
    const body = { message: 'AirLift · ' + new Date().toLocaleString('fr-FR'), content: b64enc(txt) };
    if (cfg.sha === undefined) cfg.sha = await remoteSha();
    if (cfg.sha) body.sha = cfg.sha;
    let r;
    try { r = await gh('PUT', fileUrl(), body); } catch (e) {
      if (e.status !== 409 && e.status !== 422) throw e;
      body.sha = await remoteSha(); // modifié ailleurs entre-temps : la version du téléphone, plus récente, l'emporte
      if (!body.sha) delete body.sha;
      r = await gh('PUT', fileUrl(), body);
    }
    if (r === null) throw new Error('dépôt introuvable : ' + cfg.repo);
    cfg.sha = r.content.sha; cfg.lastPush = Date.now(); save();
    status.at = cfg.lastPush;
    set('ok');
  } catch (e) {
    set(navigator.onLine === false ? 'offline' : 'error', e.message);
    pending = txt;
  } finally {
    busy = false;
    if (again) { const t = again; again = null; push(t); }
  }
}

let pending = null;
/** Programme un envoi (regroupe les modifications rapprochées). */
export function schedule(getTxt, delay = 2500) {
  if (!enabled()) return;
  set('pending');
  clearTimeout(timer);
  timer = setTimeout(() => { timer = null; push(getTxt()); }, delay);
}
export function flush(getTxt) {
  if (!enabled()) return;
  if (timer || pending || status.state === 'pending') { clearTimeout(timer); timer = null; pending = null; push(getTxt()); }
}
export const retry = getTxt => { if (enabled() && (pending || status.state === 'error' || status.state === 'offline')) { pending = null; push(getTxt()); } };

/** Vérifie la configuration : accès au dépôt. */
export async function test() {
  const r = await gh('GET', `/repos/${cfg.repo}`);
  if (!r) throw new Error('dépôt introuvable (nom exact ? droits de la clé ?)');
  return r;
}
