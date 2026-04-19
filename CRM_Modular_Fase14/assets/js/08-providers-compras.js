    function providerDisplayName(provider = {}) {
      return cleanText(provider.name) || cleanText(provider.contact) || "Proveedor";
    }
    function getProviderByName(name = "") {
      const key = normalizeMatchText(name);
      return state.providers.find(provider => normalizeMatchText(providerDisplayName(provider)) === key) || null;
    }
    function getPurchaseOrderItems(po = {}) {
      return Array.isArray(po.items) ? [...po.items] : [];
    }
    function getPurchaseOrderTotal(po = {}) {
      return getPurchaseOrderItems(po).reduce((sum, item) => sum + Number(item.total || (Number(item.qty || 0) * Number(item.unitCost || 0))), 0);
    }
    function getProviderInventoryItems(provider = {}) {
      const providerName = providerDisplayName(provider);
      const key = normalizeMatchText(providerName);
      if (!key) return [];
      return state.inventoryItems.filter(item => normalizeMatchText(item.supplier) === key);
    }
    function getProviderPurchaseOrders(provider = {}) {
      const providerName = providerDisplayName(provider);
      const providerId = cleanText(provider.id);
      return state.purchaseOrders.filter(po => cleanText(po.providerId) === providerId || normalizeMatchText(po.providerName) === normalizeMatchText(providerName));
    }
    function getFilteredProviders() {
      const q = normalizeMatchText($("providerSearch")?.value);
      return state.providers
        .slice()
        .sort((a, b) => providerDisplayName(a).localeCompare(providerDisplayName(b)))
        .filter(provider => {
          if (!q) return true;
          const bag = normalizeMatchText(`${provider.name || ""} ${provider.contact || ""} ${provider.phone || ""} ${provider.email || ""} ${provider.city || ""} ${provider.notes || ""}`);
          return bag.includes(q);
        });
    }
    function fillPurchaseOrderProviderSelect(selectedId = "") {
      const select = $("purchaseOrderProviderId");
      if (!select) return;
      const current = selectedId || cleanText(select.value);
      const options = ['<option value="">Proveedor</option>']
        .concat(state.providers
          .slice()
          .sort((a, b) => providerDisplayName(a).localeCompare(providerDisplayName(b)))
          .map(provider => `<option value="${provider.id}" ${provider.id === current ? "selected" : ""}>${safe(providerDisplayName(provider))}</option>`));
      select.innerHTML = options.join("");
    }
    function fillPurchaseOrderJobSelect(selectedId = "") {
      const select = $("purchaseOrderJobId");
      if (!select) return;
      const current = selectedId || cleanText(select.value);
      const options = ['<option value="">Trabajo opcional</option>']
        .concat(state.jobs
          .slice()
          .sort((a, b) => cleanText(b.date).localeCompare(cleanText(a.date)))
          .map(job => `<option value="${job.id}" ${job.id === current ? "selected" : ""}>${safe(getJobDisplayLabel(job))}</option>`));
      select.innerHTML = options.join("");
    }
    function fillPurchaseOrderSupplierFilter() {
      const select = $("purchaseOrderSupplierFilter");
      if (!select) return;
      const current = cleanText(select.value);
      const options = ['<option value="">Todos los proveedores</option>']
        .concat(state.providers
          .slice()
          .sort((a, b) => providerDisplayName(a).localeCompare(providerDisplayName(b)))
          .map(provider => `<option value="${provider.id}" ${provider.id === current ? "selected" : ""}>${safe(providerDisplayName(provider))}</option>`));
      select.innerHTML = options.join("");
      if (current && !state.providers.some(provider => provider.id === current)) select.value = "";
    }
    function renderProvidersDatalist() {
      const datalist = $("providersDatalist");
      if (!datalist) return;
      datalist.innerHTML = state.providers
        .slice()
        .sort((a, b) => providerDisplayName(a).localeCompare(providerDisplayName(b)))
        .map(provider => `<option value="${safe(providerDisplayName(provider))}"></option>`)
        .join("");
    }
    function renderProviders() {
      const rows = getFilteredProviders();
      const tbody = $("providersBody");
      if (!tbody) return;

      $("providersTotal").textContent = String(state.providers.length);
      $("providersLinkedInventory").textContent = String(state.inventoryItems.filter(item => cleanText(item.supplier)).length);
      $("providersOpenOrders").textContent = String(state.purchaseOrders.filter(po => !["Recibida", "Cancelada"].includes(po.status)).length);
      $("providersReceivedOrders").textContent = String(state.purchaseOrders.filter(po => po.status === "Recibida").length);

      $("providersEmpty").classList.toggle("hidden", rows.length > 0);

      tbody.innerHTML = rows.map(provider => {
        const inventoryCount = getProviderInventoryItems(provider).length;
        const orders = getProviderPurchaseOrders(provider);
        const openOrders = orders.filter(po => !["Recibida", "Cancelada"].includes(po.status)).length;
        return `
          <tr>
            <td><strong>${safe(providerDisplayName(provider))}</strong></td>
            <td>${safe(provider.contact || "-")}</td>
            <td>${safe(provider.phone || "-")}</td>
            <td>${safe(provider.email || "-")}</td>
            <td>${safe(provider.city || "-")}</td>
            <td>${inventoryCount}</td>
            <td>${openOrders}</td>
            <td>${safe(provider.notes || "-")}</td>
            <td>
              <div class="actions-row">
                ${canWriteData("proveedores") ? `<button class="btn btn-secondary btn-small" data-edit-provider="${provider.id}">Editar</button>` : ""}
                ${canDeleteData("proveedores") ? `<button class="btn btn-danger btn-small" data-delete-provider="${provider.id}">Eliminar</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
    function resetProviderForm() {
      state.editingProviderId = null;
      if ($("providerModalTitle")) $("providerModalTitle").textContent = "Nuevo proveedor";
      if ($("providerName")) $("providerName").value = "";
      if ($("providerContact")) $("providerContact").value = "";
      if ($("providerPhone")) $("providerPhone").value = "";
      if ($("providerEmail")) $("providerEmail").value = "";
      if ($("providerAddress")) $("providerAddress").value = "";
      if ($("providerCity")) $("providerCity").value = "";
      if ($("providerNotes")) $("providerNotes").value = "";
    }
    function editProvider(id) {
      if (!canWriteData("proveedores")) return showToast("No tienes permiso para editar proveedores.");
      const provider = getProviderById(id);
      if (!provider) return;
      state.editingProviderId = id;
      $("providerModalTitle").textContent = "Editar proveedor";
      $("providerName").value = provider.name || "";
      $("providerContact").value = provider.contact || "";
      $("providerPhone").value = provider.phone || "";
      $("providerEmail").value = provider.email || "";
      $("providerAddress").value = provider.address || "";
      $("providerCity").value = provider.city || "";
      $("providerNotes").value = provider.notes || "";
      openModal("providerModal");
    }
    async function saveProvider() {
      if (!guardWrite("guardar proveedores", "proveedores")) return;
      const payload = {
        name: cleanText($("providerName").value),
        contact: cleanText($("providerContact").value),
        phone: cleanText($("providerPhone").value),
        email: cleanText($("providerEmail").value),
        address: cleanText($("providerAddress").value),
        city: cleanText($("providerCity").value),
        notes: cleanText($("providerNotes").value),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!payload.name) return showToast("Escribe el nombre del proveedor.");

      try {
        if (state.editingProviderId) {
          await providersRef().doc(state.editingProviderId).update(payload);
          showToast("Proveedor actualizado.");
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await providersRef().add(payload);
          showToast("Proveedor guardado.");
        }
        closeModal("providerModal");
        resetProviderForm();
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el proveedor.");
      }
    }
    function createPurchaseOrderLineRow(item = {}) {
      const row = document.createElement("div");
      row.className = "row-po-item";

      const inventoryOptions = ['<option value="">Ítem inventario opcional</option>']
        .concat(state.inventoryItems
          .slice()
          .sort((a, b) => cleanText(a.name).localeCompare(cleanText(b.name)))
          .map(inv => `<option value="${inv.id}" ${inv.id === cleanText(item.inventoryId) ? "selected" : ""}>${safe(inv.name || "Material")} · ${safe(inv.sku || "-")}</option>`));

      row.innerHTML = `
        <select class="select po-inventory-id">${inventoryOptions.join("")}</select>
        <input class="input po-name" placeholder="Material" value="${safe(item.name || "")}" />
        <input class="input po-qty" type="number" min="0" step="0.01" placeholder="Cantidad" value="${cleanText(item.qty || item.toBuyQty || "")}" />
        <input class="input po-price" type="number" min="0" step="0.01" placeholder="Costo unitario" value="${cleanText(item.unitCost || item.price || "")}" />
        <button type="button" class="btn btn-danger btn-small remove-po-item">Quitar</button>
        <div class="material-stock-note">
          <span class="po-meta">${safe(item.sku || "-")} · ${safe(item.unit || "u")}</span>
        </div>
      `;

      const syncMeta = () => {
        const inventoryId = cleanText(row.querySelector(".po-inventory-id").value);
        const inventoryItem = getInventoryItemById(inventoryId);
        const nameInput = row.querySelector(".po-name");
        const priceInput = row.querySelector(".po-price");
        const meta = row.querySelector(".po-meta");

        if (inventoryItem) {
          if (!cleanText(nameInput.value) || cleanText(nameInput.value) === cleanText(item.name || "")) nameInput.value = inventoryItem.name || "";
          if (!cleanText(priceInput.value) || Number(priceInput.value) === Number(item.unitCost || item.price || 0)) priceInput.value = inventoryItem.unitCost || "";
          meta.textContent = `${inventoryItem.sku || "-"} · ${inventoryItem.unit || "u"} · Stock ${Number(inventoryItem.stock || 0).toFixed(2)}`;
        } else {
          meta.textContent = `${item.sku || "-"} · ${item.unit || "u"}`;
        }
        recalcPurchaseOrderTotals();
      };

      row.querySelector(".po-inventory-id").addEventListener("change", syncMeta);
      row.querySelector(".po-name").addEventListener("input", recalcPurchaseOrderTotals);
      row.querySelector(".po-qty").addEventListener("input", recalcPurchaseOrderTotals);
      row.querySelector(".po-price").addEventListener("input", recalcPurchaseOrderTotals);
      row.querySelector(".remove-po-item").addEventListener("click", () => {
        row.remove();
        if (!$("purchaseOrderItemsContainer").children.length) {
          $("purchaseOrderItemsContainer").appendChild(createPurchaseOrderLineRow());
        }
        recalcPurchaseOrderTotals();
      });

      setTimeout(syncMeta, 0);
      return row;
    }
    function getCurrentPurchaseOrderLines() {
      return [...$("purchaseOrderItemsContainer").querySelectorAll(".row-po-item")]
        .map(row => {
          const inventoryId = cleanText(row.querySelector(".po-inventory-id").value);
          const inventoryItem = getInventoryItemById(inventoryId);
          const name = cleanText(row.querySelector(".po-name").value) || inventoryItem?.name || "";
          const qty = Number(row.querySelector(".po-qty").value || 0);
          const unitCost = Number(row.querySelector(".po-price").value || 0);
          const unit = inventoryItem?.unit || "u";
          const sku = inventoryItem?.sku || "";
          const supplier = inventoryItem?.supplier || "";
          return {
            inventoryId,
            name,
            sku,
            unit,
            qty,
            unitCost,
            supplier,
            total: qty * unitCost
          };
        })
        .filter(item => item.name && Number(item.qty || 0) > 0);
    }
    function recalcPurchaseOrderTotals() {
      const total = getCurrentPurchaseOrderLines().reduce((sum, item) => sum + Number(item.total || 0), 0);
      $("purchaseOrderTotal").textContent = money(total);
    }
    function generatePurchaseOrderNumber() {
      return "PO-" + new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 12);
    }
    function buildPurchaseOrderItemsFromJob(jobId = "", providerId = "") {
      const job = getJobById(jobId);
      if (!job) return [];
      const provider = getProviderById(providerId);
      const providerKey = normalizeMatchText(providerDisplayName(provider));

      return getJobPurchaseList(job)
        .filter(item => {
          if (!providerKey) return true;
          return normalizeMatchText(item.supplier) === providerKey;
        })
        .map(item => {
          const inventoryItem = getInventoryItemById(item.inventoryId);
          return {
            inventoryId: item.inventoryId || "",
            name: item.name || inventoryItem?.name || "Material",
            sku: item.sku || inventoryItem?.sku || "",
            unit: item.unit || inventoryItem?.unit || "u",
            qty: Number(item.toBuyQty || item.requiredQty || 0),
            unitCost: Number(inventoryItem?.unitCost || 0),
            supplier: item.supplier || inventoryItem?.supplier || ""
          };
        })
        .filter(item => Number(item.qty || 0) > 0);
    }
    function loadPurchaseOrderItemsFromSelectedJob(soft = false) {
      const jobId = cleanText($("purchaseOrderJobId").value);
      if (!jobId) {
        if (!soft) showToast("Selecciona un trabajo primero.");
        return;
      }

      const providerId = cleanText($("purchaseOrderProviderId").value);
      const items = buildPurchaseOrderItemsFromJob(jobId, providerId);

      if (!items.length) {
        if (!soft) showToast(providerId ? "Ese proveedor no tiene faltantes en este trabajo." : "Ese trabajo no tiene faltantes para comprar.");
        return;
      }

      const container = $("purchaseOrderItemsContainer");
      container.innerHTML = "";
      items.forEach(item => container.appendChild(createPurchaseOrderLineRow(item)));
      recalcPurchaseOrderTotals();
      if (!soft) showToast("Faltantes cargados en la orden.");
    }
    function resetPurchaseOrderForm(jobId = "", providerId = "") {
      state.editingPurchaseOrderId = null;
      $("purchaseOrderModalTitle").textContent = "Nueva orden de compra";
      $("purchaseOrderNumber").value = generatePurchaseOrderNumber();
      fillPurchaseOrderProviderSelect(providerId || "");
      fillPurchaseOrderJobSelect(jobId || "");
      $("purchaseOrderProviderId").value = providerId || "";
      $("purchaseOrderJobId").value = jobId || "";
      $("purchaseOrderDate").value = today();
      $("purchaseOrderExpectedDate").value = "";
      $("purchaseOrderStatus").value = "Borrador";
      $("purchaseOrderNotes").value = "";
      $("purchaseOrderItemsContainer").innerHTML = "";
      $("purchaseOrderItemsContainer").appendChild(createPurchaseOrderLineRow());
      recalcPurchaseOrderTotals();
    }
    function editPurchaseOrder(id) {
      if (!canWriteData("compras")) return showToast("No tienes permiso para editar compras.");
      const po = getPurchaseOrderById(id);
      if (!po) return;
      state.editingPurchaseOrderId = id;
      $("purchaseOrderModalTitle").textContent = "Editar orden de compra";
      $("purchaseOrderNumber").value = po.number || generatePurchaseOrderNumber();
      fillPurchaseOrderProviderSelect(cleanText(po.providerId));
      fillPurchaseOrderJobSelect(cleanText(po.jobId));
      $("purchaseOrderProviderId").value = po.providerId || "";
      $("purchaseOrderJobId").value = po.jobId || "";
      $("purchaseOrderDate").value = po.date || today();
      $("purchaseOrderExpectedDate").value = po.expectedDate || "";
      $("purchaseOrderStatus").value = po.status || "Borrador";
      $("purchaseOrderNotes").value = po.notes || "";
      $("purchaseOrderItemsContainer").innerHTML = "";
      const items = getPurchaseOrderItems(po);
      if (items.length) items.forEach(item => $("purchaseOrderItemsContainer").appendChild(createPurchaseOrderLineRow(item)));
      else $("purchaseOrderItemsContainer").appendChild(createPurchaseOrderLineRow());
      recalcPurchaseOrderTotals();
      openModal("purchaseOrderModal");
    }
    async function savePurchaseOrder() {
      if (!guardWrite("guardar órdenes de compra", "compras")) return;
      const providerId = cleanText($("purchaseOrderProviderId").value);
      const provider = getProviderById(providerId);
      const jobId = cleanText($("purchaseOrderJobId").value);
      const job = getJobById(jobId);
      const items = getCurrentPurchaseOrderLines();

      if (!providerId) return showToast("Selecciona un proveedor.");
      if (!items.length) return showToast("Agrega al menos un ítem a la orden.");

      const existing = state.editingPurchaseOrderId ? getPurchaseOrderById(state.editingPurchaseOrderId) : null;

      const payload = {
        number: cleanText($("purchaseOrderNumber").value) || generatePurchaseOrderNumber(),
        providerId,
        providerName: providerDisplayName(provider),
        jobId,
        jobTitle: job?.title || "",
        clientId: job?.clientId || "",
        clientName: job ? clientLabel(getClientById(job.clientId)) : "",
        date: cleanText($("purchaseOrderDate").value) || today(),
        expectedDate: cleanText($("purchaseOrderExpectedDate").value),
        status: cleanText($("purchaseOrderStatus").value) || "Borrador",
        notes: cleanText($("purchaseOrderNotes").value),
        items: items.map(item => ({ ...item, total: Number(item.qty || 0) * Number(item.unitCost || 0) })),
        total: items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.unitCost || 0)), 0),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
        receivedMovementsApplied: existing?.receivedMovementsApplied || false,
        receivedAt: existing?.receivedAt || null
      };

      try {
        if (state.editingPurchaseOrderId) {
          await purchaseOrdersRef().doc(state.editingPurchaseOrderId).update(payload);
          showToast("Orden de compra actualizada.");
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await purchaseOrdersRef().add(payload);
          showToast("Orden de compra guardada.");
        }
        closeModal("purchaseOrderModal");
        resetPurchaseOrderForm();
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar la orden de compra.");
      }
    }
    function getFilteredPurchaseOrders() {
      const q = normalizeMatchText($("purchaseOrderSearch")?.value);
      const status = cleanText($("purchaseOrderStatusFilter")?.value);
      const supplierId = cleanText($("purchaseOrderSupplierFilter")?.value);

      return state.purchaseOrders
        .slice()
        .sort((a, b) => cleanText(b.date).localeCompare(cleanText(a.date)))
        .filter(po => {
          const okStatus = !status || cleanText(po.status) === status;
          const okSupplier = !supplierId || cleanText(po.providerId) === supplierId;
          const bag = normalizeMatchText(`${po.number || ""} ${po.providerName || ""} ${po.jobTitle || ""} ${po.clientName || ""} ${po.notes || ""}`);
          const okText = !q || bag.includes(q);
          return okStatus && okSupplier && okText;
        });
    }
    function purchaseOrderStatusClass(status = "") {
      return {
        "Borrador": "st-cotizacion",
        "Enviada": "st-aprobado",
        "Parcial": "st-produccion",
        "Recibida": "st-entregado",
        "Cancelada": "st-cancelado"
      }[status] || "st-cotizacion";
    }
    function purchaseOrderStatusPill(status = "") {
      return `<span class="pill ${purchaseOrderStatusClass(status)}">${safe(status || "Borrador")}</span>`;
    }
    function renderPurchaseOrders() {
      const rows = getFilteredPurchaseOrders();
      const tbody = $("purchaseOrdersBody");
      if (!tbody) return;

      fillPurchaseOrderSupplierFilter();

      const openOrders = state.purchaseOrders.filter(po => !["Recibida", "Cancelada"].includes(po.status));
      const pendingReceive = state.purchaseOrders.filter(po => !po.receivedMovementsApplied && !["Cancelada"].includes(po.status));
      $("poOpenCount").textContent = String(openOrders.length);
      $("poPendingReceiveCount").textContent = String(pendingReceive.length);
      $("poOrderedTotal").textContent = money(state.purchaseOrders.reduce((sum, po) => sum + getPurchaseOrderTotal(po), 0));
      $("poReceivedCount").textContent = String(state.purchaseOrders.filter(po => po.status === "Recibida").length);

      $("purchaseOrdersEmpty").classList.toggle("hidden", rows.length > 0);

      tbody.innerHTML = rows.map(po => {
        const items = getPurchaseOrderItems(po);
        const receiveBtn = po.receivedMovementsApplied || po.status === "Cancelada"
          ? ""
          : `<button class="btn btn-info btn-small" data-receive-po="${po.id}">Recibir stock</button>`;
        return `
          <tr>
            <td><strong>${safe(po.number || "-")}</strong></td>
            <td>${safe(po.providerName || "-")}</td>
            <td>${safe(po.jobTitle || "-")}<br><small>${safe(po.clientName || "")}</small></td>
            <td>${safe(po.date || "-")}</td>
            <td>${safe(po.expectedDate || "-")}</td>
            <td>${items.length}</td>
            <td>${money(getPurchaseOrderTotal(po))}</td>
            <td>${purchaseOrderStatusPill(po.status || "Borrador")}</td>
            <td>
              <div class="actions-row">
                ${canWriteData("compras") ? `<button class="btn btn-secondary btn-small" data-edit-po="${po.id}">Editar</button>` : ""}
                <button class="btn btn-secondary btn-small" data-po-pdf="${po.id}">PDF</button>
                ${canWriteData("compras") ? receiveBtn : ""}
                ${canDeleteData("compras") ? `<button class="btn btn-danger btn-small" data-delete-po="${po.id}">Eliminar</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");
    }
    function openPurchaseOrderFromCurrentJob() {
      if (!state.editingJobId) return showToast("Primero guarda el trabajo.");
      const job = getJobById(state.editingJobId);
      if (!job) return showToast("No se encontró el trabajo.");

      const purchaseList = getJobPurchaseList(job);
      if (!purchaseList.length) return showToast("Ese trabajo no tiene faltantes por comprar con el stock actual.");

      const supplierNames = [...new Set(purchaseList.map(item => normalizeMatchText(item.supplier)).filter(Boolean))];
      let providerId = "";
      if (supplierNames.length === 1) {
        const provider = getProviderByName(purchaseList[0].supplier);
        if (provider) providerId = provider.id;
      }

      resetPurchaseOrderForm(job.id, providerId);
      if (providerId) $("purchaseOrderProviderId").value = providerId;
      loadPurchaseOrderItemsFromSelectedJob(true);
      openModal("purchaseOrderModal");
      showToast("Orden de compra cargada desde el trabajo.");
    }
    async function receivePurchaseOrderIntoInventory(poId) {
      if (!guardWrite("recibir órdenes de compra", "compras")) return;
      const po = getPurchaseOrderById(poId);
      if (!po) return showToast("No se encontró la orden de compra.");
      if (po.receivedMovementsApplied) return showToast("Esa orden ya se recibió en inventario.");
      if (!confirm(`¿Recibir en inventario la orden ${po.number || ""}?`)) return;

      const grouped = new Map();
      getPurchaseOrderItems(po).forEach(item => {
        const inventoryId = cleanText(item.inventoryId);
        const qty = Number(item.qty || 0);
        if (!inventoryId || qty <= 0) return;
        const current = grouped.get(inventoryId) || { qty: 0, unitCost: 0, name: item.name || "", referenceItem: item };
        current.qty += qty;
        current.unitCost = Number(item.unitCost || current.unitCost || 0);
        current.referenceItem = item;
        grouped.set(inventoryId, current);
      });

      if (!grouped.size) return showToast("La orden no tiene ítems vinculados a inventario.");

      const batch = db.batch();
      let appliedCount = 0;

      grouped.forEach((group, inventoryId) => {
        const inventoryItem = getInventoryItemById(inventoryId);
        if (!inventoryItem) return;

        const beforeQty = Number(inventoryItem.stock || 0);
        const afterQty = beforeQty + Number(group.qty || 0);
        const itemRef = inventoryRef().doc(inventoryId);
        batch.update(itemRef, {
          stock: afterQty,
          unitCost: Number(group.unitCost || inventoryItem.unitCost || 0),
          supplier: cleanText(inventoryItem.supplier) || cleanText(po.providerName),
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const movementRef = inventoryMovementsRef().doc();
        batch.set(movementRef, {
          date: today(),
          itemId: inventoryId,
          itemName: inventoryItem.name || group.name || "Material",
          type: "entrada",
          qty: Number(group.qty || 0),
          beforeQty,
          afterQty,
          unitCost: Number(group.unitCost || inventoryItem.unitCost || 0),
          reference: po.number || "",
          note: `Recepción orden de compra${po.jobTitle ? " · " + po.jobTitle : ""}`,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        appliedCount += 1;
      });

      batch.update(purchaseOrdersRef().doc(poId), {
        status: "Recibida",
        receivedMovementsApplied: true,
        receivedAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      try {
        await batch.commit();
        showToast(`Orden recibida. Se actualizaron ${appliedCount} material(es).`);
      } catch (error) {
        console.error(error);
        showToast("No se pudo recibir la orden en inventario.");
      }
    }
