(() => {
  const FAVOURITES_KEY = "routeflow:favourite-routes";
  const RECENTS_KEY = "routeflow:recent-routes";
  const THEME_KEY = "routeflow:theme";

  function readList(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.map(String) : [];
    } catch { return []; }
  }

  function writeList(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Storage is optional. */ }
  }

  function routeKey(route) {
    const status = route && Object.prototype.hasOwnProperty.call(route, "Date Withdrawn") ? "withdrawn" : "current";
    return `${status}:${route?.Route || ""}`;
  }

  function findRoute(key) {
    const [status, ...parts] = String(key).split(":");
    const number = parts.join(":");
    return (state.data[status] || []).find(route => String(route.Route) === number) || null;
  }

  function selectRoute(route) {
    if (!route) return;
    state.filter = Object.prototype.hasOwnProperty.call(route, "Date Withdrawn") ? "withdrawn" : "current";
    state.selected = route;
    state.selectedDirection = "outbound";
    document.querySelectorAll(".filter").forEach(button => button.classList.toggle("active", button.dataset.filter === state.filter));
    renderList();
    renderDetail();
    document.getElementById("routeDetail")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateUrl(route) {
    const url = new URL(location.href);
    url.searchParams.set("route", route.Route);
    url.searchParams.set("status", Object.prototype.hasOwnProperty.call(route, "Date Withdrawn") ? "withdrawn" : "current");
    history.replaceState({}, "", url);
  }

  function addRecent(route) {
    const key = routeKey(route);
    const recents = [key, ...readList(RECENTS_KEY).filter(item => item !== key)].slice(0, 6);
    writeList(RECENTS_KEY, recents);
  }

  function toggleFavourite(route) {
    const key = routeKey(route);
    const favourites = readList(FAVOURITES_KEY);
    const next = favourites.includes(key) ? favourites.filter(item => item !== key) : [key, ...favourites];
    writeList(FAVOURITES_KEY, next);
    renderQuickRoutes();
    decorateDetail();
  }

  function quickRouteButton(key, label) {
    const route = findRoute(key);
    if (!route) return "";
    const start = route.Start || route["Former Start"] || "Unknown start";
    const destination = route.Destination || route["Former Destination"] || "Unknown destination";
    return `<button class="quick-route" type="button" data-route-key="${escapeHtml(key)}"><span class="route-badge">${escapeHtml(route.Route)}</span><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(start)} → ${escapeHtml(destination)}</small></span></button>`;
  }

  function renderQuickRoutes() {
    const host = document.getElementById("quickRoutes");
    if (!host) return;
    const favourites = readList(FAVOURITES_KEY).map(key => quickRouteButton(key, "Saved route")).filter(Boolean);
    const favouriteKeys = new Set(readList(FAVOURITES_KEY));
    const recents = readList(RECENTS_KEY).filter(key => !favouriteKeys.has(key)).map(key => quickRouteButton(key, "Recently viewed")).filter(Boolean);
    const items = [...favourites, ...recents].slice(0, 8);
    host.hidden = !items.length;
    host.innerHTML = items.length ? `<div class="quick-routes-heading"><div><span class="eyebrow">Your routes</span><h2>Saved and recent</h2></div><button id="clearRecentRoutes" class="ghost-button" type="button">Clear recent</button></div><div class="quick-routes-list">${items.join("")}</div>` : "";
    host.querySelectorAll("[data-route-key]").forEach(button => button.addEventListener("click", () => selectRoute(findRoute(button.dataset.routeKey))));
    document.getElementById("clearRecentRoutes")?.addEventListener("click", () => { writeList(RECENTS_KEY, []); renderQuickRoutes(); });
  }

  async function shareRoute(route) {
    const url = new URL(location.href);
    url.searchParams.set("route", route.Route);
    url.searchParams.set("status", Object.prototype.hasOwnProperty.call(route, "Date Withdrawn") ? "withdrawn" : "current");
    const shareData = { title: `London bus route ${route.Route}`, text: `${route.Start || route["Former Start"] || ""} to ${route.Destination || route["Former Destination"] || ""}`, url: url.toString() };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(url.toString());
        const button = document.getElementById("shareRouteButton");
        if (button) { button.textContent = "Link copied"; setTimeout(() => { button.textContent = "Share"; }, 1600); }
      }
    } catch { /* Sharing was cancelled. */ }
  }

  function decorateDetail() {
    const route = state.selected;
    const hero = document.querySelector(".detail-hero");
    if (!route || !hero) return;
    hero.querySelector(".route-app-actions")?.remove();
    const key = routeKey(route);
    const saved = readList(FAVOURITES_KEY).includes(key);
    const actions = document.createElement("div");
    actions.className = "route-app-actions";
    actions.innerHTML = `<button id="favouriteRouteButton" type="button" aria-pressed="${saved}">${saved ? "★ Saved" : "☆ Save route"}</button><button id="shareRouteButton" class="ghost-button" type="button">Share</button>`;
    hero.appendChild(actions);
    document.getElementById("favouriteRouteButton")?.addEventListener("click", () => toggleFavourite(route));
    document.getElementById("shareRouteButton")?.addEventListener("click", () => shareRoute(route));
  }

  const previousRenderDetail = renderDetail;
  renderDetail = function () {
    previousRenderDetail();
    if (!state.selected) return;
    updateUrl(state.selected);
    addRecent(state.selected);
    renderQuickRoutes();
    decorateDetail();
  };

  function restoreTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark") document.body.classList.add("dark");
    const button = document.getElementById("themeButton");
    if (button) button.textContent = document.body.classList.contains("dark") ? "Light mode" : "Dark mode";
    button?.addEventListener("click", () => localStorage.setItem(THEME_KEY, document.body.classList.contains("dark") ? "dark" : "light"));
  }

  function openDeepLink() {
    const params = new URLSearchParams(location.search);
    const number = params.get("route");
    const status = params.get("status") === "withdrawn" ? "withdrawn" : "current";
    if (!number || !state.data[status]?.length) return false;
    const route = state.data[status].find(item => String(item.Route).toLowerCase() === number.toLowerCase());
    if (route) selectRoute(route);
    return Boolean(route);
  }

  restoreTheme();
  renderQuickRoutes();

  let attempts = 0;
  const deepLinkTimer = setInterval(() => {
    attempts += 1;
    renderQuickRoutes();
    if (openDeepLink() || attempts > 20) clearInterval(deepLinkTimer);
  }, 250);

  if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
})();