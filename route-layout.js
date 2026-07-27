(() => {
  const originalRenderDetail = renderDetail;

  function listItems(value) {
    if (Array.isArray(value)) {
      return value.map(item => String(item).trim()).filter(Boolean);
    }
    return String(value || "")
      .split(/\n|\||•|;/)
      .map(item => item.trim())
      .filter(Boolean);
  }

  function removeDuplicateCards() {
    const hiddenFields = new Set(["Number of Stops", "Via", "PVR", "Images"]);
    document.querySelectorAll(".detail-card").forEach(card => {
      if (hiddenFields.has(card.dataset.field)) card.remove();
    });
  }

  function renderViaItems(items, source = "saved") {
    const list = document.getElementById("routeViaList");
    const empty = document.getElementById("routeViaEmpty");
    const note = document.getElementById("routeViaSource");
    if (!list || !empty) return;

    if (!items.length) {
      list.hidden = true;
      list.innerHTML = "";
      empty.hidden = false;
      empty.textContent = "Loading key places from the live TfL stop sequence…";
      if (note) note.textContent = "";
      return;
    }

    list.innerHTML = items.map(place => `<li>${escapeHtml(place)}</li>`).join("");
    list.hidden = false;
    empty.hidden = true;
    if (note) note.textContent = source === "tfl" ? "Generated from the current TfL stop sequence" : "Saved route information";
  }

  function deriveViaFromRenderedStops() {
    const stopNames = [...document.querySelectorAll("#stopSequences .stop-copy strong")]
      .map(item => item.textContent.trim())
      .filter(Boolean)
      .filter((name, index, array) => array.indexOf(name) === index);

    if (stopNames.length < 3) return;

    const middle = stopNames.slice(1, -1);
    const maximum = Math.min(7, middle.length);
    const selected = [];

    for (let index = 0; index < maximum; index += 1) {
      const position = Math.round(index * (middle.length - 1) / Math.max(1, maximum - 1));
      const place = middle[position];
      if (place && !selected.includes(place)) selected.push(place);
    }

    if (selected.length) renderViaItems(selected, "tfl");
  }

  function watchTfLStops() {
    const stops = document.getElementById("stopSequences");
    if (!stops) return;
    const observer = new MutationObserver(() => deriveViaFromRenderedStops());
    observer.observe(stops, { childList: true, subtree: true });
    deriveViaFromRenderedStops();
  }

  function addRouteInformation(route) {
    const grid = document.querySelector(".detail-grid");
    if (!grid) return;

    removeDuplicateCards();

    const pvr = String(route.PVR || "Not yet recorded").trim();
    const pvrCard = document.createElement("div");
    pvrCard.className = "detail-card route-pvr-card";
    pvrCard.innerHTML = `<span>PVR</span><strong>${escapeHtml(pvr)}</strong>`;
    grid.appendChild(pvrCard);

    const savedVia = listItems(route.Via);
    const viaSection = document.createElement("section");
    viaSection.className = "via-section";
    viaSection.setAttribute("aria-labelledby", "routeViaHeading");
    viaSection.innerHTML = `
      <div class="via-heading">
        <div>
          <span class="eyebrow">Route information</span>
          <h3 id="routeViaHeading">Via</h3>
          <p>Key places served between the start and destination.</p>
        </div>
        <span class="via-badge">Key stops</span>
      </div>
      <ol id="routeViaList" class="via-list" ${savedVia.length ? "" : "hidden"}></ol>
      <p id="routeViaEmpty" class="via-empty" ${savedVia.length ? "hidden" : ""}>Loading key places from the live TfL stop sequence…</p>
      <small id="routeViaSource" class="via-source"></small>
    `;
    grid.insertAdjacentElement("afterend", viaSection);
    renderViaItems(savedVia);
  }

  function makeStopsCollapsible() {
    const panel = document.querySelector(".live-panel");
    const tabs = document.getElementById("directionTabs");
    const stops = document.getElementById("stopSequences");
    const message = document.getElementById("apiMessage");
    if (!panel || !tabs || !stops) return;

    if (message) message.hidden = true;

    const heading = panel.querySelector(".live-heading h3");
    const description = panel.querySelector(".live-heading p");
    if (heading) heading.textContent = "Full route stops";
    if (description) description.textContent = "Open the complete live TfL stop sequence when needed.";

    const details = document.createElement("details");
    details.className = "full-stops-details";

    const summary = document.createElement("summary");
    summary.innerHTML = '<span class="expand-label">Expand full stop list</span><span class="expand-icon" aria-hidden="true">+</span>';
    details.appendChild(summary);
    details.appendChild(tabs);
    details.appendChild(stops);
    panel.appendChild(details);

    details.addEventListener("toggle", () => {
      const label = details.querySelector(".expand-label");
      const icon = details.querySelector(".expand-icon");
      if (label) label.textContent = details.open ? "Hide full stop list" : "Expand full stop list";
      if (icon) icon.textContent = details.open ? "−" : "+";
    });
  }

  function enhanceRouteDetail() {
    const route = state.selected;
    if (!route) return;
    addRouteInformation(route);
    makeStopsCollapsible();
    watchTfLStops();
  }

  renderDetail = function () {
    originalRenderDetail();
    enhanceRouteDetail();
  };
})();