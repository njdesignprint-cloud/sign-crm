    auth.onAuthStateChanged(async user => {
      if (user) await handleSignedIn(user);
      else handleSignedOut();
    });

    document.querySelectorAll(".nav button").forEach(btn => btn.addEventListener("click", () => setView(btn.dataset.view)));
    document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => closeModal(btn.dataset.close)));

    $("btnLogin").addEventListener("click", login);
    $("btnRegister").addEventListener("click", register);
    $("btnReset").addEventListener("click", resetPassword);
    $("btnLogout").addEventListener("click", logout);

    $("btnExportJson").addEventListener("click", exportJson);
    $("btnExportPdf").addEventListener("click", exportCurrentModulePdf);

    $("btnImportJson").addEventListener("click", () => $("importJsonInput").click());
    $("importJsonInput").addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (file) await importBackupJson(file);
    });

    $("saveClientBtn").addEventListener("click", saveClient);
    $("saveJobBtn").addEventListener("click", saveJob);
    $("saveExpenseBtn").addEventListener("click", saveExpense);
    $("uploadDesignBtn").addEventListener("click", openDesignUploadWidget);
    $("uploadExpensePhotoBtn").addEventListener("click", openExpenseUploadWidget);
    $("galleryPrevBtn").addEventListener("click", galleryPrev);
    $("galleryNextBtn").addEventListener("click", galleryNext);
    $("savePaymentBtn").addEventListener("click", savePayment);
    $("saveRecurringBtn").addEventListener("click", saveRecurring);
    $("saveInventoryBtn").addEventListener("click", saveInventoryItem);
    $("saveMovementBtn").addEventListener("click", saveMovement);
    $("saveProviderBtn").addEventListener("click", saveProvider);
    $("savePurchaseOrderBtn").addEventListener("click", savePurchaseOrder);
    $("addPoLineBtn").addEventListener("click", () => {
      $("purchaseOrderItemsContainer").appendChild(createPurchaseOrderLineRow());
      recalcPurchaseOrderTotals();
    });
    $("loadPoFromJobBtn").addEventListener("click", loadPurchaseOrderItemsFromSelectedJob);
    $("openPoFromJobBtn").addEventListener("click", openPurchaseOrderFromCurrentJob);
    $("purchaseOrderProviderId").addEventListener("change", () => {
      loadPurchaseOrderItemsFromSelectedJob(true);
    });
    $("purchaseOrderJobId").addEventListener("change", () => {
      loadPurchaseOrderItemsFromSelectedJob(true);
    });
    $("saveInternalNoteBtn").addEventListener("click", saveInternalNote);
    $("applyInventoryNowBtn").addEventListener("click", async () => {
      if (!state.editingJobId) return showToast("Primero guarda el trabajo.");
      const savedJob = getJobById(state.editingJobId);
      if (savedJob && materialsSignature(savedJob.materials || []) !== materialsSignature(getCurrentFormMaterials())) {
        return showToast("Guarda primero los cambios del trabajo para aplicar el inventario correcto.");
      }
      try {
        const result = await applyInventoryDiscountForJob(state.editingJobId, "botón manual");
        if (result?.appliedCount) showToast(`Inventario descontado en ${result.appliedCount} material(es).`);
        else showToast("No había inventario pendiente por descontar.");
      } catch (error) {
        console.error(error);
        showToast(error?.message || "No se pudo aplicar el inventario.");
      }
    });
    $("openExpenseFromJobBtn").addEventListener("click", () => {
      if (!state.editingJobId) return showToast("Primero guarda el trabajo y luego agrega gastos ligados.");
      resetExpenseForm(state.editingJobId);
      openModal("expenseModal");
    });

    $("btnNewMain").addEventListener("click", () => {
      if (state.currentView === "clientes") {
        resetClientForm();
        openModal("clientModal");
      } else if (state.currentView === "trabajos" || state.currentView === "instalaciones") {
        if (!state.clients.length) return showToast("Primero crea un cliente.");
        resetJobForm();
        openModal("jobModal");
      } else if (state.currentView === "gastos") {
        resetExpenseForm();
        openModal("expenseModal");
      } else if (state.currentView === "inventario") {
        resetInventoryForm();
        openModal("inventoryModal");
      } else if (state.currentView === "proveedores") {
        resetProviderForm();
        openModal("providerModal");
      } else if (state.currentView === "compras") {
        resetPurchaseOrderForm();
        openModal("purchaseOrderModal");
      } else if (state.currentView === "usuarios") {
        if (!guardManageUsers()) return;
        resetTeamMemberForm();
        openModal("teamMemberModal");
      }
    });

    $("btnNewRecurring").addEventListener("click", () => {
      if (!guardWrite("crear gastos recurrentes", "gastos")) return;
      resetRecurringForm();
      openModal("recurringModal");
    });

    $("btnNewMovement").addEventListener("click", () => {
      if (!guardWrite("crear movimientos", "inventario")) return;
      if (!state.inventoryItems.length) return showToast("Primero crea un ítem de inventario.");
      resetMovementForm();
      openModal("movementModal");
    });

    $("btnNewProvider")?.addEventListener("click", () => {
      if (!guardWrite("crear proveedores", "proveedores")) return;
      resetProviderForm();
      openModal("providerModal");
    });

    $("btnNewPurchaseOrder")?.addEventListener("click", () => {
      if (!guardWrite("crear órdenes", "compras")) return;
      resetPurchaseOrderForm();
      openModal("purchaseOrderModal");
    });

    $("btnNewTeamMember")?.addEventListener("click", () => {
      if (!guardManageUsers()) return;
      resetTeamMemberForm();
      openModal("teamMemberModal");
    });

    $("saveTeamMemberBtn")?.addEventListener("click", saveTeamMember);
    $("teamMemberRole")?.addEventListener("change", applyRoleDefaultsToTeamMemberForm);

    $("addMaterialBtn").addEventListener("click", () => {
      $("materialsContainer").appendChild(createMaterialRow());
      renderJobPreview();
    });

    $("addQuoteItemBtn").addEventListener("click", () => {
      $("quoteItemsContainer").appendChild(createQuoteItemRow());
      renderJobPreview();
    });

    $("jobSale").addEventListener("input", renderJobPreview);
    $("jobPriceMode").addEventListener("change", renderJobPreview);
    $("jobLaborCost").addEventListener("input", renderJobPreview);
    $("jobExtraCost").addEventListener("input", renderJobPreview);
    $("jobDesiredMargin").addEventListener("input", renderJobPreview);
    $("applySuggestedSaleBtn").addEventListener("click", applySuggestedSale);
    $("jobEstimatorType").addEventListener("change", () => loadEstimatorDefaults(true));
    ["jobEstimatorWidth","jobEstimatorHeight","jobEstimatorQty","jobEstimatorWaste","jobEstimatorMaterialRate","jobEstimatorSaleRate","jobEstimatorLaborBase"].forEach(id => $(id).addEventListener("input", renderJobPreview));
    $("loadEstimatorDefaultsBtn").addEventListener("click", () => loadEstimatorDefaults(true));
    $("applyEstimatorBtn").addEventListener("click", applyEstimatorToJob);
    $("quoteDiscountType").addEventListener("change", renderJobPreview);
    $("quoteDiscountValue").addEventListener("input", renderJobPreview);
    $("quoteTaxPercent").addEventListener("input", renderJobPreview);

    $("openPaymentFromJobBtn").addEventListener("click", () => {
      if (!state.editingJobId) return showToast("Primero guarda el trabajo y luego agrega pagos.");
      resetPaymentForm(state.editingJobId);
      openModal("paymentModal");
    });

    $("btnTableView").addEventListener("click", () => setJobsViewMode("table"));
    $("btnKanbanView").addEventListener("click", () => setJobsViewMode("kanban"));

    $("clientSearch").addEventListener("input", renderClients);

    ["jobSearch","jobStatusFilter","jobPriorityFilter","jobTypeFilter","jobCreatedFrom","jobCreatedTo","jobDueFrom","jobDueTo"].forEach(id => {
      $(id).addEventListener("input", renderJobs);
      $(id).addEventListener("change", renderJobs);
    });

    ["expenseSearch","expenseFrom","expenseTo"].forEach(id => {
      $(id).addEventListener("input", renderExpenses);
      $(id).addEventListener("change", renderExpenses);
    });

    ["inventorySearch","inventoryCategoryFilter","inventoryStockFilter"].forEach(id => {
      $(id).addEventListener("input", renderInventory);
      $(id).addEventListener("change", renderInventory);
    });
    ["installationSearch","installationFrom","installationTo","installationAssignedFilter","installationStatusFilter"].forEach(id => {
      $(id).addEventListener("input", renderInstallationModule);
      $(id).addEventListener("change", renderInstallationModule);
    });
    ["reportFrom","reportTo","reportJobStatusFilter"].forEach(id => {
      $(id)?.addEventListener("input", renderReportsModule);
      $(id)?.addEventListener("change", renderReportsModule);
    });

    ["providerSearch"].forEach(id => {
      $(id)?.addEventListener("input", renderProviders);
      $(id)?.addEventListener("change", renderProviders);
    });

    ["userSearch"].forEach(id => {
      $(id)?.addEventListener("input", renderUsers);
      $(id)?.addEventListener("change", renderUsers);
    });

    ["purchaseOrderSearch","purchaseOrderStatusFilter","purchaseOrderSupplierFilter"].forEach(id => {
      $(id)?.addEventListener("input", renderPurchaseOrders);
      $(id)?.addEventListener("change", renderPurchaseOrders);
    });

    $("btnClearJobFilters").addEventListener("click", () => {
      ["jobSearch","jobStatusFilter","jobPriorityFilter","jobTypeFilter","jobCreatedFrom","jobCreatedTo","jobDueFrom","jobDueTo"].forEach(id => $(id).value = "");
      renderJobs();
    });

    $("btnClearExpenseFilters").addEventListener("click", () => {
      ["expenseSearch","expenseFrom","expenseTo"].forEach(id => $(id).value = "");
      renderExpenses();
    });

    $("btnClearInventoryFilters").addEventListener("click", () => {
      ["inventorySearch","inventoryCategoryFilter","inventoryStockFilter"].forEach(id => $(id).value = "");
      renderInventory();
    });

    $("btnClearPurchaseOrderFilters")?.addEventListener("click", () => {
      ["purchaseOrderSearch","purchaseOrderStatusFilter","purchaseOrderSupplierFilter"].forEach(id => { if ($(id)) $(id).value = ""; });
      renderPurchaseOrders();
    });

    $("btnPrevMonth").addEventListener("click", () => {
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() - 1, 1);
      renderDeliveryCalendar();
    });

    $("btnNextMonth").addEventListener("click", () => {
      state.calendarDate = new Date(state.calendarDate.getFullYear(), state.calendarDate.getMonth() + 1, 1);
      renderDeliveryCalendar();
    });
    $("btnPrevInstallMonth").addEventListener("click", () => {
      state.installationCalendarDate = new Date(state.installationCalendarDate.getFullYear(), state.installationCalendarDate.getMonth() - 1, 1);
      renderInstallationModule();
    });
    $("btnNextInstallMonth").addEventListener("click", () => {
      state.installationCalendarDate = new Date(state.installationCalendarDate.getFullYear(), state.installationCalendarDate.getMonth() + 1, 1);
      renderInstallationModule();
    });
    $("btnClearInstallationFilters").addEventListener("click", () => {
      ["installationSearch","installationFrom","installationTo","installationAssignedFilter","installationStatusFilter"].forEach(id => $(id).value = "");
      renderInstallationModule();
    });
    $("btnClearReportFilters")?.addEventListener("click", () => {
      ["reportFrom","reportTo","reportJobStatusFilter"].forEach(id => { if ($(id)) $(id).value = ""; });
      renderReportsModule();
    });

    $("authPassword").addEventListener("keydown", e => { if (e.key === "Enter") login(); });
    document.addEventListener("keydown", (e) => {
      if (!$("designGalleryModal").classList.contains("show")) return;
      if (e.key === "ArrowLeft") galleryPrev();
      if (e.key === "ArrowRight") galleryNext();
    });

    document.addEventListener("click", (event) => {
      const target = event.target;

      if (target.dataset.waClient) {
        openWhatsappForClient(target.dataset.waClient, target.dataset.waMode || "general", target.dataset.waJob || null);
      }

      if (target.dataset.filterClientJobs) {
        const client = getClientById(target.dataset.filterClientJobs);
        if (client) {
          setView("trabajos");
          $("jobSearch").value = clientLabel(client);
          renderJobs();
        }
      }

      if (target.dataset.editClient) editClient(target.dataset.editClient);
      if (target.dataset.clientPdf) exportClientFullPdf(target.dataset.clientPdf);
      if (target.dataset.deleteClient) removeItem("clients", target.dataset.deleteClient, "cliente");

      if (target.dataset.editJob) editJob(target.dataset.editJob);
      if (target.dataset.openJob) { setView("trabajos"); editJob(target.dataset.openJob); }
      if (target.dataset.deleteJob) removeItem("jobs", target.dataset.deleteJob, "trabajo");
      if (target.dataset.statusJob && target.dataset.next) updateJobStatus(target.dataset.statusJob, target.dataset.next);
      if (target.dataset.quoteJob) exportQuotePdf(target.dataset.quoteJob);
      if (target.dataset.buyPdf) exportPurchaseMaterialsPdf(target.dataset.buyPdf);
      if (target.dataset.payJob) { resetPaymentForm(target.dataset.payJob); openModal("paymentModal"); }

      if (target.dataset.editExpense) editExpense(target.dataset.editExpense);
      if (target.dataset.deleteExpense) removeItem("expenses", target.dataset.deleteExpense, "gasto");

      if (target.dataset.editRecurring) editRecurring(target.dataset.editRecurring);
      if (target.dataset.deleteRecurring) removeItem("recurring", target.dataset.deleteRecurring, "gasto recurrente");

      if (target.dataset.editInventory) editInventoryItem(target.dataset.editInventory);
      if (target.dataset.deleteInventory) removeItem("inventory", target.dataset.deleteInventory, "ítem de inventario");
      if (target.dataset.moveItem) {
        resetMovementForm(target.dataset.moveItem);
        openModal("movementModal");
      }

      if (target.dataset.editProvider) editProvider(target.dataset.editProvider);
      if (target.dataset.deleteProvider) removeItem("providers", target.dataset.deleteProvider, "proveedor");

      if (target.dataset.editPo) editPurchaseOrder(target.dataset.editPo);
      if (target.dataset.deletePo) removeItem("purchaseOrders", target.dataset.deletePo, "orden de compra");
      if (target.dataset.poPdf) exportSinglePurchaseOrderPdf(target.dataset.poPdf);
      if (target.dataset.receivePo) receivePurchaseOrderIntoInventory(target.dataset.receivePo);

      if (target.dataset.editTeamMember) editTeamMember(target.dataset.editTeamMember);
      if (target.dataset.toggleTeamMember) toggleTeamMemberActive(target.dataset.toggleTeamMember);
      if (target.dataset.deleteTeamMember) removeTeamMember(target.dataset.deleteTeamMember);
    });

    resetJobForm();
    resetExpenseForm();
    resetRecurringForm();
    resetInventoryForm();
    resetProviderForm();
    resetPurchaseOrderForm();
    resetTeamMemberForm();
    setJobsViewMode("table");
    renderDeliveryCalendar();
    renderInstallationModule();
    renderReportsModule();
    renderUsers();
