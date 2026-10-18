/* =========================================================
   SERVICE WORKER - J2
   Permite que la app funcione offline y se instale como PWA
   Versión: 8.0.0
========================================================= */

const CACHE_NAME = "j2-v8.0-cache-v1";

const ASSETS_TO_CACHE = [
    "./",
    "./index.html",
    "./styles.css",
    "./app.js",
    "./crypto-utils.js",
    "./licencia.js",
    "./noble-ed25519.js",
    "./manifest.json",
    "./logo.png",
    "./sakura-logo.png",
    "https://cdn.jsdelivr.net/npm/chart.js",
    "https://unpkg.com/html5-qrcode"
];

// Instalación: cachea todos los recursos
self.addEventListener("install", (event) => {
    console.log("🔄 Service Worker instalando...");
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("📦 Cacheando archivos...");
            return cache.addAll(ASSETS_TO_CACHE).catch(err => {
                console.log("⚠️ No se pudo cachear todo:", err);
            });
        }).then(() => self.skipWaiting())
    );
});

// Activación: limpia cachés viejas
self.addEventListener("activate", (event) => {
    console.log("✅ Service Worker activado");
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log("🗑️ Eliminando caché vieja:", cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: estrategia "Cache First, fallback Network"
self.addEventListener("fetch", (event) => {
    // Ignorar peticiones de actualización (siempre en vivo)
    if (event.request.url.includes("version.json")) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(event.request).then((networkResponse) => {
                // Cachear nuevos recursos que se soliciten
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Si falla todo, devolver el index para que la app siga funcionando
                if (event.request.mode === "navigate") {
                    return caches.match("./index.html");
                }
            });
        })
    );
});

// Mensaje desde la app para forzar actualización
self.addEventListener("message", (event) => {
    if (event.data === "skipWaiting") {
        self.skipWaiting();
    }
});