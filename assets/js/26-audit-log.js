(function () {
  const PAGE_SIZE = 50;
  const MODULES = {
    clients: ["Clients", "Clientes"], jobs: ["Jobs", "Trabajos"], expenses: ["Expenses", "Gastos"],
    recurringExpenses: ["Recurring expenses", "Gastos recurrentes"], inventoryItems: ["Inventory", "Inventario"],
    inventoryMovements: ["Inventory movements", "Movimientos de inventario"], providers: ["Suppliers", "Proveedores"],
    purchaseOrders: ["Purchases", "Compras"], teamMembers: ["Team", "Equipo"], workspaceMembers: ["Access", "Accesos"],
    salespeople: ["Salespeople", "Vendedores"], commissionSettlements: ["Commissions", "Comisiones"],
    weeklySettlements: ["Weekly settlements", "Liquidaciones semanales"], settings: ["Settings", "Configuración"], trash: ["Trash", "Papelera"]
  };
  const TEXT = {
    en: { title:"Protected audit log", note:"Only owners and administrators can view these immutable events.", visible:"Events on this page", create:"Created", update:"Updated", delete:"Deleted", refresh:"Refresh", search:"Search user, record ID or changed field", allModules:"All modules", allActions:"All actions", clear:"Clear filters", loading:"Loading audit events…", empty:"No events match these filters.", page:"Page", previous:"Previous", next:"Next", heads:["Date and time","User","Action","Module","Record","Changed fields"], noFields:"No field list", system:"System" },
    es: { title:"Registro de auditoría protegido", note:"Solo propietarios y administradores pueden consultar estos eventos inmutables.", visible:"Eventos en esta página", create:"Creado", update:"Actualizado", delete:"Eliminado", refresh:"Actualizar", search:"Buscar usuario, ID o campo modificado", allModules:"Todos los módulos", allActions:"Todas las acciones", clear:"Limpiar filtros", loading:"Cargando eventos…", empty:"Ningún evento coincide con los filtros.", page:"Página", previous:"Anterior", next:"Siguiente", heads:["Fecha y hora","Usuario","Acción","Módulo","Registro","Campos modificados"], noFields:"Sin lista de campos", system:"Sistema" }
  };
  const auditState = { docs:[], cursors:[null], page:0, hasNext:false, loading:false, loadedOwner:"" };
  let auditLanguage = document.documentElement.lang === "es" ? "es" : "en";
  const el = id => document.getElementById(id);
  const language = () => auditLanguage;
  const copy = () => TEXT[language()];
  const ownerId = () => (typeof state !== "undefined" ? (state.accountOwnerId || state.uid) : "") || "";
  const moduleName = id => (MODULES[id] || [id, id])[language() === "es" ? 1 : 0];
  const eventDate = value => typeof value?.toDate === "function" ? value.toDate() : value?.seconds ? new Date(value.seconds * 1000) : new Date(value || 0);
  const actionLabel = action => copy()[action] || action || "-";
  const actionClass = action => ({ create:"st-aprobado", update:"st-produccion", delete:"st-cancelado" }[action] || "pr-media");
  function actorLabel(uid) {
    if (!uid) return copy().system;
    if (uid === state?.uid) return state.userEmail || uid;
    const member = (state?.teamMembers || []).find(item => item.uid === uid || item.id === uid);
    return member?.name || member?.email || uid;
  }
  function filteredDocs() {
    const search = String(el("auditSearch")?.value || "").trim().toLowerCase();
    const moduleId = el("auditModuleFilter")?.value || "";
    const operation = el("auditOperationFilter")?.value || "";
    const from = el("auditFrom")?.value || "";
    const to = el("auditTo")?.value || "";
    return auditState.docs.filter(item => {
      const day = eventDate(item.occurredAt).toISOString().slice(0, 10);
      const haystack = [actorLabel(item.actorUid), item.actorUid, item.documentId, item.collectionId, ...(item.changedFields || [])].join(" ").toLowerCase();
      return (!search || haystack.includes(search)) && (!moduleId || item.collectionId === moduleId) && (!operation || item.operation === operation) && (!from || day >= from) && (!to || day <= to);
    });
  }
  function renderAuditLog() {
    if (!el("auditBody")) return;
    const c = copy();
    const docs = filteredDocs();
    el("auditBody").innerHTML = docs.map(item => {
      const date = eventDate(item.occurredAt);
      const formatted = Number.isNaN(date.getTime()) ? "-" : date.toLocaleString(language() === "es" ? "es-US" : "en-US");
      const fields = (item.changedFields || []).length ? item.changedFields.map(field => `<span class="audit-field">${safe(field)}</span>`).join("") : `<span class="muted">${c.noFields}</span>`;
      return `<tr><td>${safe(formatted)}</td><td><strong>${safe(actorLabel(item.actorUid))}</strong><div class="audit-uid">${safe(item.actorUid || item.actorType || "-")}</div></td><td><span class="pill ${actionClass(item.operation)}">${safe(actionLabel(item.operation))}</span></td><td>${safe(moduleName(item.collectionId))}</td><td><code>${safe(item.documentId || "-")}</code></td><td><div class="audit-fields">${fields}</div></td></tr>`;
    }).join("");
    el("auditEmpty").classList.toggle("hidden", auditState.loading || docs.length > 0);
    el("auditVisibleCount").textContent = docs.length;
    ["create","update","delete"].forEach(action => { el(`audit${action[0].toUpperCase()}${action.slice(1)}sCount`).textContent = docs.filter(item => item.operation === action).length; });
    el("auditPageLabel").textContent = `${c.page} ${auditState.page + 1}`;
    el("btnAuditPrev").disabled = auditState.loading || auditState.page === 0;
    el("btnAuditNext").disabled = auditState.loading || !auditState.hasNext;
  }
  async function loadAuditPage(page = 0) {
    if (auditState.loading || !ownerId() || typeof isAdmin !== "function" || !isAdmin()) return;
    auditState.loading = true;
    el("auditLoading")?.classList.remove("hidden");
    el("auditEmpty")?.classList.add("hidden");
    renderAuditLog();
    try {
      let query = db.collection("workspaceAudit").doc(ownerId()).collection("events").orderBy("occurredAt", "desc").limit(PAGE_SIZE + 1);
      const cursor = auditState.cursors[page];
      if (cursor) query = query.startAfter(cursor);
      const snapshot = await query.get();
      auditState.hasNext = snapshot.docs.length > PAGE_SIZE;
      const visible = snapshot.docs.slice(0, PAGE_SIZE);
      auditState.docs = visible.map(doc => ({ id:doc.id, ...doc.data() }));
      auditState.page = page;
      auditState.loadedOwner = ownerId();
      auditState.cursors[page + 1] = visible.length ? visible[visible.length - 1] : null;
    } catch (error) {
      console.error(error);
      showToast(language() === "es" ? "No se pudo cargar la auditoría." : "Could not load the audit log.");
      auditState.docs = [];
      auditState.hasNext = false;
    } finally {
      auditState.loading = false;
      el("auditLoading")?.classList.add("hidden");
      renderAuditLog();
    }
  }
  function applyAuditLanguage() {
    if (!el("auditTitle")) return;
    const c = copy();
    el("auditTitle").textContent = c.title; el("auditNote").textContent = c.note; el("auditVisibleLabel").textContent = c.visible;
    el("auditCreatesLabel").textContent = c.create; el("auditUpdatesLabel").textContent = c.update; el("auditDeletesLabel").textContent = c.delete;
    el("btnAuditRefresh").textContent = c.refresh; el("auditSearch").placeholder = c.search; el("btnAuditClear").textContent = c.clear;
    el("auditLoading").textContent = c.loading; el("auditEmpty").textContent = c.empty; el("btnAuditPrev").textContent = c.previous; el("btnAuditNext").textContent = c.next;
    ["auditTimeHead","auditUserHead","auditActionHead","auditModuleHead","auditRecordHead","auditFieldsHead"].forEach((id,index) => { el(id).textContent = c.heads[index]; });
    const moduleSelect = el("auditModuleFilter"); const selectedModule = moduleSelect.value;
    moduleSelect.innerHTML = `<option value="">${c.allModules}</option>` + Object.keys(MODULES).map(id => `<option value="${id}">${safe(moduleName(id))}</option>`).join(""); moduleSelect.value = selectedModule;
    const operationSelect = el("auditOperationFilter"); const selectedOperation = operationSelect.value;
    operationSelect.innerHTML = `<option value="">${c.allActions}</option><option value="create">${c.create}</option><option value="update">${c.update}</option><option value="delete">${c.delete}</option>`; operationSelect.value = selectedOperation;
    if (typeof state !== "undefined" && state.currentView === "auditoria") {
      el("pageTitle").textContent = language() === "es" ? "Auditoría" : "Audit log";
      el("pageSubtitle").textContent = language() === "es" ? "Consulta la actividad protegida del espacio y quién realizó cada cambio." : "Review protected workspace activity and the user responsible for each change.";
    }
    renderAuditLog();
  }
  window.activateAuditLogView = function () {
    applyAuditLanguage();
    if (auditState.loadedOwner !== ownerId() || !auditState.docs.length) { auditState.cursors = [null]; loadAuditPage(0); }
  };
  window.addEventListener("crm-language-changed", event => { auditLanguage = event.detail?.language === "es" ? "es" : "en"; applyAuditLanguage(); });
  document.addEventListener("DOMContentLoaded", () => {
    auditLanguage = document.documentElement.lang === "es" ? "es" : "en";
    ["auditSearch","auditModuleFilter","auditOperationFilter","auditFrom","auditTo"].forEach(id => { el(id)?.addEventListener("input", renderAuditLog); el(id)?.addEventListener("change", renderAuditLog); });
    el("btnAuditRefresh")?.addEventListener("click", () => { auditState.cursors = [null]; loadAuditPage(0); });
    el("btnAuditPrev")?.addEventListener("click", () => loadAuditPage(Math.max(0, auditState.page - 1)));
    el("btnAuditNext")?.addEventListener("click", () => auditState.hasNext && loadAuditPage(auditState.page + 1));
    el("btnAuditClear")?.addEventListener("click", () => { ["auditSearch","auditModuleFilter","auditOperationFilter","auditFrom","auditTo"].forEach(id => { if (el(id)) el(id).value = ""; }); renderAuditLog(); });
    applyAuditLanguage();
  });
})();
