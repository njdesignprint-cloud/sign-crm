(function () {
  "use strict";

  const enButton = document.getElementById("enBtn");
  const esButton = document.getElementById("esBtn");

  function setLanguage(language) {
    localStorage.setItem("crm_language", language);
    document.documentElement.lang = language;
    document.querySelectorAll("[data-lang]").forEach(element => {
      element.classList.toggle("active", element.dataset.lang === language);
    });
    enButton?.classList.toggle("active", language === "en");
    esButton?.classList.toggle("active", language === "es");
  }

  enButton?.addEventListener("click", () => setLanguage("en"));
  esButton?.addEventListener("click", () => setLanguage("es"));
  setLanguage(localStorage.getItem("crm_language") === "es" ? "es" : "en");
})();
