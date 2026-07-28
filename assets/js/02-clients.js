    function resetClientForm() {
      state.editingClientId = null;
      $("clientModalTitle").textContent = "Nuevo cliente";
      ["clientName","clientCompany","clientPhone","clientEmail","clientAddress","clientCity","clientNotes"].forEach(id => $(id).value = "");
      $("clientCommissionBox")?.classList.toggle("hidden", !isAdmin());
      if (isAdmin()) { $("clientSource").value = "company"; fillClientSalespersonSelect(); toggleClientCommissionFields(); }
    }
    async function saveClient() {
      if (!guardWrite("guardar clientes", "clientes")) return;
      const payload = {
        name: cleanText($("clientName").value),
        company: cleanText($("clientCompany").value),
        phone: cleanText($("clientPhone").value),
        email: cleanText($("clientEmail").value),
        address: cleanText($("clientAddress").value),
        city: cleanText($("clientCity").value),
        notes: cleanText($("clientNotes").value),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      };

      if (!payload.name && !payload.company) return showToast("Escribe al menos el nombre o la empresa.");
      if (isAdmin()) {
        payload.salesSource = cleanText($("clientSource").value) === "salesperson" ? "salesperson" : "company";
        payload.salespersonId = cleanText($("clientSalespersonId").value);
        payload.commissionPercent = Math.max(0, Math.min(100, Number($("clientCommissionPercent").value || 0)));
        payload.commissionBase = cleanText($("clientCommissionBase").value) || "collected";
        if (payload.salesSource === "salesperson" && !payload.salespersonId) return showToast("Select the salesperson for this client.");
        if (payload.salesSource === "company") { payload.salespersonId = ""; payload.commissionPercent = 0; }
        payload.salespersonNameSnapshot = state.salespeople.find(item => item.id === payload.salespersonId)?.name || "";
      }

      try {
        if (state.editingClientId) {
          await clientsRef().doc(state.editingClientId).update(payload);
          showToast("Cliente actualizado.");
        } else {
          payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
          await clientsRef().add(payload);
          showToast("Cliente guardado.");
        }
        closeModal("clientModal");
      } catch (error) {
        console.error(error);
        showToast("No se pudo guardar el cliente.");
      }
    }
    function editClient(id) {
      if (!canWriteData("clientes")) return showToast("No tienes permiso para editar clientes.");
      const item = getClientById(id);
      if (!item) return;
      state.editingClientId = id;
      $("clientModalTitle").textContent = "Editar cliente";
      $("clientName").value = item.name || "";
      $("clientCompany").value = item.company || "";
      $("clientPhone").value = item.phone || "";
      $("clientEmail").value = item.email || "";
      $("clientAddress").value = item.address || "";
      $("clientCity").value = item.city || "";
      $("clientNotes").value = item.notes || "";
      $("clientCommissionBox")?.classList.toggle("hidden", !isAdmin());
      if (isAdmin()) {
        $("clientSource").value = item.salesSource === "salesperson" ? "salesperson" : "company";
        fillClientSalespersonSelect(item.salespersonId || "");
        $("clientCommissionPercent").value = Number(item.commissionPercent ?? getSalespersonDefaultPercent(item.salespersonId) ?? 0);
        $("clientCommissionBase").value = item.commissionBase || "collected";
        toggleClientCommissionFields();
      }
      openModal("clientModal");
    }
    function renderClients() {
      const rows = getFilteredClients();

      $("clientsBody").innerHTML = rows.map(client => `
        <tr>
          <td>${safe(client.name || "-")}</td>
          <td>${safe(client.company || "-")}</td>
          <td>${safe(client.phone || "-")}</td>
          <td>${safe(client.email || "-")}</td>
          <td>${safe([client.address, client.city].filter(Boolean).join(", ") || "-")}</td>
          <td><small>${safe(client.notes || "-")}</small></td>
          <td>${client.salesSource === "salesperson" ? `<span class="pill st-aprobado">${safe(isAdmin() ? `${getSalespersonName(client.salespersonId, client.salespersonNameSnapshot)} · ${Number(client.commissionPercent || 0).toFixed(2)}%` : "Salesperson referred")}</span>` : '<span class="pill">Company direct</span>'}</td>
          <td>
            <div class="actions-row">
              <button class="btn btn-info btn-small" data-wa-client="${client.id}" data-wa-mode="general">WhatsApp</button>
              <button class="btn btn-secondary btn-small" data-client-pdf="${client.id}">PDF cliente</button>
              ${canWriteData("clientes") ? `<button class="btn btn-secondary btn-small" data-edit-client="${client.id}">Editar</button>` : ""}
              ${canDeleteData("clientes") ? `<button class="btn btn-danger btn-small" data-delete-client="${client.id}">Eliminar</button>` : ""}
            </div>
          </td>
        </tr>
      `).join("");

      $("clientsEmpty").classList.toggle("hidden", rows.length > 0);
      $("allClients").textContent = String(state.clients.length);
      fillClientSelect($("jobClientId").value);
      if ($("expenseJobId")) fillExpenseJobSelect($("expenseJobId").value);
      renderFrequentClients();
    }
    function renderFrequentClients() {
      const frequentClientsBody = $("frequentClientsBody");
      const frequentClientsEmpty = $("frequentClientsEmpty");
      if (!frequentClientsBody || !frequentClientsEmpty) return;

      const groups = {};

      state.jobs.forEach(job => {
        if (!job.clientId) return;
        const calc = computeJob(job);
        if (!groups[job.clientId]) {
          groups[job.clientId] = {
            clientId: job.clientId,
            jobs: 0,
            sales: 0,
            receivable: 0,
            latestDue: ""
          };
        }
        groups[job.clientId].jobs += 1;
        groups[job.clientId].sales += calc.sale;
        groups[job.clientId].receivable += calc.balance;
        if (job.dueDate && (!groups[job.clientId].latestDue || job.dueDate > groups[job.clientId].latestDue)) {
          groups[job.clientId].latestDue = job.dueDate;
        }
      });

      const rows = Object.values(groups)
        .sort((a,b) => b.jobs - a.jobs || b.sales - a.sales)
        .slice(0, 8);

      frequentClientsBody.innerHTML = rows.map(item => {
        const client = getClientById(item.clientId);
        return `
          <tr>
            <td>${safe(clientLabel(client))}</td>
            <td>${item.jobs}</td>
            <td>${money(item.sales)}</td>
            <td>${money(item.receivable)}</td>
            <td>${safe(item.latestDue || "-")}</td>
            <td>
              <div class="actions-row">
                <button class="btn btn-info btn-small" data-wa-client="${item.clientId}" data-wa-mode="general">WhatsApp</button>
                <button class="btn btn-secondary btn-small" data-filter-client-jobs="${item.clientId}">Ver trabajos</button>
              </div>
            </td>
          </tr>
        `;
      }).join("");

      frequentClientsEmpty.classList.toggle("hidden", rows.length > 0);
    }
