const CACHE = 'meanwhile-shell-v3';
const ASSETS = ['./', './index.html', './styles.css', './questions.js', './app.js', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('meanwhile-shell-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).then(response => { if(response.ok) { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(new URL('./index.html', self.registration.scope),copy)); } return response; }).catch(() => caches.match(new URL('./index.html', './styles.css', './questions.js', './app.js', self.registration.scope))));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});
