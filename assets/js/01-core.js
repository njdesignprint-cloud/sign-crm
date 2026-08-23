    const runtimeConfig = window.SIGNSHOPHQ_RUNTIME_CONFIG;
    if (!runtimeConfig?.firebase?.projectId) throw new Error("Missing SignShop HQ runtime configuration.");
    const firebaseConfig = runtimeConfig.firebase;
    const APP_ENVIRONMENT = runtimeConfig.environment || "production";
    const EXPECTED_PROJECTS = { production:"sign-crm-a7bda", development:"signshophq-dev" };
    if (EXPECTED_PROJECTS[APP_ENVIRONMENT] !== firebaseConfig.projectId) throw new Error("Firebase project does not match the selected application environment.");

    const COMPANY = {
      name: "SignShop HQ",
      phone: "346-213-5545",
      website: "www.signshophq.com"
    };

    const CLOUDINARY_CONFIG = {
      cloudName: "dcsavsm4e",
      uploadPreset: "njdesignprintcrm",
      folder: "njdesignprint/disenos"
    };

    firebase.initializeApp(firebaseConfig);
    window.initializeSignShopAppCheck?.();
    const auth = firebase.auth();
    const db = firebase.firestore();
    const cloudFunctions = firebase.app().functions("us-central1");

    if (APP_ENVIRONMENT !== "production") {
      document.addEventListener("DOMContentLoaded", () => {
        const badge = document.createElement("div");
        badge.className = "environment-badge";
        badge.textContent = `${APP_ENVIRONMENT.toUpperCase()} · TEST DATA ONLY`;
        document.body.appendChild(badge);
      });
    }

    const state = {
      uid: null,
      accountOwnerId: null,
      userEmail: "",
      currentUserRole: "owner",
      currentWorkspaceOwnerEmail: "",
      currentModulePermissions: {},
      isSuperAdmin: false,
      currentPlatformStatus: "active",
      currentWorkspaceStatus: "active",
      platformUsers: [],
      platformWorkspaces: [],
      currentView: "dashboard",
      clients: [],
      prospects: [],
      salespeople: [],
      commissionSettlements: [],
      companySettings: {},
      trashItems: [],
      jobs: [],
      salesDocuments: [],
      plaidAccounts: [],
      plaidItems: [],
      plaidTransactions: [],
      expenses: [],
      recurringExpenses: [],
      inventoryItems: [],
      inventoryMovements: [],
      providers: [],
      purchaseOrders: [],
      journalEntries: [],
      accountingPostingStates: [],
      teamMembers: [],
      weeklySettlements: [],
      editingClientId: null,
      editingProspectId: null,
      editingSalespersonId: null,
      editingJobId: null,
      editingSalesDocumentId: null,
      editingExpenseId: null,
      editingRecurringId: null,
      editingInventoryId: null,
      editingProviderId: null,
      editingPurchaseOrderId: null,
      editingTeamMemberId: null,
      workingPaymentJobId: null,
      workingPaymentInvoiceId: null,
      editingPaymentId: null,
      workingMovementItemId: null,
      galleryIndex: 0,
      galleryJobId: null,
      pendingJobImages: [],
      pendingExpensePhotos: [],
      unsubscribers: [],
      calendarDate: new Date(),
      installationCalendarDate: new Date(),
      jobsViewMode: "table",
      jobsQuickFilter: "all",
      language: /^es\b/i.test(navigator.language || "") ? "es" : "en"
    };
    window.state = state;

    const $ = (id) => document.getElementById(id);
    const today = () => new Date().toISOString().slice(0, 10);
    const cleanText = (value) => String(value || "").trim();
    const normalizedEmail = (value) => cleanText(value).toLowerCase();
    const emailDocId = (value) => normalizedEmail(value).replace(/[^a-z0-9]/g, "_");
    const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const safe = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const SUPERADMIN_EMAILS = [normalizedEmail("njdesignprint@gmail.com")];

    const viewMeta = {
      dashboard: ["Dashboard", "Resumen general del negocio."],
      clientes: ["Clientes", "Base de datos de clientes y empresas."],
      prospectos: ["Prospectos", "Captación, visitas y seguimiento de nuevos negocios."],
      vendedores: ["Salespeople & commissions", "Manage client ownership, commission terms and agreements."],
      trabajos: ["Trabajos", "Vista tabla y Kanban para organizar producción."],
      documentos: ["Contabilidad · Estimados y facturas", "Crea, envía y controla los documentos de venta desde el centro contable."],
      produccion: ["Producción", "Tablero visual del flujo de trabajos, responsables y entregas."],
      gastos: ["Gastos", "Control de gastos normales y recurrentes."],
      inventario: ["Inventario", "Control profesional de materiales, stock y movimientos."],
      proveedores: ["Proveedores", "Base de proveedores y contactos de compra."],
      compras: ["Compras", "Órdenes de compra y recepción de materiales."],
      instalaciones: ["Calendario de instalación", "Agenda de instalaciones, responsables y rutas del equipo."],
      reportes: ["Reportes avanzados", "Resumen comercial, rentabilidad, cuentas por cobrar y compras."],
      contabilidad: ["Accounting · Beta", "Provisional double-entry ledger and trial balance."],
      banco: ["Centro bancario", "Revisa, empareja, divide y categoriza los movimientos de Plaid."],
      liquidaciones: ["Liquidación semanal", "Control profesional del pago al propietario y reservas del negocio."],
      usuarios: ["Usuarios", "Accesos, roles y permisos del equipo."],
      configuracion: ["Company settings", "Business identity, regional preferences and document branding."],
      papelera: ["Trash & recovery", "Restore archived business records without changing their original IDs."],
      auditoria: ["Audit log", "Review protected workspace activity and the user responsible for each change."],
      cuentascrm: ["Cuentas CRM", "Control global de registros, empresas y estado de acceso."]
    };

    const STATUS_FLOW = ["Cotización", "Aprobado", "Diseño", "Producción", "Instalación", "Entregado", "Pagado", "Cancelado"];
    const PLATFORM_ACCOUNT_STATUSES = ["pending", "active", "blocked"];
    const KANBAN_STATUSES = ["Cotización", "Aprobado", "Diseño", "Producción", "Instalación", "Entregado"];
    const ACTIVE_STATUSES = ["Aprobado", "Diseño", "Producción", "Instalación", "Entregado"];
    const INVENTORY_AUTO_APPLY_STATUSES = ["Producción"];

    const ESTIMATOR_TEMPLATES = {
      custom: { label: "Personalizado", mode: "custom", wastePercent: 0, materialRate: 0, saleRate: 0, laborBase: 0 },
      decals: { label: "Decals", mode: "sqft", wastePercent: 8, materialRate: 2.50, saleRate: 8.00, laborBase: 15 },
      printing: { label: "Printing", mode: "sqft", wastePercent: 10, materialRate: 2.50, saleRate: 6.50, laborBase: 20 },
      window_perf: { label: "Window Perf", mode: "sqft", wastePercent: 10, materialRate: 3.80, saleRate: 9.50, laborBase: 25 },
      commercial_tint: { label: "Commercial Tint", mode: "sqft", wastePercent: 8, materialRate: 3.50, saleRate: 9.00, laborBase: 35 },
      banner: { label: "Banner", mode: "sqft", wastePercent: 10, materialRate: 3.80, saleRate: 10.00, laborBase: 20 },
      wrap: { label: "Wrap de Autos", mode: "sqft", wastePercent: 12, materialRate: 7.00, saleRate: 18.00, laborBase: 80 },
      ada: { label: "ADA Signs", mode: "unit", wastePercent: 0, materialRate: 12.00, saleRate: 35.00, laborBase: 12 },
      channel_letters: { label: "Channel Letters", mode: "unit", wastePercent: 0, materialRate: 45.00, saleRate: 120.00, laborBase: 25 },
      pylon_faces: { label: "Pylon Faces", mode: "sqft", wastePercent: 10, materialRate: 9.00, saleRate: 22.00, laborBase: 60 },
      light_box: { label: "Light Box Graphics", mode: "sqft", wastePercent: 10, materialRate: 4.50, saleRate: 12.00, laborBase: 25 }
    };

    const CHECK_KEYS = [
      { id: "ckDesignApproved", key: "designApproved" },
      { id: "ckMaterialOrdered", key: "materialOrdered" },
      { id: "ckPrintingDone", key: "printingDone" },
      { id: "ckCuttingDone", key: "cuttingDone" },
      { id: "ckLaminationDone", key: "laminationDone" },
      { id: "ckInstallationScheduled", key: "installationScheduled" },
      { id: "ckInstalled", key: "installed" },
      { id: "ckDelivered", key: "delivered" }
    ];

    function showToast(message) {
      const toast = $("toast");
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
    }
    async function withSaveButton(buttonId, pendingLabel, action) {
      const button = $(buttonId);
      if (!button || button.dataset.saveBusy === "true") return;
      const originalLabel = button.textContent;
      const wasDisabled = button.disabled;
      button.dataset.saveBusy = "true";
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      button.textContent = pendingLabel || "Guardando…";
      try {
        return await action();
      } finally {
        button.textContent = originalLabel;
        button.removeAttribute("aria-busy");
        delete button.dataset.saveBusy;
        button.disabled = wasDisabled;
        applyPermissionUi();
      }
    }
    function newLogEntry(type, text) {
      return {
        id: "log-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
        type,
        text,
        by: state.userEmail || "usuario",
        at: new Date().toISOString()
      };
    }
    function formatDateTime(value) {
      if (!value) return "-";

      let date = null;

      if (value instanceof Date) {
        date = value;
      } else if (typeof value?.toDate === "function") {
        date = value.toDate();
      } else if (typeof value === "object" && typeof value.seconds === "number") {
        date = new Date((value.seconds * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1000000));
      } else {
        date = new Date(value);
      }

      if (!date || Number.isNaN(date.getTime())) return "-";
      return date.toLocaleString("es-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
    function formatTimeLabel(value = "") {
      const clean = cleanText(value);
      if (!clean) return "-";
      const [hours = "00", minutes = "00"] = clean.split(":");
      const h = Number(hours);
      if (Number.isNaN(h)) return clean;
      const suffix = h >= 12 ? "PM" : "AM";
      const twelve = ((h + 11) % 12) + 1;
      return `${String(twelve).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
    }
    function formatTimeRange(start = "", end = "") {
      const left = cleanText(start);
      const right = cleanText(end);
      if (!left && !right) return "-";
      if (left && right) return `${formatTimeLabel(left)} - ${formatTimeLabel(right)}`;
      return formatTimeLabel(left || right);
    }
    function installationStatusClass(status = "") {
      return {
        "Pendiente": "pr-media",
        "Confirmada": "st-aprobado",
        "En ruta": "st-produccion",
        "Reprogramada": "st-diseno",
        "Completada": "st-entregado",
        "Cancelada": "st-cancelado"
      }[cleanText(status)] || "pr-media";
    }
    function getTeamMemberDisplayName(member = {}) {
      return cleanText(member.name) || cleanText(member.email) || "";
    }
    function getJobInstallation(job = {}) {
      const raw = job.installation || {};
      const client = getClientById(job.clientId);
      const fallbackAddress = [cleanText(client?.address), cleanText(client?.city)].filter(Boolean).join(", ");
      return {
        date: cleanText(raw.date),
        startTime: cleanText(raw.startTime),
        endTime: cleanText(raw.endTime),
        assignedTo: cleanText(raw.assignedTo),
        crew: cleanText(raw.crew),
        status: cleanText(raw.status),
        address: cleanText(raw.address) || fallbackAddress,
        window: cleanText(raw.window),
        notes: cleanText(raw.notes)
      };
    }
    function fillInstallationAssigneeList() {
      const list = $("installAssigneeList");
      if (!list) return;
      const names = Array.from(new Set([
        ...state.teamMembers.map(getTeamMemberDisplayName),
        ...state.jobs.map(job => getJobInstallation(job).assignedTo),
        state.userEmail
      ].map(cleanText).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
      list.innerHTML = names.map(name => `<option value="${safe(name)}"></option>`).join("");
    }
    function fillInstallationAssignedFilter(selected = "") {
      const select = $("installationAssignedFilter");
      if (!select) return;
      const current = selected || cleanText(select.value);
      const names = Array.from(new Set([
        ...state.teamMembers.map(getTeamMemberDisplayName),
        ...state.jobs.map(job => getJobInstallation(job).assignedTo)
      ].map(cleanText).filter(Boolean))).sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
      select.innerHTML = `<option value="">Todos los responsables</option>` + names.map(name => `<option value="${safe(name)}">${safe(name)}</option>`).join("");
      select.value = names.includes(current) ? current : "";
    }
    function getFilteredInstallationJobs() {
      const search = cleanText($("installationSearch")?.value).toLowerCase();
      const from = cleanText($("installationFrom")?.value);
      const to = cleanText($("installationTo")?.value);
      const assigned = cleanText($("installationAssignedFilter")?.value).toLowerCase();
      const status = cleanText($("installationStatusFilter")?.value).toLowerCase();

      return state.jobs
        .map(job => ({ job, installation: getJobInstallation(job), client: getClientById(job.clientId) }))
        .filter(item => item.installation.date)
        .filter(item => {
          if (from && item.installation.date < from) return false;
          if (to && item.installation.date > to) return false;
          if (assigned && item.installation.assignedTo.toLowerCase() !== assigned) return false;
          if (status && item.installation.status.toLowerCase() !== status) return false;
          if (!search) return true;
          const haystack = [
            clientLabel(item.client),
            item.job.title,
            item.installation.address,
            item.installation.assignedTo,
            item.installation.crew,
            item.installation.notes
          ].join(" ").toLowerCase();
          return haystack.includes(search);
        })
        .sort((a, b) => {
          const left = `${a.installation.date} ${a.installation.startTime || "00:00"}`;
          const right = `${b.installation.date} ${b.installation.startTime || "00:00"}`;
          return left.localeCompare(right);
        });
    }
    function getFilteredClients() {
      const q = cleanText($("clientSearch")?.value).toLowerCase();
      return state.clients.filter(client => {
        const bag = `${client.name || ""} ${client.company || ""} ${client.phone || ""} ${client.email || ""}`.toLowerCase();
        return bag.includes(q);
      });
    }
    function getFilteredExpenses() {
      const q = cleanText($("expenseSearch")?.value).toLowerCase();
      const from = cleanText($("expenseFrom")?.value);
      const to = cleanText($("expenseTo")?.value);

      return state.expenses.filter(expense => {
        const bag = `${expense.concept || ""} ${expense.category || ""} ${expense.notes || ""}`.toLowerCase();
        const okText = bag.includes(q);
        const okDate = (!from && !to) || isBetween(expense.date, from, to);
        return okText && okDate;
      });
    }
    function getClientJobs(clientId) {
      return state.jobs
        .filter(job => job.clientId === clientId)
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    }
    function updateModulePdfButton() {
      const labels = {
        dashboard: 'PDF dashboard',
        clientes: 'PDF clientes',
        prospectos: 'PDF prospectos',
        vendedores: 'PDF salespeople',
        trabajos: 'PDF materiales',
        produccion: 'PDF producción',
        gastos: 'PDF gastos',
        inventario: 'PDF inventario',
        proveedores: 'PDF proveedores',
        compras: 'PDF compras',
        instalaciones: 'PDF instalaciones',
        reportes: 'PDF reportes',
        liquidaciones: 'PDF liquidación',
        usuarios: 'PDF usuarios'
      };
      if ($('btnExportPdf')) $('btnExportPdf').textContent = labels[state.currentView] || 'PDF módulo';
    }
    function setView(view) {
      if (view !== "dashboard" && !canViewModule(view)) {
        showToast("No tienes acceso a ese módulo.");
        view = "dashboard";
      }
      state.currentView = view;
      document.querySelectorAll(".nav button").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
      document.querySelectorAll(".view").forEach(section => section.classList.add("hidden"));
      $("view-" + view).classList.remove("hidden");
      $("pageTitle").textContent = viewMeta[view][0];
      $("pageSubtitle").textContent = viewMeta[view][1];

      const btnNew = $("btnNewMain");
      btnNew.classList.remove("hidden");
      if (["dashboard", "produccion", "liquidaciones", "banco", "configuracion", "papelera"].includes(view)) btnNew.classList.add("hidden");
      if (view === "clientes") btnNew.textContent = "+ Nuevo cliente";
      if (view === "prospectos") btnNew.textContent = "+ Nuevo prospecto";
      if (view === "vendedores") btnNew.textContent = "+ New salesperson";
      if (view === "trabajos") btnNew.textContent = "+ Nuevo trabajo";
      if (view === "documentos") btnNew.textContent = state.language === "en" ? "+ New document" : "+ Nuevo documento";
      if (view === "gastos") btnNew.textContent = "+ Nuevo gasto";
      if (view === "inventario") btnNew.textContent = "+ Nuevo ítem";
      if (view === "proveedores") btnNew.textContent = "+ Nuevo proveedor";
      if (view === "compras") btnNew.textContent = "+ Nueva orden";
      if (view === "usuarios") btnNew.textContent = "+ Nuevo usuario";
      if (!canEditModule(view) || ["produccion", "liquidaciones", "configuracion", "cuentascrm"].includes(view)) btnNew.classList.add("hidden");
      updateModulePdfButton();
      applyPermissionUi();
      $("btnExportPdf")?.classList.toggle("hidden", ["auditoria", "prospectos", "documentos", "contabilidad"].includes(view));
      if (view === "auditoria" && typeof window.activateAuditLogView === "function") window.activateAuditLogView();
    }
    function setJobsViewMode(mode) {
      state.jobsViewMode = mode;
      $("jobsTableView").classList.toggle("hidden", mode !== "table");
      $("jobsKanbanView").classList.toggle("hidden", mode !== "kanban");
      $("btnTableView").classList.toggle("btn-info", mode === "table");
      $("btnTableView").classList.toggle("btn-secondary", mode !== "table");
      $("btnKanbanView").classList.toggle("btn-info", mode === "kanban");
      $("btnKanbanView").classList.toggle("btn-secondary", mode !== "kanban");
    }
    const protectedDraftModals = new Set(["clientModal", "prospectModal", "prospectFollowupModal", "jobModal", "paymentModal", "expenseModal", "salesDocumentModal"]);
    const modalDraftBaselines = new Map();
    function serializeModalDraft(id) {
      const modal = $(id);
      if (!modal) return "";
      return JSON.stringify(Array.from(modal.querySelectorAll("input,select,textarea")).filter(field => field.type !== "file").map(field => ({
        key: field.id || field.name || field.type,
        value: ["checkbox", "radio"].includes(field.type) ? !!field.checked : field.value
      })));
    }
    function beginModalDraft(id) {
      if (protectedDraftModals.has(id)) modalDraftBaselines.set(id, serializeModalDraft(id));
    }
    function markModalSaved(id) {
      if (protectedDraftModals.has(id)) modalDraftBaselines.set(id, serializeModalDraft(id));
    }
    function isModalDraftDirty(id) {
      return modalDraftBaselines.has(id) && modalDraftBaselines.get(id) !== serializeModalDraft(id);
    }
    function discardDraftMessage() {
      return document.documentElement.lang === "en"
        ? "You have unsaved changes. Discard them?"
        : "Tienes cambios sin guardar. ¿Quieres descartarlos?";
    }
    function confirmDiscardAllModalDrafts() {
      const dirtyIds = Array.from(modalDraftBaselines.keys()).filter(isModalDraftDirty);
      if (!dirtyIds.length) return true;
      if (!window.confirm(discardDraftMessage())) return false;
      dirtyIds.forEach(id => {
        modalDraftBaselines.delete(id);
        $(id)?.classList.remove("show");
      });
      return true;
    }
    function openModal(id) {
      $(id).classList.add("show");
      beginModalDraft(id);
    }
    function closeModal(id, force = false) {
      if (!force && isModalDraftDirty(id) && !window.confirm(discardDraftMessage())) return false;
      modalDraftBaselines.delete(id);
      $(id).classList.remove("show");
      return true;
    }
    function userRef() { return db.collection("users").doc(state.accountOwnerId || state.uid); }
    function ownUserRootRef() { return db.collection("users").doc(state.uid); }
    function platformUsersRef() { return db.collection("platformUsers"); }
    function platformUserRef(uid = state.uid) { return platformUsersRef().doc(uid); }
    async function persistUserLanguagePreference(language) {
      if (!state.uid || !["es", "en"].includes(language)) return;
      await platformUserRef(state.uid).set({
        language,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    }
    window.persistUserLanguagePreference = persistUserLanguagePreference;
    function platformWorkspacesRef() { return db.collection("platformWorkspaces"); }
    function platformWorkspaceRef(uid = state.accountOwnerId || state.uid) { return platformWorkspacesRef().doc(uid); }
    function teamAccessRefByEmail(email) { return db.collection("teamAccess").doc(normalizedEmail(email)); }
    function legacyTeamAccessRefByEmail(email) { return db.collection("teamAccess").doc(emailDocId(email)); }
    function workspaceMembersRef() { return userRef().collection("workspaceMembers"); }
    function clientsRef() { return userRef().collection("clients"); }
    function prospectsRef() { return userRef().collection("prospects"); }
    function salespeopleRef() { return userRef().collection("salespeople"); }
    function commissionSettlementsRef() { return userRef().collection("commissionSettlements"); }
    function companySettingsRef() { return userRef().collection("settings").doc("company"); }
    function trashRef() { return userRef().collection("trash"); }
    function jobsRef() { return userRef().collection("jobs"); }
    function salesDocumentsRef() { return userRef().collection("salesDocuments"); }
    function expensesRef() { return userRef().collection("expenses"); }
    function recurringRef() { return userRef().collection("recurringExpenses"); }
    function inventoryRef() { return userRef().collection("inventoryItems"); }
    function inventoryMovementsRef() { return userRef().collection("inventoryMovements"); }
    function providersRef() { return userRef().collection("providers"); }
    function purchaseOrdersRef() { return userRef().collection("purchaseOrders"); }
    function journalEntriesRef() { return userRef().collection("journalEntries"); }
    function accountingPostingStatesRef() { return userRef().collection("accountingPostingStates"); }
    function teamMembersRef() { return userRef().collection("teamMembers"); }
    function weeklySettlementsRef() { return userRef().collection("weeklySettlements"); }

    const DATA_PERMISSION_MODULES = ["clientes", "trabajos", "gastos", "inventario", "proveedores", "compras"];
    const ALL_PERMISSION_MODULES = [...DATA_PERMISSION_MODULES, "usuarios"];
    function moduleLabel(module = "") {
      return {
        clientes: "Clientes",
        trabajos: "Trabajos",
        gastos: "Gastos",
        inventario: "Inventario",
        proveedores: "Proveedores",
        compras: "Compras",
        usuarios: "Usuarios"
      }[module] || module;
    }
    function defaultModulePermissionsForRole(role = "employee") {
      if (role === "owner") {
        return {
          clientes: "delete",
          trabajos: "delete",
          gastos: "delete",
          inventario: "delete",
          proveedores: "delete",
          compras: "delete",
          usuarios: "manage",
          importBackup: true
        };
      }
      if (role === "admin") {
        return {
          clientes: "delete",
          trabajos: "delete",
          gastos: "delete",
          inventario: "delete",
          proveedores: "delete",
          compras: "delete",
          usuarios: "manage",
          importBackup: true
        };
      }
      if (role === "readonly") {
        return {
          clientes: "view",
          trabajos: "view",
          gastos: "view",
          inventario: "view",
          proveedores: "view",
          compras: "view",
          usuarios: "none",
          importBackup: false
        };
      }
      return {
        clientes: "edit",
        trabajos: "edit",
        gastos: "edit",
        inventario: "edit",
        proveedores: "view",
        compras: "edit",
        usuarios: "none",
        importBackup: false
      };
    }
    function normalizeDataModulePermission(value, fallback = "edit") {
      return ["none", "view", "edit", "delete"].includes(value) ? value : fallback;
    }
    function normalizeUsersModulePermission(value, fallback = "none") {
      return ["none", "view", "manage"].includes(value) ? value : fallback;
    }
    function normalizeModulePermissions(source = {}) {
      const role = cleanText(source.role) || "employee";
      const defaults = defaultModulePermissionsForRole(role);
      return {
        clientes: normalizeDataModulePermission(source.moduleClientes ?? source.permissions?.clientes, defaults.clientes),
        trabajos: normalizeDataModulePermission(source.moduleTrabajos ?? source.permissions?.trabajos, defaults.trabajos),
        gastos: normalizeDataModulePermission(source.moduleGastos ?? source.permissions?.gastos, defaults.gastos),
        inventario: normalizeDataModulePermission(source.moduleInventario ?? source.permissions?.inventario, defaults.inventario),
        proveedores: normalizeDataModulePermission(source.moduleProveedores ?? source.permissions?.proveedores, defaults.proveedores),
        compras: normalizeDataModulePermission(source.moduleCompras ?? source.permissions?.compras, defaults.compras),
        usuarios: normalizeUsersModulePermission(source.moduleUsuarios ?? source.permissions?.usuarios, defaults.usuarios),
        importBackup: typeof source.allowImportBackup === "boolean" ? source.allowImportBackup : defaults.importBackup
      };
    }
    function permissionLabel(level = "", module = "") {
      if (module === "usuarios") {
        return { none: "Sin acceso", view: "Solo ver", manage: "Administrar" }[level] || "Sin acceso";
      }
      return { none: "Sin acceso", view: "Solo ver", edit: "Editar", delete: "Editar y borrar" }[level] || "Sin acceso";
    }
    function resolvePermissionModule(module = "") {
      if (module === "prospectos") return "clientes";
      if (module === "documentos") return "trabajos";
      return ["produccion", "instalaciones"].includes(module) ? "trabajos" : module;
    }
    function getCurrentModulePermission(module = "") {
      const normalizedModule = resolvePermissionModule(module);
      const roleDefaults = defaultModulePermissionsForRole(state.currentUserRole || "employee");
      const current = normalizeModulePermissions({ role: state.currentUserRole, ...state.currentModulePermissions });
      return current[normalizedModule] ?? roleDefaults[normalizedModule] ?? "none";
    }
    function getModulePermissionSummary(source = {}) {
      const perms = normalizeModulePermissions(source);
      return ALL_PERMISSION_MODULES.map(module => `${moduleLabel(module)}: ${permissionLabel(perms[module], module)}`).join(" · ");
    }
    function isOwner() { return state.currentUserRole === "owner"; }
    function isSuperAdmin() { return !!state.isSuperAdmin; }
    function isAdmin() { return isOwner() || getCurrentModulePermission("usuarios") === "manage"; }
    function platformStatusLabel(status = "") {
      return { pending: "Pendiente", active: "Activa", blocked: "Bloqueada" }[cleanText(status)] || "Pendiente";
    }
    function platformStatusClass(status = "") {
      return { pending: "st-diseno", active: "st-aprobado", blocked: "st-cancelado" }[cleanText(status)] || "st-diseno";
    }
    function platformStatusPill(status = "") {
      return `<span class="pill ${platformStatusClass(status)}">${safe(platformStatusLabel(status))}</span>`;
    }
    function mergeAccessStatuses(accountStatus = "", workspaceStatus = "") {
      const account = cleanText(accountStatus || "");
      const workspace = cleanText(workspaceStatus || "");
      if (account === "blocked" || workspace === "blocked") return "blocked";
      if (account === "pending" || workspace === "pending") return "pending";
      return "active";
    }

    function canViewModule(module = state.currentView) {
      if (module === "dashboard") return true;
      if (module === "cuentascrm") return isSuperAdmin();
      if (module === "configuracion") return isAdmin();
      if (module === "papelera") return isAdmin();
      if (module === "auditoria") return isAdmin();
      if (module === "vendedores") return isAdmin();
      if (module === "liquidaciones") return isOwner();
      if (module === "banco") return isOwner();
      if (["reportes", "contabilidad"].includes(module)) return isAdmin();
      const level = getCurrentModulePermission(module);
      return module === "usuarios"
        ? ["view", "manage"].includes(level)
        : ["view", "edit", "delete"].includes(level);
    }
    function canEditModule(module = state.currentView) {
      if (module === "vendedores") return isAdmin();
      if (module === "configuracion") return isAdmin();
      if (module === "papelera") return isAdmin();
      if (module === "auditoria") return false;
      if (module === "liquidaciones") return isOwner();
      if (module === "banco") return isOwner();
      if (["dashboard", "reportes", "contabilidad", "configuracion", "cuentascrm"].includes(module)) return false;
      const level = getCurrentModulePermission(module);
      return module === "usuarios"
        ? level === "manage"
        : ["edit", "delete"].includes(level);
    }
    function canDeleteModule(module = state.currentView) {
      if (module === "vendedores") return isAdmin();
      if (["dashboard", "reportes", "cuentascrm"].includes(module)) return false;
      const level = getCurrentModulePermission(module);
      return module === "usuarios" ? level === "manage" : level === "delete";
    }
    function canWriteData(module = state.currentView) { return canEditModule(module); }
    function canDeleteData(module = state.currentView) { return canDeleteModule(module); }
    function canManageUsers() { return isOwner() || getCurrentModulePermission("usuarios") === "manage"; }
    function canImportBackup() { return isOwner() || !!normalizeModulePermissions({ role: state.currentUserRole, ...state.currentModulePermissions }).importBackup; }
    function roleLabel(role = "") {
      return {
        owner: "Propietario",
        admin: "Admin",
        employee: "Empleado",
        readonly: "Solo lectura"
      }[role] || "Empleado";
    }
    function roleClass(role = "") {
      return {
        owner: "role-owner",
        admin: "role-admin",
        employee: "role-employee",
        readonly: "role-readonly"
      }[role] || "role-employee";
    }
    function rolePill(role = "") {
      return `<span class="role-chip ${roleClass(role)}">${safe(roleLabel(role))}</span>`;
    }
    function activeStatePill(active = true) {
      return active ? '<span class="pill state-active">Activo</span>' : '<span class="pill state-disabled">Desactivado</span>';
    }
    function guardWrite(action = "hacer cambios", module = state.currentView) {
      if (canWriteData(module)) return true;
      showToast(`Tu usuario es solo lectura. No puede ${action}.`);
      return false;
    }
    function guardDelete(action = "eliminar", module = state.currentView) {
      if (canDeleteData(module)) return true;
      showToast(`Tu rol no tiene permiso para ${action}.`);
      return false;
    }
    function guardManageUsers() {
      if (canManageUsers()) return true;
      showToast("Tu rol no puede administrar usuarios.");
      return false;
    }
    function applyPermissionUi() {
      const roleEl = $("activeWorkspaceRole");
      if (roleEl) {
        const extra = state.isSuperAdmin ? " · Super Admin" : "";
        roleEl.textContent = `${state.language === "en" ? "Role" : "Rol"}: ${roleLabel(state.currentUserRole)}${extra}`;
      }
      const ownerEl = $("activeWorkspaceOwner");
      if (ownerEl) ownerEl.textContent = `${state.language === "en" ? "Workspace" : "Espacio"}: ${state.currentWorkspaceOwnerEmail || state.userEmail || "-"}`;
      const statusEl = $("activeWorkspaceStatus");
      if (statusEl) {
        const accountStatus = platformStatusPill(state.currentPlatformStatus || "active");
        const workspaceStatus = platformStatusPill(state.currentWorkspaceStatus || state.currentPlatformStatus || "active");
        const sameStatus = cleanText(state.currentWorkspaceStatus || state.currentPlatformStatus) === cleanText(state.currentPlatformStatus || "active");
        statusEl.innerHTML = sameStatus
          ? `${state.language === "en" ? "Account" : "Cuenta"}: ${accountStatus}`
          : `${state.language === "en" ? "Account" : "Cuenta"}: ${accountStatus} · ${state.language === "en" ? "Workspace" : "Espacio"}: ${workspaceStatus}`;
      }

      document.querySelectorAll('.nav button[data-view]').forEach(btn => {
        const view = btn.dataset.view;
        const accountingChild = btn.dataset.accountingChild === "true";
        btn.classList.toggle('hidden', accountingChild || (view !== 'dashboard' && !canViewModule(view)));
      });

      if (state.currentView !== "dashboard" && !canViewModule(state.currentView)) {
        state.currentView = "dashboard";
        document.querySelectorAll(".view").forEach(section => section.classList.add("hidden"));
        $("view-dashboard").classList.remove("hidden");
        $("pageTitle").textContent = viewMeta.dashboard[0];
        $("pageSubtitle").textContent = viewMeta.dashboard[1];
      }

      const newBtn = $("btnNewMain");
      if (newBtn) {
        const shouldHide = ["dashboard", "produccion", "liquidaciones", "banco", "configuracion", "papelera", "auditoria", "cuentascrm"].includes(state.currentView) || !canEditModule(state.currentView);
        newBtn.classList.toggle("hidden", shouldHide);
      }

      const buttonModuleMap = {
        saveClientBtn: 'clientes',
        saveProspectBtn: 'prospectos',
        saveProspectFollowupBtn: 'prospectos',
        saveSalespersonBtn: 'vendedores',
        saveCommissionSettlementBtn: 'vendedores',
        saveCompanySettingsBtn: 'configuracion',
        saveJobBtn: 'trabajos',
        saveExpenseBtn: 'gastos',
        saveRecurringBtn: 'gastos',
        saveInventoryBtn: 'inventario',
        saveMovementBtn: 'inventario',
        saveProviderBtn: 'proveedores',
        savePurchaseOrderBtn: 'compras',
        saveVendorPaymentBtn: 'compras',
        savePaymentBtn: 'trabajos',
        saveInternalNoteBtn: 'trabajos',
        addMaterialBtn: 'trabajos',
        addQuoteItemBtn: 'trabajos',
        applySuggestedSaleBtn: 'trabajos',
        applyEstimatorBtn: 'trabajos',
        loadEstimatorDefaultsBtn: 'trabajos',
        uploadDesignBtn: 'trabajos',
        uploadExpensePhotoBtn: 'gastos',
        openPaymentFromJobBtn: 'trabajos',
        openExpenseFromJobBtn: 'gastos',
        loadPoFromJobBtn: 'compras',
        addPoLineBtn: 'compras',
        btnNewRecurring: 'gastos',
        btnNewMovement: 'inventario',
        btnNewProvider: 'proveedores',
        btnNewPurchaseOrder: 'compras',
        applyInventoryNowBtn: 'inventario'
      };
      Object.entries(buttonModuleMap).forEach(([id, module]) => {
        const el = $(id);
        if (!el) return;
        el.disabled = el.dataset.saveBusy === "true" || !canEditModule(module);
      });

      const saveTeamBtn = $("saveTeamMemberBtn");
      if (saveTeamBtn) saveTeamBtn.disabled = !canManageUsers();

      const importBtn = $("btnImportJson");
      if (importBtn) importBtn.disabled = !canImportBackup();

      const newTeamBtn = $("btnNewTeamMember");
      if (newTeamBtn) newTeamBtn.classList.toggle("hidden", !canManageUsers());
    }
    async function resolveWorkspaceAccess(user) {
      state.uid = user.uid;
      state.userEmail = user.email || "";
      state.accountOwnerId = user.uid;
      state.currentUserRole = "owner";
      state.currentWorkspaceOwnerEmail = state.userEmail || "";
      state.currentModulePermissions = defaultModulePermissionsForRole("owner");
      state.isSuperAdmin = SUPERADMIN_EMAILS.includes(normalizedEmail(state.userEmail));
      state.currentPlatformStatus = state.isSuperAdmin ? "active" : "pending";
      state.currentWorkspaceStatus = state.currentPlatformStatus;

      let ownRootExists = false;
      try {
        const ownSnap = await ownUserRootRef().get();
        ownRootExists = ownSnap.exists;
      } catch (error) {
        console.error(error);
      }

      const ownPayload = {
        email: normalizedEmail(state.userEmail),
        ownerId: user.uid,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await ownUserRootRef().set(ownPayload, { merge: true });
      } catch (error) {
        console.error(error);
      }

      let invitedAccess = null;
      try {
        let accessSnap = await teamAccessRefByEmail(state.userEmail).get();
        if (!accessSnap.exists) accessSnap = await legacyTeamAccessRefByEmail(state.userEmail).get();
        if (accessSnap.exists) invitedAccess = accessSnap.data() || {};
      } catch (error) {
        console.error(error);
      }

      let platformAccount = null;
      try {
        const platformSnap = await platformUserRef(user.uid).get();
        if (platformSnap.exists) platformAccount = platformSnap.data() || {};
      } catch (error) {
        console.error(error);
      }

      let localLanguage = "";
      try { localLanguage = cleanText(localStorage.getItem("signshophq_lang_v2")); } catch (_) {}
      const accountLanguage = cleanText(platformAccount?.language);
      state.language = ["es", "en"].includes(accountLanguage)
        ? accountLanguage
        : (["es", "en"].includes(localLanguage) ? localLanguage : "en");
      try { localStorage.setItem("signshophq_lang_v2", state.language); } catch (_) {}

      if (invitedAccess && invitedAccess.active !== false && cleanText(invitedAccess.ownerId)) {
        state.accountOwnerId = cleanText(invitedAccess.ownerId);
        state.currentUserRole = state.accountOwnerId === state.uid ? "owner" : (cleanText(invitedAccess.role) || "employee");
        state.currentWorkspaceOwnerEmail = cleanText(invitedAccess.ownerEmail) || cleanText(invitedAccess.workspaceOwnerEmail) || state.currentWorkspaceOwnerEmail;
        state.currentModulePermissions = normalizeModulePermissions(invitedAccess);
      } else if (platformAccount) {
        state.currentUserRole = cleanText(platformAccount.workspaceRole || platformAccount.appRole || state.currentUserRole) || state.currentUserRole;
      }

      if (!state.currentModulePermissions || !Object.keys(state.currentModulePermissions).length) {
        state.currentModulePermissions = defaultModulePermissionsForRole(state.currentUserRole || "employee");
      }

      const storedName = cleanText(sessionStorage.getItem("register_name") || "");
      const storedCompany = cleanText(sessionStorage.getItem("register_company") || "");
      const savedPlatformStatus = cleanText(platformAccount?.status);
      const hasActiveInvitation = !!(invitedAccess && invitedAccess.active !== false);
      const baseAccountStatus = savedPlatformStatus === "blocked"
        ? "blocked"
        : (state.isSuperAdmin || hasActiveInvitation ? "active" : (savedPlatformStatus || (ownRootExists ? "active" : "pending")));

      let workspaceDoc = null;
      try {
        const workspaceSnap = await platformWorkspaceRef(state.accountOwnerId).get();
        if (workspaceSnap.exists) workspaceDoc = workspaceSnap.data() || {};
      } catch (error) {
        console.error(error);
      }

      const baseWorkspaceStatus = cleanText(
        workspaceDoc?.status ||
        (state.accountOwnerId === state.uid ? baseAccountStatus : "active")
      ) || "active";

      state.currentWorkspaceStatus = baseWorkspaceStatus;
      state.currentPlatformStatus = state.isSuperAdmin ? "active" : mergeAccessStatuses(baseAccountStatus, baseWorkspaceStatus);

      const basePlatformPayload = {
        uid: user.uid,
        email: normalizedEmail(state.userEmail),
        name: cleanText(platformAccount?.name || user.displayName || storedName),
        companyName: cleanText(platformAccount?.companyName || workspaceDoc?.companyName || storedCompany),
        appRole: state.isSuperAdmin ? "superadmin" : (invitedAccess ? "employee" : "owner"),
        workspaceRole: state.currentUserRole,
        ownerId: state.accountOwnerId,
        ownerEmail: state.currentWorkspaceOwnerEmail || state.userEmail || "",
        status: platformAccount ? (savedPlatformStatus || "pending") : (state.currentPlatformStatus || "pending"),
        invited: !!invitedAccess,
        language: state.language,
        lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
        lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await platformUserRef(user.uid).set({
          ...basePlatformPayload,
          createdAt: platformAccount?.createdAt || firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) {
        console.error(error);
      }

      if (state.accountOwnerId === state.uid) {
        try {
          const companyName = cleanText(workspaceDoc?.companyName || basePlatformPayload.companyName || state.userEmail || "Mi empresa");
          await platformWorkspaceRef(user.uid).set({
            ownerUid: user.uid,
            ownerEmail: normalizedEmail(state.userEmail),
            companyName,
            status: state.currentWorkspaceStatus,
            plan: cleanText(workspaceDoc?.plan || "starter"),
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: workspaceDoc?.createdAt || firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
        } catch (error) {
          console.error(error);
        }
      }

      if (state.accountOwnerId !== state.uid) {
        try {
          const loginPayload = {
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastSeenAt: firebase.firestore.FieldValue.serverTimestamp(),
            active: true,
            ownerId: state.accountOwnerId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await workspaceMembersRef().doc(state.uid).set({ ...invitedAccess, ...loginPayload, uid:state.uid, email:normalizedEmail(state.userEmail), role:state.currentUserRole, active:true }, { merge:true });
        } catch (error) {
          console.error(error);
        }
      }
    }
    function clearUnsubscribers() {
      state.unsubscribers.forEach(fn => { try { fn(); } catch (_) {} });
      state.unsubscribers = [];
    }
    function clientLabel(client) {
      if (!client) return "-";
      return cleanText(client.company) || cleanText(client.name) || "Sin nombre";
    }
    function getClientById(id) { return state.clients.find(c => c.id === id) || null; }
    function getJobById(id) { return state.jobs.find(j => j.id === id) || null; }
    function getProviderById(id) { return state.providers.find(p => p.id === id) || null; }
    function getPurchaseOrderById(id) { return state.purchaseOrders.find(po => po.id === id) || null; }
    function getTeamMemberById(id) { return state.teamMembers.find(member => member.id === id) || null; }
    function getJobDisplayLabel(job = {}) {
      const client = getClientById(job.clientId);
      return `${clientLabel(client)} - ${job.title || "Trabajo"}`;
    }
    function getInventoryItemById(id) { return state.inventoryItems.find(item => item.id === id) || null; }
    function getInventoryStockStatus(item = {}) {
      const stock = Number(item.stock || 0);
      const min = Number(item.minStock || 0);
      if (stock <= 0) return "out";
      if (min > 0 && stock <= min) return "low";
      return "ok";
    }
    function stockStatusClass(status) {
      return { ok: "stock-ok", low: "stock-low", out: "stock-out" }[status] || "stock-ok";
    }
    function stockStatusLabel(status) {
      return { ok: "En stock", low: "Stock bajo", out: "Sin stock" }[status] || "En stock";
    }
    function stockPill(item = {}) {
      const status = getInventoryStockStatus(item);
      return `<span class="pill ${stockStatusClass(status)}">${stockStatusLabel(status)}</span>`;
    }
    function movementTypeClass(type) {
      return { entrada: "mv-entry", salida: "mv-output", ajuste: "mv-adjust" }[type] || "mv-adjust";
    }
    function movementTypeLabel(type) {
      return { entrada: "Entrada", salida: "Salida", ajuste: "Ajuste" }[type] || "Ajuste";
    }
    function movementPill(type) {
      return `<span class="pill ${movementTypeClass(type)}">${movementTypeLabel(type)}</span>`;
    }
    function inventoryValue(item = {}) {
      return Number(item.stock || 0) * Number(item.unitCost || 0);
    }
    function statusClass(status) {
      return {
        "Cotización": "st-cotizacion",
        "Aprobado": "st-aprobado",
        "Diseño": "st-diseno",
        "Producción": "st-produccion",
        "Instalación": "st-instalacion",
        "Entregado": "st-entregado",
        "Pagado": "st-pagado",
        "Cancelado": "st-cancelado"
      }[status] || "st-cotizacion";
    }
    function priorityClass(priority) {
      return {
        "Baja": "pr-baja",
        "Media": "pr-media",
        "Alta": "pr-alta"
      }[priority] || "pr-media";
    }
    function localizedStatus(status = "") {
      if (state.language !== "en") return status;
      return { "Cotización":"Estimate", "Aprobado":"Approved", "Diseño":"Design", "Producción":"Production", "Instalación":"Installation", "Entregado":"Delivered", "Pagado":"Paid", "Cancelado":"Canceled" }[status] || status;
    }
    function localizedPriority(priority = "Media") {
      if (state.language !== "en") return priority;
      return { "Baja":"Low", "Media":"Medium", "Alta":"High" }[priority] || priority;
    }
    function statusPill(status) { return `<span class="pill ${statusClass(status)}">${safe(localizedStatus(status))}</span>`; }
    function priorityPill(priority) { return `<span class="pill ${priorityClass(priority)}">${safe(localizedPriority(priority || "Media"))}</span>`; }
    function nextStatus(status) {
      const idx = STATUS_FLOW.indexOf(status);
      if (idx === -1) return "Aprobado";
      if (status === "Pagado" || status === "Cancelado") return status;
      return STATUS_FLOW[idx + 1] || status;
    }
    function nextStatusLabel(status) {
      if (status === "Pagado") return localizedStatus("Pagado");
      if (status === "Cancelado") return localizedStatus("Cancelado");
      return `→ ${localizedStatus(nextStatus(status))}`;
    }
    function monthKey(dateStr) {
      return String(dateStr || "").slice(0, 7);
    }
    function currentMonthKey() {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      return `${y}-${m}`;
    }
    function getMonthDate(dayOfMonth) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();
      const lastDay = new Date(year, month + 1, 0).getDate();
      const day = Math.min(Number(dayOfMonth || 1), lastDay);
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    function isOverdue(job) {
      if (!job?.dueDate) return false;
      if (["Pagado", "Cancelado", "Entregado"].includes(job.status)) return false;
      return job.dueDate < today();
    }
    function isBetween(dateValue, from, to) {
      if (!dateValue) return false;
      if (from && dateValue < from) return false;
      if (to && dateValue > to) return false;
      return true;
    }
    function formatDate(value) { return value || "-"; }
    function normalizeMatchText(value) {
      return cleanText(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
