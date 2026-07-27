(() => {
  const API = "https://api.tfl.gov.uk";
  const results = document.querySelector("#disruptionResults");
  const refreshButton = document.querySelector("#refreshDisruptions");
  const themeButton = document.querySelector("#themeButton");
  const tabs = [...document.querySelectorAll(".mode-tab")];
  let activeMode = "all";
  let services = [];
  let selectedKey = "";

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const apiUrl = path => {
    const key = window.APP_CONFIG?.tflApiKey?.trim();
    const separator = path.includes("?") ? "&" : "?";
    return `${API}${path}${key ? `${separator}app_key=${encodeURIComponent(key)}` : ""}`;
  };

  async function fetchJson(path) {
    const response = await fetch(apiUrl(path));
    if (!response.ok) throw new Error(`TfL request failed (${response.status})`);
    return response.json();
  }

  const modeLabel = mode => ({
    bus: "Bus", tube: "Tube", overground: "London Overground", "elizabeth-line": "Elizabeth line",
    dlr: "DLR", tram: "Tram", "river-bus": "River"
  })[mode] || mode;

  const routeSort = (a, b) => String(a.name).localeCompare(String(b.name), "en-GB", { numeric: true });
  const serviceKey = service => `${service.mode}:${service.name}`;

  function extractBusRoutes(disruption) {
    const values = new Set();
    const add = value => {
      const text = String(value || "").trim();
      if (text && /^[A-Z]*\d+[A-Z]*$/i.test(text)) values.add(text.toUpperCase());
    };
    (disruption.affectedRoutes || []).forEach(route => add(route.name || route.lineId || route.routeId));
    (disruption.routeSectionNaptanEntrySequence || []).forEach(section => {
      add(section.lineId);
      add(section.routeId);
      String(section.lineString || "").split(/[,/ ]+/).forEach(add);
    });
    String(disruption.description || disruption.summary || "").match(/\b(?:N|X|SL)?\d{1,3}[A-Z]?\b/gi)?.forEach(add);
    return [...values];
  }

  function detailCard(service) {
    const disruptions = service.disruptions || [];
    if (!disruptions.length) {
      return `<section class="selected-disruption good-detail">
        <div><p class="eyebrow">${escapeHtml(modeLabel(service.mode))}</p><h3>${escapeHtml(service.name)}</h3></div>
        <span class="service-ok">✓ Good service</span>
        <p>TfL is not currently reporting a disruption for this service.</p>
      </section>`;
    }
    return `<section class="selected-disruption alert-detail">
      <div class="selected-heading"><div><p class="eyebrow">${escapeHtml(modeLabel(service.mode))}</p><h3>${escapeHtml(service.name)}</h3></div><span class="alert-count">! ${disruptions.length}</span></div>
      ${disruptions.map(item => `<article class="disruption-detail-item"><strong>${escapeHtml(item.severity || "Service disruption")}</strong><p>${escapeHtml(item.description || "No further details supplied by TfL.")}</p></article>`).join("")}
    </section>`;
  }

  function render() {
    const filtered = (activeMode === "all" ? services : services.filter(service => service.mode === activeMode)).sort(routeSort);
    if (!filtered.length) {
      results.className = "good-service";
      results.innerHTML = `<strong>No services found</strong><p>No routes are available for this selection.</p>`;
      return;
    }

    if (!filtered.some(service => serviceKey(service) === selectedKey)) selectedKey = "";
    const disruptedCount = filtered.filter(service => service.disruptions.length).length;
    results.className = "live-card-body";
    results.innerHTML = `
      <div class="status-summary"><strong>${disruptedCount}</strong> of ${filtered.length} services currently have reported disruptions.</div>
      <div class="route-status-grid" aria-label="Route disruption status">
        ${filtered.map(service => {
          const disrupted = service.disruptions.length > 0;
          return `<button class="route-status-tile ${disrupted ? "has-disruption" : "no-disruption"}${serviceKey(service) === selectedKey ? " selected" : ""}" type="button" data-key="${escapeHtml(serviceKey(service))}" aria-expanded="${serviceKey(service) === selectedKey}">
            <span class="route-status-name">${escapeHtml(service.name)}</span>
            <span class="route-status-icon" aria-hidden="true">${disrupted ? "!" : "✓"}</span>
            <span class="sr-only">${disrupted ? `${service.disruptions.length} disruption${service.disruptions.length === 1 ? "" : "s"}` : "No disruption"}</span>
          </button>`;
        }).join("")}
      </div>
      <div id="selectedDisruption" aria-live="polite">${selectedKey ? detailCard(filtered.find(service => serviceKey(service) === selectedKey)) : ""}</div>`;

    results.querySelectorAll(".route-status-tile").forEach(button => {
      button.addEventListener("click", () => {
        selectedKey = selectedKey === button.dataset.key ? "" : button.dataset.key;
        render();
        document.querySelector("#selectedDisruption")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  function railServices(lines, mode) {
    return lines.map(line => {
      const disruptions = (line.lineStatuses || [])
        .filter(status => Number(status.statusSeverity) !== 10)
        .map(status => ({
          severity: status.statusSeverityDescription,
          description: status.reason || status.disruption?.description || status.statusSeverityDescription
        }));
      return { mode, name: line.name || modeLabel(mode), disruptions };
    });
  }

  async function loadBusServices() {
    const [routeDatabase, disruptions] = await Promise.all([
      fetch("data/routes.json").then(response => {
        if (!response.ok) throw new Error("Route database could not be loaded");
        return response.json();
      }),
      fetchJson("/Line/Mode/bus/Disruption").catch(() => [])
    ]);
    const disruptionMap = new Map();
    disruptions.forEach(disruption => {
      extractBusRoutes(disruption).forEach(route => {
        if (!disruptionMap.has(route)) disruptionMap.set(route, []);
        disruptionMap.get(route).push({
          severity: disruption.severityDescription || disruption.categoryDescription || "Bus disruption",
          description: disruption.description || disruption.summary || "Bus disruption reported by TfL."
        });
      });
    });
    return (routeDatabase.current || []).map(route => {
      const name = String(route.Route || "").toUpperCase();
      return { mode: "bus", name, disruptions: disruptionMap.get(name) || [] };
    }).filter(service => service.name);
  }

  async function loadDisruptions() {
    results.className = "status-text live-card-body";
    results.textContent = "Loading every route and current service status…";
    refreshButton.disabled = true;
    try {
      const railModes = ["tube", "overground", "elizabeth-line", "dlr", "tram", "river-bus"];
      const railRequests = railModes.map(mode => fetchJson(`/Line/Mode/${mode}/Status?detail=true`).then(data => railServices(data, mode)));
      const data = await Promise.all([...railRequests, loadBusServices()]);
      services = data.flat();
      render();
    } catch (error) {
      results.className = "good-service";
      results.innerHTML = `<strong>Disruptions could not be loaded</strong><p>${escapeHtml(error.message)}</p>`;
    } finally {
      refreshButton.disabled = false;
    }
  }

  tabs.forEach(tab => tab.addEventListener("click", () => {
    activeMode = tab.dataset.mode;
    selectedKey = "";
    tabs.forEach(item => item.classList.toggle("active", item === tab));
    render();
  }));
  refreshButton.addEventListener("click", loadDisruptions);

  const applyTheme = dark => {
    document.body.classList.toggle("dark", dark);
    themeButton.textContent = dark ? "Light mode" : "Dark mode";
  };
  applyTheme(localStorage.getItem("rfl-theme") === "dark");
  themeButton.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    localStorage.setItem("rfl-theme", dark ? "dark" : "light");
    applyTheme(dark);
  });

  loadDisruptions();
  setInterval(loadDisruptions, 120000);
})();