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
      const response = await fetch(API + "/api/stats", { headers: { Accept: "application/json" }, cache: "no-store" });
      if (!response.ok) throw new Error("Database returned " + response.status);
      const payload = await response.json();
      const data = payload.data || {};
      for (const [key, id] of Object.entries(ids)) {
        const element = document.getElementById(id);
        if (element) element.textContent = format(data[key]);
      }
      section.classList.remove("is-unavailable");
      updated.textContent = "Live database · updated " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
      note.textContent = format(data.garages) + " garages are also recorded. Figures reflect the data currently imported into Cloudflare D1.";
    } catch (error) {
      section.classList.add("is-unavailable");
      updated.textContent = "Live figures temporarily unavailable";
      note.textContent = "The route database could not be reached just now. Try the Routes page to browse the archive.";
    }
  }
  loadStats();
})();
