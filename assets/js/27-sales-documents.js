    const SALES_DOCUMENT_STATUSES = {
      estimate: ["draft", "sent", "viewed", "changes_requested", "accepted", "rejected", "expired"],
      invoice: ["draft", "sent", "viewed", "open", "void"]
    };

    const SALES_DOCUMENT_LABELS = {
      en: { estimate:"Estimate", invoice:"Invoice", draft:"Draft", sent:"Sent", viewed:"Viewed", changes_requested:"Changes requested", accepted:"Accepted", rejected:"Rejected", expired:"Expired", converted:"Converted", open:"Open", partially_paid:"Partially paid", paid:"Paid", overdue:"Overdue", void:"Void" },
      es: { estimate:"Estimado", invoice:"Factura", draft:"Borrador", sent:"Enviado", viewed:"Visto", changes_requested:"Cambios solicitados", accepted:"Aprobado", rejected:"Rechazado", expired:"Vencido", converted:"Convertido", open:"Abierta", partially_paid:"Parcialmente pagada", paid:"Pagada", overdue:"Vencida", void:"Anulada" }
    };

    function salesDocLanguage() { return state.language === "es" ? "es" : "en"; }
    function salesDocLabel(key, language = salesDocLanguage()) { return SALES_DOCUMENT_LABELS[language]?.[key] || key; }
    function salesDocClient(document = {}) { return state.clients.find(client => client.id === document.clientId) || {}; }
    function salesDocDefaultAddress(client = {}) { return [client.address, client.city].filter(Boolean).join(", "); }
    function salesDocPaid(document = {}) { return Math.max(0, Number(document.paidAmount || 0)); }
    function availableJobCollectedForInvoice(jobId = "", excludeDocumentId = "") {
      const job = state.jobs.find(item => item.id === jobId);
      if (!job) return 0;
      const alreadyAllocated = state.salesDocuments
        .filter(item => item.type === "invoice" && item.status !== "void" && item.jobId === jobId && item.id !== excludeDocumentId)
        .reduce((sum, item) => sum + salesDocPaid(item), 0);
      return Math.max(0, Number(getPaymentsTotal(job) || 0) - alreadyAllocated);
    }
    function salesDocBalance(document = {}) { return SalesDocumentUtils.balance(document); }
    function salesDocEffectiveStatus(document = {}) {
      return SalesDocumentUtils.effectiveStatus(document, today());
    }

    function salesDocStatusTone(status = "") {
      if (["accepted", "paid", "converted"].includes(status)) return "st-aprobado";
      if (["rejected", "expired", "overdue", "void"].includes(status)) return "st-cancelado";
      if (["sent", "viewed", "open", "partially_paid"].includes(status)) return "st-produccion";
      return "";
    }

    function fillSalesDocumentStatusOptions(selected = "draft") {
      const type = $("salesDocType")?.value || "estimate";
      const statuses = SALES_DOCUMENT_STATUSES[type] || SALES_DOCUMENT_STATUSES.estimate;
      $("salesDocStatus").innerHTML = statuses.map(status => `<option value="${status}">${safe(salesDocLabel(status))}</option>`).join("");
      $("salesDocStatus").value = statuses.includes(selected) ? selected : "draft";
    }

    function createSalesDocumentLine(line = {}) {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input class="input sales-line-product" value="${safe(line.productService || "")}" placeholder="${salesDocLanguage() === "es" ? "Producto / servicio" : "Product / service"}" /></td>
        <td><input class="input sales-line-description" value="${safe(line.description || "")}" placeholder="${salesDocLanguage() === "es" ? "Producto o servicio" : "Product or service"}" /></td>
        <td><input class="input sales-line-qty" type="number" min="0" step="0.01" value="${Number(line.quantity ?? 1)}" /></td>
        <td><input class="input sales-line-rate" type="number" min="0" step="0.01" value="${Number(line.rate || 0)}" /></td>
        <td><input class="input sales-line-cost" type="number" min="0" step="0.01" value="${Number(line.internalCost || 0)}" /></td>
        <td><input class="sales-line-taxable" type="checkbox" ${line.taxable === false ? "" : "checked"} /></td>
        <td class="sales-line-amount">${money(Number(line.quantity ?? 1) * Number(line.rate || 0))}</td>
        <td><button type="button" class="btn btn-danger btn-small sales-line-remove" aria-label="Remove">×</button></td>`;
      row.querySelectorAll("input").forEach(input => input.addEventListener("input", calculateSalesDocumentForm));
      row.querySelector(".sales-line-remove").addEventListener("click", () => { row.remove(); calculateSalesDocumentForm(); });
      return row;
    }

    function getSalesDocumentFormLines() {
      return Array.from($("salesDocLines")?.querySelectorAll("tr") || []).map(row => ({
        productService: cleanText(row.querySelector(".sales-line-product")?.value),
        description: cleanText(row.querySelector(".sales-line-description")?.value),
        quantity: Math.max(0, Number(row.querySelector(".sales-line-qty")?.value || 0)),
        rate: Math.max(0, Number(row.querySelector(".sales-line-rate")?.value || 0)),
        internalCost: Math.max(0, Number(row.querySelector(".sales-line-cost")?.value || 0)),
        taxable: !!row.querySelector(".sales-line-taxable")?.checked
      })).filter(line => line.productService || line.description || line.quantity || line.rate);
    }

    function calculateSalesDocument(lines = getSalesDocumentFormLines(), discount = Number($("salesDocDiscount")?.value || 0), taxPercent = $("salesDocTaxEnabled")?.checked ? Number($("salesDocTaxPercent")?.value || 0) : 0) {
      return SalesDocumentUtils.calculate(lines, discount, taxPercent);
    }

    function calculateSalesDocumentForm() {
      const totals = calculateSalesDocument();
      Array.from($("salesDocLines")?.querySelectorAll("tr") || []).forEach((row, index) => { if (totals.lines[index]) row.querySelector(".sales-line-amount").textContent = money(totals.lines[index].amount); });
      $("salesDocSubtotal").textContent = money(totals.subtotal);
      $("salesDocTax").textContent = money(totals.tax);
      $("salesDocTotal").textContent = money(totals.total);
      $("salesDocProfit").textContent = money(totals.profit);
      return totals;
    }

    function fillSalesDocumentRelations(clientId = "", jobId = "") {
      $("salesDocClientId").innerHTML = state.clients.map(client => `<option value="${client.id}">${safe(client.company || client.name || "-")}</option>`).join("");
      if (clientId) $("salesDocClientId").value = clientId;
      const selectedClient = $("salesDocClientId").value;
      const client = state.clients.find(item => item.id === selectedClient);
      if (client?.language && !state.editingSalesDocumentId) $("salesDocLanguage").value = client.language === "es" ? "es" : "en";
      const jobs = state.jobs.filter(job => !selectedClient || job.clientId === selectedClient);
      $("salesDocJobId").innerHTML = `<option value="">${salesDocLanguage() === "es" ? "Sin vínculo" : "Not linked"}</option>` + jobs.map(job => `<option value="${job.id}">${safe(job.name || job.title || job.description || job.id)}</option>`).join("");
      if (jobId && jobs.some(job => job.id === jobId)) $("salesDocJobId").value = jobId;
    }

    function resetSalesDocumentForm(type = "estimate") {
      state.editingSalesDocumentId = null;
      $("salesDocType").disabled = false;
      $("salesDocType").value = type;
      $("salesDocLanguage").value = salesDocLanguage();
      fillSalesDocumentRelations();
      $("salesDocAddress").value = salesDocDefaultAddress(salesDocClient({ clientId:$("salesDocClientId").value }));
      $("salesDocIssueDate").value = today();
      const due = new Date(); due.setDate(due.getDate() + (type === "estimate" ? 30 : 15));
      $("salesDocDueDate").value = due.toISOString().slice(0, 10);
      fillSalesDocumentStatusOptions("draft");
      if ($("salesDocDepositMode")) $("salesDocDepositMode").value = "percent";
      if ($("salesDocDepositValue")) $("salesDocDepositValue").value = 50;
      if ($("salesDocTerms")) $("salesDocTerms").value = type === "invoice" ? "net_15" : "custom";
      $("salesDocDiscount").value = 0;
      $("salesDocTaxPercent").value = Number(state.companySettings?.salesTaxPercent || 0);
      $("salesDocTaxEnabled").checked = Number($("salesDocTaxPercent").value || 0) > 0;
      $("salesDocCustomerMessage").value = "";
      if ($("salesDocPaymentInstructions")) $("salesDocPaymentInstructions").value = state.companySettings?.paymentInstructions || "";
      $("salesDocInternalNotes").value = "";
      $("salesDocAcceptanceSummary")?.classList.add("hidden");
      $("salesDocLines").innerHTML = "";
      $("salesDocLines").appendChild(createSalesDocumentLine());
      $("salesDocumentModalTitle").textContent = salesDocLanguage() === "es" ? `${type === "invoice" ? "Nueva" : "Nuevo"} ${salesDocLabel(type).toLowerCase()}` : `New ${salesDocLabel(type).toLowerCase()}`;
      calculateSalesDocumentForm();
    }

    function editSalesDocument(id) {
      const item = state.salesDocuments.find(document => document.id === id);
      if (!item || !guardWrite("edit sales documents", "trabajos")) return;
      if (["accepted", "rejected", "converted", "void"].includes(item.status)) return showToast(salesDocLanguage() === "es" ? "Este documento ya tiene una respuesta final y no se puede editar. Crea una nueva versión si necesitas cambios." : "This document has a final response and cannot be edited. Create a new version if changes are needed.");
      state.editingSalesDocumentId = id;
      $("salesDocType").value = item.type || "estimate";
      $("salesDocType").disabled = true;
      fillSalesDocumentRelations(item.clientId, item.jobId);
      $("salesDocAddress").value = item.serviceAddress || item.clientSnapshot?.address || salesDocDefaultAddress(salesDocClient(item));
      $("salesDocLanguage").value = item.language || "en";
      $("salesDocIssueDate").value = item.issueDate || today();
      $("salesDocDueDate").value = item.dueDate || "";
      fillSalesDocumentStatusOptions(item.status || "draft");
      if ($("salesDocDepositMode")) $("salesDocDepositMode").value = item.depositMode === "fixed" ? "fixed" : "percent";
      if ($("salesDocDepositValue")) $("salesDocDepositValue").value = Number(item.depositValue ?? item.depositPercent ?? 0);
      if ($("salesDocTerms")) $("salesDocTerms").value = item.paymentTerms || "custom";
      $("salesDocDiscount").value = Number(item.discount || 0);
      $("salesDocTaxPercent").value = Number(item.taxPercent || 0);
      $("salesDocTaxEnabled").checked = Number(item.taxPercent || 0) > 0;
      $("salesDocCustomerMessage").value = item.customerMessage || "";
      if ($("salesDocPaymentInstructions")) $("salesDocPaymentInstructions").value = item.paymentInstructions || "";
      $("salesDocInternalNotes").value = item.internalNotes || "";
      const response = item.approvalResponse || {};
      if (response.signerName) { $("salesDocAcceptanceSummary").textContent = `${salesDocLanguage() === "es" ? "Aceptado por" : "Accepted by"}: ${response.signerName}${response.signerEmail ? ` · ${response.signerEmail}` : ""}`; $("salesDocAcceptanceSummary").classList.remove("hidden"); } else $("salesDocAcceptanceSummary")?.classList.add("hidden");
      $("salesDocLines").innerHTML = "";
      (item.lines?.length ? item.lines : [{}]).forEach(line => $("salesDocLines").appendChild(createSalesDocumentLine(line)));
      $("salesDocumentModalTitle").textContent = `${salesDocLabel(item.type)} ${item.number || ""}`;
      calculateSalesDocumentForm();
      openModal("salesDocumentModal");
    }

    async function nextSalesDocumentNumber(type, transaction) {
      const year = new Date().getFullYear();
      const ref = userRef().collection("salesDocumentCounters").doc(String(year));
      const snap = await transaction.get(ref);
      const field = `${type}_${year}`;
      const next = Number(snap.data()?.[field] || 0) + 1;
      transaction.set(ref, { [field]:next, updatedAt:firebase.firestore.FieldValue.serverTimestamp() }, { merge:true });
      return `${type === "invoice" ? "INV" : "EST"}-${year}-${String(next).padStart(4, "0")}`;
    }

    async function saveSalesDocument() {
      if (!guardWrite("save sales documents", "trabajos")) return;
      const totals = calculateSalesDocumentForm();
      const clientId = cleanText($("salesDocClientId").value);
      if (!clientId) return showToast(salesDocLanguage() === "es" ? "Selecciona un cliente." : "Select a customer.");
      if (!totals.lines.length || totals.total <= 0) return showToast(salesDocLanguage() === "es" ? "Agrega al menos una partida con precio." : "Add at least one priced line.");
      const client = state.clients.find(item => item.id === clientId) || {};
      const type = $("salesDocType").value === "invoice" ? "invoice" : "estimate";
      const linkedJobId = cleanText($("salesDocJobId").value);
      const linkedJob = state.jobs.find(item => item.id === linkedJobId);
      if (type === "invoice" && linkedJob && getPaymentsTotal(linkedJob) > totals.total) return showToast(salesDocLanguage() === "es" ? "El total de la factura no puede ser menor que los pagos ya cobrados en el trabajo." : "The invoice total cannot be lower than payments already collected for the job.");
      const editedDocument = state.salesDocuments.find(item => item.id === state.editingSalesDocumentId);
      const selectedStatus = $("salesDocStatus").value || "draft";
      const payload = {
        type, clientId, jobId:linkedJobId, language:$("salesDocLanguage").value === "es" ? "es" : "en",
        serviceAddress:cleanText($("salesDocAddress").value),
        clientSnapshot:{ name:client.name || "", company:client.company || "", email:client.email || "", phone:client.phone || "", address:cleanText($("salesDocAddress").value) },
        issueDate:$("salesDocIssueDate").value || today(), dueDate:$("salesDocDueDate").value,
        status:type === "estimate" && editedDocument?.status === "changes_requested" && selectedStatus === "changes_requested" ? "sent" : selectedStatus,
        paymentTerms:$("salesDocTerms")?.value || "custom", depositMode:$("salesDocDepositMode")?.value === "fixed" ? "fixed" : "percent", depositValue:Math.max(0, Number($("salesDocDepositValue")?.value || 0)), customerMessage:cleanText($("salesDocCustomerMessage").value), paymentInstructions:cleanText($("salesDocPaymentInstructions")?.value), internalNotes:cleanText($("salesDocInternalNotes").value),
        ...totals, updatedAt:firebase.firestore.FieldValue.serverTimestamp(), updatedBy:state.userEmail || ""
      };
      try {
        let savedDocumentId = state.editingSalesDocumentId || "";
        if (state.editingSalesDocumentId) await salesDocumentsRef().doc(state.editingSalesDocumentId).update(payload);
        else await db.runTransaction(async transaction => {
          const ref = salesDocumentsRef().doc();
          savedDocumentId = ref.id;
          payload.number = await nextSalesDocumentNumber(type, transaction);
          if (type === "invoice" && !payload.jobId) {
            const jobRef = jobsRef().doc();
            payload.jobId = jobRef.id;
            transaction.set(jobRef, { clientId, title:totals.lines[0]?.description || payload.number, status:"Aprobado", date:payload.issueDate, dueDate:payload.dueDate, priority:"Media", sale:totals.total, description:totals.lines.map(line => line.description).filter(Boolean).join(" · "), notes:"", materials:[], quote:{ items:totals.lines.map(line => ({ description:line.description, quantity:line.quantity, unitPrice:line.rate })), discountType:"fixed", discountValue:totals.discount, taxPercent:totals.taxPercent }, checklist:{}, payments:[], internalNotesLog:[], activityLog:[newLogEntry("factura", `${payload.number} created.`)], createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
          } else if (type === "invoice" && payload.jobId) {
            transaction.update(jobsRef().doc(payload.jobId), { status:"Aprobado", sale:totals.total, updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
          }
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          payload.createdBy = state.userEmail || "";
          payload.paidAmount = type === "invoice" && payload.jobId
            ? Math.min(totals.total, availableJobCollectedForInvoice(payload.jobId))
            : 0;
          transaction.set(ref, payload);
        });
        if (type === "invoice") await postAccountingSource("invoice", savedDocumentId);
        markModalSaved("salesDocumentModal"); closeModal("salesDocumentModal", true);
        showToast(salesDocLanguage() === "es" ? "Documento guardado." : "Document saved.");
      } catch (error) { console.error(error); showToast(salesDocLanguage() === "es" ? "No se pudo guardar el documento." : "Could not save the document."); }
    }

    let pendingEstimateConversionId = "";
    function conversionMode() { return document.querySelector('input[name="estimateConversionMode"]:checked')?.value || "full"; }
    function updateEstimateConversionUi() {
      const estimate = state.salesDocuments.find(document => document.id === pendingEstimateConversionId), mode = conversionMode(); if (!estimate) return;
      const remaining=Math.max(0,Number(estimate.total||0)-Math.max(0,Number(estimate.convertedAmount||0)));
      $("estimateConversionPartialFields").classList.toggle("hidden", mode !== "partial"); $("estimateConversionManualLines").classList.toggle("hidden", mode !== "manual");
      let amount = remaining;
      if (mode === "partial") { const value=Math.max(0,Number($("estimateConversionPartialValue").value||0)); amount=$("estimateConversionPartialType").value==="percent"?amount*Math.min(100,value)/100:Math.min(amount,value); }
      if (mode === "manual") amount=Math.min(remaining,[...document.querySelectorAll(".estimate-conversion-line-amount")].reduce((sum,input)=>sum+Math.max(0,Number(input.value||0)),0));
      $("estimateConversionSummary").textContent=`${salesDocLanguage()==="es"?"Total aproximado de la factura":"Approximate invoice total"}: ${money(amount)}`;
    }
    function convertEstimateToInvoice(id) {
      if (!guardWrite("convert estimates", "trabajos")) return;
      const estimate = state.salesDocuments.find(document => document.id === id && document.type === "estimate");
      if (!estimate || estimate.status === "converted") return;
      if (estimate.status !== "accepted") return showToast(salesDocLanguage() === "es" ? "Primero marca el estimado como aprobado." : "Mark the estimate as accepted first.");
      const remainingRatio=Math.min(1,Math.max(0,(Number(estimate.total||0)-Number(estimate.convertedAmount||0))/Math.max(.01,Number(estimate.total||0))));
      if(remainingRatio<=0)return showToast(salesDocLanguage()==="es"?"Este estimado ya fue facturado por completo.":"This estimate has already been fully invoiced.");
      pendingEstimateConversionId=id; document.querySelector('input[name="estimateConversionMode"][value="full"]').checked=true;
      $("estimateConversionManualLines").innerHTML=(estimate.lines||[]).map((line,index)=>`<label class="field-label"><span>${safe(line.description||line.productService||`Line ${index+1}`)}</span><input class="input estimate-conversion-line-amount" data-line-index="${index}" type="number" min="0" step="0.01" value="${(Number(line.amount||0)*remainingRatio).toFixed(2)}"></label>`).join("");
      updateEstimateConversionUi(); openModal("estimateConversionModal");
    }
    async function confirmEstimateConversion() {
      const estimate=state.salesDocuments.find(document=>document.id===pendingEstimateConversionId), mode=conversionMode(); if(!estimate)return;
      const estimateTotal=Math.max(0,Number(estimate.total||0)), alreadyConverted=Math.max(0,Number(estimate.convertedAmount||0)), remaining=Math.max(0,estimateTotal-alreadyConverted), remainingRatio=Math.min(1,remaining/Math.max(.01,estimateTotal)); let ratio=remainingRatio, lines=(estimate.lines||[]).map(line=>({...line}));
      if(mode==="partial"){const value=Math.max(0,Number($("estimateConversionPartialValue").value||0));ratio=$("estimateConversionPartialType").value==="percent"?remainingRatio*Math.min(1,value/100):Math.min(remainingRatio,value/Math.max(.01,estimateTotal));}
      if(mode==="manual"){lines=lines.map((line,index)=>{const amount=Math.max(0,Number(document.querySelector(`.estimate-conversion-line-amount[data-line-index="${index}"]`)?.value||0)),quantity=Math.max(.01,Number(line.quantity||1));return {...line,rate:amount/quantity,amount};}).filter(line=>Number(line.amount||0)>0);const requestedRatio=lines.reduce((sum,line)=>sum+Number(line.amount||0),0)/Math.max(.01,(estimate.lines||[]).reduce((sum,line)=>sum+Number(line.amount||0),0));ratio=Math.min(remainingRatio,requestedRatio);if(requestedRatio>ratio){const scale=ratio/requestedRatio;lines=lines.map(line=>({...line,rate:Number(line.rate||0)*scale,amount:Number(line.amount||0)*scale}));}}else if(ratio<1){lines=lines.map(line=>({...line,rate:Number(line.rate||0)*ratio,amount:Number(line.amount||0)*ratio}));}
      if(!lines.length||ratio<=0)return showToast(salesDocLanguage()==="es"?"Selecciona una cantidad válida.":"Choose a valid amount.");
      try {
        await db.runTransaction(async transaction => {
          const invoiceRef = salesDocumentsRef().doc();
          const number = await nextSalesDocumentNumber("invoice", transaction);
          let jobId = estimate.jobId || "";
          if (!jobId) {
            const jobRef = jobsRef().doc(); jobId = jobRef.id;
            transaction.set(jobRef, { clientId:estimate.clientId, title:lines[0]?.description || number, status:"Aprobado", date:estimate.issueDate || today(), dueDate:estimate.dueDate || "", priority:"Media", sale:Number(estimate.total || 0)*ratio, description:lines.map(line => line.description).filter(Boolean).join(" · "), notes:"", materials:[], quote:{ items:lines.map(line => ({ description:line.description, quantity:line.quantity, unitPrice:line.rate })), discountType:"fixed", discountValue:Number(estimate.discount || 0)*ratio, taxPercent:Number(estimate.taxPercent || 0) }, checklist:{}, payments:[], internalNotesLog:[], activityLog:[newLogEntry("factura", `${number} created from ${estimate.number || "estimate"}.`)], createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
          } else {
            transaction.update(jobsRef().doc(jobId), { status:"Aprobado", sale:Number(estimate.total || 0)*ratio, updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
          }
          const invoiceTotal=Number(estimate.total||0)*ratio;
          const invoice = { ...estimate, type:"invoice", number, jobId, lines, subtotal:Number(estimate.subtotal||0)*ratio, discount:Number(estimate.discount||0)*ratio, tax:Number(estimate.tax||0)*ratio, total:invoiceTotal, sourceEstimateId:estimate.id, conversionMode:mode, conversionRatio:ratio, status:"draft", paidAmount:Math.min(invoiceTotal, availableJobCollectedForInvoice(jobId)), createdAt:firebase.firestore.FieldValue.serverTimestamp(), updatedAt:firebase.firestore.FieldValue.serverTimestamp(), createdBy:state.userEmail || "" };
          delete invoice.id;
          delete invoice.approvalTokenHash; delete invoice.approvalLinkExpiresAt; delete invoice.approvalResponse; delete invoice.customerResponseUnread; delete invoice.customerResponseAt;
          transaction.set(invoiceRef, invoice);
          transaction.update(salesDocumentsRef().doc(estimate.id), { status:alreadyConverted+invoiceTotal>=estimateTotal-.01?"converted":"accepted", convertedInvoiceId:invoiceRef.id, convertedAmount:firebase.firestore.FieldValue.increment(invoiceTotal), customerResponseUnread:false, updatedAt:firebase.firestore.FieldValue.serverTimestamp() });
        });
        markModalSaved("estimateConversionModal"); closeModal("estimateConversionModal",true); pendingEstimateConversionId="";
        showToast(salesDocLanguage() === "es" ? "Factura creada desde el estimado." : "Invoice created from estimate.");
      } catch (error) { console.error(error); showToast(salesDocLanguage() === "es" ? "No se pudo convertir." : "Could not convert estimate."); }
    }

    function renderSalesDocuments() {
      if (!$("salesDocumentsTableBody")) return;
      const language = salesDocLanguage();
      const query = cleanText($("salesDocumentSearch")?.value).toLowerCase();
      const type = $("salesDocumentTypeFilter")?.value || "";
      const status = $("salesDocumentStatusFilter")?.value || "";
      const allStatuses = [...new Set(Object.values(SALES_DOCUMENT_STATUSES).flat())];
      const selectedStatus = $("salesDocumentStatusFilter")?.value || "";
      $("salesDocumentStatusFilter").innerHTML = `<option value="">${language === "es" ? "Todos los estados" : "All statuses"}</option>` + allStatuses.map(item => `<option value="${item}">${safe(salesDocLabel(item))}</option>`).join("");
      $("salesDocumentStatusFilter").value = selectedStatus;
      const rows = state.salesDocuments.filter(item => {
        const effective = salesDocEffectiveStatus(item);
        const bag = `${item.number || ""} ${item.clientSnapshot?.name || ""} ${item.clientSnapshot?.company || ""}`.toLowerCase();
        return (!query || bag.includes(query)) && (!type || item.type === type) && (!status || effective === status);
      });
      $("salesDocumentsTableBody").innerHTML = rows.map(item => {
        const effective = salesDocEffectiveStatus(item);
        const balance = item.type === "invoice" ? salesDocBalance(item) : 0;
        // Keep paid and partially paid invoices editable so an incorrect document
        // can still be voided without deleting its payment history.
        const editable = !["accepted", "rejected", "converted", "void"].includes(item.status);
        const currentClientEmail = salesDocClient(item)?.email || item.clientSnapshot?.email || "";
        const canEmail = canWriteData("trabajos") && item.status !== "void" && currentClientEmail;
        const emailLabel = item.emailStatus === "sent" ? (language === "es" ? "Reenviar" : "Resend") : (language === "es" ? "Enviar" : "Send");
        const emailButton = canEmail
          ? `<button class="btn btn-primary btn-small" data-sales-doc-email="${item.id}">${emailLabel}</button>`
          : canWriteData("trabajos") && item.status !== "void"
            ? `<button class="btn btn-primary btn-small" disabled title="${language === "es" ? "Agrega el correo electrónico en la ficha del cliente para poder enviar este documento." : "Add an email address to the customer profile before sending this document."}">${emailLabel}</button>`
            : "";
        const response = item.approvalResponse || {};
        const responseNote = item.type === "estimate" && item.customerResponseUnread ? `<br><small style="color:#f59e0b;font-weight:700">🔔 ${safe(response.signerName || (language === "es" ? "Cliente" : "Customer"))}: ${safe(response.comment || salesDocLabel(item.status))}</small>` : "";
        const typeBadge=`<span class="sales-document-type-badge ${item.type}">${safe(salesDocLabel(item.type))}</span>`;
        return `<tr class="sales-document-row ${item.type}"><td><strong>${safe(item.number || "-")}</strong><br>${typeBadge}</td><td>${safe(item.clientSnapshot?.company || item.clientSnapshot?.name || "-")}<br><small>${safe(item.serviceAddress || item.clientSnapshot?.address || "")}</small></td><td>${safe(item.issueDate || "-")}<br><small>${safe(item.dueDate || "-")}</small></td><td><span class="pill ${salesDocStatusTone(effective)}">${safe(salesDocLabel(effective))}</span>${item.emailStatus === "sent" ? `<br><small>${language === "es" ? "Correo enviado" : "Email sent"}</small>` : ""}${responseNote}</td><td>${money(item.total)}</td><td>${item.type === "invoice" ? money(balance) : "-"}</td><td><div class="actions-row"><button class="btn btn-secondary btn-small" data-sales-doc-preview="${item.id}">${language === "es" ? "Vista previa" : "Preview"}</button><button class="btn btn-secondary btn-small" data-sales-doc-pdf="${item.id}">PDF</button>${emailButton}${item.type === "estimate" && item.customerResponseUnread ? `<button class="btn btn-secondary btn-small" data-sales-doc-read="${item.id}">${language === "es" ? "Marcar visto" : "Mark read"}</button>` : ""}${canWriteData("trabajos") && editable ? `<button class="btn btn-info btn-small" data-sales-doc-edit="${item.id}">${language === "es" ? "Editar" : "Edit"}</button>` : ""}${canWriteData("trabajos") && item.type === "estimate" && item.status === "accepted" ? `<button class="btn btn-primary btn-small" data-sales-doc-convert="${item.id}">${language === "es" ? "Facturar" : "Invoice"}</button>` : ""}${canWriteData("trabajos") && item.type === "invoice" && item.jobId && balance > 0 && item.status !== "void" ? `<button class="btn btn-primary btn-small" data-sales-doc-payment="${item.id}">${language === "es" ? "Pago" : "Payment"}</button>` : ""}${isAdmin() ? `<button class="btn btn-danger btn-small" data-sales-doc-delete="${item.id}">${language === "es" ? "Borrar" : "Delete"}</button>` : ""}</div></td></tr>`;
      }).join("");
      $("salesDocumentsEmpty").classList.toggle("hidden", rows.length > 0);
      const estimates = state.salesDocuments.filter(item => item.type === "estimate" && !["rejected", "expired", "converted"].includes(item.status));
      const invoices = state.salesDocuments.filter(item => item.type === "invoice" && item.status !== "void");
      $("salesDocsDraftTotal").textContent = money(estimates.reduce((sum, item) => sum + Number(item.total || 0), 0));
      $("salesDocsOpenTotal").textContent = money(invoices.filter(item => !["paid", "overdue"].includes(salesDocEffectiveStatus(item))).reduce((sum, item) => sum + salesDocBalance(item), 0));
      $("salesDocsOverdueTotal").textContent = money(invoices.filter(item => salesDocEffectiveStatus(item) === "overdue").reduce((sum, item) => sum + salesDocBalance(item), 0));
      $("salesDocsPaidTotal").textContent = money(invoices.filter(item => salesDocEffectiveStatus(item) === "paid").reduce((sum, item) => sum + Number(item.total || 0), 0));
    }

    async function deleteSalesDocument(id) {
      const item = state.salesDocuments.find(document => document.id === id);
      if (!item || !isAdmin()) return showToast(salesDocLanguage() === "es" ? "Solo propietarios y administradores pueden borrar documentos." : "Only owners and administrators can delete documents.");
      const lang = salesDocLanguage();
      const label = `${salesDocLabel(item.type)} ${item.number || ""}`.trim();
      const warning = lang === "es" ? `¿Borrar ${label}?\n\nSe quitará de estimados/facturas y de los cálculos de Contabilidad. Podrás recuperarlo desde Papelera y recuperación.` : `Delete ${label}?\n\nIt will be removed from estimates/invoices and Accounting calculations. You can restore it from Trash & recovery.`;
      if (!window.confirm(warning)) return;
      try {
        await moveRecordToTrash("salesDocuments", id, label);
        showToast(lang === "es" ? `${label} se movió a la papelera y Contabilidad se actualizará automáticamente.` : `${label} was moved to trash and Accounting will update automatically.`);
      } catch (error) {
        console.error(error);
        showToast(error?.message || (lang === "es" ? "No se pudo borrar el documento." : "The document could not be deleted."));
      }
    }

    function buildSalesDocumentPdf(id) {
      const item = state.salesDocuments.find(document => document.id === id);
      return buildSalesDocumentPdfFromItem(item);
    }

    function buildSalesDocumentPdfFromItem(item) {
      if (!item || !window.jspdf?.jsPDF) return null;
      const lang = item.language === "es" ? "es" : "en";
      const t = (en, es) => lang === "es" ? es : en;
      const { jsPDF } = window.jspdf; const pdf = new jsPDF();
      const color = typeof companyPdfColor === "function" ? companyPdfColor() : [15, 23, 42];
      const issuerName = typeof pdfCompanyName === "function" ? pdfCompanyName() : (COMPANY.legalName || COMPANY.name || "SignShop HQ");
      const paymentPhone = COMPANY.phone || "-";
      const documentTitle = salesDocLabel(item.type, lang).toUpperCase();
      const customer = item.clientSnapshot || {};
      const job = state.jobs.find(entry => entry.id === item.jobId) || {};
      const customerHeading = customer.company || customer.name || "-";
      const customerContact = customer.company && customer.name && customer.name !== customer.company ? customer.name : "";
      const paid = item.type === "invoice" ? salesDocPaid(item) : 0;
      const balance = item.type === "invoice" ? salesDocBalance(item) : Number(item.total || 0);
      const deposit = item.type === "estimate" ? (item.depositMode === "fixed" ? Math.min(Number(item.total||0),Number(item.depositValue||0)) : Number(item.total||0)*Number(item.depositValue ?? item.depositPercent ?? 0)/100) : 0;
      const drawHeader = () => {
        pdf.setFillColor(17,19,20); pdf.rect(0,0,210,35,"F");
        pdf.setFillColor(...color); pdf.rect(0,34,210,1,"F");
        if (typeof addPdfBrandMark === "function") addPdfBrandMark(pdf);
        pdf.setTextColor(255,255,255); pdf.setFont(undefined,"bold"); pdf.setFontSize(19); pdf.text(documentTitle,196,14,{align:"right"});
        pdf.setTextColor(...color); pdf.setFontSize(9); pdf.text(issuerName.toUpperCase(),196,22,{align:"right"});
        pdf.setTextColor(238,240,242); pdf.setFont(undefined,"normal"); pdf.setFontSize(7.5); pdf.text(COMPANY.website || COMPANY.email || "",196,28,{align:"right"});
      };
      const section = (title, x, y, width) => {
        pdf.setFillColor(17,19,20); pdf.roundedRect(x,y,width,8,2,2,"F");
        pdf.setTextColor(...color); pdf.setFont(undefined,"bold"); pdf.setFontSize(8.5); pdf.text(title.toUpperCase(),x+4,y+5.3);
      };
      const label = (text, x, y) => { pdf.setFont(undefined,"bold"); pdf.setTextColor(91,101,117); pdf.setFontSize(6.5); pdf.text(text.toUpperCase(),x,y); };
      const value = (text, x, y, maxWidth=80) => { pdf.setFont(undefined,"normal"); pdf.setTextColor(23,25,29); pdf.setFontSize(8); pdf.text(pdf.splitTextToSize(String(text || "-"),maxWidth).slice(0,2),x,y); };
      drawHeader();
      pdf.setFillColor(247,248,250); pdf.setDrawColor(216,221,229); pdf.roundedRect(14,41,182,19,2,2,"FD");
      const meta = [[t("Document number","Número"),item.number || "-"],[t("Issue date","Fecha"),item.issueDate || "-"],[item.type === "estimate" ? t("Valid until","Válido hasta") : t("Due date","Vencimiento"),item.dueDate || "-"],[t("PO / work order","PO / orden"),job.number || job.workOrder || "-"]];
      meta.forEach((entry,index)=>{ const x=20+(index*44); label(entry[0],x,48); value(entry[1],x,55,39); });
      section(t("Bill to & project","Cliente y proyecto"),14,65,182);
      pdf.setDrawColor(216,221,229); pdf.roundedRect(14,73,182,28,2,2,"S"); pdf.line(105,78,105,96);
      label(t("Client / company","Cliente / empresa"),20,81); value(customerHeading,20,87,78);
      label(t("Contact","Contacto"),20,93); value([customerContact,customer.email,customer.phone].filter(Boolean).join(" | ") || "-",20,98,78);
      label(t("Project name","Proyecto"),112,81); value(job.title || job.name || item.lines?.[0]?.productService || "-",112,87,77);
      label(t("Project / site address","Dirección del proyecto"),112,93); value(item.serviceAddress || customer.address || "-",112,98,77);
      section(t("Products & services","Productos y servicios"),14,106,182);
      pdf.autoTable({
        startY:114,
        margin:{left:14,right:14,top:42,bottom:20},
        head:[[t("Description / deliverable","Descripción / entregable"),t("Qty","Cant."),t("Rate","Precio"),t("Amount","Importe")]],
        body:(item.lines || []).map(line => [[line.productService,line.description].filter(Boolean).join(" - ") || "-", Number(line.quantity || 0).toFixed(2), money(line.rate), money(line.amount)]),
        theme:"grid",
        headStyles:{fillColor:[242,244,247],textColor:[24,26,30],fontStyle:"bold",halign:"center",lineColor:[216,221,229],lineWidth:.25},
        bodyStyles:{textColor:[35,38,44],lineColor:[216,221,229],lineWidth:.25,cellPadding:3,fontSize:8},
        columnStyles:{0:{cellWidth:100},1:{cellWidth:20,halign:"center"},2:{cellWidth:31,halign:"right"},3:{cellWidth:31,halign:"right"}},
        didDrawPage:data=>{ if(data.pageNumber>1) drawHeader(); }
      });
      let y = pdf.lastAutoTable.finalY + 7;
      if (y > 220) { pdf.addPage(); drawHeader(); y=44; }
      section(t("Notes & payment terms","Notas y condiciones"),14,y,108); section(item.type === "invoice" ? t("Invoice total","Total factura") : t("Estimate total","Total estimado"),126,y,70); y += 8;
      const notesTop=y; pdf.setDrawColor(216,221,229); pdf.roundedRect(14,y,108,58,2,2,"S"); pdf.roundedRect(126,y,70,58,2,2,"S");
      label(t("Notes / payment instructions","Notas / instrucciones de pago"),20,y+8);
      const message=[item.customerMessage,item.paymentInstructions].filter(Boolean).join("\n") || t("Thank you for your business.","Gracias por su confianza.");
      pdf.setFont(undefined,"normal"); pdf.setTextColor(55,61,70); pdf.setFontSize(7.3); pdf.text(pdf.splitTextToSize(message,96).slice(0,5),20,y+14);
      const terms = lang === "es" ? [`OPCIONES DE PAGO: Zelle ${paymentPhone}, cheque o tarjeta de crédito (cargo del 3.5%).`, "Los trabajos con un total de $250 o menos deben pagarse en su totalidad antes de comenzar. Para trabajos mayores, se requiere un anticipo del 50%; el saldo restante deberá pagarse antes de la instalación. El pago confirma la aceptación de todos los diseños aprobados y de estos términos. Todos los pagos son finales y no reembolsables.", `${issuerName} no se hace responsable por daños a servicios subterráneos sin marcar, áreas ajardinadas, pintura, estuco, revestimientos, ladrillos o superficies pavimentadas durante las inspecciones o la instalación. Los cambios solicitados después de aprobar el diseño pueden generar cargos adicionales.`] : [`PAYMENT OPTIONS: Zelle ${paymentPhone}, check, or credit card (3.5% fee).`, "Jobs totaling $250 or less must be paid in full before work begins. For jobs over $250, a 50% deposit is required and the remaining balance is due before installation. Payment confirms acceptance of all approved designs and these terms. All payments are final and non-refundable.", `${issuerName} is not responsible for damage to unmarked utilities, landscaping, paint, stucco, siding, brick, or paved surfaces during surveys or installation. Changes requested after design approval may incur additional charges.`];
      pdf.setFillColor(244,248,238); pdf.roundedRect(20,notesTop+34,96,18,1,1,"F"); pdf.setTextColor(55,61,70); pdf.setFontSize(6.2); pdf.text(pdf.splitTextToSize(terms[1],91).slice(0,5),23,notesTop+39);
      const totals = [[t("Subtotal","Subtotal"),money(item.subtotal)],[t("Discount","Descuento"),Number(item.discount||0)?`-${money(item.discount)}`:money(0)],[`${t("Sales tax","Impuesto")} (${Number(item.taxPercent||0).toFixed(2)}%)`,money(item.tax)],[documentTitle,money(item.total)],[item.type === "invoice" ? t("Amount paid","Pagado") : t("Required deposit","Anticipo"),money(item.type === "invoice" ? paid : deposit)],[item.type === "invoice" ? t("Balance due","Saldo pendiente") : t("Remaining after deposit","Resto después del anticipo"),money(item.type === "invoice" ? balance : Math.max(0,Number(item.total||0)-deposit))]];
      totals.forEach((row,index)=>{ const rowY=notesTop+8+(index*8); if(index===3){pdf.setFillColor(244,248,238);pdf.rect(130,rowY-5.2,62,7,"F");} if(index===5){pdf.setFillColor(...color);pdf.rect(130,rowY-5.2,62,7,"F");} pdf.setFont(undefined,index>=3?"bold":"normal");pdf.setTextColor(24,27,31);pdf.setFontSize(7.5);pdf.text(row[0],133,rowY);pdf.text(row[1],189,rowY,{align:"right"});});
      y=notesTop+65; section(item.type === "invoice" ? t("Payment information","Información de pago") : t("Customer approval","Aprobación del cliente"),14,y,182); y+=8;
      pdf.setFillColor(247,248,250); pdf.setDrawColor(216,221,229); pdf.roundedRect(14,y,182,18,2,2,"FD");
      if(item.type === "invoice") {
        const status=salesDocLabel(salesDocEffectiveStatus(item),lang), paidAtValue=item.paidAt?.toDate?.()?.toISOString?.().slice(0,10)||String(item.paidAt||"-").slice(0,10); const fields=[[t("Payment method","Método"),paid>0?t("Stripe / recorded payment","Stripe / pago registrado"):t("Pending","Pendiente")],[t("Payment reference","Referencia"),item.stripePaymentIntentId||item.number||"-"],[t("Payment date","Fecha de pago"),paidAtValue],[t("Status / terms","Estado / términos"),`${status} / ${item.paymentTerms||"-"}`]];
        fields.forEach((entry,index)=>{const x=20+(index*44);label(entry[0],x,y+7);value(entry[1],x,y+14,39);});
      } else {
        const response=item.approvalResponse||{}; const fields=[[t("Customer Signature","Firma del cliente"),response.signerName||"________________"],[t("Email","Correo"),response.signerEmail||customer.email||"-"],[t("Approval date","Fecha de aprobación"),response.acceptedAtIso||response.submittedAt?.toDate?.()?.toISOString?.()||"________________"],[t("Status","Estado"),salesDocLabel(item.status,lang)]];
        fields.forEach((entry,index)=>{const x=20+(index*44);label(entry[0],x,y+7);value(entry[1],x,y+14,39);});
      }
      return pdf;
    }

    function exportSalesDocumentPdf(id) {
      const item = state.salesDocuments.find(document => document.id === id);
      const pdf = buildSalesDocumentPdf(id);
      if (!item || !pdf) return;
      if (typeof savePdf === "function") savePdf(pdf, `${item.number || "document"}.pdf`, "customer"); else pdf.save(`${item.number || "document"}.pdf`);
    }

    function previewSalesDocumentPdf(id) {
      const pdf = buildSalesDocumentPdf(id);
      if (!pdf) return showToast(salesDocLanguage() === "es" ? "No se pudo generar la vista previa." : "The preview could not be generated.");
      window.open(pdf.output("bloburl"), "_blank", "noopener");
    }

    let pendingSalesEmailId = "";
    function salesEmailRecipients(value) { return cleanText(value).split(/[;,]/).map(part => part.trim()).filter(Boolean); }
    function renderSalesEmailPreview() {
      const item = state.salesDocuments.find(document => document.id === pendingSalesEmailId); if (!item) return;
      const es = item.language === "es", issuer = COMPANY.tradeName || COMPANY.legalName || COMPANY.name || "SignShop HQ";
      const customer = salesDocClient(item)?.company || salesDocClient(item)?.name || item.clientSnapshot?.company || item.clientSnapshot?.name || (es ? "cliente" : "customer");
      const balance = item.type === "invoice" ? Math.max(0, Number(item.total||0)-Number(item.paidAmount||0)) : Number(item.total||0);
      const message = cleanText($("salesEmailMessage").value);
      const action = item.type === "invoice" ? (es ? "Ver y pagar" : "View and pay") : (es ? "Revisar y aceptar" : "Review and approve");
      $("salesEmailPreview").innerHTML = `${COMPANY.logoUrl ? `<img src="${safe(COMPANY.logoUrl)}" alt="${safe(issuer)}">` : `<h2>${safe(issuer)}</h2>`}<div class="email-preview-hero"><h2>${es ? (item.type === "invoice" ? "¡Tu factura está lista!" : "¡Tu estimado está listo!") : (item.type === "invoice" ? "Your invoice is ready!" : "Your estimate is ready!")}</h2><small>${item.type === "invoice" ? (es ? "SALDO PENDIENTE" : "BALANCE DUE") : (es ? "TOTAL DEL ESTIMADO" : "ESTIMATE TOTAL")}</small><div class="email-preview-amount">${money(balance)}</div></div><div class="email-preview-message">${safe(es ? `Hola ${customer},` : `Hello ${customer},`)}\n\n${safe(message)}</div><span class="email-preview-action" style="background:${safe(COMPANY.brandColor || "#2563eb")}">${action}</span><div class="email-preview-company"><strong>${safe(issuer)}</strong><br>${safe(COMPANY.address || "")}<br>${safe(COMPANY.email || "")} ${safe(COMPANY.phone || "")}</div><small>Powered securely by SignShop HQ</small>`;
    }
    function openSalesEmailReview(id) {
      const item = state.salesDocuments.find(document => document.id === id);
      const recipient = salesDocClient(item)?.email || item?.clientSnapshot?.email || "";
      if (!item || !recipient) return showToast(salesDocLanguage() === "es" ? "El cliente no tiene un correo válido." : "The customer does not have a valid email address.");
      const es = item.language === "es", issuer = COMPANY.tradeName || COMPANY.legalName || COMPANY.name || "SignShop HQ", type = item.type === "invoice" ? (es ? "Factura" : "Invoice") : (es ? "Estimado" : "Estimate");
      pendingSalesEmailId = id;
      $("salesEmailReviewTitle").textContent = es ? `Revisar y enviar ${type.toLowerCase()} ${item.number||""}` : `Review and send ${type.toLowerCase()} ${item.number||""}`;
      $("salesEmailFrom").textContent = `${issuer} <documents@signshophq.com>`; $("salesEmailTo").value = recipient; $("salesEmailCc").value = ""; $("salesEmailBcc").value = ""; $("salesEmailSendCopy").checked = true; $("salesEmailAttachPdf").checked = false;
      $("salesEmailSubject").value = es ? `${type} ${item.number||""} de ${issuer}` : `${type} ${item.number||""} from ${issuer}`;
      $("salesEmailMessage").value = es ? (item.type === "invoice" ? "Agradecemos tu preferencia. Revisa los detalles de la factura y utiliza el botón para realizar el pago seguro." : "Revisa los detalles del estimado. Si tienes alguna pregunta, contáctanos. Esperamos trabajar contigo.") : (item.type === "invoice" ? "We appreciate your business. Review the invoice details and use the button to make a secure payment." : "Please review the estimate details. Contact us with any questions. We look forward to working with you.");
      $("salesEmailSendCopyLabel").textContent = es ? "Enviar una copia a mi empresa" : "Send a copy to my business"; $("salesEmailAttachPdfLabel").textContent = es ? "Adjuntar copia PDF" : "Attach PDF copy"; $("sendSalesDocumentEmailBtn").textContent = es ? `Enviar ${type.toLowerCase()}` : `Send ${type.toLowerCase()}`;
      renderSalesEmailPreview(); openModal("salesDocumentEmailModal");
    }
    async function sendReviewedSalesDocumentEmail() {
      const id = pendingSalesEmailId, item = state.salesDocuments.find(document => document.id === id), button = $("sendSalesDocumentEmailBtn");
      if (!item) return;
      const to = salesEmailRecipients($("salesEmailTo").value), cc = salesEmailRecipients($("salesEmailCc").value), bcc = salesEmailRecipients($("salesEmailBcc").value);
      if (!to.length) return showToast(item.language === "es" ? "Escribe un destinatario válido." : "Enter a valid recipient.");
      const pdf = buildSalesDocumentPdf(id);
      if (!pdf) return showToast(salesDocLanguage() === "es" ? "No se pudo generar el PDF." : "The PDF could not be generated.");
      button.disabled = true;
      const original = button.textContent;
      button.textContent = item.language === "es" ? "Enviando…" : "Sending…";
      try {
        const callable = cloudFunctions.httpsCallable("sendSalesDocumentEmail");
        await callable({ ownerId:state.accountOwnerId || state.uid, documentId:id, pdfBase64:pdf.output("datauristring").split(",")[1], to, cc, bcc, subject:$("salesEmailSubject").value, message:$("salesEmailMessage").value, sendCopy:$("salesEmailSendCopy").checked, attachPdf:$("salesEmailAttachPdf").checked });
        closeModal("salesDocumentEmailModal", true); pendingSalesEmailId = "";
        showToast(item.language === "es" ? `Correo enviado a ${to.join(", ")}.` : `Email sent to ${to.join(", ")}.`);
      } catch (error) {
        console.error(error);
        showToast(error?.message || (item.language === "es" ? "No se pudo enviar el correo." : "The email could not be sent."));
      } finally { button.disabled = false; button.textContent = original; }
    }

    function applySalesDocumentsLanguage() {
      const es = salesDocLanguage() === "es";
      if (!$("salesDocsHeading")) return;
      $("navDocumentosBtn").innerHTML = es ? "📄 Estimados y facturas" : "📄 Estimates & invoices";
      $("salesDocsHeading").textContent = es ? "Estimados y facturas" : "Estimates & invoices";
      $("salesDocsNote").textContent = es ? "Los estimados no cuentan como dinero cobrado. Solamente los pagos registrados afectan el total cobrado." : "Estimates do not count as collected money. Only recorded payments affect collected totals.";
      $("salesDocsDraftLabel").textContent = es ? "Estimados activos" : "Active estimates"; $("salesDocsOpenLabel").textContent = es ? "Facturas abiertas" : "Open invoices"; $("salesDocsOverdueLabel").textContent = es ? "Vencido" : "Overdue"; $("salesDocsPaidLabel").textContent = es ? "Facturas pagadas" : "Paid invoices";
      $("salesDocumentSearch").placeholder = es ? "Buscar cliente o número de documento" : "Search customer or document number";
      $("salesDocsDocumentTh").textContent = es ? "Documento" : "Document";
      $("salesDocsCustomerTh").textContent = es ? "Cliente" : "Customer";
      $("salesDocsDateTh").textContent = es ? "Fecha" : "Date";
      $("salesDocsStatusTh").textContent = es ? "Estado" : "Status";
      $("salesDocsTotalTh").textContent = "Total";
      $("salesDocsBalanceTh").textContent = es ? "Saldo" : "Balance";
      $("salesDocsActionsTh").textContent = es ? "Acciones" : "Actions";
      if (state.currentView === "documentos") { $("pageTitle").textContent = es ? "Contabilidad · Estimados y facturas" : "Accounting · Estimates & invoices"; $("pageSubtitle").textContent = es ? "Crea, envía y controla los documentos de venta desde el centro contable." : "Create, send and track sales documents from the accounting center."; $("btnNewMain").textContent = es ? "+ Nuevo documento" : "+ New document"; }
      const selectedTypeFilter = $("salesDocumentTypeFilter").value; $("salesDocumentTypeFilter").innerHTML = `<option value="">${es ? "Todos los documentos" : "All documents"}</option><option value="estimate">${es ? "Estimados" : "Estimates"}</option><option value="invoice">${es ? "Facturas" : "Invoices"}</option>`; $("salesDocumentTypeFilter").value = selectedTypeFilter;
      $("salesDocTypeLabel").textContent = es ? "Tipo de documento" : "Document type";
      $("salesDocClientLabel").textContent = es ? "Cliente" : "Customer";
      $("salesDocAddressLabel").textContent = es ? "Dirección del trabajo / facturación" : "Job / billing address";
      $("salesDocAddress").placeholder = es ? "Dirección que aparecerá en este documento" : "Address shown on this document";
      $("salesDocJobLabel").textContent = es ? "Trabajo relacionado" : "Related job";
      $("salesDocLanguageLabel").textContent = es ? "Idioma del cliente" : "Customer language";
      $("salesDocIssueDateLabel").textContent = es ? "Fecha de emisión" : "Issue date";
      $("salesDocDueDateLabel").textContent = es ? "Vencimiento" : "Expiration / due date";
      $("salesDocStatusLabel").textContent = es ? "Estado" : "Status";
      $("salesDocTermsLabel").textContent = es ? "Condiciones de pago" : "Payment terms";
      $("salesDocDepositLabel").textContent = es ? "Solicitud de anticipo" : "Deposit request";
      $("salesDocItemsHeading").textContent = es ? "Productos y servicios" : "Products and services";
      $("salesDocInternalHelp").textContent = es ? "El costo interno y la ganancia nunca aparecen en el PDF del cliente." : "Internal cost and profit are never shown on the customer PDF.";
      $("addSalesDocLineBtn").textContent = es ? "+ Agregar partida" : "+ Add line";
      $("salesDocCloseBtn").textContent = es ? "Cerrar" : "Close";
      $("salesDocCancelBtn").textContent = es ? "Cancelar" : "Cancel";
      $("salesDocProductTh").textContent = es ? "Producto / servicio" : "Product / service";
      $("salesDocDescriptionTh").textContent = es ? "Descripción" : "Description";
      $("salesDocQtyTh").textContent = es ? "Cant." : "Qty";
      $("salesDocRateTh").textContent = es ? "Precio" : "Rate";
      $("salesDocCostTh").textContent = es ? "Costo interno" : "Internal cost";
      $("salesDocTaxableTh").textContent = es ? "Gravable" : "Taxable";
      $("salesDocAmountTh").textContent = es ? "Importe" : "Amount";
      $("salesDocDiscountLabel").textContent = es ? "Descuento" : "Discount";
      $("salesDocTaxLabel").textContent = es ? "Impuesto de venta %" : "Sales tax %";
      $("salesDocSubtotalLabel").textContent = "Subtotal";
      $("salesDocTaxTotalLabel").textContent = es ? "Impuesto" : "Tax";
      $("salesDocTotalLabel").textContent = "Total";
      $("salesDocProfitLabel").textContent = es ? "Ganancia interna" : "Internal profit";
      $("salesDocCustomerMessageLabel").textContent = es ? "Mensaje para el cliente" : "Customer message";
      $("salesDocPaymentInstructionsLabel").textContent = es ? "Instrucciones de pago" : "Payment instructions";
      $("salesDocInternalNotesLabel").textContent = es ? "Notas internas" : "Internal notes";
      $("salesDocCustomerMessage").placeholder = es ? "Mensaje que aparecerá en el documento" : "Message shown on the document";
      $("salesDocPaymentInstructions").placeholder = es ? "Cómo puede pagar el cliente" : "How the customer can pay";
      $("salesDocInternalNotes").placeholder = es ? "Solamente tu equipo puede ver esto" : "Only your team can see this";
      $("salesDocLines").querySelectorAll(".sales-line-description").forEach(input => { input.placeholder = es ? "Producto o servicio" : "Product or service"; });
      $("salesDocLines").querySelectorAll(".sales-line-product").forEach(input => { input.placeholder = es ? "Producto / servicio" : "Product / service"; });
      const termsValue=$("salesDocTerms").value; $("salesDocTerms").innerHTML=`<option value="due_on_receipt">${es?"Al recibir":"Due on receipt"}</option><option value="net_15">Net 15</option><option value="net_30">Net 30</option><option value="net_60">Net 60</option><option value="custom">${es?"Fecha personalizada":"Custom date"}</option>`; $("salesDocTerms").value=termsValue;
      $("salesDocLines").querySelectorAll(".sales-line-remove").forEach(button => { button.setAttribute("aria-label", es ? "Eliminar" : "Remove"); });
      $("saveSalesDocumentBtn").textContent = es ? "Guardar documento" : "Save document";
      $("previewSalesDocumentBtn").textContent = es ? "Vista previa en página completa" : "Full-page preview";
      const currentType = $("salesDocType").value; $("salesDocType").innerHTML = `<option value="estimate">${es ? "Estimado" : "Estimate"}</option><option value="invoice">${es ? "Factura" : "Invoice"}</option>`; $("salesDocType").value = currentType;
      fillSalesDocumentStatusOptions($("salesDocStatus").value || "draft");
      renderSalesDocuments();
    }

    $("addSalesDocLineBtn")?.addEventListener("click", () => { $("salesDocLines").appendChild(createSalesDocumentLine()); calculateSalesDocumentForm(); });
    $("saveSalesDocumentBtn")?.addEventListener("click", () => withSaveButton("saveSalesDocumentBtn", salesDocLanguage() === "es" ? "Guardando…" : "Saving…", saveSalesDocument));
    $("salesDocType")?.addEventListener("change", () => fillSalesDocumentStatusOptions("draft"));
    $("salesDocClientId")?.addEventListener("change", () => { fillSalesDocumentRelations($("salesDocClientId").value); $("salesDocAddress").value = salesDocDefaultAddress(salesDocClient({ clientId:$("salesDocClientId").value })); });
    $("previewSalesDocumentBtn")?.addEventListener("click", () => { if (!state.editingSalesDocumentId) return showToast(salesDocLanguage() === "es" ? "Guarda el documento primero para abrir la vista previa." : "Save the document before opening the preview."); previewSalesDocumentPdf(state.editingSalesDocumentId); });
    ["salesDocDiscount","salesDocTaxPercent"].forEach(id => $(id)?.addEventListener("input", calculateSalesDocumentForm));
    $("salesDocTaxEnabled")?.addEventListener("change", calculateSalesDocumentForm);
    ["salesDocumentSearch","salesDocumentTypeFilter","salesDocumentStatusFilter"].forEach(id => { $(id)?.addEventListener("input", renderSalesDocuments); $(id)?.addEventListener("change", renderSalesDocuments); });
    $("salesDocTerms")?.addEventListener("change", () => { const days={due_on_receipt:0,net_15:15,net_30:30,net_60:60}[$("salesDocTerms").value]; if(days == null)return; const base=new Date(`${$("salesDocIssueDate").value || today()}T12:00:00`); base.setDate(base.getDate()+days); $("salesDocDueDate").value=base.toISOString().slice(0,10); });
    $("salesDocumentsTableBody")?.addEventListener("click", event => { const edit = event.target.closest("[data-sales-doc-edit]"); const convert = event.target.closest("[data-sales-doc-convert]"); const preview = event.target.closest("[data-sales-doc-preview]"); const pdf = event.target.closest("[data-sales-doc-pdf]"); const email = event.target.closest("[data-sales-doc-email]"); const read = event.target.closest("[data-sales-doc-read]"); const payment = event.target.closest("[data-sales-doc-payment]"); const remove = event.target.closest("[data-sales-doc-delete]"); if (edit) editSalesDocument(edit.dataset.salesDocEdit); if (convert) convertEstimateToInvoice(convert.dataset.salesDocConvert); if (preview) previewSalesDocumentPdf(preview.dataset.salesDocPreview); if (pdf) exportSalesDocumentPdf(pdf.dataset.salesDocPdf); if (email) openSalesEmailReview(email.dataset.salesDocEmail); if (read) salesDocumentsRef().doc(read.dataset.salesDocRead).update({ customerResponseUnread:false, updatedAt:firebase.firestore.FieldValue.serverTimestamp() }).catch(console.error); if (remove) deleteSalesDocument(remove.dataset.salesDocDelete); if (payment) { const invoice = state.salesDocuments.find(item => item.id === payment.dataset.salesDocPayment); if (invoice?.jobId) { resetPaymentForm(invoice.jobId); state.workingPaymentInvoiceId = invoice.id; $("paymentJobId").disabled = true; $("paymentAmount").value = salesDocBalance(invoice).toFixed(2); $("paymentNote").value = `${invoice.number || "Invoice"}`; openModal("paymentModal"); } } });
    ["salesEmailSubject","salesEmailMessage"].forEach(id => $(id)?.addEventListener("input", renderSalesEmailPreview));
    $("sendSalesDocumentEmailBtn")?.addEventListener("click", sendReviewedSalesDocumentEmail);
    document.querySelectorAll('input[name="estimateConversionMode"]').forEach(input=>input.addEventListener("change",updateEstimateConversionUi));
    ["estimateConversionPartialType","estimateConversionPartialValue"].forEach(id=>$(id)?.addEventListener("input",updateEstimateConversionUi));
    $("estimateConversionManualLines")?.addEventListener("input",updateEstimateConversionUi);
    $("confirmEstimateConversionBtn")?.addEventListener("click",()=>withSaveButton("confirmEstimateConversionBtn",salesDocLanguage()==="es"?"Creando…":"Creating…",confirmEstimateConversion));
    window.renderSalesDocuments = renderSalesDocuments;
    window.resetSalesDocumentForm = resetSalesDocumentForm;
    window.applySalesDocumentsLanguage = applySalesDocumentsLanguage;
    window.addEventListener("crm-language-changed", applySalesDocumentsLanguage);
