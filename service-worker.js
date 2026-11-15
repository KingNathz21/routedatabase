const CACHE_NAME = "routeflow-app-v10";
const APP_SHELL = [
  "./", "./index.html", "./routes.html", "./arrivals.html", "./disruptions.html",
  "./journey-planner.html", "./operators.html", "./fleet.html", "./login.html",
  "./dashboard.html", "./profile.html", "./settings.html", "./blog.html", "./offline.html",
  "./styles.css", "./design-system.css", "./directory.css", "./account.css",
  "./routeflow-redesign.css", "./brand.css", "./nav.css", "./filters.css",
  "./route-layout.css", "./route-gallery.css", "./route-app.css", "./live.css",
  "./arrivals-pro.css", "./home.css", "./blog.css", "./app-shell.js", "./site.js",
  "./nav-performance.js", "./config.js", "./auth.js", "./login-page.js",
  "./dashboard.js", "./profile.js", "./settings.js", "./app.js", "./routes.js",
  "./arrivals.js", "./disruptions.js", "./journey-planner.js", "./operators.js",
  "./fleet.js", "./route-data-overrides.js", "./database-api.js", "./route-layout.js",
  "./route-gallery.js", "./route-app.js", "./home-dashboard.js",
  "./IMG_3442.png", "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL.map(path => new Request(path, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith("routeflow-app-") && key !== CACHE_NAME)
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.endsWith("/firebase-config.js")) {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(() => caches.match(request)));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    }).catch(async () => (await caches.match(request)) || (await caches.match("./offline.html")) || (await caches.match("./index.html"))));
    return;
  }

  event.respondWith(caches.match(request).then(cached => {
    const network = fetch(request).then(response => {
      if (response.ok) caches.open(CACHE_NAME).then(cache => cache.put(request, response.clone()));
      return response;
    });
    return cached || network;
  }));
});
