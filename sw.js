// Keeps the app working offline. Google Maps requests always go to the network.
const VERSION = 'whichcard-v2';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'manifest.webmanifest',
  'js/app.js',
  'js/engine.js',
  'js/cards.js',
  'js/rotating.js',
  'js/categories.js',
  'js/places.js',
  'js/store.js',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;
  if (url.hostname.endsWith('googleapis.com') && !url.hostname.startsWith('fonts.')) return;

  // Fonts: cache after first load.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(VERSION).then(async cache => {
        const hit = await cache.match(event.request);
        if (hit) return hit;
        const res = await fetch(event.request);
        if (res.ok || res.type === 'opaque') cache.put(event.request, res.clone());
        return res;
      }),
    );
    return;
  }

  // App files: use the network when online so updates show up, fall back to the cache offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) caches.open(VERSION).then(cache => cache.put(event.request, res.clone()));
          return res;
        })
        .catch(() => caches.match(event.request, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))),
    );
  }
});
