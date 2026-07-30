
(function () {
  const LANGS = ["es", "en"];
  const DEFAULT_LANG = "en";
  const LANGUAGE_STORAGE_KEY = "signshophq_lang_v2";

  const TEXTS = {
    es: {
      authAccessLabel: "Gestión para negocios de carteles",
      authHeadline: "Controla cada trabajo, desde la cotización hasta la instalación.",
      authSubtitle: "Clientes, producción, inventario y finanzas organizados en un solo lugar.",
      authBenefitWorkflow: "Flujo de trabajo claro",
      authBenefitProfit: "Rentabilidad y cobros bajo control",
      authBenefitTeam: "Equipo y responsabilidades organizados",
      authFormTitle: "Accede a tu espacio de trabajo",
      authFullNamePh: "Nombre completo (al crear cuenta)",
      authCompanyNamePh: "Empresa (al crear cuenta)",
      authEmailPh: "Correo electrónico",
      authPasswordPh: "Contraseña",
      btnLogin: "Entrar",
      btnRegister: "Crear cuenta",
      btnReset: "Recuperar contraseña",
      authHelpText: "Las cuentas nuevas requieren aprobación antes de acceder al espacio de trabajo.",
      authGuideTitle: "¿Primera vez en SignShop HQ?",
      authGuideCompany: "<strong>Empresa nueva:</strong> completa tus datos y selecciona <strong>Crear cuenta</strong>. Te avisaremos cuando el acceso esté aprobado.",
      authGuideEmployee: "<strong>Miembro de un equipo:</strong> usa el mismo correo con el que te invitó el administrador de tu empresa.",
      accessStatusTitleDefault: "Estado de la cuenta",
      accessStatusTextDefault: "Tu cuenta no puede entrar en este momento.",
      btnStatusLogout: "Volver",
      navGroupOperation: "OPERACIÓN",
      navGroupMaterials: "MATERIALES Y COMPRAS",
      navGroupFinance: "FINANZAS",
      navGroupAdmin: "ADMINISTRACIÓN",
      navDashboardBtn: "📊 Dashboard",
      navClientesBtn: "👥 Clientes",
      navVendedoresBtn: "🤝 Vendedores",
      navTrabajosBtn: "🛠️ Trabajos",
      navProduccionBtn: "🏭 Producción",
      navInstalacionesBtn: "🗓️ Instalación",
      navInventarioBtn: "📦 Inventario",
      navProveedoresBtn: "🏭 Proveedores",
      navComprasBtn: "🧾 Compras",
      navGastosBtn: "💸 Gastos",
      navLiquidacionesBtn: "💰 Liquidación semanal",
      navReportesBtn: "📈 Reportes",
      navUsuariosBtn: "🔐 Usuarios",
      navConfiguracionBtn: "⚙️ Configuración de empresa",
      navPapeleraBtn: "♻️ Papelera y recuperación",
      navAuditoriaBtn: "🛡️ Auditoría",
      navCuentasCrmBtn: "🧩 Cuentas CRM",
      activeUserLabel: "Usuario activo:",
      btnLogout: "Cerrar sesión",
      btnExportJson: "Respaldo JSON",
      btnImportJson: "Importar JSON",
      dashboardPeriodTitleHeading: "Período del dashboard",
      dashboardPeriodHint: "Así el dashboard no se verá vacío solo porque empezó un mes nuevo.",
      alertsQuickTitle: "Alertas rápidas",
      dueSoonTitle: "Trabajos por vencer",
      dueSoonNote: "Mira rápido qué entregas tienes encima.",
      dueSoonEmpty: "No tienes entregas próximas en este momento.",
      deliveryCalendarTitle: "Calendario de entregas",
      deliveryCalendarNote: "Haz clic en un trabajo para abrirlo.",
      btnPrevMonth: "← Mes anterior",
      btnNextMonth: "Mes siguiente →",
      clientesTitle: "Clientes",
      clientesNote: "Base de datos de clientes y empresas.",
      trabajosTitle: "Centro de trabajos",
      trabajosNote: "Encuentra lo urgente, abre un trabajo y continúa desde donde lo dejaste.",
      btnTableView: "Vista tabla",
      btnKanbanView: "Vista Kanban",
      btnClearJobFilters: "Limpiar filtros",
      produccionTitle: "Tablero visual de producción",
      produccionNote: "Vista operativa por etapa para mover trabajos desde diseño hasta completado.",
      usuariosTitle: "Usuarios y permisos",
      usuariosNote: "Agrega personas por correo y define qué pueden hacer dentro del mismo espacio de trabajo.",
      cuentascrmTitle: "Cuentas registradas en la app",
      cuentascrmNote: "Aquí puedes ver quién se registra, qué empresa usa y activar, dejar pendiente o bloquear la cuenta.",
      dashboardPeriodLast30: "Últimos 30 días",
      dashboardPeriodThisMonth: "Este mes",
      dashboardPeriodLastMonth: "Mes pasado",
      dashboardPeriodThisYear: "Año actual",
      dashPotentialSalesLabel: "Ventas potenciales",
      dashSalesLabel: "Ventas confirmadas",
      dashCollectedLabel: "Cobrado del período",
      dashExpensesLabel: "Gastos del período",
      dashProfitLabel: "Ganancia neta",
      dueTodayLabel: "Entregas hoy",
      overdueJobsLabel: "Trabajos vencidos",
      installWeekLabel: "Instalaciones esta semana",
      installPendingLabel: "Pendientes confirmar",
      receivableLabel: "Por cobrar",
      jobsWithBalanceLabel: "Trabajos con saldo",
      activeJobsLabel: "En proceso",
      productionCountLabel: "En producción",
      clientSearchPh: "Buscar por nombre, empresa, teléfono o email",
      jobSearchPh: "Buscar por cliente o trabajo",
      btnNewMainDefault: "+ Nuevo",
      rolePrefix: "Rol",
      workspacePrefix: "Espacio",
      accountPrefix: "Cuenta",
      workspaceStatusPrefix: "Espacio",
      pdfDefault: "PDF módulo"
    },
    en: {
      authAccessLabel: "Management for sign businesses",
      authHeadline: "Control every job, from estimate to installation.",
      authSubtitle: "Clients, production, inventory, and finances organized in one place.",
      authBenefitWorkflow: "A clear job workflow",
      authBenefitProfit: "Profitability and payments under control",
      authBenefitTeam: "Organized teams and responsibilities",
      authFormTitle: "Access your workspace",
      authFullNamePh: "Full name (when creating an account)",
      authCompanyNamePh: "Company (when creating an account)",
      authEmailPh: "Email address",
      authPasswordPh: "Password",
      btnLogin: "Sign in",
      btnRegister: "Create account",
      btnReset: "Reset password",
      authHelpText: "New accounts require approval before accessing a workspace.",
      authGuideTitle: "New to SignShop HQ?",
      authGuideCompany: "<strong>New company:</strong> complete your details and select <strong>Create account</strong>. We will let you know when access is approved.",
      authGuideEmployee: "<strong>Team member:</strong> use the same email address your company administrator invited.",
      accessStatusTitleDefault: "Account status",
      accessStatusTextDefault: "Your account cannot access the app right now.",
      btnStatusLogout: "Back",
      navGroupOperation: "OPERATIONS",
      navGroupMaterials: "MATERIALS & PURCHASES",
      navGroupFinance: "FINANCE",
      navGroupAdmin: "ADMINISTRATION",
      navDashboardBtn: "📊 Dashboard",
      navClientesBtn: "👥 Clients",
      navVendedoresBtn: "🤝 Salespeople",
      navTrabajosBtn: "🛠️ Jobs",
      navProduccionBtn: "🏭 Production",
      navInstalacionesBtn: "🗓️ Installation",
      navInventarioBtn: "📦 Inventory",
      navProveedoresBtn: "🏭 Suppliers",
      navComprasBtn: "🧾 Purchases",
      navGastosBtn: "💸 Expenses",
      navLiquidacionesBtn: "💰 Weekly settlement",
      navReportesBtn: "📈 Reports",
      navUsuariosBtn: "🔐 Users",
      navConfiguracionBtn: "⚙️ Company settings",
      navPapeleraBtn: "♻️ Trash & recovery",
      navAuditoriaBtn: "🛡️ Audit log",
      navCuentasCrmBtn: "🧩 CRM Accounts",
      activeUserLabel: "Active user:",
      btnLogout: "Sign out",
      btnExportJson: "JSON backup",
      btnImportJson: "Import JSON",
      dashboardPeriodTitleHeading: "Dashboard period",
      dashboardPeriodHint: "This keeps the dashboard from looking empty just because a new month started.",
      alertsQuickTitle: "Quick alerts",
      dueSoonTitle: "Jobs due soon",
      dueSoonNote: "Quickly see what deliveries are coming up.",
      dueSoonEmpty: "You do not have upcoming deliveries right now.",
      deliveryCalendarTitle: "Delivery calendar",
      deliveryCalendarNote: "Click a job to open it.",
      btnPrevMonth: "← Previous month",
      btnNextMonth: "Next month →",
      clientesTitle: "Clients",
      clientesNote: "Client and company database.",
      trabajosTitle: "Jobs workspace",
      trabajosNote: "Find what is urgent, open a job and continue where you left off.",
      btnTableView: "Table view",
      btnKanbanView: "Kanban view",
      btnClearJobFilters: "Clear filters",
      produccionTitle: "Production visual board",
      produccionNote: "Operational view by stage to move jobs from design to completed.",
      usuariosTitle: "Users and permissions",
      usuariosNote: "Add people by email and define what they can do inside the same workspace.",
      cuentascrmTitle: "Accounts registered in the app",
      cuentascrmNote: "Here you can see who registers, which company they use, and activate, keep pending, or block the account.",
      dashboardPeriodLast30: "Last 30 days",
      dashboardPeriodThisMonth: "This month",
      dashboardPeriodLastMonth: "Last month",
      dashboardPeriodThisYear: "Current year",
      dashPotentialSalesLabel: "Potential sales",
      dashSalesLabel: "Confirmed sales",
      dashCollectedLabel: "Collected",
      dashExpensesLabel: "Period expenses",
      dashProfitLabel: "Net profit",
      dueTodayLabel: "Due today",
      overdueJobsLabel: "Overdue jobs",
      installWeekLabel: "Installations this week",
      installPendingLabel: "Pending confirmations",
      receivableLabel: "Accounts receivable",
      jobsWithBalanceLabel: "Jobs with balance",
      activeJobsLabel: "In progress",
      productionCountLabel: "In production",
      clientSearchPh: "Search by name, company, phone or email",
      jobSearchPh: "Search by client or job",
      btnNewMainDefault: "+ New",
      rolePrefix: "Role",
      workspacePrefix: "Workspace",
      accountPrefix: "Account",
      workspaceStatusPrefix: "Workspace",
      pdfDefault: "Module PDF"
    }
  };

  const VIEW_META = {
    es: {
      dashboard: ["Dashboard", "Resumen general del negocio."],
      clientes: ["Clientes", "Base de datos de clientes y empresas."],
      vendedores: ["Vendedores y comisiones", "Clientes asignados, condiciones de comisión y contratos."],
      trabajos: ["Trabajos", "Vista tabla y Kanban para organizar producción."],
      produccion: ["Producción", "Tablero visual del flujo de trabajos, responsables y entregas."],
      gastos: ["Gastos", "Control de gastos normales y recurrentes."],
      inventario: ["Inventario", "Control profesional de materiales, stock y movimientos."],
      proveedores: ["Proveedores", "Base de proveedores y contactos de compra."],
      compras: ["Compras", "Órdenes de compra y recepción de materiales."],
      instalaciones: ["Calendario de instalación", "Agenda de instalaciones, responsables y rutas del equipo."],
      reportes: ["Reportes avanzados", "Resumen comercial, rentabilidad, cuentas por cobrar y compras."],
      liquidaciones: ["Liquidación semanal", "Control profesional del pago al propietario y reservas del negocio."],
      usuarios: ["Usuarios", "Accesos, roles y permisos del equipo."],
      configuracion: ["Configuración de empresa", "Identidad, preferencias regionales y marca de documentos."],
      papelera: ["Papelera y recuperación", "Restaura registros archivados conservando sus identificadores."],
      auditoria: ["Auditoría", "Consulta la actividad protegida del espacio y quién realizó cada cambio."],
      cuentascrm: ["Cuentas CRM", "Control global de registros, empresas y estado de acceso."]
    },
    en: {
      dashboard: ["Dashboard", "General business summary."],
      clientes: ["Clients", "Database of clients and companies."],
      vendedores: ["Salespeople & commissions", "Assigned clients, commission terms and agreements."],
      trabajos: ["Jobs", "Table and Kanban view to organize production."],
      produccion: ["Production", "Visual workflow board for jobs, assignees and deliveries."],
      gastos: ["Expenses", "Regular and recurring expense control."],
      inventario: ["Inventory", "Professional control of materials, stock and movements."],
      proveedores: ["Suppliers", "Supplier base and purchasing contacts."],
      compras: ["Purchases", "Purchase orders and material receiving."],
      instalaciones: ["Installation calendar", "Installation schedule, assignees and team routes."],
      reportes: ["Advanced reports", "Commercial summary, profitability, receivables and purchases."],
      liquidaciones: ["Weekly settlement", "Professional tracking of owner pay and business reserves."],
      usuarios: ["Users", "Team access, roles and permissions."],
      configuracion: ["Company settings", "Business identity, regional preferences and document branding."],
      papelera: ["Trash & recovery", "Restore archived records while preserving their original IDs."],
      auditoria: ["Audit log", "Review protected workspace activity and the user responsible for each change."],
      cuentascrm: ["CRM Accounts", "Global control of registrations, companies and access status."]
    }
  };

  const PDF_LABELS = {
    es: {
      dashboard: "PDF dashboard",
      clientes: "PDF clientes",
      vendedores: "PDF vendedores",
      trabajos: "PDF trabajos",
      produccion: "PDF producción",
      gastos: "PDF gastos",
      inventario: "PDF inventario",
      proveedores: "PDF proveedores",
      compras: "PDF compras",
      instalaciones: "PDF instalaciones",
      reportes: "PDF reportes",
      usuarios: "PDF usuarios",
      cuentascrm: "PDF cuentas CRM",
      default: "PDF módulo"
    },
    en: {
      dashboard: "Dashboard PDF",
      clientes: "Clients PDF",
      vendedores: "Salespeople PDF",
      trabajos: "Jobs PDF",
      produccion: "Production PDF",
      gastos: "Expenses PDF",
      inventario: "Inventory PDF",
      proveedores: "Suppliers PDF",
      compras: "Purchases PDF",
      instalaciones: "Installations PDF",
      reportes: "Reports PDF",
      usuarios: "Users PDF",
      cuentascrm: "CRM Accounts PDF",
      default: "Module PDF"
    }
  };

  const MODULE_LABELS = {
    es: {
      clientes: "Clientes",
      vendedores: "Vendedores",
      trabajos: "Trabajos",
      gastos: "Gastos",
      inventario: "Inventario",
      proveedores: "Proveedores",
      compras: "Compras",
      usuarios: "Usuarios"
    },
    en: {
      clientes: "Clients",
      vendedores: "Salespeople",
      trabajos: "Jobs",
      gastos: "Expenses",
      inventario: "Inventory",
      proveedores: "Suppliers",
      compras: "Purchases",
      usuarios: "Users"
    }
  };

  const ROLE_LABELS = {
    es: { owner: "Propietario", admin: "Admin", employee: "Empleado", readonly: "Solo lectura" },
    en: { owner: "Owner", admin: "Admin", employee: "Employee", readonly: "Read only" }
  };

  const ACCOUNT_STATUS_LABELS = {
    es: { pending: "Pendiente", active: "Activa", blocked: "Bloqueada" },
    en: { pending: "Pending", active: "Active", blocked: "Blocked" }
  };

  function getLang() {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (LANGS.includes(stored)) return stored;
    } catch (_) {}
    return (window.state && LANGS.includes(window.state.language)) ? window.state.language : DEFAULT_LANG;
  }

  function t(key) {
    const lang = getLang();
    return (TEXTS[lang] && TEXTS[lang][key]) || (TEXTS.es && TEXTS.es[key]) || "";
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && typeof value === "string") el.textContent = value;
  }

  function setHtml(id, value) {
    const el = document.getElementById(id);
    if (el && typeof value === "string") el.innerHTML = value;
  }

  function setPlaceholder(id, value) {
    const el = document.getElementById(id);
    if (el && typeof value === "string") el.placeholder = value;
  }

  function setOptionText(selectId, optionValue, text) {
    const option = document.querySelector(`#${selectId} option[value="${optionValue}"]`);
    if (option && text) option.textContent = text;
  }

  function updateLangButtons() {
    const lang = getLang();
    const esBtn = document.getElementById("btnLangEs");
    const enBtn = document.getElementById("btnLangEn");
    if (esBtn) {
      esBtn.classList.toggle("btn-info", lang === "es");
      esBtn.classList.toggle("btn-secondary", lang !== "es");
    }
    if (enBtn) {
      enBtn.classList.toggle("btn-info", lang === "en");
      enBtn.classList.toggle("btn-secondary", lang !== "en");
    }
  }

  function setTopShellTexts() {
    document.documentElement.lang = getLang();
    setText("authAccessLabel", t("authAccessLabel"));
    setText("authHeadline", t("authHeadline"));
    setText("authSubtitle", t("authSubtitle"));
    setText("authBenefitWorkflow", t("authBenefitWorkflow"));
    setText("authBenefitProfit", t("authBenefitProfit"));
    setText("authBenefitTeam", t("authBenefitTeam"));
    setText("authFormTitle", t("authFormTitle"));
    setPlaceholder("authFullName", t("authFullNamePh"));
    setPlaceholder("authCompanyName", t("authCompanyNamePh"));
    setPlaceholder("authEmail", t("authEmailPh"));
    setPlaceholder("authPassword", t("authPasswordPh"));
    setText("btnLogin", t("btnLogin"));
    setText("btnRegister", t("btnRegister"));
    setText("btnReset", t("btnReset"));
    setText("authHelpText", t("authHelpText"));
    setText("authGuideTitle", t("authGuideTitle"));
    setHtml("authGuideCompany", t("authGuideCompany"));
    setHtml("authGuideEmployee", t("authGuideEmployee"));
    if (document.getElementById("accessStatusTitle") && !document.getElementById("accessStatusTitle").dataset.dynamicSet) {
      setText("accessStatusTitle", t("accessStatusTitleDefault"));
    }
    if (document.getElementById("accessStatusText") && !document.getElementById("accessStatusText").dataset.dynamicSet) {
      setText("accessStatusText", t("accessStatusTextDefault"));
    }
    setText("btnStatusLogout", t("btnStatusLogout"));
    setText("navGroupOperation", t("navGroupOperation"));
    setText("navGroupMaterials", t("navGroupMaterials"));
    setText("navGroupFinance", t("navGroupFinance"));
    setText("navGroupAdmin", t("navGroupAdmin"));
    setText("navDashboardBtn", t("navDashboardBtn"));
    setText("navClientesBtn", t("navClientesBtn"));
    setText("navVendedoresBtn", t("navVendedoresBtn"));
    setText("navTrabajosBtn", t("navTrabajosBtn"));
    setText("navProduccionBtn", t("navProduccionBtn"));
    setText("navInstalacionesBtn", t("navInstalacionesBtn"));
    setText("navInventarioBtn", t("navInventarioBtn"));
    setText("navProveedoresBtn", t("navProveedoresBtn"));
    setText("navComprasBtn", t("navComprasBtn"));
    setText("navGastosBtn", t("navGastosBtn"));
    setText("navLiquidacionesBtn", t("navLiquidacionesBtn"));
    setText("navReportesBtn", t("navReportesBtn"));
    setText("navUsuariosBtn", t("navUsuariosBtn"));
    setText("navConfiguracionBtn", t("navConfiguracionBtn"));
    setText("navPapeleraBtn", t("navPapeleraBtn"));
    setText("navAuditoriaBtn", t("navAuditoriaBtn"));
    setText("navCuentasCrmBtn", t("navCuentasCrmBtn"));
    setText("activeUserLabel", t("activeUserLabel"));
    setText("btnLogout", t("btnLogout"));
    setText("btnExportJson", t("btnExportJson"));
    setText("btnImportJson", t("btnImportJson"));
  }

  function setDashboardTexts() {
    setText("dashboardPeriodTitleHeading", t("dashboardPeriodTitleHeading"));
    setText("dashboardPeriodHint", t("dashboardPeriodHint"));
    setText("alertsQuickTitle", t("alertsQuickTitle"));
    setText("dueSoonTitle", t("dueSoonTitle"));
    setText("dueSoonNote", t("dueSoonNote"));
    setText("dueSoonEmpty", t("dueSoonEmpty"));
    setText("deliveryCalendarTitle", t("deliveryCalendarTitle"));
    setText("deliveryCalendarNote", t("deliveryCalendarNote"));
    setText("btnPrevMonth", t("btnPrevMonth"));
    setText("btnNextMonth", t("btnNextMonth"));
    setOptionText("dashboardPeriod", "last30", t("dashboardPeriodLast30"));
    setOptionText("dashboardPeriod", "thisMonth", t("dashboardPeriodThisMonth"));
    setOptionText("dashboardPeriod", "lastMonth", t("dashboardPeriodLastMonth"));
    setOptionText("dashboardPeriod", "thisYear", t("dashboardPeriodThisYear"));
    setText("dashPotentialSalesLabel", t("dashPotentialSalesLabel"));
    setText("dashSalesLabel", t("dashSalesLabel"));
    setText("dashCollectedLabel", t("dashCollectedLabel"));
    setText("dashExpensesLabel", t("dashExpensesLabel"));
    setText("dashProfitLabel", t("dashProfitLabel"));

    document.querySelector("#dueTodayCount")?.closest(".alert-card")?.querySelector(".label") && (document.querySelector("#dueTodayCount").closest(".alert-card").querySelector(".label").textContent = t("dueTodayLabel"));
    document.querySelector("#allOverdueJobs")?.closest(".alert-card")?.querySelector(".label") && (document.querySelector("#allOverdueJobs").closest(".alert-card").querySelector(".label").textContent = t("overdueJobsLabel"));
    document.querySelector("#installWeekCount")?.closest(".alert-card")?.querySelector(".label") && (document.querySelector("#installWeekCount").closest(".alert-card").querySelector(".label").textContent = t("installWeekLabel"));
    document.querySelector("#installPendingConfirmCount")?.closest(".alert-card")?.querySelector(".label") && (document.querySelector("#installPendingConfirmCount").closest(".alert-card").querySelector(".label").textContent = t("installPendingLabel"));
    document.querySelector("#allReceivable")?.closest(".mini-stat")?.querySelector(".label") && (document.querySelector("#allReceivable").closest(".mini-stat").querySelector(".label").textContent = t("receivableLabel"));
    document.querySelector("#jobsWithBalanceCount")?.closest(".mini-stat")?.querySelector(".label") && (document.querySelector("#jobsWithBalanceCount").closest(".mini-stat").querySelector(".label").textContent = t("jobsWithBalanceLabel"));
    document.querySelector("#allActiveJobs")?.closest(".mini-stat")?.querySelector(".label") && (document.querySelector("#allActiveJobs").closest(".mini-stat").querySelector(".label").textContent = t("activeJobsLabel"));
    document.querySelector("#jobsInProductionCount")?.closest(".mini-stat")?.querySelector(".label") && (document.querySelector("#jobsInProductionCount").closest(".mini-stat").querySelector(".label").textContent = t("productionCountLabel"));
  }

  function setSectionTexts() {
    setText("clientesTitle", t("clientesTitle"));
    setText("clientesNote", t("clientesNote"));
    setPlaceholder("clientSearch", t("clientSearchPh"));
    setText("trabajosTitle", t("trabajosTitle"));
    setText("trabajosNote", t("trabajosNote"));
    setText("btnTableView", t("btnTableView"));
    setText("btnKanbanView", t("btnKanbanView"));
    setText("btnClearJobFilters", t("btnClearJobFilters"));
    setPlaceholder("jobSearch", t("jobSearchPh"));
    setText("produccionTitle", t("produccionTitle"));
    setText("produccionNote", t("produccionNote"));
    setText("usuariosTitle", t("usuariosTitle"));
    setText("usuariosNote", t("usuariosNote"));
    setText("cuentascrmTitle", t("cuentascrmTitle"));
    setText("cuentascrmNote", t("cuentascrmNote"));
  }

  function updateDynamicLabels() {
    const lang = getLang();
    if (window.state) {
      window.state.language = lang;
      const meta = (VIEW_META[lang] || VIEW_META.es)[window.state.currentView || "dashboard"] || VIEW_META[lang].dashboard;
      const pageTitle = document.getElementById("pageTitle");
      const pageSubtitle = document.getElementById("pageSubtitle");
      if (pageTitle) pageTitle.textContent = meta[0];
      if (pageSubtitle) pageSubtitle.textContent = meta[1];
    }
    if (typeof window.updateModulePdfButton === "function") {
      window.updateModulePdfButton();
    }
    if (typeof window.applyPermissionUi === "function") {
      window.applyPermissionUi();
    }
    const btnNew = document.getElementById("btnNewMain");
    if (btnNew && !btnNew.classList.contains("hidden")) {
      const view = window.state?.currentView || "dashboard";
      const map = {
        es: {
          clientes: "+ Nuevo cliente",
          vendedores: "+ Nuevo vendedor",
          trabajos: "+ Nuevo trabajo",
          gastos: "+ Nuevo gasto",
          inventario: "+ Nuevo ítem",
          proveedores: "+ Nuevo proveedor",
          compras: "+ Nueva orden",
          usuarios: "+ Nuevo usuario"
        },
        en: {
          clientes: "+ New client",
          vendedores: "+ New salesperson",
          trabajos: "+ New job",
          gastos: "+ New expense",
          inventario: "+ New item",
          proveedores: "+ New supplier",
          compras: "+ New order",
          usuarios: "+ New user"
        }
      };
      btnNew.textContent = (map[lang] || map.es)[view] || t("btnNewMainDefault");
    }
  }

  function applyLanguage() {
    updateLangButtons();
    setTopShellTexts();
    setDashboardTexts();
    setSectionTexts();
    updateDynamicLabels();
    const lang = getLang();
    [["calendarLabel", window.state?.calendarDate], ["installationCalendarLabel", window.state?.installationCalendarDate]].forEach(([id, date]) => {
      if (!(date instanceof Date)) return;
      const label = date.toLocaleDateString(lang === "es" ? "es-ES" : "en-US", { month: "long", year: "numeric" });
      setText(id, label.charAt(0).toUpperCase() + label.slice(1));
    });
  }

  function setLanguage(lang) {
    const next = LANGS.includes(lang) ? lang : DEFAULT_LANG;
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, next); } catch (_) {}
    if (window.state) window.state.language = next;
    applyLanguage();
    window.dispatchEvent(new CustomEvent("crm-language-changed", { detail: { language: next } }));
    setTimeout(() => {
      const viewRenderers = {
        clientes: "renderClients", vendedores: "renderSalespeople", trabajos: "renderJobs",
        produccion: "renderProductionBoard", gastos: "renderExpenses", inventario: "renderInventory",
        proveedores: "renderProviders", compras: "renderPurchaseOrders", instalaciones: "renderInstallationModule",
        reportes: "renderReportsModule", usuarios: "renderUsers", cuentascrm: "renderPlatformAccounts"
      };
      if (typeof window.renderStats === "function") window.renderStats();
      if (window.state?.currentView === "dashboard" && typeof window.renderDeliveryCalendar === "function") window.renderDeliveryCalendar();
      if (typeof window.renderOperationsAlerts === "function") window.renderOperationsAlerts();
      const renderer = viewRenderers[window.state?.currentView];
      if (renderer && typeof window[renderer] === "function") window[renderer]();
    }, 0);
  }

  function patchFunctions() {
    if (window.__crmI18nPatched) return;
    window.__crmI18nPatched = true;

    if (typeof window.setView === "function") {
      const original = window.setView;
      window.setView = function (...args) {
        const result = original.apply(this, args);
        setTimeout(applyLanguage, 0);
        return result;
      };
    }

    if (typeof window.updateModulePdfButton === "function") {
      window.updateModulePdfButton = function () {
        const labels = PDF_LABELS[getLang()] || PDF_LABELS.es;
        const btn = document.getElementById("btnExportPdf");
        if (btn) btn.textContent = labels[window.state?.currentView] || labels.default || t("pdfDefault");
      };
    }

    if (typeof window.moduleLabel === "function") {
      window.moduleLabel = function (module = "") {
        const map = MODULE_LABELS[getLang()] || MODULE_LABELS.es;
        return map[module] || module;
      };
    }

    if (typeof window.roleLabel === "function") {
      window.roleLabel = function (role = "") {
        const map = ROLE_LABELS[getLang()] || ROLE_LABELS.es;
        return map[role] || map.employee;
      };
    }

    if (typeof window.platformStatusLabel === "function") {
      window.platformStatusLabel = function (status = "") {
        const map = ACCOUNT_STATUS_LABELS[getLang()] || ACCOUNT_STATUS_LABELS.es;
        const key = (String(status || "").trim());
        return map[key] || map.pending;
      };
    }

    if (typeof window.applyPermissionUi === "function") {
      const original = window.applyPermissionUi;
      window.applyPermissionUi = function (...args) {
        const result = original.apply(this, args);
        const lang = getLang();
        const roleEl = document.getElementById("activeWorkspaceRole");
        if (roleEl && window.state) {
          const extra = window.state.isSuperAdmin ? " · Super Admin" : "";
          roleEl.textContent = `${t("rolePrefix")}: ${window.roleLabel(window.state.currentUserRole)}${extra}`;
        }
        const ownerEl = document.getElementById("activeWorkspaceOwner");
        if (ownerEl && window.state) {
          ownerEl.textContent = `${t("workspacePrefix")}: ${window.state.currentWorkspaceOwnerEmail || window.state.userEmail || "-"}`;
        }
        const statusEl = document.getElementById("activeWorkspaceStatus");
        if (statusEl && window.state && typeof window.platformStatusPill === "function") {
          const accountStatus = window.platformStatusPill(window.state.currentPlatformStatus || "active");
          const workspaceStatus = window.platformStatusPill(window.state.currentWorkspaceStatus || window.state.currentPlatformStatus || "active");
          const same = String(window.state.currentWorkspaceStatus || window.state.currentPlatformStatus).trim() === String(window.state.currentPlatformStatus || "active").trim();
          statusEl.innerHTML = same
            ? `${t("accountPrefix")}: ${accountStatus}`
            : `${t("accountPrefix")}: ${accountStatus} · ${t("workspaceStatusPrefix")}: ${workspaceStatus}`;
        }
        return result;
      };
    }

    const wrapNames = [
      "renderStats", "renderClients", "renderJobs", "renderExpenses", "renderInventory",
      "renderProviders", "renderPurchaseOrders", "renderInstallationModule",
      "renderReportsModule", "renderUsers", "renderPlatformAccounts", "renderProductionBoard"
    ];
    wrapNames.forEach((name) => {
      const fn = window[name];
      if (typeof fn === "function" && !fn.__langWrapped) {
        const wrapped = function (...args) {
          const result = fn.apply(this, args);
          setTimeout(applyLanguage, 0);
          return result;
        };
        wrapped.__langWrapped = true;
        window[name] = wrapped;
      }
    });

    if (typeof window.openModal === "function" && !window.openModal.__langWrapped) {
      const openModal = window.openModal;
      const wrapped = function (...args) {
        const result = openModal.apply(this, args);
        setTimeout(applyLanguage, 0);
        return result;
      };
      wrapped.__langWrapped = true;
      window.openModal = wrapped;
    }
  }

  function bindLanguageButtons() {
    document.getElementById("btnLangEs")?.addEventListener("click", () => setLanguage("es"));
    document.getElementById("btnLangEn")?.addEventListener("click", () => setLanguage("en"));
  }

  patchFunctions();
  bindLanguageButtons();
  setLanguage(getLang());
})();
