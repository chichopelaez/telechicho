const CACHE_NAME = "iptv-player-cache-v1.1"; // Incrementa la versión para forzar la actualización
// Lista de archivos para cachear
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
  "https://cdn.jsdelivr.net/npm/hls.js@latest", // Asegúrate de que sea la URL exacta que usas en tu HTML
  "/images/icon-192x192.png", // Asegúrate de tener estos íconos
  "/images/icon-512x512.png", // Asegúrate de tener estos íconos
  // Puedes añadir tu favicon aquí también
  "/images/favicon.png",
];

// Evento 'install': se dispara cuando el SW se instala
self.addEventListener("install", (event) => {
  console.log("Service Worker: Instalando...");
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("Service Worker: Cache abierto, agregando URLs.");
        // Agrega todos los archivos a la caché
        return cache.addAll(urlsToCache);
      })
      .catch((error) => {
        console.error(
          "Service Worker: Fallo al cachear URLs durante la instalación:",
          error
        );
      })
  );
  self.skipWaiting(); // Activa el nuevo Service Worker inmediatamente
});

// Evento 'activate': se dispara cuando el SW se activa (puede usarse para limpiar cachés viejos)
self.addEventListener("activate", (event) => {
  console.log("Service Worker: Activando...");
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log("Service Worker: Eliminando caché antiguo:", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim(); // Toma el control de las páginas existentes
});

// Evento 'fetch': intercepta las peticiones de red
self.addEventListener("fetch", (event) => {
  // Ignora las solicitudes de Chrome Extensions, Live Reload, etc., y si no es un GET
  if (
    event.request.url.startsWith("chrome-extension://") ||
    event.request.url.includes("hot-update.js") ||
    event.request.method !== "GET"
  ) {
    return;
  }

  // NO caches las URLs de Xtream UI o M3U remotas para que siempre obtengan la última versión
  // Puedes ajustar las condiciones `includes` según tus necesidades
  // Estas URLs no deben ser interceptadas por el caché para asegurar que el contenido esté siempre actualizado.
  const dynamicContentUrls = [
    "/get.php?", // Para Xtream UI
    ".m3u", // Para archivos .m3u (puede ser local o remoto, pero mejor no cachear si son grandes o dinámicos)
    ".m3u8", // Para streams HLS (estos son chunks, no el manifiesto principal)
    // Agrega aquí cualquier otra URL que deba ir siempre a la red
  ];

  const shouldBypassCache = dynamicContentUrls.some((pattern) =>
    event.request.url.includes(pattern)
  );

  if (shouldBypassCache) {
    // Va directamente a la red y no cachea la respuesta
    event.respondWith(
      fetch(event.request).catch((error) => {
        console.error(
          "Service Worker: Falló la petición de contenido dinámico:",
          event.request.url,
          error
        );
        // Opcional: podrías devolver una respuesta de fallback aquí si lo deseas para URLs fallidas
        return new Response(
          "Contenido no disponible sin conexión para este stream/playlist.",
          {
            status: 503,
            statusText: "Service Unavailable (Offline)",
          }
        );
      })
    );
    return;
  }

  // Para el resto de recursos (tus archivos estáticos), usa la estrategia cache-first, luego network
  event.respondWith(
    caches.match(event.request).then((response) => {
      return (
        response ||
        fetch(event.request)
          .then((fetchResponse) => {
            // Asegúrate de que la respuesta sea válida (código 200, tipo 'basic' para evitar errores de CORS con recursos de terceros)
            if (
              !fetchResponse ||
              fetchResponse.status !== 200 ||
              fetchResponse.type !== "basic"
            ) {
              return fetchResponse;
            }

            // Cachea la respuesta
            const responseToCache = fetchResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
            return fetchResponse;
          })
          .catch((error) => {
            console.error(
              "Service Worker: Falló la obtención de recursos estáticos:",
              event.request.url,
              error
            );
            // Si hay un error de red y el recurso no está en caché, podrías devolver una página offline o un mensaje
            // return caches.match('/offline.html'); // Requiere crear un offline.html y añadirlo a urlsToCache
            // Para este proyecto, simplemente fallará si no está en caché y no hay red.
          })
      );
    })
  );
});
