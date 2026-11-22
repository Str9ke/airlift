// AirLift service worker.
// - Réseau d'abord pour tout le code : en ligne, tu as TOUJOURS la dernière version publiée.
// - Cache en secours : hors ligne, l'app fonctionne avec la dernière version téléchargée.
// - Photos d'exercices du catalogue : cache d'abord (elles ne changent jamais).
const VERSION = '1.20.0';
const CACHE = 'airlift-' + VERSION;
const IMG_CACHE = 'airlift-img';
const ASSETS = ['./', 'index.html', 'app.css?v=' + VERSION, 'js/app.js?v=' + VERSION, 'js/store.js', 'js/calc.js', 'js/charts.js', 'js/program.js', 'js/media.js', 'js/sync.js', 'js/muscles.js', 'js/gear.js',
  'vendor/Sortable.min.js', 'manifest.webmanifest', 'icon.svg', 'data/catalog.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== IMG_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req, key) {
  const k = key || req, opts = { ignoreSearch: !key };
  const net = fetch(req, { cache: 'no-cache' }).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(x => x.put(k, c)); } return r; });
  // réseau lent (> 5 s) ou absent : on sert la dernière version en cache
  const first = await Promise.race([net.catch(() => null), new Promise(res => setTimeout(() => res('slow'), 5000))]);
  if (first && first !== 'slow') return first;
  const hit = await caches.match(k, opts);
  return hit || net;
}

function cacheFirst(req, cacheName) {
  return caches.open(cacheName).then(c => c.match(req).then(hit => hit || fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; })));
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'raw.githubusercontent.com' && url.pathname.includes('/free-exercise-db/')) { e.respondWith(cacheFirst(req, IMG_CACHE)); return; }
  if (url.origin !== location.origin) return; // API GitHub (sauvegarde) : jamais en cache
  if (/(version|android)\.json$|seed\.json$/.test(url.pathname)) return; // toujours réseau
  if (url.pathname.includes('/img/ex/')) { e.respondWith(cacheFirst(req, IMG_CACHE)); return; }
  if (req.mode === 'navigate') { e.respondWith(networkFirst(req, 'index.html')); return; }
  e.respondWith(networkFirst(req));
});
