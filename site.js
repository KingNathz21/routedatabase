(() => {
  const button = document.querySelector('#themeButton');
  if (button) {
    const apply = dark => {
      document.body.classList.toggle('dark', dark);
      button.textContent = dark ? 'Light mode' : 'Dark mode';
    };
    apply(localStorage.getItem('rfl-theme') === 'dark');
    button.addEventListener('click', () => {
      const dark = !document.body.classList.contains('dark');
      localStorage.setItem('rfl-theme', dark ? 'dark' : 'light');
      apply(dark);
    });
  }

  document.querySelectorAll('.operator-logo img').forEach(image => {
    const showFallback = () => image.closest('.operator-logo')?.classList.add('logo-fallback');
    if (image.complete && image.naturalWidth === 0) showFallback();
    image.addEventListener('error', showFallback, { once: true });
  });
})();