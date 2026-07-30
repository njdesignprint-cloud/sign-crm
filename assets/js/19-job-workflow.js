(function () {
  const TAB_DEFINITIONS = [
    { key: "resumen", label: "1 · Información" },
    { key: "cotizacion", label: "2 · Cotización" },
    { key: "operacion", label: "3 · Producción" },
    { key: "finanzas", label: "4 · Finanzas" },
    { key: "historial", label: "5 · Archivos" }
  ];

  function el(id) { return document.getElementById(id); }
  function escapeText(value) {
    if (typeof safe === "function") return safe(String(value ?? ""));
    const node = document.createElement("div");
    node.textContent = String(value ?? "");
    return node.innerHTML;
  }

  function workflowLanguage() {
    try { return localStorage.getItem("signshophq_lang_v2") === "es" ? "es" : "en"; } catch (_) { return "en"; }
  }

  function workflowCopy(en, es) { return workflowLanguage() === "es" ? es : en; }

  function localizeNextAction(action = {}) {
    if (workflowLanguage() === "es") return action.label || "";
    const exact = {
      "Trabajo cancelado": "Job canceled",
      "Trabajo cerrado y pagado": "Job closed and paid",
      "Revisar cambios solicitados": "Review requested changes",
      "Contactar al cliente": "Contact the customer",
      "Enviar cotización al cliente": "Send estimate to customer",
      "Esperando aprobación del cliente": "Waiting for customer approval",
      "Aplicar cambios de diseño": "Apply design changes",
      "Obtener aprobación del diseño": "Obtain design approval",
      "Resolver bloqueo de producción": "Resolve production blockage",
      "Asignar responsable de producción": "Assign production responsible",
      "Programar instalación": "Schedule installation",
      "Marcar trabajo como pagado": "Mark job as paid"
    };
    if (exact[action.label]) return exact[action.label];
    return String(action.label || "")
      .replace(/^Cobrar depósito/, "Collect deposit")
      .replace(/^Aplicar cambios de diseño/, "Apply design changes")
      .replace(/^Obtener aprobación del diseño/, "Obtain design approval")
      .replace(/^Producción/, "Production")
      .replace(/^Completar instalación/, "Complete installation")
      .replace(/^Cobrar saldo/, "Collect balance")
      .replace(/^Avanzar a /, "Advance to ")
      .replace(/Cotización/g, "Estimate").replace(/Aprobado/g, "Approved").replace(/Diseño/g, "Design")
      .replace(/Producción/g, "Production").replace(/Instalación/g, "Installation").replace(/Entregado/g, "Delivered").replace(/Pagado/g, "Paid");
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
    box.dataset.jobTab = "operacion";
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
    if (node.id === "jobCommissionBox") return "finanzas";
    if (node.classList?.contains("summary-box")) return "finanzas";
    if (/cotización|estimate|quote|estimado \/ aprobación|precio final|final price|módulo rápido|estimador rápido|quick job estimator/.test(text)) return "cotizacion";
    if (/instalación|installation|materiales|materials|checklist|inventario y compra|inventory and purchase/.test(text)) return "operacion";
    if (/pagos registrados|registered payments|recorded payments|gastos ligados|linked expenses|job-linked expenses/.test(text)) return "finanzas";
    if (/bitácora|internal log|historial|history|diseños \/ fotos|designs \/ job photos|job designs \/ photos/.test(text)) return "historial";
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
    const responsible = workflow.assignments[actionStage] || workflowCopy("Unassigned", "Sin asignar");
    const targetDate = workflow.dueDates[actionStage] || liveJob.dueDate || workflowCopy("No date", "Sin fecha");
    const clientSelect = el("jobClientId");
    const clientName = clientSelect?.selectedOptions?.[0]?.textContent?.trim() || workflowCopy("No customer selected", "Sin cliente seleccionado");
    const customerPrice = Number(el("jobSale")?.value || 0);
    const paid = el("sumPaid")?.textContent || "$0.00";
    const balance = el("sumBalance")?.textContent || "$0.00";
    const formattedPrice = typeof money === "function" ? money(customerPrice) : `$${customerPrice.toFixed(2)}`;
    const paymentDisabled = !state.editingJobId;
    box.innerHTML = `
      <div class="job-workflow-next"><span>${workflowCopy("Next action", "Próxima acción")}</span><strong>${escapeText(localizeNextAction(next))}</strong></div>
      <div><span>${workflowCopy("Customer", "Cliente")}</span><strong>${escapeText(clientName)}</strong></div>
      <div><span>${workflowCopy("Status", "Estado")}</span><strong>${escapeText(liveJob.status || "Cotización")}</strong></div>
      <div><span>${workflowCopy("Responsible", "Responsable")}</span><strong>${escapeText(responsible)}</strong></div>
      <div><span>${workflowCopy("Target date", "Fecha objetivo")}</span><strong>${escapeText(targetDate)}</strong></div>
      <div><span>${workflowCopy("Customer price", "Precio del cliente")}</span><strong>${escapeText(formattedPrice)}</strong></div>
      <div><span>${workflowCopy("Collected / balance", "Cobrado / saldo")}</span><strong>${escapeText(paid)} / ${escapeText(balance)}</strong></div>
      <div class="job-quick-actions" aria-label="Quick job actions">
        <span>Quick actions</span>
        <div>
          <button type="button" data-job-quick-tab="cotizacion">Estimate</button>
          <button type="button" data-job-quick-tab="operacion">Production & installation</button>
          <button type="button" data-job-quick-payment ${paymentDisabled ? 'disabled title="Save the job before recording a payment"' : ""}>Add payment</button>
          <button type="button" data-job-quick-tab="historial">Files & history</button>
        </div>
      </div>`;
  }

  function selectTab(key) {
    document.querySelectorAll("#jobModal .job-tab-btn").forEach(button => button.classList.toggle("active", button.dataset.jobTabTarget === key));
    document.querySelectorAll("#jobModal .job-tab-panel").forEach(panel => panel.classList.toggle("active", panel.dataset.jobTabPanel === key));
  }

  function organizeEstimatePanel(panel) {
    if (!panel || panel.querySelector(".job-advanced-pricing")) return;
    const pricing = panel.querySelector("#jobPricingBox");
    const estimator = panel.querySelector("#jobEstimatorBox");
    if (!pricing || !estimator) return;

    const guide = document.createElement("div");
    guide.className = "job-estimate-guide";
    guide.innerHTML = `<strong>Cotización para el cliente</strong><span>Construye el total que el cliente verá y aprobará.</span>`;

    const advanced = document.createElement("details");
    advanced.className = "job-advanced-pricing";
    advanced.innerHTML = `<summary><span><strong>Precio avanzado</strong><small>Costos internos, rentabilidad y estimador rápido</small></span><b>Opcional</b></summary><div class="job-advanced-pricing-body"></div>`;
    advanced.querySelector(".job-advanced-pricing-body").append(pricing, estimator);
    panel.prepend(guide);
    panel.append(advanced);
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
    panels.get("operacion").appendChild(buildAssignmentBox());
    organizeEstimatePanel(panels.get("cotizacion"));
    body.append(summary, nav, ...panels.values());

    nav.addEventListener("click", event => {
      const button = event.target.closest("[data-job-tab-target]");
      if (button) selectTab(button.dataset.jobTabTarget);
    });
    summary.addEventListener("click", event => {
      const tabButton = event.target.closest("[data-job-quick-tab]");
      if (tabButton) {
        selectTab(tabButton.dataset.jobQuickTab);
        return;
      }
      const paymentButton = event.target.closest("[data-job-quick-payment]");
      if (paymentButton && !paymentButton.disabled) {
        selectTab("finanzas");
        el("openPaymentFromJobBtn")?.click();
      }
    });
    body.addEventListener("input", renderWorkflowSummary);
    body.addEventListener("change", renderWorkflowSummary);
    window.addEventListener("crm-language-changed", renderWorkflowSummary);
    renderWorkflowSummary();

    const modal = el("jobModal");
    new MutationObserver(mutations => {
      const advance = el("advanceControlBox");
      if (advance && !advance.closest('[data-job-tab-panel="finanzas"]')) panels.get("finanzas").prepend(advance);
      if (mutations.some(mutation => mutation.type === "attributes" && mutation.target === modal)) {
        renderWorkflowSummary();
        if (modal.classList.contains("show")) {
          selectTab("resumen");
          const advancedPricing = modal.querySelector(".job-advanced-pricing");
          if (advancedPricing) advancedPricing.open = false;
        }
      }
    }).observe(modal, { attributes: true, attributeFilter: ["class"], childList: true, subtree: true });
  }

  document.addEventListener("DOMContentLoaded", () => setTimeout(buildTabs, 250));
  window.renderJobWorkflowSummary = renderWorkflowSummary;
  window.selectJobTab = selectTab;
  window.getCurrentJobWorkflow = getCurrentJobWorkflow;
  window.setJobWorkflowForm = setJobWorkflowForm;
})();
