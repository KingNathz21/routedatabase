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
        alt: String(item?.alt || `Route ${route.Route} photo ${index + 1}`).trim()
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
            <strong>Route photos coming soon</strong>
            <small>Add image paths to this route's <code>Images</code> list in <code>data/routes.json</code>.</small>
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
    if (images.length < 2) return;

    let activeIndex = 0;
    let autoplayTimer = null;
    const mainImage = gallery.querySelector(".gallery-main-image");
    const counter = gallery.querySelector(".gallery-counter");
    const thumbnails = [...gallery.querySelectorAll(".gallery-thumbnail")];

    function showImage(index) {
      activeIndex = (index + images.length) % images.length;
      const selected = images[activeIndex];
      mainImage.src = selected.src;
      mainImage.alt = selected.alt;
      counter.textContent = `${activeIndex + 1} / ${images.length}`;
      thumbnails.forEach((thumbnail, thumbnailIndex) => {
        const active = thumbnailIndex === activeIndex;
        thumbnail.classList.toggle("active", active);
        thumbnail.setAttribute("aria-current", active ? "true" : "false");
      });
    }

    function startAutoplay() {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      clearInterval(autoplayTimer);
      autoplayTimer = setInterval(() => showImage(activeIndex + 1), 5000);
    }

    gallery.querySelector(".gallery-previous")?.addEventListener("click", () => { showImage(activeIndex - 1); startAutoplay(); });
    gallery.querySelector(".gallery-next")?.addEventListener("click", () => { showImage(activeIndex + 1); startAutoplay(); });
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener("click", () => { showImage(Number(thumbnail.dataset.galleryIndex)); startAutoplay(); });
    });
    gallery.addEventListener("mouseenter", () => clearInterval(autoplayTimer));
    gallery.addEventListener("mouseleave", startAutoplay);
    gallery.addEventListener("focusin", () => clearInterval(autoplayTimer));
    gallery.addEventListener("focusout", startAutoplay);
    startAutoplay();
  }

  renderDetail = function () {
    previousRenderDetail();
    if (state.selected) buildGallery(state.selected);
  };
})();