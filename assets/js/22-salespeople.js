    const COMMISSION_BASE_LABELS = {
      collected: "customer payments actually collected",
      subtotal: "sale subtotal before sales tax",
      gross_profit: "gross profit (sale subtotal less documented direct job costs)"
    };
    let commissionSettlementRequestId = "";
    let commissionSettlementReview = null;
    let commissionSettlementPreviewUrl = "";

    function salespersonText(en, es) { return state.language === "es" ? es : en; }
    function commissionBaseLabel(key = "collected") {
      const labels = {
        collected: salespersonText("customer payments actually collected", "pagos del cliente realmente cobrados"),
        subtotal: salespersonText("sale subtotal before sales tax", "subtotal de la venta antes de impuestos"),
        gross_profit: salespersonText("gross profit (sale subtotal less documented direct job costs)", "ganancia bruta (subtotal menos costos directos documentados)")
      };
      return labels[key] || labels.collected;
    }

    function getSalespersonName(id = "", fallback = "") {
      return state.salespeople.find(item => item.id === id)?.name || fallback || "Unknown salesperson";
    }
    function getSalespersonDefaultPercent(id = "") {
      return Number(state.salespeople.find(item => item.id === id)?.commissionPercent || 0);
    }
    function getClientCommissionEstimate(client = {}) {
      const rate = Number(client.commissionPercent || 0) / 100;
      return state.jobs.filter(job => job.clientId === client.id && cleanText(job.status) !== "Cancelado").reduce((sum, job) => {
        let base = 0;
        if (client.commissionBase === "gross_profit") base = Math.max(0, Number(computeJob(job).profit || 0));
        else if (client.commissionBase === "subtotal") base = Math.max(0, Number(computeQuote(getQuote(job)).subtotal || job.sale || 0));
        else base = Math.max(0, Number(getPaymentsTotal(job) || 0));
        return sum + base * rate;
      }, 0);
    }
    function getSalespersonCommissionEstimate(id = "") {
      return state.jobs.filter(job => cleanText(job.status) !== "Cancelado").filter(job => {
        const client = state.clients.find(item => item.id === job.clientId);
        return (Object.hasOwn(job, "commission") ? job.commission?.salespersonId : client?.salespersonId) === id;
      }).reduce((sum, job) => {
        const client = state.clients.find(item => item.id === job.clientId) || {};
        const terms = Object.hasOwn(job, "commission") ? (job.commission || {}) : client;
        const rate = Number(terms.percent ?? terms.commissionPercent ?? 0) / 100;
        const baseType = terms.base || terms.commissionBase || "collected";
        let base = 0;
        if (baseType === "gross_profit") base = Math.max(0, Number(computeJob(job).profit || 0));
        else if (baseType === "subtotal") base = Math.max(0, Number(computeQuote(getQuote(job)).subtotal || job.sale || 0));
        else base = Math.max(0, Number(getPaymentsTotal(job) || 0));
        return sum + base * rate;
      }, 0);
    }
    function fillJobSalespersonSelect(selected = "") {
      const select = $("jobSalespersonId"); if (!select) return;
      const current = selected || select.value;
      select.innerHTML = `<option value="">${salespersonText("No salesperson", "Sin vendedor")}</option>` + state.salespeople
        .filter(item => item.status !== "inactive" || item.id === current)
        .map(item => `<option value="${safe(item.id)}">${safe(item.name)}${item.company ? ` · ${safe(item.company)}` : ""}</option>`).join("");
      select.value = current;
    }
    function resetJobCommissionForm() {
      $("jobCommissionBox")?.classList.toggle("hidden", !isAdmin());
      fillJobSalespersonSelect();
      if (isAdmin()) syncJobCommissionFromClient();
    }
    function syncJobCommissionFromClient() {
      if (!isAdmin()) return;
      const client = state.clients.find(item => item.id === $("jobClientId")?.value);
      const sellerId = client?.salesSource === "salesperson" ? (client.salespersonId || "") : "";
      fillJobSalespersonSelect(sellerId);
      $("jobSalespersonId").value = sellerId;
      $("jobCommissionPercent").value = sellerId ? Number(client.commissionPercent ?? getSalespersonDefaultPercent(sellerId) ?? 0) : 0;
      $("jobCommissionBase").value = client?.commissionBase || "collected";
    }
    function applyJobSalespersonDefaults() {
      const seller = state.salespeople.find(item => item.id === $("jobSalespersonId")?.value);
      $("jobCommissionPercent").value = seller ? Number(seller.commissionPercent || 0) : 0;
      $("jobCommissionBase").value = seller?.commissionBase || "collected";
    }
    function getCurrentJobCommissionTerms(currentJob = {}) {
      if (!isAdmin()) return currentJob.commission || {};
      const salespersonId = cleanText($("jobSalespersonId")?.value);
      if (!salespersonId) return { salespersonId: "", salespersonName: "", percent: 0, base: "collected" };
      return {
        salespersonId,
        salespersonName: getSalespersonName(salespersonId),
        percent: Math.max(0, Math.min(100, Number($("jobCommissionPercent")?.value || 0))),
        base: cleanText($("jobCommissionBase")?.value) || "collected"
      };
    }
    function setJobCommissionForm(job = {}) {
      $("jobCommissionBox")?.classList.toggle("hidden", !isAdmin());
      if (!isAdmin()) return;
      const client = state.clients.find(item => item.id === job.clientId) || {};
      const terms = Object.hasOwn(job, "commission") ? (job.commission || {}) : {
        salespersonId: client.salesSource === "salesperson" ? client.salespersonId : "",
        percent: client.commissionPercent,
        base: client.commissionBase
      };
      fillJobSalespersonSelect(terms.salespersonId || "");
      $("jobCommissionPercent").value = Number(terms.percent ?? getSalespersonDefaultPercent(terms.salespersonId) ?? 0);
      $("jobCommissionBase").value = terms.base || "collected";
    }
    function renderJobCommissionPreview(values = {}) {
      if (!$("jobCommissionProjected")) return;
      const rate = Math.max(0, Math.min(100, Number($("jobCommissionPercent")?.value || 0)));
      const baseType = $("jobCommissionBase")?.value || "collected";
      const quoteSubtotal = Number(computeQuote(getCurrentQuoteForm()).subtotal || 0);
      const projectedBase = baseType === "gross_profit" ? Math.max(0, Number(values.realProfit || 0)) : baseType === "subtotal" ? Math.max(0, quoteSubtotal || Number(values.sale || 0)) : Math.max(0, Number(values.sale || 0));
      const paid = Math.max(0, Number(values.paid || 0));
      const sale = Math.max(0, Number(values.sale || 0));
      const earnedBase = baseType === "collected" ? paid : projectedBase * (sale > 0 ? Math.min(paid / sale, 1) : 0);
      $("jobCommissionProjectedBase").textContent = money(projectedBase);
      $("jobCommissionRate").textContent = `${rate.toFixed(2)}%`;
      $("jobCommissionProjected").textContent = money(projectedBase * rate / 100);
      $("jobCommissionEarned").textContent = money(earnedBase * rate / 100);
    }
    function getJobCommissionBreakdown(job = {}) {
      const client = state.clients.find(item => item.id === job.clientId) || {};
      const terms = Object.hasOwn(job, "commission") ? (job.commission || {}) : {
        salespersonId: client.salespersonId || "", salespersonName: client.salespersonNameSnapshot || "",
        percent: client.commissionPercent || 0, base: client.commissionBase || "collected"
      };
      const sale = Math.max(0, Number(job.sale || 0));
      const paid = Math.max(0, Number(getPaymentsTotal(job) || 0));
      const rate = Math.max(0, Math.min(100, Number(terms.percent || 0)));
      const baseType = terms.base || "collected";
      const subtotal = Math.max(0, Number(computeQuote(getQuote(job)).subtotal || sale));
      const profit = Math.max(0, Number(computeJob(job).profitBeforeCommission || 0));
      const projectedBase = baseType === "gross_profit" ? profit : baseType === "subtotal" ? subtotal : sale;
      const earnedBase = baseType === "collected" ? paid : projectedBase * (sale > 0 ? Math.min(paid / sale, 1) : 0);
      const earned = cleanText(job.status) === "Cancelado" ? 0 : earnedBase * rate / 100;
      const previouslyPaid = state.commissionSettlements
        .filter(item => item.status !== "void")
        .flatMap(item => Array.isArray(item.lineItems) ? item.lineItems : [])
        .filter(line => line.jobId === job.id)
        .reduce((sum, line) => sum + Number(line.amount || 0), 0);
      return { salespersonId: terms.salespersonId || "", salespersonName: terms.salespersonName || getSalespersonName(terms.salespersonId, ""), rate, baseType, projectedBase, projected: projectedBase * rate / 100, earned, previouslyPaid, available: Math.max(0, earned - previouslyPaid), overpaid: Math.max(0, previouslyPaid - earned) };
    }
    function fillJobSalespersonFilter() {
      const select = $("jobSalespersonFilter"); if (!select) return;
      const current = select.value;
      const options = state.salespeople.map(item => `<option value="${safe(item.id)}">${safe(item.name)}</option>`).join("");
      const html = `<option value="">${state.language === "es" ? "Todos los vendedores" : "All salespeople"}</option>${options}`;
      if (select.innerHTML !== html) select.innerHTML = html;
      select.value = state.salespeople.some(item => item.id === current) ? current : "";
    }
    function getSalespersonOutstanding(id = "") {
      return state.jobs.reduce((sum, job) => { const calc = getJobCommissionBreakdown(job); return sum + (calc.salespersonId === id ? calc.available : 0); }, 0);
    }
    function getCommissionPaidTotal() {
      return state.commissionSettlements.filter(item => item.status !== "void").reduce((sum, item) => sum + Number(item.total || 0), 0);
    }
    function openCommissionSettlement(id) {
      const person = state.salespeople.find(item => item.id === id); if (!person) return;
      $("commissionSettlementSalespersonId").value = id;
      $("commissionSettlementTitle").textContent = `${salespersonText("Commission settlement", "Liquidación de comisión")} · ${person.name}`;
      $("commissionSettlementDate").value = today();
      const monthStart = `${today().slice(0, 7)}-01`;
      $("commissionSettlementFrom").value = monthStart; $("commissionSettlementTo").value = today();
      $("commissionSettlementMethod").value = "check"; $("commissionSettlementReference").value = ""; $("commissionSettlementNotes").value = "";
      $("commissionSettlementStatus").value = "paid";
      ["commissionSettlementBonuses","commissionSettlementChargebacks","commissionSettlementDeductions","commissionSettlementPriorBalance","commissionAdjustment1Amount","commissionAdjustment2Amount","commissionAdjustment3Amount"].forEach(field => $(field).value = "0");
      [1,2,3].forEach(index => { $(`commissionAdjustment${index}Reason`).value = ""; $(`commissionAdjustment${index}Date`).value = ""; });
      $("commissionSettlementPreparedBy").value = COMPANY.representativeName || COMPANY.legalName || COMPANY.name || state.userEmail || ""; $("commissionSettlementApprovedBy").value = "";
      commissionSettlementRequestId = (crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`).replace(/[^A-Za-z0-9-]/g, "");
      renderCommissionSettlementLines(); openModal("commissionSettlementModal");
    }
    function renderCommissionSettlementLines() {
      const salespersonId = $("commissionSettlementSalespersonId")?.value || "";
      const periodFrom = $("commissionSettlementFrom")?.value || "";
      const periodTo = $("commissionSettlementTo")?.value || "";
      const lines = state.jobs.map(job => ({ job, calc: getJobCommissionBreakdown(job) })).filter(item => {
        const jobDate = cleanText(item.job.date);
        const inPeriod = (!periodFrom || jobDate >= periodFrom) && (!periodTo || jobDate <= periodTo);
        return inPeriod && item.calc.salespersonId === salespersonId && item.calc.available > 0.005;
      });
      $("commissionSettlementLines").innerHTML = lines.map(({ job, calc }) => {
        const client = getClientById(job.clientId);
        return `<tr><td><input type="checkbox" data-commission-line="${safe(job.id)}" data-commission-amount="${calc.available.toFixed(2)}" checked /></td><td><strong>${safe(job.title || salespersonText("Job", "Trabajo"))}</strong><br><small>${safe(clientLabel(client))}</small></td><td><strong>${money(job.sale || 0)}</strong><br><small>${salespersonText("Job total", "Total registrado")}</small></td><td><strong>${money(calc.projectedBase)}</strong><br><small>${safe(commissionBaseLabel(calc.baseType))}</small></td><td><strong>${money(calc.projectedBase)} × ${calc.rate.toFixed(2)}% = ${money(calc.projected)}</strong><br><small>${salespersonText("Earned to date", "Ganada hasta hoy")}: ${money(calc.earned)}</small></td><td>${money(calc.previouslyPaid)}</td><td><strong>${money(calc.available)}</strong>${calc.overpaid ? `<br><small class="danger-text">${salespersonText("Overpaid", "Pagado de más")} ${money(calc.overpaid)}</small>` : ""}</td></tr>`;
      }).join("");
      $("commissionSettlementNoLines").classList.toggle("hidden", lines.length > 0);
      document.querySelectorAll("[data-commission-line]").forEach(input => input.addEventListener("change", updateCommissionSettlementTotal));
      updateCommissionSettlementTotal();
    }
    function updateCommissionSettlementTotal() {
      const checked = Array.from(document.querySelectorAll("[data-commission-line]:checked"));
      const total = checked.reduce((sum, input) => sum + Number(input.dataset.commissionAmount || 0), 0);
      $("commissionSettlementSelectedCount").textContent = String(checked.length); $("commissionSettlementTotal").textContent = money(total);
    }
    function commissionSettlementDocumentId(salespersonId, lineItems) {
      const source = `${salespersonId}|${lineItems.map(line => `${line.jobId}:${line.earnedAtSettlement}:${line.previouslyPaid}:${line.amount}`).sort().join("|")}`;
      let hash = 2166136261;
      for (let index = 0; index < source.length; index += 1) { hash ^= source.charCodeAt(index); hash = Math.imul(hash, 16777619); }
      return `commission-${(hash >>> 0).toString(16)}-${lineItems.length}`;
    }
    async function saveCommissionSettlement() {
      return prepareCommissionSettlementReview();
      if (!guardWrite("record commission payments", "vendedores")) return;
      const salespersonId = $("commissionSettlementSalespersonId").value;
      const person = state.salespeople.find(item => item.id === salespersonId);
      const periodFrom = $("commissionSettlementFrom").value || "";
      const periodTo = $("commissionSettlementTo").value || "";
      if (periodFrom && periodTo && periodFrom > periodTo) return showToast("The statement start date cannot be after the end date.");
      const selected = Array.from(document.querySelectorAll("[data-commission-line]:checked"));
      if (!person || !selected.length) return showToast("Select at least one earned commission.");
      const lineItems = selected.map(input => {
        const job = getJobById(input.dataset.commissionLine); const calc = getJobCommissionBreakdown(job); const client = getClientById(job.clientId);
        return { jobId: job.id, jobTitle: job.title || "Job", clientId: job.clientId || "", clientName: clientLabel(client), rate: calc.rate, base: calc.baseType, earnedAtSettlement: Number(calc.earned.toFixed(2)), previouslyPaid: Number(calc.previouslyPaid.toFixed(2)), amount: Number(calc.available.toFixed(2)) };
      }).filter(line => line.amount > 0);
      const total = lineItems.reduce((sum, line) => sum + line.amount, 0);
      if (total <= 0) return showToast("There is no outstanding commission to pay.");
      const button = $("saveCommissionSettlementBtn"); button.disabled = true;
      try {
        const settlementId = commissionSettlementDocumentId(salespersonId, lineItems);
        const settlement = commissionSettlementsRef().doc(settlementId);
        const payload = { salespersonId, salespersonName: person.name, paymentDate: $("commissionSettlementDate").value || today(), periodFrom, periodTo, method: $("commissionSettlementMethod").value || "other", reference: cleanText($("commissionSettlementReference").value), notes: cleanText($("commissionSettlementNotes").value), status: "paid", lineItems, total: Number(total.toFixed(2)), requestId:commissionSettlementRequestId, recordedBy: state.userEmail || "", createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() };
        await firebase.firestore().runTransaction(async transaction => {
          const existing = await transaction.get(settlement);
          if (existing.exists) throw new Error("duplicate-commission-settlement");
          transaction.set(settlement, payload);
        });
        await postAccountingSource("commission", settlement.id);
        let emailMessage = "";
        try {
          const pdf = buildCommissionSettlementPdf({ id:settlement.id, ...payload });
          if (typeof addPdfFooter === "function") addPdfFooter(pdf, "customer");
          const pdfBase64 = pdf.output("datauristring").replace(/^data:application\/pdf;filename=[^;]*;base64,|^data:application\/pdf;base64,/, "");
          const result = (await cloudFunctions.httpsCallable("sendSalesDocumentEmail")({ kind:"commission_settlement", ownerId:state.accountOwnerId || state.uid, settlementId:settlement.id, pdfBase64 })).data || {};
          emailMessage = result.sent ? ` Correo enviado a ${result.recipient}.` : " El vendedor no tiene un correo válido; el pago quedó guardado sin enviar correo.";
        } catch (emailError) { console.error(emailError); emailMessage = " El pago quedó guardado, pero no se pudo enviar el correo."; }
        closeModal("commissionSettlementModal"); showToast(`Pago de comisión registrado.${emailMessage}`);
      } catch (error) { console.error(error); showToast(error?.message === "duplicate-commission-settlement" ? "Esta comisión ya fue liquidada. Actualiza la lista antes de continuar." : "No se pudo registrar el pago de comisión."); }
      finally { button.disabled = false; }
    }
    async function voidCommissionSettlement(id) {
      if (!guardWrite("void commission settlements", "vendedores")) return;
      const item = state.commissionSettlements.find(row => row.id === id); if (!item || item.status === "void") return;
      if (!confirm("Void this commission settlement? The record will remain in the audit history.")) return;
      try { await commissionSettlementsRef().doc(id).update({ status: "void", voidedAt: firebase.firestore.FieldValue.serverTimestamp(), voidedBy: state.userEmail || "", updatedAt: firebase.firestore.FieldValue.serverTimestamp() }); await postAccountingSource("commission", id); showToast("Commission settlement voided."); }
      catch (error) { console.error(error); showToast("The settlement could not be voided."); }
    }
    function fillClientSalespersonSelect(selected = "") {
      const select = $("clientSalespersonId");
      if (!select) return;
      const current = selected || select.value;
      select.innerHTML = '<option value="">Select salesperson</option>' + state.salespeople
        .filter(item => item.status !== "inactive" || item.id === current)
        .map(item => `<option value="${safe(item.id)}">${safe(item.name)}${item.company ? ` · ${safe(item.company)}` : ""}</option>`).join("");
      select.value = current;
    }
    function toggleClientCommissionFields() {
      const enabled = $("clientSource")?.value === "salesperson";
      ["clientSalespersonId", "clientCommissionPercent", "clientCommissionBase"].forEach(id => { if ($(id)) $(id).disabled = !enabled; });
      ["clientSalespersonField", "clientCommissionPercentField", "clientCommissionBaseField"].forEach(id => $(id)?.classList.toggle("commission-field-muted", !enabled));
    }
    function applySelectedSalespersonDefaults() {
      const seller = state.salespeople.find(item => item.id === $("clientSalespersonId").value);
      if (!seller) return;
      $("clientCommissionPercent").value = Number(seller.commissionPercent || 0);
      $("clientCommissionBase").value = seller.commissionBase || "collected";
    }
    function resetSalespersonForm() {
      state.editingSalespersonId = null;
      $("salespersonModalTitle").textContent = salespersonText("New salesperson", "Nuevo vendedor");
      ["salespersonName", "salespersonCompany", "salespersonEmail", "salespersonPhone", "salespersonAddress", "salespersonCommissionPercent", "salespersonNotes"].forEach(id => $(id).value = "");
      $("salespersonCommissionBase").value = "collected";
      $("salespersonPaymentSchedule").value = "monthly";
      $("salespersonStatus").value = "active";
      $("salespersonDocumentLanguage").value = state.language === "es" ? "es" : "en";
      $("salespersonExternalId").value = ""; $("salespersonTerritory").value = "";
    }
    async function saveSalesperson() {
      if (!guardWrite("save salespeople", "vendedores")) return;
      const percent = Number($("salespersonCommissionPercent").value || 0);
      const payload = {
        name: cleanText($("salespersonName").value), company: cleanText($("salespersonCompany").value),
        email: normalizedEmail($("salespersonEmail").value), phone: cleanText($("salespersonPhone").value),
        address: cleanText($("salespersonAddress").value), commissionPercent: Math.max(0, Math.min(100, percent)),
        commissionBase: cleanText($("salespersonCommissionBase").value) || "collected",
        paymentSchedule: cleanText($("salespersonPaymentSchedule").value) || "monthly",
        documentLanguage: $("salespersonDocumentLanguage").value === "es" ? "es" : "en",
        externalId: cleanText($("salespersonExternalId").value), territory: cleanText($("salespersonTerritory").value),
        status: $("salespersonStatus").value === "inactive" ? "inactive" : "active",
        notes: cleanText($("salespersonNotes").value), updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };
      if (!payload.name) return showToast("Enter the salesperson's legal name.");
      try {
        if (state.editingSalespersonId) await salespeopleRef().doc(state.editingSalespersonId).update(payload);
        else { payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(); await salespeopleRef().add(payload); }
        closeModal("salespersonModal"); showToast("Salesperson saved.");
      } catch (error) { console.error(error); showToast("The salesperson could not be saved."); }
    }
    function editSalesperson(id) {
      const item = state.salespeople.find(row => row.id === id); if (!item) return;
      state.editingSalespersonId = id; $("salespersonModalTitle").textContent = salespersonText("Edit salesperson", "Editar vendedor");
      $("salespersonName").value = item.name || ""; $("salespersonCompany").value = item.company || "";
      $("salespersonEmail").value = item.email || ""; $("salespersonPhone").value = item.phone || "";
      $("salespersonAddress").value = item.address || ""; $("salespersonCommissionPercent").value = Number(item.commissionPercent || 0);
      $("salespersonCommissionBase").value = item.commissionBase || "collected"; $("salespersonPaymentSchedule").value = item.paymentSchedule || "monthly";
      $("salespersonStatus").value = item.status === "inactive" ? "inactive" : "active"; $("salespersonNotes").value = item.notes || "";
      $("salespersonDocumentLanguage").value = item.documentLanguage === "es" ? "es" : "en";
      $("salespersonExternalId").value = item.externalId || ""; $("salespersonTerritory").value = item.territory || "";
      openModal("salespersonModal");
    }
    async function deleteSalesperson(id) {
      if (!guardDelete("delete salespeople", "vendedores")) return;
      const assigned = state.clients.filter(client => client.salespersonId === id).length;
      const referenced = state.jobs.some(job => job.commission?.salespersonId === id) || state.commissionSettlements.some(item => item.salespersonId === id);
      if (assigned || referenced) return showToast("This salesperson has business history. Set them inactive instead.");
      if (!confirm("Move this salesperson to Trash?")) return;
      try { await moveRecordToTrash("salespeople", id, "salesperson"); showToast("Salesperson moved to Trash."); } catch (error) { console.error(error); showToast(error?.message || "The salesperson could not be archived."); }
    }
    function renderSalespeople() {
      const body = $("salespeopleBody"); if (!body) return;
      const q = cleanText($("salespersonSearch")?.value).toLowerCase();
      const rows = state.salespeople.filter(item => `${item.name || ""} ${item.company || ""} ${item.email || ""} ${item.phone || ""}`.toLowerCase().includes(q));
      body.innerHTML = rows.map(item => {
        const clients = state.clients.filter(client => client.salespersonId === item.id).length;
        return `<tr><td><strong>${safe(item.name)}</strong><br><small>${safe(item.company || "-")}</small></td><td>${safe(item.email || "-")}<br><small>${safe(item.phone || "-")}</small></td><td>${Number(item.commissionPercent || 0).toFixed(2)}%<br><small>${safe(commissionBaseLabel(item.commissionBase))}</small></td><td>${clients}</td><td><strong>${money(getSalespersonOutstanding(item.id))}</strong><br><small>${salespersonText("Earned and not settled", "Ganada y pendiente de liquidar")}</small></td><td><span class="pill ${item.status === "inactive" ? "state-disabled" : "state-active"}">${item.status === "inactive" ? salespersonText("Inactive", "Inactivo") : salespersonText("Active", "Activo")}</span></td><td><div class="actions-row"><button class="btn btn-primary btn-small" data-new-commission-settlement="${item.id}">${salespersonText("Pay commission", "Pagar comisión")}</button><button class="btn btn-info btn-small" data-salesperson-agreement="${item.id}">${salespersonText("Agreement PDF", "PDF acuerdo")}</button><button class="btn btn-secondary btn-small" data-edit-salesperson="${item.id}">${salespersonText("Edit", "Editar")}</button><button class="btn btn-danger btn-small" data-delete-salesperson="${item.id}">${salespersonText("Delete", "Eliminar")}</button></div></td></tr>`;
      }).join("");
      $("salespeopleEmpty").classList.toggle("hidden", rows.length > 0);
      $("activeSalespeopleCount").textContent = state.salespeople.filter(item => item.status !== "inactive").length;
      $("salespersonClientsCount").textContent = state.clients.filter(client => client.salesSource === "salesperson").length;
      $("commissionOutstandingTotal").textContent = money(state.salespeople.reduce((sum, item) => sum + getSalespersonOutstanding(item.id), 0));
      $("commissionPaidTotal").textContent = money(getCommissionPaidTotal());
    }
    function renderCommissionSettlements() {
      const body = $("commissionSettlementsBody"); if (!body) return;
      body.innerHTML = state.commissionSettlements.map(item => `<tr class="${item.status === "void" ? "commission-settlement-void" : ""}"><td>${safe(item.paymentDate || "-")}</td><td>${safe(item.salespersonName || getSalespersonName(item.salespersonId, "-"))}</td><td>${Array.isArray(item.lineItems) ? item.lineItems.length : 0}</td><td>${safe(item.method || "-")}<br><small>${safe(item.reference || "-")}</small></td><td><strong>${money(item.total)}</strong></td><td><span class="pill ${item.status === "void" ? "state-disabled" : "state-active"}">${item.status === "void" ? salespersonText("Voided", "Anulada") : salespersonText("Paid", "Pagada")}</span></td><td><div class="actions-row"><button class="btn btn-info btn-small" data-commission-settlement-pdf="${item.id}">${salespersonText("Statement PDF", "PDF liquidación")}</button>${item.status !== "void" ? `<button class="btn btn-danger btn-small" data-void-commission-settlement="${item.id}">${salespersonText("Void", "Anular")}</button>` : ""}</div></td></tr>`).join("");
      $("commissionSettlementsEmpty").classList.toggle("hidden", state.commissionSettlements.length > 0);
    }
    function pdfWrappedText(pdf, text, x, y, width, lineHeight = 5) {
      const lines = pdf.splitTextToSize(text, width); pdf.text(lines, x, y); return y + lines.length * lineHeight;
    }
    function exportSalespersonAgreement(id) {
      const person = state.salespeople.find(item => item.id === id); if (!person) return showToast("Salesperson not found.");
      const { jsPDF } = window.jspdf; const pdf = new jsPDF("p", "mm", "letter");
      const percent = Number(person.commissionPercent || 0).toFixed(2); const base = COMMISSION_BASE_LABELS[person.commissionBase] || COMMISSION_BASE_LABELS.collected;
      const schedule = { monthly: "monthly, within 10 business days after month-end", biweekly: "every two weeks", per_job: "after each eligible job is fully collected" }[person.paymentSchedule] || "monthly";
      pdf.setFillColor(...(typeof companyPdfColor === "function" ? companyPdfColor() : [15,23,42])); pdf.rect(0, 0, 216, 30, "F"); pdf.setTextColor(255,255,255); pdf.setFontSize(19); pdf.text("SALES COMMISSION AGREEMENT", 14, 18);
      pdf.setTextColor(35,35,35); pdf.setFontSize(9); let y = 39;
      y = pdfWrappedText(pdf, `Effective date: ____________________   Company legal name: ${COMPANY.legalName || COMPANY.name}   Salesperson: ${person.name}${person.company ? ` (${person.company})` : ""}`, 14, y, 188) + 3;
      const sections = [
        ["1. Appointment and scope", "The Company appoints the Salesperson on a non-exclusive basis to introduce prospective customers and support sales activity. The Salesperson may not sign contracts, promise pricing, extend credit, collect funds, or otherwise bind the Company unless separately authorized in writing."],
        ["2. Commission", `The commission rate is ${percent}% of ${base}. A commission is earned only after the Company receives and clears the applicable customer payment. Sales tax, refunds, credits, chargebacks, financing fees, bad debt, and amounts never collected are excluded. If a qualifying payment is later refunded or charged back, the related commission may be offset against a future payment.`],
        ["3. Customer attribution", "A customer qualifies only when the Company records that customer under the Salesperson in SignShop HQ before the applicable sale, or confirms the attribution in writing. Existing Company customers and unapproved duplicate leads are excluded unless the Company agrees otherwise in writing."],
        ["4. Statements and payment timing", `The Company will calculate eligible commissions and pay them ${schedule}, together with a reasonable statement of the underlying eligible receipts. The Salesperson must report a good-faith discrepancy within 30 days after receiving the statement.`],
        ["5. Expenses and taxes", "The Salesperson is responsible for personal expenses unless the Company approves an expense in writing. Tax reporting and withholding will follow the worker's actual legal classification and applicable law; the title of this agreement does not determine that classification."],
        ["6. Confidentiality and customer information", "Pricing, customer lists, designs, estimates, credentials, financial information, and non-public business information are confidential. They may be used only for authorized Company business and must be returned or deleted upon request or termination. The Salesperson must protect customer data and immediately report suspected unauthorized access."],
        ["7. Term and termination", "Either party may terminate this agreement by written notice. Properly earned commissions on payments cleared before termination remain payable. Post-termination payments qualify only if the Company confirms the applicable customer and sale in writing. Sections concerning payment adjustments, confidentiality, records, and dispute terms survive termination."],
        ["8. Relationship and compliance", "The parties will comply with applicable law and Company-approved sales practices. Nothing in this agreement guarantees work, exclusivity, territory, or minimum compensation. The parties acknowledge that worker classification depends on the actual facts, including direction and control, and cannot be established merely by a contract label."],
        ["9. General terms", `${COMPANY.governingState || "Texas"} law governs this agreement, without regard to conflict-of-law rules. This document and approved written addenda are the entire agreement about commissions. Changes must be in writing and signed by both parties. Electronic signatures and counterparts are permitted.`],
      ];
      sections.forEach(([heading, text]) => {
        const needed = pdf.splitTextToSize(text, 188).length * 5 + 11; if (y + needed > 245) { pdf.addPage(); y = 18; }
        pdf.setFont(undefined, "bold"); pdf.setFontSize(10); pdf.text(heading, 14, y); y += 5; pdf.setFont(undefined, "normal"); pdf.setFontSize(9); y = pdfWrappedText(pdf, text, 14, y, 188) + 4;
      });
      if (y > 220) { pdf.addPage(); y = 20; }
      pdf.setFont(undefined, "bold"); pdf.text("AGREED AND ACCEPTED", 14, y); y += 13; pdf.setFont(undefined, "normal");
      pdf.text(`Company representative / title: ${COMPANY.representativeName || "________________"}${COMPANY.representativeTitle ? ` / ${COMPANY.representativeTitle}` : ""}`, 14, y); pdf.text("Salesperson: __________________________", 112, y); y += 10;
      pdf.text("Signature: ______________________________________", 14, y); pdf.text("Signature: ______________________________", 112, y); y += 10;
      pdf.text("Date: __________________________________________", 14, y); pdf.text("Date: __________________________________", 112, y);
      pdf.setFontSize(7); pdf.setTextColor(100,100,100); pdf.text("Template generated by SignShop HQ. Have qualified legal and tax professionals review it for your actual relationship and jurisdiction.", 14, 267);
      if (typeof savePdf === "function") savePdf(pdf, `Commission_Agreement_${pdfSafeFileName(person.name, "salesperson")}_${today()}.pdf`);
      else pdf.save(`Commission_Agreement_${person.name.replace(/[^a-z0-9]+/gi, "_")}_${today()}.pdf`);
      showToast("Commission agreement PDF downloaded.");
    }
    function exportSalespeoplePdf() {
      const { jsPDF } = window.jspdf; const pdf = typeof createModulePdf === "function" ? createModulePdf("Salespeople & commissions", "Internal commission overview") : new jsPDF();
      pdf.autoTable({ startY: typeof createModulePdf === "function" ? 56 : 29, head: [["Salesperson", "Contact", "Default rate", "Base", "Clients", "Outstanding", "Status"]], body: state.salespeople.length ? state.salespeople.map(item => [item.name, item.email || item.phone || "-", `${Number(item.commissionPercent || 0).toFixed(2)}%`, COMMISSION_BASE_LABELS[item.commissionBase] || COMMISSION_BASE_LABELS.collected, state.clients.filter(client => client.salespersonId === item.id).length, money(getSalespersonOutstanding(item.id)), item.status === "inactive" ? "Inactive" : "Active"]) : (typeof pdfEmptyRow === "function" ? pdfEmptyRow(7) : [["No records found","","","","","",""]]), headStyles: { fillColor: typeof companyPdfColor === "function" ? companyPdfColor() : [15,23,42] }, styles: { fontSize: 8 } });
      if (typeof savePdf === "function") savePdf(pdf, `Salespeople_Commissions_${today()}.pdf`); else pdf.save(`Salespeople_Commissions_${today()}.pdf`);
    }
    function buildCommissionSettlementPdfLegacy(item) {
      const { jsPDF } = window.jspdf; const pdf = typeof createModulePdf === "function" ? createModulePdf(pdfText("Commission payment statement", "Liquidación de pago de comisión"), pdfText("Payment record and acknowledgment", "Registro y confirmación del pago")) : new jsPDF("p", "mm", "letter");
      const methodLabels = { check:"Cheque", ach:"ACH / transferencia bancaria", cash:"Efectivo", zelle:"Zelle", other:"Otro" };
      pdf.setTextColor(35,35,35); pdf.setFontSize(10);
      pdf.autoTable({ startY: typeof createModulePdf === "function" ? 56 : 38, head: [[pdfText("Field", "Campo"), pdfText("Details", "Detalles")]], body: [[pdfText("Company", "Empresa"), COMPANY.legalName || COMPANY.name],[pdfText("Salesperson", "Vendedor"), item.salespersonName || "-"],[pdfText("Payment date", "Fecha del pago"), item.paymentDate || "-"],[pdfText("Statement period", "Período liquidado"), `${item.periodFrom || "-"} ${pdfText("to", "a")} ${item.periodTo || "-"}`],[pdfText("Payment method", "Método de pago"), methodLabels[item.method] || item.method || "-"],[pdfText("Reference", "Referencia"), item.reference || "-"],[pdfText("Status", "Estado"), item.status === "void" ? pdfText("VOID", "ANULADA") : pdfText("PAID", "PAGADA")]], headStyles:{fillColor:typeof companyPdfColor === "function" ? companyPdfColor() : [15,23,42]}, styles:{fontSize:9} });
      const settlementLines = item.lineItems || [];
      pdf.autoTable({ startY: pdf.lastAutoTable.finalY + 8, head: [[pdfText("Job", "Trabajo"), pdfText("Client", "Cliente"), pdfText("Rate", "Tarifa"), pdfText("Base", "Base"), pdfText("Amount", "Importe")]], body: settlementLines.length ? settlementLines.map(line => [line.jobTitle || "-", line.clientName || "-", `${Number(line.rate || 0).toFixed(2)}%`, commissionBaseLabel(line.base), money(line.amount)]) : (typeof pdfEmptyRow === "function" ? pdfEmptyRow(5) : [["No se encontraron registros","","","",""]]), headStyles:{fillColor:typeof companyPdfColor === "function" ? companyPdfColor() : [15,23,42]}, styles:{fontSize:8} });
      let y = pdf.lastAutoTable.finalY + 10; pdf.setFont(undefined,"bold"); pdf.setFontSize(12); pdf.text(`${pdfText("TOTAL PAID", "TOTAL PAGADO")}: ${money(item.total)}`,14,y); y += 10; pdf.setFont(undefined,"normal"); pdf.setFontSize(9); y = pdfWrappedText(pdf, `${pdfText("Notes", "Notas")}: ${item.notes || "-"}`,14,y,188) + 14;
      if (y > 235) { pdf.addPage(); y = 25; } pdf.text(pdfText("Company representative: __________________________", "Representante de la empresa: _____________________"),14,y); pdf.text(pdfText("Salesperson: __________________________", "Vendedor: __________________________"),112,y); y += 10; pdf.text(pdfText("Signature: ______________________________________", "Firma: _________________________________________"),14,y); pdf.text(pdfText("Signature: ______________________________", "Firma: ______________________________"),112,y); y += 10; pdf.text(pdfText("Date: __________________________________________", "Fecha: _________________________________________"),14,y); pdf.text(pdfText("Date: __________________________________", "Fecha: _________________________________"),112,y);
      return pdf;
    }
    async function exportCommissionSettlementPdfLegacy(id) {
      const item = state.commissionSettlements.find(row => row.id === id); if (!item) return showToast("No se encontró la liquidación.");
      const pdf = buildCommissionSettlementPdf(item);
      if (typeof savePdf === "function") savePdf(pdf, `Commission_Statement_${pdfSafeFileName(item.salespersonName, "salesperson")}_${item.paymentDate || today()}.pdf`);
      else pdf.save(`Commission_Statement_${(item.salespersonName || "salesperson").replace(/[^a-z0-9]+/gi,"_")}_${item.paymentDate || today()}.pdf`);
      showToast("PDF de liquidación descargado.");
    }
    function commissionMoney(value) { return Number(value || 0).toLocaleString("en-US", { style:"currency", currency:"USD" }); }
    function commissionDisplayDate(value, language="en") { if(!/^\d{4}-\d{2}-\d{2}$/.test(value||""))return value||""; const [year,month,day]=value.split("-"); return language==="es"?`${day}/${month}/${year}`:`${month}/${day}/${year}`; }
    function commissionDisplayNumber(id="",paymentDate="") { const year=(paymentDate||today()).slice(0,4),suffix=(id.match(/[a-f0-9]{4,}/i)?.[0]||id||"0000").slice(-6).toUpperCase(); return `COM-${year}-${suffix}`; }
    function commissionInvoiceOrWorkOrder(job={}) { const invoice=state.salesDocuments.find(document=>document.type==="invoice"&&document.status!=="void"&&document.jobId===job.id); return invoice?.number||job.number||job.workOrder||job.workOrderNumber||job.invoiceNumber||`WO-${String(job.id||"").slice(-6).toUpperCase()}`; }
    function commissionCompactProjectTitle(value="",maxLength=46) { const title=cleanText(value); return title.length<=maxLength?title:`${title.slice(0,maxLength-3).trimEnd()}...`; }
    function collectCommissionSettlementPayload() {
      const salespersonId=$("commissionSettlementSalespersonId").value, person=state.salespeople.find(row=>row.id===salespersonId), selected=Array.from(document.querySelectorAll("[data-commission-line]:checked"));
      if(!person||!selected.length)throw new Error("Selecciona al menos una comisión ganada."); if(selected.length>6)throw new Error("La plantilla permite hasta 6 trabajos por liquidación.");
      const periodFrom=$("commissionSettlementFrom").value||"",periodTo=$("commissionSettlementTo").value||""; if(periodFrom&&periodTo&&periodFrom>periodTo)throw new Error("La fecha inicial no puede ser posterior a la final.");
      const lineItems=selected.map(input=>{const job=getJobById(input.dataset.commissionLine),calc=getJobCommissionBreakdown(job),client=getClientById(job.clientId);return{jobId:job.id,jobTitle:job.title||"Job",invoiceWo:commissionInvoiceOrWorkOrder(job),clientId:job.clientId||"",clientName:clientLabel(client),paidDate:job.lastPaymentDate||$("commissionSettlementDate").value||today(),saleAmount:Number(job.sale||0),eligibleBase:Number(calc.projectedBase||0),rate:calc.rate,base:calc.baseType,earnedAtSettlement:Number(calc.earned.toFixed(2)),previouslyPaid:Number(calc.previouslyPaid.toFixed(2)),amount:Number(calc.available.toFixed(2))};});
      const grossCommission=lineItems.reduce((sum,row)=>sum+row.amount,0),adjustments=[1,2,3].map(index=>({reason:cleanText($(`commissionAdjustment${index}Reason`).value),amount:Number($(`commissionAdjustment${index}Amount`).value||0),effectiveDate:$(`commissionAdjustment${index}Date`).value||""}));
      const bonuses=Number($("commissionSettlementBonuses").value||0),chargebacks=Math.abs(Number($("commissionSettlementChargebacks").value||0)),otherDeductions=Math.abs(Number($("commissionSettlementDeductions").value||0)),priorBalance=Number($("commissionSettlementPriorBalance").value||0),total=grossCommission+bonuses-chargebacks-otherDeductions+priorBalance+adjustments.reduce((sum,row)=>sum+row.amount,0);
      return{salespersonId,salespersonName:person.name,salespersonExternalId:person.externalId||"",salespersonEmail:person.email||"",salespersonPhone:person.phone||"",territory:person.territory||"",documentLanguage:person.documentLanguage==="es"?"es":"en",paymentDate:$("commissionSettlementDate").value||today(),periodFrom,periodTo,method:$("commissionSettlementMethod").value||"other",reference:cleanText($("commissionSettlementReference").value),notes:cleanText($("commissionSettlementNotes").value),status:$("commissionSettlementStatus").value==="pending"?"pending":"paid",preparedBy:cleanText($("commissionSettlementPreparedBy").value),approvedBy:cleanText($("commissionSettlementApprovedBy").value),lineItems,adjustments,grossCommission:Number(grossCommission.toFixed(2)),bonuses,chargebacks,otherDeductions,priorBalance,total:Number(total.toFixed(2)),requestId:commissionSettlementRequestId,recordedBy:state.userEmail||""};
    }
    function setCommissionPdfField(form,name,value,fontSize=0){try{const field=form.getTextField(name);field.setText(String(value??""));if(fontSize)field.setFontSize(fontSize);}catch(error){console.warn(`PDF field ${name} unavailable`,error);}}
    function setCommissionPdfMultilineField(form,name,lines){try{const field=form.getTextField(name);field.enableMultiline();field.setFontSize(6);field.setText(lines.filter(Boolean).join("\n"));}catch(error){console.warn(`PDF field ${name} unavailable`,error);}}
    async function buildCommissionSettlementPdf(item){
      if(!window.PDFLib)throw new Error("No se pudo cargar el generador PDF."); const language=item.documentLanguage==="es"?"es":"en",response=await fetch(`assets/pdf/commission-payment-statement-${language}.pdf`); if(!response.ok)throw new Error("No se pudo abrir la plantilla PDF.");
      const document=await PDFLib.PDFDocument.load(await response.arrayBuffer()),form=document.getForm(),methods={check:language==="es"?"Cheque":"Check",ach:language==="es"?"ACH / transferencia":"ACH / bank transfer",cash:language==="es"?"Efectivo":"Cash",zelle:"Zelle",other:language==="es"?"Otro":"Other"};
      const preparedBy=/@/.test(item.preparedBy||"")?(COMPANY.representativeName||COMPANY.legalName||COMPANY.name):item.preparedBy;
      const values={settlement_number:item.displayNumber||commissionDisplayNumber(item.id||commissionSettlementDocumentId(item.salespersonId,item.lineItems||[]),item.paymentDate),period_start:commissionDisplayDate(item.periodFrom,language),period_end:commissionDisplayDate(item.periodTo,language),payment_date:commissionDisplayDate(item.paymentDate,language),settlement_status:item.status==="pending"?(language==="es"?"PENDIENTE":"PENDING"):(language==="es"?"PAGADO":"PAID"),salesperson_name:item.salespersonName,salesperson_id:item.salespersonExternalId,email_phone:[item.salespersonEmail,item.salespersonPhone].filter(Boolean).join(" / "),department_territory:item.territory,commission_plan_rule:(item.lineItems||[]).map(row=>`${Number(row.rate||0).toFixed(2)}%`).filter((v,i,a)=>a.indexOf(v)===i).join(", "),payment_method:methods[item.method]||item.method,payment_reference:item.reference,gross_commission:commissionMoney(item.grossCommission),bonuses:commissionMoney(item.bonuses),chargebacks:commissionMoney(item.chargebacks),other_deductions:commissionMoney(item.otherDeductions),prior_balance:commissionMoney(item.priorBalance),net_payment:commissionMoney(item.total),prepared_by:preparedBy||COMPANY.representativeName||COMPANY.legalName||COMPANY.name,approved_by:item.approvedBy,salesperson_signature:"",acknowledgment_date:""}; Object.entries(values).forEach(([name,value])=>setCommissionPdfField(form,name,value));
      (item.lineItems||[]).slice(0,6).forEach((line,index)=>{const n=index+1,currentJob=getJobById(line.jobId)||{},visibleReference=/^[A-Za-z0-9_-]{14,}$/.test(line.invoiceWo||"")?commissionInvoiceOrWorkOrder(currentJob):(line.invoiceWo||commissionInvoiceOrWorkOrder(currentJob));setCommissionPdfMultilineField(form,`line_${n}_customer_project`,[line.clientName,commissionCompactProjectTitle(line.jobTitle)]);setCommissionPdfField(form,`line_${n}_invoice_wo`,visibleReference,7);setCommissionPdfField(form,`line_${n}_paid_date`,commissionDisplayDate(line.paidDate,language),7);setCommissionPdfField(form,`line_${n}_sale_amount`,commissionMoney(line.saleAmount));setCommissionPdfField(form,`line_${n}_eligible_base`,commissionMoney(line.eligibleBase));setCommissionPdfField(form,`line_${n}_rate`,`${Number(line.rate||0).toFixed(2)}%`);setCommissionPdfField(form,`line_${n}_commission`,commissionMoney(line.amount));});
      (item.adjustments||[]).slice(0,3).forEach((row,index)=>{const n=index+1;setCommissionPdfField(form,`adjustment_${n}_reason`,row.reason);setCommissionPdfField(form,`adjustment_${n}_amount`,row.amount?commissionMoney(row.amount):"");setCommissionPdfField(form,`adjustment_${n}_effective_date`,row.effectiveDate);}); form.updateFieldAppearances(await document.embedFont(PDFLib.StandardFonts.Helvetica));form.flatten();
      if(item.notes){const page=document.addPage([612,792]),font=await document.embedFont(PDFLib.StandardFonts.Helvetica),bold=await document.embedFont(PDFLib.StandardFonts.HelveticaBold);page.drawRectangle({x:0,y:720,width:612,height:72,color:PDFLib.rgb(.08,.1,.14)});page.drawRectangle({x:0,y:712,width:612,height:8,color:PDFLib.rgb(.56,.8,.12)});page.drawText(language==="es"?"NOTAS DE LA LIQUIDACION":"SETTLEMENT NOTES",{x:40,y:750,size:18,font:bold,color:PDFLib.rgb(1,1,1)});let line="",y=675;for(const word of String(item.notes).split(/\s+/)){const candidate=`${line} ${word}`.trim();if(font.widthOfTextAtSize(candidate,11)>530){page.drawText(line,{x:40,y,size:11,font,color:PDFLib.rgb(.12,.15,.2)});line=word;y-=18;}else line=candidate;}if(line)page.drawText(line,{x:40,y,size:11,font,color:PDFLib.rgb(.12,.15,.2)});} return document.save();
    }
    function bytesToBase64(bytes){let binary="";for(let offset=0;offset<bytes.length;offset+=32768)binary+=String.fromCharCode(...bytes.subarray(offset,offset+32768));return btoa(binary);}
    async function prepareCommissionSettlementReview(){try{const payload=collectCommissionSettlementPayload();payload.id=commissionSettlementDocumentId(payload.salespersonId,payload.lineItems);const bytes=await buildCommissionSettlementPdf(payload);commissionSettlementReview={payload,bytes};if(commissionSettlementPreviewUrl)URL.revokeObjectURL(commissionSettlementPreviewUrl);commissionSettlementPreviewUrl=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));$("commissionReviewPdf").src=commissionSettlementPreviewUrl;$("commissionReviewTo").value=payload.salespersonEmail||"";$("commissionReviewLanguage").value=payload.documentLanguage;const issuer=COMPANY.legalName||COMPANY.name||"SignShop HQ";$("commissionReviewSubject").value=payload.documentLanguage==="es"?`Liquidación de comisión · ${payload.paymentDate} · ${issuer}`:`Commission payment statement · ${payload.paymentDate} · ${issuer}`;$("commissionReviewMessage").value=payload.documentLanguage==="es"?`Hola ${payload.salespersonName},\n\nAdjuntamos la información de tu pago de comisión por ${commissionMoney(payload.total)}.`:`Hello ${payload.salespersonName},\n\nAttached is your commission payment statement for ${commissionMoney(payload.total)}.`;closeModal("commissionSettlementModal");openModal("commissionSettlementReviewModal");}catch(error){console.error(error);showToast(error.message||"No se pudo preparar la vista previa.");}}
    async function finalizeCommissionSettlement(sendEmail){if(!commissionSettlementReview)return;const{payload,bytes}=commissionSettlementReview,button=sendEmail?$("commissionSaveSendBtn"):$("commissionSaveOnlyBtn");button.disabled=true;try{const ref=commissionSettlementsRef().doc(payload.id),stored={...payload,emailStatus:sendEmail?"pending":"not_sent",createdAt:firebase.firestore.FieldValue.serverTimestamp(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};delete stored.id;await firebase.firestore().runTransaction(async transaction=>{if((await transaction.get(ref)).exists)throw new Error("duplicate-commission-settlement");transaction.set(ref,stored);});await postAccountingSource("commission",ref.id);let message=" Pago registrado sin enviar correo.";if(sendEmail){const result=(await cloudFunctions.httpsCallable("sendSalesDocumentEmail")({kind:"commission_settlement",ownerId:state.accountOwnerId||state.uid,settlementId:ref.id,pdfBase64:bytesToBase64(bytes),to:cleanText($("commissionReviewTo").value),subject:cleanText($("commissionReviewSubject").value),message:cleanText($("commissionReviewMessage").value),language:$("commissionReviewLanguage").value})).data||{};message=result.sent?` Correo enviado a ${result.recipient}.`:" El vendedor no tiene un correo válido.";}closeModal("commissionSettlementReviewModal");commissionSettlementReview=null;showToast(`Pago de comisión registrado.${message}`);}catch(error){console.error(error);showToast(error?.message==="duplicate-commission-settlement"?"Esta comisión ya fue liquidada.":"No se pudo completar la liquidación.");}finally{button.disabled=false;}}
    async function exportCommissionSettlementPdf(id){const item=state.commissionSettlements.find(row=>row.id===id);if(!item)return showToast("No se encontró la liquidación.");try{const bytes=await buildCommissionSettlementPdf(item),link=document.createElement("a");link.href=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));link.download=`Commission_Statement_${(item.salespersonName||"salesperson").replace(/[^a-z0-9]+/gi,"_")}_${item.paymentDate||today()}.pdf`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);showToast("PDF de liquidación descargado.");}catch(error){console.error(error);showToast("No se pudo generar el PDF.");}}
    document.addEventListener("click", event => {
      const edit = event.target.closest("[data-edit-salesperson]"); if (edit) editSalesperson(edit.dataset.editSalesperson);
      const remove = event.target.closest("[data-delete-salesperson]"); if (remove) deleteSalesperson(remove.dataset.deleteSalesperson);
      const agreement = event.target.closest("[data-salesperson-agreement]"); if (agreement) exportSalespersonAgreement(agreement.dataset.salespersonAgreement);
      const settle = event.target.closest("[data-new-commission-settlement]"); if (settle) openCommissionSettlement(settle.dataset.newCommissionSettlement);
      const settlementPdf = event.target.closest("[data-commission-settlement-pdf]"); if (settlementPdf) exportCommissionSettlementPdf(settlementPdf.dataset.commissionSettlementPdf);
      const voidButton = event.target.closest("[data-void-commission-settlement]"); if (voidButton) voidCommissionSettlement(voidButton.dataset.voidCommissionSettlement);
    });
    $("salespersonSearch")?.addEventListener("input", renderSalespeople);
    $("commissionSettlementFrom")?.addEventListener("change", renderCommissionSettlementLines);
    $("commissionSettlementTo")?.addEventListener("change", renderCommissionSettlementLines);
    $("commissionReviewBackBtn")?.addEventListener("click",()=>{closeModal("commissionSettlementReviewModal");openModal("commissionSettlementModal");});
    $("commissionSaveOnlyBtn")?.addEventListener("click",()=>finalizeCommissionSettlement(false));
    $("commissionSaveSendBtn")?.addEventListener("click",()=>finalizeCommissionSettlement(true));
    $("commissionReviewLanguage")?.addEventListener("change",async event=>{if(!commissionSettlementReview)return;try{commissionSettlementReview.payload.documentLanguage=event.target.value==="es"?"es":"en";commissionSettlementReview.bytes=await buildCommissionSettlementPdf(commissionSettlementReview.payload);if(commissionSettlementPreviewUrl)URL.revokeObjectURL(commissionSettlementPreviewUrl);commissionSettlementPreviewUrl=URL.createObjectURL(new Blob([commissionSettlementReview.bytes],{type:"application/pdf"}));$("commissionReviewPdf").src=commissionSettlementPreviewUrl;}catch(error){console.error(error);showToast("No se pudo cambiar el idioma del PDF.");}});
    window.addEventListener("crm-language-changed", () => {
      fillJobSalespersonSelect(cleanText($("jobSalespersonId")?.value));
      fillClientSalespersonSelect(cleanText($("clientSalespersonId")?.value));
      renderSalespeople();
      renderCommissionSettlements();
    });
