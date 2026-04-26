(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function injectAdvanceStyles() {
    if (document.getElementById("advanceControlStyles")) return;
    const style = document.createElement("style");
    style.id = "advanceControlStyles";
    style.textContent = `
      .advance-header{
        display:flex;
        justify-content:space-between;
        align-items:center;
        gap:10px;
        flex-wrap:wrap;
      }
      .advance-actions{
        display:flex;
        gap:8px;
        flex-wrap:wrap;
      }
      .advance-summary-grid{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:12px;
        margin-top:14px;
      }
      .advance-stat{
        background:#101216;
        border:1px solid var(--line);
        border-radius:14px;
        padding:12px;
      }
      .advance-stat span{
        display:block;
        color:var(--muted);
        font-size:11px;
        text-transform:uppercase;
      }
      .advance-stat strong{
        display:block;
        margin-top:8px;
        font-size:19px;
      }
      .advance-ledger{
        display:grid;
        gap:12px;
        margin-top:14px;
      }
      .advance-row{
        display:grid;
        grid-template-columns:1fr 1.1fr 1.7fr .95fr 1fr auto auto;
        gap:10px;
        align-items:start;
        padding:12px;
        border:1px solid var(--line);
        border-radius:14px;
        background:#101216;
      }
      .advance-check{
        display:flex;
        align-items:center;
        justify-content:center;
        min-height:42px;
        background:rgba(255,255,255,.02);
        border:1px solid var(--line);
        border-radius:12px;
        padding:0 10px;
        color:var(--muted);
        font-size:12px;
        gap:8px;
      }
      .advance-check input{transform:scale(1.1)}
      .advance-footnote{
        color:var(--muted);
        font-size:12px;
        margin-top:10px;
        line-height:1.5;
      }
      .advance-positive strong{color:#bbf7d0}
      .advance-warn strong{color:#fcd34d}
      .advance-danger strong{color:#fecaca}
      .advance-summary-card{
        background:rgba(255,255,255,.02);
      }
      @media (max-width: 1200px){
        .advance-row{
          grid-template-columns:1fr 1fr;
        }
        .advance-summary-grid{
          grid-template-columns:repeat(2,minmax(0,1fr));
        }
      }
      @media (max-width: 700px){
        .advance-row{
          grid-template-columns:1fr;
        }
        .advance-summary-grid{
          grid-template-columns:1fr;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function ensureAdvanceSummaryCards() {
    const summaryBox = document.querySelector("#jobModal .summary-box");
    if (!summaryBox) return;
    if (document.getElementById("sumAdvanceReceived")) return;

    summaryBox.insertAdjacentHTML("beforeend", `
      <div class="advance-summary-card"><span>Anticipo recibido</span><strong id="sumAdvanceReceived">$0.00</strong></div>
      <div class="advance-summary-card"><span>Gastado del anticipo</span><strong id="sumAdvanceSpent">$0.00</strong></div>
      <div class="advance-summary-card"><span>Disponible anticipo</span><strong id="sumAdvanceAvailable">$0.00</strong></div>
    `);
  }

  function ensureAdvanceSection() {
    if (document.getElementById("advanceControlBox")) return;

    const summaryBox = document.querySelector("#jobModal .summary-box");
    if (!summaryBox) return;

    const box = document.createElement("div");
    box.className = "box";
    box.id = "advanceControlBox";
    box.innerHTML = `
      <div class="advance-header">
        <div>
          <strong>Control de anticipo</strong>
          <div class="section-note mt-10">Registra el pago inicial recibido y ve cuánto ya usaste en materiales, compras, mano de obra o gastos del trabajo.</div>
        </div>
        <div class="advance-actions">
          <button id="advanceLoadMaterialsBtn" type="button" class="btn btn-secondary btn-small">Cargar materiales</button>
          <button id="advanceCopyPaymentsBtn" type="button" class="btn btn-info btn-small">Usar cobrado actual</button>
          <button id="advanceAddRowBtn" type="button" class="btn btn-secondary btn-small">+ Movimiento</button>
        </div>
      </div>

      <div class="grid-2 mt-12">
        <input id="jobAdvanceReceived" type="number" min="0" step="0.01" class="input" placeholder="Anticipo / pago inicial recibido" />
        <input id="jobAdvanceClientPending" type="text" class="input readonly" placeholder="Saldo pendiente del cliente" readonly />
      </div>

      <div class="advance-summary-grid">
        <div class="advance-stat">
          <span>Anticipo recibido</span>
          <strong id="jobAdvanceReceivedPreview">$0.00</strong>
        </div>
        <div class="advance-stat advance-warn">
          <span>Gastado del anticipo</span>
          <strong id="jobAdvanceSpentPreview">$0.00</strong>
        </div>
        <div class="advance-stat advance-positive">
          <span>Disponible del anticipo</span>
          <strong id="jobAdvanceAvailablePreview">$0.00</strong>
        </div>
        <div class="advance-stat advance-danger">
          <span>Saldo pendiente cliente</span>
          <strong id="jobAdvanceClientPendingPreview">$0.00</strong>
        </div>
      </div>

      <div id="advanceLedgerContainer" class="advance-ledger"></div>

      <div class="advance-footnote">
        Solo se descuenta del anticipo lo que esté marcado como <strong>Pagado</strong> y con <strong>Descontar anticipo</strong> activado.
      </div>
    `;

    summaryBox.parentNode.insertBefore(box, summaryBox);

    const addBtn = document.getElementById("advanceAddRowBtn");
    const loadBtn = document.getElementById("advanceLoadMaterialsBtn");
    const copyBtn = document.getElementById("advanceCopyPaymentsBtn");

    if (addBtn) addBtn.addEventListener("click", function () {
      getAdvanceLedgerContainer().appendChild(createAdvanceRow());
      renderAdvancePreview();
    });

    if (loadBtn) loadBtn.addEventListener("click", loadAdvanceRowsFromMaterials);
    if (copyBtn) copyBtn.addEventListener("click", copyAdvanceFromCurrentPayments);

    if (!getAdvanceLedgerContainer().children.length) {
      getAdvanceLedgerContainer().appendChild(createAdvanceRow());
    }
  }

  function getAdvanceLedgerContainer() {
    return document.getElementById("advanceLedgerContainer");
  }

  function moneySafe(value) {
    if (typeof money === "function") return money(value || 0);
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function safeText(value) {
    if (typeof safe === "function") return safe(value);
    return String(value || "");
  }

  function clean(value) {
    if (typeof cleanText === "function") return cleanText(value);
    return String(value || "").trim();
  }

  function createAdvanceRow(item = {}) {
    const row = document.createElement("div");
    row.className = "advance-row";
    row.innerHTML = `
      <input type="date" class="input" data-adv="date" value="${safeText(item.date || (typeof today === "function" ? today() : ""))}">
      <select class="select" data-adv="type">
        <option value="material">Material</option>
        <option value="compra">Compra</option>
        <option value="labor">Mano de obra</option>
        <option value="gasto">Gasto</option>
        <option value="instalacion">Instalación</option>
        <option value="otro">Otro</option>
      </select>
      <input class="input" data-adv="concept" placeholder="Concepto" value="${safeText(item.concept || "")}">
      <input type="number" min="0" step="0.01" class="input" data-adv="amount" placeholder="Monto" value="${safeText(item.amount || "")}">
      <select class="select" data-adv="status">
        <option value="Pendiente">Pendiente</option>
        <option value="Comprado">Comprado</option>
        <option value="Pagado">Pagado</option>
      </select>
      <label class="advance-check">
        <input type="checkbox" data-adv="apply">
        Descontar anticipo
      </label>
      <button type="button" class="btn btn-danger btn-small" data-adv="remove">✕</button>
    `;

    row.querySelector('[data-adv="type"]').value = item.type || "material";
    row.querySelector('[data-adv="status"]').value = item.status || "Pendiente";
    row.querySelector('[data-adv="apply"]').checked = !!item.applyToAdvance;

    row.querySelectorAll("input, select").forEach(el => {
      el.addEventListener("input", renderAdvancePreview);
      el.addEventListener("change", renderAdvancePreview);
    });

    row.querySelector('[data-adv="remove"]').addEventListener("click", function () {
      row.remove();
      const container = getAdvanceLedgerContainer();
      if (container && !container.children.length) {
        container.appendChild(createAdvanceRow());
      }
      renderAdvancePreview();
    });

    return row;
  }

  function getCurrentAdvanceLedger() {
    const rows = [...document.querySelectorAll(".advance-row")];
    return rows.map(row => ({
      date: clean(row.querySelector('[data-adv="date"]').value),
      type: clean(row.querySelector('[data-adv="type"]').value) || "material",
      concept: clean(row.querySelector('[data-adv="concept"]').value),
      amount: Number(row.querySelector('[data-adv="amount"]').value || 0),
      status: clean(row.querySelector('[data-adv="status"]').value) || "Pendiente",
      applyToAdvance: !!row.querySelector('[data-adv="apply"]').checked
    })).filter(item => item.date || item.concept || item.amount);
  }

  function normalizeAdvanceForSave(data = {}) {
    return {
      received: Number(data.received || 0),
      ledger: Array.isArray(data.ledger) ? data.ledger.map(item => ({
        date: clean(item.date),
        type: clean(item.type) || "material",
        concept: clean(item.concept),
        amount: Number(item.amount || 0),
        status: clean(item.status) || "Pendiente",
        applyToAdvance: !!item.applyToAdvance
      })).filter(item => item.date || item.concept || item.amount) : []
    };
  }

  function getCurrentAdvanceForm() {
    return normalizeAdvanceForSave({
      received: Number((document.getElementById("jobAdvanceReceived") || {}).value || 0),
      ledger: getCurrentAdvanceLedger()
    });
  }

  function computeAdvance(data = {}) {
    const normalized = normalizeAdvanceForSave(data);
    const spent = normalized.ledger.reduce((sum, item) => {
      const shouldCount = item.status === "Pagado" && item.applyToAdvance;
      return sum + (shouldCount ? Number(item.amount || 0) : 0);
    }, 0);
    const available = normalized.received - spent;
    return {
      received: normalized.received,
      spent,
      available,
      ledger: normalized.ledger
    };
  }

  function copyAdvanceFromCurrentPayments() {
    const paidEl = document.getElementById("sumPaid");
    let paid = 0;
    if (paidEl) {
      paid = Number(String(paidEl.textContent || "0").replace(/[^\d.-]/g, "")) || 0;
    }
    const input = document.getElementById("jobAdvanceReceived");
    if (input) input.value = paid ? paid.toFixed(2) : "";
    renderAdvancePreview();
    if (typeof showToast === "function") showToast("Anticipo copiado desde el total cobrado del trabajo.");
  }

  function loadAdvanceRowsFromMaterials() {
    const materials = typeof getCurrentFormMaterials === "function" ? getCurrentFormMaterials() : [];
    const valid = materials.filter(item => clean(item.name) && Number(item.qty || 0) > 0);
    if (!valid.length) {
      if (typeof showToast === "function") showToast("No hay materiales cargados en este trabajo.");
      return;
    }

    const container = getAdvanceLedgerContainer();
    valid.forEach(item => {
      container.appendChild(createAdvanceRow({
        date: typeof today === "function" ? today() : "",
        type: "material",
        concept: item.name,
        amount: Number(item.qty || 0) * Number(item.price || 0),
        status: "Pendiente",
        applyToAdvance: true
      }));
    });
    renderAdvancePreview();
    if (typeof showToast === "function") showToast("Se cargaron los materiales al control de anticipo.");
  }

  function loadAdvanceIntoForm(job = {}) {
    ensureAdvanceSection();
    ensureAdvanceSummaryCards();
    const advance = normalizeAdvanceForSave(job.advance || {});
    const receivedInput = document.getElementById("jobAdvanceReceived");
    const container = getAdvanceLedgerContainer();
    if (receivedInput) receivedInput.value = advance.received ? Number(advance.received).toFixed(2) : "";
    if (container) {
      container.innerHTML = "";
      if (advance.ledger.length) {
        advance.ledger.forEach(item => container.appendChild(createAdvanceRow(item)));
      } else {
        container.appendChild(createAdvanceRow());
      }
    }
    renderAdvancePreview();
  }

  function resetAdvanceForm() {
    loadAdvanceIntoForm({});
  }

  function renderAdvancePreview() {
    ensureAdvanceSection();
    ensureAdvanceSummaryCards();

    const advance = computeAdvance(getCurrentAdvanceForm());

    const saleInput = document.getElementById("jobSale");
    const sale = Number((saleInput || {}).value || 0);
    const paidEl = document.getElementById("sumPaid");
    let paid = 0;
    if (paidEl) paid = Number(String(paidEl.textContent || "0").replace(/[^\d.-]/g, "")) || 0;
    const clientPending = Math.max(sale - paid, 0);

    const receivedPreview = document.getElementById("jobAdvanceReceivedPreview");
    const spentPreview = document.getElementById("jobAdvanceSpentPreview");
    const availablePreview = document.getElementById("jobAdvanceAvailablePreview");
    const clientPendingPreview = document.getElementById("jobAdvanceClientPendingPreview");
    const clientPendingInput = document.getElementById("jobAdvanceClientPending");

    if (receivedPreview) receivedPreview.textContent = moneySafe(advance.received);
    if (spentPreview) spentPreview.textContent = moneySafe(advance.spent);
    if (availablePreview) availablePreview.textContent = moneySafe(advance.available);
    if (clientPendingPreview) clientPendingPreview.textContent = moneySafe(clientPending);
    if (clientPendingInput) clientPendingInput.value = moneySafe(clientPending);

    const sumReceived = document.getElementById("sumAdvanceReceived");
    const sumSpent = document.getElementById("sumAdvanceSpent");
    const sumAvailable = document.getElementById("sumAdvanceAvailable");
    if (sumReceived) sumReceived.textContent = moneySafe(advance.received);
    if (sumSpent) sumSpent.textContent = moneySafe(advance.spent);
    if (sumAvailable) sumAvailable.textContent = moneySafe(advance.available);
  }

  function redefineSaveJob() {
    if (window.__advanceSaveJobPatched || typeof saveJob !== "function") return;
    window.__advanceSaveJobPatched = true;

    saveJob = async function saveJobWithAdvance() {
      if (!guardWrite("guardar trabajos", "trabajos")) return;
      const quote = getCurrentQuoteForm();
      const quoteCalc = computeQuote(quote);
      const pricing = getCurrentPricingForm();
      const logsBase = state.editingJobId ? getJobActivityLog(getJobById(state.editingJobId) || {}) : [];
      const notesBase = state.editingJobId ? getJobInternalNotes(getJobById(state.editingJobId) || {}) : [];

      const saleValue = Number($("jobSale").value || 0);
      const fallbackSale = pricing.priceMode === "quote" ? quoteCalc.total : saleValue;

      const payload = {
        clientId: cleanText($("jobClientId").value),
        title: cleanText($("jobTitle").value),
        status: cleanText($("jobStatus").value) || "Cotización",
        date: cleanText($("jobDate").value) || today(),
        dueDate: cleanText($("jobDueDate").value),
        priority: cleanText($("jobPriority").value) || "Media",
        installation: getCurrentInstallationForm(cleanText($("jobClientId").value)),
        sale: Number(fallbackSale || 0),
        description: cleanText($("jobDescription").value),
        notes: cleanText($("jobNotes").value),
        materials: getCurrentFormMaterials(),
        quote,
        pricing,
        jobType: getEstimatorTemplate($("jobEstimatorType").value || "custom").label,
        estimate: getCurrentEstimatorForm(),
        checklist: getFormChecklist(),
        internalNotesLog: notesBase,
        advance: getCurrentAdvanceForm(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!payload.clientId) return showToast("Selecciona un cliente.");
      if (!payload.title) return showToast("Escribe el nombre del trabajo.");
      if (payload.sale < 0) return showToast("La venta no puede ser negativa.");

      try {
        if (state.editingJobId) {
          const existing = getJobById(state.editingJobId) || {};
          payload.payments = existing.payments || [];
          payload.designImages = existing.designImages || [];
          payload.activityLog = [...logsBase, newLogEntry("edición", "Trabajo actualizado.")];
          if (existing.paid) payload.paid = existing.paid;
          await jobsRef().doc(state.editingJobId).update(payload);
          showToast("Trabajo actualizado.");
        } else {
          payload.payments = [];
          payload.designImages = [...state.pendingJobImages];
          payload.activityLog = [newLogEntry("creación", "Trabajo creado.")];
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await jobsRef().add(payload);
          state.pendingJobImages = [];
          showToast("Trabajo guardado correctamente.");
        }
        closeModal("jobModal");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el trabajo.");
      }
    };
  }

  function patchFunctions() {
    if (typeof resetJobForm === "function" && !window.__advanceResetPatched) {
      const originalReset = resetJobForm;
      resetJobForm = function () {
        originalReset.apply(this, arguments);
        resetAdvanceForm();
      };
      window.__advanceResetPatched = true;
    }

    if (typeof editJob === "function" && !window.__advanceEditPatched) {
      const originalEdit = editJob;
      editJob = function (id) {
        originalEdit.apply(this, arguments);
        const job = typeof getJobById === "function" ? getJobById(id) : null;
        loadAdvanceIntoForm(job || {});
      };
      window.__advanceEditPatched = true;
    }

    if (typeof renderJobPreview === "function" && !window.__advancePreviewPatched) {
      const originalPreview = renderJobPreview;
      renderJobPreview = function () {
        originalPreview.apply(this, arguments);
        renderAdvancePreview();
      };
      window.__advancePreviewPatched = true;
    }

    redefineSaveJob();
  }

  function bindLiveEvents() {
    const input = document.getElementById("jobAdvanceReceived");
    if (input && !input.__advanceBound) {
      input.addEventListener("input", renderAdvancePreview);
      input.__advanceBound = true;
    }
  }

  function initAdvanceControl() {
    injectAdvanceStyles();
    ensureAdvanceSummaryCards();
    ensureAdvanceSection();
    bindLiveEvents();
    patchFunctions();
    renderAdvancePreview();
  }

  ready(function () {
    let attempts = 0;
    const timer = setInterval(function () {
      attempts += 1;
      const modalBody = document.querySelector("#jobModal .modal-body");
      if (modalBody && typeof saveJob === "function" && typeof renderJobPreview === "function") {
        clearInterval(timer);
        initAdvanceControl();
      }
      if (attempts > 60) clearInterval(timer);
    }, 250);
  });
})();
