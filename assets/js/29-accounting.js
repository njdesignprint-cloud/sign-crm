(function () {
  let selectedClosedPeriod = null;
  let periodStatusLoading = false;
  let accountingSettingsLoaded = false;
  let accountingSettingsLoading = false;
  let accountingSettings = {};
  const validAccountingEnvironment = () => (APP_ENVIRONMENT === "development" && firebaseConfig.projectId === "signshophq-dev") || (APP_ENVIRONMENT === "production" && firebaseConfig.projectId === "sign-crm-a7bda");
  const permanentCloseEnabled = () => validAccountingEnvironment() && !!state.uid && isAdmin() && (APP_ENVIRONMENT === "development" || accountingSettings.active === true);
  const openingBalanceAccounts = [
    ["1000", "Cash and bank"], ["1100", "Accounts receivable"], ["1200", "Inventory asset"], ["1500", "Fixed assets"],
    ["2000", "Accounts payable"], ["2100", "Sales tax payable"], ["2200", "Customer deposits"], ["3000", "Owner equity"]
  ];
  let openingBalanceCsvPreview = null;
  let openingBalanceComparisonResult = null;
  let permanentEntriesLoading = false;
  let permanentEntriesLoaded = false;
  const openingBalanceAccountCodes = new Set(openingBalanceAccounts.map(([code]) => code));
  function accountingLanguage() { return state.language === "es" ? "es" : "en"; }
  function accountingText(en, es) { return accountingLanguage() === "es" ? es : en; }
  function openingBalanceMappingStorageKey() { return `signshophq:opening-balance-mappings:${state.accountOwnerId || state.uid || "local"}`; }
  function loadOpeningBalanceMappings() {
    try {
      const parsed = JSON.parse(localStorage.getItem(openingBalanceMappingStorageKey()) || "{}");
      return Object.fromEntries(Object.entries(parsed).filter(([name, code]) => name && openingBalanceAccountCodes.has(code)));
    } catch { return {}; }
  }
  function saveOpeningBalanceMappings(mappings) {
    try { localStorage.setItem(openingBalanceMappingStorageKey(), JSON.stringify(mappings)); } catch {}
  }

  async function loadAccountingSettings(force=false) {
    if (!state.uid || accountingSettingsLoading || (accountingSettingsLoaded && !force)) return;
    accountingSettingsLoading = true;
    try {
      const snapshot = await userRef().collection("settings").doc("accounting").get();
      accountingSettings = snapshot.data() || {};
      accountingSettingsLoaded = true;
      if ($("accountingCutoverDate") && accountingSettings.cutoverDate) $("accountingCutoverDate").value = accountingSettings.cutoverDate;
      if ($("accountingActivationStatus")) {
        $("accountingActivationStatus").textContent = accountingSettings.active ? accountingText("Active", "Activa") : accountingText("Not activated", "No activada");
        $("accountingActivationStatus").className = `pill ${accountingSettings.active ? "state-active" : "st-pendiente"}`;
      }
      if ($("accountingActivateBtn")) $("accountingActivateBtn").disabled = accountingSettings.active === true;
      if ($("accountingActivationMessage") && accountingSettings.active) $("accountingActivationMessage").textContent = accountingText(`Permanent accounting starts ${accountingSettings.cutoverDate}. Earlier records will not be posted.`, `La contabilidad permanente comienza el ${accountingSettings.cutoverDate}. Los registros anteriores no se contabilizarán.`);
    } catch(error) { console.error("Loading accounting settings", error); }
    finally { accountingSettingsLoading = false; }
  }

  async function activateCleanAccounting() {
    if (!validAccountingEnvironment() || !isAdmin()) return;
    const button=$("accountingActivateBtn"); button.disabled=true;
    try {
      const result=(await cloudFunctions.httpsCallable("accountingActivateCleanStart")({
        ownerId:state.accountOwnerId||state.uid,
        cutoverDate:$("accountingCutoverDate").value,
        confirmation:$("accountingActivationConfirmation").value
      })).data||{};
      await loadAccountingSettings(true);
      permanentEntriesLoaded=false;
      if (typeof renderBankReconciliation === "function") renderBankReconciliation();
      showToast(result.reused ? accountingText("Accounting was already active.","La contabilidad ya estaba activa.") : accountingText("Permanent accounting activated.","Contabilidad permanente activada."));
      renderAccounting();
    } catch(error) { console.error(error); showToast(error?.message || accountingText("Accounting could not be activated.","No se pudo activar la contabilidad.")); button.disabled=false; }
  }

  // Permanent entries (opening balances, posted documents and closed-period
  // entries) belong in the balance sheet and trial balance, but must not be
  // mixed into the provisional revenue, expense, or cash-flow metrics.
  function permanentLedgerEntries() {
    return (state.journalEntries || []).flatMap(item => {
      try {
        return [AccountingCore.createEntry({
          id:item.id,
          date:item.date,
          description:item.description,
          sourceType:item.sourceType,
          sourceId:item.sourceId,
          lines:item.lines
        })];
      } catch (error) {
        console.warn("Ignoring invalid permanent accounting entry", item?.id, error);
        return [];
      }
    });
  }

  function renderAccounting() {
    if (!window.AccountingCore || !$("accountingEntriesBody")) return;
    const entries = AccountingCore.buildProvisionalLedger({
      jobs:state.jobs, salesDocuments:state.salesDocuments, trashItems:state.trashItems, expenses:state.expenses,
      commissionSettlements:state.commissionSettlements, purchaseOrders:state.purchaseOrders
    });
    const permanentEntries = permanentLedgerEntries();
    const reportingEntries = permanentCloseEnabled() ? permanentEntries : entries;
    const filtered = AccountingCore.filterEntries(reportingEntries, cleanText($("accountingFrom")?.value), cleanText($("accountingTo")?.value));
    const filteredAll = filtered;
    const summary = AccountingCore.summarize(filtered);
    const accounts = AccountingCore.trialBalance(filteredAll);
    const setMoney = (id, value) => { if ($(id)) $(id).textContent = money(value); };
    setMoney("accountingCash", summary.cash);
    setMoney("accountingReceivable", summary.receivable);
    setMoney("accountingSalesTax", summary.salesTaxPayable);
    setMoney("accountingNetIncome", summary.netIncome);
    setMoney("accountingHomeCash", summary.cash);
    setMoney("accountingHomeReceivable", summary.receivable);
    setMoney("accountingHomeTax", summary.salesTaxPayable);
    setMoney("accountingHomeProfit", summary.netIncome);
    if ($("accountingSalesCenterTitle")) $("accountingSalesCenterTitle").textContent=accountingText("Sales documents","Documentos de venta");
    if ($("accountingSalesCenterNote")) $("accountingSalesCenterNote").textContent=accountingText("Open and review estimates or invoices without creating a new document.","Abre y revisa estimados o facturas sin crear un documento nuevo.");
    if ($("accountingAllDocumentsLabel")) $("accountingAllDocumentsLabel").textContent=accountingText("All documents","Todos los documentos");
    if ($("accountingEstimatesLabel")) $("accountingEstimatesLabel").textContent=accountingText("Estimates","Estimados");
    if ($("accountingInvoicesLabel")) $("accountingInvoicesLabel").textContent=accountingText("Invoices","Facturas");
    const estimates=(state.salesDocuments||[]).filter(item=>item.type==="estimate");
    const invoices=(state.salesDocuments||[]).filter(item=>item.type==="invoice");
    if ($("accountingAllDocumentsCount")) $("accountingAllDocumentsCount").textContent=estimates.length+invoices.length;
    if ($("accountingEstimatesCount")) $("accountingEstimatesCount").textContent=estimates.length;
    if ($("accountingInvoicesCount")) $("accountingInvoicesCount").textContent=invoices.length;
    setMoney("accountingAllDocumentsTotal",estimates.reduce((sum,item)=>sum+Number(item.total||0),0)+invoices.reduce((sum,item)=>sum+Number(item.total||0),0));
    setMoney("accountingEstimatesTotal",estimates.filter(item=>!["rejected","expired"].includes(item.status)).reduce((sum,item)=>sum+Number(item.total||0),0));
    setMoney("accountingInvoicesTotal",invoices.filter(item=>item.status!=="void").reduce((sum,item)=>sum+Number(item.total||0),0));
    if ($("accountingHomeAgingNote")) $("accountingHomeAgingNote").textContent = accountingText(`${money(summary.receivable)} outstanding from customers.`, `${money(summary.receivable)} pendientes de clientes.`);
    if ($("accountingHomeTaxNote")) $("accountingHomeTaxNote").textContent = accountingText(`${money(summary.salesTaxPayable)} currently classified as sales tax payable.`, `${money(summary.salesTaxPayable)} clasificados como sales tax por pagar.`);
    if ($("accountingBalanced")) {
      const balanced = Math.abs(summary.totalDebits - summary.totalCredits) < 0.005;
      $("accountingBalanced").textContent = balanced
        ? accountingText("Balanced", "Cuadrado")
        : accountingText("Difference detected", "Diferencia detectada");
      $("accountingBalanced").className = `pill ${balanced ? "state-active" : "st-cancelado"}`;
    }
    $("accountingTrialBalanceBody").innerHTML = accounts.map(account => `<tr><td>${safe(account.code)}</td><td>${safe(accountingText(account.name, {
      "Cash and bank":"Efectivo y banco", "Accounts receivable":"Cuentas por cobrar", "Sales tax payable":"Sales tax por pagar",
      "Sales revenue":"Ingresos por ventas", "Operating expenses":"Gastos operativos", "Sales commissions":"Comisiones de ventas",
      "Accounts payable":"Cuentas por pagar", "Inventory asset":"Inventario"
    }[account.name] || account.name))}</td><td>${money(account.debit)}</td><td>${money(account.credit)}</td><td>${money(account.balance)}</td></tr>`).join("");
    $("accountingEntriesBody").innerHTML = filtered.slice().reverse().slice(0, 200).map(entry => `<tr><td>${safe(entry.date)}</td><td>${safe(entry.description)}</td><td>${safe(entry.sourceType)}</td><td>${money(entry.debit)}</td><td>${money(entry.credit)}</td></tr>`).join("");
    $("accountingEmpty").classList.toggle("hidden", filtered.length > 0);
    $("accountingEntryCount").textContent = accountingText(`${filtered.length} provisional entries`, `${filtered.length} asientos provisionales`);
    const profit = AccountingCore.profitAndLoss(filtered);
    $("profitLossNet").textContent = money(profit.netIncome);
    $("profitLossNet").className = profit.netIncome >= 0 ? "ok-text" : "danger-text";
    $("profitLossBody").innerHTML = [
      ...profit.revenue.map(account => [accountingText("Income", "Ingresos"), account.name, account.balance]),
      ...profit.expenses.map(account => [accountingText("Expense", "Gasto"), account.name, account.balance]),
      [accountingText("Total", "Total"), accountingText("Net income", "Ganancia neta"), profit.netIncome]
    ].map(row => `<tr><td>${safe(row[0])}</td><td>${safe(row[1])}</td><td>${money(row[2])}</td></tr>`).join("");

    const throughDate = cleanText($("accountingTo")?.value);
    const cumulative = AccountingCore.filterEntries(reportingEntries, "", throughDate);
    const balance = AccountingCore.balanceSheet(cumulative);
    $("balanceSheetStatus").textContent = Math.abs(balance.difference) < 0.005 ? accountingText("Balanced", "Cuadrado") : accountingText("Difference", "Diferencia");
    $("balanceSheetStatus").className = `pill ${Math.abs(balance.difference) < 0.005 ? "state-active" : "st-cancelado"}`;
    $("balanceSheetBody").innerHTML = [
      ...balance.assets.map(account => [accountingText("Asset", "Activo"), account.name, account.balance]),
      ...balance.liabilities.map(account => [accountingText("Liability", "Pasivo"), account.name, account.balance]),
      ...balance.equity.map(account => [accountingText("Equity", "Patrimonio"), account.name, account.balance]),
      [accountingText("Equity", "Patrimonio"), accountingText("Current earnings", "Ganancia acumulada provisional"), balance.currentEarnings],
      [accountingText("Check", "Comprobación"), accountingText("Assets − liabilities − equity", "Activos − pasivos − patrimonio"), balance.difference]
    ].map(row => `<tr><td>${safe(row[0])}</td><td>${safe(row[1])}</td><td>${money(row[2])}</td></tr>`).join("");

    const cashFlow = AccountingCore.cashFlow(filtered);
    $("cashFlowInflows").textContent = money(cashFlow.inflows);
    $("cashFlowOutflows").textContent = money(cashFlow.outflows);
    $("cashFlowNet").textContent = money(cashFlow.netCashFlow);
    $("cashFlowNet").className = cashFlow.netCashFlow >= 0 ? "ok-text" : "danger-text";

    const agingDate = throughDate || new Date().toISOString().slice(0, 10);
    const aging = AccountingCore.accountsReceivableAging({ salesDocuments:state.salesDocuments, jobs:state.jobs }, agingDate);
    $("receivableAgingTotal").textContent = money(aging.totals.total);
    $("agingCurrent").textContent = money(aging.totals.current);
    $("aging30").textContent = money(aging.totals["1_30"]);
    $("aging60").textContent = money(aging.totals["31_60"]);
    $("aging90").textContent = money(aging.totals["61_90"]);
    $("agingOver90").textContent = money(aging.totals.over_90);
    $("receivableAgingBody").innerHTML = aging.rows.map(row => `<tr><td>${safe(row.number)}</td><td>${safe(row.customer)}</td><td>${safe(row.dueDate)}</td><td>${row.daysPastDue}</td><td>${money(row.balance)}</td></tr>`).join("");
    $("receivableAgingEmpty").classList.toggle("hidden", aging.rows.length > 0);
    if (typeof renderBankReconciliation === "function") renderBankReconciliation();
    if (state.uid && !accountingSettingsLoaded && !accountingSettingsLoading) loadAccountingSettings().then(renderAccounting);
    $("accountingActivationPanel")?.classList.toggle("hidden", !validAccountingEnvironment() || !isAdmin());
    $("accountingPeriodClosePanel")?.classList.toggle("hidden", !permanentCloseEnabled());
    $("openingBalancePanel")?.classList.toggle("hidden", !permanentCloseEnabled());
    if (permanentCloseEnabled()) refreshPeriodCloseStatus();
    renderAccountingMigrationReadiness();
    if (permanentCloseEnabled() && !permanentEntriesLoaded && !permanentEntriesLoading && typeof journalEntriesRef === "function") {
      permanentEntriesLoading = true;
      Promise.all([
        journalEntriesRef().limit(500).get(),
        userRef().collection("openingBalanceImports").doc("opening_balance_initial").get()
      ]).then(async ([snapshot, importSnapshot]) => {
        const entries = snapshot.docs.map(doc => ({ id:doc.id, ...doc.data() }));
        const entryId = importSnapshot.exists ? importSnapshot.data()?.entryId : "";
        if (entryId && !entries.some(item => item.id === entryId)) {
          const entrySnapshot = await journalEntriesRef().doc(entryId).get();
          if (entrySnapshot.exists) entries.push({ id:entrySnapshot.id, ...entrySnapshot.data() });
        }
        state.journalEntries = entries;
        permanentEntriesLoaded = true;
        renderAccounting();
      }).catch(error => console.error("Loading permanent accounting entries:", error)).finally(() => { permanentEntriesLoading = false; });
    }
  }

  function wireAccountingHomeActions() {
    const openDocuments = type => { $("navDocumentosBtn")?.click(); setTimeout(() => { if ($("salesDocumentTypeFilter")) { $("salesDocumentTypeFilter").value=type; $("salesDocumentTypeFilter").dispatchEvent(new Event("change")); } },100); };
    $("accountingViewAllDocumentsBtn")?.addEventListener("click",()=>openDocuments(""));
    $("accountingViewEstimatesBtn")?.addEventListener("click",()=>openDocuments("estimate"));
    $("accountingViewInvoicesBtn")?.addEventListener("click",()=>openDocuments("invoice"));
    const openNewDocument = type => {
      $("navDocumentosBtn")?.click();
      setTimeout(() => {
        if (!state.clients.length) return showToast(state.language === "en" ? "Create a client first." : "Primero crea un cliente.");
        resetSalesDocumentForm(type);
        openModal("salesDocumentModal");
      }, 100);
    };
    $("accountingQuickEstimateBtn")?.addEventListener("click", () => openNewDocument("estimate"));
    $("accountingQuickInvoiceBtn")?.addEventListener("click", () => openNewDocument("invoice"));
    $("accountingQuickExpenseBtn")?.addEventListener("click", () => { $("navGastosBtn")?.click(); setTimeout(() => $("btnNewMain")?.click(), 100); });
    $("accountingQuickReportBtn")?.addEventListener("click", () => $("navReportesBtn")?.click());
  }
  wireAccountingHomeActions();
  $("accountingActivateBtn")?.addEventListener("click",activateCleanAccounting);

  function accountingMigrationChecks() {
    const provisionalEntries = AccountingCore.buildProvisionalLedger({ jobs:state.jobs, salesDocuments:state.salesDocuments, trashItems:state.trashItems, expenses:state.expenses, commissionSettlements:state.commissionSettlements, purchaseOrders:state.purchaseOrders });
    const provisional = AccountingCore.summarize(provisionalEntries);
    const permanentBalanced = state.journalEntries.every(entry => Math.abs(Number(entry.totalDebit || 0) - Number(entry.totalCredit || 0)) < 0.005);
    const missingPurchases = state.purchaseOrders.reduce((sum, po) => sum + (typeof purchaseOrderMissingAccountingSources === "function" ? purchaseOrderMissingAccountingSources(po).length : 0), 0);
    let csvBalanced = false;
    if (openingBalanceCsvPreview) {
      try { csvBalanced = OpeningBalanceCsv.importTrialBalanceCsv(openingBalanceCsvPreview.text, openingBalanceCsvPreview.mappings).balanced; } catch {}
    }
    return [
      { label:accountingText("Permanent accounting is activated", "La contabilidad permanente está activada"), passed:permanentCloseEnabled() },
      { label:accountingText("Provisional journal is balanced", "El libro provisional está cuadrado"), passed:Math.abs(provisional.totalDebits - provisional.totalCredits) < 0.005 },
      { label:accountingText("Permanent entries are internally balanced", "Los asientos permanentes están internamente cuadrados"), passed:state.journalEntries.length > 0 && permanentBalanced },
      { label:accountingText("Supplier bills and payments have no missing postings", "Las facturas y pagos a proveedores no tienen contabilizaciones pendientes"), passed:missingPurchases === 0 },
      { label:accountingText("A reconciled month has been closed", "Se ha cerrado un mes conciliado"), passed:!!selectedClosedPeriod },
      { label:accountingText("Opening balances are mapped and balanced", "Los saldos iniciales están asignados y cuadrados"), passed:csvBalanced || !!state.journalEntries.find(item=>item.sourceType==="opening_balance") },
      { label:accountingText("Cutover date is selected", "La fecha de corte está seleccionada"), passed:!!cleanText($("openingBalanceDate")?.value) },
      { label:accountingText("Opening balances have been reviewed", "Los saldos iniciales fueron revisados"), passed:!!openingBalanceComparisonResult?.matched || !!state.journalEntries.find(item=>item.sourceType==="opening_balance") }
    ];
  }

  function renderAccountingMigrationReadiness() {
    if (!$("accountingMigrationReadinessList")) return;
    const checks = accountingMigrationChecks();
    const passed = checks.filter(item => item.passed).length;
    const ready = passed === checks.length;
    $("accountingMigrationReadinessStatus").textContent = ready ? accountingText("Ready for review", "Listo para revisión") : accountingText(`Not ready · ${passed}/${checks.length}`, `No listo · ${passed}/${checks.length}`);
    $("accountingMigrationReadinessStatus").className = `pill ${ready ? "state-active" : "st-cancelado"}`;
    $("accountingMigrationReadinessList").innerHTML = checks.map(item => `<div class="alert-card"><span class="pill ${item.passed ? "state-active" : "st-cancelado"}">${item.passed ? "✓" : "!"}</span><strong>${safe(item.label)}</strong></div>`).join("");
  }

  function exportAccountingMigrationReadinessPdf() {
    if (!permanentCloseEnabled()) return showToast(accountingText("Available only in Development.", "Disponible solo en Desarrollo."));
    const checks = accountingMigrationChecks();
    const passed = checks.filter(item => item.passed).length;
    const ready = passed === checks.length;
    const cutoff = cleanText($("openingBalanceDate")?.value) || accountingText("Not selected", "No seleccionada");
    const pdf = createModulePdf(accountingText("Accounting go-live readiness", "Preparación para inicio contable"), accountingText("Clean start in SignShop HQ", "Inicio limpio en SignShop HQ"));
    pdf.setFontSize(9); pdf.setTextColor(70, 78, 92);
    pdf.text(`${accountingText("Generated", "Generado")}: ${new Date().toLocaleString()}  |  ${accountingText("Cutover date", "Fecha de corte")}: ${cutoff}`, 14, 55);
    pdf.autoTable({
      startY:61,
      head:[[accountingText("Control", "Control"), accountingText("Result", "Resultado")]],
      body:checks.map(item => [item.label, item.passed ? accountingText("PASS", "APROBADO") : accountingText("BLOCKED", "BLOQUEADO")]),
      headStyles:{ fillColor:companyPdfColor() },
      columnStyles:{ 0:{ cellWidth:145 }, 1:{ cellWidth:35 } },
      styles:{ fontSize:9, cellPadding:3 },
      didParseCell:data => { if (data.section === "body" && data.column.index === 1) data.cell.styles.textColor = data.cell.raw === "PASS" || data.cell.raw === "APROBADO" ? [20,125,75] : [190,45,55]; }
    });
    let nextY = pdf.lastAutoTable.finalY + 9;
    pdf.setFont(undefined, "bold"); pdf.setFontSize(11); pdf.setTextColor(ready ? 20 : 190, ready ? 125 : 45, ready ? 75 : 55);
    pdf.text(ready ? accountingText("READY FOR FINAL REVIEW", "LISTO PARA REVISIÓN FINAL") : accountingText(`NOT READY - ${passed}/${checks.length} controls passed`, `NO LISTO - ${passed}/${checks.length} controles aprobados`), 14, nextY);
    pdf.setFont(undefined, "normal"); pdf.setFontSize(8); pdf.setTextColor(90, 98, 112);
    pdf.text(accountingText("This report never authorizes Production automatically. Explicit owner approval and verified backups remain required.", "Este informe nunca autoriza Producción automáticamente. Siguen siendo obligatorios la aprobación explícita del propietario y los respaldos verificados."), 14, nextY + 6, { maxWidth:180 });
    if (openingBalanceComparisonResult?.rows?.length) {
      pdf.addPage();
      pdf.setFont(undefined, "bold"); pdf.setFontSize(15); pdf.setTextColor(20, 22, 27); pdf.text(accountingText("Cutover balance comparison", "Comparación de saldos de corte"), 14, 20);
      pdf.setFont(undefined, "normal"); pdf.setFontSize(9); pdf.setTextColor(90, 98, 112); pdf.text(`${accountingText("Through", "Hasta")}: ${cutoff}`, 14, 27);
      const names = Object.fromEntries(openingBalanceAccounts);
      pdf.autoTable({ startY:34, head:[[accountingText("Account", "Cuenta"), "QuickBooks", "SignShop HQ", accountingText("Difference", "Diferencia"), accountingText("Result", "Resultado")]], body:openingBalanceComparisonResult.rows.map(item => [`${item.accountCode} - ${names[item.accountCode] || item.accountCode}`, money(item.sourceBalance), money(item.currentBalance), money(item.difference), item.matched ? accountingText("Match", "Coincide") : accountingText("Review", "Revisar")]), headStyles:{ fillColor:companyPdfColor() }, styles:{ fontSize:8, cellPadding:3 } });
    }
    savePdf(pdf, `Accounting_Migration_Readiness_${today()}.pdf`);
    showToast(accountingText("Migration readiness PDF generated.", "PDF de preparación para migración generado."));
  }

  function renderOpeningBalanceLines() {
    if (!$("openingBalanceLines")) return;
    $("openingBalanceLines").innerHTML = openingBalanceAccounts.map(([code, name]) => `<tr data-opening-account="${code}"><td>${code}</td><td>${safe(name)}</td><td><input class="input opening-debit" type="number" min="0" max="100000000" step="0.01" aria-label="${safe(name)} debit" /></td><td><input class="input opening-credit" type="number" min="0" max="100000000" step="0.01" aria-label="${safe(name)} credit" /></td><td><input class="input opening-memo" type="text" maxlength="160" placeholder="Optional evidence note" /></td></tr>`).join("");
  }

  function applyOpeningBalanceCsv(result, fileName) {
    const byCode = new Map(result.lines.map(line => [line.accountCode, line]));
    Array.from($("openingBalanceLines")?.querySelectorAll("tr") || []).forEach(row => {
      const line = byCode.get(row.dataset.openingAccount) || {};
      row.querySelector(".opening-debit").value = line.debit || "";
      row.querySelector(".opening-credit").value = line.credit || "";
      row.querySelector(".opening-memo").value = line.memo || "";
    });
    $("openingBalanceReference").value = fileName.replace(/\.csv$/i, "").slice(0, 200);
    const manualItems = result.sourceItems.filter(item => !item.detectedCode);
    $("openingBalanceCsvIssuesBody").innerHTML = manualItems.map(item => {
      const selectedCode = openingBalanceCsvPreview?.mappings[item.row] || "";
      let debit = item.debit; let credit = item.credit;
      if (item.balance !== null) {
        const normallyDebit = ["1000", "1100", "1200", "1500"].includes(selectedCode);
        debit = normallyDebit && item.balance >= 0 ? item.balance : (!normallyDebit && item.balance < 0 ? Math.abs(item.balance) : 0);
        credit = normallyDebit && item.balance < 0 ? Math.abs(item.balance) : (!normallyDebit && item.balance >= 0 ? item.balance : 0);
      }
      const accountOptions = openingBalanceAccounts.map(([code, name]) => `<option value="${code}"${selectedCode === code ? " selected" : ""}>${code} - ${safe(name)}</option>`).join("");
      return `<tr><td>${item.row}</td><td>${safe(item.accountName)}</td><td>${money(debit)}</td><td>${money(credit)}</td><td><select class="input opening-csv-mapping" data-csv-row="${item.row}" aria-label="Map ${safe(item.accountName)}"><option value="">Choose account...</option>${accountOptions}</select></td></tr>`;
    }).join("");
    $("openingBalanceCsvIssues").classList.toggle("hidden", !manualItems.length);
    $("openingBalanceCsvSummary").textContent = result.balanced
      ? accountingText(`${result.sourceRows} nonzero rows mapped. Debits and credits both total ${money(result.totalDebit)}. Review before importing.`, `${result.sourceRows} filas con saldo fueron asignadas. Débitos y créditos suman ${money(result.totalDebit)}. Revisa antes de importar.`)
      : accountingText(`${result.sourceRows} nonzero rows found. Difference: ${money(result.difference)}. ${result.unmapped.length} account(s) need manual review. Import remains blocked until the preview balances.`, `${result.sourceRows} filas con saldo encontradas. Diferencia: ${money(result.difference)}. ${result.unmapped.length} cuenta(s) requieren revisión manual. La importación seguirá bloqueada hasta cuadrar.`);
    $("importOpeningBalanceBtn").disabled = !result.balanced;
    renderOpeningBalanceComparison(result);
  }

  function renderOpeningBalanceComparison(result) {
    const container = $("openingBalanceComparison");
    if (!container) return;
    const cutoff = cleanText($("openingBalanceDate")?.value);
    if (!cutoff || !result?.balanced) {
      openingBalanceComparisonResult = null;
      container.classList.add("hidden");
      $("openingBalanceComparisonBody").innerHTML = "";
      $("openingBalanceComparisonSummary").textContent = cutoff
        ? accountingText("Balance the CSV mapping to compare accounts.", "Cuadra la asignación del CSV para comparar las cuentas.")
        : accountingText("Choose the effective date to compare both books.", "Escoge la fecha efectiva para comparar ambos libros.");
      renderAccountingMigrationReadiness();
      return;
    }
    const entries = AccountingCore.buildProvisionalLedger({ jobs:state.jobs, salesDocuments:state.salesDocuments, trashItems:state.trashItems, expenses:state.expenses, commissionSettlements:state.commissionSettlements, purchaseOrders:state.purchaseOrders });
    const currentAccounts = AccountingCore.trialBalance(AccountingCore.filterEntries(entries, "", cutoff));
    const comparison = OpeningBalanceCsv.compareBalanceSheet(result.lines, currentAccounts);
    openingBalanceComparisonResult = comparison;
    const names = Object.fromEntries(openingBalanceAccounts);
    $("openingBalanceComparisonBody").innerHTML = comparison.rows.map(item => `<tr><td>${safe(item.accountCode)}</td><td>${safe(names[item.accountCode] || item.accountCode)}</td><td>${money(item.sourceBalance)}</td><td>${money(item.currentBalance)}</td><td class="${item.matched ? "ok-text" : "danger-text"}">${money(item.difference)}</td><td><span class="pill ${item.matched ? "state-active" : "st-cancelado"}">${item.matched ? accountingText("Match", "Coincide") : accountingText("Review", "Revisar")}</span></td></tr>`).join("");
    $("openingBalanceComparisonSummary").textContent = comparison.matched
      ? accountingText(`All mapped balance-sheet accounts match through ${cutoff}.`, `Todas las cuentas de balance asignadas coinciden hasta ${cutoff}.`)
      : accountingText(`${comparison.differenceCount} account(s) differ through ${cutoff}. Do not activate Production accounting yet.`, `${comparison.differenceCount} cuenta(s) tienen diferencias hasta ${cutoff}. Todavía no actives la contabilidad en Producción.`);
    container.classList.remove("hidden");
    renderAccountingMigrationReadiness();
  }

  async function previewOpeningBalanceCsv(file) {
    if (!file || !permanentCloseEnabled()) return;
    try {
      const text = await file.text();
      const initial = OpeningBalanceCsv.importTrialBalanceCsv(text);
      const remembered = loadOpeningBalanceMappings();
      const mappings = {};
      initial.sourceItems.filter(item => !item.detectedCode).forEach(item => {
        const code = remembered[OpeningBalanceCsv.mappingKeyFor(item.accountName)];
        if (code) mappings[item.row] = code;
      });
      const result = OpeningBalanceCsv.importTrialBalanceCsv(text, mappings);
      openingBalanceCsvPreview = { text, fileName:file.name, mappings, sourceItems:initial.sourceItems };
      applyOpeningBalanceCsv(result, file.name);
      showToast(result.balanced ? accountingText("Trial balance mapped locally. Review before importing.", "Balance de comprobación asignado localmente. Revisa antes de importar.") : accountingText("CSV analyzed, but review is required.", "CSV analizado, pero requiere revisión."));
    } catch (error) {
      console.error(error); $("openingBalanceCsvSummary").textContent = error?.message || accountingText("The CSV could not be analyzed.", "No se pudo analizar el CSV.");
      $("openingBalanceCsvIssues").classList.add("hidden");
      openingBalanceCsvPreview = null;
      $("importOpeningBalanceBtn").disabled = false;
      showToast(accountingText("The CSV could not be analyzed.", "No se pudo analizar el CSV."));
    } finally { $("openingBalanceCsvFile").value = ""; }
  }

  async function importOpeningBalances() {
    if (!permanentCloseEnabled()) return;
    const button = $("importOpeningBalanceBtn");
    const message = $("openingBalanceMessage");
    if (openingBalanceCsvPreview) {
      const preview = OpeningBalanceCsv.importTrialBalanceCsv(openingBalanceCsvPreview.text, openingBalanceCsvPreview.mappings);
      if (!preview.balanced) return showToast(accountingText("Map every CSV account and balance the preview before importing.", "Asigna todas las cuentas del CSV y cuadra la vista previa antes de importar."));
    }
    if (cleanText($("openingBalanceConfirmation")?.value).toUpperCase() !== "IMPORT") return showToast(accountingText("Type IMPORT to confirm.", "Escribe IMPORT para confirmar."));
    const lines = Array.from($("openingBalanceLines")?.querySelectorAll("tr") || []).map(row => ({
      accountCode:row.dataset.openingAccount,
      debit:Number(row.querySelector(".opening-debit")?.value || 0),
      credit:Number(row.querySelector(".opening-credit")?.value || 0),
      memo:cleanText(row.querySelector(".opening-memo")?.value)
    })).filter(line => line.debit > 0 || line.credit > 0);
    const effectiveDate = cleanText($("openingBalanceDate")?.value);
    const sourceReference = cleanText($("openingBalanceReference")?.value);
    const idempotencyKey = cleanText($("openingBalanceKey")?.value);
    if (!effectiveDate || !sourceReference || !idempotencyKey || lines.length < 2) return showToast(accountingText("Complete the date, source, unique key and at least two account lines.", "Completa fecha, fuente, clave única y al menos dos cuentas."));
    const debit = lines.reduce((sum, line) => sum + line.debit, 0);
    const credit = lines.reduce((sum, line) => sum + line.credit, 0);
    if (Math.abs(debit - credit) > 0.005) return showToast(accountingText("Debits and credits must be equal.", "Los débitos y créditos deben ser iguales."));
    button.disabled = true;
    try {
      const response = await cloudFunctions.httpsCallable("accountingImportOpeningBalance")({ ownerId:state.accountOwnerId || state.uid, effectiveDate, sourceReference, idempotencyKey, lines });
      const result = response.data || {};
      message.textContent = accountingText(`Imported ${result.lineCount || lines.length} lines. Permanent entry: ${result.entryId}.`, `Se importaron ${result.lineCount || lines.length} líneas. Asiento permanente: ${result.entryId}.`);
      showToast(result.reused ? accountingText("This import already existed; no duplicate was created.", "Esta importación ya existía; no se creó un duplicado.") : accountingText("Opening balances imported safely.", "Saldos iniciales importados de forma segura."));
      $("openingBalanceConfirmation").value = "";
    } catch (error) {
      console.error(error); message.textContent = error?.message || accountingText("Opening balances were not imported.", "Los saldos iniciales no fueron importados.");
      showToast(accountingText("Import blocked. Review the requirement below.", "Importación bloqueada. Revisa el requisito indicado."));
    } finally { button.disabled = openingBalanceCsvPreview ? !OpeningBalanceCsv.importTrialBalanceCsv(openingBalanceCsvPreview.text, openingBalanceCsvPreview.mappings).balanced : false; }
  }

  async function refreshPeriodCloseStatus() {
    if (!permanentCloseEnabled() || !$("accountingCloseMonth")?.value || periodStatusLoading) return;
    periodStatusLoading = true;
    const periodId = $("accountingCloseMonth").value;
    try {
      const snapshot = await userRef().collection("accountingPeriods").doc(periodId).get();
      const closed = snapshot.exists && snapshot.data()?.status === "closed";
      selectedClosedPeriod = closed ? { id:periodId, ...snapshot.data() } : null;
      $("accountingPeriodCloseStatus").textContent = closed ? accountingText("Closed", "Cerrado") : accountingText("Open", "Abierto");
      $("accountingPeriodCloseStatus").className = `pill ${closed ? "state-active" : "st-diseno"}`;
      $("accountingClosePeriodBtn").disabled = closed;
      $("accountingDownloadClosePdfBtn")?.classList.toggle("hidden", !closed);
      if (closed) {
        const summary = snapshot.data()?.closeSummary || {};
        $("accountingPeriodCloseMessage").textContent = accountingText(`Closed with ${summary.entryCount || 0} permanent entries. Close hash: ${String(snapshot.data()?.closeHash || "").slice(0, 12)}…`, `Cerrado con ${summary.entryCount || 0} asientos permanentes. Sello: ${String(snapshot.data()?.closeHash || "").slice(0, 12)}…`);
      } else $("accountingPeriodCloseMessage").textContent = accountingText("The server will verify the permanent journal and every active bank or credit-card reconciliation before closing.", "El servidor comprobará el libro permanente y todas las conciliaciones bancarias o de tarjetas activas antes de cerrar.");
      renderAccountingMigrationReadiness();
    } catch (error) { console.error(error); }
    finally { periodStatusLoading = false; }
  }

  function permanentEntry(doc) {
    const data = doc.data();
    return AccountingCore.createEntry({ id:doc.id, date:data.date, description:data.description, sourceType:data.sourceType, sourceId:data.sourceId, lines:data.lines });
  }

  function addClosePackagePage(pdf, title, subtitle = "") {
    pdf.addPage();
    pdf.setTextColor(20, 22, 27); pdf.setFont(undefined, "bold"); pdf.setFontSize(15); pdf.text(title, 14, 20);
    pdf.setFont(undefined, "normal"); pdf.setFontSize(9); pdf.setTextColor(90, 98, 112);
    if (subtitle) pdf.text(subtitle, 14, 27);
  }

  async function downloadAccountingClosePackage() {
    if (!permanentCloseEnabled() || !selectedClosedPeriod) return;
    const button = $("accountingDownloadClosePdfBtn"); button.disabled = true;
    try {
      const [journalSnapshot, reconciliationSnapshot, accountSnapshot] = await Promise.all([
        userRef().collection("journalEntries").get(),
        userRef().collection("bankReconciliations").get(),
        userRef().collection("financialAccounts").get()
      ]);
      const allEntries = journalSnapshot.docs.map(permanentEntry).sort((a, b) => a.date.localeCompare(b.date));
      const periodEntries = allEntries.filter(entry => entry.date >= selectedClosedPeriod.periodStart && entry.date <= selectedClosedPeriod.periodEnd);
      const cumulativeEntries = allEntries.filter(entry => entry.date <= selectedClosedPeriod.periodEnd);
      const summary = AccountingCore.summarize(periodEntries);
      const profit = AccountingCore.profitAndLoss(periodEntries);
      const trial = AccountingCore.trialBalance(periodEntries);
      const balance = AccountingCore.balanceSheet(cumulativeEntries);
      const cash = AccountingCore.cashFlow(periodEntries);
      const reconciliations = reconciliationSnapshot.docs.map(doc => ({ id:doc.id, ...doc.data() })).filter(item => item.periodEnd >= selectedClosedPeriod.periodStart && item.periodEnd <= selectedClosedPeriod.periodEnd);
      const accounts = new Map(accountSnapshot.docs.map(doc => [doc.id, doc.data()]));
      const pdf = createModulePdf(accountingText("Monthly accounting close", "Cierre contable mensual"), `${selectedClosedPeriod.periodStart} to ${selectedClosedPeriod.periodEnd}`);
      pdf.autoTable({ startY:58, head:[[accountingText("Close certificate", "Certificado de cierre"), accountingText("Verified value", "Valor comprobado")]], body:[
        [accountingText("Status", "Estado"), accountingText("CLOSED - IMMUTABLE", "CERRADO - INMUTABLE")],
        [accountingText("Permanent entries", "Asientos permanentes"), String(summary.entryCount)],
        [accountingText("Total debits", "Débitos totales"), money(summary.totalDebits)],
        [accountingText("Total credits", "Créditos totales"), money(summary.totalCredits)],
        [accountingText("Close hash", "Sello del cierre"), selectedClosedPeriod.closeHash || "-"],
        [accountingText("Closed by", "Cerrado por"), selectedClosedPeriod.closedBy || "-"],
        [accountingText("Notice", "Aviso"), accountingText("Internal accounting report - not a tax filing", "Reporte contable interno - no es una declaración fiscal")]
      ], headStyles:{ fillColor:companyPdfColor() }, styles:{ fontSize:8, cellPadding:3 }, columnStyles:{ 0:{ cellWidth:48 }, 1:{ cellWidth:130 } } });
      pdf.autoTable({ startY:pdf.lastAutoTable.finalY + 9, head:[[accountingText("Period metric", "Indicador del período"), accountingText("Amount", "Monto")]], body:[
        [accountingText("Revenue", "Ingresos"), money(profit.totalRevenue)],
        [accountingText("Expenses", "Gastos"), money(profit.totalExpenses)],
        [accountingText("Net income", "Ganancia neta"), money(profit.netIncome)],
        [accountingText("Cash inflows", "Entradas de efectivo"), money(cash.inflows)],
        [accountingText("Cash outflows", "Salidas de efectivo"), money(cash.outflows)],
        [accountingText("Net cash flow", "Flujo neto de efectivo"), money(cash.netCashFlow)]
      ], headStyles:{ fillColor:companyPdfColor() } });

      addClosePackagePage(pdf, accountingText("Profit and loss", "Estado de resultados"), selectedClosedPeriod.id);
      pdf.autoTable({ startY:34, head:[[accountingText("Section", "Sección"), accountingText("Account", "Cuenta"), accountingText("Amount", "Monto")]], body:[
        ...profit.revenue.map(item => [accountingText("Revenue", "Ingreso"), `${item.code} - ${item.name}`, money(item.balance)]),
        ...profit.expenses.map(item => [accountingText("Expense", "Gasto"), `${item.code} - ${item.name}`, money(item.balance)]),
        [accountingText("Result", "Resultado"), accountingText("Net income", "Ganancia neta"), money(profit.netIncome)]
      ], headStyles:{ fillColor:companyPdfColor() } });
      pdf.autoTable({ startY:pdf.lastAutoTable.finalY + 10, head:[[accountingText("Trial balance account", "Cuenta del balance de comprobación"), accountingText("Debit", "Débito"), accountingText("Credit", "Crédito"), accountingText("Balance", "Saldo")]], body:trial.map(item => [`${item.code} - ${item.name}`, money(item.debit), money(item.credit), money(item.balance)]), headStyles:{ fillColor:companyPdfColor() }, styles:{ fontSize:8 } });

      addClosePackagePage(pdf, accountingText("Balance sheet", "Balance general"), accountingText("Cumulative through month end", "Acumulado hasta el cierre del mes"));
      pdf.autoTable({ startY:34, head:[[accountingText("Class", "Clase"), accountingText("Account", "Cuenta"), accountingText("Balance", "Saldo")]], body:[
        ...balance.assets.map(item => [accountingText("Asset", "Activo"), `${item.code} - ${item.name}`, money(item.balance)]),
        ...balance.liabilities.map(item => [accountingText("Liability", "Pasivo"), `${item.code} - ${item.name}`, money(item.balance)]),
        ...balance.equity.map(item => [accountingText("Equity", "Patrimonio"), `${item.code} - ${item.name}`, money(item.balance)]),
        [accountingText("Equity", "Patrimonio"), accountingText("Cumulative earnings", "Ganancia acumulada"), money(balance.currentEarnings)],
        [accountingText("Check", "Comprobación"), accountingText("Assets - liabilities - equity", "Activos - pasivos - patrimonio"), money(balance.difference)]
      ], headStyles:{ fillColor:companyPdfColor() } });

      addClosePackagePage(pdf, accountingText("Cash flow and receivables", "Flujo de efectivo y cuentas por cobrar"), selectedClosedPeriod.id);
      pdf.autoTable({ startY:34, head:[[accountingText("Date", "Fecha"), accountingText("Cash movement", "Movimiento de efectivo"), accountingText("Amount", "Monto")]], body:cash.movements.length ? cash.movements.map(item => [item.date, item.description, money(item.amount)]) : [["-", accountingText("No cash movements", "Sin movimientos de efectivo"), money(0)]], headStyles:{ fillColor:companyPdfColor() }, styles:{ fontSize:8 } });
      pdf.autoTable({ startY:pdf.lastAutoTable.finalY + 10, head:[[accountingText("Receivables control", "Control de cuentas por cobrar"), accountingText("Amount", "Monto")]], body:[[accountingText("Accounts receivable ledger balance", "Saldo contable de cuentas por cobrar"), money(balance.assets.find(item => item.code === "1100")?.balance || 0)]], headStyles:{ fillColor:companyPdfColor() } });

      addClosePackagePage(pdf, accountingText("Bank reconciliations", "Conciliaciones bancarias"), accountingText("Reconciliations included in this closed month", "Conciliaciones incluidas en este mes cerrado"));
      pdf.autoTable({ startY:34, head:[[accountingText("Account", "Cuenta"), accountingText("Period", "Período"), accountingText("Ending balance", "Saldo final"), accountingText("Difference", "Diferencia"), accountingText("Status", "Estado")]], body:reconciliations.length ? reconciliations.map(item => [accounts.get(item.accountId)?.name || item.accountId, `${item.periodStart} to ${item.periodEnd}`, money(item.endingBalance), money(item.difference), item.status]) : [[accountingText("No reconcilable account opened in this period", "Ninguna cuenta conciliable abierta en este período"), "-", money(0), money(0), "N/A"]], headStyles:{ fillColor:companyPdfColor() }, styles:{ fontSize:8 } });
      savePdf(pdf, `Accounting_Close_${selectedClosedPeriod.id}.pdf`);
      showToast(accountingText("Monthly close PDF downloaded.", "PDF del cierre mensual descargado."));
    } catch (error) {
      console.error(error); showToast(accountingText("The close package could not be generated.", "No se pudo generar el paquete del cierre."));
    } finally { button.disabled = false; }
  }

  async function closeAccountingPeriod() {
    if (!permanentCloseEnabled()) return;
    const periodId = $("accountingCloseMonth")?.value || "";
    if (!periodId) return showToast(accountingText("Choose an accounting month.", "Selecciona un mes contable."));
    const warning = accountingText(`Close ${periodId} permanently? New entries and corrections dated in this month will be blocked.`, `¿Cerrar ${periodId} permanentemente? Se bloquearán nuevos asientos y correcciones fechados en este mes.`);
    if (!window.confirm(warning)) return;
    const button = $("accountingClosePeriodBtn");
    button.disabled = true;
    try {
      const response = await cloudFunctions.httpsCallable("accountingClosePeriod")({ ownerId:state.accountOwnerId || state.uid, periodId });
      const result = response.data || {};
      showToast(accountingText(`Month closed with ${result.entryCount || 0} balanced entries.`, `Mes cerrado con ${result.entryCount || 0} asientos balanceados.`));
      await refreshPeriodCloseStatus();
    } catch (error) {
      console.error(error);
      $("accountingPeriodCloseMessage").textContent = error?.message || accountingText("The month is not ready to close.", "El mes todavía no está listo para cerrar.");
      showToast(accountingText("The month was not closed. Review the requirement shown below.", "El mes no fue cerrado. Revisa el requisito indicado abajo."));
      button.disabled = false;
    }
  }

  window.renderAccounting = renderAccounting;
  $("accountingFrom")?.addEventListener("input", renderAccounting);
  $("accountingTo")?.addEventListener("input", renderAccounting);
  $("btnClearAccountingFilters")?.addEventListener("click", () => {
    $("accountingFrom").value = ""; $("accountingTo").value = ""; renderAccounting();
  });
  if ($("accountingCloseMonth") && !$("accountingCloseMonth").value) {
    const priorMonth = new Date(); priorMonth.setUTCDate(1); priorMonth.setUTCMonth(priorMonth.getUTCMonth() - 1);
    $("accountingCloseMonth").value = priorMonth.toISOString().slice(0, 7);
  }
  $("accountingCloseMonth")?.addEventListener("change", refreshPeriodCloseStatus);
  $("accountingClosePeriodBtn")?.addEventListener("click", closeAccountingPeriod);
  $("accountingDownloadClosePdfBtn")?.addEventListener("click", downloadAccountingClosePackage);
  $("accountingMigrationReadinessPdfBtn")?.addEventListener("click", exportAccountingMigrationReadinessPdf);
  renderOpeningBalanceLines();
  $("importOpeningBalanceBtn")?.addEventListener("click", importOpeningBalances);
  $("openingBalanceCsvFile")?.addEventListener("change", event => previewOpeningBalanceCsv(event.target.files?.[0]));
  $("openingBalanceDate")?.addEventListener("change", () => {
    if (!openingBalanceCsvPreview) return;
    const result = OpeningBalanceCsv.importTrialBalanceCsv(openingBalanceCsvPreview.text, openingBalanceCsvPreview.mappings);
    renderOpeningBalanceComparison(result);
  });
  $("openingBalanceCsvIssuesBody")?.addEventListener("change", event => {
    const select = event.target.closest(".opening-csv-mapping");
    if (!select || !openingBalanceCsvPreview) return;
    const row = Number(select.dataset.csvRow);
    const sourceItem = openingBalanceCsvPreview.sourceItems.find(item => item.row === row);
    const remembered = loadOpeningBalanceMappings();
    const rememberedKey = sourceItem ? OpeningBalanceCsv.mappingKeyFor(sourceItem.accountName) : "";
    if (select.value) {
      openingBalanceCsvPreview.mappings[row] = select.value;
      if (rememberedKey) remembered[rememberedKey] = select.value;
    } else {
      delete openingBalanceCsvPreview.mappings[row];
      if (rememberedKey) delete remembered[rememberedKey];
    }
    saveOpeningBalanceMappings(remembered);
    const result = OpeningBalanceCsv.importTrialBalanceCsv(openingBalanceCsvPreview.text, openingBalanceCsvPreview.mappings);
    applyOpeningBalanceCsv(result, openingBalanceCsvPreview.fileName);
  });
  window.refreshPeriodCloseStatus = refreshPeriodCloseStatus;
  window.addEventListener("crm-language-changed", renderAccounting);
})();
