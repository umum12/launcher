// Service worker HUB FS (FAST HUB). Network-first (selalu cek versi terbaru), cache sebagai cadangan offline.
// Isolasi: nama cache berawalan unik, hanya menghapus cache miliknya sendiri,
// dan hanya menangani request di dalam scope folder ini (aman untuk project GitHub Pages lain
// yang berbagi origin username.github.io). Request ke Apps Script tidak disentuh.
const PREFIX = 'hubfs-fasthub-';
const CACHE = PREFIX + 'v4';
const LEGACY_PREFIX = 'fs-launcher-'; // cache versi lama project ini
const SCOPE_PATH = new URL(self.registration.scope).pathname;
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

  // Halaman utama (./, ./?source=pwa, ./?open=X) disimpan sebagai satu entri agar cache tidak membengkak
  const u = new URL(req.url);
  const isHome = req.mode === 'navigate' && (u.pathname === SCOPE_PATH || u.pathname === SCOPE_PATH + 'index.html');
  const key = isHome ? new Request(self.registration.scope + 'index.html') : req;

  e.respondWith(
    // no-cache: selalu validasi ke server, tidak terjebak cache HTTP GitHub Pages (~10 menit)
    fetch(req, { cache: 'no-cache' })
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(key, copy));
        }
        return res;
      })
      .catch(() => caches.match(key).then((r) => r || caches.match('./index.html')))
  );
});
