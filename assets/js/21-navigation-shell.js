(function () {
  "use strict";

  const STORAGE_KEY = "signshophq_sidebar_collapsed_v1";
  const MOBILE_QUERY = "(max-width: 780px)";

  const sidebar = document.getElementById("appSidebar");
  const collapseButton = document.getElementById("btnSidebarCollapse");
  const mobileOpenButton = document.getElementById("btnMobileNavOpen");
  const mobileCloseButton = document.getElementById("btnMobileNavClose");
  const mobileBackdrop = document.getElementById("mobileNavBackdrop");
  const mobileMedia = window.matchMedia(MOBILE_QUERY);

  if (!sidebar || !collapseButton || !mobileOpenButton || !mobileCloseButton || !mobileBackdrop) return;

  function readCollapsedPreference() {
    try { return localStorage.getItem(STORAGE_KEY) === "true"; }
    catch (_) { return false; }
  }

  function storeCollapsedPreference(collapsed) {
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); }
    catch (_) {}
  }

  function applyDesktopState(collapsed) {
    document.body.classList.toggle("sidebar-collapsed", !mobileMedia.matches && collapsed);
    collapseButton.setAttribute("aria-expanded", String(!collapsed));
    collapseButton.setAttribute("aria-label", collapsed ? "Expand navigation" : "Collapse navigation");
    collapseButton.textContent = collapsed ? "›" : "‹";
  }

  function openMobileNavigation() {
    if (!mobileMedia.matches) return;
    document.body.classList.add("mobile-nav-open");
    mobileOpenButton.setAttribute("aria-expanded", "true");
    mobileCloseButton.focus();
  }

  function closeMobileNavigation() {
    document.body.classList.remove("mobile-nav-open");
    mobileOpenButton.setAttribute("aria-expanded", "false");
  }

  document.querySelectorAll(".nav button[data-view]").forEach(button => {
    const label = String(button.textContent || "").trim();
    if (label) button.title = label;
    button.addEventListener("click", closeMobileNavigation);
  });

  collapseButton.addEventListener("click", () => {
    const next = !document.body.classList.contains("sidebar-collapsed");
    storeCollapsedPreference(next);
    applyDesktopState(next);
  });
  mobileOpenButton.addEventListener("click", openMobileNavigation);
  mobileCloseButton.addEventListener("click", closeMobileNavigation);
  mobileBackdrop.addEventListener("click", closeMobileNavigation);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") closeMobileNavigation();
  });
  mobileMedia.addEventListener("change", () => {
    closeMobileNavigation();
    applyDesktopState(readCollapsedPreference());
  });

  applyDesktopState(readCollapsedPreference());
})();
