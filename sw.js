// sw.js — SEFI service worker with cache-busting
const CACHE = "sefi-v4";
const ASSETS = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting(); // BUG 6 FIX: activate immediately on deploy
});

self.addEventListener("activate", e => {
  // BUG 6 FIX: delete ALL old caches on activate
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  // Never cache API calls or function routes
  if (e.request.url.includes("/api/")) return;

  // BUG 6 FIX: network-first for HTML, cache-first for assets
  if (e.request.url.endsWith(".html") || e.request.url.endsWith("/")) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
  } else {
    e.respondWith(
      caches.match(e.request).then(cached => cached || fetch(e.request))
    );
  }
});
