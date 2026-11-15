(() => {
  const API = "https://routeflow-api.nmorris210509.workers.dev";
  const ids = { current: "statCurrent", withdrawn: "statWithdrawn", total: "statTotal", operators: "statOperators" };
  const section = document.querySelector(".network-stats");
  if (!section) return;
  const updated = document.querySelector("#statsUpdated");
  const note = document.querySelector("#statsNote");
  const format = value => Number(value || 0).toLocaleString("en-GB");
  async function loadStats() {
    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 12000);
      let response;
      try {
        response = await fetch(API + "/api/stats", {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal
        });
      } finally {
        window.clearTimeout(timeout);
      }
      if (!response.ok) throw new Error("Database returned " + response.status);
      const payload = await response.json();
      const data = payload.data || {};
      for (const [key, id] of Object.entries(ids)) {
        const element = document.getElementById(id);
        if (element) element.textContent = format(data[key]);
      }
      section.classList.remove("is-unavailable");
      updated.textContent = "Updated " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      note.textContent = format(data.garages) + " garages are also included in the network archive.";
    } catch (error) {
      section.classList.add("is-unavailable");
      updated.textContent = error.name === "AbortError" ? "Database response timed out" : "Live figures temporarily unavailable";
      note.textContent = "Live network statistics are temporarily unavailable. You can still browse the route archive.";
    }
  }
  loadStats();
})();
