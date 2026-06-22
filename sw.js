/* MUSCLE FORGE — Service Worker
   Offline-capable PWA shell.
   Bump CACHE on every release so clients pick up new assets. */
const CACHE = "muscle-forge-v1.1.0";

/* App shell (same-origin) precached on install */
const PRECACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

/* CDN dependencies — cached at runtime (cache-first) so the app works offline
   after the first online load. */
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Navigations: network-first, fall back to cached index.html (offline).
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).catch(() => caches.match("./index.html").then((r) => r || caches.match("./")))
    );
    return;
  }

  // Everything else (local assets + CDN): cache-first, then network and store.
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache successful same-origin and CDN responses (incl. opaque cross-origin).
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
    })
  );
});
