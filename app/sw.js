// Offline support. All app files are cached on install; records never pass through here
// (they live in localStorage). Requests go to the network first, so a new version arrives
// on the next launch; the cache is only the offline fallback. VERSION names the cache.

const VERSION = 'somatic-os-0.1.0';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './icons/favicon.svg',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './js/main.js',
  './js/content.js',
  './js/dates.js',
  './js/stats.js',
  './js/store.js',
  './js/ui.js',
  './js/vendor/preact-htm.js',
  './js/screens/checkin.js',
  './js/screens/consult.js',
  './js/screens/home.js',
  './js/screens/night.js',
  './js/screens/pause.js',
  './js/screens/records.js',
  './js/screens/review.js',
  './js/screens/settings.js',
  './js/screens/start.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages share one cached shell; everything else is cached under its own URL.
  const key = req.mode === 'navigate' ? './index.html' : req;
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((cache) => cache.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key).then((hit) => hit || Response.error())),
  );
});
