(function () {
  const COPY = {
    es: {
      title: "Centro de alertas",
      note: "Prioridades operativas que necesitan atención.",
      view: "Ver trabajos",
      clear: "Todo al día",
      summary: count => `${count} alerta${count === 1 ? "" : "s"} prioritaria${count === 1 ? "" : "s"}`,
      alerts: {
        overdue: ["Trabajos vencidos", "Revisa fecha, responsable o prioridad.", "danger"],
        unassigned: ["Sin responsable", "Trabajos activos que todavía no tienen dueño.", "warning"],
        blocked: ["Producción bloqueada", "Hay un impedimento que debe resolverse.", "danger"],
        waiting_client: ["Esperando cliente", "Cotizaciones o diseños pendientes de respuesta.", "info"],
        install_week: ["Instalaciones en 7 días", "Confirma horario, dirección y cuadrilla.", "warning"],
        balance: ["Entregados con saldo", "Trabajos terminados que todavía requieren cobro.", "danger"],
        production: ["En producción", "Trabajos que necesitan seguimiento operativo.", "info"]
      }
    },
    en: {
      title: "Alert center",
      note: "Operational priorities that need attention.",
      view: "View jobs",
      clear: "All caught up",
      summary: count => `${count} priority alert${count === 1 ? "" : "s"}`,
      alerts: {
        overdue: ["Overdue jobs", "Review the date, owner, or priority.", "danger"],
        unassigned: ["Unassigned", "Active jobs that still have no owner.", "warning"],
        blocked: ["Production blocked", "An operational blocker needs resolution.", "danger"],
        waiting_client: ["Waiting for client", "Quotes or designs awaiting a response.", "info"],
        install_week: ["Installations in 7 days", "Confirm schedule, address, and crew.", "warning"],
        balance: ["Delivered with balance", "Completed jobs that still require collection.", "danger"],
        production: ["In production", "Jobs that need operational follow-up.", "info"]
      }
    }
  };

  function currentCopy() {
    return COPY[window.state?.language === "en" ? "en" : "es"];
  }

  function countFor(filter) {
    if (!window.state || !Array.isArray(state.jobs) || typeof jobMatchesQuickFilter !== "function") return 0;
    return state.jobs.filter(job => jobMatchesQuickFilter(job, filter)).length;
  }

  function renderOperationsAlerts() {
    const list = document.getElementById("operationsAlertList");
    if (!list) return;
    const copy = currentCopy();
    const rows = Object.entries(copy.alerts).map(([filter, alert]) => ({ filter, title: alert[0], description: alert[1], tone: alert[2], count: countFor(filter) }));
    const priorityCount = rows.filter(row => ["danger", "warning"].includes(row.tone)).reduce((sum, row) => sum + row.count, 0);

    document.getElementById("operationsAlertTitle").textContent = copy.title;
    document.getElementById("operationsAlertNote").textContent = copy.note;
    document.getElementById("operationsAlertSummary").textContent = priorityCount ? copy.summary(priorityCount) : copy.clear;
    list.innerHTML = rows.map(row => `
      <article class="operations-alert-item alert-${row.count ? row.tone : "clear"}">
        <div class="operations-alert-count">${row.count}</div>
        <div class="operations-alert-copy"><strong>${safe(row.title)}</strong><span>${safe(row.description)}</span></div>
        <button type="button" class="btn btn-secondary btn-small" data-open-job-alert="${row.filter}" ${row.count ? "" : "disabled"}>${copy.view}</button>
      </article>`).join("");
  }

  function openAlert(filter) {
    if (typeof canViewModule === "function" && !canViewModule("trabajos")) return showToast("No tienes acceso al módulo de trabajos.");
    if (typeof setView === "function") setView("trabajos");
    if (typeof setJobsQuickFilter === "function") setJobsQuickFilter(filter);
    document.getElementById("view-trabajos")?.scrollIntoView?.({ block: "start", behavior: "smooth" });
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-open-job-alert]");
    if (button && !button.disabled) openAlert(button.dataset.openJobAlert);
  });

  document.addEventListener("DOMContentLoaded", renderOperationsAlerts);
  window.renderOperationsAlerts = renderOperationsAlerts;
})();
