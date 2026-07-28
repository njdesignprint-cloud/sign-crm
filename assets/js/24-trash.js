    const TRASH_TYPE_LABELS = { clients:"Client", jobs:"Job", expenses:"Expense", recurring:"Recurring expense", inventory:"Inventory item", providers:"Supplier", purchaseOrders:"Purchase order", salespeople:"Salesperson" };
    function refForTrashType(type = "") {
      return { clients:clientsRef, jobs:jobsRef, expenses:expensesRef, recurring:recurringRef, inventory:inventoryRef, providers:providersRef, purchaseOrders:purchaseOrdersRef, salespeople:salespeopleRef }[type]?.() || null;
    }
    function assertTrashDependencies(type, id) {
      if (type === "clients" && state.jobs.some(job => job.clientId === id)) throw new Error("This client has jobs. Archive or reassign those jobs first.");
      if (type === "jobs" && (state.expenses.some(item => item.jobId === id) || state.commissionSettlements.some(item => (item.lineItems || []).some(line => line.jobId === id)))) throw new Error("This job has linked expenses or commission settlements and cannot be archived yet.");
      if (type === "inventory" && (state.inventoryMovements.some(item => item.itemId === id) || state.jobs.some(job => (job.materials || []).some(item => item.inventoryId === id)))) throw new Error("This inventory item has linked movements or jobs.");
      if (type === "providers" && state.purchaseOrders.some(item => item.providerId === id)) throw new Error("This supplier has purchase orders. Archive those orders first.");
      if (type === "salespeople" && (state.clients.some(item => item.salespersonId === id) || state.jobs.some(item => item.commission?.salespersonId === id) || state.commissionSettlements.some(item => item.salespersonId === id))) throw new Error("This salesperson has business history. Set them inactive instead.");
    }
    async function moveRecordToTrash(type, id, label = "record") {
      assertTrashDependencies(type, id);
      const collection = refForTrashType(type); if (!collection) throw new Error("This record type cannot be archived.");
      const sourceRef = collection.doc(id); const snapshot = await sourceRef.get(); if (!snapshot.exists) throw new Error("The record no longer exists.");
      const trashId = `${type}__${id}`; const batch = db.batch();
      batch.set(trashRef().doc(trashId), { type, originalId:id, label:cleanText(label) || TRASH_TYPE_LABELS[type] || type, payload:snapshot.data(), archivedAt:firebase.firestore.FieldValue.serverTimestamp(), archivedBy:state.userEmail || "", workspaceOwnerId:state.accountOwnerId || state.uid });
      batch.delete(sourceRef); await batch.commit();
    }
    async function restoreTrashItem(id) {
      if (!isAdmin()) return showToast("Only owners and administrators can restore records.");
      const item = state.trashItems.find(row => row.id === id); if (!item) return;
      const collection = refForTrashType(item.type); if (!collection) return showToast("This record type cannot be restored.");
      const target = collection.doc(item.originalId); const existing = await target.get(); if (existing.exists) return showToast("A record with the original ID already exists. Nothing was overwritten.");
      if (!confirm(`Restore ${item.label || "this record"}?`)) return;
      try { const batch=db.batch(); batch.set(target,{...(item.payload||{}),restoredAt:firebase.firestore.FieldValue.serverTimestamp(),restoredBy:state.userEmail||""}); batch.delete(trashRef().doc(id)); await batch.commit(); showToast("Record restored."); }
      catch(error){console.error(error);showToast("The record could not be restored.");}
    }
    function renderTrash() {
      const body=$("trashBody"); if(!body)return; const filter=$("trashTypeFilter")?.value||""; const rows=state.trashItems.filter(item=>!filter||item.type===filter);
      body.innerHTML=rows.map(item=>`<tr><td>${safe(formatDateTime(item.archivedAt))}</td><td>${safe(TRASH_TYPE_LABELS[item.type]||item.type)}</td><td><strong>${safe(item.label||"Record")}</strong></td><td>${safe(item.archivedBy||"-")}</td><td><small>${safe(item.originalId||"-")}</small></td><td><button class="btn btn-info btn-small" data-restore-trash="${safe(item.id)}">Restore</button></td></tr>`).join("");
      $("trashTotalCount").textContent=String(state.trashItems.length); $("trashEmpty").classList.toggle("hidden",rows.length>0);
    }
    $("trashTypeFilter")?.addEventListener("change",renderTrash);
    document.addEventListener("click",event=>{const button=event.target.closest("[data-restore-trash]");if(button)restoreTrashItem(button.dataset.restoreTrash);});
