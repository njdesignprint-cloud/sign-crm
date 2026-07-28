    const COMMISSION_BASE_LABELS = {
      collected: "customer payments actually collected",
      subtotal: "sale subtotal before sales tax",
      gross_profit: "gross profit (sale subtotal less documented direct job costs)"
    };

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
        return (job.commission?.salespersonId || client?.salespersonId) === id;
      }).reduce((sum, job) => {
        const client = state.clients.find(item => item.id === job.clientId) || {};
        const terms = job.commission?.salespersonId ? job.commission : client;
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
      select.innerHTML = '<option value="">No salesperson</option>' + state.salespeople
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
      const terms = job.commission?.salespersonId ? job.commission : {
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
      $("salespersonModalTitle").textContent = "New salesperson";
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
      state.editingSalespersonId = id; $("salespersonModalTitle").textContent = "Edit salesperson";
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
      if (assigned) return showToast(`This salesperson has ${assigned} assigned client(s). Set them inactive instead.`);
      if (!confirm("Delete this salesperson? This cannot be undone.")) return;
      try { await salespeopleRef().doc(id).delete(); showToast("Salesperson deleted."); } catch (error) { console.error(error); showToast("The salesperson could not be deleted."); }
    }
    function renderSalespeople() {
      const body = $("salespeopleBody"); if (!body) return;
      const q = cleanText($("salespersonSearch")?.value).toLowerCase();
      const rows = state.salespeople.filter(item => `${item.name || ""} ${item.company || ""} ${item.email || ""} ${item.phone || ""}`.toLowerCase().includes(q));
      body.innerHTML = rows.map(item => {
        const clients = state.clients.filter(client => client.salespersonId === item.id).length;
        return `<tr><td><strong>${safe(item.name)}</strong><br><small>${safe(item.company || "-")}</small></td><td>${safe(item.email || "-")}<br><small>${safe(item.phone || "-")}</small></td><td>${Number(item.commissionPercent || 0).toFixed(2)}%<br><small>${safe(COMMISSION_BASE_LABELS[item.commissionBase] || COMMISSION_BASE_LABELS.collected)}</small></td><td>${clients}</td><td><strong>${money(getSalespersonCommissionEstimate(item.id))}</strong><br><small>Based on current CRM records</small></td><td><span class="pill ${item.status === "inactive" ? "state-disabled" : "state-active"}">${item.status === "inactive" ? "Inactive" : "Active"}</span></td><td><div class="actions-row"><button class="btn btn-info btn-small" data-salesperson-agreement="${item.id}">Agreement PDF</button><button class="btn btn-secondary btn-small" data-edit-salesperson="${item.id}">Edit</button><button class="btn btn-danger btn-small" data-delete-salesperson="${item.id}">Delete</button></div></td></tr>`;
      }).join("");
      $("salespeopleEmpty").classList.toggle("hidden", rows.length > 0);
      $("activeSalespeopleCount").textContent = state.salespeople.filter(item => item.status !== "inactive").length;
      $("salespersonClientsCount").textContent = state.clients.filter(client => client.salesSource === "salesperson").length;
    }
    function pdfWrappedText(pdf, text, x, y, width, lineHeight = 5) {
      const lines = pdf.splitTextToSize(text, width); pdf.text(lines, x, y); return y + lines.length * lineHeight;
    }
    function exportSalespersonAgreement(id) {
      const person = state.salespeople.find(item => item.id === id); if (!person) return showToast("Salesperson not found.");
      const { jsPDF } = window.jspdf; const pdf = new jsPDF("p", "mm", "letter");
      const percent = Number(person.commissionPercent || 0).toFixed(2); const base = COMMISSION_BASE_LABELS[person.commissionBase] || COMMISSION_BASE_LABELS.collected;
      const schedule = { monthly: "monthly, within 10 business days after month-end", biweekly: "every two weeks", per_job: "after each eligible job is fully collected" }[person.paymentSchedule] || "monthly";
      pdf.setFillColor(15, 23, 42); pdf.rect(0, 0, 216, 30, "F"); pdf.setTextColor(255,255,255); pdf.setFontSize(19); pdf.text("SALES COMMISSION AGREEMENT", 14, 18);
      pdf.setTextColor(35,35,35); pdf.setFontSize(9); let y = 39;
      y = pdfWrappedText(pdf, `Effective date: ____________________   Company legal name: ______________________________   Salesperson: ${person.name}${person.company ? ` (${person.company})` : ""}`, 14, y, 188) + 3;
      const sections = [
        ["1. Appointment and scope", "The Company appoints the Salesperson on a non-exclusive basis to introduce prospective customers and support sales activity. The Salesperson may not sign contracts, promise pricing, extend credit, collect funds, or otherwise bind the Company unless separately authorized in writing."],
        ["2. Commission", `The commission rate is ${percent}% of ${base}. A commission is earned only after the Company receives and clears the applicable customer payment. Sales tax, refunds, credits, chargebacks, financing fees, bad debt, and amounts never collected are excluded. If a qualifying payment is later refunded or charged back, the related commission may be offset against a future payment.`],
        ["3. Customer attribution", "A customer qualifies only when the Company records that customer under the Salesperson in SignShop HQ before the applicable sale, or confirms the attribution in writing. Existing Company customers and unapproved duplicate leads are excluded unless the Company agrees otherwise in writing."],
        ["4. Statements and payment timing", `The Company will calculate eligible commissions and pay them ${schedule}, together with a reasonable statement of the underlying eligible receipts. The Salesperson must report a good-faith discrepancy within 30 days after receiving the statement.`],
        ["5. Expenses and taxes", "The Salesperson is responsible for personal expenses unless the Company approves an expense in writing. Tax reporting and withholding will follow the worker's actual legal classification and applicable law; the title of this agreement does not determine that classification."],
        ["6. Confidentiality and customer information", "Pricing, customer lists, designs, estimates, credentials, financial information, and non-public business information are confidential. They may be used only for authorized Company business and must be returned or deleted upon request or termination. The Salesperson must protect customer data and immediately report suspected unauthorized access."],
        ["7. Term and termination", "Either party may terminate this agreement by written notice. Properly earned commissions on payments cleared before termination remain payable. Post-termination payments qualify only if the Company confirms the applicable customer and sale in writing. Sections concerning payment adjustments, confidentiality, records, and dispute terms survive termination."],
        ["8. Relationship and compliance", "The parties will comply with applicable law and Company-approved sales practices. Nothing in this agreement guarantees work, exclusivity, territory, or minimum compensation. The parties acknowledge that worker classification depends on the actual facts, including direction and control, and cannot be established merely by a contract label."],
        ["9. General terms", "Texas law governs this agreement, without regard to conflict-of-law rules. This document and approved written addenda are the entire agreement about commissions. Changes must be in writing and signed by both parties. Electronic signatures and counterparts are permitted."],
      ];
      sections.forEach(([heading, text]) => {
        const needed = pdf.splitTextToSize(text, 188).length * 5 + 11; if (y + needed > 245) { pdf.addPage(); y = 18; }
        pdf.setFont(undefined, "bold"); pdf.setFontSize(10); pdf.text(heading, 14, y); y += 5; pdf.setFont(undefined, "normal"); pdf.setFontSize(9); y = pdfWrappedText(pdf, text, 14, y, 188) + 4;
      });
      if (y > 220) { pdf.addPage(); y = 20; }
      pdf.setFont(undefined, "bold"); pdf.text("AGREED AND ACCEPTED", 14, y); y += 13; pdf.setFont(undefined, "normal");
      pdf.text("Company representative / title: __________________", 14, y); pdf.text("Salesperson: __________________________", 112, y); y += 10;
      pdf.text("Signature: ______________________________________", 14, y); pdf.text("Signature: ______________________________", 112, y); y += 10;
      pdf.text("Date: __________________________________________", 14, y); pdf.text("Date: __________________________________", 112, y);
      pdf.setFontSize(7); pdf.setTextColor(100,100,100); pdf.text("Template generated by SignShop HQ. Have qualified legal and tax professionals review it for your actual relationship and jurisdiction.", 14, 272);
      pdf.save(`Commission_Agreement_${person.name.replace(/[^a-z0-9]+/gi, "_")}_${today()}.pdf`); showToast("Commission agreement PDF downloaded.");
    }
    function exportSalespeoplePdf() {
      const { jsPDF } = window.jspdf; const pdf = new jsPDF();
      pdf.setFontSize(16); pdf.text("Salespeople & commissions", 14, 16); pdf.setFontSize(9); pdf.text(`Generated ${today()}`, 14, 23);
      pdf.autoTable({ startY: 29, head: [["Salesperson", "Contact", "Default rate", "Base", "Clients", "Estimated earned", "Status"]], body: state.salespeople.map(item => [item.name, item.email || item.phone || "-", `${Number(item.commissionPercent || 0).toFixed(2)}%`, COMMISSION_BASE_LABELS[item.commissionBase] || COMMISSION_BASE_LABELS.collected, state.clients.filter(client => client.salespersonId === item.id).length, money(getSalespersonCommissionEstimate(item.id)), item.status === "inactive" ? "Inactive" : "Active"]), headStyles: { fillColor: [15,23,42] }, styles: { fontSize: 8 } });
      pdf.save(`Salespeople_Commissions_${today()}.pdf`);
    }
    document.addEventListener("click", event => {
      const edit = event.target.closest("[data-edit-salesperson]"); if (edit) editSalesperson(edit.dataset.editSalesperson);
      const remove = event.target.closest("[data-delete-salesperson]"); if (remove) deleteSalesperson(remove.dataset.deleteSalesperson);
      const agreement = event.target.closest("[data-salesperson-agreement]"); if (agreement) exportSalespersonAgreement(agreement.dataset.salespersonAgreement);
    });
    $("salespersonSearch")?.addEventListener("input", renderSalespeople);
