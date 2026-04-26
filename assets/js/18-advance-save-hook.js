(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function handleSaveHook(event) {
    const btn = event.target && event.target.closest && event.target.closest("#saveJobBtn");
    if (!btn) return;

    const advanceBox = document.getElementById("advanceControlBox");
    if (!advanceBox) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

    if (typeof saveJob === "function") {
      saveJob();
    } else {
      console.error("saveJob no está disponible.");
    }
  }

  ready(function () {
    document.addEventListener("click", handleSaveHook, true);
  });
})();
