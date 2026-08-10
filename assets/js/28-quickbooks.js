    function quickBooksText(en, es) { return state.language === "es" ? es : en; }
    async function callQuickBooksFunction(name, data = {}) {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error("Authentication required.");
      const token = await user.getIdToken();
      const response = await fetch(`https://us-central1-sign-crm-a7bda.cloudfunctions.net/${name}`, {
        method:"POST",
        headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` },
        body:JSON.stringify({ data })
      });
      const payload = await response.json();
      if (!response.ok || payload.error) throw new Error(payload.error?.message || `QuickBooks request failed (${response.status}).`);
      return payload.result || {};
    }
    function renderQuickBooksLanguage() {
      if (!$("quickBooksSettingsTitle")) return;
      $("quickBooksSettingsTitle").textContent = "QuickBooks";
      $("quickBooksSettingsNote").textContent = quickBooksText("Connect a sandbox company first. Accounting records are not created or changed during verification.", "Conecta primero una compañía de prueba. No se crean ni modifican datos contables durante la verificación.");
      $("connectQuickBooksBtn").textContent = quickBooksText("Connect sandbox company", "Conectar compañía de prueba");
      $("refreshQuickBooksStatusBtn").textContent = quickBooksText("Refresh status", "Actualizar estado");
      $("inspectQuickBooksBtn").textContent = quickBooksText("Read sandbox data", "Consultar datos");
      $("runQuickBooksTestBtn").textContent = quickBooksText("Run full sandbox test", "Ejecutar prueba completa");
      $("previewQuickBooksSyncBtn").textContent = quickBooksText("Prepare synchronization", "Preparar sincronización");
      $("loadQuickBooksConfigurationBtn").textContent = quickBooksText("Load QuickBooks accounts", "Cargar cuentas de QuickBooks");
      $("saveQuickBooksConfigurationBtn").textContent = quickBooksText("Save mapping", "Guardar asignación");
      $("quickBooksServiceItemLabel").textContent = quickBooksText("Product/service for invoices", "Producto/servicio para facturas");
      $("quickBooksExpenseAccountLabel").textContent = quickBooksText("Account for expenses", "Cuenta para gastos");
      $("quickBooksConfigurationNote").textContent = quickBooksText("These selections control how invoices and expenses will be prepared. They do not modify QuickBooks.", "Estas selecciones controlan cómo se prepararán las facturas y los gastos. No modifican QuickBooks.");
      if ($("quickBooksSupportNote")) $("quickBooksSupportNote").textContent = quickBooksText("Support: nidesignprint@gmail.com · 346-213-5545", "Soporte: nidesignprint@gmail.com · 346-213-5545");
    }
    async function refreshQuickBooksStatus() {
      if (!firebase.auth().currentUser || !$("quickBooksStatusPill")) return;
      renderQuickBooksLanguage();
      const pill = $("quickBooksStatusPill"), detail = $("quickBooksConnectionDetail");
      pill.textContent = quickBooksText("Checking...", "Comprobando...");
      try {
        const data = await callQuickBooksFunction("quickBooksStatus");
        pill.className = `pill ${data.connected ? "st-aprobado" : "st-pendiente"}`;
        pill.textContent = data.connected ? quickBooksText("Connected", "Conectado") : quickBooksText("Not connected", "No conectado");
        detail.textContent = data.connected
          ? quickBooksText(`Sandbox company authorized · Company ID ${data.realmId || "-"}. No accounting records have been synchronized.`, `Compañía de prueba autorizada · ID de compañía ${data.realmId || "-"}. No se han sincronizado registros contables.`)
          : quickBooksText("The connection uses Intuit's official authorization and stores credentials only on the server.", "La conexión usa autorización oficial de Intuit y guarda las credenciales únicamente en el servidor.");
      } catch (error) {
        console.error("QuickBooks status:", error);
        pill.className = "pill st-cancelado";
        pill.textContent = quickBooksText("Could not verify", "No se pudo verificar");
      }
    }
    async function connectQuickBooks() {
      if (!firebase.auth().currentUser) return showToast(quickBooksText("Sign in first.", "Primero inicia sesión."));
      const button = $("connectQuickBooksBtn"); button.disabled = true;
      try {
        const result = await callQuickBooksFunction("quickBooksConnect");
        const url = result.url;
        if (!url) throw new Error("QuickBooks authorization URL missing.");
        window.open(url, "_blank", "noopener,noreferrer");
        showToast(quickBooksText("Authorize the sandbox company in the new tab, then refresh the status.", "Autoriza la compañía de prueba en la nueva pestaña y después actualiza el estado."));
      } catch (error) {
        console.error("QuickBooks connection:", error);
        showToast(quickBooksText("QuickBooks connection could not be started.", "No se pudo iniciar la conexión con QuickBooks."));
      } finally { button.disabled = false; }
    }
    function renderQuickBooksSummary(data) {
      const company = data.company || {}, counts = data.counts || {}, samples = data.samples || {};
      const sampleNames = type => (samples[type] || []).map(item => item.name).filter(Boolean).join(", ") || "-";
      const output = $("quickBooksSummaryOutput");
      output.classList.remove("hidden");
      output.innerHTML = `<strong>${safe(company.name || company.legalName || "QuickBooks")}</strong><br>${safe(company.address || "-")}<br><br>`+
        `${safe(quickBooksText("Customers", "Clientes"))}: <strong>${Number(counts.Customer || 0)}</strong> · ${safe(sampleNames("Customer"))}<br>`+
        `${safe(quickBooksText("Vendors", "Proveedores"))}: <strong>${Number(counts.Vendor || 0)}</strong> · ${safe(sampleNames("Vendor"))}<br>`+
        `${safe(quickBooksText("Estimates", "Estimados"))}: <strong>${Number(counts.Estimate || 0)}</strong> · ${safe(sampleNames("Estimate"))}<br>`+
        `${safe(quickBooksText("Invoices", "Facturas"))}: <strong>${Number(counts.Invoice || 0)}</strong> · ${safe(sampleNames("Invoice"))}<br>`+
        `${safe(quickBooksText("Payments", "Pagos"))}: <strong>${Number(counts.Payment || 0)}</strong><br>`+
        `${safe(quickBooksText("Purchases / expenses", "Compras / gastos"))}: <strong>${Number(counts.Purchase || 0)}</strong>`;
    }
    async function inspectQuickBooks() {
      const button = $("inspectQuickBooksBtn"); button.disabled = true; button.textContent = quickBooksText("Reading...", "Consultando...");
      try { renderQuickBooksSummary(await callQuickBooksFunction("quickBooksSummary")); }
      catch (error) { console.error("QuickBooks summary:", error); showToast(quickBooksText("QuickBooks data could not be read.", "No se pudieron consultar los datos de QuickBooks.")); }
      finally { button.disabled = false; button.textContent = quickBooksText("Read sandbox data", "Consultar datos"); }
    }
    async function runQuickBooksSandboxTest() {
      const button = $("runQuickBooksTestBtn"); button.disabled = true; button.textContent = quickBooksText("Running test...", "Ejecutando prueba...");
      try {
        const data = await callQuickBooksFunction("quickBooksRunSandboxTest");
        const output = $("quickBooksSummaryOutput"); output.classList.remove("hidden");
        output.innerHTML = `<strong>${safe(quickBooksText("Sandbox test completed", "Prueba de sandbox completada"))}</strong><br>`+
          `${safe(quickBooksText("Customer", "Cliente"))}: ${safe(data.customer?.name || "-")} · ID ${safe(data.customer?.id || "-")}<br>`+
          `${safe(quickBooksText("Estimate", "Estimado"))}: #${safe(data.estimate?.number || data.estimate?.id || "-")} · ${money(Number(data.estimate?.total || 0))}<br>`+
          `${safe(quickBooksText("Invoice", "Factura"))}: #${safe(data.invoice?.number || data.invoice?.id || "-")} · ${money(Number(data.invoice?.total || 0))} · ${safe(quickBooksText("Balance", "Saldo"))}: ${money(Number(data.invoice?.balance || 0))}<br>`+
          `${safe(quickBooksText("Payment", "Pago"))}: ${money(Number(data.payment?.total || 0))} · ID ${safe(data.payment?.id || "-")}<br>`+
          `${safe(data.reused ? quickBooksText("Existing test reused; no duplicates created.", "Se reutilizó la prueba existente; no se crearon duplicados.") : quickBooksText("New test records created in the sandbox only.", "Registros nuevos creados únicamente en el sandbox."))}`;
        showToast(quickBooksText("QuickBooks sandbox test completed.", "Prueba de QuickBooks completada."));
      } catch (error) { console.error("QuickBooks sandbox test:", error); showToast(quickBooksText("The sandbox test could not be completed.", "No se pudo completar la prueba de sandbox.")); }
      finally { button.disabled = false; button.textContent = quickBooksText("Run full sandbox test", "Ejecutar prueba completa"); }
    }
    async function previewQuickBooksSynchronization() {
      const button = $("previewQuickBooksSyncBtn");
      button.disabled = true;
      button.textContent = quickBooksText("Preparing...", "Preparando...");
      try {
        const data = await callQuickBooksFunction("quickBooksSyncPreview", { ownerId:state.accountOwnerId || state.uid });
        const entities = data.entities || {};
        const row = (key, en, es) => {
          const item = entities[key] || {};
          return `${safe(quickBooksText(en, es))}: <strong>${Number(item.ready || 0)}</strong> ${safe(quickBooksText("ready", "listos"))} · ${Number(item.linked || 0)} ${safe(quickBooksText("already linked", "ya vinculados"))} · ${Number(item.blocked || 0)} ${safe(quickBooksText("need configuration", "requieren configuración"))}`;
        };
        const configuration = data.configuration || {};
        const output = $("quickBooksSummaryOutput");
        output.classList.remove("hidden");
        output.innerHTML = `<strong>${safe(quickBooksText("Safe synchronization preview", "Vista previa segura de sincronización"))}</strong><br>`+
          `${safe(quickBooksText("No QuickBooks data was created or changed.", "No se creó ni modificó ningún dato en QuickBooks."))}<br><br>`+
          `${row("clients", "Customers", "Clientes")}<br>${row("estimates", "Estimates", "Estimados")}<br>${row("invoices", "Invoices", "Facturas")}<br>${row("payments", "Payments", "Pagos")}<br>${row("expenses", "Expenses", "Gastos")}<br><br>`+
          `${safe(quickBooksText("Product/service mapping", "Asignación de producto/servicio"))}: <strong>${safe(configuration.serviceItemConfigured ? quickBooksText("configured", "configurada") : quickBooksText("pending", "pendiente"))}</strong><br>`+
          `${safe(quickBooksText("Expense account mapping", "Asignación de cuenta de gastos"))}: <strong>${safe(configuration.expenseAccountConfigured ? quickBooksText("configured", "configurada") : quickBooksText("pending", "pendiente"))}</strong><br><br>`+
          `${safe(quickBooksText("Duplicate protection: records with a QuickBooks ID will not be created again.", "Protección contra duplicados: los registros con ID de QuickBooks no se crearán otra vez."))}`;
        showToast(quickBooksText("Synchronization preview is ready.", "La vista previa de sincronización está lista."));
      } catch (error) {
        console.error("QuickBooks synchronization preview:", error);
        showToast(quickBooksText("The synchronization preview could not be prepared.", "No se pudo preparar la vista previa de sincronización."));
      } finally {
        button.disabled = false;
        button.textContent = quickBooksText("Prepare synchronization", "Preparar sincronización");
      }
    }
    function fillQuickBooksSelect(id, rows, selected, placeholderEn, placeholderEs) {
      const select = $(id);
      if (!select) return;
      select.replaceChildren();
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = quickBooksText(placeholderEn, placeholderEs);
      select.appendChild(placeholder);
      (rows || []).forEach(row => {
        const option = document.createElement("option");
        option.value = String(row.id || "");
        option.textContent = `${row.name || row.id} · ${row.type || ""}`;
        select.appendChild(option);
      });
      select.value = selected || "";
    }
    async function loadQuickBooksConfiguration() {
      const button = $("loadQuickBooksConfigurationBtn");
      button.disabled = true;
      button.textContent = quickBooksText("Loading...", "Cargando...");
      try {
        const data = await callQuickBooksFunction("quickBooksConfigurationOptions", { ownerId:state.accountOwnerId || state.uid });
        fillQuickBooksSelect("quickBooksServiceItem", data.items, data.selected?.serviceItemId, "Choose a product or service", "Escoge un producto o servicio");
        fillQuickBooksSelect("quickBooksExpenseAccount", data.accounts, data.selected?.expenseAccountId, "Choose an expense account", "Escoge una cuenta de gastos");
        showToast(quickBooksText("QuickBooks options loaded.", "Opciones de QuickBooks cargadas."));
      } catch (error) {
        console.error("QuickBooks configuration:", error);
        showToast(quickBooksText("The QuickBooks accounts could not be loaded. Confirm the sandbox connection.", "No se pudieron cargar las cuentas. Confirma la conexión de prueba."));
      } finally {
        button.disabled = false;
        button.textContent = quickBooksText("Load QuickBooks accounts", "Cargar cuentas de QuickBooks");
      }
    }
    async function saveQuickBooksConfiguration() {
      const serviceItemId = $("quickBooksServiceItem").value;
      const expenseAccountId = $("quickBooksExpenseAccount").value;
      if (!serviceItemId || !expenseAccountId) return showToast(quickBooksText("Choose both QuickBooks mappings.", "Escoge las dos asignaciones de QuickBooks."));
      const button = $("saveQuickBooksConfigurationBtn");
      button.disabled = true;
      button.textContent = quickBooksText("Saving...", "Guardando...");
      try {
        await callQuickBooksFunction("quickBooksSaveConfiguration", { ownerId:state.accountOwnerId || state.uid, serviceItemId, expenseAccountId });
        showToast(quickBooksText("QuickBooks mapping saved.", "Asignación de QuickBooks guardada."));
        await previewQuickBooksSynchronization();
      } catch (error) {
        console.error("QuickBooks save configuration:", error);
        showToast(quickBooksText("The QuickBooks mapping could not be saved.", "No se pudo guardar la asignación de QuickBooks."));
      } finally {
        button.disabled = false;
        button.textContent = quickBooksText("Save mapping", "Guardar asignación");
      }
    }
    $("connectQuickBooksBtn")?.addEventListener("click", connectQuickBooks);
    $("refreshQuickBooksStatusBtn")?.addEventListener("click", refreshQuickBooksStatus);
    $("inspectQuickBooksBtn")?.addEventListener("click", inspectQuickBooks);
    $("runQuickBooksTestBtn")?.addEventListener("click", runQuickBooksSandboxTest);
    $("previewQuickBooksSyncBtn")?.addEventListener("click", previewQuickBooksSynchronization);
    $("loadQuickBooksConfigurationBtn")?.addEventListener("click", loadQuickBooksConfiguration);
    $("saveQuickBooksConfigurationBtn")?.addEventListener("click", saveQuickBooksConfiguration);
    window.addEventListener("crm-language-changed", () => { renderQuickBooksLanguage(); refreshQuickBooksStatus(); });
    firebase.auth().onAuthStateChanged(user => { renderQuickBooksLanguage(); if (user) refreshQuickBooksStatus(); });
