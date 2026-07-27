(() => {
  const API = "https://api.tfl.gov.uk";
  const input = document.querySelector("#arrivalSearch");
  const searchButton = document.querySelector("#arrivalSearchButton");
  const suggestions = document.querySelector("#suggestions");
  const results = document.querySelector("#results");
  const heading = document.querySelector("#resultHeading");
  const refreshButton = document.querySelector("#refreshButton");
  const themeButton = document.querySelector("#themeButton");
  let selectedStop = null;
  let suggestionTimer = null;
  let refreshTimer = null;

  const apiUrl = (path) => {
    const key = window.APP_CONFIG?.tflApiKey?.trim();
    const separator = path.includes("?") ? "&" : "?";
    return `${API}${path}${key ? `${separator}app_key=${encodeURIComponent(key)}` : ""}`;
  };

  const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);

  const fetchJson = async (path) => {
    const response = await fetch(apiUrl(path));
    if (!response.ok) throw new Error(`TfL request failed (${response.status})`);
    return response.json();
  };

  const stopLetter = (stop) => stop.stopLetter || stop.platformName || "•";
  const towards = (stop) => stop.towards || stop.additionalProperties?.find(item => item.key === "Towards")?.value || "Direction not supplied";
  const stopName = (stop) => stop.commonName || stop.stationName || "Unnamed stop";

  async function searchStops(query, limit = 12) {
    const data = await fetchJson(`/StopPoint/Search/${encodeURIComponent(query)}?modes=bus,coach,tube,overground,elizabeth-line,dlr,tram,national-rail,river-bus&includeHubs=true`);
    const matches = Array.isArray(data.matches) ? data.matches : [];
    const unique = new Map();
    matches.forEach(match => {
      const id = match.id || match.icsId;
      if (id && !unique.has(id)) unique.set(id, match);
    });
    return [...unique.values()].slice(0, limit);
  }

  async function expandStop(match) {
    if (!match.id) return match;
    try { return await fetchJson(`/StopPoint/${encodeURIComponent(match.id)}`); }
    catch { return match; }
  }

  function renderSuggestions(stops) {
    if (!stops.length) {
      suggestions.hidden = true;
      suggestions.innerHTML = "";
      return;
    }
    suggestions.innerHTML = stops.map((stop, index) => `
      <button class="suggestion" type="button" data-index="${index}">
        <strong>${escapeHtml(stop.name || stop.commonName)}</strong>
        <small>${escapeHtml(stop.modes?.join(", ") || stop.zone || "London stop or station")}</small>
      </button>`).join("");
    suggestions.hidden = false;
    suggestions.querySelectorAll(".suggestion").forEach(button => {
      button.addEventListener("click", async () => {
        const stop = await expandStop(stops[Number(button.dataset.index)]);
        suggestions.hidden = true;
        input.value = stopName(stop);
        showStopChoices([stop]);
      });
    });
  }

  function childStops(stop) {
    if (Array.isArray(stop.children) && stop.children.length) return stop.children;
    return [stop];
  }

  function showStopChoices(stops) {
    const choices = stops.flatMap(childStops).filter(stop => stop.id);
    if (!choices.length) {
      results.className = "good-service";
      results.textContent = "No individual boarding points were found. Try a nearby stop name or route number.";
      return;
    }
    heading.textContent = choices.length === 1 ? stopName(choices[0]) : "Choose a stop or direction";
    results.className = "";
    results.innerHTML = choices.map((stop, index) => `
      <button class="stop-choice" type="button" data-index="${index}">
        <span class="stop-letter">${escapeHtml(stopLetter(stop))}</span>
        <span><strong>${escapeHtml(stopName(stop))}</strong><small>Towards ${escapeHtml(towards(stop))}</small></span>
      </button>`).join("");
    results.querySelectorAll(".stop-choice").forEach(button => {
      button.addEventListener("click", () => loadArrivals(choices[Number(button.dataset.index)]));
    });
  }

  const dueText = seconds => {
    if (seconds <= 30) return "Due";
    const minutes = Math.max(1, Math.round(seconds / 60));
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  };

  async function loadArrivals(stop, silent = false) {
    selectedStop = stop;
    if (!silent) {
      heading.textContent = `${stopName(stop)} · Stop ${stopLetter(stop)}`;
      results.className = "status-text live-card-body";
      results.textContent = "Loading live arrivals…";
    }
    try {
      const arrivals = await fetchJson(`/StopPoint/${encodeURIComponent(stop.id)}/Arrivals`);
      arrivals.sort((a, b) => a.timeToStation - b.timeToStation);
      refreshButton.hidden = false;
      if (!arrivals.length) {
        results.className = "good-service";
        results.innerHTML = `<strong>No live arrivals</strong><p>There are currently no predictions for this stop.</p>`;
      } else {
        results.className = "";
        results.innerHTML = `<ul class="arrival-list">${arrivals.slice(0, 30).map(arrival => `
          <li class="arrival-item">
            <span class="arrival-route">${escapeHtml(arrival.lineName || arrival.modeName || "—")}</span>
            <span class="arrival-copy"><strong>${escapeHtml(arrival.destinationName || "Destination unavailable")}</strong><small>${escapeHtml(arrival.platformName || towards(stop))}${arrival.vehicleId ? ` · Vehicle ${escapeHtml(arrival.vehicleId)}` : ""}</small></span>
            <span class="arrival-time">${dueText(arrival.timeToStation || 0)}<small>${escapeHtml(arrival.modeName || "")}</small></span>
          </li>`).join("")}</ul>`;
      }
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => selectedStop && loadArrivals(selectedStop, true), 15000);
    } catch (error) {
      results.className = "good-service";
      results.innerHTML = `<strong>Live times could not be loaded</strong><p>${escapeHtml(error.message)}</p>`;
    }
  }

  async function loadRoute(route) {
    heading.textContent = `Route ${route} vehicles`;
    results.className = "status-text live-card-body";
    results.textContent = "Loading active vehicles…";
    selectedStop = null;
    refreshButton.hidden = true;
    try {
      const arrivals = await fetchJson(`/Line/${encodeURIComponent(route)}/Arrivals`);
      arrivals.sort((a, b) => a.destinationName.localeCompare(b.destinationName) || a.timeToStation - b.timeToStation);
      if (!arrivals.length) {
        results.className = "good-service";
        results.innerHTML = `<strong>No active vehicles found</strong><p>TfL is not currently returning predictions for route ${escapeHtml(route)}.</p>`;
        return;
      }
      results.className = "";
      results.innerHTML = `<ul class="arrival-list">${arrivals.slice(0, 60).map(arrival => `
        <li class="arrival-item">
          <span class="arrival-route">${escapeHtml(arrival.lineName)}</span>
          <span class="arrival-copy"><strong>${escapeHtml(arrival.destinationName || "Destination unavailable")}</strong><small>${escapeHtml(arrival.stationName || "Stop unavailable")}${arrival.vehicleId ? ` · Vehicle ${escapeHtml(arrival.vehicleId)}` : ""}</small></span>
          <span class="arrival-time">${dueText(arrival.timeToStation || 0)}</span>
        </li>`).join("")}</ul>`;
    } catch (error) {
      results.className = "good-service";
      results.innerHTML = `<strong>Route information could not be loaded</strong><p>${escapeHtml(error.message)}</p>`;
    }
  }

  async function runSearch() {
    const query = input.value.trim();
    suggestions.hidden = true;
    if (!query) return;
    if (/^[Nn]?\d{1,3}[A-Za-z]?$/.test(query)) return loadRoute(query.toUpperCase());
    heading.textContent = `Searching for “${query}”`;
    results.className = "status-text live-card-body";
    results.textContent = "Finding matching stops and stations…";
    refreshButton.hidden = true;
    selectedStop = null;
    try {
      const matches = await searchStops(query, 10);
      if (!matches.length) {
        results.className = "good-service";
        results.innerHTML = "<strong>No matching stops found</strong><p>Try a shorter name, nearby landmark, postcode or five-digit stop code.</p>";
        return;
      }
      const detailed = await Promise.all(matches.slice(0, 6).map(expandStop));
      showStopChoices(detailed);
    } catch (error) {
      results.className = "good-service";
      results.innerHTML = `<strong>Search unavailable</strong><p>${escapeHtml(error.message)}</p>`;
    }
  }

  input.addEventListener("input", () => {
    clearTimeout(suggestionTimer);
    const query = input.value.trim();
    if (query.length < 3 || /^[Nn]?\d{1,3}[A-Za-z]?$/.test(query)) return renderSuggestions([]);
    suggestionTimer = setTimeout(async () => {
      try { renderSuggestions(await searchStops(query, 7)); }
      catch { renderSuggestions([]); }
    }, 350);
  });
  input.addEventListener("keydown", event => { if (event.key === "Enter") runSearch(); });
  searchButton.addEventListener("click", runSearch);
  refreshButton.addEventListener("click", () => selectedStop && loadArrivals(selectedStop));
  document.addEventListener("click", event => { if (!event.target.closest(".universal-search")) suggestions.hidden = true; });

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
})();
