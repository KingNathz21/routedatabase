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

    if (!images.length && route.Image) {
      images.push({
        src: String(route.Image).trim(),
        alt: String(route.ImageAlt || `Route ${route.Route}`).trim()
      });
    }

    return images.slice(0, 5);
  }

  function buildGallery(route) {
    const oldImage = document.querySelector(".detail-image");
    if (!oldImage) return;

    const images = normaliseGallery(route);
    if (!images.length) return;

    const gallery = document.createElement("section");
    gallery.className = "route-gallery";
    gallery.setAttribute("aria-label", `Route ${route.Route} photo gallery`);

    gallery.innerHTML = `
      <div class="gallery-main">
        <img class="gallery-main-image" src="${escapeHtml(images[0].src)}" alt="${escapeHtml(images[0].alt)}">
        ${images.length > 1 ? `
          <button class="gallery-arrow gallery-previous" type="button" aria-label="Previous photo">‹</button>
          <button class="gallery-arrow gallery-next" type="button" aria-label="Next photo">›</button>
          <span class="gallery-counter" aria-live="polite">1 / ${images.length}</span>
        ` : ""}
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

    gallery.querySelector(".gallery-previous")?.addEventListener("click", () => showImage(activeIndex - 1));
    gallery.querySelector(".gallery-next")?.addEventListener("click", () => showImage(activeIndex + 1));
    thumbnails.forEach(thumbnail => {
      thumbnail.addEventListener("click", () => showImage(Number(thumbnail.dataset.galleryIndex)));
    });
  }

  renderDetail = function () {
    previousRenderDetail();
    if (state.selected) buildGallery(state.selected);
  };
})();