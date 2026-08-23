(function () {
  const developmentProject = "signshophq-dev";
  const productionProject = "sign-crm-a7bda";
  const region = "us-central1";
  const oauthTokenKey = "signshop-plaid-oauth-link-token";
  const oauthOwnerKey = "signshop-plaid-oauth-owner";
  const text = (en, es) => state.language === "es" ? es : en;
  const $ = id => document.getElementById(id);
  function available() { return (APP_ENVIRONMENT === "development" && firebaseConfig.projectId === developmentProject) || (APP_ENVIRONMENT === "production" && firebaseConfig.projectId === productionProject); }
  function isProduction() { return APP_ENVIRONMENT === "production" && firebaseConfig.projectId === productionProject; }
  function owner() { return state.accountOwnerId || state.uid || firebase.auth().currentUser?.uid || ""; }
  function itemStorageKey() { return `signshop-plaid-item:${owner()}`; }

  async function call(name, data = {}) {
    const user = firebase.auth().currentUser;
    if (!available()) throw new Error(text("Bank connection is not available in this environment.", "La conexión bancaria no está disponible en este entorno."));
    if (!user) throw new Error(text("Sign in first.", "Primero inicia sesión."));
    const token = await user.getIdToken();
    const project = isProduction() ? productionProject : developmentProject;
    const response = await fetch(`https://${region}-${project}.cloudfunctions.net/${name}`, { method:"POST", headers:{ "Content-Type":"application/json", Authorization:`Bearer ${token}` }, body:JSON.stringify({ data }) });
    const payload = await response.json();
    if (!response.ok || payload.error) throw new Error(payload.error?.message || text("Bank connection failed.", "La conexión bancaria falló."));
    return payload.result || {};
  }

  function currentItemId() {
    const items=Array.isArray(state.plaidItems)?state.plaidItems:[], stored=localStorage.getItem(itemStorageKey())||"";
    const selected=items.find(item=>(item.itemId||item.id)===stored);
    return selected?.itemId||selected?.id||items[0]?.itemId||items[0]?.id||stored;
  }
  function currentItem(){const id=currentItemId();return (state.plaidItems||[]).find(item=>(item.itemId||item.id)===id)||null;}
  function render() {
    if (!$("plaidConnectBtn")) return;
    const connected = Boolean(currentItemId());
    const selector=$("plaidItemSelect"),items=Array.isArray(state.plaidItems)?state.plaidItems:[];
    if(selector){selector.replaceChildren(...items.map(item=>{const option=document.createElement("option");option.value=item.itemId||item.id;option.textContent=item.institution||text("Connected bank","Banco conectado");return option;}));selector.value=currentItemId();selector.classList.toggle("hidden",items.length<2);}
    $("plaidConnectBtn").textContent = connected ? text("Connect another bank", "Conectar otro banco") : (isProduction() ? text("Connect bank account", "Conectar cuenta bancaria") : text("Connect bank account (Sandbox)", "Conectar cuenta bancaria (Sandbox)"));
    $("plaidStatus").textContent = connected ? (isProduction() ? text("Bank connected", "Banco conectado") : text("Connected in Sandbox", "Conectado en Sandbox")) : (available() ? (isProduction() ? text("Not connected", "No conectada") : text("Development Sandbox", "Sandbox de Development")) : text("Unavailable", "No disponible"));
    $("plaidHelp").textContent = isProduction() ? text("Connect your business bank securely through Plaid. SignShop HQ never receives your bank password.", "Conecta el banco de tu negocio de forma segura con Plaid. SignShop HQ nunca recibe tu contraseña bancaria.") : text("Test safely with Plaid Sandbox.", "Prueba de forma segura con Plaid Sandbox.");
    $("plaidSyncBtn").textContent = isProduction() ? text("Sync bank transactions", "Sincronizar movimientos bancarios") : text("Sync Sandbox transactions", "Sincronizar movimientos Sandbox");
    $("plaidSyncBtn").disabled = !available() || !connected;
    $("plaidUpdateBtn")?.classList.toggle("hidden",!connected || currentItem()?.status!=="attention_required");
    $("plaidDisconnectBtn")?.classList.toggle("hidden",!connected);
    if (state.plaidItems?.[0]?.syncRecommended) $("plaidSyncNote").textContent = text("Plaid reports new bank information. Synchronize to update the dashboard.", "Plaid informa que hay datos bancarios nuevos. Sincroniza para actualizar el panel.");
    renderDashboard();
  }

  function formatMoney(value) { return new Intl.NumberFormat(state.language === "es" ? "es-US" : "en-US", { style:"currency", currency:"USD" }).format(Number(value || 0)); }
  function renderDashboard() {
    const card=$("dashboardBankCard"); if(!card)return;
    const accounts=Array.isArray(state.plaidAccounts)?state.plaidAccounts:[], items=Array.isArray(state.plaidItems)?state.plaidItems:[];
    card.classList.toggle("hidden",!accounts.length); if(!accounts.length)return;
    const availableBalance=accounts.reduce((sum,account)=>sum+Number(account.available ?? account.current ?? 0),0);
    const current=accounts.reduce((sum,account)=>sum+Number(account.current||0),0);
    const pending=(Array.isArray(state.plaidTransactions)?state.plaidTransactions:[]).filter(transaction=>transaction.pending===true).length;
    const institution=items[0]?.institution || text("Business bank", "Banco del negocio");
    $("dashboardBankName").textContent=`${institution}${accounts.length===1&&accounts[0].mask?` ···· ${accounts[0].mask}`:""}`;
    $("dashboardBankBalance").textContent=formatMoney(availableBalance);
    $("dashboardBankUpdated").textContent=text(`Available · Current ${formatMoney(current)}`,`Disponible · Saldo actual ${formatMoney(current)}`);
    $("dashboardBankStatus").textContent=text("Connected","Conectada");
    $("dashboardBankReview").textContent=text(`${pending} pending transactions`,`${pending} movimientos pendientes`);
    $("dashboardBankSyncBtn").textContent=text("Refresh","Actualizar");
  }

  async function exchange(publicToken, metadata) {
    const exchanged = await call("plaidExchangePublicToken", { ownerId:owner(), publicToken, institution:metadata?.institution?.name || text("Bank", "Banco"), institutionId:metadata?.institution?.institution_id || "" });
    localStorage.setItem(itemStorageKey(), exchanged.itemId); localStorage.removeItem(oauthTokenKey); localStorage.removeItem(oauthOwnerKey);
    history.replaceState({}, document.title, window.location.pathname); render();
    showToast(text("Bank connected. Synchronize to import balances and transactions.", "Banco conectado. Sincroniza para importar saldos y movimientos."));
  }

  function openLink(linkToken, receivedRedirectUri) {
    const handler = window.Plaid.create({ token:linkToken, ...(receivedRedirectUri ? { receivedRedirectUri } : {}),
      onSuccess:async (publicToken, metadata) => { try { await exchange(publicToken, metadata); } catch (error) { console.error(error); showToast(error.message); } },
      onExit:error => { if (error?.display_message || error?.error_message) showToast(error.display_message || error.error_message); }
    });
    handler.open();
  }

  async function connect(updateMode=false) {
    const button=$("plaidConnectBtn"); if(!button)return; button.disabled=true;
    try {
      if(!window.Plaid) throw new Error(text("Plaid Link is still loading. Try again in a moment.", "Plaid Link todavía está cargando. Intenta de nuevo en un momento."));
      const result=await call("plaidCreateLinkToken",{ ownerId:owner(), language:state.language, ...(updateMode?{updateItemId:currentItemId()}:{}) });
      localStorage.setItem(oauthTokenKey,result.linkToken); localStorage.setItem(oauthOwnerKey,owner()); openLink(result.linkToken,"");
    } catch(error) { console.error(error); showToast(error.message); } finally { button.disabled=false; }
  }

  async function disconnect() {
    const itemId=currentItemId(); if(!itemId)return;
    if(!confirm(text("Disconnect this bank and remove its imported Plaid data from SignShop HQ? Permanent accounting records and closed reconciliations will remain unchanged.","¿Desconectar este banco y eliminar de SignShop HQ sus datos importados por Plaid? Los registros contables permanentes y conciliaciones cerradas no cambiarán.")))return;
    const button=$("plaidDisconnectBtn"); button.disabled=true;
    try { await call("plaidDisconnectItem",{ownerId:owner(),itemId}); localStorage.removeItem(itemStorageKey()); showToast(text("Bank disconnected.","Banco desconectado.")); }
    catch(error){console.error(error);showToast(error.message);button.disabled=false;}
  }

  async function resumeOAuth() {
    if(!new URLSearchParams(window.location.search).has("oauth_state_id"))return;
    const linkToken=localStorage.getItem(oauthTokenKey);
    if(!linkToken)return showToast(text("This bank connection session expired. Start again from Accounting.", "Esta sesión bancaria venció. Iníciala nuevamente desde Contabilidad."));
    if(!window.Plaid)return;
    const expectedOwner=localStorage.getItem(oauthOwnerKey), user=firebase.auth().currentUser;
    if(!user || (expectedOwner && expectedOwner!==user.uid))return;
    openLink(linkToken,window.location.href);
  }

  async function sync() {
    const itemId=currentItemId(); if(!itemId)return showToast(text("Connect a bank account first.", "Primero conecta una cuenta bancaria."));
    const settingsButton=$("plaidSyncBtn"), dashboardButton=$("dashboardBankSyncBtn"), feedButton=$("bankFeedSyncBtn");
    const buttons=[settingsButton,dashboardButton,feedButton].filter(Boolean), originalLabels=buttons.map(button=>button.textContent);
    buttons.forEach(button=>{button.disabled=true;button.textContent=text("Synchronizing…","Sincronizando…");});
    try {
      const result=await call("plaidSyncTransactions",{ ownerId:owner(), itemId });
      const summary=isProduction()?text(`${result.added||0} new, ${result.modified||0} updated and ${result.removed||0} removed bank transactions processed.`,`${result.added||0} movimientos nuevos, ${result.modified||0} actualizados y ${result.removed||0} eliminados procesados.`):text(`${result.added||0} new Sandbox transactions imported.`,`${result.added||0} movimientos Sandbox nuevos importados.`);
      $("plaidSyncNote").textContent=summary;
      showToast(summary);
    } catch(error) { console.error(error); showToast(error.message); } finally {
      buttons.forEach((button,index)=>{button.disabled=false;button.textContent=originalLabels[index];});
      render();
      if(typeof renderBankFeed==="function")renderBankFeed();
    }
  }

  $("plaidConnectBtn")?.addEventListener("click",()=>connect(false)); $("plaidUpdateBtn")?.addEventListener("click",()=>connect(true)); $("plaidDisconnectBtn")?.addEventListener("click",disconnect); $("plaidSyncBtn")?.addEventListener("click",sync); $("dashboardBankSyncBtn")?.addEventListener("click",sync);
  $("plaidItemSelect")?.addEventListener("change",event=>{localStorage.setItem(itemStorageKey(),event.target.value);render();});
  window.addEventListener("crm-language-changed",render);
  window.addEventListener("plaid-sdk-ready",()=>{ render(); resumeOAuth().catch(console.error); });
  firebase.auth().onAuthStateChanged(()=>{render();resumeOAuth().catch(console.error);});
  render(); window.renderPlaidSettings=render; window.renderPlaidDashboard=renderDashboard; window.syncPlaidTransactions=sync;
})();
