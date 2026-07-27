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

  requestIdleCallback?.(() => navLinks.forEach(prefetch), { timeout: 1500 });
})();
