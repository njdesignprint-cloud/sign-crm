(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function moneySafe(value) {
    if (typeof money === "function") return money(value || 0);
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function cleanSafe(value) {
    if (typeof cleanText === "function") return cleanText(value);
    return String(value || "").trim();
  }

  function todaySafe() {
    if (typeof today === "function") return today();
    return new Date().toISOString().slice(0, 10);
  }

  function injectStyles() {
    if (document.getElementById("advanceControlStyles")) return;
    const style = document.createElement("style");
    style.id = "advanceControlStyles";
    style.textContent = `
      .advance-header{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap}
      .advance-actions{display:flex;gap:8px;flex-wrap:wrap}
      .advance-summary-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:14px}
      .advance-stat{background:#101216;border:1px solid var(--line);border-radius:14px;padding:12px}
      .advance-stat span{display:block;color:var(--muted);font-size:11px;text-transform:uppercase}
      .advance-stat strong{display:block;margin-top:8px;font-size:19px}
      .advance-ledger{display:grid;gap:12px;margin-top:14px}
      .advance-row{display:grid;grid-template-columns:1fr 1.1fr 1.7fr .95fr 1fr auto auto;gap:10px;align-items:start;padding:12px;border:1px solid var(--line);border-radius:14px;background:#101216}
      .advance-check{display:flex;align-items:center;justify-content:center;min-height:42px;background:rgba(255,255,255,.02);border:1px solid var(--line);border-radius:12px;padding:0 10px;color:var(--muted);font-size:12px;gap:8px}
      .advance-check input{transform:scale(1.1)}
      .advance-footnote{color:var(--muted);font-size:12px;margin-top:10px;line-height:1.5}
      .advance-summary-card{background:rgba(255,255,255,.02)}
      @media (max-width: 1200px){
        .advance-row{grid-template-columns:1fr 1fr}
        .advance-summary-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
      }
      @media (max-width: 700px){
        .advance-row{grid-template-columns:1fr}
        .advance-summary-grid{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureSummaryExtraCards() {
    const summaryBox = qs("#jobModal .summary-box");
    if (!summaryBox || qs("#sumAdvanceReceived")) return;

    summaryBox.insertAdjacentHTML("beforeend", `
      <div class="advance-summary-card"><span>Anticipo recibido</span><strong id="sumAdvanceReceived">$0.00</strong></div>
      <div class="advance-summary-card"><span>Gastado del anticipo</span><strong id="sumAdvanceSpent">$0.00</strong></div>
      <div class="advance-summary-card"><span>Disponible anticipo</span><strong id="sumAdvanceAvailable">$0.00</strong></div>
    `);
  }

  function ensureAdvanceSection() {
    if (qs("#advanceControlBox")) return;

    const summaryBox = qs("#jobModal .summary-box");
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
        <div class="advance-stat"><span>Anticipo recibido</span><strong id="jobAdvanceReceivedPreview">$0.00</strong></div>
        <div class="advance-stat"><span>Gastado del anticipo</span><strong id="jobAdvanceSpentPreview">$0.00</strong></div>
        <div class="advance-stat"><span>Disponible del anticipo</span><strong id="jobAdvanceAvailablePreview">$0.00</strong></div>
        <div class="advance-stat"><span>Saldo pendiente cliente</span><strong id="jobAdvanceClientPendingPreview">$0.00</strong></div>
      </div>

      <div id="advanceLedgerContainer" class="advance-ledger"></div>

      <div class="advance-footnote">
        Solo se descuenta del anticipo lo que esté marcado como <strong>Pagado</strong> y con <strong>Descontar anticipo</strong> activado.
      </div>
    `;

    summaryBox.parentNode.insertBefore(box, summaryBox);

    qs("#advanceAddRowBtn")?.addEventListener("click", function () {
      getLedgerContainer().appendChild(createAdvanceRow());
      renderAdvancePreview();
    });

    qs("#advanceLoadMaterialsBtn")?.addEventListener("click", loadRowsFromMaterials);
    qs("#advanceCopyPaymentsBtn")?.addEventListener("click", copyFromCurrentPayments);

    if (!getLedgerContainer().children.length) {
      getLedgerContainer().appendChild(createAdvanceRow());
    }
  }

  function getLedgerContainer() {
    return qs("#advanceLedgerContainer");
  }

  function createAdvanceRow(item = {}) {
    const row = document.createElement("div");
    row.className = "advance-row";
    row.innerHTML = `
      <input type="date" class="input" data-adv="date" value="${item.date || todaySafe()}">
      <select class="select" data-adv="type">
        <option value="material">Material</option>
        <option value="compra">Compra</option>
        <option value="labor">Mano de obra</option>
        <option value="gasto">Gasto</option>
        <option value="instalacion">Instalación</option>
        <option value="otro">Otro</option>
      </select>
      <input class="input" data-adv="concept" placeholder="Concepto" value="${item.concept || ""}">
      <input type="number" min="0" step="0.01" class="input" data-adv="amount" placeholder="Monto" value="${item.amount ?? ""}">
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

    qs('[data-adv="type"]', row).value = item.type || "material";
    qs('[data-adv="status"]', row).value = item.status || "Pendiente";
    qs('[data-adv="apply"]', row).checked = !!item.applyToAdvance;

    row.querySelectorAll("input, select").forEach(el => {
      el.addEventListener("input", renderAdvancePreview);
      el.addEventListener("change", renderAdvancePreview);
    });

    qs('[data-adv="remove"]', row).addEventListener("click", function () {
      row.remove();
      if (!getLedgerContainer().children.length) {
        getLedgerContainer().appendChild(createAdvanceRow());
      }
      renderAdvancePreview();
    });

    return row;
  }

  function normalizeAdvance(data = {}) {
    return {
      received: Number(data.received || 0),
      ledger: Array.isArray(data.ledger) ? data.ledger.map(item => ({
        date: cleanSafe(item.date),
        type: cleanSafe(item.type) || "material",
        concept: cleanSafe(item.concept),
        amount: Number(item.amount || 0),
        status: cleanSafe(item.status) || "Pendiente",
        applyToAdvance: !!item.applyToAdvance
      })).filter(item => item.date || item.concept || item.amount) : []
    };
  }

  function getCurrentLedger() {
    return [...document.querySelectorAll(".advance-row")].map(row => ({
      date: cleanSafe(qs('[data-adv="date"]', row).value),
      type: cleanSafe(qs('[data-adv="type"]', row).value) || "material",
      concept: cleanSafe(qs('[data-adv="concept"]', row).value),
      amount: Number(qs('[data-adv="amount"]', row).value || 0),
      status: cleanSafe(qs('[data-adv="status"]', row).value) || "Pendiente",
      applyToAdvance: !!qs('[data-adv="apply"]', row).checked
    })).filter(item => item.date || item.concept || item.amount);
  }

  function getCurrentAdvanceForm() {
    return normalizeAdvance({
      received: Number(qs("#jobAdvanceReceived")?.value || 0),
      ledger: getCurrentLedger()
    });
  }

  function computeAdvance(data = {}) {
    const normalized = normalizeAdvance(data);
    const spent = normalized.ledger.reduce((sum, item) => {
      return sum + (item.status === "Pagado" && item.applyToAdvance ? Number(item.amount || 0) : 0);
    }, 0);
    return {
      received: normalized.received,
      spent,
      available: normalized.received - spent,
      ledger: normalized.ledger
    };
  }

  window.getJobAdvanceSummary = function (job = {}) {
    return computeAdvance(job.advance || {});
  };

  function copyFromCurrentPayments() {
    const paidText = qs("#sumPaid")?.textContent || "0";
    const paid = Number(String(paidText).replace(/[^\d.-]/g, "")) || 0;
    const input = qs("#jobAdvanceReceived");
    if (input) input.value = paid ? paid.toFixed(2) : "";
    renderAdvancePreview();
    if (typeof showToast === "function") showToast("Anticipo copiado desde el total cobrado del trabajo.");
  }

  function loadRowsFromMaterials() {
    const materials = typeof getCurrentFormMaterials === "function" ? getCurrentFormMaterials() : [];
    const valid = materials.filter(item => cleanSafe(item.name) && Number(item.qty || 0) > 0);
    if (!valid.length) {
      if (typeof showToast === "function") showToast("No hay materiales cargados en este trabajo.");
      return;
    }

    valid.forEach(item => {
      getLedgerContainer().appendChild(createAdvanceRow({
        date: todaySafe(),
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
    ensureSummaryExtraCards();

    const advance = normalizeAdvance(job.advance || {});
    const received = qs("#jobAdvanceReceived");
    const container = getLedgerContainer();

    if (received) received.value = advance.received ? Number(advance.received).toFixed(2) : "";

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
    ensureSummaryExtraCards();

    const advance = computeAdvance(getCurrentAdvanceForm());
    const sale = Number(qs("#jobSale")?.value || 0);
    const paidText = qs("#sumPaid")?.textContent || "0";
    const paid = Number(String(paidText).replace(/[^\d.-]/g, "")) || 0;
    const clientPending = Math.max(sale - paid, 0);

    qs("#jobAdvanceReceivedPreview").textContent = moneySafe(advance.received);
    qs("#jobAdvanceSpentPreview").textContent = moneySafe(advance.spent);
    qs("#jobAdvanceAvailablePreview").textContent = moneySafe(advance.available);
    qs("#jobAdvanceClientPendingPreview").textContent = moneySafe(clientPending);
    if (qs("#jobAdvanceClientPending")) qs("#jobAdvanceClientPending").value = moneySafe(clientPending);

    if (qs("#sumAdvanceReceived")) qs("#sumAdvanceReceived").textContent = moneySafe(advance.received);
    if (qs("#sumAdvanceSpent")) qs("#sumAdvanceSpent").textContent = moneySafe(advance.spent);
    if (qs("#sumAdvanceAvailable")) qs("#sumAdvanceAvailable").textContent = moneySafe(advance.available);
  }

  function patchSaveJob() {
    if (window.__advanceSavePatched || typeof saveJob !== "function") return;
    window.__advanceSavePatched = true;

    saveJob = async function saveJobWithAdvance() {
      if (!guardWrite("guardar trabajos", "trabajos")) return;
      const quote = getCurrentQuoteForm();
      const quoteCalc = computeQuote(quote);
      const pricing = getCurrentPricingForm();
      const currentJob = state.editingJobId ? (typeof getJobById === "function" ? getJobById(state.editingJobId) : null) : null;
      const logsBase = state.editingJobId ? getJobActivityLog(currentJob || {}) : [];
      const notesBase = state.editingJobId ? getJobInternalNotes(currentJob || {}) : [];

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
      console.log("ADVANCE before save:", JSON.stringify(payload.advance));

      if (!payload.clientId) return showToast("Selecciona un cliente.");
      if (!payload.title) return showToast("Escribe el nombre del trabajo.");
      if (payload.sale < 0) return showToast("La venta no puede ser negativa.");

      try {
        if (state.editingJobId) {
          const existing = currentJob || {};
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

  function patchLifecycle() {
    if (typeof resetJobForm === "function" && !window.__advanceResetPatched) {
      const original = resetJobForm;
      resetJobForm = function () {
        original.apply(this, arguments);
        resetAdvanceForm();
      };
      window.__advanceResetPatched = true;
    }

    if (typeof editJob === "function" && !window.__advanceEditPatched) {
      const original = editJob;
      editJob = function (id) {
        original.apply(this, arguments);
        const job = typeof getJobById === "function" ? getJobById(id) : null;
        loadAdvanceIntoForm(job || {});
      };
      window.__advanceEditPatched = true;
    }

    if (typeof renderJobPreview === "function" && !window.__advancePreviewPatched) {
      const original = renderJobPreview;
      renderJobPreview = function () {
        original.apply(this, arguments);
        renderAdvancePreview();
      };
      window.__advancePreviewPatched = true;
    }

    patchSaveJob();
  }

  function bindLive() {
    const input = qs("#jobAdvanceReceived");
    if (input && !input.__advanceBound) {
      input.addEventListener("input", renderAdvancePreview);
      input.__advanceBound = true;
    }
  }

  function init() {
    injectStyles();
    ensureSummaryExtraCards();
    ensureAdvanceSection();
    bindLive();
    patchLifecycle();
    renderAdvancePreview();
  }

  ready(function () {
    let tries = 0;
    const timer = setInterval(function () {
      tries += 1;
      if (qs("#jobModal .modal-body") && typeof saveJob === "function" && typeof renderJobPreview === "function") {
        clearInterval(timer);
        init();
      }
      if (tries > 80) clearInterval(timer);
    }, 250);
  });
})();
