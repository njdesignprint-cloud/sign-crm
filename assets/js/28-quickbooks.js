    function quickBooksText(en, es) { return state.language === "es" ? es : en; }
    function renderQuickBooksLanguage() {
      if (!$("quickBooksSettingsTitle")) return;
      $("quickBooksSettingsTitle").textContent = "QuickBooks";
      $("quickBooksSettingsNote").textContent = quickBooksText("Connect a sandbox company first. Accounting records are not created or changed during verification.", "Conecta primero una compañía de prueba. No se crean ni modifican datos contables durante la verificación.");
      $("connectQuickBooksBtn").textContent = quickBooksText("Connect sandbox company", "Conectar compañía de prueba");
      $("refreshQuickBooksStatusBtn").textContent = quickBooksText("Refresh status", "Actualizar estado");
    }
    async function refreshQuickBooksStatus() {
      if (!firebase.auth().currentUser || !$("quickBooksStatusPill")) return;
      renderQuickBooksLanguage();
      const pill = $("quickBooksStatusPill"), detail = $("quickBooksConnectionDetail");
      pill.textContent = quickBooksText("Checking...", "Comprobando...");
      try {
        const result = await firebase.app().functions("us-central1").httpsCallable("quickBooksStatus")({});
        const data = result.data || {};
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
        const result = await firebase.app().functions("us-central1").httpsCallable("quickBooksConnect")({});
        const url = result.data?.url;
        if (!url) throw new Error("QuickBooks authorization URL missing.");
        window.open(url, "_blank", "noopener,noreferrer");
        showToast(quickBooksText("Authorize the sandbox company in the new tab, then refresh the status.", "Autoriza la compañía de prueba en la nueva pestaña y después actualiza el estado."));
      } catch (error) {
        console.error("QuickBooks connection:", error);
        showToast(quickBooksText("QuickBooks connection could not be started.", "No se pudo iniciar la conexión con QuickBooks."));
      } finally { button.disabled = false; }
    }
    $("connectQuickBooksBtn")?.addEventListener("click", connectQuickBooks);
    $("refreshQuickBooksStatusBtn")?.addEventListener("click", refreshQuickBooksStatus);
    window.addEventListener("crm-language-changed", () => { renderQuickBooksLanguage(); refreshQuickBooksStatus(); });
    firebase.auth().onAuthStateChanged(user => { renderQuickBooksLanguage(); if (user) refreshQuickBooksStatus(); });
