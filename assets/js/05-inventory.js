    function fillMovementItemSelect(selectedId = "") {
      const select = $("movementItemId");
      if (!state.inventoryItems.length) {
        select.innerHTML = `<option value="">Primero crea un ítem</option>`;
        return;
      }
      select.innerHTML = state.inventoryItems
        .slice()
        .sort((a, b) => cleanText(a.name).localeCompare(cleanText(b.name)))
        .map(item => `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${safe(item.name || "Material")} · ${safe(item.sku || "-")}</option>`)
        .join("");
    }
    function resetInventoryForm() {
      state.editingInventoryId = null;
      $("inventoryModalTitle").textContent = "Nuevo ítem de inventario";
      $("inventoryName").value = "";
      $("inventorySku").value = "";
      $("inventoryCategory").value = "Vinil";
      $("inventoryUnit").value = "ft";
      $("inventoryStock").value = "";
      $("inventoryMinStock").value = "";
      $("inventoryUnitCost").value = "";
      $("inventoryLocation").value = "";
      $("inventorySupplier").value = "";
      $("inventoryNotes").value = "";
    }
    function resetMovementForm(itemId = "") {
      state.workingMovementItemId = itemId || "";
      fillMovementItemSelect(itemId || "");
      $("movementType").value = "entrada";
      $("movementQty").value = "";
      $("movementDate").value = today();
      $("movementUnitCost").value = "";
      $("movementReference").value = "";
      $("movementNote").value = "";
    }
    async function saveInventoryItem() {
      if (!guardWrite("guardar inventario", "inventario")) return;
      const payload = {
        name: cleanText($("inventoryName").value),
        sku: cleanText($("inventorySku").value),
        category: cleanText($("inventoryCategory").value) || "Otro",
        unit: cleanText($("inventoryUnit").value) || "pieza",
        stock: Number($("inventoryStock").value || 0),
        minStock: Number($("inventoryMinStock").value || 0),
        unitCost: Number($("inventoryUnitCost").value || 0),
        location: cleanText($("inventoryLocation").value),
        supplier: cleanText($("inventorySupplier").value),
        notes: cleanText($("inventoryNotes").value),
        lastMovementAt: state.editingInventoryId ? (getInventoryItemById(state.editingInventoryId)?.lastMovementAt || "") : "",
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!payload.name) return showToast("Escribe el nombre del material.");
      if (payload.stock < 0) return showToast("El stock no puede ser negativo.");
      if (payload.minStock < 0) return showToast("El stock mínimo no puede ser negativo.");
      if (payload.unitCost < 0) return showToast("El costo unitario no puede ser negativo.");

      try {
        if (state.editingInventoryId) {
          await inventoryRef().doc(state.editingInventoryId).update(payload);
          showToast("Ítem actualizado.");
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await inventoryRef().add(payload);
          showToast("Ítem guardado.");
        }
        closeModal("inventoryModal");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el ítem.");
      }
    }
    async function saveMovement() {
      if (!guardWrite("guardar movimientos de inventario", "inventario")) return;
      const itemId = cleanText($("movementItemId").value);
      const type = cleanText($("movementType").value) || "entrada";
      const rawQty = Number($("movementQty").value || 0);
      const date = cleanText($("movementDate").value) || today();
      const unitCost = Number($("movementUnitCost").value || 0);
      const reference = cleanText($("movementReference").value);
      const note = cleanText($("movementNote").value);

      if (!itemId) return showToast("Selecciona un material.");
      if (!rawQty) return showToast("Escribe una cantidad.");
      if (type !== "ajuste" && rawQty < 0) return showToast("La cantidad debe ser positiva.");
      if (unitCost < 0) return showToast("El costo unitario no puede ser negativo.");

      const item = getInventoryItemById(itemId);
      if (!item) return showToast("No se encontró el material.");

      const currentStock = Number(item.stock || 0);
      let delta = rawQty;

      if (type === "salida") delta = -Math.abs(rawQty);
      if (type === "entrada") delta = Math.abs(rawQty);

      const newStock = currentStock + delta;
      if (newStock < 0) return showToast("No puedes dejar el stock en negativo.");

      const movement = {
        itemId,
        itemName: item.name || "",
        itemSku: item.sku || "",
        type,
        qty: delta,
        beforeStock: currentStock,
        afterStock: newStock,
        date,
        reference,
        note,
        unitCost: unitCost > 0 ? unitCost : Number(item.unitCost || 0),
        createdBy: state.userEmail || "usuario",
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      try {
        await inventoryMovementsRef().add(movement);
        const updatePayload = {
          stock: newStock,
          lastMovementAt: date,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (unitCost > 0) updatePayload.unitCost = unitCost;
        await inventoryRef().doc(itemId).update(updatePayload);
        showToast("Movimiento guardado.");
        closeModal("movementModal");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el movimiento.");
      }
    }
    function editInventoryItem(id) {
      if (!canWriteData("inventario")) return showToast("No tienes permiso para editar inventario.");
      const item = getInventoryItemById(id);
      if (!item) return;
      state.editingInventoryId = id;
      $("inventoryModalTitle").textContent = "Editar ítem de inventario";
      $("inventoryName").value = item.name || "";
      $("inventorySku").value = item.sku || "";
      $("inventoryCategory").value = item.category || "Otro";
      $("inventoryUnit").value = item.unit || "pieza";
      $("inventoryStock").value = item.stock ?? "";
      $("inventoryMinStock").value = item.minStock ?? "";
      $("inventoryUnitCost").value = item.unitCost ?? "";
      $("inventoryLocation").value = item.location || "";
      $("inventorySupplier").value = item.supplier || "";
      $("inventoryNotes").value = item.notes || "";
      openModal("inventoryModal");
    }
    function getFilteredInventory() {
      const q = cleanText($("inventorySearch").value).toLowerCase();
      const category = cleanText($("inventoryCategoryFilter").value);
      const stockFilter = cleanText($("inventoryStockFilter").value);

      return state.inventoryItems.filter(item => {
        const bag = `${item.name || ""} ${item.sku || ""} ${item.category || ""} ${item.supplier || ""} ${item.location || ""}`.toLowerCase();
        const status = getInventoryStockStatus(item);
        const okText = bag.includes(q);
        const okCategory = !category || item.category === category;
        const okStock = !stockFilter || status === stockFilter;
        return okText && okCategory && okStock;
      }).sort((a, b) => cleanText(a.name).localeCompare(cleanText(b.name)));
    }
    function renderInventory() {
      const rows = getFilteredInventory();

      $("inventoryBody").innerHTML = rows.map(item => `
        <tr>
          <td>${safe(item.sku || "-")}</td>
          <td>
            <div><strong>${safe(item.name || "-")}</strong></div>
            <small>${safe(item.supplier || "-")}</small>
          </td>
          <td>${safe(item.category || "-")}</td>
          <td>${safe(item.unit || "-")}</td>
          <td>
            <div><strong>${Number(item.stock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
            <small>${stockPill(item)}</small>
          </td>
          <td>${Number(item.minStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
          <td>${money(item.unitCost || 0)}</td>
          <td>${money(inventoryValue(item))}</td>
          <td>${safe(item.location || "-")}</td>
          <td>${safe(item.lastMovementAt || "-")}</td>
          <td>
            <div class="actions-row">
              ${canWriteData("inventario") ? `<button class="btn btn-info btn-small" data-move-item="${item.id}">Movimiento</button>` : ""}
              ${canWriteData("inventario") ? `<button class="btn btn-secondary btn-small" data-edit-inventory="${item.id}">Editar</button>` : ""}
              ${canDeleteData("inventario") ? `<button class="btn btn-danger btn-small" data-delete-inventory="${item.id}">Eliminar</button>` : ""}
            </div>
          </td>
        </tr>
      `).join("");

      $("inventoryEmpty").classList.toggle("hidden", rows.length > 0);

      const totalItems = state.inventoryItems.length;
      const totalValue = state.inventoryItems.reduce((sum, item) => sum + inventoryValue(item), 0);
      const lowCount = state.inventoryItems.filter(item => getInventoryStockStatus(item) === "low").length;
      const outCount = state.inventoryItems.filter(item => getInventoryStockStatus(item) === "out").length;

      $("invTotalItems").textContent = String(totalItems);
      $("invTotalValue").textContent = money(totalValue);
      $("invLowCount").textContent = String(lowCount);
      $("invOutCount").textContent = String(outCount);

      fillMovementItemSelect($("movementItemId")?.value || "");
      refreshOpenMaterialInventorySelects();
    }
    function renderInventoryMovements() {
      const rows = state.inventoryMovements
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        .slice(0, 80);

      $("inventoryMovementsBody").innerHTML = rows.map(item => {
        const material = getInventoryItemById(item.itemId);
        return `
          <tr>
            <td>${safe(item.date || "-")}</td>
            <td>${safe(material?.name || item.itemName || "-")}<br><small>${safe(material?.sku || item.itemSku || "-")}</small></td>
            <td>${movementPill(item.type || "ajuste")}</td>
            <td>${Number(item.qty || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            <td>${Number(item.beforeStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            <td>${Number(item.afterStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
            <td>${safe(item.reference || "-")}</td>
            <td><small>${safe(item.note || "-")}</small></td>
          </tr>
        `;
      }).join("");

      $("inventoryMovementsEmpty").classList.toggle("hidden", rows.length > 0);
    }
