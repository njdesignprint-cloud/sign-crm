(function(){
  const translations={
    "Clientes":"Clients","Trabajos":"Jobs","Producción":"Production","Instalación":"Installation","Inventario":"Inventory","Proveedores":"Suppliers","Compras":"Purchases","Gastos":"Expenses","Reportes":"Reports","Usuarios":"Users",
    "Nuevo cliente":"New client","Nuevo trabajo":"New job","Guardar cliente":"Save client","Guardar trabajo":"Save job","Cancelar":"Cancel","Cerrar":"Close","Editar":"Edit","Eliminar":"Archive","Restaurar":"Restore",
    "Nombre":"Name","Empresa":"Company","Teléfono":"Phone","Correo":"Email","Dirección":"Address","Notas":"Notes","Acciones":"Actions","Estado":"Status","Fecha":"Date","Entrega":"Due date","Prioridad":"Priority","Responsable":"Assignee",
    "Todos los estados":"All statuses","Todas las prioridades":"All priorities","Todos los tipos":"All types","Limpiar filtros":"Clear filters","Vista tabla":"Table view","Vista Kanban":"Kanban view",
    "Cotización":"Estimate","Aprobado":"Approved","Diseño":"Design","Enviado":"Sent","Producción":"Production","Instalación":"Installation","Entregado":"Delivered","Pagado":"Paid","Cancelado":"Canceled",
    "Baja":"Low","Media":"Medium","Alta":"High","Pendiente":"Pending","Activa":"Active","Bloqueada":"Blocked","Activo":"Active","Inactivo":"Inactive",
    "Venta:":"Sale:","Costo:":"Cost:","Ganancia:":"Profit:","Pagado:":"Paid:","Saldo:":"Balance:","Creado:":"Created:","Materiales":"Materials","Mano de obra":"Labor","Gastos extra":"Extra costs","Costo interno":"Internal cost","Margen":"Margin",
    "Agregar pago":"Add payment","Agregar gasto":"Add expense","Agregar material":"Add material","Agregar ítem":"Add item","Crear orden de compra":"Create purchase order","Guardar cambios":"Save changes","Guardar nota":"Save note",
    "Período del dashboard":"Dashboard period","Últimos 30 días":"Last 30 days","Este mes":"This month","Mes pasado":"Last month","Año actual":"Current year","Ventas del período":"Period sales","Cobrado del período":"Collected","Gastos del período":"Period expenses","Ganancia neta":"Net profit",
    "Por cobrar":"Accounts receivable","En proceso":"In progress","Trabajos con saldo":"Jobs with balance","Centro de alertas":"Alert center","Trabajos vencidos":"Overdue jobs","Sin responsable":"Unassigned","Esperando cliente":"Waiting for client","En producción":"In production",
    "Materiales / costo interno":"Materials / internal cost","Cotización / Orden de trabajo":"Estimate / work order","Precio final y rentabilidad":"Final price and profitability","Estimador rápido de trabajos":"Quick job estimator","Checklist de producción":"Production checklist","Pagos registrados":"Recorded payments","Gastos ligados al trabajo":"Job-linked expenses","Bitácora interna":"Internal log","Historial de cambios":"Change history","Diseños / fotos del trabajo":"Job designs / photos",
    "No hay clientes guardados.":"No clients saved.","No hay trabajos guardados.":"No jobs saved.","No hay usuarios del equipo todavía.":"No team users yet.","No hay cuentas registradas todavía.":"No registered accounts yet.","Sin fecha":"No date","Sin programar":"Not scheduled","Pendiente confirmar":"Pending confirmation",
    "Usuario activo:":"Active user:","Cerrar sesión":"Sign out","Respaldo JSON":"JSON backup","Importar JSON":"Import JSON","Papelera y recuperación":"Trash & recovery"
  };
  const placeholders={
    "Buscar por nombre, empresa, teléfono o email":"Search by name, company, phone or email","Buscar por cliente o trabajo":"Search by client or job","Nombre del cliente":"Client name","Empresa":"Company","Correo electrónico":"Email address","Dirección":"Address","Ciudad / Estado":"City / State","Notas del cliente":"Client notes","Trabajo / proyecto":"Job / project","Precio final al cliente":"Final customer price","Descripción del trabajo / cotización":"Job / estimate description","Notas generales internas":"Internal notes","Buscar por empresa, nombre o correo":"Search company, name or email"
  };
  const originals=new WeakMap(); const attrOriginals=new WeakMap();
  function lang(){try{return localStorage.getItem("signshophq_lang_v2")||"en"}catch(_){return"en"}}
  function translateNode(node){
    if(node.nodeType===3){const raw=node.nodeValue||"";const key=raw.trim();if(!key)return;if(lang()==="en"&&translations[key]){if(!originals.has(node))originals.set(node,raw);node.nodeValue=raw.replace(key,translations[key]);}else if(lang()==="es"&&originals.has(node)){node.nodeValue=originals.get(node);}}
    if(node.nodeType!==1)return;const el=node;
    ["placeholder","title","aria-label"].forEach(attr=>{const value=el.getAttribute?.(attr);if(!value)return;if(lang()==="en"&&placeholders[value]){if(!attrOriginals.has(el))attrOriginals.set(el,{});const saved=attrOriginals.get(el);if(!(attr in saved))saved[attr]=value;el.setAttribute(attr,placeholders[value]);}else if(lang()==="es"){const saved=attrOriginals.get(el);if(saved?.[attr])el.setAttribute(attr,saved[attr]);}});
    el.childNodes?.forEach(translateNode);
  }
  let translating=false;function apply(){if(translating)return;translating=true;translateNode(document.body);translating=false;}
  new MutationObserver(()=>queueMicrotask(apply)).observe(document.body,{childList:true,subtree:true});
  window.addEventListener("crm-language-changed",apply);apply();
})();
