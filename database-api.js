(() => {
  const API = "https://routeflow-api.nmorris210509.workers.dev";
  let archivePromise;
  async function loadStatus(status) {
    const records = [];
    let offset = 0;
    let total = Infinity;
    while (offset < total) {
      const response = await fetch(`${API}/api/routes?status=${encodeURIComponent(status)}&limit=100&offset=${offset}`, { headers: { Accept: "application/json" }, cache: "no-store" });
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
  async function getArchive() {
    if (!archivePromise) archivePromise = Promise.all([loadStatus("current"), loadStatus("withdrawn")]).then(([current, withdrawn]) => ({ current, withdrawn })).catch(error => { archivePromise = null; throw error; });
    return archivePromise;
  }
  window.RouteFlowDatabase = { getArchive, getRoutes: async status => { const data = await getArchive(); return status === "all" ? [...data.current, ...data.withdrawn] : data[status] || []; } };
})();
