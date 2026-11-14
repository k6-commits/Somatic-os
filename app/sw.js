// Offline support. All app files are cached on install; records never pass through here
// (they live in localStorage). Requests go to the network first, so a new version arrives
// on the next launch; the cache is only the offline fallback. VERSION names the cache.

const VERSION = 'somatic-os-0.2.0';
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
  './js/calendar.js',
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
  './reminders/checkin-0600.ics',
  './reminders/checkin-0630.ics',
  './reminders/checkin-0700.ics',
  './reminders/checkin-0730.ics',
  './reminders/checkin-0800.ics',
  './reminders/checkin-0830.ics',
  './reminders/checkin-0900.ics',
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

  // The app's pages share one cached shell. Anything else, including a navigation to a file
  // such as a reminder (.ics), is cached under its own URL, so it can never replace the shell.
  const shell = req.mode === 'navigate' && (url.pathname.endsWith('/') || url.pathname.endsWith('/index.html'));
  const key = shell ? './index.html' : req;
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
