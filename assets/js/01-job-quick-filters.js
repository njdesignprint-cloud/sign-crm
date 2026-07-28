(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.JobQuickFilters = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const ACTIVE_EXCLUSIONS = ["Pagado", "Cancelado"];

  function normalize(value) {
    return String(value || "").trim().toLowerCase();
  }

  function responsibleValues(job = {}) {
    const assignments = job.workflow?.assignments || {};
    return [
      assignments.sales,
      assignments.design,
      assignments.production,
      assignments.installation,
      assignments.collections,
      job.production?.responsible,
      job.installation?.assignedTo
    ].map(normalize).filter(Boolean);
  }

  function isActive(job = {}) {
    return !ACTIVE_EXCLUSIONS.includes(String(job.status || ""));
  }

  function matches(job = {}, filter = "all", context = {}) {
    if (filter === "all") return true;
    const active = isActive(job);
    const responsible = responsibleValues(job);
    const aliases = (context.aliases || []).map(normalize).filter(Boolean);
    const installation = job.installation || {};
    const approval = job.clientApproval || {};

    if (filter === "mine") return active && responsible.some(value => aliases.includes(value));
    if (filter === "unassigned") return active && responsible.length === 0;
    if (filter === "overdue") return active && !!context.overdue;
    if (filter === "blocked") return active && !!job.production?.blocked;
    if (filter === "waiting_client") {
      return active && (approval.estimateStatus === "enviado" || approval.designStatus === "enviado");
    }
    if (filter === "production") {
      return active && (job.status === "Producción" || ["produccion", "listo_instalar"].includes(job.production?.stage));
    }
    if (filter === "install_week") {
      return active && !!installation.date && installation.date >= context.today && installation.date <= context.weekEnd && !["Completada", "Cancelada"].includes(installation.status);
    }
    if (filter === "balance") return job.status === "Entregado" && Number(context.balance || 0) > 0;
    return true;
  }

  return { matches, responsibleValues };
});
