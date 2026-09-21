self.addEventListener("install", (e) => {
  e.waitUntil(caches.open("nexgram-v1").then((c) => c.addAll([
    "./", "./index.html", "./styles.css", "./app.js", "./ngp.js", "./crypto-live.js", "./manifest.json"
  ]).catch(() => {})));
});
self.addEventListener("fetch", (e) => {
  if (e.request.url.includes("/ws")) return;
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
