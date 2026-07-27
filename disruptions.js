(() => {
  const API = "https://api.tfl.gov.uk";
  const results = document.querySelector("#disruptionResults");
  const refreshButton = document.querySelector("#refreshDisruptions");
  const themeButton = document.querySelector("#themeButton");
  const tabs = [...document.querySelectorAll(".mode-tab")];
  let activeMode = "all";
  let items = [];

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

  function render() {
    const filtered = activeMode === "all" ? items : items.filter(item => item.mode === activeMode);
    if (!filtered.length) {
      results.className = "good-service";
      results.innerHTML = `<strong>No reported disruptions</strong><p>TfL is not currently reporting problems for this selection.</p>`;
      return;
    }
    results.className = "";
    results.innerHTML = filtered.map(item => `
      <article class="disruption-item">
        <div class="disruption-top">
          <span class="disruption-line">${escapeHtml(item.line)}</span>
          <span class="severity">${escapeHtml(item.severity || "Service update")}</span>
        </div>
        <p>${escapeHtml(item.description || "No further details supplied.")}</p>
      </article>`).join("");
  }

  function collectLineDisruptions(lines, mode) {
    return lines.flatMap(line => {
      const badStatuses = (line.lineStatuses || []).filter(status => Number(status.statusSeverity) !== 10);
      if (!badStatuses.length) return [];
      return badStatuses.map(status => ({
        mode,
        line: line.name || modeLabel(mode),
        severity: status.statusSeverityDescription,
        description: status.reason || status.disruption?.description || status.statusSeverityDescription
      }));
    });
  }

  function collectBusDisruptions(disruptions) {
    return disruptions.map(disruption => ({
      mode: "bus",
      line: disruption.routeSectionNaptanEntrySequence?.[0]?.lineString || disruption.categoryDescription || "Bus service",
      severity: disruption.severityDescription || disruption.categoryDescription || "Disruption",
      description: disruption.description || disruption.summary || "Bus disruption reported by TfL."
    }));
  }

  async function loadDisruptions() {
    results.className = "status-text live-card-body";
    results.textContent = "Loading current service information…";
    refreshButton.disabled = true;
    try {
      const railModes = ["tube", "overground", "elizabeth-line", "dlr", "tram", "river-bus"];
      const railRequests = railModes.map(mode => fetchJson(`/Line/Mode/${mode}/Status?detail=true`).then(data => collectLineDisruptions(data, mode)));
      const busRequest = fetchJson("/Line/Mode/bus/Disruption").then(collectBusDisruptions).catch(() => []);
      const data = await Promise.all([...railRequests, busRequest]);
      items = data.flat().sort((a, b) => a.mode.localeCompare(b.mode) || a.line.localeCompare(b.line));
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
