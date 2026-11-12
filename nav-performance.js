(() => {
  const pageLinks = [
    { href: "index.html", label: "Home", icon: "⌂" },
    { href: "routes.html", label: "Routes", icon: "⇄" },
    { href: "journey-planner.html", label: "Plan", icon: "⇢" },
    { href: "arrivals.html", label: "Arrivals", icon: "◷" },
    { href: "dashboard.html", label: "Account", icon: "◉" }
  ];
  const currentPath = location.pathname.split("/").pop() || "index.html";
  const navLinks = [...document.querySelectorAll(".site-nav a, .brand")].filter(link => link.origin === location.origin);
  const prefetched = new Set();

  // Keep the header focused on the four most-used destinations.
  const desktopNav = document.querySelector(".site-nav");
  if (desktopNav) {
    let more = desktopNav.querySelector(".nav-more");
    if (!more) {
      more = document.createElement("details");
      more.className = "nav-more";
      more.innerHTML = '<summary>More</summary><div class="nav-more-menu"></div>';
      desktopNav.append(more);
    }
    const menu = more.querySelector(".nav-more-menu");
    ["disruptions.html", "operators.html", "fleet.html"].forEach(file => {
      const link = [...desktopNav.querySelectorAll(":scope > a")].find(item => item.pathname.endsWith(file));
      if (link) menu.append(link);
    });
    if (!menu.querySelector('a[href="routes.html?status=withdrawn"]')) {
      const withdrawn = document.createElement("a");
      withdrawn.href = "routes.html?status=withdrawn";
      withdrawn.textContent = "Withdrawn routes";
      menu.append(withdrawn);
    }
    if (!menu.querySelector('a[href="blog.html"]')) {
      const blog = document.createElement("a");
      blog.href = "blog.html";
      blog.textContent = "Guides & updates";
      menu.append(blog);
    }
    if (["disruptions.html", "operators.html", "fleet.html", "blog.html"].includes(currentPath)) {
      more.classList.add("nav-more-current");
      more.open = false;
    }
  }

  function prefetch(link) {
    const url = new URL(link.href, location.href);
    if (url.pathname === location.pathname || prefetched.has(url.href)) return;
    prefetched.add(url.href);
    const hint = document.createElement("link");
    hint.rel = "prefetch";
    hint.href = url.href;
    hint.as = "document";
    document.head.appendChild(hint);
  }
  navLinks.forEach(link => {
    link.addEventListener("pointerenter", () => prefetch(link), { passive: true });
    link.addEventListener("focus", () => prefetch(link), { passive: true });
  });
  const warmNavigation = () => navLinks.forEach(prefetch);
  if ("requestIdleCallback" in window) window.requestIdleCallback(warmNavigation, { timeout: 1800 });
  else window.setTimeout(warmNavigation, 700);

  // Keep one consistent mobile tab bar on every page.
  let mobileNav = document.querySelector(".mobile-app-nav");
  if (!mobileNav) {
    mobileNav = document.createElement("nav");
    mobileNav.className = "mobile-app-nav";
    mobileNav.setAttribute("aria-label", "Main navigation");
    document.body.append(mobileNav);
  }
  mobileNav.innerHTML = pageLinks.map(item => {
    const accountPage = ["dashboard.html", "profile.html", "settings.html", "login.html"].includes(currentPath);
    const active = currentPath === item.href || (item.href === "dashboard.html" && accountPage);
    return `<a href="${item.href}" class="${active ? "active" : ""}" ${active ? 'aria-current="page"' : ""}><span class="mobile-nav-icon" aria-hidden="true">${item.icon}</span><span>${item.label}</span></a>`;
  }).join("");

  const footer = document.querySelector("footer");
  if (footer && !footer.querySelector(".site-footer-links")) {
    const footerLinks = document.createElement("nav");
    footerLinks.className = "site-footer-links";
    footerLinks.setAttribute("aria-label", "More RouteFlow pages");
    footerLinks.innerHTML = '<a href="routes.html?status=withdrawn">Withdrawn routes</a><a href="blog.html">Guides & updates</a><a href="dashboard.html">My account</a>';
    footer.append(footerLinks);
  }

  const main = document.querySelector("main");
  if (main) {
    if (!main.id) main.id = "main-content";
    if (!document.querySelector(".skip-link")) {
      const skip = document.createElement("a");
      skip.className = "skip-link";
      skip.href = "#" + main.id;
      skip.textContent = "Skip to main content";
      document.body.prepend(skip);
    }
  }
  document.querySelectorAll(".site-nav a, .mobile-app-nav a").forEach(link => {
    const target = new URL(link.href, location.href);
    if (target.pathname === location.pathname) link.setAttribute("aria-current", "page");
  });

  const storageKey = "routeflow:accessibility";
  const defaults = { scale: 1, contrast: false, motion: false, spacing: false };
  let preferences = { ...defaults };
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    if (stored && typeof stored === "object") preferences = { ...defaults, ...stored };
  } catch { /* Defaults remain available when storage is disabled. */ }
  preferences.scale = Math.min(1.3, Math.max(.9, Number(preferences.scale) || 1));

  const toolbar = document.createElement("div");
  toolbar.className = "accessibility-tools";
  toolbar.innerHTML = `
    <button class="accessibility-trigger" type="button" aria-expanded="false" aria-controls="accessibility-panel">Accessibility</button>
    <section class="accessibility-panel" id="accessibility-panel" aria-label="Display and accessibility settings" hidden>
      <div class="accessibility-panel-heading"><strong>Display settings</strong><button class="accessibility-close" type="button" aria-label="Close accessibility settings">×</button></div>
      <div class="accessibility-control"><span>Text size</span><div><button type="button" data-scale="down" aria-label="Decrease text size">A−</button><button type="button" data-scale="up" aria-label="Increase text size">A+</button></div></div>
      <label class="accessibility-option"><input type="checkbox" data-pref="contrast"> High contrast</label>
      <label class="accessibility-option"><input type="checkbox" data-pref="motion"> Reduce animation</label>
      <label class="accessibility-option"><input type="checkbox" data-pref="spacing"> Increase text spacing</label>
      <button class="accessibility-reset" type="button">Reset settings</button>
      <p class="accessibility-note">Saved on this device.</p>
    </section>`;
  document.body.append(toolbar);
  const panel = toolbar.querySelector(".accessibility-panel");
  const trigger = toolbar.querySelector(".accessibility-trigger");
  const apply = () => {
    document.documentElement.style.fontSize = `${preferences.scale * 100}%`;
    document.body.classList.toggle("rf-high-contrast", Boolean(preferences.contrast));
    document.body.classList.toggle("rf-reduce-motion", Boolean(preferences.motion));
    document.body.classList.toggle("rf-extra-spacing", Boolean(preferences.spacing));
    toolbar.querySelectorAll("[data-pref]").forEach(input => { input.checked = Boolean(preferences[input.dataset.pref]); });
  };
  const save = () => {
    try { localStorage.setItem(storageKey, JSON.stringify(preferences)); } catch { /* Settings still apply for this page. */ }
    apply();
  };
  const closePanel = () => {
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    trigger.focus();
  };
  trigger.addEventListener("click", () => {
    const open = panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (open) panel.querySelector("button")?.focus();
  });
  toolbar.querySelector(".accessibility-close").addEventListener("click", closePanel);
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
    if (event.key === "Escape" && !panel.hidden) closePanel();
  });
  apply();
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
  }
})();