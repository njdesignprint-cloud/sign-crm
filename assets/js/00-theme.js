(function () {
  function applyLightTheme() {
    document.documentElement.dataset.themeMode = "light";
    document.documentElement.dataset.theme = "light";
    document.documentElement.style.colorScheme = "light";
    try { localStorage.removeItem("signshophq_theme_v1"); } catch (_) {}
  }

  applyLightTheme();
  window.SignShopTheme = { apply: applyLightTheme, current: () => "light" };
})();
