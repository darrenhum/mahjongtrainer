const CACHE_PREFIX = 'mahjong-path-';
// Bump this version whenever the offline application files change.
const CACHE_NAME = `${CACHE_PREFIX}v1`;
const ASSETS = ['./', './index.html', './styles.css', './app.js', './content.js', './progress.js', './manifest.webmanifest', './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png'];
const assetURLs = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match('./index.html')).then(response => response || fetch(event.request)).catch(() => fetch(event.request)));
  } else if (assetURLs.has(url.href)) {
    event.respondWith(caches.open(CACHE_NAME).then(cache => cache.match(event.request)).then(response => response || fetch(event.request)).catch(() => fetch(event.request)));
  }
});
