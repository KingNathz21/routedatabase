(() => {
  const navLinks = [...document.querySelectorAll('.site-nav a, .brand')]
    .filter(link => link.origin === window.location.origin);
  const prefetched = new Set();

  function prefetch(link) {
    const url = new URL(link.href, window.location.href);
    if (url.pathname === window.location.pathname || prefetched.has(url.href)) return;
    prefetched.add(url.href);
    const hint = document.createElement('link');
    hint.rel = 'prefetch';
    hint.href = url.href;
    hint.as = 'document';
    document.head.appendChild(hint);
  }

  navLinks.forEach(link => {
    link.addEventListener('pointerenter', () => prefetch(link), { passive: true });
    link.addEventListener('touchstart', () => prefetch(link), { passive: true });
    link.addEventListener('focus', () => prefetch(link), { passive: true });
    link.addEventListener('pointerdown', () => link.classList.add('nav-pressed'), { passive: true });
    link.addEventListener('pointerup', () => link.classList.remove('nav-pressed'), { passive: true });
    link.addEventListener('pointercancel', () => link.classList.remove('nav-pressed'), { passive: true });
  });

  const warmNavigation = () => navLinks.forEach(prefetch);
  if ('requestIdleCallback' in window) window.requestIdleCallback(warmNavigation, { timeout: 1500 });
  else window.setTimeout(warmNavigation, 600);
})();


// Shared accessibility and usability tools. Preferences are local to this browser.
(() => {
  const storageKey = "routeflow:accessibility";
  const defaults = { scale: 1, contrast: false, motion: false, spacing: false };
  let preferences = { ...defaults };
  try { preferences = { ...defaults, ...JSON.parse(localStorage.getItem(storageKey) || "{}") }; } catch { /* Use defaults. */ }

  const main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main-content";
    const skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#" + main.id;
    skip.textContent = "Skip to main content";
    document.body.prepend(skip);
  }

  document.querySelectorAll(".site-nav a, .mobile-app-nav a").forEach(link => {
    const target = new URL(link.href, location.href);
    if (target.pathname === location.pathname || (target.pathname.endsWith("/") && location.pathname.endsWith("/"))) {
      link.setAttribute("aria-current", "page");
    }
  });

  const toolbar = document.createElement("div");
  toolbar.className = "accessibility-tools";
  toolbar.innerHTML = `
    <button class="accessibility-trigger" type="button" aria-expanded="false" aria-controls="accessibility-panel">Accessibility</button>
    <section class="accessibility-panel" id="accessibility-panel" aria-label="Display and accessibility settings" hidden>
      <div class="accessibility-panel-heading"><strong>Make RouteFlow easier to use</strong><button class="accessibility-close" type="button" aria-label="Close accessibility settings">×</button></div>
      <div class="accessibility-control"><span>Text size</span><div><button type="button" data-scale="down" aria-label="Decrease text size">A−</button><button type="button" data-scale="up" aria-label="Increase text size">A+</button></div></div>
      <label class="accessibility-option"><input type="checkbox" data-pref="contrast"> High contrast</label>
      <label class="accessibility-option"><input type="checkbox" data-pref="motion"> Reduce animation</label>
      <label class="accessibility-option"><input type="checkbox" data-pref="spacing"> Increase text spacing</label>
      <button class="accessibility-reset" type="button">Reset display settings</button>
      <p class="accessibility-note">Settings are saved on this device. You can change them at any time.</p>
    </section>`;
  document.body.append(toolbar);

  const panel = toolbar.querySelector(".accessibility-panel");
  const trigger = toolbar.querySelector(".accessibility-trigger");
  const apply = () => {
    document.documentElement.style.setProperty("--rf-text-scale", String(preferences.scale));
    document.body.classList.toggle("rf-high-contrast", preferences.contrast);
    document.body.classList.toggle("rf-reduce-motion", preferences.motion);
    document.body.classList.toggle("rf-extra-spacing", preferences.spacing);
    toolbar.querySelectorAll("[data-pref]").forEach(input => { input.checked = Boolean(preferences[input.dataset.pref]); });
  };
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Settings still apply for this page. */ }
    apply();
  };
  trigger.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) panel.querySelector("button")?.focus();
  });
  toolbar.querySelector(".accessibility-close").addEventListener("click", () => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  });
  toolbar.querySelectorAll("[data-pref]").forEach(input => input.addEventListener("change", () => {
    preferences[input.dataset.pref] = input.checked;
    save();
  }));
  toolbar.querySelector('[data-scale="down"]').addEventListener("click", () => {
    preferences.scale = Math.max(.9, Math.round((preferences.scale - .05) * 100) / 100);
    save();
  });
  toolbar.querySelector('[data-scale="up"]').addEventListener("click", () => {
    preferences.scale = Math.min(1.3, Math.round((preferences.scale + .05) * 100) / 100);
    save();
  });
  toolbar.querySelector(".accessibility-reset").addEventListener("click", () => {
    preferences = { ...defaults };
    save();
  });
  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.focus();
    }
  });
  apply();
})();
