(() => {
  const originalRenderDetail = renderDetail;

  function listItems(value) {
    if (Array.isArray(value)) return value.map(item => String(item).trim()).filter(Boolean);
    return String(value || "").split(/\n|\||•|;/).map(item => item.trim()).filter(Boolean);
  }

  function removeFields(grid, fields) {
    grid.querySelectorAll(".detail-card").forEach(card => {
      if (fields.has(card.dataset.field)) card.remove();
    });
  }

  function infoCard(label, content, className = "") {
    return `<article class="route-info-card ${className}"><span class="route-info-label">${escapeHtml(label)}</span>${content}</article>`;
  }

  function buildRouteInformation(route) {
    const start = route.Start || route["Former Start"] || "Not yet recorded";
    const destination = route.Destination || route["Former Destination"] || "Not yet recorded";
    const via = listItems(route.Via);
    const operatorName = route.Operator || route["Final Operator"] || "Operator not recorded";
    const operatorLogo = String(route.OperatorLogo || "").trim();
    const operatorLogoAlt = String(route.OperatorLogoAlt || operatorName).trim();
    const pvr = String(route.PVR || "Not yet recorded").trim();

    const operatorContent = operatorLogo
      ? `<img class="operator-logo" src="${escapeHtml(operatorLogo)}" alt="${escapeHtml(operatorLogoAlt)}">`
      : `<strong>${escapeHtml(operatorName)}</strong>`;

    const viaContent = via.length
      ? `<ol class="route-via-list">${via.map(place => `<li>${escapeHtml(place)}</li>`).join("")}</ol>`
      : `<p class="route-info-empty">No Via places have been added. Edit this route in <code>data/routes.json</code>.</p>`;

    const section = document.createElement("section");
    section.className = "route-information-section";
    section.setAttribute("aria-labelledby", "routeInformationHeading");
    section.innerHTML = `
      <header class="route-information-title">
        <span class="eyebrow">Route information</span>
        <h3 id="routeInformationHeading">Service details</h3>
      </header>
      <div class="route-information-grid">
        ${infoCard("Start", `<strong>${escapeHtml(start)}</strong>`)}
        ${infoCard("Destination", `<strong>${escapeHtml(destination)}</strong>`)}
        ${infoCard("Via", viaContent, "route-info-via")}
        ${infoCard("Operator", operatorContent, "route-info-operator")}
        ${infoCard("PVR", `<strong>${escapeHtml(pvr)}</strong>`)}
      </div>
    `;
    return section;
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
    const grid = document.querySelector(".detail-grid");
    const hero = document.querySelector(".detail-hero");
    if (!route || !grid || !hero) return;

    document.querySelector(".detail-copy .status-pill")?.remove();
    removeFields(grid, new Set([
      "Start", "Former Start", "Destination", "Former Destination",
      "Via", "Operator", "Final Operator", "OperatorLogo", "OperatorLogoAlt",
      "PVR", "Images", "Image", "ImageAlt", "Number of Stops"
    ]));

    hero.insertAdjacentElement("afterend", buildRouteInformation(route));
    makeStopsCollapsible();
  }

  renderDetail = function () {
    originalRenderDetail();
    enhanceRouteDetail();
  };
})();