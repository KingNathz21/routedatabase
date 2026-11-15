(() => {
  const button = document.querySelector("#themeButton");
  const applyTheme = dark => {
    document.body.classList.toggle("dark", dark);
    if (button) button.textContent = dark ? "Light mode" : "Dark mode";
  };
  try { applyTheme(localStorage.getItem("rfl-theme") === "dark"); } catch { applyTheme(false); }
  button?.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    try { localStorage.setItem("rfl-theme", dark ? "dark" : "light"); } catch {}
    applyTheme(dark);
  });

  const status = document.createElement("div");
  status.className = "routeflow-connectivity";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  status.hidden = true;
  document.body.append(status);

  const showStatus = (message, state) => {
    status.textContent = message;
    status.dataset.state = state;
    status.hidden = false;
  };
  const updateNetwork = () => {
    if (!navigator.onLine) showStatus("You're offline · saved route information remains available", "offline");
    else {
      showStatus("Back online · reconnecting to live transport data", "online");
      window.setTimeout(() => { if (navigator.onLine) status.hidden = true; }, 4500);
    }
  };
  window.addEventListener("offline", updateNetwork);
  window.addEventListener("online", updateNetwork);
  window.addEventListener("routeflow:offline-data", event => {
    const saved = event.detail?.cachedAt ? new Date(event.detail.cachedAt).toLocaleString("en-GB") : "previously";
    showStatus("Offline archive · saved " + saved, "offline");
  });
  if (!navigator.onLine) updateNetwork();

  if (!document.querySelector('script[src*="nav-performance.js"]')) {
    const navigation = document.createElement("script");
    navigation.src = "nav-performance.js";
    navigation.defer = true;
    document.head.append(navigation);
  }
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(error => {
        console.warn("RouteFlow offline shell registration failed:", error);
      });
    }, { once: true });
  }
})();
