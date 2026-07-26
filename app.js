const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_PREFIX = "routedatabase:tfl-stops:";

const state = {
  data: { current: [], withdrawn: [] },
  filter: "current",
  query: "",
  sort: "route",
  selected: null,
  selectedDirection: "outbound",
  routeStopsCache: new Map()
};

const el = id => document.getElementById(id);
const normalise = value => String(value ?? "").trim().toLowerCase();
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

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
      state.selectedDirection = "outbound";
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
      <div class="live-heading">
        <div>
          <h3>Route stops</h3>
          <p>Official TfL stop sequences for route ${escapeHtml(route.Route)}.</p>
        </div>
        <button id="refreshStopsButton" type="button">Refresh stops</button>
      </div>
      <div id="apiMessage" class="api-message" aria-live="polite">Loading stops…</div>
      <div id="directionTabs" class="direction-tabs" hidden></div>
      <div id="stopSequences" class="stop-sequences"></div>
    </div>` : ""}
  `;

  if (current) {
    el("refreshStopsButton").addEventListener("click", () => loadRouteStops(route.Route, true));
    loadRouteStops(route.Route);
  }
}

async function tflFetch(path, retryCount = 0) {
  const config = window.APP_CONFIG || {};
  const url = new URL(`https://api.tfl.gov.uk${path}`);
  if (config.tflApiKey) url.searchParams.set("app_key", config.tflApiKey);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (response.status === 429 && retryCount < 1) {
    const retryAfter = Number(response.headers.get("Retry-After"));
    await sleep(Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 10000) : 3000);
    return tflFetch(path, retryCount + 1);
  }
  if (!response.ok) {
    const error = new Error(`TfL returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function normaliseSequences(data, direction) {
  const sequences = Array.isArray(data?.stopPointSequences) ? data.stopPointSequences : [];
  return sequences
    .filter(sequence => !direction || normalise(sequence.direction) === direction)
    .map((sequence, index) => ({
      id: `${direction || sequence.direction}-${sequence.branchId ?? index}`,
      direction: normalise(sequence.direction) || direction,
      branchId: sequence.branchId ?? index,
      serviceType: sequence.serviceType || "Regular",
      stops: Array.isArray(sequence.stopPoint) ? sequence.stopPoint : []
    }))
    .filter(sequence => sequence.stops.length);
}

function readStoredStops(routeId) {
  try {
    const raw = localStorage.getItem(`${CACHE_PREFIX}${routeId}`);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (!cached.savedAt || Date.now() - cached.savedAt > CACHE_TTL_MS) {
      localStorage.removeItem(`${CACHE_PREFIX}${routeId}`);
      return null;
    }
    return cached.data || null;
  } catch {
    return null;
  }
}

function storeStops(routeId, routeData) {
  try {
    localStorage.setItem(`${CACHE_PREFIX}${routeId}`, JSON.stringify({ savedAt: Date.now(), data: routeData }));
  } catch {
    // localStorage may be unavailable or full; the in-memory cache still works.
  }
}

async function loadRouteStops(routeId, forceRefresh = false) {
  const selectedRoute = String(routeId);
  const message = el("apiMessage");
  const container = el("stopSequences");
  const tabs = el("directionTabs");
  if (!message || !container || !tabs) return;

  message.textContent = forceRefresh ? "Refreshing stops from TfL…" : "Loading stops…";
  container.innerHTML = "";
  tabs.hidden = true;

  try {
    let routeData = !forceRefresh ? state.routeStopsCache.get(selectedRoute) : null;
    if (!routeData && !forceRefresh) routeData = readStoredStops(selectedRoute);

    if (!routeData) {
      const data = await tflFetch(`/Line/${encodeURIComponent(selectedRoute)}/Route/Sequence/all?serviceTypes=Regular&excludeCrowding=true`);
      routeData = {
        outbound: normaliseSequences(data, "outbound"),
        inbound: normaliseSequences(data, "inbound")
      };
      state.routeStopsCache.set(selectedRoute, routeData);
      storeStops(selectedRoute, routeData);
    } else {
      state.routeStopsCache.set(selectedRoute, routeData);
    }

    if (!state.selected || String(state.selected.Route) !== selectedRoute) return;

    const availableDirections = ["outbound", "inbound"].filter(direction => routeData[direction]?.length);
    if (!availableDirections.length) throw new Error("TfL did not return a stop sequence for this route");
    if (!availableDirections.includes(state.selectedDirection)) state.selectedDirection = availableDirections[0];

    tabs.hidden = false;
    tabs.innerHTML = availableDirections.map(direction => {
      const label = direction === "outbound" ? "Outbound" : "Inbound";
      const active = state.selectedDirection === direction ? " active" : "";
      return `<button class="direction-tab${active}" data-direction="${direction}" type="button">${label}</button>`;
    }).join("");

    tabs.querySelectorAll(".direction-tab").forEach(button => {
      button.addEventListener("click", () => {
        state.selectedDirection = button.dataset.direction;
        renderStopSequences(routeData[state.selectedDirection]);
        updateStopsMessage(routeData[state.selectedDirection], Boolean(readStoredStops(selectedRoute)));
        tabs.querySelectorAll(".direction-tab").forEach(tab => tab.classList.toggle("active", tab === button));
      });
    });

    updateStopsMessage(routeData[state.selectedDirection], !forceRefresh && Boolean(readStoredStops(selectedRoute)));
    renderStopSequences(routeData[state.selectedDirection]);
  } catch (error) {
    if (error.status === 429) {
      message.textContent = "TfL is temporarily limiting requests. Please wait a minute, then press Refresh stops. Routes already opened on this device will continue to use the saved cache.";
    } else {
      message.textContent = `Could not load stops: ${error.message}. Please try Refresh stops shortly.`;
    }
  }
}

function updateStopsMessage(sequences, cached) {
  const totalStops = sequences.reduce((sum, sequence) => sum + sequence.stops.length, 0);
  const suffix = cached ? " Saved route data was used to reduce TfL requests." : "";
  el("apiMessage").textContent = `${totalStops} stops loaded across ${sequences.length} ${sequences.length === 1 ? "route pattern" : "route patterns"}.${suffix}`;
}

function stopTitle(stop) {
  return stop.name || stop.commonName || stop.id || "Unknown stop";
}

function renderStopSequences(sequences) {
  const container = el("stopSequences");
  if (!container) return;

  container.innerHTML = sequences.map((sequence, sequenceIndex) => {
    const first = sequence.stops[0];
    const last = sequence.stops[sequence.stops.length - 1];
    const title = sequences.length > 1
      ? `Pattern ${sequenceIndex + 1}: ${stopTitle(first)} to ${stopTitle(last)}`
      : `${stopTitle(first)} to ${stopTitle(last)}`;

    return `<section class="stop-sequence-card">
      <div class="sequence-heading">
        <div>
          <span class="sequence-label">${escapeHtml(sequence.serviceType)} · ${sequence.stops.length} stops</span>
          <h4>${escapeHtml(title)}</h4>
        </div>
      </div>
      <ol class="stop-list">
        ${sequence.stops.map((stop, index) => `<li>
          <span class="stop-marker" aria-hidden="true"></span>
          <div class="stop-copy">
            <strong>${escapeHtml(stopTitle(stop))}</strong>
            <small>${escapeHtml([
              stop.stopLetter ? `Stop ${stop.stopLetter}` : "",
              stop.towards ? `Towards ${stop.towards}` : "",
              stop.id || ""
            ].filter(Boolean).join(" · "))}</small>
          </div>
          <span class="stop-number">${index + 1}</span>
        </li>`).join("")}
      </ol>
    </section>`;
  }).join("");
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
