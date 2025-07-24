const CACHE_NAME = 'plan-estudios-v33';
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './pi.png',
  './confetti.js'
];

// Instala el Service Worker y guarda archivos en caché
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Manejar mensaje skipWaiting para forzar activación
self.addEventListener('message', event => {
  if (event.data && event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Activa el SW y elimina viejos caches si hay
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
});

// Intercepta requests con estrategia diferente para archivos críticos
self.addEventListener('fetch', event => {
  const url = event.request.url;
  
  // Para HTML, CSS y JS: NETWORK FIRST (siempre intenta la red primero)
  if (url.includes('.html') || url.includes('.css') || url.includes('.js') || url.endsWith('/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Si la red funciona, actualiza el cache y devuelve la respuesta
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Solo si la red falla, usar cache como fallback
          return caches.match(event.request);
        })
    );
  } else {
    // Para otros archivos (imágenes, etc.): CACHE FIRST
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});
