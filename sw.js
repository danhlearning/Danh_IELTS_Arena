// Service Worker cho IELTS 9.0 Arena (PWA Network-First Auto-Update tối ưu WebKit & iOS Safari)
const CACHE_NAME = 'danh-hoc-ielts-v3.5';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './data.js',
  './vocab-images.js',
  './sound.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './apple-touch-icon.png',
  './favicon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Clearing old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Chiến lược Network-First: Ép WebKit bỏ qua disk-cache cục bộ để luôn tải dữ liệu mới nhất khi có kết nối
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const isNav = event.request.mode === 'navigate';
  const fetchPromise = isNav 
    ? fetch(event.request) 
    : fetch(event.request.url, { cache: 'no-cache' });

  event.respondWith(
    fetchPromise
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Chỉ dùng bộ nhớ đệm cache khi ngoại tuyến hoàn toàn (offline)
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || caches.match('./index.html');
        });
      })
  );
});
