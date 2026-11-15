const CACHE_NAME = "routeflow-app-v12";
const IMAGE_CACHE_NAME = "routeflow-route-photos-v1";
const IMAGE_HOSTS = new Set(["upload.wikimedia.org", "thumb.wikimedia.org", "commons.wikimedia.org", "static.wikia.nocookie.net"]);
const APP_SHELL = [
  "./", "./index.html", "./routes.html", "./data/routes.json", "./arrivals.html", "./disruptions.html",
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
  "./route-gallery.js", "./route-app.js", "./home-dashboard.js", "./firebase-config.js",
  "./IMG_3442.png", "./manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        // One missing optional asset must not prevent the entire offline shell installing.
        const results = await Promise.allSettled(APP_SHELL.map(path =>
          cache.add(new Request(path, { cache: "reload" }))
        ));
        const failed = results.filter(result => result.status === "rejected").length;
        if (failed) console.warn("RouteFlow: some optional offline assets could not be cached:", failed);
      })
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
  // Cache only the Wikimedia-hosted route photography that a visitor has actually opened.
  if (request.destination === "image" && IMAGE_HOSTS.has(url.hostname)) {
    event.respondWith((async () => {
      const cache = await caches.open(IMAGE_CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok || response.type === "opaque") {
          try {
            await cache.put(request, response.clone());
            const keys = await cache.keys();
            if (keys.length > 80) await cache.delete(keys[0]);
          } catch (error) {
            console.warn("RouteFlow photo cache is full:", error);
          }
        }
        return response;
      } catch (error) {
        return (await cache.match(request)) || Response.error();
      }
    })());
    return;
  }
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
    }).catch(async () => (await caches.match(request, { ignoreSearch: true })) || (await caches.match("./offline.html")) || (await caches.match("./index.html"))));
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
