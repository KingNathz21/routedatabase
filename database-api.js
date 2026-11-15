(() => {
  const API = (window.ROUTEFLOW_CONFIG?.apiBaseUrl || "https://routeflow-api.nmorris210509.workers.dev").replace(/\\/$/, "");
  const DB_NAME = "routeflow-offline";
  const STORE = "archive";
  const ARCHIVE_SCHEMA = 2;
  const PAGE_SIZE = 100;
  const REQUEST_TIMEOUT_MS = 15000;
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

  async function fetchJson(url, timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`RouteFlow request failed (${response.status})`);
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw new Error("The RouteFlow server took too long to respond. Please try refreshing.");
      throw error;
    } finally {
      window.clearTimeout(timer);
    }
  }

  function firstValue(...values) {
    for (const value of values) {
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  }

  function parseArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return value.split(/\s*[|;]\s*/).filter(Boolean);
      }
    }
    return [];
  }

  function normalizeRoute(row, status) {
    let raw = {};
    try {
      raw = typeof row.raw_json === "string" ? JSON.parse(row.raw_json) : (row.raw_json || {});
    } catch {
      raw = {};
    }

    // Support both the D1 snake_case rows and the already-normalised route
    // objects returned by older RouteFlow Worker deployments.
    const route = { ...row, ...raw };
    route.Route = String(firstValue(row.Route, raw.Route, row.route_number, row.routeNumber));
    if (status === "current") {
      route.Start = firstValue(row.Start, raw.Start, row.start_point, row.startPoint);
      route.Destination = firstValue(row.Destination, raw.Destination, row.destination, raw.destination);
      route.Operator = firstValue(row.Operator, raw.Operator, row.operator_name, row.operator, raw.operator);
      route.Garage = firstValue(row.Garage, raw.Garage, row.garage_name, row.garage, raw.garage);
    } else {
      route["Former Start"] = firstValue(row["Former Start"], raw["Former Start"], row.Start, raw.Start, row.start_point, row.startPoint);
      route["Former Destination"] = firstValue(row["Former Destination"], raw["Former Destination"], row.Destination, raw.Destination, row.destination);
      route["Final Operator"] = firstValue(row["Final Operator"], raw["Final Operator"], row.Operator, raw.Operator, row.operator_name, row.operator);
      route["Final Garage"] = firstValue(row["Final Garage"], raw["Final Garage"], row.Garage, raw.Garage, row.garage_name, row.garage);
      if (!route["Date Withdrawn"]) route["Date Withdrawn"] = "Withdrawal date not recorded";
    }

    route["Route Type"] = firstValue(row["Route Type"], raw["Route Type"], row.route_type, row.routeType);
    route["Vehicle Type (Single/Double Deck)"] = firstValue(
      row["Vehicle Type (Single/Double Deck)"], raw["Vehicle Type (Single/Double Deck)"],
      row.vehicle_type, row.vehicleType, row["Vehicle Type"]
    );
    route["Power Type"] = firstValue(row["Power Type"], raw["Power Type"], row.power_type, row.powerType);
    route["Models Used"] = firstValue(row["Models Used"], raw["Models Used"], row.models_used, row.modelsUsed);
    route.PVR = firstValue(row.PVR, raw.PVR, row.pvr, "Not yet recorded");
    route.Via = parseArray(firstValue(row.Via, raw.Via, row.via));
    route.Images = parseArray(firstValue(row.Images, raw.Images, row.images));
    route.__status = status;
    return route;
  }

  async function loadStatus(status) {
    const records = [];
    let offset = 0;
    let total = Infinity;
    let pages = 0;

    while (offset < total) {
      if (++pages > 100) throw new Error("The route archive returned too many pages to load safely.");
      const payload = await fetchJson(`${API}/api/routes?status=${encodeURIComponent(status)}&limit=${PAGE_SIZE}&offset=${offset}`);
      const page = Array.isArray(payload.data) ? payload.data : [];
      total = Number(payload.pagination?.total ?? page.length);
      records.push(...page.map(row => normalizeRoute(row, status)));
      if (!page.length || page.length < PAGE_SIZE) break;
      offset += page.length;
    }
    return records;
  }

  async function loadPhotoIndex() {
    try {
      const data = await fetchJson("./data/routes.json", 8000);
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
    const [current, withdrawn, photos] = await Promise.all([
      loadStatus("current"),
      loadStatus("withdrawn"),
      loadPhotoIndex()
    ]);
    mergePhotoGalleries(current, photos.current);
    mergePhotoGalleries(withdrawn, photos.withdrawn);
    const archive = {
      schemaVersion: ARCHIVE_SCHEMA,
      current,
      withdrawn,
      cachedAt: new Date().toISOString(),
      offline: false
    };
    await saveOfflineArchive(archive);
    window.dispatchEvent(new CustomEvent("routeflow:archive-loaded", {
      detail: { current: current.length, withdrawn: withdrawn.length }
    }));
    return archive;
  }

  async function getArchive() {
    if (!archivePromise) {
      archivePromise = fetchArchive().catch(async error => {
        const cached = await readOfflineArchive();
        // Older cached records used a different API shape; require a fresh v2 archive.
        if (cached?.schemaVersion === ARCHIVE_SCHEMA && Array.isArray(cached.current) && Array.isArray(cached.withdrawn)) {
          window.dispatchEvent(new CustomEvent("routeflow:offline-data", { detail: { cachedAt: cached.cachedAt } }));
          return { ...cached, offline: true };
        }
        throw new Error(navigator.onLine
          ? error.message
          : "You're offline and this device has not downloaded the latest route archive yet. Reconnect once to save it for offline use.");
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
