(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function moneySafe(value) {
    if (typeof money === "function") return money(value || 0);
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function cleanSafe(value) {
    if (typeof cleanText === "function") return cleanText(value);
    return String(value || "").trim();
  }

  function getAdvanceSummary(job = {}) {
    if (typeof window.getJobAdvanceSummary === "function") {
      return window.getJobAdvanceSummary(job);
    }
    const adv = job.advance || {};
    const received = Number(adv.received || 0);
    const ledger = Array.isArray(adv.ledger) ? adv.ledger : [];
    const spent = ledger.reduce((sum, item) => {
      const status = cleanSafe(item.status);
      const apply = !!item.applyToAdvance;
      return sum + (status === "Pagado" && apply ? Number(item.amount || 0) : 0);
    }, 0);
    return { received, spent, available: received - spent };
  }

  function ensureDashboardCards() {
    const miniStats = document.querySelector("#view-dashboard .mini-stats");
    if (!miniStats) return false;

    let productionCard = document.getElementById("dashboardProductionCard");
    if (!productionCard) {
      productionCard = document.createElement("div");
      productionCard.className = "mini-stat";
      productionCard.id = "dashboardProductionCard";
      productionCard.innerHTML = `
        <div class="label">En producción</div>
        <div id="dashboardProductionCount" class="value purple-text">0</div>
      `;
      miniStats.appendChild(productionCard);
    }

    let advanceCard = document.getElementById("dashboardAdvanceCard");
    if (!advanceCard) {
      advanceCard = document.createElement("div");
      advanceCard.className = "mini-stat";
      advanceCard.id = "dashboardAdvanceCard";
      advanceCard.innerHTML = `
        <div class="label">Anticipo disponible</div>
        <div id="dashboardAdvanceAvailableTotal" class="value warn-text">$0.00</div>
      `;
      miniStats.appendChild(advanceCard);
    }

    return true;
  }

  function computeDashboardData() {
    const jobs = (window.state && Array.isArray(window.state.jobs)) ? window.state.jobs : [];
    const openJobs = jobs.filter(job => !["Pagado", "Cancelado"].includes(cleanSafe(job.status)));
    const productionCount = openJobs.filter(job => cleanSafe(job.status) === "Producción").length;
    const advanceAvailableTotal = openJobs.reduce((sum, job) => sum + Number(getAdvanceSummary(job).available || 0), 0);

    return {
      productionCount,
      advanceAvailableTotal
    };
  }

  function renderDashboardCards() {
    if (!ensureDashboardCards()) return;
    const data = computeDashboardData();

    const prodEl = document.getElementById("dashboardProductionCount");
    const advEl = document.getElementById("dashboardAdvanceAvailableTotal");

    if (prodEl) prodEl.textContent = String(data.productionCount);
    if (advEl) advEl.textContent = moneySafe(data.advanceAvailableTotal);
  }

  function patchRenderJobs() {
    if (window.__dashboardCardsPatched || typeof renderJobs !== "function") return;
    window.__dashboardCardsPatched = true;

    const originalRenderJobs = renderJobs;
    renderJobs = function () {
      const result = originalRenderJobs.apply(this, arguments);
      renderDashboardCards();
      return result;
    };
  }

  function patchSetView() {
    if (window.__dashboardCardsSetViewPatched || typeof setView !== "function") return;
    window.__dashboardCardsSetViewPatched = true;

    const originalSetView = setView;
    setView = function () {
      const result = originalSetView.apply(this, arguments);
      setTimeout(renderDashboardCards, 30);
      return result;
    };
  }

  function injectStyles() {
    if (document.getElementById("dashboardCardsAddonStyles")) return;
    const style = document.createElement("style");
    style.id = "dashboardCardsAddonStyles";
    style.textContent = `
      #dashboardAdvanceCard .value {
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  ready(function () {
    injectStyles();
    ensureDashboardCards();
    patchRenderJobs();
    patchSetView();
    renderDashboardCards();

    setInterval(renderDashboardCards, 1200);
  });
})();
