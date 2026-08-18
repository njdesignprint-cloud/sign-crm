(function(){
  const t=(en,es)=>state.language==="es"?es:en;
  const environmentNote=environment=>environment==="live"
    ? t("Production environment: real payments are enabled. Stripe securely collects banking and tax information; SignShop HQ does not store it.","Entorno de producción: los pagos son reales. Stripe recopila de forma segura la información bancaria y fiscal; SignShop HQ no la almacena.")
    : t("Test environment: no real money moves. Stripe collects and protects banking and tax information; SignShop HQ does not store it.","Entorno de prueba: no se mueve dinero real. Stripe recopila y protege la información bancaria y fiscal; SignShop HQ no la almacena.");
  async function status(){
    if(!state.uid||!$("stripeStatus")) return;
    const button=$("stripeRefreshBtn"); if(button) button.disabled=true;
    try{
      const result=(await cloudFunctions.httpsCallable("stripeConnectStatus")({ownerId:state.accountOwnerId||state.uid})).data||{};
      if($("stripeEnvironmentNote")) $("stripeEnvironmentNote").textContent=environmentNote(result.environment);
      $("stripeStatus").textContent=result.connected?(result.onlinePaymentsActive?t("Ready","Listo"):t("Onboarding pending","Registro pendiente")):t("Not connected","No conectado");
      $("stripeStatus").className=`pill ${result.onlinePaymentsActive?"st-aprobado":"st-pendiente"}`;
      $("stripeStatusNote").textContent=result.connected
        ? (result.onlinePaymentsActive?(result.mode==="platform"?t("NJ Design & Print uses the verified platform Stripe account for invoice payments.","NJ Design & Print usa la cuenta principal verificada de Stripe para cobrar facturas."):t(`Cards and bank payments are enabled in Stripe ${result.environment==="live"?"production":"test"} mode.`, `Tarjetas y pagos bancarios están habilitados en el modo de ${result.environment==="live"?"producción":"prueba"} de Stripe.`)):t(`${result.requirementsDue||0} Stripe requirements remain for card and bank payments. Continue onboarding.`, `Quedan ${result.requirementsDue||0} requisitos de Stripe para pagos con tarjeta y banco. Continúa el registro.`))
        : t("Connect Stripe to enable secure invoice payments.","Conecta Stripe para habilitar pagos seguros en las facturas.");
      $("stripeConnectBtn").textContent=result.mode==="platform"?t("Verified Stripe account","Cuenta Stripe verificada"):(result.connected?t("Continue Stripe onboarding","Continuar registro de Stripe"):t("Connect Stripe","Conectar Stripe"));
      $("stripeConnectBtn").disabled=result.mode==="platform";
    }catch(error){ console.error(error); $("stripeStatusNote").textContent=t("Stripe configuration is not available yet.","La configuración de Stripe todavía no está disponible."); }
    finally{if(button)button.disabled=false;}
  }
  async function connect(){
    if(!isAdmin()) return showToast(t("Only owners and administrators can connect Stripe.","Solo propietarios y administradores pueden conectar Stripe."));
    const button=$("stripeConnectBtn"); button.disabled=true;
    try{ const result=(await cloudFunctions.httpsCallable("stripeConnectOnboarding")({ownerId:state.accountOwnerId||state.uid})).data||{}; if(!result.url) throw new Error("Missing Stripe URL"); window.location.href=result.url; }
    catch(error){console.error(error);showToast(error?.message||t("Stripe onboarding could not start.","No se pudo iniciar el registro de Stripe."));button.disabled=false;}
  }
  $("stripeConnectBtn")?.addEventListener("click",connect); $("stripeRefreshBtn")?.addEventListener("click",status);
  firebase.auth().onAuthStateChanged(user=>{if(user)setTimeout(status,600);});
  window.renderStripeStatus=status;
})();
