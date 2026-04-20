(function () {
  function setIfExists(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function getDashboardRoot() {
    return document.getElementById("view-dashboard");
  }

  function upgradeDashboardLayout() {
    const root = getDashboardRoot();
    if (!root) return;

    const alertGrid = root.querySelector(".alert-grid");
    if (alertGrid && !alertGrid.dataset.dashboardUpgraded) {
      alertGrid.dataset.dashboardUpgraded = "true";
      alertGrid.innerHTML = `
        <div class="alert-card alert-entrega">
          <div class="label">Entregas hoy</div>
          <div id="dueTodayCount" class="value info-text">0</div>
        </div>
        <div class="alert-card alert-vencido">
          <div class="label">Trabajos vencidos</div>
          <div id="allOverdueJobs" class="value danger-text">0</div>
        </div>
        <div class="alert-card alert-cobro">
          <div class="label">Instalaciones esta semana</div>
          <div id="installWeekCount" class="value warn-text">0</div>
        </div>
        <div class="alert-card alert-entrega">
          <div class="label">Pendientes por confirmar</div>
          <div id="installPendingConfirmCount" class="value info-text">0</div>
        </div>
      `;
    }

    const miniStats = root.querySelector(".mini-stats");
    if (miniStats && !miniStats.dataset.dashboardUpgraded) {
      miniStats.dataset.dashboardUpgraded = "true";
      miniStats.innerHTML = `
        <div class="mini-stat">
          <div class="label">Por cobrar</div>
          <div id="allReceivable" class="value warn-text">$0.00</div>
        </div>
        <div class="mini-stat">
          <div class="label">Trabajos con saldo</div>
          <div id="openBalanceJobsCount" class="value danger-text">0</div>
        </div>
        <div class="mini-stat">
          <div class="label">En proceso</div>
          <div id="allActiveJobs" class="value purple-text">0</div>
        </div>
        <div class="mini-stat">
          <div class="label">En producción</div>
          <div id="productionNowCount" class="value brand-text">0</div>
        </div>
      `;
    }
  }

  function installationWithinRange(dateValue, from, to) {
    if (!dateValue) return false;
    return dateValue >= from && dateValue <= to;
  }

  function getInstallationsThisWeekCount() {
    if (!window.state || !Array.isArray(state.jobs) || typeof getJobInstallation !== "function") return 0;

    const from = typeof today === "function" ? today() : new Date().toISOString().slice(0, 10);
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + 7);
    const to = limitDate.toISOString().slice(0, 10);

    return state.jobs.filter(job => {
      const installation = getJobInstallation(job);
      const status = String(installation.status || "").trim();
      return installationWithinRange(installation.date, from, to) && status !== "Cancelada";
    }).length;
  }

  function getPendingConfirmInstallationsCount() {
    if (!window.state || !Array.isArray(state.jobs) || typeof getJobInstallation !== "function") return 0;

    return state.jobs.filter(job => {
      const installation = getJobInstallation(job);
      return installation.date && String(installation.status || "").trim() === "Pendiente";
    }).length;
  }

  function getProductionNowCount() {
    if (!window.state || !Array.isArray(state.jobs)) return 0;

    return state.jobs.filter(job => {
      const productionStage = String(job.productionStage || "").trim().toLowerCase();
      const status = String(job.status || "").trim();
      return productionStage === "produccion" || status === "Producción";
    }).length;
  }

  function renderStatsUpgraded() {
    if (!window.state || !Array.isArray(state.jobs) || !Array.isArray(state.expenses)) return;

    const month = typeof currentMonthKey === "function" ? currentMonthKey() : new Date().toISOString().slice(0, 7);

    const monthSales = state.jobs
      .filter(job => typeof monthKey === "function" ? monthKey(job.date) === month && !["Cancelado"].includes(job.status) : true)
      .reduce((sum, job) => sum + Number(job.sale || 0), 0);

    const monthCollected = state.jobs.reduce((sum, job) => {
      if (typeof getPaymentsList !== "function") return sum;
      return sum + getPaymentsList(job)
        .filter(payment => (typeof monthKey === "function" ? monthKey(payment.date) === month : true))
        .reduce((sub, payment) => sub + Number(payment.amount || 0), 0);
    }, 0);

    const monthExpenses = state.expenses
      .filter(expense => typeof monthKey === "function" ? monthKey(expense.date) === month : true)
      .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

    const monthProfitBase = state.jobs
      .filter(job => typeof monthKey === "function" ? monthKey(job.date) === month && !["Cancelado"].includes(job.status) : true)
      .reduce((sum, job) => sum + (typeof computeJob === "function" ? computeJob(job).profit : 0), 0);

    const overallReceivable = state.jobs
      .filter(job => !["Pagado", "Cancelado"].includes(job.status))
      .reduce((sum, job) => sum + (typeof computeJob === "function" ? computeJob(job).balance : 0), 0);

    const dueToday = typeof getDueTodayJobs === "function" ? getDueTodayJobs().length : 0;
    const overdueJobs = state.jobs.filter(job => typeof isOverdue === "function" ? isOverdue(job) : false).length;
    const activeJobs = state.jobs.filter(job => Array.isArray(window.ACTIVE_STATUSES) ? ACTIVE_STATUSES.includes(job.status) : false).length;
    const openBalanceJobs = typeof getPendingPaymentJobs === "function" ? getPendingPaymentJobs().length : 0;
    const installWeekCount = getInstallationsThisWeekCount();
    const installPendingConfirmCount = getPendingConfirmInstallationsCount();
    const productionNowCount = getProductionNowCount();

    const moneyFormatter = typeof money === "function" ? money : (value) => `$${Number(value || 0).toFixed(2)}`;

    setIfExists("mSales", moneyFormatter(monthSales));
    setIfExists("mCollected", moneyFormatter(monthCollected));
    setIfExists("mExpenses", moneyFormatter(monthExpenses));
    setIfExists("mProfit", moneyFormatter(monthProfitBase - monthExpenses));

    setIfExists("dueTodayCount", String(dueToday));
    setIfExists("allOverdueJobs", String(overdueJobs));
    setIfExists("installWeekCount", String(installWeekCount));
    setIfExists("installPendingConfirmCount", String(installPendingConfirmCount));

    setIfExists("allReceivable", moneyFormatter(overallReceivable));
    setIfExists("openBalanceJobsCount", String(openBalanceJobs));
    setIfExists("allActiveJobs", String(activeJobs));
    setIfExists("productionNowCount", String(productionNowCount));
  }

  function bootDashboardUpgrade() {
    upgradeDashboardLayout();

    const previousRenderStats = window.renderStats;
    window.renderStats = function () {
      upgradeDashboardLayout();
      renderStatsUpgraded();
    };

    if (typeof previousRenderStats === "function") {
      try {
        window.renderStats();
      } catch (error) {
        console.error(error);
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootDashboardUpgrade);
  } else {
    bootDashboardUpgrade();
  }
})();
