(() => {
  const API = "https://api.tfl.gov.uk";
  const results = document.querySelector("#disruptionResults");
  const refreshButton = document.querySelector("#refreshDisruptions");
  const themeButton = document.querySelector("#themeButton");
  const searchInput = document.querySelector("#disruptionSearch");
  const disruptedOnly = document.querySelector("#disruptedOnly");
  const tabs = [...document.querySelectorAll(".mode-tab")];

  let activeMode = "all";
  let services = [];
  let selectedKey = "";
  let query = "";
  let onlyDisrupted = false;

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const apiUrl = path => {
    const key = window.APP_CONFIG?.tflApiKey?.trim();
    const separator = path.includes("?") ? "&" : "?";
    return `${API}${path}${key ? `${separator}app_key=${encodeURIComponent(key)}` : ""}`;
  };

  const fetchJson = async path => {
    const response = await fetch(apiUrl(path));
    if (!response.ok) throw new Error(`TfL request failed (${response.status})`);
    return response.json();
  };

  const modeLabel = mode => ({
    bus: "Bus",
    tube: "Tube",
    overground: "London Overground",
    "elizabeth-line": "Elizabeth line",
    dlr: "DLR",
    tram: "Tram",
    "river-bus": "River"
  })[mode] || mode;

  const routeSort = (a, b) => String(a.name).localeCompare(String(b.name), "en-GB", { numeric: true });
  const serviceKey = service => `${service.mode}:${service.name}`;

  // Only accept a bus route number that exists in RouteFlow's London route database.
  // TfL lineString values are encoded geographic coordinates, not bus route numbers.
  function normalizeBusRoute(value, knownRoutes) {
    const route = String(value || "").trim().toUpperCase().replace(/\s+/g, "");
    return knownRoutes.has(route) ? route : "";
  }

  function extractBusRoutes(disruption, knownRoutes) {
    const routes = new Set();
    const add = value => {
      const route = normalizeBusRoute(value, knownRoutes);
      if (route) routes.add(route);
    };

    (disruption.affectedRoutes || []).forEach(route => {
      add(route.name);
      add(route.lineId);
      add(route.routeId);
    });

    // TfL route-section line IDs can identify a route. Do not parse lineString:
    // it contains encoded map geometry and can accidentally look like route numbers.
    (disruption.routeSectionNaptanEntrySequence || []).forEach(section => {
      add(section.lineId);
      add(section.routeId);
    });

    return [...routes];
  }

  function detailCard(service) {
    const disruptions = service.disruptions || [];
    if (!disruptions.length) {
      return `<section class="selected-disruption good-detail"><div><p class="eyebrow">${escapeHtml(modeLabel(service.mode))}</p><h3>${escapeHtml(service.name)}</h3></div><span class="service-ok">✓ Good service</span><p>TfL is not currently reporting a disruption for this service.</p></section>`;
    }

    return `<section class="selected-disruption alert-detail"><div class="selected-heading"><div><p class="eyebrow">${escapeHtml(modeLabel(service.mode))}</p><h3>${escapeHtml(service.name)}</h3></div><span class="alert-count">! ${disruptions.length}</span></div>${disruptions.map(item => `<article class="disruption-detail-item"><strong>${escapeHtml(item.severity || "Service disruption")}</strong><p>${escapeHtml(item.description || "No further details supplied by TfL.")}</p></article>`).join("")}</section>`;
  }

  function render() {
    let filtered = activeMode === "all"
      ? services
      : services.filter(service => service.mode === activeMode);

    if (query) {
      filtered = filtered.filter(service =>
        `${service.name} ${modeLabel(service.mode)}`.toLowerCase().includes(query)
      );
    }

    if (onlyDisrupted) filtered = filtered.filter(service => service.disruptions.length);
    filtered.sort(routeSort);

    if (!filtered.length) {
      results.className = "good-service";
      results.innerHTML = `<strong>No matching London services</strong><p>Try changing the search, mode or disruption-only filter.</p>`;
      return;
    }

    if (!filtered.some(service => serviceKey(service) === selectedKey)) selectedKey = "";

    const disruptedCount = filtered.filter(service => service.disruptions.length).length;
    results.className = "live-card-body";
    results.innerHTML = `<div class="status-summary"><strong>${disruptedCount}</strong> of ${filtered.length} shown London services currently have reported disruptions.</div><div class="route-status-grid" aria-label="London route disruption status">${filtered.map(service => {
      const disrupted = service.disruptions.length > 0;
      const key = serviceKey(service);
      return `<button class="route-status-tile ${disrupted ? "has-disruption" : "no-disruption"}${key === selectedKey ? " selected" : ""}" type="button" data-key="${escapeHtml(key)}" aria-expanded="${key === selectedKey}"><span class="route-status-name">${escapeHtml(service.name)}</span><span class="route-status-icon" aria-hidden="true">${disrupted ? "!" : "✓"}</span><span class="sr-only">${disrupted ? `${service.disruptions.length} disruptions` : "No disruption"}</span></button>`;
    }).join("")}</div><div id="selectedDisruption" aria-live="polite">${selectedKey ? detailCard(filtered.find(service => serviceKey(service) === selectedKey)) : ""}</div>`;

    results.querySelectorAll(".route-status-tile").forEach(button => {
      button.addEventListener("click", () => {
        selectedKey = selectedKey === button.dataset.key ? "" : button.dataset.key;
        render();
        document.querySelector("#selectedDisruption")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    });
  }

  function railServices(lines, mode) {
    return lines.map(line => ({
      mode,
      name: line.name || modeLabel(mode),
      disruptions: (line.lineStatuses || [])
        .filter(status => Number(status.statusSeverity) !== 10)
        .map(status => ({
          severity: status.statusSeverityDescription,
          description: status.reason || status.disruption?.description || status.statusSeverityDescription
        }))
    }));
  }

  async function loadBusServices() {
    const [routeDatabase, disruptions] = await Promise.all([
      fetch("data/routes.json").then(response => {
        if (!response.ok) throw new Error("London route database could not be loaded");
        return response.json();
      }),
      fetchJson("/Line/Mode/bus/Disruption").catch(() => [])
    ]);

    const currentRoutes = [...new Set((routeDatabase.current || [])
      .map(route => String(route.Route || "").trim().toUpperCase())
      .filter(Boolean))];

    const knownRoutes = new Set(currentRoutes);
    const disruptionMap = new Map();

    disruptions.forEach(disruption => {
      const routes = extractBusRoutes(disruption, knownRoutes);
      routes.forEach(route => {
        if (!disruptionMap.has(route)) disruptionMap.set(route, []);
        const entry = {
          severity: disruption.severityDescription || disruption.categoryDescription || "Bus disruption",
          description: disruption.description || disruption.summary || "Bus disruption reported by TfL."
        };
        const existing = disruptionMap.get(route);
        if (!existing.some(item => item.severity === entry.severity && item.description === entry.description)) {
          existing.push(entry);
        }
      });
    });

    // The bus list is deliberately sourced from RouteFlow's current London routes,
    // not from every line or route returned by a broad third-party feed.
    return currentRoutes.map(name => ({
      mode: "bus",
      name,
      disruptions: disruptionMap.get(name) || []
    }));
  }

  async function loadDisruptions() {
    results.className = "status-text live-card-body";
    results.textContent = "Loading London routes and current service status…";
    refreshButton.disabled = true;

    try {
      const railModes = ["tube", "overground", "elizabeth-line", "dlr", "tram", "river-bus"];
      const data = await Promise.all([
        ...railModes.map(mode =>
          fetchJson(`/Line/Mode/${mode}/Status?detail=true`).then(lines => railServices(lines, mode))
        ),
        loadBusServices()
      ]);

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

  searchInput.addEventListener("input", () => {
    query = searchInput.value.trim().toLowerCase();
    selectedKey = "";
    render();
  });

  disruptedOnly.addEventListener("change", () => {
    onlyDisrupted = disruptedOnly.checked;
    selectedKey = "";
    render();
  });

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
