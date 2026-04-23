(function () {
  const LANG_KEY = "njcrm_lang";
  const DEFAULT_LANG = "es";

  const ES_EN_EXACT = {
    "Operación": "Operations",
    "Comercial": "Commercial",
    "Materiales y compras": "Materials & purchasing",
    "Finanzas": "Finance",
    "Administración": "Administration",

    "Dashboard": "Dashboard",
    "Clientes": "Clients",
    "Trabajos": "Jobs",
    "Producción": "Production",
    "Instalación": "Installation",
    "Instalaciones": "Installation",
    "Inventario": "Inventory",
    "Proveedores": "Suppliers",
    "Compras": "Purchasing",
    "Gastos": "Expenses",
    "Reportes": "Reports",
    "Usuarios": "Users",

    "Entrar": "Log in",
    "Crear cuenta": "Create account",
    "Recuperar contraseña": "Reset password",
    "Cerrar sesión": "Log out",

    "PDF dashboard": "Dashboard PDF",
    "PDF clientes": "Clients PDF",
    "PDF materiales": "Materials PDF",
    "PDF producción": "Production PDF",
    "PDF gastos": "Expenses PDF",
    "PDF inventario": "Inventory PDF",
    "PDF proveedores": "Suppliers PDF",
    "PDF compras": "Purchasing PDF",
    "PDF instalaciones": "Installation PDF",
    "PDF reportes": "Reports PDF",
    "PDF usuarios": "Users PDF",

    "Respaldo JSON": "JSON backup",
    "Importar JSON": "Import JSON",
    "Limpiar filtros": "Clear filters",
    "+ Nuevo": "+ New",

    "Mes actual": "Current month",
    "Alertas rápidas": "Quick alerts",
    "Trabajos por vencer": "Jobs due soon",
    "Calendario de entregas": "Delivery calendar",

    "Entregas hoy": "Due today",
    "Cobros pendientes": "Jobs with balance",
    "Trabajos vencidos": "Overdue jobs",
    "Por cobrar": "Accounts receivable",
    "Vencen 7 días": "Due in 7 days",
    "Trabajos activos": "Active jobs",
    "En proceso": "In progress",
    "En producción": "In production",
    "Instalaciones esta semana": "Installations this week",
    "Pendientes confirmar": "Pending confirmation",

    "Ventas del mes": "Sales this month",
    "Cobrado del mes": "Collected this month",
    "Gastos del mes": "Expenses this month",
    "Ganancia neta mes": "Net profit this month",

    "Tablero visual de producción": "Visual production board",
    "Vencidos": "Overdue",
    "Listos para instalar": "Ready to install",
    "Completados": "Completed",

    "Todas las etapas": "All stages",
    "Todas las prioridades": "All priorities",
    "Todos los responsables": "All assignees",
    "Todos los trabajos": "All jobs",
    "Solo vencidos": "Only overdue",

    "Diseño": "Design",
    "Aprobación": "Approval",
    "Listo para instalar": "Ready to install",
    "Instalación programada": "Installation scheduled",
    "Completado": "Completed",

    "Alta": "High",
    "Media": "Medium",
    "Baja": "Low",

    "Cotización": "Quote",
    "Aprobado": "Approved",
    "Entregado": "Delivered",
    "Pagado": "Paid",
    "Cancelado": "Canceled",

    "En tiempo": "On time",
    "Sin trabajos en esta etapa.": "No jobs in this stage.",
    "Abrir": "Open",
    "Gestionar": "Manage"
  };

  const ES_EN_PREFIX = {
    "Buscar por cliente o trabajo": "Search by client or job",
    "Correo electrónico": "Email",
    "Contraseña": "Password",
    "dd/mm/aaaa": "mm/dd/yyyy",
    "Entrega:": "Due:",
    "Saldo:": "Balance:",
    "Responsable:": "Assignee:",
    "Checklist:": "Checklist:",
    "Rol:": "Role:",
    "Espacio:": "Workspace:",
    "Usuario activo:": "Active user:",
    "Sin entregas": "No deliveries"
  };

  const VIEW_META = {
    es: {
      dashboard: ["Dashboard", "Resumen general del negocio."],
      clientes: ["Clientes", "Base de datos de clientes y empresas."],
      trabajos: ["Trabajos", "Vista tabla y Kanban para organizar producción."],
      produccion: ["Producción", "Tablero visual del flujo de trabajos, responsables y entregas."],
      gastos: ["Gastos", "Control de gastos normales y recurrentes."],
      inventario: ["Inventario", "Control profesional de materiales, stock y movimientos."],
      proveedores: ["Proveedores", "Base de proveedores y contactos de compra."],
      compras: ["Compras", "Órdenes de compra y recepción de materiales."],
      instalaciones: ["Instalación", "Agenda de instalaciones, responsables y rutas del equipo."],
      reportes: ["Reportes", "Resumen comercial, rentabilidad, cuentas por cobrar y compras."],
      usuarios: ["Usuarios", "Accesos, roles y permisos del equipo."]
    },
    en: {
      dashboard: ["Dashboard", "General business overview."],
      clientes: ["Clients", "Client and company database."],
      trabajos: ["Jobs", "Table and Kanban view to organize production."],
      produccion: ["Production", "Visual board for jobs, assignees and deliveries."],
      gastos: ["Expenses", "Regular and recurring expense control."],
      inventario: ["Inventory", "Professional control of materials, stock and movements."],
      proveedores: ["Suppliers", "Supplier database and purchasing contacts."],
      compras: ["Purchasing", "Purchase orders and receiving materials."],
      instalaciones: ["Installation", "Installation schedule, assignees and team routes."],
      reportes: ["Reports", "Commercial summary, profitability, receivables and purchasing."],
      usuarios: ["Users", "Team access, roles and permissions."]
    }
  };

  const PDF_LABELS = {
    es: {
      dashboard: "PDF dashboard",
      clientes: "PDF clientes",
      trabajos: "PDF materiales",
      produccion: "PDF producción",
      gastos: "PDF gastos",
      inventario: "PDF inventario",
      proveedores: "PDF proveedores",
      compras: "PDF compras",
      instalaciones: "PDF instalaciones",
      reportes: "PDF reportes",
      usuarios: "PDF usuarios"
    },
    en: {
      dashboard: "Dashboard PDF",
      clientes: "Clients PDF",
      trabajos: "Materials PDF",
      produccion: "Production PDF",
      gastos: "Expenses PDF",
      inventario: "Inventory PDF",
      proveedores: "Suppliers PDF",
      compras: "Purchasing PDF",
      instalaciones: "Installation PDF",
      reportes: "Reports PDF",
      usuarios: "Users PDF"
    }
  };

  const exactReverse = Object.fromEntries(Object.entries(ES_EN_EXACT).map(([es, en]) => [en, es]));
  const prefixReverse = Object.fromEntries(Object.entries(ES_EN_PREFIX).map(([es, en]) => [en, es]));

  let lang = localStorage.getItem(LANG_KEY) || DEFAULT_LANG;
  let observer = null;
  let muteObserver = false;

  function currentViewKey() {
    const active = document.querySelector(".nav button.active[data-view]");
    return active?.dataset?.view || "dashboard";
  }

  function translateWithPrefix(text) {
    const raw = String(text || "");
    const map = lang === "en" ? ES_EN_PREFIX : prefixReverse;
    const exactMap = lang === "en" ? ES_EN_EXACT : exactReverse;
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    if (exactMap[trimmed]) {
      return raw.replace(trimmed, exactMap[trimmed]);
    }

    for (const [from, to] of Object.entries(map)) {
      if (trimmed.startsWith(from)) {
        const idx = raw.indexOf(from);
        if (idx >= 0) return raw.slice(0, idx) + to + raw.slice(idx + from.length);
      }
    }
    return raw;
  }

  function setText(selector, text) {
    const el = typeof selector === "string" ? document.querySelector(selector) : selector;
    if (el) el.textContent = text;
  }

  function setPlaceholder(id, es, en) {
    const el = document.getElementById(id);
    if (el) el.placeholder = lang === "en" ? en : es;
  }

  function setBtnValue(id, es, en) {
    const el = document.getElementById(id);
    if (el) el.textContent = lang === "en" ? en : es;
  }

  function translateOptions(selectId, pairs) {
    const el = document.getElementById(selectId);
    if (!el) return;
    const current = el.value;
    [...el.options].forEach((opt) => {
      const match = pairs.find((item) => item.value === opt.value || item.es === opt.textContent || item.en === opt.textContent);
      if (match) opt.textContent = lang === "en" ? match.en : match.es;
    });
    el.value = current;
  }

  function updateLanguageButton() {
    let btn = document.getElementById("btnLangToggle");
    const host = document.querySelector(".top-actions");
    if (!host) return;
    if (!btn) {
      btn = document.createElement("button");
      btn.id = "btnLangToggle";
      btn.className = "btn btn-secondary";
      btn.type = "button";
      btn.addEventListener("click", toggleLanguage);
      host.insertBefore(btn, host.firstChild);
    }
    btn.textContent = lang === "es" ? "English" : "Español";
    btn.title = lang === "es" ? "Change app language to English" : "Cambiar idioma de la app a español";
  }

  function applyShellTranslations() {
    setText(".brand-sub", lang === "en"
      ? "Safe phase 8: professional inventory visually integrated with jobs, without automatic discount yet."
      : "Fase 8 segura: inventario profesional integrado visualmente con trabajos, sin descuento automático todavía.");

    document.querySelectorAll(".layout-sidebar-group-title").forEach((el) => {
      el.textContent = translateWithPrefix(el.textContent);
    });

    document.querySelectorAll(".nav button[data-view]").forEach((btn) => {
      const view = btn.dataset.view;
      const labels = {
        dashboard: lang === "en" ? "Dashboard" : "Dashboard",
        trabajos: lang === "en" ? "Jobs" : "Trabajos",
        produccion: lang === "en" ? "Production" : "Producción",
        instalaciones: lang === "en" ? "Installation" : "Instalación",
        clientes: lang === "en" ? "Clients" : "Clientes",
        inventario: lang === "en" ? "Inventory" : "Inventario",
        proveedores: lang === "en" ? "Suppliers" : "Proveedores",
        compras: lang === "en" ? "Purchasing" : "Compras",
        gastos: lang === "en" ? "Expenses" : "Gastos",
        reportes: lang === "en" ? "Reports" : "Reportes",
        usuarios: lang === "en" ? "Users" : "Usuarios"
      };
      const iconMatch = btn.textContent.match(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]*/);
      const icon = iconMatch ? iconMatch[0] : "";
      btn.textContent = `${icon}${labels[view] || btn.textContent.replace(icon, "").trim()}`.trim();
    });

    setText("#btnExportJson", lang === "en" ? "JSON backup" : "Respaldo JSON");
    setText("#btnImportJson", lang === "en" ? "Import JSON" : "Importar JSON");
    setText("#btnLogout", lang === "en" ? "Log out" : "Cerrar sesión");

    const roleEl = document.getElementById("activeWorkspaceRole");
    if (roleEl) roleEl.textContent = translateWithPrefix(roleEl.textContent);

    const ownerEl = document.getElementById("activeWorkspaceOwner");
    if (ownerEl) ownerEl.textContent = translateWithPrefix(ownerEl.textContent);

    const userChip = document.querySelector(".user-chip");
    if (userChip) {
      userChip.innerHTML = userChip.innerHTML
        .replace(/Usuario activo:/g, lang === "en" ? "Active user:" : "Usuario activo:")
        .replace(/Active user:/g, lang === "en" ? "Active user:" : "Usuario activo:")
        .replace(/Rol:/g, lang === "en" ? "Role:" : "Rol:")
        .replace(/Role:/g, lang === "en" ? "Role:" : "Rol:")
        .replace(/Espacio:/g, lang === "en" ? "Workspace:" : "Espacio:")
        .replace(/Workspace:/g, lang === "en" ? "Workspace:" : "Espacio:");
    }
  }

  function applyAuthTranslations() {
    setText(".auth-sub", lang === "en"
      ? "Private CRM with quick estimator by job type and full profitability."
      : "CRM privado con estimador rápido por tipo de trabajo y rentabilidad completa.");
    setPlaceholder("authEmail", "Correo electrónico", "Email");
    setPlaceholder("authPassword", "Contraseña", "Password");
    setBtnValue("btnLogin", "Entrar", "Log in");
    setBtnValue("btnRegister", "Crear cuenta", "Create account");
    setBtnValue("btnReset", "Recuperar contraseña", "Reset password");
    setText(".help", lang === "en"
      ? "This version uses Firebase Authentication and Firestore. Firebase Storage is not required."
      : "Esta versión usa Firebase Authentication y Firestore. No necesita Firebase Storage.");
  }

  function applyPageTitle() {
    const view = currentViewKey();
    const meta = VIEW_META[lang][view];
    if (meta) {
      setText("#pageTitle", meta[0]);
      setText("#pageSubtitle", meta[1]);
    }
  }

  function applyPdfButtonLabel() {
    const btn = document.getElementById("btnExportPdf");
    if (!btn) return;
    const view = currentViewKey();
    btn.textContent = PDF_LABELS[lang][view] || (lang === "en" ? "Module PDF" : "PDF módulo");
  }

  function applyDashboardTranslations() {
    const scope = document.getElementById("view-dashboard");
    if (!scope) return;
    scope.querySelectorAll(".label, h2, .section-note, th, .empty, .calendar-day-head").forEach((el) => {
      el.textContent = translateWithPrefix(el.textContent);
    });
  }

  function applyProductionTranslations() {
    const scope = document.getElementById("view-produccion");
    if (!scope) return;

    setText("#btnProductionResetFilters", lang === "en" ? "Clear filters" : "Limpiar filtros");
    setPlaceholder("productionSearch", "Buscar por cliente o trabajo", "Search by client or job");

    translateOptions("productionStageFilter", [
      { value: "", es: "Todas las etapas", en: "All stages" },
      { value: "diseno", es: "Diseño", en: "Design" },
      { value: "aprobacion", es: "Aprobación", en: "Approval" },
      { value: "produccion", es: "Producción", en: "Production" },
      { value: "listo", es: "Listo para instalar", en: "Ready to install" },
      { value: "instalacion", es: "Instalación programada", en: "Installation scheduled" },
      { value: "completado", es: "Completado", en: "Completed" }
    ]);

    translateOptions("productionPriorityFilter", [
      { value: "", es: "Todas las prioridades", en: "All priorities" },
      { value: "Alta", es: "Alta", en: "High" },
      { value: "Media", es: "Media", en: "Medium" },
      { value: "Baja", es: "Baja", en: "Low" }
    ]);

    translateOptions("productionResponsibleFilter", [
      { value: "", es: "Todos los responsables", en: "All assignees" }
    ]);

    translateOptions("productionStatusFilter", [
      { value: "", es: "Todos los trabajos", en: "All jobs" },
      { value: "all", es: "Todos los trabajos", en: "All jobs" },
      { value: "active", es: "Solo activos", en: "Only active" },
      { value: "completed", es: "Solo completados", en: "Only completed" }
    ]);

    const overdueText = scope.querySelector(".production-only-overdue-text");
    if (overdueText) overdueText.textContent = lang === "en" ? "Only overdue" : "Solo vencidos";

    scope.querySelectorAll("h1, h2, h3, .label, .production-column-title, .production-empty, .btn, .pill, small, .section-note").forEach((el) => {
      el.textContent = translateWithPrefix(el.textContent);
      if (el.textContent.trim() === (lang === "en" ? "Production" : "Producción") && el.classList.contains("btn")) {
        el.textContent = lang === "en" ? "Manage" : "Gestionar";
      }
    });
  }

  function translateVisibleText(scope) {
    if (!scope) return;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT, null);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const original = node.nodeValue;
      const trimmed = original.trim();
      if (!trimmed) return;
      const parent = node.parentElement;
      if (!parent) return;
      if (parent.matches("input, textarea, script, style")) return;
      if (parent.closest("h4, td strong, .gallery-thumb-info strong")) return;
      const next = translateWithPrefix(original);
      if (next !== original) node.nodeValue = next;
    });
  }

  function applyCommonPlaceholders() {
    setPlaceholder("clientSearch", "Buscar por nombre, empresa, teléfono o email", "Search by name, company, phone or email");
    setPlaceholder("jobSearch", "Buscar por cliente o trabajo", "Search by client or job");
    setPlaceholder("expenseSearch", "Buscar concepto o categoría", "Search concept or category");
    setPlaceholder("inventorySearch", "Buscar por nombre, SKU, categoría o proveedor", "Search by name, SKU, category or supplier");
    setPlaceholder("providerSearch", "Buscar por nombre, contacto, teléfono o email", "Search by name, contact, phone or email");
    setPlaceholder("purchaseOrderSearch", "Buscar por OC, proveedor, trabajo o nota", "Search by PO, supplier, job or note");
    setPlaceholder("installationSearch", "Buscar por cliente, trabajo, dirección o responsable", "Search by client, job, address or assignee");
    setPlaceholder("userSearch", "Buscar por nombre, correo o rol", "Search by name, email or role");
  }

  function applyLanguage() {
    if (muteObserver) return;
    muteObserver = true;
    try {
      document.documentElement.lang = lang;
      updateLanguageButton();
      applyShellTranslations();
      applyAuthTranslations();
      applyPageTitle();
      applyPdfButtonLabel();
      applyCommonPlaceholders();
      applyDashboardTranslations();
      applyProductionTranslations();
      translateVisibleText(document.getElementById("view-instalaciones"));
      translateVisibleText(document.getElementById("view-trabajos"));
      translateVisibleText(document.getElementById("view-reportes"));
    } finally {
      muteObserver = false;
    }
  }

  function toggleLanguage() {
    lang = lang === "es" ? "en" : "es";
    localStorage.setItem(LANG_KEY, lang);
    applyLanguage();
  }

  function patchCoreFunctions() {
    if (window.setView && !window.setView.__i18nPatched) {
      const original = window.setView;
      const wrapped = function (view) {
        const out = original.apply(this, arguments);
        setTimeout(applyLanguage, 0);
        return out;
      };
      wrapped.__i18nPatched = true;
      window.setView = wrapped;
    }

    if (window.updateModulePdfButton && !window.updateModulePdfButton.__i18nPatched) {
      const original = window.updateModulePdfButton;
      const wrapped = function () {
        const out = original.apply(this, arguments);
        applyPdfButtonLabel();
        return out;
      };
      wrapped.__i18nPatched = true;
      window.updateModulePdfButton = wrapped;
    }

    if (window.showToast && !window.showToast.__i18nPatched) {
      const original = window.showToast;
      const wrapped = function (msg) {
        return original.call(this, translateWithPrefix(String(msg || "")));
      };
      wrapped.__i18nPatched = true;
      window.showToast = wrapped;
    }
  }

  function startObserver() {
    if (observer) observer.disconnect();
    const target = document.getElementById("appScreen") || document.body;
    observer = new MutationObserver(() => {
      if (muteObserver) return;
      applyLanguage();
    });
    observer.observe(target, { childList: true, subtree: true });
  }

  function init() {
    patchCoreFunctions();
    updateLanguageButton();
    applyLanguage();
    startObserver();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.NJCRM_I18N = {
    getLanguage: () => lang,
    setLanguage(next) {
      lang = next === "en" ? "en" : "es";
      localStorage.setItem(LANG_KEY, lang);
      applyLanguage();
    },
    apply: applyLanguage
  };
})();
