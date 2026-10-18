// Service worker HUB FS (FAST HUB). Network-first, cache sebagai cadangan offline.
// Isolasi: nama cache berawalan unik, hanya menghapus cache miliknya sendiri,
// dan hanya menangani request di dalam scope folder ini (aman untuk project GitHub Pages lain
// yang berbagi origin username.github.io). Request ke Apps Script tidak disentuh.
const PREFIX = 'hubfs-fasthub-';
const CACHE = PREFIX + 'v3';
const LEGACY_PREFIX = 'fs-launcher-'; // cache versi lama project ini
const SHELL = [
  './', './index.html', './config.js', './about.txt', './manifest.webmanifest',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  // add satu-satu: kalau ada file yang belum ter-upload, service worker tetap terpasang
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((k) => (k.startsWith(PREFIX) && k !== CACHE) || k.startsWith(LEGACY_PREFIX))
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  if (!req.url.startsWith(self.registration.scope)) return; // hanya file di folder project ini

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});
