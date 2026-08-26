/* Mis Finanzas — service worker
   App-shell cacheado para que la app abra sin red.
   - Documento (navegación): network-first con fallback al cache (así una fase
     nueva se ve apenas se publica, pero offline sigue abriendo).
   - Estáticos propios y fuentes: cache-first.
   - Llamadas al Apps Script: no se interceptan (son POST y siempre van a la red).
*/
const CACHE = "mis-finanzas-v1";

const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;                    // POST al Apps Script: directo a la red

  const url = new URL(req.url);

  // Documento: network-first
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html").then(r => r || caches.match("./")))
    );
    return;
  }

  const esFuente = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const esPropio = url.origin === location.origin;
  if (!esFuente && !esPropio) return;                  // APIs de cotización: siempre red

  // Estáticos y fuentes: cache-first
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy));
      }
      return res;
    }).catch(() => hit || new Response("", {status:504, statusText:"Sin conexión"})))
  );
});
