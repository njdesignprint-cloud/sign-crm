(function () {
  const supported = new Set(["invoice", "job_payment", "expense", "commission", "vendor_bill", "vendor_payment", "inventory_movement"]);

  window.postAccountingSource = async function postAccountingSource(sourceType, sourceId, sourceEventId = "") {
    if (!((APP_ENVIRONMENT === "development" && firebaseConfig.projectId === "signshophq-dev") || (APP_ENVIRONMENT === "production" && firebaseConfig.projectId === "sign-crm-a7bda"))) return { skipped:true };
    if (!state.uid || !supported.has(sourceType) || !sourceId) return { skipped:true };
    try {
      const response = await cloudFunctions.httpsCallable("accountingPostSourceDocument")({
        ownerId:state.accountOwnerId || state.uid,
        sourceType,
        sourceId,
        sourceEventId
      });
      return response.data || {};
    } catch (error) {
      console.error("Accounting posting was deferred; the business record remains saved.", { sourceType, sourceId, sourceEventId, error });
      return { deferred:true, error };
    }
  };
})();
