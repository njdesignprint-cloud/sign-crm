    function getExpensePhotos(expense = {}) {
      return Array.isArray(expense.photos) ? [...expense.photos] : [];
    }
    function renderExpensePhotos() {
      const box = $("expensePhotosGallery");
      if (!box) return;

      const expense = state.editingExpenseId ? state.expenses.find(item => item.id === state.editingExpenseId) : null;
      const images = state.editingExpenseId ? getExpensePhotos(expense) : [...state.pendingExpensePhotos];

      if (!images.length) {
        box.innerHTML = `<div class="section-note">${state.editingExpenseId ? "Todavía no hay fotos subidas para este gasto." : "Puedes subir fotos ahora mismo y se guardarán junto con el gasto cuando pulses Guardar gasto."}</div>`;
        return;
      }

      box.innerHTML = `
        <div class="gallery-strip">
          ${images.map((img, index) => `
            <div class="gallery-thumb">
              <img src="${img.url}" alt="${safe(img.fileName || "Comprobante")}" onclick="window.open('${img.url}','_blank')">
              <div class="gallery-thumb-info">
                <div><strong>${safe(img.fileName || `Foto ${index + 1}`)}</strong></div>
                <div>${safe(formatDateTime(img.uploadedAt))}</div>
                <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
                  <a href="${img.url}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-small">Ver</a>
                  <button type="button" class="btn btn-danger btn-small" onclick="deleteExpensePhoto(${index})">Eliminar</button>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      `;
    }
    async function deleteExpensePhoto(index) {
      if (!state.editingExpenseId) {
        if (index < 0 || index >= state.pendingExpensePhotos.length) return;
        if (!confirm("¿Eliminar esta foto del gasto?")) return;
        state.pendingExpensePhotos.splice(index, 1);
        renderExpensePhotos();
        showToast("Foto quitada del gasto nuevo.");
        return;
      }

      const expense = state.expenses.find(item => item.id === state.editingExpenseId);
      if (!expense) return showToast("No se encontró el gasto.");

      const images = getExpensePhotos(expense);
      if (index < 0 || index >= images.length) return;
      if (!confirm("¿Eliminar esta foto del gasto?")) return;

      images.splice(index, 1);

      try {
        await expensesRef().doc(state.editingExpenseId).update({
          photos: images,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        showToast("Foto eliminada del gasto.");
      } catch (error) {
        console.error(error);
        showToast("No se pudo eliminar la foto del gasto.");
      }
    }
    function openExpenseUploadWidget() {
      if (!guardWrite("subir fotos", state.currentView === "gastos" ? "gastos" : "trabajos")) return;
      openCloudinaryImageWidget({
        multiple: true,
        maxFiles: 10,
        errorMessage: "Error subiendo la imagen del gasto.",
        persistErrorMessage: "La imagen subió, pero no se pudo guardar en el gasto.",
        onSuccess: async (asset) => {
          if (!state.editingExpenseId) {
            state.pendingExpensePhotos.push(asset);
            renderExpensePhotos();
            showToast("Foto agregada al gasto nuevo. Guarda el gasto para dejarla registrada.");
            return;
          }

          const expense = state.expenses.find(item => item.id === state.editingExpenseId);
          if (!expense) return;

          const images = getExpensePhotos(expense);
          images.push(asset);

          await expensesRef().doc(state.editingExpenseId).update({
            photos: images,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          showToast("Foto subida al gasto.");
        }
      });
    }
    function resetExpenseForm(jobId = "") {
      state.editingExpenseId = null;
      $("expenseModalTitle").textContent = "Nuevo gasto";
      $("expenseConcept").value = "";
      $("expenseCategory").value = "Operación";
      $("expenseAmount").value = "";
      $("expenseDate").value = today();
      $("expenseNotes").value = "";
      fillExpenseJobSelect(jobId || "");
      $("expenseJobId").value = jobId || "";
      state.pendingExpensePhotos = [];
      renderExpensePhotos();
    }
    function resetRecurringForm() {
      state.editingRecurringId = null;
      $("recurringModalTitle").textContent = "Nuevo gasto recurrente";
      $("recurringConcept").value = "";
      $("recurringCategory").value = "Operación";
      $("recurringAmount").value = "";
      $("recurringDay").value = "1";
      $("recurringNotes").value = "";
      $("recurringActive").checked = true;
    }
    function resetPaymentForm(jobId = "") {
      state.workingPaymentJobId = jobId || "";
      fillPaymentJobSelect(jobId || "");
      $("paymentAmount").value = "";
      $("paymentDate").value = today();
      $("paymentMethod").value = "Efectivo";
      $("paymentNote").value = "";
    }
    async function saveExpense() {
      if (!guardWrite("guardar gastos", "gastos")) return;
      const payload = {
        concept: cleanText($("expenseConcept").value),
        category: cleanText($("expenseCategory").value),
        amount: Number($("expenseAmount").value || 0),
        date: cleanText($("expenseDate").value) || today(),
        jobId: cleanText($("expenseJobId").value),
        notes: cleanText($("expenseNotes").value),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!payload.concept) return showToast("Escribe el concepto del gasto.");
      if (payload.amount <= 0) return showToast("El monto debe ser mayor que 0.");

      try {
        if (state.editingExpenseId) {
          const existing = state.expenses.find(item => item.id === state.editingExpenseId) || {};
          payload.photos = getExpensePhotos(existing);
          await expensesRef().doc(state.editingExpenseId).update(payload);
          showToast("Gasto actualizado.");
        } else {
          payload.photos = [...state.pendingExpensePhotos];
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await expensesRef().add(payload);
          state.pendingExpensePhotos = [];
          showToast("Gasto guardado.");
        }
        closeModal("expenseModal");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el gasto.");
      }
    }
    async function saveRecurring() {
      if (!guardWrite("guardar gastos recurrentes", "gastos")) return;
      const payload = {
        concept: cleanText($("recurringConcept").value),
        category: cleanText($("recurringCategory").value),
        amount: Number($("recurringAmount").value || 0),
        dayOfMonth: Number($("recurringDay").value || 1),
        notes: cleanText($("recurringNotes").value),
        active: !!$("recurringActive").checked,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!payload.concept) return showToast("Escribe el concepto.");
      if (payload.amount <= 0) return showToast("El monto debe ser mayor que 0.");
      if (payload.dayOfMonth < 1 || payload.dayOfMonth > 31) return showToast("El día del mes debe estar entre 1 y 31.");

      try {
        if (state.editingRecurringId) {
          await recurringRef().doc(state.editingRecurringId).update(payload);
          showToast("Recurrente actualizado.");
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          payload.lastGeneratedMonth = "";
          await recurringRef().add(payload);
          showToast("Gasto recurrente guardado.");
        }
        closeModal("recurringModal");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el gasto recurrente.");
      }
    }
    async function savePayment() {
      if (!guardWrite("guardar pagos", "trabajos")) return;
      const jobId = cleanText($("paymentJobId").value);
      const amount = Number($("paymentAmount").value || 0);
      const date = cleanText($("paymentDate").value) || today();
      const method = cleanText($("paymentMethod").value) || "Efectivo";
      const note = cleanText($("paymentNote").value);

      if (!jobId) return showToast("Selecciona un trabajo.");
      if (amount <= 0) return showToast("El pago debe ser mayor que 0.");

      const job = getJobById(jobId);
      if (!job) return showToast("No se encontró el trabajo.");

      try {
        const payments = getPaymentsList(job).filter(item => !String(item.id || "").startsWith("legacy-"));
        const legacyPaid = Array.isArray(job.payments) && job.payments.length ? 0 : Number(job.paid || 0);
        const currentPaid = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0) + legacyPaid;
        const sale = Number(job.sale || 0);

        if (sale > 0 && currentPaid + amount > sale) {
          return showToast("Ese pago supera el total del trabajo.");
        }

        payments.push({
          id: "p-" + Date.now(),
          amount,
          date,
          method,
          note
        });

        const totalAfter = payments.reduce((sum, item) => sum + Number(item.amount || 0), 0);
        const newStatus = sale > 0 && totalAfter >= sale ? "Pagado" : job.status;
        const logs = [...getJobActivityLog(job), newLogEntry("pago", `Pago agregado por ${amount.toFixed(2)}.`)];

        await jobsRef().doc(jobId).update({
          payments,
          status: newStatus,
          activityLog: logs,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast("Pago guardado.");
        closeModal("paymentModal");

        if (state.editingJobId === jobId) {
          setTimeout(() => {
            const updated = getJobById(jobId);
            if (updated) editJob(jobId);
          }, 350);
        }
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el pago.");
      }
    }
    async function ensureRecurringExpensesForCurrentMonth() {
      const month = currentMonthKey();
      const actives = state.recurringExpenses.filter(item => item.active);

      for (const recurring of actives) {
        const docId = `rec-${recurring.id}-${month}`;
        const targetDoc = expensesRef().doc(docId);
        const snapshot = await targetDoc.get();

        if (!snapshot.exists) {
          await targetDoc.set({
            concept: recurring.concept,
            category: recurring.category,
            amount: Number(recurring.amount || 0),
            date: getMonthDate(recurring.dayOfMonth),
            notes: recurring.notes ? `${recurring.notes} · Generado automáticamente` : "Generado automáticamente",
            recurringId: recurring.id,
            generatedMonth: month,
            autoGenerated: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

          await recurringRef().doc(recurring.id).update({
            lastGeneratedMonth: month,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        }
      }
    }
    function editExpense(id) {
      if (!canWriteData("gastos")) return showToast("No tienes permiso para editar gastos.");
      const item = state.expenses.find(e => e.id === id);
      if (!item) return;
      state.editingExpenseId = id;
      $("expenseModalTitle").textContent = "Editar gasto";
      $("expenseConcept").value = item.concept || "";
      $("expenseCategory").value = item.category || "Operación";
      $("expenseAmount").value = item.amount ?? "";
      $("expenseDate").value = item.date || today();
      fillExpenseJobSelect(item.jobId || "");
      $("expenseJobId").value = item.jobId || "";
      $("expenseNotes").value = item.notes || "";
      state.pendingExpensePhotos = [];
      renderExpensePhotos();
      openModal("expenseModal");
    }
    function editRecurring(id) {
      if (!canWriteData("gastos")) return showToast("No tienes permiso para editar gastos recurrentes.");
      const item = state.recurringExpenses.find(r => r.id === id);
      if (!item) return;
      state.editingRecurringId = id;
      $("recurringModalTitle").textContent = "Editar gasto recurrente";
      $("recurringConcept").value = item.concept || "";
      $("recurringCategory").value = item.category || "Operación";
      $("recurringAmount").value = item.amount ?? "";
      $("recurringDay").value = item.dayOfMonth ?? 1;
      $("recurringNotes").value = item.notes || "";
      $("recurringActive").checked = !!item.active;
      openModal("recurringModal");
    }
    function renderExpenses() {
      const rows = getFilteredExpenses();

      $("expensesBody").innerHTML = rows.map(expense => {
        const job = getJobById(expense.jobId || "");
        return `
        <tr>
          <td>${safe(expense.concept || "-")}</td>
          <td>${safe(expense.category || "-")}</td>
          <td>${money(expense.amount)}</td>
          <td>${safe(formatDate(expense.date))}</td>
          <td><small>${safe(job ? getJobDisplayLabel(job) : "-")}</small></td>
          <td>${(Array.isArray(expense.photos) ? expense.photos.length : 0)}</td>
          <td><small>${safe(expense.notes || "-")}</small></td>
          <td>
            <div class="actions-row">
              ${canWriteData("gastos") ? `<button class="btn btn-secondary btn-small" data-edit-expense="${expense.id}">Editar</button>` : ""}
              ${canDeleteData("gastos") ? `<button class="btn btn-danger btn-small" data-delete-expense="${expense.id}">Eliminar</button>` : ""}
            </div>
          </td>
        </tr>
      `}).join("");

      $("expensesEmpty").classList.toggle("hidden", rows.length > 0);
      renderStats();
    }
    function renderRecurringExpenses() {
      $("recurringBody").innerHTML = state.recurringExpenses.map(item => `
        <tr>
          <td>${safe(item.concept || "-")}</td>
          <td>${safe(item.category || "-")}</td>
          <td>${money(item.amount)}</td>
          <td>${safe(item.dayOfMonth || "-")}</td>
          <td>${item.active ? '<span class="pill st-pagado">Sí</span>' : '<span class="pill st-cancelado">No</span>'}</td>
          <td>${safe(item.lastGeneratedMonth || "-")}</td>
          <td><small>${safe(item.notes || "-")}</small></td>
          <td>
            <div class="actions-row">
              ${canWriteData("gastos") ? `<button class="btn btn-secondary btn-small" data-edit-recurring="${item.id}">Editar</button>` : ""}
              ${canDeleteData("gastos") ? `<button class="btn btn-danger btn-small" data-delete-recurring="${item.id}">Eliminar</button>` : ""}
            </div>
          </td>
        </tr>
      `).join("");

      $("recurringEmpty").classList.toggle("hidden", state.recurringExpenses.length > 0);
    }
