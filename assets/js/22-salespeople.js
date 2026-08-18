    const COMMISSION_BASE_LABELS = {
      collected: "customer payments actually collected",
      subtotal: "sale subtotal before sales tax",
      gross_profit: "gross profit (sale subtotal less documented direct job costs)"
    };

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
      const terms = job.commission?.salespersonId ? job.commission : {
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
      renderCommissionSettlementLines(); openModal("commissionSettlementModal");
    }
    function renderCommissionSettlementLines() {
      const salespersonId = $("commissionSettlementSalespersonId")?.value || "";
      const lines = state.jobs.map(job => ({ job, calc: getJobCommissionBreakdown(job) })).filter(item => item.calc.salespersonId === salespersonId && item.calc.available > 0.005);
      $("commissionSettlementLines").innerHTML = lines.map(({ job, calc }) => {
        const client = getClientById(job.clientId);
        return `<tr><td><input type="checkbox" data-commission-line="${safe(job.id)}" data-commission-amount="${calc.available.toFixed(2)}" checked /></td><td><strong>${safe(job.title || salespersonText("Job", "Trabajo"))}</strong><br><small>${safe(clientLabel(client))}</small></td><td>${calc.rate.toFixed(2)}%<br><small>${safe(commissionBaseLabel(calc.baseType))}</small></td><td>${money(calc.earned)}</td><td>${money(calc.previouslyPaid)}</td><td><strong>${money(calc.available)}</strong>${calc.overpaid ? `<br><small class="danger-text">${salespersonText("Overpaid", "Pagado de más")} ${money(calc.overpaid)}</small>` : ""}</td></tr>`;
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
    async function saveCommissionSettlement() {
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
        const settlement = await commissionSettlementsRef().add({ salespersonId, salespersonName: person.name, paymentDate: $("commissionSettlementDate").value || today(), periodFrom, periodTo, method: $("commissionSettlementMethod").value || "other", reference: cleanText($("commissionSettlementReference").value), notes: cleanText($("commissionSettlementNotes").value), status: "paid", lineItems, total: Number(total.toFixed(2)), recordedBy: state.userEmail || "", createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
        await postAccountingSource("commission", settlement.id);
        closeModal("commissionSettlementModal"); showToast("Commission payment recorded.");
      } catch (error) { console.error(error); showToast("The commission payment could not be recorded."); }
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
    function exportCommissionSettlementPdf(id) {
      const item = state.commissionSettlements.find(row => row.id === id); if (!item) return showToast("Settlement not found.");
      const { jsPDF } = window.jspdf; const pdf = typeof createModulePdf === "function" ? createModulePdf("Commission payment statement", "Payment record and acknowledgment") : new jsPDF("p", "mm", "letter");
      pdf.setTextColor(35,35,35); pdf.setFontSize(10);
      pdf.autoTable({ startY: typeof createModulePdf === "function" ? 56 : 38, head: [["Field", "Details"]], body: [["Company", COMPANY.legalName || COMPANY.name],["Salesperson", item.salespersonName || "-"],["Payment date", item.paymentDate || "-"],["Statement period", `${item.periodFrom || "-"} to ${item.periodTo || "-"}`],["Payment method", item.method || "-"],["Reference", item.reference || "-"],["Status", item.status === "void" ? "VOID" : "PAID"]], headStyles:{fillColor:typeof companyPdfColor === "function" ? companyPdfColor() : [15,23,42]}, styles:{fontSize:9} });
      const settlementLines = item.lineItems || [];
      pdf.autoTable({ startY: pdf.lastAutoTable.finalY + 8, head: [["Job", "Client", "Rate", "Base", "Amount"]], body: settlementLines.length ? settlementLines.map(line => [line.jobTitle || "-", line.clientName || "-", `${Number(line.rate || 0).toFixed(2)}%`, COMMISSION_BASE_LABELS[line.base] || line.base || "-", money(line.amount)]) : (typeof pdfEmptyRow === "function" ? pdfEmptyRow(5) : [["No records found","","","",""]]), headStyles:{fillColor:typeof companyPdfColor === "function" ? companyPdfColor() : [15,23,42]}, styles:{fontSize:8} });
      let y = pdf.lastAutoTable.finalY + 10; pdf.setFont(undefined,"bold"); pdf.setFontSize(12); pdf.text(`TOTAL PAID: ${money(item.total)}`,14,y); y += 10; pdf.setFont(undefined,"normal"); pdf.setFontSize(9); y = pdfWrappedText(pdf, `Notes: ${item.notes || "-"}`,14,y,188) + 14;
      if (y > 235) { pdf.addPage(); y = 25; } pdf.text("Company representative: __________________________",14,y); pdf.text("Salesperson: __________________________",112,y); y += 10; pdf.text("Signature: ______________________________________",14,y); pdf.text("Signature: ______________________________",112,y); y += 10; pdf.text("Date: __________________________________________",14,y); pdf.text("Date: __________________________________",112,y);
      pdf.setFontSize(7); pdf.setTextColor(100,100,100); pdf.text("This statement acknowledges the listed commission payment. Keep a signed copy with business records.",14,267);
      if (typeof savePdf === "function") savePdf(pdf, `Commission_Statement_${pdfSafeFileName(item.salespersonName, "salesperson")}_${item.paymentDate || today()}.pdf`);
      else pdf.save(`Commission_Statement_${(item.salespersonName || "salesperson").replace(/[^a-z0-9]+/gi,"_")}_${item.paymentDate || today()}.pdf`);
      showToast("Commission statement PDF downloaded.");
    }
    document.addEventListener("click", event => {
      const edit = event.target.closest("[data-edit-salesperson]"); if (edit) editSalesperson(edit.dataset.editSalesperson);
      const remove = event.target.closest("[data-delete-salesperson]"); if (remove) deleteSalesperson(remove.dataset.deleteSalesperson);
      const agreement = event.target.closest("[data-salesperson-agreement]"); if (agreement) exportSalespersonAgreement(agreement.dataset.salespersonAgreement);
      const settle = event.target.closest("[data-new-commission-settlement]"); if (settle) openCommissionSettlement(settle.dataset.newCommissionSettlement);
      const settlementPdf = event.target.closest("[data-commission-settlement-pdf]"); if (settlementPdf) exportCommissionSettlementPdf(settlementPdf.dataset.commissionSettlementPdf);
      const voidButton = event.target.closest("[data-void-commission-settlement]"); if (voidButton) voidCommissionSettlement(voidButton.dataset.voidCommissionSettlement);
    });
    $("salespersonSearch")?.addEventListener("input", renderSalespeople);
    window.addEventListener("crm-language-changed", () => {
      fillJobSalespersonSelect(cleanText($("jobSalespersonId")?.value));
      fillClientSalespersonSelect(cleanText($("clientSalespersonId")?.value));
      renderSalespeople();
      renderCommissionSettlements();
    });
