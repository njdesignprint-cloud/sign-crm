    const firebaseConfig = {
      apiKey: "AIzaSyAAf9HnAJppIMUx3cz2RdrR2dkgLx8InSI",
      authDomain: "sign-crm-a7bda.firebaseapp.com",
      projectId: "sign-crm-a7bda",
      storageBucket: "sign-crm-a7bda.firebasestorage.app",
      messagingSenderId: "404561016263",
      appId: "1:404561016263:web:ae655261c64c41400ed5e2"
    };

    const COMPANY = {
      name: "NJ Design & Print",
      phone: "346-213-5545",
      email: "njdesignprint@gmail.com"
    };

    const CLOUDINARY_CONFIG = {
      cloudName: "dcsavsm4e",
      uploadPreset: "njdesignprintcrm",
      folder: "njdesignprint/disenos"
    };

    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.firestore();

    const state = {
      uid: null,
      accountOwnerId: null,
      userEmail: "",
      currentUserRole: "owner",
      currentWorkspaceOwnerEmail: "",
      currentModulePermissions: {},
      currentView: "dashboard",
      clients: [],
      jobs: [],
      expenses: [],
      recurringExpenses: [],
      inventoryItems: [],
      inventoryMovements: [],
      providers: [],
      purchaseOrders: [],
      teamMembers: [],
      editingClientId: null,
      editingJobId: null,
      editingExpenseId: null,
      editingRecurringId: null,
      editingInventoryId: null,
      editingProviderId: null,
      editingPurchaseOrderId: null,
      editingTeamMemberId: null,
      workingPaymentJobId: null,
      workingMovementItemId: null,
      galleryIndex: 0,
      galleryJobId: null,
      pendingJobImages: [],
      pendingExpensePhotos: [],
      unsubscribers: [],
      calendarDate: new Date(),
      installationCalendarDate: new Date(),
      jobsViewMode: "table"
    };

    const $ = (id) => document.getElementById(id);
    const today = () => new Date().toISOString().slice(0, 10);
    const cleanText = (value) => String(value || "").trim();
    const money = (value) => `$${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const safe = (value) => String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");

    const viewMeta = {
      dashboard: ["Dashboard", "Resumen general del negocio."],
      clientes: ["Clientes", "Base de datos de clientes y empresas."],
      trabajos: ["Trabajos", "Vista tabla y Kanban para organizar producción."],
      gastos: ["Gastos", "Control de gastos normales y recurrentes."],
      inventario: ["Inventario", "Control profesional de materiales, stock y movimientos."],
      proveedores: ["Proveedores", "Base de proveedores y contactos de compra."],
      compras: ["Compras", "Órdenes de compra y recepción de materiales."],
      instalaciones: ["Calendario de instalación", "Agenda de instalaciones, responsables y rutas del equipo."],
      reportes: ["Reportes avanzados", "Resumen comercial, rentabilidad, cuentas por cobrar y compras."],
      usuarios: ["Usuarios", "Accesos, roles y permisos del equipo."]
    };

    const STATUS_FLOW = ["Cotización", "Aprobado", "Diseño", "Producción", "Instalación", "Entregado", "Pagado", "Cancelado"];
    const KANBAN_STATUSES = ["Cotización", "Aprobado", "Diseño", "Producción", "Instalación", "Entregado"];
    const ACTIVE_STATUSES = ["Aprobado", "Diseño", "Producción", "Instalación", "Entregado"];

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
        trabajos: 'PDF materiales',
        gastos: 'PDF gastos',
        inventario: 'PDF inventario',
        proveedores: 'PDF proveedores',
        compras: 'PDF compras',
        instalaciones: 'PDF instalaciones',
        reportes: 'PDF reportes',
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
      if (view === "dashboard") btnNew.classList.add("hidden");
      if (view === "clientes") btnNew.textContent = "+ Nuevo cliente";
      if (view === "trabajos") btnNew.textContent = "+ Nuevo trabajo";
      if (view === "gastos") btnNew.textContent = "+ Nuevo gasto";
      if (view === "inventario") btnNew.textContent = "+ Nuevo ítem";
      if (view === "proveedores") btnNew.textContent = "+ Nuevo proveedor";
      if (view === "compras") btnNew.textContent = "+ Nueva orden";
      if (view === "usuarios") btnNew.textContent = "+ Nuevo usuario";
      if (!canEditModule(view)) btnNew.classList.add("hidden");
      updateModulePdfButton();
      applyPermissionUi();
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
    function openModal(id) { $(id).classList.add("show"); }
    function closeModal(id) { $(id).classList.remove("show"); }
    function normalizedEmail(value) { return cleanText(value).toLowerCase(); }
    function emailDocId(email) { return encodeURIComponent(normalizedEmail(email)); }
    function userRef() { return db.collection("users").doc(state.accountOwnerId || state.uid); }
    function ownUserRootRef() { return db.collection("users").doc(state.uid); }
    function teamAccessRefByEmail(email) { return db.collection("teamAccess").doc(emailDocId(email)); }
    function clientsRef() { return userRef().collection("clients"); }
    function jobsRef() { return userRef().collection("jobs"); }
    function expensesRef() { return userRef().collection("expenses"); }
    function recurringRef() { return userRef().collection("recurringExpenses"); }
    function inventoryRef() { return userRef().collection("inventoryItems"); }
    function inventoryMovementsRef() { return userRef().collection("inventoryMovements"); }
    function providersRef() { return userRef().collection("providers"); }
    function purchaseOrdersRef() { return userRef().collection("purchaseOrders"); }
    function teamMembersRef() { return userRef().collection("teamMembers"); }

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
      return module === "instalaciones" ? "trabajos" : module;
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
    function isAdmin() { return isOwner() || getCurrentModulePermission("usuarios") === "manage"; }
    function canViewModule(module = state.currentView) {
      if (module === "dashboard") return true;
      if (module === "reportes") return isAdmin();
      const level = getCurrentModulePermission(module);
      return module === "usuarios"
        ? ["view", "manage"].includes(level)
        : ["view", "edit", "delete"].includes(level);
    }
    function canEditModule(module = state.currentView) {
      if (module === "dashboard" || module === "reportes") return false;
      const level = getCurrentModulePermission(module);
      return module === "usuarios"
        ? level === "manage"
        : ["edit", "delete"].includes(level);
    }
    function canDeleteModule(module = state.currentView) {
      if (module === "dashboard" || module === "reportes") return false;
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
      if (roleEl) roleEl.textContent = `Rol: ${roleLabel(state.currentUserRole)}`;
      const ownerEl = $("activeWorkspaceOwner");
      if (ownerEl) ownerEl.textContent = `Espacio: ${state.currentWorkspaceOwnerEmail || state.userEmail || "-"}`;

      document.querySelectorAll('.nav button[data-view]').forEach(btn => {
        const view = btn.dataset.view;
        btn.classList.toggle('hidden', view !== 'dashboard' && !canViewModule(view));
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
        const shouldHide = state.currentView === "dashboard" || !canEditModule(state.currentView);
        newBtn.classList.toggle("hidden", shouldHide);
      }

      const buttonModuleMap = {
        saveClientBtn: 'clientes',
        saveJobBtn: 'trabajos',
        saveExpenseBtn: 'gastos',
        saveRecurringBtn: 'gastos',
        saveInventoryBtn: 'inventario',
        saveMovementBtn: 'inventario',
        saveProviderBtn: 'proveedores',
        savePurchaseOrderBtn: 'compras',
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
        el.disabled = !canEditModule(module);
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

      if (!state.currentModulePermissions || !Object.keys(state.currentModulePermissions).length) {
        state.currentModulePermissions = defaultModulePermissionsForRole(state.currentUserRole || "employee");
      }

      try {
        const accessSnap = await teamAccessRefByEmail(state.userEmail).get();
        if (accessSnap.exists) {
          const access = accessSnap.data() || {};
          if (access.active !== false && cleanText(access.ownerId)) {
            state.accountOwnerId = cleanText(access.ownerId);
            state.currentUserRole = state.accountOwnerId === state.uid ? "owner" : (cleanText(access.role) || "employee");
            state.currentWorkspaceOwnerEmail = cleanText(access.ownerEmail) || cleanText(access.workspaceOwnerEmail) || state.currentWorkspaceOwnerEmail;
            state.currentModulePermissions = normalizeModulePermissions(access);
          }
        }
      } catch (error) {
        console.error(error);
      }

      if (!state.currentModulePermissions || !Object.keys(state.currentModulePermissions).length) {
        state.currentModulePermissions = defaultModulePermissionsForRole(state.currentUserRole || "employee");
      }

      try {
        if (state.accountOwnerId !== state.uid) {
          const teamDocId = emailDocId(state.userEmail);
          const loginPayload = {
            lastLoginAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastLoginEmail: normalizedEmail(state.userEmail),
            active: true,
            ownerId: state.accountOwnerId,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          };
          await teamMembersRef().doc(teamDocId).set(loginPayload, { merge: true });
          await teamAccessRefByEmail(state.userEmail).set(loginPayload, { merge: true });
        }
      } catch (error) {
        console.error(error);
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
    function statusPill(status) { return `<span class="pill ${statusClass(status)}">${safe(status)}</span>`; }
    function priorityPill(priority) { return `<span class="pill ${priorityClass(priority)}">${safe(priority || "Media")}</span>`; }
    function nextStatus(status) {
      const idx = STATUS_FLOW.indexOf(status);
      if (idx === -1) return "Aprobado";
      if (status === "Pagado" || status === "Cancelado") return status;
      return STATUS_FLOW[idx + 1] || status;
    }
    function nextStatusLabel(status) {
      if (status === "Pagado") return "Pagado";
      if (status === "Cancelado") return "Cancelado";
      return `→ ${nextStatus(status)}`;
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
