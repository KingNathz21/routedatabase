const CACHE_NAME = "routeflow-app-v5";
const APP_SHELL = [
  "./","./index.html","./routes.html","./arrivals.html","./disruptions.html","./journey-planner.html","./operators.html","./fleet.html",
  "./styles.css","./design-system.css","./directory.css","./routeflow-redesign.css","./brand.css","./nav.css",
  "./filters.css","./route-layout.css","./route-gallery.css","./route-app.css","./live.css",
  "./arrivals-pro.css","./home.css","./site.js","./nav-performance.js","./config.js",
  "./app.js","./routes.js","./arrivals.js","./disruptions.js","./journey-planner.js","./operators.js","./fleet.js","./app-shell.js","./route-data-overrides.js",
  "./route-layout.js","./route-gallery.js","./route-app.js","./IMG_3442.png","./manifest.webmanifest"
];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("routeflow-app-") && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin)return;
  if(url.pathname.includes("/data/routes.json")){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}return response;}).catch(()=>caches.match(request)));
    return;
  }
  if(request.mode==="navigate"){
    event.respondWith(fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}return response;}).catch(()=>caches.match(request).then(cached=>cached||caches.match("./index.html"))));
    return;
  }
  event.respondWith(caches.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok){const copy=response.clone();caches.open(CACHE_NAME).then(cache=>cache.put(request,copy));}return response;})));
});