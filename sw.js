// Service worker: l'app si apre anche senza rete (il diario si invia appena torna).
const CACHE = "fisiolog-v1";
const SHELL = ["/", "/index.html", "/styles.css", "/app.js", "/config.js", "/manifest.webmanifest",
  "/logo.svg", "/logo-animated.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/apple-touch-icon.png", "/icons/favicon-32.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  // Supabase (dati, accesso, video) non passa mai dalla cache
  if (req.method !== "GET" || url.host.endsWith(".supabase.co") || url.host.endsWith(".supabase.in")) return;
  if (url.origin !== location.origin && !url.host.includes("fonts.g")) return;
  // rete prima, cache come riserva: online vedi sempre l'ultima versione
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req).then(r => r || (req.mode === "navigate" ? caches.match("/index.html") : undefined)))
  );
});
