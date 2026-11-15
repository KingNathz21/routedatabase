(() => {
  const API = "https://routeflow-api.nmorris210509.workers.dev";
  const DB_NAME = "routeflow-offline";
  const STORE = "archive";
  let archivePromise;

  function openCache() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function saveOfflineArchive(archive) {
    try {
      const db = await openCache();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put({ archive, savedAt: new Date().toISOString() }, "latest");
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    } catch (error) {
      console.warn("RouteFlow offline archive could not be saved:", error);
    }
  }

  async function readOfflineArchive() {
    try {
      const db = await openCache();
      const record = await new Promise((resolve, reject) => {
        const request = db.transaction(STORE, "readonly").objectStore(STORE).get("latest");
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return record?.archive || null;
    } catch {
      return null;
    }
  }

  async function loadStatus(status) {
    const records = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const response = await fetch(`${API}/api/routes?status=${encodeURIComponent(status)}&limit=100&offset=${offset}`, {
        headers: { Accept: "application/json" },
        cache: "no-store"
      });
      if (!response.ok) throw new Error(`Route database request failed (${response.status})`);
      const payload = await response.json();
      const page = Array.isArray(payload.data) ? payload.data : [];
      total = Number(payload.pagination?.total ?? page.length);
      for (const row of page) {
        let route = {};
        try { route = typeof row.raw_json === "string" ? JSON.parse(row.raw_json) : (row.raw_json || {}); }
        catch { route = {}; }
        route.Route = route.Route || row.route_number;
        if (status === "current") {
          route.Start = route.Start || row.start_point || "";
          route.Destination = route.Destination || row.destination || "";
          route.Operator = route.Operator || row.operator_name || "";
          route.Garage = route.Garage || row.garage_name || "";
          route["Route Type"] = route["Route Type"] || row.route_type || "";
          route["Vehicle Type (Single/Double Deck)"] = route["Vehicle Type (Single/Double Deck)"] || row.vehicle_type || "";
          route["Power Type"] = route["Power Type"] || row.power_type || "";
        } else {
          route["Former Start"] = route["Former Start"] || row.start_point || "";
          route["Former Destination"] = route["Former Destination"] || row.destination || "";
          route["Final Operator"] = route["Final Operator"] || row.operator_name || "";
          route["Final Garage"] = route["Final Garage"] || row.garage_name || "";
          if (!route["Date Withdrawn"]) route["Date Withdrawn"] = "Withdrawal date not recorded";
        }
        route.__status = status;
        records.push(route);
      }
      if (!page.length) break;
      offset += page.length;
    }
    return records;
  }

  async function loadPhotoIndex() {
    try {
      const response = await fetch("./data/routes.json", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) return { current: new Map(), withdrawn: new Map() };
      const data = await response.json();
      return {
        current: new Map((data.current || []).map(route => [String(route.Route), Array.isArray(route.Images) ? route.Images : []])),
        withdrawn: new Map((data.withdrawn || []).map(route => [String(route.Route), Array.isArray(route.Images) ? route.Images : []]))
      };
    } catch {
      return { current: new Map(), withdrawn: new Map() };
    }
  }

  function mergePhotoGalleries(routes, photoMap) {
    for (const route of routes) {
      const images = photoMap.get(String(route.Route));
      if (images?.length && images.length > (route.Images?.length || 0)) route.Images = images;
    }
  }

  async function fetchArchive() {
    const [current, withdrawn, photos] = await Promise.all([loadStatus("current"), loadStatus("withdrawn"), loadPhotoIndex()]);
    mergePhotoGalleries(current, photos.current);
    mergePhotoGalleries(withdrawn, photos.withdrawn);
    const archive = { current, withdrawn, cachedAt: new Date().toISOString(), offline: false };
    await saveOfflineArchive(archive);
    return archive;
  }

  async function getArchive() {
    if (!archivePromise) {
      archivePromise = fetchArchive().catch(async error => {
        const cached = await readOfflineArchive();
        if (cached && Array.isArray(cached.current) && Array.isArray(cached.withdrawn)) {
          window.dispatchEvent(new CustomEvent("routeflow:offline-data", { detail: { cachedAt: cached.cachedAt } }));
          return { ...cached, offline: true };
        }
        throw new Error(navigator.onLine
          ? error.message
          : "You're offline and this device has not downloaded the route archive yet. Reconnect once to save it for offline use.");
      }).catch(error => {
        archivePromise = null;
        throw error;
      });
    }
    return archivePromise;
  }

  window.addEventListener("online", () => { archivePromise = null; });
  window.RouteFlowDatabase = {
    getArchive,
    refresh: () => { archivePromise = null; return getArchive(); },
    getRoutes: async status => {
      const data = await getArchive();
      return status === "all" ? [...data.current, ...data.withdrawn] : data[status] || [];
    }
  };
})();
