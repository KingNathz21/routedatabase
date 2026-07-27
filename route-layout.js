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
    const hiddenFields = new Set(["Number of Stops", "Via", "PVR"]);
    document.querySelectorAll(".detail-card").forEach(card => {
      if (hiddenFields.has(card.dataset.field)) card.remove();
    });
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

    const via = listItems(route.Via);
    const viaSection = document.createElement("section");
    viaSection.className = "via-section";
    viaSection.innerHTML = `
      <div class="via-heading">
        <span class="eyebrow">Route information</span>
        <h3>Via</h3>
      </div>
      ${via.length
        ? `<ul>${via.map(place => `<li>${escapeHtml(place)}</li>`).join("")}</ul>`
        : '<p class="via-empty">Via points have not yet been added for this route.</p>'}
    `;
    grid.insertAdjacentElement("afterend", viaSection);
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
