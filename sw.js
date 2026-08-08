/* sw.js — cache-first app shell + data, with clean updates.
   Bump VERSION on every deploy: old caches are purged on activate,
   and the page shows an update prompt driven by SKIP_WAITING. */

const VERSION = 'v1';
const CACHE = `healthos-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/tokens.css',
  './css/app.css',
  './js/app.js',
  './js/store.js',
  './js/data.js',
  './js/day.js',
  './js/share.js',
  './js/notify.js',
  './js/views/today.js',
  './js/views/food.js',
  './js/views/train.js',
  './js/views/care.js',
  './js/views/me.js',
  './data/plan.json',
  './data/menu.json',
  './data/groceries.json',
  './data/workouts.json',
  './data/products.json',
  './data/supplements.json',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});

/* Cache-first for same-origin GET; network fallback updates the cache.
   External links (YouTube, shops) pass through untouched. */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: url.pathname.endsWith('.html') }).then(hit =>
      hit ??
      fetch(e.request).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      })
    )
  );
});
