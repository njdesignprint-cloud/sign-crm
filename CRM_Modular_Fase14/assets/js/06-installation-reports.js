    function renderInstallationModule() {
      fillInstallationAssigneeList();
      fillInstallationAssignedFilter();

      const rows = getFilteredInstallationJobs();
      const todayValue = today();
      const currentMonth = state.installationCalendarDate.getMonth();
      const currentYear = state.installationCalendarDate.getFullYear();
      const next7 = new Date();
      next7.setDate(next7.getDate() + 7);
      const next7Key = next7.toISOString().slice(0, 10);

      const allInstalls = state.jobs
        .map(job => ({ job, installation: getJobInstallation(job), client: getClientById(job.clientId) }))
        .filter(item => item.installation.date);

      const todayCount = allInstalls.filter(item => item.installation.date === todayValue).length;
      const next7Count = allInstalls.filter(item => item.installation.date >= todayValue && item.installation.date <= next7Key).length;
      const pendingCount = allInstalls.filter(item => ["", "Pendiente", "Confirmada", "Reprogramada"].includes(item.installation.status || "")).length;
      const doneMonthCount = allInstalls.filter(item => {
        const d = new Date(`${item.installation.date}T00:00:00`);
        return item.installation.status === "Completada" && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      }).length;

      if ($("installTodayCount")) $("installTodayCount").textContent = String(todayCount);
      if ($("installNext7Count")) $("installNext7Count").textContent = String(next7Count);
      if ($("installPendingCount")) $("installPendingCount").textContent = String(pendingCount);
      if ($("installDoneMonthCount")) $("installDoneMonthCount").textContent = String(doneMonthCount);

      if ($("installationBody")) {
        $("installationBody").innerHTML = rows.map(({ job, installation, client }) => `
          <tr>
            <td>${safe(formatDate(installation.date))}</td>
            <td>${safe(formatTimeRange(installation.startTime, installation.endTime))}</td>
            <td>${safe(clientLabel(client))}</td>
            <td>${safe(job.title || "-")}</td>
            <td>${safe(installation.assignedTo || installation.crew || "-")}</td>
            <td><small>${safe(installation.address || "-")}</small></td>
            <td><span class="pill ${installationStatusClass(installation.status)}">${safe(installation.status || "Pendiente")}</span></td>
            <td>
              <div class="actions-row">
                ${canWriteData("trabajos") ? `<button class="btn btn-secondary btn-small" data-edit-job="${job.id}">Editar</button>` : `<button class="btn btn-secondary btn-small" data-open-job="${job.id}">Ver</button>`}
                <button class="btn btn-info btn-small" data-wa-client="${job.clientId}" data-wa-job="${job.id}" data-wa-mode="entrega">WhatsApp</button>
              </div>
            </td>
          </tr>
        `).join("");
      }
      if ($("installationEmpty")) $("installationEmpty").classList.toggle("hidden", rows.length > 0);

      renderInstallationMonthCalendar(allInstalls);
    }
    function renderInstallationMonthCalendar(installs = null) {
      const grid = $("installationCalendarGrid");
      if (!grid) return;
      grid.innerHTML = "";

      const year = state.installationCalendarDate.getFullYear();
      const month = state.installationCalendarDate.getMonth();
      const label = state.installationCalendarDate.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
      $("installationCalendarLabel").textContent = label.charAt(0).toUpperCase() + label.slice(1);

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

      const source = installs || state.jobs
        .map(job => ({ job, installation: getJobInstallation(job), client: getClientById(job.clientId) }))
        .filter(item => item.installation.date);

      const installMap = {};
      source.forEach(item => {
        if (!installMap[item.installation.date]) installMap[item.installation.date] = [];
        installMap[item.installation.date].push(item);
      });

      const cursor = new Date(start);
      while (cursor <= end) {
        const cellDate = cursor.toISOString().slice(0, 10);
        const cell = document.createElement("div");
        cell.className = "calendar-cell";
        if (cursor.getMonth() !== month) cell.classList.add("muted");
        if (cellDate === today()) cell.classList.add("today");

        const jobs = (installMap[cellDate] || []).sort((a, b) => `${a.installation.startTime || "00:00"}`.localeCompare(`${b.installation.startTime || "00:00"}`));
        let jobsHtml = jobs.slice(0, 3).map(item => `
          <div class="calendar-job" data-open-job="${item.job.id}">
            <strong>${safe(item.job.title || "-")}</strong><br>
            <span>${safe(formatTimeRange(item.installation.startTime, item.installation.endTime))}</span><br>
            <small>${safe(item.installation.assignedTo || clientLabel(item.client))}</small>
          </div>
        `).join("");

        if (jobs.length > 3) jobsHtml += `<div class="section-note">+${jobs.length - 3} más</div>`;

        cell.innerHTML = `
          <div class="calendar-date">${cursor.getDate()}</div>
          ${jobsHtml || '<div class="section-note">Sin instalaciones</div>'}
        `;
        grid.appendChild(cell);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    function getCurrentInstallationForm(clientId = "") {
      const client = getClientById(clientId || cleanText($("jobClientId")?.value));
      const fallbackAddress = [cleanText(client?.address), cleanText(client?.city)].filter(Boolean).join(", ");
      return {
        date: cleanText($("jobInstallDate").value),
        startTime: cleanText($("jobInstallStartTime").value),
        endTime: cleanText($("jobInstallEndTime").value),
        assignedTo: cleanText($("jobInstallAssignedTo").value),
        crew: cleanText($("jobInstallCrew").value),
        status: cleanText($("jobInstallStatus").value),
        address: cleanText($("jobInstallAddress").value) || fallbackAddress,
        window: cleanText($("jobInstallWindow").value),
        notes: cleanText($("jobInstallNotes").value)
      };
    }
    function getReportDateRange() {
      return {
        from: cleanText($("reportFrom")?.value),
        to: cleanText($("reportTo")?.value),
        status: cleanText($("reportJobStatusFilter")?.value)
      };
    }
    function getFilteredReportJobs() {
      const { from, to, status } = getReportDateRange();
      return state.jobs.filter(job => {
        if (from && cleanText(job.date) && cleanText(job.date) < from) return false;
        if (to && cleanText(job.date) && cleanText(job.date) > to) return false;
        if (status && cleanText(job.status) !== status) return false;
        return true;
      });
    }
    function getFilteredReportExpenses() {
      const { from, to } = getReportDateRange();
      return state.expenses.filter(expense => {
        if (from && cleanText(expense.date) < from) return false;
        if (to && cleanText(expense.date) > to) return false;
        return true;
      });
    }
    function getFilteredReportPurchaseOrders() {
      const { from, to } = getReportDateRange();
      return state.purchaseOrders.filter(po => {
        if (from && cleanText(po.date) < from) return false;
        if (to && cleanText(po.date) > to) return false;
        return true;
      });
    }
    function getReportsMonthlySummaryRows() {
      const rows = [];
      const base = new Date();
      base.setDate(1);

      for (let i = 5; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const jobs = state.jobs.filter(job => monthKey(job.date) === key && cleanText(job.status) !== "Cancelado");
        const expenses = state.expenses.filter(expense => monthKey(expense.date) === key);
        const sales = jobs.reduce((sum, job) => sum + Number(job.sale || 0), 0);
        const collected = jobs.reduce((sum, job) => {
          return sum + getPaymentsList(job)
            .filter(payment => monthKey(payment.date) === key)
            .reduce((sub, payment) => sub + Number(payment.amount || 0), 0);
        }, 0);
        const monthExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
        const profit = jobs.reduce((sum, job) => sum + computeJob(job).profit, 0) - monthExpenses;

        rows.push({
          monthKey: key,
          label: d.toLocaleDateString("es-ES", { month: "long", year: "numeric" }),
          sales,
          collected,
          expenses: monthExpenses,
          profit
        });
      }
      return rows;
    }
    function renderReportsModule() {
      const salesEl = $("reportSalesTotal");
      if (!salesEl) return;

      const jobs = getFilteredReportJobs();
      const expenses = getFilteredReportExpenses();
      const orders = getFilteredReportPurchaseOrders();

      const sales = jobs.filter(job => cleanText(job.status) !== "Cancelado").reduce((sum, job) => sum + Number(job.sale || 0), 0);
      const collected = jobs.reduce((sum, job) => sum + getPaymentsTotal(job), 0);
      const receivable = jobs.filter(job => cleanText(job.status) !== "Cancelado").reduce((sum, job) => sum + computeJob(job).balance, 0);
      const netProfit = jobs.filter(job => cleanText(job.status) !== "Cancelado").reduce((sum, job) => sum + computeJob(job).profit, 0) - expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      salesEl.textContent = money(sales);
      $("reportCollectedTotal").textContent = money(collected);
      $("reportReceivableTotal").textContent = money(receivable);
      $("reportNetProfitTotal").textContent = money(netProfit);

      const monthlyRows = getReportsMonthlySummaryRows();
      $("reportsMonthlyBody").innerHTML = monthlyRows.map(row => `
        <tr>
          <td>${safe(row.label.charAt(0).toUpperCase() + row.label.slice(1))}</td>
          <td>${money(row.sales)}</td>
          <td>${money(row.collected)}</td>
          <td>${money(row.expenses)}</td>
          <td>${money(row.profit)}</td>
        </tr>
      `).join("");
      $("reportsMonthlyEmpty").classList.toggle("hidden", monthlyRows.length > 0);

      const bestJobs = jobs
        .filter(job => cleanText(job.status) !== "Cancelado")
        .map(job => ({ job, calc: computeJob(job), client: getClientById(job.clientId) }))
        .sort((a, b) => b.calc.profit - a.calc.profit)
        .slice(0, 12);

      $("reportsBestJobsBody").innerHTML = bestJobs.map(item => `
        <tr>
          <td>${safe(clientLabel(item.client))}</td>
          <td><strong>${safe(item.job.title || "-")}</strong></td>
          <td>${statusPill(item.job.status || "Cotización")}</td>
          <td>${money(item.calc.sale)}</td>
          <td>${money(item.calc.cost)}</td>
          <td>${money(item.calc.profit)}</td>
          <td>${Number(item.calc.margin || 0).toFixed(2)}%</td>
        </tr>
      `).join("");
      $("reportsBestJobsEmpty").classList.toggle("hidden", bestJobs.length > 0);

      const receivableRows = jobs
        .filter(job => cleanText(job.status) !== "Cancelado")
        .map(job => ({ job, calc: computeJob(job), client: getClientById(job.clientId) }))
        .filter(item => item.calc.balance > 0)
        .sort((a, b) => b.calc.balance - a.calc.balance);

      $("reportsReceivablesBody").innerHTML = receivableRows.map(item => `
        <tr>
          <td>${safe(clientLabel(item.client))}</td>
          <td><strong>${safe(item.job.title || "-")}</strong></td>
          <td>${statusPill(item.job.status || "Cotización")}</td>
          <td>${safe(item.job.dueDate || "-")}</td>
          <td>${money(item.calc.sale)}</td>
          <td>${money(item.calc.paid)}</td>
          <td>${money(item.calc.balance)}</td>
        </tr>
      `).join("");
      $("reportsReceivablesEmpty").classList.toggle("hidden", receivableRows.length > 0);

      const categoryMap = {};
      expenses.forEach(expense => {
        const key = cleanText(expense.category) || "Sin categoría";
        if (!categoryMap[key]) categoryMap[key] = { category: key, total: 0, count: 0 };
        categoryMap[key].total += Number(expense.amount || 0);
        categoryMap[key].count += 1;
      });
      const expenseRows = Object.values(categoryMap).sort((a, b) => b.total - a.total);
      $("reportsExpensesByCategoryBody").innerHTML = expenseRows.map(row => `
        <tr>
          <td>${safe(row.category)}</td>
          <td>${money(row.total)}</td>
          <td>${row.count}</td>
        </tr>
      `).join("");
      $("reportsExpensesByCategoryEmpty").classList.toggle("hidden", expenseRows.length > 0);

      const materialMap = {};
      jobs.forEach(job => {
        (Array.isArray(job.materials) ? job.materials : []).forEach(material => {
          const key = cleanText(material.inventoryId) || cleanText(material.name) || "Material";
          if (!materialMap[key]) {
            materialMap[key] = {
              name: cleanText(material.inventoryName || material.name) || "Material",
              unit: cleanText(material.inventoryUnit || material.unit) || "-",
              qty: 0,
              cost: 0
            };
          }
          materialMap[key].qty += Number(material.qty || 0);
          materialMap[key].cost += Number(material.qty || 0) * Number(material.price || 0);
        });
      });
      const materialRows = Object.values(materialMap).sort((a, b) => b.cost - a.cost).slice(0, 15);
      $("reportsMaterialsBody").innerHTML = materialRows.map(row => `
        <tr>
          <td>${safe(row.name)}</td>
          <td>${safe(row.unit)}</td>
          <td>${Number(row.qty || 0).toLocaleString()}</td>
          <td>${money(row.cost)}</td>
        </tr>
      `).join("");
      $("reportsMaterialsEmpty").classList.toggle("hidden", materialRows.length > 0);

      const providerMap = {};
      orders.forEach(order => {
        const provider = getProviderById(order.providerId);
        const key = cleanText(order.providerId) || cleanText(order.providerName) || "Sin proveedor";
        if (!providerMap[key]) {
          providerMap[key] = {
            name: cleanText(provider?.name || order.providerName) || "Sin proveedor",
            orders: 0,
            total: 0,
            lastDate: ""
          };
        }
        providerMap[key].orders += 1;
        providerMap[key].total += Number(getPurchaseOrderTotal(order) || 0);
        if (cleanText(order.date) > cleanText(providerMap[key].lastDate)) providerMap[key].lastDate = cleanText(order.date);
      });
      const providerRows = Object.values(providerMap).sort((a, b) => b.total - a.total);
      $("reportsProvidersBody").innerHTML = providerRows.map(row => `
        <tr>
          <td>${safe(row.name)}</td>
          <td>${row.orders}</td>
          <td>${money(row.total)}</td>
          <td>${safe(row.lastDate || "-")}</td>
        </tr>
      `).join("");
      $("reportsProvidersEmpty").classList.toggle("hidden", providerRows.length > 0);
    }
