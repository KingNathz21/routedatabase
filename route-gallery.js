(() => {
  const previousRenderDetail = renderDetail;

  function normaliseGallery(route) {
    const raw = Array.isArray(route.Images) ? route.Images : [];

    const images = raw.map((item, index) => {
      if (typeof item === "string") {
        return { src: item.trim(), alt: `Route ${route.Route} photo ${index + 1}` };
      }
      return {
        src: String(item?.src || item?.image || "").trim(),
        alt: String(item?.alt || `Route ${route.Route} photo ${index + 1}`).trim(),
        credit: String(item?.credit || "").trim(),
        source: String(item?.source || "").trim(),
        license: String(item?.license || "").trim(),
        licenseLabel: String(item?.licenseLabel || "").trim()
      };
    }).filter(item => item.src);

    return images.slice(0, 8);
  }

  function buildGallery(route) {
    const oldImage = document.querySelector(".detail-image");
    if (!oldImage) return;

    const images = normaliseGallery(route);
    const gallery = document.createElement("section");
    gallery.className = `route-gallery${images.length ? "" : " route-gallery-empty"}`;
    gallery.setAttribute("aria-label", `Route ${route.Route} photo gallery`);

    if (!images.length) {
      gallery.innerHTML = `
        <div class="gallery-empty-state">
          <span class="gallery-empty-route">${escapeHtml(route.Route)}</span>
          <div>
            <strong>Route photography unavailable</strong>
            <small>Verified photographs have not yet been added for this service.</small>
          </div>
        </div>
      `;
      oldImage.replaceWith(gallery);
      return;
    }

    gallery.innerHTML = `
      <div class="gallery-main">
        <img class="gallery-main-image" src="${escapeHtml(images[0].src)}" alt="${escapeHtml(images[0].alt)}">
        ${images.length > 1 ? `
          <button class="gallery-arrow gallery-previous" type="button" aria-label="Previous photo">‹</button>
          <button class="gallery-arrow gallery-next" type="button" aria-label="Next photo">›</button>
          <span class="gallery-counter" aria-live="polite">1 / ${images.length}</span>
        ` : '<span class="gallery-counter">1 photo</span>'}
      </div>
      ${images.length > 1 ? `
        <div class="gallery-thumbnails" role="list" aria-label="Choose a route photo">
          ${images.map((image, index) => `
            <button class="gallery-thumbnail${index === 0 ? " active" : ""}" type="button" data-gallery-index="${index}" aria-label="Show photo ${index + 1}" aria-current="${index === 0 ? "true" : "false"}">
              <img src="${escapeHtml(image.src)}" alt="">
            </button>
          `).join("")}
        </div>
      ` : ""}
    `;

    oldImage.replaceWith(gallery);
    const attribution = document.createElement("p");
    attribution.className = "gallery-attribution";
    gallery.appendChild(attribution);
    function showAttribution(image) {
      const safeSource = /^https:\/\//i.test(image.source) ? image.source : "";
      const safeLicense = /^https:\/\//i.test(image.license) ? image.license : "";
      const credit = image.credit ? `Photo: ${escapeHtml(image.credit)}` : "";
      const sourceLink = safeSource ? `<a href="${escapeHtml(safeSource)}" target="_blank" rel="noopener noreferrer">Source</a>` : "";
      const licenseLink = image.licenseLabel
        ? (safeLicense ? `<a href="${escapeHtml(safeLicense)}" target="_blank" rel="noopener noreferrer">${escapeHtml(image.licenseLabel)}</a>` : `<span>${escapeHtml(image.licenseLabel)}</span>`)
        : "";
      attribution.innerHTML = [credit, sourceLink, licenseLink].filter(Boolean).join(" · ");
      attribution.hidden = !attribution.textContent.trim();
    }
    showAttribution(images[0]);
    if (images.length < 2) return;

    let activeIndex = 0;
    const mainImage = gallery.querySelector(".gallery-main-image");
    const counter = gallery.querySelector(".gallery-counter");
    const thumbnails = [...gallery.querySelectorAll(".gallery-thumbnail")];

    function showImage(index) {
      activeIndex = (index + images.length) % images.length;
      const selected = images[activeIndex];
      mainImage.src = selected.src;
      mainImage.alt = selected.alt;
      showAttribution(selected);
      counter.textContent = `${activeIndex + 1} / ${images.length}`;
      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        const active = thumbnailIndex === activeIndex;
        thumbnail.classList.toggle("active", active);
        thumbnail.setAttribute("aria-current", active ? "true" : "false");
      });
    }

    gallery.querySelector(".gallery-previous")?.addEventListener("click", () => showImage(activeIndex - 1));
    gallery.querySelector(".gallery-next")?.addEventListener("click", () => showImage(activeIndex + 1));
    thumbnails.forEach(thumbnail => thumbnail.addEventListener("click", () => showImage(Number(thumbnail.dataset.galleryIndex))));
  }

  renderDetail = function () {
    previousRenderDetail();
    if (state.selected) buildGallery(state.selected);
  };
})();