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

  function routeExtras(route) {
    return window.ROUTE_INFO?.[String(route.Route)] || {};
  }

  function removeDuplicateCards() {
    const hiddenFields = new Set(["Number of Stops", "Via", "PVR", "Images"]);
    document.querySelectorAll(".detail-card").forEach(card => {
      if (hiddenFields.has(card.dataset.field)) card.remove();
    });
  }

  function addCardBadge(card, text) {
    if (!card || card.querySelector(".detail-card-badge")) return;
    const badge = document.createElement("span");
    badge.className = "detail-card-badge";
    badge.textContent = text;
    card.appendChild(badge);
  }

  function organiseInformationCards(grid) {
    const cards = [...grid.querySelectorAll(".detail-card")];
    const preferredOrder = [
      "Start",
      "Former Start",
      "Destination",
      "Former Destination",
      "Operator",
      "Final Operator",
      "Garage",
      "Final Garage",
      "Route Type"
    ];

    const preferredCards = preferredOrder
      .map(field => cards.find(item => item.dataset.field === field))
      .filter(Boolean);
    const remainingCards = cards.filter(card => !preferredCards.includes(card));
    [...preferredCards, ...remainingCards].forEach(card => grid.appendChild(card));

    const badgeLabels = {
      Start: "Start point",
      "Former Start": "Start point",
      Destination: "Terminus",
      "Former Destination": "Terminus",
      Operator: "Operator",
      "Final Operator": "Operator",
      Garage: "Garage",
      "Final Garage": "Garage"
    };

    Object.entries(badgeLabels).forEach(([field, label]) => {
      const card = grid.querySelector(`.detail-card[data-field="${field}"]`);
      addCardBadge(card, label);
    });
  }

  function buildViaSection(route) {
    const extras = routeExtras(route);
    const via = listItems(extras.Via ?? route.Via);
    const section = document.createElement("section");
    section.className = "via-section";
    section.setAttribute("aria-labelledby", "routeViaHeading");
    section.innerHTML = `
      <div class="via-heading">
        <div>
          <span class="eyebrow">Route information</span>
          <h3 id="routeViaHeading">Via</h3>
          <p>Key places served between the start and destination.</p>
        </div>
        <span class="via-badge">Key stops</span>
      </div>
      ${via.length
        ? `<ol class="via-list">${via.map(place => `<li>${escapeHtml(place)}</li>`).join("")}</ol>`
        : `<div class="via-empty"><strong>No Via places added yet</strong><span>Edit this route in <code>routes.js</code> to add them.</span></div>`}
      <small class="via-source">Manually managed in routes.js</small>
    `;
    return section;
  }

  function addRouteInformation(route) {
    const grid = document.querySelector(".detail-grid");
    if (!grid) return;

    removeDuplicateCards();

    const heading = document.createElement("div");
    heading.className = "route-information-heading";
    heading.innerHTML = `
      <div>
        <span class="eyebrow">Route information</span>
        <h3>Service details</h3>
      </div>
      <span class="route-information-badge">Route ${escapeHtml(route.Route)}</span>
    `;
    grid.prepend(heading);

    organiseInformationCards(grid);

    const viaSection = buildViaSection(route);
    const destinationCard = grid.querySelector('.detail-card[data-field="Destination"], .detail-card[data-field="Former Destination"]');
    if (destinationCard) destinationCard.insertAdjacentElement("afterend", viaSection);
    else heading.insertAdjacentElement("afterend", viaSection);

    const pvr = String(routeExtras(route).PVR ?? route.PVR ?? "Not yet recorded").trim();
    const pvrCard = document.createElement("div");
    pvrCard.className = "detail-card route-pvr-card";
    pvrCard.dataset.field = "PVR";
    pvrCard.innerHTML = `<span>PVR</span><strong>${escapeHtml(pvr)}</strong><span class="detail-card-badge">Vehicles</span>`;
    grid.appendChild(pvrCard);
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
  }

  renderDetail = function () {
    originalRenderDetail();
    enhanceRouteDetail();
  };
})();
