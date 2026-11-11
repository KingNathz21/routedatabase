(() => {
  const button = document.querySelector("#themeButton");
  const applyTheme = dark => {
    document.body.classList.toggle("dark", dark);
    if (button) button.textContent = dark ? "Light mode" : "Dark mode";
  };
  applyTheme(localStorage.getItem("rfl-theme") === "dark");
  button?.addEventListener("click", () => {
    const dark = !document.body.classList.contains("dark");
    localStorage.setItem("rfl-theme", dark ? "dark" : "light");
    applyTheme(dark);
  });
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => navigator.serviceWorker.register("./service-worker.js").catch(() => {}), { once: true });
  }
})();