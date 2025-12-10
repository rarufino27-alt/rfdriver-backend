const CACHE_NAME = "rfdriver-cache-v1";

const ASSETS_TO_CACHE = [
  "./",
  "./instalar-app.html",
  "./index.html",
  "./dashboard.html",
  "./calculadora.html",
  "./entradas.html",
  "./perfil.html",
  "./login.html",
  "./cadastro.html"
];


self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request).catch(() => {
          return cached;
        })
      );
    })
  );
});
