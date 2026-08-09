/* sw.js — cache-first app shell + data, with clean updates.
   Bump VERSION on every deploy: old caches are purged on activate,
   and the page shows an update prompt driven by SKIP_WAITING. */

const VERSION = 'v2';
const CACHE = `healthos-${VERSION}`;

/* On localhost, shell files go network-first (falling back to cache, so the
   offline test still works). Otherwise every source edit needs a manual VERSION
   bump before the browser will see it — which during a build means editing this
   file dozens of times and, worse, forgetting to. Production is unaffected. */
const DEV = ['localhost', '127.0.0.1'].includes(self.location.hostname);

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

/* Two strategies, on purpose:

   - Shell (html/css/js/icons): cache-first, keyed on VERSION. Instant, and it
     only changes when a deploy bumps VERSION.
   - data/*.json: stale-while-revalidate. Serves the cached copy immediately so
     the app still opens instantly and works offline, but always refetches in the
     background. This is what keeps the promise that editing a price in the
     GitHub web UI actually reaches the phone — cache-first would freeze the data
     until someone remembered to bump VERSION in this file, which nobody will.

   External links (YouTube, shops) pass through untouched. */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  const isData = url.pathname.includes('/data/') && url.pathname.endsWith('.json');

  if (isData) {
    e.respondWith(
      caches.open(CACHE).then(async cache => {
        const hit = await cache.match(e.request);
        const net = fetch(e.request)
          .then(res => { if (res.ok) cache.put(e.request, res.clone()); return res; })
          .catch(() => null);
        return hit ?? (await net) ?? Response.error();
      })
    );
    return;
  }

  if (DEV) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
          return res;
        })
        .catch(() => caches.match(e.request).then(hit => hit ?? Response.error()))
    );
    return;
  }

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
