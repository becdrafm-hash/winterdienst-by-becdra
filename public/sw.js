const CACHE_NAME = 'becdra-fm-shell-v3-care-planning';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(cacheNames => Promise.all(
        cacheNames
          .filter(cacheName => cacheName.startsWith('becdra-fm-shell-') && cacheName !== CACHE_NAME)
          .map(cacheName => caches.delete(cacheName))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            return caches.open(CACHE_NAME)
              .then(cache => cache.put('/index.html', response.clone()))
              .then(() => response);
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match('/index.html');
          if (cachedPage) return cachedPage;
          return new Response('Die App ist offline und wurde noch nicht zwischengespeichert.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        })
    );
    return;
  }

  const isAppAsset = requestUrl.pathname.startsWith('/assets/')
    || /\.(?:css|js|svg|png|webmanifest)$/.test(requestUrl.pathname);
  if (!isAppAsset) return;

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) return cachedResponse;
      return fetch(request).then(response => {
        if (response.ok && response.type === 'basic') {
          return caches.open(CACHE_NAME)
            .then(cache => cache.put(request, response.clone()))
            .then(() => response);
        }
        return response;
      });
    })
  );
});
