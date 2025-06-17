const CACHE_NAME = 'iptv-player-cache-v2';
const DYNAMIC_CACHE_NAME = 'iptv-dynamic-cache-v1';
const OFFLINE_PAGE = '/offline.html';

const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  OFFLINE_PAGE,
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/hls.js@latest',
  '/images/icon-192x192.png',
  '/images/icon-512x512.png',
  '/images/favicon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache abierto, agregando URLs.');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME && cache !== DYNAMIC_CACHE_NAME) {
            console.log('Eliminando caché antiguo:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Excluir URLs de streams y listas M3U
  if (event.request.url.match(/\.(m3u8?|ts|mp4|xml|php)$/i)) {
    return fetch(event.request);
  }

  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request).then(fetchResponse => {
        // Cachear solo recursos importantes
        if (event.request.url.match(/\.(css|js|html|png|jpg|jpeg|gif|svg)$/i)) {
          return caches.open(DYNAMIC_CACHE_NAME).then(cache => {
            cache.put(event.request.url, fetchResponse.clone());
            return fetchResponse;
          });
        }
        return fetchResponse;
      }).catch(() => {
        // Mostrar página offline si está disponible
        return caches.match(OFFLINE_PAGE);
      })
    )
  );
});

self.addEventListener('message', (event) => {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});