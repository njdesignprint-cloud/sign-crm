    function getMaterialsCost(materials = []) {
      return materials.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);
    }
    function getPaymentsList(job = {}) {
      const payments = Array.isArray(job.payments) ? [...job.payments] : [];
      if (!payments.length && Number(job.paid || 0) > 0) {
        payments.push({
          id: "legacy-" + (job.id || "job"),
          date: job.date || "",
          amount: Number(job.paid || 0),
          method: "Legacy",
          note: "Pago migrado desde una versión anterior."
        });
      }
      return payments;
    }
    function getPaymentsTotal(job = {}) {
      return getPaymentsList(job).reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }
    function getChecklist(job = {}) {
      return {
        designApproved: !!job?.checklist?.designApproved,
        materialOrdered: !!job?.checklist?.materialOrdered,
        printingDone: !!job?.checklist?.printingDone,
        cuttingDone: !!job?.checklist?.cuttingDone,
        laminationDone: !!job?.checklist?.laminationDone,
        installationScheduled: !!job?.checklist?.installationScheduled,
        installed: !!job?.checklist?.installed,
        delivered: !!job?.checklist?.delivered
      };
    }
    function checklistProgress(job = {}) {
      const ck = getChecklist(job);
      const values = Object.values(ck);
      const done = values.filter(Boolean).length;
      return `${done}/${values.length}`;
    }
    function getJobInternalNotes(job = {}) {
      return Array.isArray(job.internalNotesLog) ? [...job.internalNotesLog] : [];
    }
    function getJobActivityLog(job = {}) {
      return Array.isArray(job.activityLog) ? [...job.activityLog] : [];
    }
    function getJobDesignImages(job = {}) {
      return Array.isArray(job.designImages) ? [...job.designImages] : [];
    }
    function getJobLinkedExpenses(jobId = "") {
      if (!jobId) return [];
      return state.expenses
        .filter(expense => cleanText(expense.jobId) === cleanText(jobId))
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    }
    function getJobLinkedExpensesTotal(jobOrId = "") {
      const jobId = typeof jobOrId === "string" ? jobOrId : jobOrId?.id;
      return getJobLinkedExpenses(jobId).reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    }
    function shouldAutoApplyInventoryForStatus(status = "") {
      return INVENTORY_AUTO_APPLY_STATUSES.includes(status);
    }
    function normalizeInventoryUsage(materials = []) {
      const map = new Map();
      materials.forEach(item => {
        const inventoryId = cleanText(item.inventoryId);
        const qty = Number(item.qty || 0);
        if (!inventoryId || qty <= 0) return;
        const current = map.get(inventoryId) || {
          inventoryId,
          name: item.inventoryName || item.name || "Material",
          sku: item.inventorySku || "",
          unit: item.inventoryUnit || "",
          supplier: item.supplier || "",
          qty: 0
        };
        current.qty += qty;
        map.set(inventoryId, current);
      });
      return [...map.values()];
    }
    function getPurchaseListFromMaterials(materials = []) {
      return materials
        .map(item => {
          const qty = Number(item.qty || 0);
          if (qty <= 0) return null;
          const inventoryId = cleanText(item.inventoryId);
          if (!inventoryId) {
            return {
              inventoryId: "",
              name: item.name || "Material manual",
              sku: item.inventorySku || "-",
              unit: item.inventoryUnit || "u",
              requiredQty: qty,
              stockQty: 0,
              toBuyQty: qty,
              supplier: item.supplier || "Manual / sin vínculo",
              reason: "Material manual o sin vínculo con inventario"
            };
          }
          const stockItem = getInventoryItemById(inventoryId);
          const stockQty = Number(stockItem?.stock || 0);
          const toBuyQty = Math.max(qty - stockQty, 0);
          if (toBuyQty <= 0) return null;
          return {
            inventoryId,
            name: item.name || stockItem?.name || "Material",
            sku: stockItem?.sku || item.inventorySku || "-",
            unit: stockItem?.unit || item.inventoryUnit || "u",
            requiredQty: qty,
            stockQty,
            toBuyQty,
            supplier: stockItem?.supplier || item.supplier || "-",
            reason: stockQty <= 0 ? "Sin stock" : "Stock insuficiente"
          };
        })
        .filter(Boolean);
    }
    function getJobPurchaseList(job = {}) {
      return getPurchaseListFromMaterials(Array.isArray(job.materials) ? job.materials : []);
    }
    function getInventoryStateText(job = {}) {
      const usage = normalizeInventoryUsage(job.materials || []);
      if (!usage.length) return "Sin vínculo";
      if (job.inventoryApplied) return "Aplicado";
      if (shouldAutoApplyInventoryForStatus(job.status || "")) return "Pendiente";
      return "Aún no aplica";
    }
    function inventoryStatePill(job = {}) {
      const stateLabel = getInventoryStateText(job);
      const cls = stateLabel === "Aplicado" ? "st-pagado" : stateLabel === "Pendiente" ? "st-aprobado" : "st-cotizacion";
      return `<span class="pill ${cls}">Inventario: ${safe(stateLabel)}</span>`;
    }
    function materialsSignature(materials = []) {
      return JSON.stringify((materials || []).map(item => ({
        inventoryId: cleanText(item.inventoryId),
        name: cleanText(item.name),
        qty: Number(item.qty || 0),
        price: Number(item.price || 0)
      })));
    }
    function buildUploadedImageAsset(info = {}) {
      return {
        url: info.secure_url,
        publicId: info.public_id,
        fileName: info.original_filename || info.display_name || "imagen",
        uploadedAt: new Date().toISOString()
      };
    }
    function openCloudinaryImageWidget(options = {}) {
      if (typeof cloudinary === "undefined" || !cloudinary.createUploadWidget) {
        showToast("Cloudinary no cargó correctamente.");
        return;
      }

      const widget = cloudinary.createUploadWidget(
        {
          cloudName: CLOUDINARY_CONFIG.cloudName,
          uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
          multiple: options.multiple !== false,
          maxFiles: options.maxFiles || 10,
          resourceType: "image",
          folder: CLOUDINARY_CONFIG.folder,
          clientAllowedFormats: ["jpg", "jpeg", "png", "webp"],
          sources: ["local", "camera"],
          showAdvancedOptions: false,
          cropping: false
        },
        async (error, result) => {
          if (error) {
            console.error(error);
            showToast(options.errorMessage || "Error subiendo la imagen.");
            return;
          }

          if (result && result.event === "success") {
            try {
              if (typeof options.onSuccess === "function") {
                await options.onSuccess(buildUploadedImageAsset(result.info), result.info);
              }
            } catch (err) {
              console.error(err);
              showToast(options.persistErrorMessage || "La imagen subió, pero no se pudo guardar.");
            }
          }
        }
      );

      widget.open();
    }
    function getQuote(job = {}) {
      const q = job.quote || {};
      return {
        items: Array.isArray(q.items) ? q.items : [],
        discountType: q.discountType || "none",
        discountValue: Number(q.discountValue || 0),
        taxPercent: Number(q.taxPercent || 0)
      };
    }
    function computeQuote(quote = {}) {
      const items = Array.isArray(quote.items) ? quote.items : [];
      const subtotal = items.reduce((sum, item) => sum + (Number(item.qty || 0) * Number(item.price || 0)), 0);
      let discountAmount = 0;

      if (quote.discountType === "percent") {
        discountAmount = subtotal * (Number(quote.discountValue || 0) / 100);
      } else if (quote.discountType === "fixed") {
        discountAmount = Number(quote.discountValue || 0);
      }

      discountAmount = Math.min(discountAmount, subtotal);
      const taxable = Math.max(subtotal - discountAmount, 0);
      const taxAmount = taxable * (Number(quote.taxPercent || 0) / 100);
      const total = taxable + taxAmount;

      return {
        subtotal,
        discountAmount,
        taxAmount,
        total
      };
    }
    function computeJob(job) {
      const sale = Number(job.sale || 0);
      const materialsCost = getMaterialsCost(job.materials || []);
      const pricing = getJobPricing(job);
      const pricingCalc = computePricing(materialsCost, pricing, sale);
      const linkedExpenses = getJobLinkedExpensesTotal(job.id);
      const cost = pricingCalc.totalCost + linkedExpenses;
      const paid = getPaymentsTotal(job);
      const profit = sale - cost;
      const balance = Math.max(sale - paid, 0);
      const margin = sale > 0 ? (profit / sale) * 100 : 0;
      return {
        sale,
        materialsCost,
        laborCost: pricingCalc.laborCost,
        extraCost: pricingCalc.extraCost,
        linkedExpenses,
        desiredMargin: pricingCalc.desiredMargin,
        suggestedSale: pricingCalc.suggestedSale,
        baseCost: pricingCalc.totalCost,
        cost,
        paid,
        profit,
        balance,
        margin
      };
    }
    function cleanPhoneForWhatsapp(phone) {
      let digits = String(phone || "").replace(/[^\d]/g, "");
      if (digits.startsWith("00")) digits = digits.slice(2);
      return digits;
    }
    function openWhatsappForClient(clientId, mode = "general", jobId = null) {
      const client = getClientById(clientId);
      if (!client?.phone) {
        showToast("Ese cliente no tiene teléfono guardado.");
        return;
      }

      const digits = cleanPhoneForWhatsapp(client.phone);
      if (!digits) {
        showToast("El teléfono no es válido.");
        return;
      }

      const name = client.name || client.company || "cliente";
      let message = `Hola ${name}, te escribo de ${COMPANY.name}.`;

      if (mode === "cobro" && jobId) {
        const job = getJobById(jobId);
        if (job) {
          const calc = computeJob(job);
          message = `Hola ${name}, te escribo de ${COMPANY.name}. Te recordamos que el trabajo "${job.title}" tiene un saldo pendiente de ${calc.balance.toFixed(2)}.`;
        }
      }

      if (mode === "entrega" && jobId) {
        const job = getJobById(jobId);
        if (job) {
          message = `Hola ${name}, te escribo de ${COMPANY.name}. Te recordamos la entrega del trabajo "${job.title}" para la fecha ${job.dueDate || "programada"}.`;
        }
      }

      const msg = encodeURIComponent(message);
      window.open(`https://wa.me/${digits}?text=${msg}`, "_blank");
    }
    function fillClientSelect(selectedId = "") {
      const select = $("jobClientId");
      if (!state.clients.length) {
        select.innerHTML = `<option value="">Primero crea un cliente</option>`;
        return;
      }
      select.innerHTML = state.clients
        .slice()
        .sort((a, b) => clientLabel(a).localeCompare(clientLabel(b)))
        .map(client => `<option value="${client.id}" ${client.id === selectedId ? "selected" : ""}>${safe(clientLabel(client))}</option>`)
        .join("");
    }
    function fillPaymentJobSelect(selectedId = "") {
      const select = $("paymentJobId");
      if (!state.jobs.length) {
        select.innerHTML = `<option value="">Primero crea un trabajo</option>`;
        return;
      }
      select.innerHTML = state.jobs
        .slice()
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .map(job => `<option value="${job.id}" ${job.id === selectedId ? "selected" : ""}>${safe(getJobDisplayLabel(job))}</option>`)
        .join("");
    }
    function fillExpenseJobSelect(selectedId = "") {
      const select = $("expenseJobId");
      if (!select) return;
      const base = `<option value="">No ligar a ningún trabajo</option>`;
      if (!state.jobs.length) {
        select.innerHTML = base;
        return;
      }
      select.innerHTML = base + state.jobs
        .slice()
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .map(job => `<option value="${job.id}" ${job.id === selectedId ? "selected" : ""}>${safe(getJobDisplayLabel(job))}</option>`)
        .join("");
    }
    function inventoryMaterialOptions(selectedId = "") {
      const base = `<option value="">Material manual / sin vínculo</option>`;
      if (!state.inventoryItems.length) return base;
      const options = state.inventoryItems
        .slice()
        .sort((a, b) => cleanText(a.name).localeCompare(cleanText(b.name)))
        .map(item => `<option value="${item.id}" ${item.id === selectedId ? "selected" : ""}>${safe(item.name || "Material")} · ${safe(item.sku || "-")}</option>`)
        .join("");
      return base + options;
    }
    function updateMaterialRowInventoryInfo(row, preserveManualFields = false) {
      if (!row) return;
      const select = row.querySelector('[data-m="inventoryId"]');
      const nameInput = row.querySelector('[data-m="name"]');
      const priceInput = row.querySelector('[data-m="price"]');
      const stockNote = row.querySelector('[data-m-stock]');
      const item = getInventoryItemById(cleanText(select?.value));

      if (!item) {
        if (stockNote) stockNote.textContent = 'Sin vínculo con inventario. Puedes escribir el material manualmente.';
        return;
      }

      if (!preserveManualFields || !cleanText(nameInput.value)) {
        nameInput.value = item.name || '';
      }

      if (!preserveManualFields || !Number(priceInput.value || 0)) {
        priceInput.value = Number(item.unitCost || 0).toFixed(2);
      }

      if (stockNote) {
        stockNote.textContent = `Stock disponible: ${Number(item.stock || 0).toFixed(2)} ${item.unit || 'u'} · Costo unitario actual: ${money(item.unitCost || 0)}`;
      }
    }
    function refreshOpenMaterialInventorySelects() {
      document.querySelectorAll('.row-material').forEach(row => {
        const select = row.querySelector('[data-m="inventoryId"]');
        if (!select) return;
        const selectedId = cleanText(select.value);
        select.innerHTML = inventoryMaterialOptions(selectedId);
        updateMaterialRowInventoryInfo(row, true);
      });
    }
    function createMaterialRow(item = { inventoryId: "", name: "", qty: "", price: "" }) {
      const row = document.createElement("div");
      row.className = "row-material";
      row.innerHTML = `
        <select class="select" data-m="inventoryId">${inventoryMaterialOptions(item.inventoryId || "")}</select>
        <input class="input" data-m="name" placeholder="Material" value="${safe(item.name || "")}">
        <input class="input" data-m="qty" type="number" min="0" step="0.01" placeholder="Cantidad" value="${safe(item.qty || "")}">
        <input class="input" data-m="price" type="number" min="0" step="0.01" placeholder="Costo unitario" value="${safe(item.price || "")}">
        <button type="button" class="btn btn-danger btn-small remove-material">✕</button>
        <div class="material-stock-note section-note" data-m-stock></div>
      `;

      row.querySelectorAll('input').forEach(input => input.addEventListener('input', renderJobPreview));
      row.querySelector('[data-m="inventoryId"]').addEventListener('change', () => {
        updateMaterialRowInventoryInfo(row, false);
        renderJobPreview();
      });

      row.querySelector('.remove-material').addEventListener('click', () => {
        row.remove();
        if (!$("materialsContainer").children.length) $("materialsContainer").appendChild(createMaterialRow());
        renderJobPreview();
      });

      updateMaterialRowInventoryInfo(row, true);
      return row;
    }
    function createQuoteItemRow(item = { description: "", qty: "", price: "" }) {
      const row = document.createElement("div");
      row.className = "row-quote-item";
      row.innerHTML = `
        <input class="input" data-q="description" placeholder="Descripción" value="${safe(item.description || "")}">
        <input class="input" data-q="qty" type="number" min="0" step="0.01" placeholder="Cantidad" value="${safe(item.qty || "")}">
        <input class="input" data-q="price" type="number" min="0" step="0.01" placeholder="Precio unitario" value="${safe(item.price || "")}">
        <button type="button" class="btn btn-danger btn-small remove-quote-item">✕</button>
      `;
      row.querySelectorAll("input").forEach(input => input.addEventListener("input", renderJobPreview));
      row.querySelector(".remove-quote-item").addEventListener("click", () => {
        row.remove();
        if (!$("quoteItemsContainer").children.length) $("quoteItemsContainer").appendChild(createQuoteItemRow());
        renderJobPreview();
      });
      return row;
    }
    function getCurrentFormMaterials() {
      return [...document.querySelectorAll(".row-material")].map(row => {
        const inventoryId = cleanText(row.querySelector('[data-m="inventoryId"]').value);
        const linkedItem = getInventoryItemById(inventoryId);
        const qty = Number(row.querySelector('[data-m="qty"]').value || 0);
        const price = Number(row.querySelector('[data-m="price"]').value || 0);
        return {
          inventoryId: inventoryId || "",
          inventoryName: linkedItem?.name || "",
          inventorySku: linkedItem?.sku || "",
          inventoryUnit: linkedItem?.unit || "",
          supplier: linkedItem?.supplier || "",
          currentStock: Number(linkedItem?.stock || 0),
          name: cleanText(row.querySelector('[data-m="name"]').value),
          qty,
          price,
          total: qty * price
        };
      }).filter(item => item.name || item.qty || item.price || item.inventoryId);
    }
    function getCurrentQuoteItems() {
      return [...document.querySelectorAll(".row-quote-item")].map(row => ({
        description: cleanText(row.querySelector('[data-q="description"]').value),
        qty: Number(row.querySelector('[data-q="qty"]').value || 0),
        price: Number(row.querySelector('[data-q="price"]').value || 0)
      })).filter(item => item.description || item.qty || item.price);
    }
    function getCurrentQuoteForm() {
      return {
        items: getCurrentQuoteItems(),
        discountType: $("quoteDiscountType").value || "none",
        discountValue: Number($("quoteDiscountValue").value || 0),
        taxPercent: Number($("quoteTaxPercent").value || 0)
      };
    }
    function getJobPricing(job = {}) {
      return {
        priceMode: job?.pricing?.priceMode || "manual",
        laborCost: Number(job?.pricing?.laborCost || 0),
        extraCost: Number(job?.pricing?.extraCost || 0),
        desiredMargin: Number(job?.pricing?.desiredMargin || 0)
      };
    }
    function getCurrentPricingForm() {
      return {
        priceMode: $("jobPriceMode").value || "manual",
        laborCost: Number($("jobLaborCost").value || 0),
        extraCost: Number($("jobExtraCost").value || 0),
        desiredMargin: Number($("jobDesiredMargin").value || 0)
      };
    }
    function computePricing(materialsCost = 0, pricing = {}, sale = 0) {
      const laborCost = Number(pricing.laborCost || 0);
      const extraCost = Number(pricing.extraCost || 0);
      const desiredMargin = Number(pricing.desiredMargin || 0);
      const totalCost = Number(materialsCost || 0) + laborCost + extraCost;
      const suggestedSale = totalCost + (totalCost * desiredMargin / 100);
      const realProfit = Number(sale || 0) - totalCost;
      const realMargin = Number(sale || 0) > 0 ? (realProfit / Number(sale || 0)) * 100 : 0;

      return {
        materialsCost,
        laborCost,
        extraCost,
        desiredMargin,
        totalCost,
        suggestedSale,
        realProfit,
        realMargin
      };
    }
    function applySuggestedSale() {
      const materialsCost = getMaterialsCost(getCurrentFormMaterials());
      const pricing = getCurrentPricingForm();
      const calc = computePricing(materialsCost, pricing, 0);
      $("jobSale").value = calc.suggestedSale.toFixed(2);
      $("jobPriceMode").value = "manual";
      renderJobPreview();
    }
    function getEstimatorTemplate(key = "custom") {
      return ESTIMATOR_TEMPLATES[key] || ESTIMATOR_TEMPLATES.custom;
    }
    function getJobTypeLabel(job = {}) {
      return cleanText(job.jobType) || getEstimatorTemplate(job?.estimate?.templateKey || "custom").label || "Personalizado";
    }
    function getSavedEstimator(job = {}) {
      return {
        templateKey: job?.estimate?.templateKey || "custom",
        width: Number(job?.estimate?.width || 0),
        height: Number(job?.estimate?.height || 0),
        qty: Number(job?.estimate?.qty || 1),
        wastePercent: Number(job?.estimate?.wastePercent || 0),
        materialRate: Number(job?.estimate?.materialRate || 0),
        saleRate: Number(job?.estimate?.saleRate || 0),
        laborBase: Number(job?.estimate?.laborBase || 0)
      };
    }
    function getCurrentEstimatorForm() {
      return {
        templateKey: $("jobEstimatorType").value || "custom",
        width: Number($("jobEstimatorWidth").value || 0),
        height: Number($("jobEstimatorHeight").value || 0),
        qty: Number($("jobEstimatorQty").value || 0),
        wastePercent: Number($("jobEstimatorWaste").value || 0),
        materialRate: Number($("jobEstimatorMaterialRate").value || 0),
        saleRate: Number($("jobEstimatorSaleRate").value || 0),
        laborBase: Number($("jobEstimatorLaborBase").value || 0)
      };
    }
    function setEstimatorForm(estimator = {}) {
      $("jobEstimatorType").value = estimator.templateKey || "custom";
      $("jobEstimatorWidth").value = estimator.width ? Number(estimator.width) : "";
      $("jobEstimatorHeight").value = estimator.height ? Number(estimator.height) : "";
      $("jobEstimatorQty").value = estimator.qty ? Number(estimator.qty) : 1;
      $("jobEstimatorWaste").value = estimator.wastePercent ? Number(estimator.wastePercent) : "";
      $("jobEstimatorMaterialRate").value = estimator.materialRate ? Number(estimator.materialRate) : "";
      $("jobEstimatorSaleRate").value = estimator.saleRate ? Number(estimator.saleRate) : "";
      $("jobEstimatorLaborBase").value = estimator.laborBase ? Number(estimator.laborBase) : "";
    }
    function loadEstimatorDefaults(preserveMeasures = true) {
      const current = getCurrentEstimatorForm();
      const template = getEstimatorTemplate(current.templateKey);
      const qty = preserveMeasures && current.qty ? current.qty : 1;

      $("jobEstimatorWaste").value = Number(template.wastePercent || 0) ? Number(template.wastePercent || 0) : "";
      $("jobEstimatorMaterialRate").value = Number(template.materialRate || 0) ? Number(template.materialRate || 0) : "";
      $("jobEstimatorSaleRate").value = Number(template.saleRate || 0) ? Number(template.saleRate || 0) : "";
      $("jobEstimatorLaborBase").value = Number(template.laborBase || 0) ? Number(template.laborBase || 0) : "";
      $("jobEstimatorQty").value = qty;
      renderEstimatorPreview();
    }
    function computeEstimator(estimator = {}) {
      const template = getEstimatorTemplate(estimator.templateKey);
      const mode = template.mode || "custom";
      const width = Number(estimator.width || 0);
      const height = Number(estimator.height || 0);
      const qty = Math.max(Number(estimator.qty || 0), 0);
      const wastePercent = Math.max(Number(estimator.wastePercent || 0), 0);
      const materialRate = Math.max(Number(estimator.materialRate || 0), 0);
      const saleRate = Math.max(Number(estimator.saleRate || 0), 0);
      const laborBase = Math.max(Number(estimator.laborBase || 0), 0);

      let baseUnits = 0;
      if (mode === "sqft") {
        baseUnits = ((width * height) / 144) * qty;
      } else if (mode === "unit") {
        baseUnits = qty;
      } else {
        if (width > 0 && height > 0 && qty > 0) baseUnits = ((width * height) / 144) * qty;
        else baseUnits = qty;
      }

      const productionUnits = baseUnits * (1 + wastePercent / 100);
      const materialEstimate = productionUnits * materialRate;
      const saleEstimate = (baseUnits * saleRate) + laborBase;

      return {
        templateKey: estimator.templateKey || "custom",
        label: template.label || "Personalizado",
        mode,
        width,
        height,
        qty,
        wastePercent,
        materialRate,
        saleRate,
        laborBase,
        baseUnits,
        productionUnits,
        materialEstimate,
        saleEstimate
      };
    }
    function renderEstimatorPreview() {
      const calc = computeEstimator(getCurrentEstimatorForm());
      const unitLabel = calc.mode === "unit" ? "und" : "ft²";

      $("jobEstimatorBaseUnits").value = `${calc.baseUnits.toFixed(2)} ${unitLabel}`;
      $("jobEstimatorProdUnits").value = `${calc.productionUnits.toFixed(2)} ${unitLabel}`;
      $("jobEstimatorCost").value = money(calc.materialEstimate + calc.laborBase);
      $("jobEstimatorSale").value = money(calc.saleEstimate);
    }
    function applyEstimatorToJob() {
      const currentMaterials = getCurrentFormMaterials();
      const currentQuote = getCurrentQuoteItems();
      const hasManualData = currentMaterials.length || currentQuote.length || Number($("jobSale").value || 0) > 0;

      if (hasManualData) {
        const ok = confirm("Esto reemplazará los materiales y la cotización actual del trabajo. ¿Quieres continuar?");
        if (!ok) return;
      }

      const calc = computeEstimator(getCurrentEstimatorForm());
      if (calc.qty <= 0) return showToast("Pon una cantidad válida en el estimador.");
      if (calc.mode === "sqft" && (calc.width <= 0 || calc.height <= 0)) return showToast("Pon ancho y alto para este tipo de trabajo.");
      if (calc.materialRate <= 0 && calc.saleRate <= 0 && calc.laborBase <= 0) return showToast("Carga valores sugeridos o escribe las tarifas del estimador.");

      $("materialsContainer").innerHTML = "";
      $("quoteItemsContainer").innerHTML = "";

      const materialQty = calc.mode === "unit" ? calc.qty : Number(calc.productionUnits.toFixed(2));
      const quoteQty = calc.mode === "unit" ? calc.qty : Number(calc.baseUnits.toFixed(2));

      $("materialsContainer").appendChild(createMaterialRow({
        name: `${calc.label} - material`,
        qty: materialQty,
        price: Number(calc.materialRate.toFixed(2))
      }));

      if (calc.saleRate > 0) {
        const desc = calc.mode === "unit"
          ? calc.label
          : `${calc.label} (${calc.baseUnits.toFixed(2)} ft²)`;
        $("quoteItemsContainer").appendChild(createQuoteItemRow({
          description: desc,
          qty: quoteQty,
          price: Number(calc.saleRate.toFixed(2))
        }));
      } else {
        $("quoteItemsContainer").appendChild(createQuoteItemRow());
      }

      if (calc.laborBase > 0) {
        $("jobLaborCost").value = calc.laborBase.toFixed(2);
      }

      if (!$("jobTitle").value && calc.label !== "Personalizado") {
        $("jobTitle").value = calc.label;
      }

      if (!$("jobDescription").value && calc.mode === "sqft") {
        $("jobDescription").value = `${calc.label} de ${calc.width}" x ${calc.height}" x ${calc.qty} unidad(es).`;
      }

      $("jobPriceMode").value = "quote";
      renderJobPreview();
      showToast("Estimado aplicado al trabajo.");
    }
    function getFormChecklist() {
      const result = {};
      CHECK_KEYS.forEach(item => {
        result[item.key] = !!$(item.id).checked;
      });
      return result;
    }
    function setChecklistForm(checklist = {}) {
      CHECK_KEYS.forEach(item => {
        $(item.id).checked = !!checklist[item.key];
      });
    }
    function renderInternalNotesAndActivity() {
      const noteBox = $("jobNotesLogList");
      const logBox = $("jobActivityLogList");

      if (!state.editingJobId) {
        noteBox.innerHTML = `<div class="section-note">Guarda primero el trabajo para usar la bitácora.</div>`;
        logBox.innerHTML = `<div class="section-note">El historial aparecerá cuando el trabajo ya exista.</div>`;
        return;
      }

      const job = getJobById(state.editingJobId);
      const notes = getJobInternalNotes(job).sort((a,b) => String(b.at||"").localeCompare(String(a.at||"")));
      const logs = getJobActivityLog(job).sort((a,b) => String(b.at||"").localeCompare(String(a.at||"")));

      noteBox.innerHTML = notes.length
        ? notes.map(item => `
            <div class="log-item">
              <strong>${safe(item.by || "usuario")}</strong>
              <div class="section-note">${safe(item.at || "")}</div>
              <div style="margin-top:8px;">${safe(item.text || "")}</div>
            </div>
          `).join("")
        : `<div class="section-note">Todavía no hay notas internas.</div>`;

      logBox.innerHTML = logs.length
        ? logs.map(item => `
            <div class="log-item">
              <strong>${safe(item.text || "")}</strong>
              <div class="section-note">${safe(item.type || "cambio")} · ${safe(item.by || "usuario")} · ${safe(item.at || "")}</div>
            </div>
          `).join("")
        : `<div class="section-note">Todavía no hay historial de cambios.</div>`;
    }
    function renderJobDesignImages() {
      const box = $("designImagesGallery");
      if (!box) return;

      const job = state.editingJobId ? getJobById(state.editingJobId) : null;
      const images = state.editingJobId ? getJobDesignImages(job) : [...state.pendingJobImages];

      if (!images.length) {
        box.innerHTML = `<div class="section-note">${state.editingJobId ? "Todavía no hay fotos subidas para este trabajo." : "Todavía no has subido fotos para este trabajo nuevo."}</div>`;
        return;
      }

      const cover = images[0];
      box.innerHTML = `
        <div class="gallery-hero">
          <img src="${cover.url}" alt="${safe(cover.fileName || "Diseño principal")}" onclick="openDesignGallery(0)">
          <div class="gallery-count-badge">${images.length} foto${images.length === 1 ? '' : 's'}</div>
        </div>
        <div class="gallery-toolbar">
          <button type="button" class="btn btn-secondary btn-small" onclick="openDesignGallery(0)">Abrir galería</button>
        </div>
        <div class="gallery-strip">
          ${images.map((img, index) => `
            <div class="gallery-thumb" onclick="openDesignGallery(${index})">
              <img src="${img.url}" alt="${safe(img.fileName || "Diseño")}">
              <div class="gallery-thumb-info">
                <div><strong>${safe(img.fileName || `Imagen ${index + 1}`)}</strong></div>
                <div>${safe(formatDateTime(img.uploadedAt))}</div>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                  <button type="button" class="btn btn-secondary btn-small" onclick="event.stopPropagation();openDesignGallery(${index})">Ver</button>
                  <button type="button" class="btn btn-danger btn-small" onclick="event.stopPropagation();deleteDesignImage(${index})">Eliminar</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
    function openDesignGallery(index = 0) {
      const job = state.editingJobId ? getJobById(state.editingJobId) : null;
      const images = state.editingJobId ? getJobDesignImages(job) : [...state.pendingJobImages];
      if (!images.length) return;
      state.galleryJobId = state.editingJobId || null;
      state.galleryIndex = Math.max(0, Math.min(index, images.length - 1));
      renderGalleryModal();
      openModal("designGalleryModal");
    }
    function renderGalleryModal() {
      const job = state.galleryJobId ? getJobById(state.galleryJobId) : null;
      const images = state.galleryJobId ? getJobDesignImages(job) : [...state.pendingJobImages];
      if (!images.length) return;
      const current = images[state.galleryIndex] || images[0];
      $("galleryModalImage").src = current.url;
      $("galleryModalImage").alt = current.fileName || "Diseño";
      $("galleryModalTitle").textContent = current.fileName || `Imagen ${state.galleryIndex + 1}`;
      $("galleryModalSub").textContent = `${state.galleryIndex + 1} de ${images.length} · ${formatDateTime(current.uploadedAt)}`;
      $("galleryOpenOriginal").href = current.url;
      $("galleryPrevBtn").disabled = images.length <= 1;
      $("galleryNextBtn").disabled = images.length <= 1;
    }
    function galleryPrev() {
      const job = state.galleryJobId ? getJobById(state.galleryJobId) : null;
      const images = state.galleryJobId ? getJobDesignImages(job) : [...state.pendingJobImages];
      if (!images.length) return;
      state.galleryIndex = (state.galleryIndex - 1 + images.length) % images.length;
      renderGalleryModal();
    }
    function galleryNext() {
      const job = state.galleryJobId ? getJobById(state.galleryJobId) : null;
      const images = state.galleryJobId ? getJobDesignImages(job) : [...state.pendingJobImages];
      if (!images.length) return;
      state.galleryIndex = (state.galleryIndex + 1) % images.length;
      renderGalleryModal();
    }
    async function deleteDesignImage(index) {
      if (!state.editingJobId) {
        if (index < 0 || index >= state.pendingJobImages.length) return;
        if (!confirm("¿Eliminar esta foto del trabajo?")) return;
        state.pendingJobImages.splice(index, 1);
        if (!state.pendingJobImages.length) closeModal("designGalleryModal");
        renderJobDesignImages();
        showToast("Foto quitada del trabajo nuevo.");
        return;
      }

      const job = getJobById(state.editingJobId);
      if (!job) return showToast("No se encontró el trabajo.");

      const images = getJobDesignImages(job);
      if (index < 0 || index >= images.length) return;

      if (!confirm("¿Eliminar esta foto del trabajo?")) return;

      images.splice(index, 1);

      try {
        await jobsRef().doc(state.editingJobId).update({
          designImages: images,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        if (!images.length) closeModal("designGalleryModal");
        showToast("Foto eliminada.");
      } catch (error) {
        console.error(error);
        showToast("No se pudo eliminar la foto.");
      }
    }
    function openDesignUploadWidget() {
      if (!guardWrite("subir fotos", state.currentView === "gastos" ? "gastos" : "trabajos")) return;
      openCloudinaryImageWidget({
        multiple: true,
        maxFiles: 10,
        errorMessage: "Error subiendo la imagen del trabajo.",
        persistErrorMessage: "La imagen subió, pero no se pudo guardar en el trabajo.",
        onSuccess: async (asset) => {
          if (!state.editingJobId) {
            state.pendingJobImages.push(asset);
            renderJobDesignImages();
            showToast("Foto agregada al trabajo nuevo. Guarda el trabajo para dejarla registrada.");
            return;
          }

          const job = getJobById(state.editingJobId);
          if (!job) return;

          const images = getJobDesignImages(job);
          images.push(asset);

          await jobsRef().doc(state.editingJobId).update({
            designImages: images,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          showToast("Foto subida correctamente.");
        }
      });
    }
    function getCurrentJobPaymentsPreviewData() {
      if (!state.editingJobId) return [];
      const job = getJobById(state.editingJobId);
      return job ? getPaymentsList(job) : [];
    }
    async function applyInventoryDiscountForJob(jobId, source = "manual") {
      if (!guardWrite("aplicar inventario", "inventario")) return { appliedCount: 0 };
      const jobDocRef = jobsRef().doc(jobId);
      const movementRefs = [];
      const movementDate = today();
      const appliedAt = new Date().toISOString();
      const actor = state.userEmail || "usuario";
      let appliedCount = 0;

      await db.runTransaction(async (transaction) => {
        const jobSnap = await transaction.get(jobDocRef);
        if (!jobSnap.exists) throw new Error("No se encontró el trabajo.");

        const job = { id: jobSnap.id, ...jobSnap.data() };
        if (job.inventoryApplied) return;

        const usage = normalizeInventoryUsage(job.materials || []);
        if (!usage.length) return;

        const inventoryDocs = {};
        for (const entry of usage) {
          const ref = inventoryRef().doc(entry.inventoryId);
          const snap = await transaction.get(ref);
          if (!snap.exists) throw new Error(`No se encontró el material ${entry.name || entry.inventoryId} en inventario.`);
          inventoryDocs[entry.inventoryId] = { ref, snap, data: snap.data() || {} };
        }

        for (const entry of usage) {
          const info = inventoryDocs[entry.inventoryId];
          const stock = Number(info.data.stock || 0);
          if (stock < entry.qty) {
            throw new Error(`Stock insuficiente para ${entry.name || "material"}. Disponible: ${stock.toFixed(2)} ${info.data.unit || "u"}. Necesitas: ${entry.qty.toFixed(2)}.`);
          }
        }

        for (const entry of usage) {
          const info = inventoryDocs[entry.inventoryId];
          const stock = Number(info.data.stock || 0);
          const newStock = stock - Number(entry.qty || 0);
          transaction.update(info.ref, {
            stock: newStock,
            lastMovementAt: movementDate,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          const moveRef = inventoryMovementsRef().doc();
          movementRefs.push(moveRef.id);
          transaction.set(moveRef, {
            itemId: entry.inventoryId,
            itemName: info.data.name || entry.name || "Material",
            itemSku: info.data.sku || entry.sku || "",
            type: "salida",
            qty: -Math.abs(Number(entry.qty || 0)),
            beforeStock: stock,
            afterStock: newStock,
            date: movementDate,
            reference: `Trabajo: ${job.title || job.id}`,
            note: `Descuento automático de inventario (${source}).`,
            jobId: job.id,
            unitCost: Number(info.data.unitCost || 0),
            createdBy: actor,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          appliedCount += 1;
        }

        const logs = [...getJobActivityLog(job), {
          id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: "inventario",
          text: `Inventario descontado automáticamente (${source}).`,
          by: actor,
          at: appliedAt
        }];

        transaction.update(jobDocRef, {
          inventoryApplied: true,
          inventoryAppliedAt: appliedAt,
          inventoryAppliedStatus: job.status || "",
          inventoryAppliedSource: source,
          inventoryAppliedMovementIds: movementRefs,
          activityLog: logs,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      });

      return { appliedCount };
    }
    function renderJobInventoryAndPurchase() {
      const statusBox = $("jobInventoryStatusBox");
      const purchaseBox = $("jobPurchaseList");
      const applyBtn = $("applyInventoryNowBtn");
      if (!statusBox || !purchaseBox || !applyBtn) return;

      const materials = getCurrentFormMaterials();
      const usage = normalizeInventoryUsage(materials);
      const purchaseList = getPurchaseListFromMaterials(materials);
      const job = state.editingJobId ? getJobById(state.editingJobId) : null;

      if (!state.editingJobId) {
        statusBox.innerHTML = `<div class="log-item"><strong>Inventario pendiente</strong><div class="section-note">Guarda el trabajo primero. Cuando el estado pase a Producción, Instalación, Entregado o Pagado, la app podrá descontar automáticamente los materiales ligados al inventario.</div></div>`;
      } else if (!usage.length) {
        statusBox.innerHTML = `<div class="log-item"><strong>Sin materiales ligados al inventario</strong><div class="section-note">Este trabajo todavía no tiene materiales vinculados a un ítem del inventario. Puedes seguir usando materiales manuales, pero no se descontarán automáticamente.</div></div>`;
      } else if (job?.inventoryApplied) {
        statusBox.innerHTML = `<div class="log-item"><strong>Inventario ya aplicado</strong><div class="section-note">Se descontó el inventario el ${safe(formatDateTime(job.inventoryAppliedAt))} desde el estado ${safe(job.inventoryAppliedStatus || "-")}. Si cambias materiales después de esto, revisa el inventario manualmente.</div></div>`;
      } else if (shouldAutoApplyInventoryForStatus($("jobStatus").value || job?.status || "")) {
        statusBox.innerHTML = `<div class="log-item"><strong>Listo para descontar</strong><div class="section-note">Al guardar este trabajo con este estado, la app intentará descontar automáticamente el inventario ligado. También puedes hacerlo ahora con el botón de arriba.</div></div>`;
      } else {
        statusBox.innerHTML = `<div class="log-item"><strong>En espera</strong><div class="section-note">Todavía no se descontará el inventario porque el trabajo sigue antes de Producción. La compra automática sí ya te muestra faltantes.</div></div>`;
      }

      applyBtn.disabled = !state.editingJobId || !usage.length || !!job?.inventoryApplied;

      if (!purchaseList.length) {
        purchaseBox.innerHTML = `<div class="section-note">No hay faltantes por comprar con el stock actual.</div>`;
      } else {
        purchaseBox.innerHTML = purchaseList.map(item => `
          <div class="log-item">
            <strong>${safe(item.name || "Material")}</strong>
            <div class="section-note">Necesita ${Number(item.requiredQty || 0).toFixed(2)} ${safe(item.unit || "u")} · Stock actual ${Number(item.stockQty || 0).toFixed(2)} ${safe(item.unit || "u")} · Comprar ${Number(item.toBuyQty || 0).toFixed(2)} ${safe(item.unit || "u")}</div>
            <div class="section-note">Proveedor: ${safe(item.supplier || "-")} · ${safe(item.reason || "")}</div>
          </div>
        `).join("");
      }
    }
    function renderJobLinkedExpenses() {
      const box = $("jobExpensesPreview");
      if (!box) return;
      if (!state.editingJobId) {
        box.innerHTML = `<div class="section-note">Guarda el trabajo primero y luego podrás ligar gastos específicos a este trabajo.</div>`;
        return;
      }

      const linkedExpenses = getJobLinkedExpenses(state.editingJobId);
      const total = getJobLinkedExpensesTotal(state.editingJobId);
      if (!linkedExpenses.length) {
        box.innerHTML = `<div class="section-note">Todavía no hay gastos ligados a este trabajo.</div>`;
        return;
      }

      box.innerHTML = `
        <div class="log-item">
          <strong>Total ligado: ${money(total)}</strong>
          <div class="section-note">Estos gastos también cuentan para ver la rentabilidad real del trabajo.</div>
        </div>
        ${linkedExpenses.map(item => `
          <div class="log-item">
            <strong>${safe(item.concept || "Gasto")}</strong> · ${money(item.amount || 0)}
            <div class="section-note">${safe(item.category || "-")} · ${safe(item.date || "-")}</div>
            <div class="section-note">${safe(item.notes || "-")}</div>
          </div>
        `).join("")}
      `;
    }
    function renderJobPaymentsPreview() {
      const list = getCurrentJobPaymentsPreviewData();
      const box = $("jobPaymentsPreview");
      if (!list.length) {
        box.innerHTML = `<div class="section-note">Todavía no hay pagos registrados. Guarda el trabajo primero y luego agrega pagos parciales.</div>`;
        return;
      }
      box.innerHTML = list
        .slice()
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")))
        .map(item => `
          <div class="payment-item">
            <strong>${money(item.amount)}</strong> · ${safe(item.method || "Pago")}
            <div class="section-note">${safe(item.date || "Sin fecha")}${item.note ? " · " + safe(item.note) : ""}</div>
          </div>
        `).join("");
    }
    function renderQuotePreview() {
      renderEstimatorPreview();
      const quote = getCurrentQuoteForm();
      const calc = computeQuote(quote);

      $("quoteSubtotal").textContent = money(calc.subtotal);
      $("quoteDiscount").textContent = money(calc.discountAmount);
      $("quoteTax").textContent = money(calc.taxAmount);
      $("quoteTotal").textContent = money(calc.total);

      const hasQuoteData = quote.items.some(i => i.description || i.qty || i.price) || quote.discountValue || quote.taxPercent;
      const priceMode = $("jobPriceMode").value || "manual";

      if (priceMode === "quote" && hasQuoteData) {
        $("jobSale").value = calc.total.toFixed(2);
      } else if (!hasQuoteData && !$("jobSale").value) {
        $("jobSale").value = "0.00";
      }
    }
    function renderJobPreview() {
      renderQuotePreview();

      const sale = Number($("jobSale").value || 0);
      const materialsCost = getMaterialsCost(getCurrentFormMaterials());
      const pricing = getCurrentPricingForm();
      const pricingCalc = computePricing(materialsCost, pricing, sale);
      const linkedExpenses = state.editingJobId ? getJobLinkedExpensesTotal(state.editingJobId) : 0;
      const totalCost = pricingCalc.totalCost + linkedExpenses;
      const realProfit = sale - totalCost;
      const realMargin = sale > 0 ? (realProfit / sale) * 100 : 0;
      const payments = getCurrentJobPaymentsPreviewData();
      const paid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const balance = Math.max(sale - paid, 0);
      const currentJob = state.editingJobId ? getJobById(state.editingJobId) : null;
      const inventoryText = currentJob ? getInventoryStateText(currentJob) : (normalizeInventoryUsage(getCurrentFormMaterials()).length ? "Pendiente" : "Sin vínculo");

      $("jobMaterialsTotal").value = money(pricingCalc.materialsCost);
      $("jobTotalCost").value = money(totalCost);
      $("jobSuggestedSale").value = money(pricingCalc.suggestedSale);
      $("jobProfitMargin").value = realMargin.toFixed(2) + "%";

      $("sumMaterials").textContent = money(pricingCalc.materialsCost);
      $("sumLabor").textContent = money(pricingCalc.laborCost);
      $("sumExtras").textContent = money(pricingCalc.extraCost);
      $("sumCost").textContent = money(totalCost);
      $("sumProfit").textContent = money(realProfit);
      $("sumMargin").textContent = realMargin.toFixed(2) + "%";
      $("sumPaid").textContent = money(paid);
      $("sumBalance").textContent = money(balance);
      if ($("sumLinkedExpenses")) $("sumLinkedExpenses").textContent = money(linkedExpenses);
      if ($("sumInventoryStatus")) $("sumInventoryStatus").textContent = inventoryText;

      renderJobPaymentsPreview();
      renderJobInventoryAndPurchase();
      renderJobLinkedExpenses();
      renderInternalNotesAndActivity();
      renderJobDesignImages();
    }
    function resetJobForm() {
      state.editingJobId = null;
      state.galleryJobId = null;
      state.galleryIndex = 0;
      $("jobModalTitle").textContent = "Nuevo trabajo";
      fillClientSelect();
      $("jobTitle").value = "";
      $("jobStatus").value = "Cotización";
      $("jobDate").value = today();
      $("jobDueDate").value = "";
      $("jobInstallDate").value = "";
      $("jobInstallStartTime").value = "";
      $("jobInstallEndTime").value = "";
      $("jobInstallAssignedTo").value = "";
      $("jobInstallCrew").value = "";
      $("jobInstallStatus").value = "";
      $("jobInstallAddress").value = "";
      $("jobInstallWindow").value = "";
      $("jobInstallNotes").value = "";
      fillInstallationAssigneeList();
      $("jobPriority").value = "Media";
      $("jobPriceMode").value = "manual";
      $("jobLaborCost").value = "";
      $("jobExtraCost").value = "";
      $("jobDesiredMargin").value = "";
      $("jobEstimatorType").value = "custom";
      $("jobEstimatorWidth").value = "";
      $("jobEstimatorHeight").value = "";
      $("jobEstimatorQty").value = 1;
      $("jobEstimatorWaste").value = "";
      $("jobEstimatorMaterialRate").value = "";
      $("jobEstimatorSaleRate").value = "";
      $("jobEstimatorLaborBase").value = "";
      $("jobEstimatorBaseUnits").value = "0.00 ft²";
      $("jobEstimatorProdUnits").value = "0.00 ft²";
      $("jobEstimatorCost").value = money(0);
      $("jobEstimatorSale").value = money(0);
      $("jobSale").value = "0.00";
      $("jobMaterialsTotal").value = money(0);
      $("jobTotalCost").value = money(0);
      $("jobSuggestedSale").value = money(0);
      $("jobProfitMargin").value = "0.00%";
      $("jobDescription").value = "";
      $("jobNotes").value = "";
      $("jobNewInternalNote").value = "";

      $("materialsContainer").innerHTML = "";
      $("materialsContainer").appendChild(createMaterialRow());

      $("quoteItemsContainer").innerHTML = "";
      $("quoteItemsContainer").appendChild(createQuoteItemRow());
      $("quoteDiscountType").value = "none";
      $("quoteDiscountValue").value = "";
      $("quoteTaxPercent").value = "0";

      state.pendingJobImages = [];
      setChecklistForm({});
      renderJobPreview();
      renderJobDesignImages();
    }
    async function saveInternalNote() {
      if (!guardWrite("guardar notas internas", "trabajos")) return;
      if (!state.editingJobId) return showToast("Primero guarda el trabajo.");
      const text = cleanText($("jobNewInternalNote").value);
      if (!text) return showToast("Escribe una nota interna.");

      const job = getJobById(state.editingJobId);
      if (!job) return showToast("No se encontró el trabajo.");

      const notes = getJobInternalNotes(job);
      const logs = getJobActivityLog(job);

      notes.push({
        id: "note-" + Date.now(),
        text,
        by: state.userEmail || "usuario",
        at: new Date().toISOString()
      });

      logs.push(newLogEntry("nota", "Se agregó una nota interna."));

      try {
        await jobsRef().doc(state.editingJobId).update({
          internalNotesLog: notes,
          activityLog: logs,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        $("jobNewInternalNote").value = "";
        showToast("Nota guardada en la bitácora.");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar la nota.");
      }
    }
    async function saveJob() {
      if (!guardWrite("guardar trabajos", "trabajos")) return;
      const quote = getCurrentQuoteForm();
      const quoteCalc = computeQuote(quote);
      const pricing = getCurrentPricingForm();
      const logsBase = state.editingJobId ? getJobActivityLog(getJobById(state.editingJobId) || {}) : [];
      const notesBase = state.editingJobId ? getJobInternalNotes(getJobById(state.editingJobId) || {}) : [];

      const saleValue = Number($("jobSale").value || 0);
      const fallbackSale = pricing.priceMode === "quote" ? quoteCalc.total : saleValue;

      const payload = {
        clientId: cleanText($("jobClientId").value),
        title: cleanText($("jobTitle").value),
        status: cleanText($("jobStatus").value) || "Cotización",
        date: cleanText($("jobDate").value) || today(),
        dueDate: cleanText($("jobDueDate").value),
        priority: cleanText($("jobPriority").value) || "Media",
        installation: getCurrentInstallationForm(cleanText($("jobClientId").value)),
        sale: Number(fallbackSale || 0),
        description: cleanText($("jobDescription").value),
        notes: cleanText($("jobNotes").value),
        materials: getCurrentFormMaterials(),
        quote,
        pricing,
        jobType: getEstimatorTemplate($("jobEstimatorType").value || "custom").label,
        estimate: getCurrentEstimatorForm(),
        checklist: getFormChecklist(),
        internalNotesLog: notesBase,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!payload.clientId) return showToast("Selecciona un cliente.");
      if (!payload.title) return showToast("Escribe el nombre del trabajo.");
      if (payload.sale < 0) return showToast("La venta no puede ser negativa.");

      try {
        if (state.editingJobId) {
          const existing = getJobById(state.editingJobId) || {};
          payload.payments = existing.payments || [];
          payload.designImages = existing.designImages || [];
          payload.activityLog = [...logsBase, newLogEntry("edición", "Trabajo actualizado.")];
          if (existing.paid) payload.paid = existing.paid;
          await jobsRef().doc(state.editingJobId).update(payload);
          showToast("Trabajo actualizado.");
        } else {
          payload.payments = [];
          payload.designImages = [...state.pendingJobImages];
          payload.activityLog = [newLogEntry("creación", "Trabajo creado.")];
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await jobsRef().add(payload);
          state.pendingJobImages = [];
          showToast("Trabajo guardado correctamente.");
        }
        closeModal("jobModal");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el trabajo.");
      }
    }
    async function updateJobStatus(id, status) {
      if (!guardWrite("cambiar estados", "trabajos")) return;
      try {
        const job = getJobById(id);
        const logs = [...getJobActivityLog(job), newLogEntry("estado", `Estado cambiado a ${status}.`)];
        await jobsRef().doc(id).update({
          status,
          activityLog: logs,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast(`Estado cambiado a ${status}.`);

        if (shouldAutoApplyInventoryForStatus(status) && !job?.inventoryApplied) {
          try {
            const result = await applyInventoryDiscountForJob(id, `estado ${status}`);
            if (result?.appliedCount) showToast(`Inventario descontado en ${result.appliedCount} material(es).`);
          } catch (inventoryError) {
            console.error(inventoryError);
            showToast(inventoryError?.message || "No se pudo descontar el inventario automáticamente.");
          }
        }
      } catch (error) {
        console.error(error);
        showToast("No se pudo cambiar el estado.");
      }
    }
    function editJob(id) {
      if (!canWriteData("trabajos")) return showToast("No tienes permiso para editar trabajos.");
      const item = getJobById(id);
      if (!item) return;

      state.editingJobId = id;
      state.galleryJobId = id;
      state.galleryIndex = 0;
      $("jobModalTitle").textContent = "Editar trabajo";
      fillClientSelect(item.clientId || "");
      $("jobTitle").value = item.title || "";
      $("jobStatus").value = item.status || "Cotización";
      const installation = getJobInstallation(item);
      $("jobDate").value = item.date || today();
      $("jobDueDate").value = item.dueDate || "";
      $("jobInstallDate").value = installation.date || "";
      $("jobInstallStartTime").value = installation.startTime || "";
      $("jobInstallEndTime").value = installation.endTime || "";
      fillInstallationAssigneeList();
      $("jobInstallAssignedTo").value = installation.assignedTo || "";
      $("jobInstallCrew").value = installation.crew || "";
      $("jobInstallStatus").value = installation.status || "";
      $("jobInstallAddress").value = installation.address || "";
      $("jobInstallWindow").value = installation.window || "";
      $("jobInstallNotes").value = installation.notes || "";
      $("jobPriority").value = item.priority || "Media";
      $("jobSale").value = Number(item.sale || 0).toFixed(2);
      const pricing = getJobPricing(item);
      $("jobPriceMode").value = pricing.priceMode || "manual";
      $("jobLaborCost").value = pricing.laborCost || "";
      $("jobExtraCost").value = pricing.extraCost || "";
      $("jobDesiredMargin").value = pricing.desiredMargin || "";
      setEstimatorForm(getSavedEstimator(item));
      $("jobDescription").value = item.description || "";
      $("jobNotes").value = item.notes || "";
      $("jobNewInternalNote").value = "";

      $("materialsContainer").innerHTML = "";
      const materials = item.materials && item.materials.length ? item.materials : [{ name:"", qty:"", price:"" }];
      materials.forEach(material => $("materialsContainer").appendChild(createMaterialRow(material)));

      const quote = getQuote(item);
      const quoteItems = quote.items.length ? quote.items : [{ description: item.title || "Trabajo", qty: 1, price: item.sale || 0 }];
      $("quoteItemsContainer").innerHTML = "";
      quoteItems.forEach(q => $("quoteItemsContainer").appendChild(createQuoteItemRow(q)));
      $("quoteDiscountType").value = quote.discountType || "none";
      $("quoteDiscountValue").value = quote.discountValue || "";
      $("quoteTaxPercent").value = quote.taxPercent ?? 0;

      setChecklistForm(getChecklist(item));
      state.pendingJobImages = [];
      renderJobPreview();
      renderJobDesignImages();
      openModal("jobModal");
    }
    function getFilteredJobs() {
      const q = cleanText($("jobSearch").value).toLowerCase();
      const statusFilter = cleanText($("jobStatusFilter").value);
      const priorityFilter = cleanText($("jobPriorityFilter").value);
      const typeFilter = cleanText($("jobTypeFilter").value);
      const createdFrom = cleanText($("jobCreatedFrom").value);
      const createdTo = cleanText($("jobCreatedTo").value);
      const dueFrom = cleanText($("jobDueFrom").value);
      const dueTo = cleanText($("jobDueTo").value);

      return state.jobs.filter(job => {
        const client = getClientById(job.clientId);
        const bag = `${job.title || ""} ${clientLabel(client)} ${job.description || ""}`.toLowerCase();

        const okText = bag.includes(q);
        const okStatus = !statusFilter || job.status === statusFilter;
        const okPriority = !priorityFilter || (job.priority || "Media") === priorityFilter;
        const okType = !typeFilter || getJobTypeLabel(job) === typeFilter;
        const okCreated = (!createdFrom && !createdTo) || isBetween(job.date, createdFrom, createdTo);
        const okDue = (!dueFrom && !dueTo) || (job.dueDate && isBetween(job.dueDate, dueFrom, dueTo));

        return okText && okStatus && okPriority && okType && okCreated && okDue;
      });
    }
    function getDueSoonJobs(days = 7) {
      const now = new Date();
      const limit = new Date();
      limit.setDate(limit.getDate() + days);
      const from = now.toISOString().slice(0, 10);
      const to = limit.toISOString().slice(0, 10);

      return state.jobs
        .filter(job =>
          job.dueDate &&
          !["Pagado","Cancelado"].includes(job.status) &&
          job.dueDate >= from &&
          job.dueDate <= to
        )
        .sort((a, b) => String(a.dueDate || "").localeCompare(String(b.dueDate || "")));
    }
    function getDueTodayJobs() {
      return state.jobs.filter(job =>
        job.dueDate === today() &&
        !["Pagado","Cancelado"].includes(job.status)
      );
    }
    function getPendingPaymentJobs() {
      return state.jobs.filter(job => {
        const calc = computeJob(job);
        return calc.balance > 0 && !["Cancelado","Pagado"].includes(job.status);
      });
    }
    function renderJobs() {
      const rows = getFilteredJobs();

      $("jobsBody").innerHTML = rows.map(job => {
        const client = getClientById(job.clientId);
        const calc = computeJob(job);
        const overdue = isOverdue(job);

        return `
          <tr>
            <td>${safe(clientLabel(client))}</td>
            <td>
              <div><strong>${safe(job.title || "-")}</strong></div>
              <div class="module-badge">${safe(getJobTypeLabel(job))}</div>
              <div style="margin-top:6px;">${inventoryStatePill(job)}</div>
              <small>${safe(job.description || job.notes || "-")}</small>
            </td>
            <td>${safe(formatDate(job.date))}</td>
            <td class="${overdue ? "overdue" : ""}">${safe(formatDate(job.dueDate))}${overdue ? " · Vencido" : ""}</td>
            <td>${priorityPill(job.priority || "Media")}</td>
            <td>${money(calc.sale)}</td>
            <td>${money(calc.cost)}</td>
            <td>${money(calc.profit)}</td>
            <td>${money(calc.paid)}</td>
            <td>${money(calc.balance)}</td>
            <td>${safe(checklistProgress(job))}</td>
            <td>${statusPill(job.status || "Cotización")}</td>
            <td>
              <div class="actions-row">
                <button class="btn btn-info btn-small" data-wa-client="${job.clientId}" data-wa-mode="general">WhatsApp</button>
                <button class="btn btn-info btn-small" data-wa-client="${job.clientId}" data-wa-mode="cobro" data-wa-job="${job.id}">Cobro</button>
                <button class="btn btn-info btn-small" data-wa-client="${job.clientId}" data-wa-mode="entrega" data-wa-job="${job.id}">Entrega</button>
                ${canWriteData("trabajos") ? `<button class="btn btn-secondary btn-small" data-edit-job="${job.id}">Editar</button>` : ""}
                ${canWriteData("trabajos") ? `<button class="btn btn-info btn-small" data-status-job="${job.id}" data-next="${safe(nextStatus(job.status))}">${safe(nextStatusLabel(job.status))}</button>` : ""}
                ${canWriteData("trabajos") ? `<button class="btn btn-info btn-small" data-pay-job="${job.id}">+ Pago</button>` : ""}
                <button class="btn btn-secondary btn-small" data-quote-job="${job.id}">Cotización PDF</button>
                <button class="btn btn-secondary btn-small" data-buy-pdf="${job.id}">PDF compra</button>
                ${canDeleteData("trabajos") ? `<button class="btn btn-danger btn-small" data-delete-job="${job.id}">Eliminar</button>` : ""}
              </div>
            </td>
          </tr>
        `;
      }).join("");

      $("jobsEmpty").classList.toggle("hidden", rows.length > 0);
      renderKanban();
      renderStats();
      renderDueSoonPanel();
      renderFrequentClients();
      renderDeliveryCalendar();
      fillPaymentJobSelect($("paymentJobId").value);
      if ($("expenseJobId")) fillExpenseJobSelect($("expenseJobId").value);
    }
    function renderKanban() {
      const rows = getFilteredJobs().filter(job => !["Pagado","Cancelado"].includes(job.status));
      const board = $("kanbanBoard");
      board.innerHTML = "";

      KANBAN_STATUSES.forEach(status => {
        const colJobs = rows.filter(job => job.status === status);
        const col = document.createElement("div");
        col.className = "kanban-col";
        col.innerHTML = `
          <div class="kanban-col-head">
            <strong>${status}</strong>
            <span class="kanban-count">${colJobs.length}</span>
          </div>
          <div class="kanban-list">
            ${colJobs.map(job => {
              const client = getClientById(job.clientId);
              const calc = computeJob(job);
              const overdue = isOverdue(job);
              return `
                <div class="kanban-card">
                  <h4>${safe(job.title || "-")}</h4>
                  <small>${safe(clientLabel(client))}</small>
                  <div class="module-badge">${safe(getJobTypeLabel(job))}</div>
                  <div style="margin-top:4px;">${inventoryStatePill(job)}</div>
                  <div class="kanban-meta">
                    ${priorityPill(job.priority || "Media")}
                    ${overdue ? '<span class="pill st-cancelado">Vencido</span>' : ""}
                  </div>
                  <small>Entrega: ${safe(job.dueDate || "-")}</small>
                  <small>Saldo: ${money(calc.balance)}</small>
                  <small>Checklist: ${safe(checklistProgress(job))}</small>
                  <div class="kanban-actions">
                    <button class="btn btn-secondary btn-small" data-edit-job="${job.id}">Abrir</button>
                    ${canWriteData("trabajos") ? `<button class="btn btn-info btn-small" data-status-job="${job.id}" data-next="${safe(nextStatus(job.status))}">${safe(nextStatusLabel(job.status))}</button>` : ""}
                    <button class="btn btn-info btn-small" data-wa-client="${job.clientId}" data-wa-mode="general">WhatsApp</button>
                  </div>
                </div>
              `;
            }).join("") || `<div class="section-note">Sin trabajos aquí.</div>`}
          </div>
        `;
        board.appendChild(col);
      });
    }
    function renderDueSoonPanel() {
      const rows = getDueSoonJobs(7);
      $("dueSoonBody").innerHTML = rows.map(job => {
        const client = getClientById(job.clientId);
        const calc = computeJob(job);
        const overdue = isOverdue(job);

        return `
          <tr>
            <td>${safe(clientLabel(client))}</td>
            <td><strong>${safe(job.title || "-")}</strong><div class="module-badge">${safe(getJobTypeLabel(job))}</div></td>
            <td class="${overdue ? "overdue" : ""}">${safe(job.dueDate || "-")}</td>
            <td>${priorityPill(job.priority || "Media")}</td>
            <td>${money(calc.balance)}</td>
            <td>${safe(checklistProgress(job))}</td>
            <td>${statusPill(job.status || "Cotización")}</td>
            <td>
              <div class="actions-row">
                <button class="btn btn-info btn-small" data-wa-client="${job.clientId}" data-wa-mode="entrega" data-wa-job="${job.id}">Avisar entrega</button>
                <button class="btn btn-secondary btn-small" data-open-job="${job.id}">Abrir</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");
      $("dueSoonEmpty").classList.toggle("hidden", rows.length > 0);
    }
    function renderStats() {
      const month = currentMonthKey();

      const monthSales = state.jobs
        .filter(job => monthKey(job.date) === month && !["Cancelado"].includes(job.status))
        .reduce((sum, job) => sum + Number(job.sale || 0), 0);

      const monthCollected = state.jobs.reduce((sum, job) => {
        return sum + getPaymentsList(job)
          .filter(payment => monthKey(payment.date) === month)
          .reduce((sub, payment) => sub + Number(payment.amount || 0), 0);
      }, 0);

      const monthExpenses = state.expenses
        .filter(expense => monthKey(expense.date) === month)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      const monthProfitBase = state.jobs
        .filter(job => monthKey(job.date) === month && !["Cancelado"].includes(job.status))
        .reduce((sum, job) => sum + computeJob(job).profit, 0);

      const overallReceivable = state.jobs
        .filter(job => !["Pagado", "Cancelado"].includes(job.status))
        .reduce((sum, job) => sum + computeJob(job).balance, 0);

      const dueToday = getDueTodayJobs().length;
      const due7 = getDueSoonJobs(7).length;
      const overdueJobs = state.jobs.filter(job => isOverdue(job)).length;
      const activeJobs = state.jobs.filter(job => ACTIVE_STATUSES.includes(job.status)).length;
      const pendingPayments = getPendingPaymentJobs().length;

      $("mSales").textContent = money(monthSales);
      $("mCollected").textContent = money(monthCollected);
      $("mExpenses").textContent = money(monthExpenses);
      $("mProfit").textContent = money(monthProfitBase - monthExpenses);
      $("allReceivable").textContent = money(overallReceivable);
      $("dueTodayCount").textContent = String(dueToday);
      $("due7Count").textContent = String(due7);
      $("allOverdueJobs").textContent = String(overdueJobs);
      $("allActiveJobs").textContent = String(activeJobs);
      $("pendingPaymentsCount").textContent = String(pendingPayments);
      $("allClients").textContent = String(state.clients.length);
    }
    function renderDeliveryCalendar() {
      const grid = $("calendarGrid");
      grid.innerHTML = "";

      const year = state.calendarDate.getFullYear();
      const month = state.calendarDate.getMonth();

      const label = state.calendarDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
      $("calendarLabel").textContent = label.charAt(0).toUpperCase() + label.slice(1);

      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      let firstWeekDay = firstDay.getDay();
      if (firstWeekDay === 0) firstWeekDay = 7;

      const start = new Date(firstDay);
      start.setDate(firstDay.getDate() - (firstWeekDay - 1));

      const end = new Date(lastDay);
      let lastWeekDay = end.getDay();
      if (lastWeekDay === 0) lastWeekDay = 7;
      end.setDate(lastDay.getDate() + (7 - lastWeekDay));

      const dueMap = {};
      state.jobs.forEach(job => {
        if (!job.dueDate) return;
        if (!dueMap[job.dueDate]) dueMap[job.dueDate] = [];
        dueMap[job.dueDate].push(job);
      });

      const cursor = new Date(start);
      while (cursor <= end) {
        const cellDate = cursor.toISOString().slice(0, 10);
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        if (cursor.getMonth() !== month) cell.classList.add("muted");
        if (cellDate === today()) cell.classList.add("today");

        const jobs = (dueMap[cellDate] || []).sort((a, b) => {
          const pa = a.priority || "Media";
          const pb = b.priority || "Media";
          const order = { "Alta": 0, "Media": 1, "Baja": 2 };
          return order[pa] - order[pb];
        });

        let jobsHtml = jobs.slice(0, 3).map(job => {
          const client = getClientById(job.clientId);
          const overdue = isOverdue(job) ? " overdue" : "";
          return `
            <div class="calendar-job${overdue}" data-open-job="${job.id}">
              <strong>${safe(job.title || "-")}</strong><br>
              <span>${safe(clientLabel(client))}</span>
            </div>
          `;
        }).join("");

        if (jobs.length > 3) {
          jobsHtml += `<div class="section-note">+${jobs.length - 3} más</div>`;
        }

        cell.innerHTML = `
          <div class="calendar-date">${cursor.getDate()}</div>
          ${jobsHtml || '<div class="section-note">Sin entregas</div>'}
        `;

        grid.appendChild(cell);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
