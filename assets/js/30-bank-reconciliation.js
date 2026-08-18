(function () {
  let importedStatement = null;
  let permanentAccounts = [];
  let accountsOwnerId = "";
  let accountsLoading = false;
  let savedImport = null;

  const isAccountingEnvironment = () => (APP_ENVIRONMENT === "development" && firebaseConfig.projectId === "signshophq-dev") || (APP_ENVIRONMENT === "production" && firebaseConfig.projectId === "sign-crm-a7bda");
  const canWriteAccounting = () => isAccountingEnvironment() && !!state.uid && isAdmin();
  const operationKey = prefix => `${prefix}-${Date.now()}-${crypto.randomUUID?.() || Math.random().toString(36).slice(2)}`;
  function bankText(en, es) { return state.language === "es" ? es : en; }
  function statusLabel(status) {
    return { matched:bankText("Matched", "Coincide"), ambiguous:bankText("Review", "Revisar"), unmatched:bankText("Unmatched", "Sin coincidencia") }[status] || status;
  }
  function statusClass(status) { return status === "matched" ? "state-active" : status === "ambiguous" ? "st-diseno" : "st-cancelado"; }
  function callable(name) { return cloudFunctions.httpsCallable(name); }

  async function loadPermanentAccounts(force = false) {
    const ownerId = state.accountOwnerId || state.uid || "";
    if (!canWriteAccounting() || !ownerId || accountsLoading || (!force && accountsOwnerId === ownerId)) return;
    accountsLoading = true;
    try {
      const snapshot = await userRef().collection("financialAccounts").where("status", "==", "active").get();
      permanentAccounts = snapshot.docs.map(doc => ({ id:doc.id, ...doc.data() }));
      accountsOwnerId = ownerId;
    } catch (error) {
      console.error(error);
      permanentAccounts = [];
    } finally {
      accountsLoading = false;
      renderBankAccounts();
    }
  }

  function activeAccounts() {
    return canWriteAccounting() ? permanentAccounts : BankReconciliationCore.DEFAULT_ACCOUNTS;
  }

  function renderBankAccounts() {
    if (!window.BankReconciliationCore || !$("bankAccountsBody")) return;
    const accounts = activeAccounts();
    $("developmentAccountControls")?.classList.toggle("hidden", !canWriteAccounting());
    $("saveBankStatement")?.classList.toggle("hidden", !canWriteAccounting());
    $("developmentReconciliationControls")?.classList.toggle("hidden", !canWriteAccounting());
    if ($("bankAccountsModeNote")) $("bankAccountsModeNote").textContent = canWriteAccounting()
      ? bankText("Permanent financial accounts for this business.", "Cuentas financieras permanentes de este negocio.")
      : bankText("Read-only preview.", "Vista previa de solo lectura.");
    $("bankAccountsBody").innerHTML = accounts.map(account => `<tr><td><strong>${safe(account.name)}</strong>${account.lastFour ? ` ···· ${safe(account.lastFour)}` : ""}</td><td>${safe(account.type)}</td><td>${safe(account.ledgerAccountCode || account.institution || "-")}</td><td><span class="pill state-active">${canWriteAccounting() ? bankText("Active", "Activa") : bankText("Preview", "Vista previa")}</span></td></tr>`).join("");
    if (!accounts.length) $("bankAccountsBody").innerHTML = `<tr><td colspan="4">${bankText("Create the first financial account.", "Crea la primera cuenta financiera.")}</td></tr>`;
    if ($("bankStatementAccount")) {
      const selected = $("bankStatementAccount").value;
      $("bankStatementAccount").innerHTML = accounts.map(account => `<option value="${safe(account.id)}">${safe(account.name)}</option>`).join("");
      if (accounts.some(account => account.id === selected)) $("bankStatementAccount").value = selected;
    }
  }

  function currentLedgerEntries() {
    return AccountingCore.buildProvisionalLedger({ jobs:state.jobs, salesDocuments:state.salesDocuments, expenses:state.expenses, commissionSettlements:state.commissionSettlements });
  }

  function renderBankReconciliation() {
    renderBankAccounts();
    loadPermanentAccounts();
    if (!$("bankReconciliationBody")) return;
    const matches = importedStatement?.matches || [];
    const summary = BankReconciliationCore.summarize(matches);
    $("bankImportedCount").textContent = String(summary.imported);
    $("bankMatchedCount").textContent = String(summary.matched);
    $("bankUnmatchedCount").textContent = String(summary.unmatched + summary.ambiguous);
    $("bankNetMovement").textContent = money(summary.netMovement);
    $("bankReconciliationBody").innerHTML = matches.map(item => `<tr><td>${safe(item.date)}</td><td>${safe(item.description)}</td><td class="${item.amount >= 0 ? "ok-text" : "danger-text"}">${money(item.amount)}</td><td><span class="pill ${statusClass(item.matchStatus)}">${safe(statusLabel(item.matchStatus))}</span></td><td>${safe(item.match?.description || "-")}</td></tr>`).join("");
    $("bankReconciliationEmpty").classList.toggle("hidden", matches.length > 0);
    $("saveBankStatement").disabled = !canWriteAccounting() || !matches.length || !!savedImport;
    $("closeBankReconciliation").disabled = !canWriteAccounting() || !savedImport?.transactionIds?.length;
    $("bankDuplicateNote").textContent = savedImport
      ? bankText(`Saved as ${savedImport.importId}.`, `Guardado como ${savedImport.importId}.`)
      : importedStatement
        ? bankText(`${importedStatement.duplicates} duplicate rows ignored. Review before importing.`, `${importedStatement.duplicates} filas duplicadas ignoradas. Revisa antes de importar.`)
        : bankText("The CSV remains only in this browser session until you explicitly import it in Development.", "El CSV permanece solamente en esta sesión hasta que lo importes explícitamente en Development.");
  }

  async function createFinancialAccount() {
    if (!canWriteAccounting()) return showToast(bankText("Available only to administrators.", "Disponible solo para administradores."));
    const button = $("createFinancialAccount"); button.disabled = true;
    try {
      const result = await callable("accountingCreateFinancialAccount")({
        ownerId:state.accountOwnerId || state.uid,
        account:{
          name:cleanText($("financialAccountName").value), type:$("financialAccountType").value, currency:"USD",
          institution:cleanText($("financialAccountInstitution").value), lastFour:cleanText($("financialAccountLastFour").value),
          openingBalance:Number($("financialAccountOpeningBalance").value || 0), openingBalanceDate:$("financialAccountOpeningDate").value
        },
        idempotencyKey:operationKey("account")
      });
      accountsOwnerId = "";
      await loadPermanentAccounts(true);
      showToast(result.data.reused ? bankText("Account already existed.", "La cuenta ya existía.") : bankText("Financial account created.", "Cuenta financiera creada."));
    } catch (error) { console.error(error); showToast(error?.message || bankText("Could not create the account.", "No se pudo crear la cuenta.")); }
    finally { button.disabled = false; }
  }

  async function previewBankStatement(file) {
    if (!file) return;
    try {
      const accountId = $("bankStatementAccount").value;
      if (!accountId) throw new Error(bankText("Create or select a financial account first.", "Primero crea o selecciona una cuenta financiera."));
      const result = BankReconciliationCore.importStatementCsv(await file.text(), accountId);
      importedStatement = { ...result, matches:BankReconciliationCore.matchTransactions(result.transactions, currentLedgerEntries()) };
      savedImport = null;
      const dates = result.transactions.map(item => item.date).sort();
      if (dates.length) { $("reconciliationStart").value = dates[0]; $("reconciliationEnd").value = dates[dates.length - 1]; }
      renderBankReconciliation();
      showToast(bankText("Statement analyzed locally. Review it before importing.", "Estado analizado localmente. Revísalo antes de importarlo."));
    } catch (error) { console.error(error); showToast(error?.message || bankText("Could not read the CSV.", "No se pudo leer el CSV.")); }
    finally { $("bankStatementFile").value = ""; }
  }

  async function saveBankStatement() {
    if (!canWriteAccounting() || !importedStatement?.transactions?.length) return;
    const button = $("saveBankStatement"); button.disabled = true;
    try {
      const response = await callable("accountingImportBankStatement")({
        ownerId:state.accountOwnerId || state.uid, accountId:$("bankStatementAccount").value,
        transactions:importedStatement.transactions.map(item => ({ date:item.date, description:item.description, amount:item.amount, externalId:"" })),
        idempotencyKey:operationKey("statement")
      });
      savedImport = response.data;
      renderBankReconciliation();
      showToast(bankText(`${savedImport.imported} transactions saved.`, `${savedImport.imported} movimientos guardados.`));
    } catch (error) { console.error(error); showToast(error?.message || bankText("The statement could not be imported.", "No se pudo importar el estado.")); }
    finally { button.disabled = false; }
  }

  async function closeReconciliation() {
    if (!canWriteAccounting() || !savedImport?.transactionIds?.length) return;
    const button = $("closeBankReconciliation"); button.disabled = true;
    try {
      const response = await callable("accountingCreateReconciliation")({
        ownerId:state.accountOwnerId || state.uid, accountId:$("bankStatementAccount").value, statementImportId:savedImport.importId,
        periodStart:$("reconciliationStart").value, periodEnd:$("reconciliationEnd").value,
        beginningBalance:Number($("reconciliationBeginning").value), endingBalance:Number($("reconciliationEnding").value),
        transactionIds:savedImport.transactionIds, idempotencyKey:operationKey("reconciliation")
      });
      showToast(bankText(`Reconciliation closed. Difference: ${money(response.data.difference)}.`, `Conciliación cerrada. Diferencia: ${money(response.data.difference)}.`));
      savedImport = null; importedStatement = null; renderBankReconciliation(); await loadPermanentAccounts(true);
    } catch (error) { console.error(error); showToast(error?.message || bankText("The reconciliation could not be closed.", "No se pudo cerrar la conciliación.")); }
    finally { button.disabled = false; }
  }

  $("createFinancialAccount")?.addEventListener("click", createFinancialAccount);
  $("bankStatementFile")?.addEventListener("change", event => previewBankStatement(event.target.files?.[0]));
  $("saveBankStatement")?.addEventListener("click", saveBankStatement);
  $("closeBankReconciliation")?.addEventListener("click", closeReconciliation);
  $("clearBankStatementPreview")?.addEventListener("click", () => { importedStatement = null; savedImport = null; renderBankReconciliation(); });
  window.renderBankReconciliation = renderBankReconciliation;
  window.addEventListener("crm-language-changed", renderBankReconciliation);
  renderBankReconciliation();
})();
