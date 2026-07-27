(function () {
  const TAB_DEFINITIONS = [
    { key: "resumen", label: "Resumen" },
    { key: "cotizacion", label: "Cotización" },
    { key: "operacion", label: "Producción e instalación" },
    { key: "finanzas", label: "Finanzas" },
    { key: "historial", label: "Archivos e historial" }
  ];

  function el(id) { return document.getElementById(id); }
  function escapeText(value) {
    if (typeof safe === "function") return safe(String(value ?? ""));
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  function normalizeWorkflow(job = {}) {
    const workflow = job.workflow || {};
    const assignments = workflow.assignments || {};
    const dueDates = workflow.dueDates || {};
    return {
      assignments: {
        sales: String(assignments.sales || ""),
        design: String(assignments.design || ""),
        production: String(assignments.production || job.production?.responsible || ""),
        installation: String(assignments.installation || job.installation?.assignedTo || ""),
        collections: String(assignments.collections || "")
      },
      dueDates: {
        sales: String(dueDates.sales || ""),
        design: String(dueDates.design || ""),
        production: String(dueDates.production || ""),
        installation: String(dueDates.installation || job.installation?.date || ""),
        collections: String(dueDates.collections || "")
      }
    };
  }

  function getCurrentJobWorkflow(existingJob = {}) {
    const fallback = normalizeWorkflow(existingJob);
    const value = (id, defaultValue = "") => el(id) ? String(el(id).value || "").trim() : defaultValue;
    return {
      assignments: {
        sales: value("jobOwnerSales", fallback.assignments.sales),
        design: value("jobOwnerDesign", fallback.assignments.design),
        production: value("jobOwnerProduction", fallback.assignments.production),
        installation: value("jobOwnerInstallation", fallback.assignments.installation),
        collections: value("jobOwnerCollections", fallback.assignments.collections)
      },
      dueDates: {
        sales: value("jobDueSales", fallback.dueDates.sales),
        design: value("jobDueDesign", fallback.dueDates.design),
        production: value("jobDueProduction", fallback.dueDates.production),
        installation: value("jobDueInstallation", fallback.dueDates.installation),
        collections: value("jobDueCollections", fallback.dueDates.collections)
      }
    };
  }

  function setJobWorkflowForm(job = {}) {
    const workflow = normalizeWorkflow(job);
    const fields = {
      jobOwnerSales: workflow.assignments.sales,
      jobOwnerDesign: workflow.assignments.design,
      jobOwnerProduction: workflow.assignments.production,
      jobOwnerInstallation: workflow.assignments.installation,
      jobOwnerCollections: workflow.assignments.collections,
      jobDueSales: workflow.dueDates.sales,
      jobDueDesign: workflow.dueDates.design,
      jobDueProduction: workflow.dueDates.production,
      jobDueInstallation: workflow.dueDates.installation,
      jobDueCollections: workflow.dueDates.collections
    };
    Object.entries(fields).forEach(([id, value]) => { if (el(id)) el(id).value = value; });
    renderWorkflowSummary();
  }

  function buildAssignmentBox() {
    const box = document.createElement("div");
    box.className = "box job-assignment-box";
    box.dataset.jobTab = "resumen";
    box.innerHTML = `
      <div class="job-assignment-head">
        <div><strong>Responsables y fechas objetivo</strong><div class="section-note mt-10">Campos opcionales. No modifican trabajos existentes hasta guardar este trabajo.</div></div>
        <span class="module-badge">Flujo del equipo</span>
      </div>
      <div class="job-assignment-grid mt-12">
        <strong>Etapa</strong><strong>Responsable</strong><strong>Fecha objetivo</strong>
        <label>Venta</label><input id="jobOwnerSales" class="input" placeholder="Vendedor responsable"><input id="jobDueSales" type="date" class="input">
        <label>Diseño</label><input id="jobOwnerDesign" class="input" placeholder="Diseñador"><input id="jobDueDesign" type="date" class="input">
        <label>Producción</label><input id="jobOwnerProduction" class="input" placeholder="Responsable de producción"><input id="jobDueProduction" type="date" class="input">
        <label>Instalación</label><input id="jobOwnerInstallation" class="input" placeholder="Instalador / cuadrilla"><input id="jobDueInstallation" type="date" class="input">
        <label>Cobranza</label><input id="jobOwnerCollections" class="input" placeholder="Responsable de cobro"><input id="jobDueCollections" type="date" class="input">
      </div>`;
    return box;
  }

  function classify(node) {
    if (node.dataset?.jobTab) return node.dataset.jobTab;
    const text = String(node.querySelector?.("strong")?.textContent || "").toLowerCase();
    if (node.id === "advanceControlBox") return "finanzas";
    if (/cotización|estimado \/ aprobación|precio final|módulo rápido/.test(text)) return "cotizacion";
    if (/instalación|materiales|checklist|inventario y compra/.test(text)) return "operacion";
    if (/pagos registrados|gastos ligados/.test(text)) return "finanzas";
    if (/bitácora|historial|diseños \/ fotos/.test(text)) return "historial";
    return "resumen";
  }

  function renderWorkflowSummary() {
    const box = el("jobWorkflowSummary");
    if (!box || typeof getJobNextAction !== "function") return;
    const job = state.editingJobId && typeof getJobById === "function" ? getJobById(state.editingJobId) : {
      status: el("jobStatus")?.value || "Cotización",
      dueDate: el("jobDueDate")?.value || "",
      clientApproval: typeof getCurrentClientApprovalForm === "function" ? getCurrentClientApprovalForm() : {},
      installation: typeof getCurrentInstallationForm === "function" ? getCurrentInstallationForm(el("jobClientId")?.value || "") : {},
      materials: typeof getCurrentFormMaterials === "function" ? getCurrentFormMaterials() : [],
      payments: []
    };
    const liveJob = {
      ...job,
      status: el("jobStatus")?.value || job.status,
      dueDate: el("jobDueDate")?.value || job.dueDate,
      clientApproval: typeof getCurrentClientApprovalForm === "function" ? getCurrentClientApprovalForm() : job.clientApproval,
      installation: typeof getCurrentInstallationForm === "function" ? getCurrentInstallationForm(el("jobClientId")?.value || "") : job.installation
    };
    liveJob.workflow = getCurrentJobWorkflow(job);
    const next = getJobNextAction(liveJob);
    const workflow = getCurrentJobWorkflow(liveJob);
    const actionStage = {
      send_quote: "sales", quote_changes: "sales", quote_rejected: "sales", await_quote: "sales", collect_deposit: "sales",
      design_changes: "design", design_approval: "design", unblock: "production", produce: "production",
      schedule_install: "installation", complete_install: "installation", collect_balance: "collections", close_paid: "collections"
    }[next.key] || "sales";
    const responsible = workflow.assignments[actionStage] || "Sin asignar";
    const targetDate = workflow.dueDates[actionStage] || liveJob.dueDate || "Sin fecha";
    const paid = el("sumPaid")?.textContent || "$0.00";
    const balance = el("sumBalance")?.textContent || "$0.00";
    box.innerHTML = `
      <div class="job-workflow-next"><span>Próxima acción</span><strong>${escapeText(next.label)}</strong></div>
      <div><span>Estado</span><strong>${escapeText(liveJob.status || "Cotización")}</strong></div>
      <div><span>Responsable</span><strong>${escapeText(responsible)}</strong></div>
      <div><span>Fecha objetivo</span><strong>${escapeText(targetDate)}</strong></div>
      <div><span>Cobrado / saldo</span><strong>${escapeText(paid)} / ${escapeText(balance)}</strong></div>`;
  }

  function selectTab(key) {
    document.querySelectorAll("#jobModal .job-tab-btn").forEach(button => button.classList.toggle("active", button.dataset.jobTabTarget === key));
    document.querySelectorAll("#jobModal .job-tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.jobTabPanel === key));
  }

  function buildTabs() {
    const body = document.querySelector("#jobModal .modal-body");
    if (!body || body.dataset.workflowReady === "true") return;
    body.dataset.workflowReady = "true";

    const summary = document.createElement("div");
    summary.id = "jobWorkflowSummary";
    summary.className = "job-workflow-summary";
    const nav = document.createElement("div");
    nav.className = "job-tabs";
    nav.innerHTML = TAB_DEFINITIONS.map((tab, index) => `<button type="button" class="job-tab-btn${index === 0 ? " active" : ""}" data-job-tab-target="${tab.key}">${tab.label}</button>`).join("");

    const original = [...body.children];
    const panels = new Map();
    TAB_DEFINITIONS.forEach((tab, index) => {
      const panel = document.createElement("div");
      panel.className = `job-tab-panel${index === 0 ? " active" : ""}`;
      panel.dataset.jobTabPanel = tab.key;
      panels.set(tab.key, panel);
    });
    original.forEach(node => panels.get(classify(node)).appendChild(node));
    panels.get("resumen").appendChild(buildAssignmentBox());
    body.append(summary, nav, ...panels.values());

    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-job-tab-target]");
      if (button) selectTab(button.dataset.jobTabTarget);
    });
    body.addEventListener("input", renderWorkflowSummary);
    body.addEventListener("change", renderWorkflowSummary);
    renderWorkflowSummary();

    const modal = el("jobModal");
    new MutationObserver(mutations => {
      const advance = el("advanceControlBox");
      if (advance && !advance.closest('[data-job-tab-panel="finanzas"]')) panels.get("finanzas").prepend(advance);
      if (mutations.some(mutation => mutation.type === "attributes" && mutation.target === modal)) {
        renderWorkflowSummary();
        if (modal.classList.contains("show")) selectTab("resumen");
      }
    }).observe(modal, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(buildTabs, 250));
  window.renderJobWorkflowSummary = renderWorkflowSummary;
  window.selectJobTab = selectTab;
  window.getCurrentJobWorkflow = getCurrentJobWorkflow;
  window.setJobWorkflowForm = setJobWorkflowForm;
})();
