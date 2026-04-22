(function () {
  const PRODUCTION_STAGES = [
    { key: "diseno", label: "Diseño", listId: "productionStageDiseno", countId: "productionCountDiseno" },
    { key: "aprobacion", label: "Aprobación", listId: "productionStageAprobacion", countId: "productionCountAprobacion" },
    { key: "produccion", label: "Producción", listId: "productionStageProduccion", countId: "productionCountProduccion" },
    { key: "listo_instalar", label: "Listo para instalar", listId: "productionStageListoInstalar", countId: "productionCountListoInstalar" },
    { key: "instalacion_programada", label: "Instalación programada", listId: "productionStageInstalacionProgramada", countId: "productionCountInstalacionProgramada" },
    { key: "completado", label: "Completado", listId: "productionStageCompletado", countId: "productionCountCompletado" }
  ];

  function getEl(id) {
    return typeof $ === "function" ? $(id) : document.getElementById(id);
  }

  function clean(value) {
    return typeof cleanText === "function" ? cleanText(value) : String(value || "").trim();
  }

  function safeText(value) {
    return typeof safe === "function"
      ? safe(value)
      : String(value || "")
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#39;");
  }

  function moneyText(value) {
    return typeof money === "function"
      ? money(value)
      : `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDateSafe(value) {
    if (typeof formatDate === "function") return formatDate(value);
    return value || "-";
  }

  function formatDateTimeSafe(value) {
    if (typeof formatDateTime === "function") return formatDateTime(value);
    return value || "-";
  }

  function statusPillSafe(status) {
    if (typeof statusPill === "function") return statusPill(status || "Cotización");
    return `<span class="pill">${safeText(status || "-")}</span>`;
  }

  function priorityPillSafe(priority) {
    if (typeof priorityPill === "function") return priorityPill(priority || "Media");
    return `<span class="pill">${safeText(priority || "Media")}</span>`;
  }

  function canEditProduction() {
    return typeof canWriteData === "function" ? canWriteData("trabajos") : true;
  }

  function currentJobs() {
    if (typeof state !== "undefined" && Array.isArray(state.jobs)) return state.jobs;
    if (Array.isArray(window.state?.jobs)) return window.state.jobs;
    return [];
  }

  function currentClients() {
    if (typeof state !== "undefined" && Array.isArray(state.clients)) return state.clients;
    if (Array.isArray(window.state?.clients)) return window.state.clients;
    return [];
  }

  function getClientLabelById(clientId) {
    if (typeof getClientById === "function" && typeof clientLabel === "function") {
      return clientLabel(getClientById(clientId));
    }
    const client = currentClients().find(item => clean(item.id) === clean(clientId));
    return client?.company || client?.name || "Sin nombre";
  }

  function inferStageFromJob(job = {}) {
    const status = clean(job.status);

    if (job?.production?.stage && PRODUCTION_STAGES.some(stage => stage.key === job.production.stage)) {
      return job.production.stage;
    }

    if (["Pagado", "Entregado"].includes(status)) return "completado";
    if (status === "Instalación") {
      const installation = typeof getJobInstallation === "function" ? getJobInstallation(job) : (job.installation || {});
      return clean(installation.date) ? "instalacion_programada" : "listo_instalar";
    }
    if (status === "Producción") return "produccion";
    if (status === "Diseño") return "diseno";
    if (status === "Aprobado") return "aprobacion";

    const checklist = typeof getChecklist === "function" ? getChecklist(job) : (job.checklist || {});
    if (checklist.delivered || checklist.installed) return "completado";
    if (checklist.installationScheduled) return "instalacion_programada";
    if (checklist.printingDone || checklist.cuttingDone || checklist.laminationDone) return "listo_instalar";
    if (checklist.materialOrdered) return "produccion";
    if (checklist.designApproved) return "aprobacion";

    return "diseno";
  }

  function normalizeProduction(job = {}) {
    const stage = inferStageFromJob(job);
    const priority = clean(job?.production?.priority) || clean(job.priority) || "Media";
    const installation = typeof getJobInstallation === "function" ? getJobInstallation(job) : (job.installation || {});
    const responsible = clean(job?.production?.responsible) || clean(installation.assignedTo) || "";
    const blocked = !!job?.production?.blocked;
    const notes = clean(job?.production?.notes);
    const history = Array.isArray(job?.production?.history) ? [...job.production.history] : [];

    return {
      stage,
      priority,
      responsible,
      blocked,
      notes,
      history
    };
  }

  function stageLabel(stageKey = "") {
    return PRODUCTION_STAGES.find(item => item.key === stageKey)?.label || "Producción";
  }

  function getResponsibleNames() {
    const names = new Set();

    currentJobs().forEach(job => {
      const production = normalizeProduction(job);
      if (production.responsible) names.add(production.responsible);

      const installation = typeof getJobInstallation === "function" ? getJobInstallation(job) : (job.installation || {});
      if (clean(installation.assignedTo)) names.add(clean(installation.assignedTo));
    });

    ((typeof state !== "undefined" && Array.isArray(state.teamMembers)) ? state.teamMembers : (window.state?.teamMembers || [])).forEach(member => {
      const value = clean(member?.name) || clean(member?.email);
      if (value) names.add(value);
    });

    const activeUserEmail =
      (typeof state !== "undefined" && state.userEmail) ? state.userEmail : (window.state?.userEmail || "");

    if (clean(activeUserEmail)) names.add(clean(activeUserEmail));

    return [...names].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
  }

  function fillProductionResponsibleOptions() {
    const names = getResponsibleNames();

    const filter = getEl("productionResponsibleFilter");
    if (filter) {
      const current = clean(filter.value);
      filter.innerHTML =
        `<option value="">Todos los responsables</option>` +
        names.map(name => `<option value="${safeText(name)}">${safeText(name)}</option>`).join("");
      filter.value = current;
    }

    const list = getEl("productionResponsibleList");
    if (list) {
      list.innerHTML = names.map(name => `<option value="${safeText(name)}"></option>`).join("");
    }
  }

  function getProductionFilteredJobs() {
    const search = clean(getEl("productionSearch")?.value).toLowerCase();
    const stage = clean(getEl("productionStageFilter")?.value);
    const priority = clean(getEl("productionPriorityFilter")?.value);
    const responsible = clean(getEl("productionResponsibleFilter")?.value);
    const dueFrom = clean(getEl("productionDueFrom")?.value);
    const dueTo = clean(getEl("productionDueTo")?.value);
    const blocked = clean(getEl("productionBlockedFilter")?.value);
    const overdueOnly = !!getEl("productionOverdueOnly")?.checked;

    return currentJobs().filter(job => {
      const production = normalizeProduction(job);
      const clientName = getClientLabelById(job.clientId);
      const bag = `${job.title || ""} ${clientName} ${job.description || ""} ${job.notes || ""}`.toLowerCase();

      const matchesSearch = !search || bag.includes(search);
      const matchesStage = !stage || production.stage === stage;
      const matchesPriority = !priority || production.priority === priority;
      const matchesResponsible = !responsible || production.responsible === responsible;

      const dueDate = clean(job.dueDate);
      const matchesDueFrom = !dueFrom || (dueDate && dueDate >= dueFrom);
      const matchesDueTo = !dueTo || (dueDate && dueDate <= dueTo);

      const matchesBlocked =
        !blocked ||
        (blocked === "yes" && production.blocked) ||
        (blocked === "no" && !production.blocked);

      const overdue = typeof isOverdue === "function" ? isOverdue(job) : false;
      const matchesOverdue = !overdueOnly || overdue;

      return matchesSearch && matchesStage && matchesPriority && matchesResponsible && matchesDueFrom && matchesDueTo && matchesBlocked && matchesOverdue;
    });
  }

  function renderProductionStats(rows = []) {
    const active = rows.filter(job => normalizeProduction(job).stage !== "completado").length;
    const overdue = rows.filter(job => (typeof isOverdue === "function" ? isOverdue(job) : false)).length;
    const ready = rows.filter(job => ["listo_instalar", "instalacion_programada"].includes(normalizeProduction(job).stage)).length;
    const completed = rows.filter(job => normalizeProduction(job).stage === "completado").length;

    if (getEl("productionActiveCount")) getEl("productionActiveCount").textContent = String(active);
    if (getEl("productionOverdueCount")) getEl("productionOverdueCount").textContent = String(overdue);
    if (getEl("productionReadyInstallCount")) getEl("productionReadyInstallCount").textContent = String(ready);
    if (getEl("productionCompletedCount")) getEl("productionCompletedCount").textContent = String(completed);
  }

  function renderProductionCard(job) {
    const production = normalizeProduction(job);
    const calc = typeof computeJob === "function" ? computeJob(job) : { balance: 0 };
    const clientName = getClientLabelById(job.clientId);
    const overdue = typeof isOverdue === "function" ? isOverdue(job) : false;
    const dragAttrs = canEditProduction()
      ? `draggable="true" data-production-drag="${safeText(job.id)}"`
      : "";

    return `
      <div class="kanban-card production-card ${production.blocked ? "production-card-blocked" : ""}" ${dragAttrs} data-production-job="${safeText(job.id)}">
        <h4>${safeText(job.title || "-")}</h4>
        <small>${safeText(clientName)}</small>
        <div class="module-badge">${safeText(stageLabel(production.stage))}</div>
        <div style="margin-top:6px;">${priorityPillSafe(production.priority)}</div>
        <div style="margin-top:6px;">${statusPillSafe(job.status || "Cotización")}</div>
        ${production.blocked ? `<div class="section-note danger-text" style="margin-top:8px;">Trabajo bloqueado</div>` : ""}
        <div class="kanban-meta" style="margin-top:8px;">
          ${overdue ? '<span class="pill st-cancelado">Vencido</span>' : '<span class="pill st-aprobado">En tiempo</span>'}
        </div>
        <small>Entrega: ${safeText(formatDateSafe(job.dueDate))}</small>
        <small>Saldo: ${safeText(moneyText(calc.balance || 0))}</small>
        <small>Responsable: ${safeText(production.responsible || "-")}</small>
        <small>Checklist: ${safeText(typeof checklistProgress === "function" ? checklistProgress(job) : "-")}</small>
        ${production.notes ? `<div class="section-note" style="margin-top:8px;">${safeText(production.notes)}</div>` : ""}
        <div class="kanban-actions">
          <button class="btn btn-secondary btn-small" data-edit-job="${safeText(job.id)}">Abrir</button>
          <button class="btn btn-info btn-small" data-open-production="${safeText(job.id)}">Producción</button>
        </div>
      </div>
    `;
  }

  function bindProductionDragAndDrop() {
    if (!canEditProduction()) return;

    document.querySelectorAll("[data-production-drag]").forEach(card => {
      card.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", card.dataset.productionDrag || "");
      });
    });

    document.querySelectorAll("[data-production-stage]").forEach(list => {
      list.addEventListener("dragover", (event) => {
        event.preventDefault();
      });
      list.addEventListener("drop", async (event) => {
        event.preventDefault();
        const jobId = event.dataTransfer.getData("text/plain");
        const stage = list.dataset.productionStage;
        if (!jobId || !stage) return;
        await saveProductionForJob(jobId, { stage }, true);
      });
    });
  }

  function renderProductionBoard() {
    if (!getEl("productionBoard")) return;

    fillProductionResponsibleOptions();

    const rows = getProductionFilteredJobs();

    PRODUCTION_STAGES.forEach(stage => {
      const box = getEl(stage.listId);
      const countEl = getEl(stage.countId);
      if (!box) return;

      const stageJobs = rows.filter(job => normalizeProduction(job).stage === stage.key);
      box.setAttribute("data-production-stage", stage.key);
      box.innerHTML = stageJobs.length
        ? stageJobs.map(renderProductionCard).join("")
        : `<div class="section-note">Sin trabajos en esta etapa.</div>`;

      if (countEl) countEl.textContent = String(stageJobs.length);
    });

    renderProductionStats(rows);
    const empty = getEl("productionEmpty");
    if (empty) empty.classList.toggle("hidden", rows.length > 0);

    bindProductionDragAndDrop();
  }

  function openProductionModal(jobId) {
    const job = typeof getJobById === "function" ? getJobById(jobId) : currentJobs().find(item => clean(item.id) === clean(jobId));
    if (!job) return;

    const production = normalizeProduction(job);

    if (getEl("productionJobId")) getEl("productionJobId").value = job.id || "";
    if (getEl("productionJobName")) getEl("productionJobName").value = job.title || "";
    if (getEl("productionClientName")) getEl("productionClientName").value = getClientLabelById(job.clientId);
    if (getEl("productionDueDate")) getEl("productionDueDate").value = formatDateSafe(job.dueDate);
    if (getEl("productionStage")) getEl("productionStage").value = production.stage;
    if (getEl("productionPriority")) getEl("productionPriority").value = production.priority;
    if (getEl("productionResponsible")) getEl("productionResponsible").value = production.responsible || "";
    if (getEl("productionBlocked")) getEl("productionBlocked").checked = !!production.blocked;
    if (getEl("productionNotes")) getEl("productionNotes").value = production.notes || "";

    const historyLog = getEl("productionHistoryLog");
    if (historyLog) {
      historyLog.innerHTML = production.history.length
        ? production.history
            .slice()
            .sort((a, b) => String(b.at || "").localeCompare(String(a.at || "")))
            .map(item => `
              <div class="log-item">
                <strong>${safeText(item.text || "Cambio en producción")}</strong>
                <div class="section-note">${safeText(item.by || "usuario")} · ${safeText(formatDateTimeSafe(item.at || ""))}</div>
              </div>
            `)
            .join("")
        : `<div class="section-note">Todavía no hay cambios registrados en producción.</div>`;
    }

    if (typeof openModal === "function") openModal("productionModal");
  }

  function syncJobStatusFromProduction(stageKey = "", currentStatus = "") {
    const map = {
      diseno: "Diseño",
      aprobacion: "Aprobado",
      produccion: "Producción",
      listo_instalar: "Producción",
      instalacion_programada: "Instalación",
      completado: "Entregado"
    };

    const next = map[stageKey] || currentStatus || "Cotización";
    if (currentStatus === "Pagado") return "Pagado";
    if (currentStatus === "Cancelado") return "Cancelado";
    return next;
  }

  async function saveProductionForJob(jobId, patch = {}, silent = false) {
    if (!canEditProduction()) {
      if (!silent && typeof showToast === "function") showToast("No tienes permiso para editar producción.");
      return;
    }

    const job = typeof getJobById === "function" ? getJobById(jobId) : currentJobs().find(item => clean(item.id) === clean(jobId));
    if (!job) {
      if (!silent && typeof showToast === "function") showToast("No se encontró el trabajo.");
      return;
    }

    const current = normalizeProduction(job);
    const stage = clean(patch.stage || current.stage);
    const priority = clean(patch.priority || current.priority || "Media");
    const responsible = clean(patch.responsible ?? current.responsible);
    const blocked = typeof patch.blocked === "boolean" ? patch.blocked : current.blocked;
    const notes = clean(patch.notes ?? current.notes);
    const history = [...current.history];
    const currentUser = (typeof state !== "undefined" ? state.userEmail : window.state?.userEmail) || "usuario";

    const changed =
      stage !== current.stage ||
      priority !== current.priority ||
      responsible !== current.responsible ||
      blocked !== current.blocked ||
      notes !== current.notes;

    if (changed) {
      history.push({
        at: new Date().toISOString(),
        by: currentUser,
        text: `Etapa: ${stageLabel(current.stage)} → ${stageLabel(stage)} · Prioridad: ${priority} · Responsable: ${responsible || "-"}${blocked ? " · Bloqueado" : ""}`
      });
    }

    const payload = {
      priority,
      status: syncJobStatusFromProduction(stage, clean(job.status)),
      production: {
        stage,
        priority,
        responsible,
        blocked,
        notes,
        history
      },
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (changed && typeof getJobActivityLog === "function") {
      const logs = [...getJobActivityLog(job)];
      if (typeof newLogEntry === "function") {
        logs.push(newLogEntry("producción", `Producción actualizada a ${stageLabel(stage)}.`));
      } else {
        logs.push({
          id: `log-${Date.now()}`,
          type: "producción",
          text: `Producción actualizada a ${stageLabel(stage)}.`,
          by: currentUser,
          at: new Date().toISOString()
        });
      }
      payload.activityLog = logs;
    }

    try {
      await jobsRef().doc(jobId).update(payload);
      if (!silent && typeof showToast === "function") showToast("Producción actualizada.");
      if (!silent && typeof closeModal === "function") closeModal("productionModal");
      renderProductionBoard();
      if (typeof renderJobs === "function") renderJobs();
    } catch (error) {
      console.error(error);
      if (typeof showToast === "function") showToast("No se pudo guardar producción.");
    }
  }

  function saveProductionFromModal() {
    const jobId = clean(getEl("productionJobId")?.value);
    if (!jobId) return;

    saveProductionForJob(jobId, {
      stage: clean(getEl("productionStage")?.value),
      priority: clean(getEl("productionPriority")?.value),
      responsible: clean(getEl("productionResponsible")?.value),
      blocked: !!getEl("productionBlocked")?.checked,
      notes: clean(getEl("productionNotes")?.value)
    });
  }

  function clearProductionFilters() {
    ["productionSearch", "productionStageFilter", "productionPriorityFilter", "productionResponsibleFilter", "productionDueFrom", "productionDueTo", "productionBlockedFilter"].forEach(id => {
      const el = getEl(id);
      if (el) el.value = "";
    });
    if (getEl("productionOverdueOnly")) getEl("productionOverdueOnly").checked = false;
    renderProductionBoard();
  }

  function bindProductionEvents() {
    ["productionSearch", "productionStageFilter", "productionPriorityFilter", "productionResponsibleFilter", "productionDueFrom", "productionDueTo", "productionBlockedFilter"].forEach(id => {
      const el = getEl(id);
      if (!el) return;
      el.addEventListener("input", renderProductionBoard);
      el.addEventListener("change", renderProductionBoard);
    });

    if (getEl("productionOverdueOnly")) {
      getEl("productionOverdueOnly").addEventListener("change", renderProductionBoard);
    }

    if (getEl("btnClearProductionFilters")) {
      getEl("btnClearProductionFilters").addEventListener("click", clearProductionFilters);
    }

    if (getEl("saveProductionBtn")) {
      getEl("saveProductionBtn").addEventListener("click", saveProductionFromModal);
    }

    document.addEventListener("click", (event) => {
      const target = event.target;
      if (target.dataset.openProduction) openProductionModal(target.dataset.openProduction);
    });

    document.querySelectorAll('.nav button[data-view="produccion"]').forEach(btn => {
      btn.addEventListener("click", () => {
        setTimeout(renderProductionBoard, 0);
      });
    });
  }

  function wrapExistingRenderJobs() {
    if (typeof window.renderJobs !== "function" || window.__productionWrappedRenderJobs) return;

    const originalRenderJobs = window.renderJobs;
    window.renderJobs = function (...args) {
      const result = originalRenderJobs.apply(this, args);
      try {
        renderProductionBoard();
      } catch (error) {
        console.error(error);
      }
      return result;
    };

    window.__productionWrappedRenderJobs = true;
  }

  function initProductionModule() {
    if (!getEl("view-produccion")) return;
    bindProductionEvents();
    wrapExistingRenderJobs();
    renderProductionBoard();
  }

  window.renderProductionBoard = renderProductionBoard;
  window.openProductionModal = openProductionModal;
  window.saveProductionFromModal = saveProductionFromModal;
  window.clearProductionFilters = clearProductionFilters;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProductionModule);
  } else {
    initProductionModule();
  }
})();