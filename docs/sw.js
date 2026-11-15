// AirLift service worker — met à jour l'app automatiquement à chaque nouvelle version publiée.
const VERSION = '1.0.0';
const CACHE = 'airlift-' + VERSION;
const ASSETS = ['./', 'index.html', 'app.css?v=' + VERSION, 'js/app.js?v=' + VERSION, 'js/store.js', 'js/calc.js', 'js/charts.js', 'js/program.js', 'vendor/Sortable.min.js', 'manifest.webmanifest', 'icon.svg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.endsWith('version.json') || url.pathname.endsWith('android.json') || url.pathname.endsWith('seed.json')) return; // toujours réseau
  // réseau d'abord pour la page (mise à jour immédiate), cache en secours (hors ligne)
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put('index.html', c)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(r => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then(k => k.put(e.request, c)); } return r; })));
});
