/* Service worker del Planificador Académico.
   Guarda la app en el dispositivo para que abra sin internet.
   VERSION la reescribe construir_app.py en cada compilación: al cambiar, el
   navegador descarta la caché vieja y todos reciben la versión nueva. */
const VERSION = "2026.20260731.eba8a254";
const CACHE = "planificador-" + VERSION;
const SHELL = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;

  // La app es un solo HTML: se sirve de la red si hay, y de la caché si no.
  // Así una versión nueva se toma al instante estando online, y offline sigue abriendo.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(r => { caches.open(CACHE).then(c => c.put("./index.html", r.clone())); return r; })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  // Resto (íconos, manifiesto, tipografía de Google): caché primero, red de respaldo.
  e.respondWith(
    caches.match(req).then(hit => {
      if (hit) return hit;
      return fetch(req).then(r => {
        if (r.ok && (new URL(req.url).origin === location.origin || r.type === "cors")) {
          caches.open(CACHE).then(c => c.put(req, r.clone()));
        }
        return r;
      }).catch(() => new Response("", { status: 504, statusText: "Sin conexión" }));
    })
  );
});
