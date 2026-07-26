
const state = {
  data: { current: [], withdrawn: [] },
  filter: "current",
  query: "",
  sort: "route",
  selected: null
};

const el = id => document.getElementById(id);
const normalise = value => String(value ?? "").trim().toLowerCase();

function routeNumber(value) {
  const text = String(value || "");
  const match = text.match(/^([A-Za-z]*)(\d+)(.*)$/);
  if (!match) return [text, 0, text];
  return [match[1].toUpperCase(), Number(match[2]), match[3]];
}

function compareRoutes(a, b) {
  const aa = routeNumber(a.Route);
  const bb = routeNumber(b.Route);
  return aa[0].localeCompare(bb[0]) || aa[1] - bb[1] || aa[2].localeCompare(bb[2]);
}

function getRecords() {
  let records = state.filter === "all"
    ? [...state.data.current, ...state.data.withdrawn]
    : [...state.data[state.filter]];

  if (state.query) {
    const q = normalise(state.query);
    records = records.filter(route => Object.values(route).some(value => normalise(value).includes(q)));
  }

  records.sort((a, b) => {
    if (state.sort === "start") return normalise(a.Start || a["Former Start"]).localeCompare(normalise(b.Start || b["Former Start"]));
    if (state.sort === "destination") return normalise(a.Destination || a["Former Destination"]).localeCompare(normalise(b.Destination || b["Former Destination"]));
    return compareRoutes(a, b);
  });
  return records;
}

function renderList() {
  const records = getRecords();
  el("resultCount").textContent = records.length.toLocaleString("en-GB");
  const list = el("routeList");
  if (!records.length) {
    list.innerHTML = '<p style="padding:20px;color:var(--muted)">No matching routes found.</p>';
    return;
  }
  list.innerHTML = records.map((route, index) => {
    const start = route.Start || route["Former Start"] || "Unknown start";
    const destination = route.Destination || route["Former Destination"] || "Unknown destination";
    const selected = state.selected && state.selected.Route === route.Route ? " active" : "";
    return `<button class="route-item${selected}" data-index="${index}" type="button">
      <span class="route-badge">${escapeHtml(route.Route)}</span>
      <span><strong>${escapeHtml(start)} → ${escapeHtml(destination)}</strong>
      <small>${escapeHtml(route.Operator || route["Final Operator"] || (route["Date Withdrawn"] ? "Withdrawn route" : "Operator not recorded"))}</small></span>
    </button>`;
  }).join("");

  list.querySelectorAll(".route-item").forEach(button => {
    button.addEventListener("click", () => {
      state.selected = records[Number(button.dataset.index)];
      renderList();
      renderDetail();
    });
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

function fieldCards(route) {
  const ignored = new Set(["Route", "Image", "ImageAlt"]);
  return Object.entries(route)
    .filter(([key, value]) => !ignored.has(key) && String(value ?? "").trim())
    .map(([key, value]) => `<div class="detail-card"><span>${escapeHtml(key)}</span><strong>${escapeHtml(value)}</strong></div>`)
    .join("");
}

function renderDetail() {
  const route = state.selected;
  if (!route) return;
  const current = !("Date Withdrawn" in route);
  const start = route.Start || route["Former Start"] || "Unknown start";
  const destination = route.Destination || route["Former Destination"] || "Unknown destination";
  const imageStyle = route.Image ? `style="background-image:url('${encodeURI(route.Image)}')"` : "";
  el("routeDetail").className = "route-detail";
  el("routeDetail").innerHTML = `
    <div class="detail-hero">
      <div class="detail-copy">
        <p class="eyebrow">${current ? "Current route" : "Withdrawn route"}</p>
        <h2>${escapeHtml(route.Route)}</h2>
        <p>${escapeHtml(start)} → ${escapeHtml(destination)}</p>
        <span class="status-pill">${escapeHtml(route.Operator || route["Final Operator"] || "Operator not recorded")}</span>
      </div>
      <div class="detail-image" ${imageStyle} role="img" aria-label="${escapeHtml(route.ImageAlt || `Route ${route.Route}`)}">
        ${route.Image ? "" : `<span>${escapeHtml(route.Route)}</span>`}
      </div>
    </div>
    <div class="detail-grid">${fieldCards(route)}</div>
    ${current ? `<div class="live-panel">
      <h3>Live TfL route information</h3>
      <p>Load the official stop sequence and current line status for route ${escapeHtml(route.Route)}.</p>
      <button id="loadLiveButton" type="button">Load TfL data</button>
      <div id="apiMessage" class="api-message"></div>
      <ol id="stopList" class="stop-list"></ol>
    </div>` : ""}
  `;
  if (current) el("loadLiveButton").addEventListener("click", () => loadLiveData(route.Route));
}

async function tflFetch(path) {
  const config = window.APP_CONFIG || {};
  const url = new URL(`https://api.tfl.gov.uk${path}`);
  if (config.tflApiKey) url.searchParams.set("app_key", config.tflApiKey);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`TfL returned ${response.status}`);
  return response.json();
}

async function loadLiveData(routeId) {
  const message = el("apiMessage");
  const list = el("stopList");
  message.textContent = "Loading TfL data…";
  list.innerHTML = "";
  try {
    const [sequence, status] = await Promise.all([
      tflFetch(`/Line/${encodeURIComponent(routeId)}/Route/Sequence/all?serviceTypes=Regular&excludeCrowding=true`),
      tflFetch(`/Line/${encodeURIComponent(routeId)}/Status?detail=true`)
    ]);
    const stops = sequence.stopPointSequences?.[0]?.stopPoint || sequence.stations || [];
    const statusText = status?.[0]?.lineStatuses?.[0]?.statusSeverityDescription || "No status supplied";
    message.textContent = `${statusText}. ${stops.length} stops loaded.`;
    list.innerHTML = stops.map(stop => `<li>${escapeHtml(stop.name || stop.commonName || stop.id)}</li>`).join("");
  } catch (error) {
    message.textContent = `Could not load TfL data: ${error.message}. Check the route number, internet connection and API configuration.`;
  }
}

function applySearch() {
  state.query = el("searchInput").value.trim();
  state.selected = null;
  renderList();
}

async function init() {
  try {
    const response = await fetch("data/routes.json");
    if (!response.ok) throw new Error("Route database could not be loaded.");
    state.data = await response.json();
    el("currentCount").textContent = state.data.current.length.toLocaleString("en-GB");
    el("withdrawnCount").textContent = state.data.withdrawn.length.toLocaleString("en-GB");
    renderList();
  } catch (error) {
    el("routeList").innerHTML = `<p style="padding:20px">${escapeHtml(error.message)} Open the site through a local web server rather than double-clicking index.html.</p>`;
  }
}

el("searchButton").addEventListener("click", applySearch);
el("searchInput").addEventListener("keydown", event => {
  if (event.key === "Enter") applySearch();
});
el("searchInput").addEventListener("input", () => {
  state.query = el("searchInput").value.trim();
  renderList();
});
document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    state.filter = button.dataset.filter;
    state.selected = null;
    renderList();
    el("routeDetail").className = "route-detail empty-state";
    el("routeDetail").innerHTML = "<div><span class='large-roundel'>BUS</span><h2>Select a route</h2><p>Choose a route from the list to view its full information.</p></div>";
  });
});
el("sortSelect").addEventListener("change", event => {
  state.sort = event.target.value;
  renderList();
});
el("themeButton").addEventListener("click", () => {
  document.body.classList.toggle("dark");
  el("themeButton").textContent = document.body.classList.contains("dark") ? "Light mode" : "Dark mode";
});
init();
