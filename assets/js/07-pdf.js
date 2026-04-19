    function exportReportsPdf() {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF("p", "mm", "a4");
      const jobs = getFilteredReportJobs();
      const expenses = getFilteredReportExpenses();
      const orders = getFilteredReportPurchaseOrders();
      const sales = jobs.filter(job => cleanText(job.status) !== "Cancelado").reduce((sum, job) => sum + Number(job.sale || 0), 0);
      const collected = jobs.reduce((sum, job) => sum + getPaymentsTotal(job), 0);
      const receivable = jobs.filter(job => cleanText(job.status) !== "Cancelado").reduce((sum, job) => sum + computeJob(job).balance, 0);
      const netProfit = jobs.filter(job => cleanText(job.status) !== "Cancelado").reduce((sum, job) => sum + computeJob(job).profit, 0) - expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      pdf.setFontSize(16);
      pdf.text("Reportes avanzados", 14, 16);
      pdf.setFontSize(10);
      pdf.text(`Generado: ${formatDateTime(new Date())}`, 14, 22);

      const { from, to, status } = getReportDateRange();
      const filterText = [
        from ? `Desde ${from}` : "Desde inicio",
        to ? `Hasta ${to}` : "Hasta hoy",
        status ? `Estado ${status}` : "Todos los estados"
      ].join(" · ");
      pdf.text(filterText, 14, 28);

      pdf.autoTable({
        startY: 34,
        head: [["Indicador", "Valor"]],
        body: [
          ["Ventas filtradas", money(sales)],
          ["Cobrado filtrado", money(collected)],
          ["Por cobrar", money(receivable)],
          ["Utilidad neta", money(netProfit)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      const monthlyRows = getReportsMonthlySummaryRows().map(row => [row.label, money(row.sales), money(row.collected), money(row.expenses), money(row.profit)]);
      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 8,
        head: [["Mes", "Ventas", "Cobrado", "Gastos", "Utilidad neta"]],
        body: monthlyRows.length ? monthlyRows : [["-", "-", "-", "-", "-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      const bestJobs = jobs
        .filter(job => cleanText(job.status) !== "Cancelado")
        .map(job => ({ job, calc: computeJob(job), client: getClientById(job.clientId) }))
        .sort((a, b) => b.calc.profit - a.calc.profit)
        .slice(0, 10)
        .map(item => [clientLabel(item.client), item.job.title || "-", item.job.status || "-", money(item.calc.sale), money(item.calc.cost), money(item.calc.profit), `${Number(item.calc.margin || 0).toFixed(2)}%`]);

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 8,
        head: [["Cliente", "Trabajo", "Estado", "Venta", "Costo", "Utilidad", "Margen"]],
        body: bestJobs.length ? bestJobs : [["-", "-", "-", "-", "-", "-", "-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      const expenseRows = (() => {
        const categoryMap = {};
        expenses.forEach(expense => {
          const key = cleanText(expense.category) || "Sin categoría";
          if (!categoryMap[key]) categoryMap[key] = { category: key, total: 0, count: 0 };
          categoryMap[key].total += Number(expense.amount || 0);
          categoryMap[key].count += 1;
        });
        return Object.values(categoryMap).sort((a, b) => b.total - a.total).map(row => [row.category, money(row.total), String(row.count)]);
      })();

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 8,
        head: [["Categoría", "Total", "Movimientos"]],
        body: expenseRows.length ? expenseRows : [["-", "-", "-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.save(`Reportes_Avanzados_${today()}.pdf`);
      showToast("PDF de reportes generado.");
    }
    function exportInstallationCalendarPdf() {
      const rows = getFilteredInstallationJobs();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      pdf.setFontSize(16);
      pdf.text("Calendario de instalación", 14, 16);
      pdf.setFontSize(10);
      pdf.text(`${COMPANY.name} · ${today()}`, 14, 22);
      pdf.autoTable({
        startY: 28,
        head: [["Fecha", "Hora", "Cliente", "Trabajo", "Responsable", "Dirección", "Estado"]],
        body: rows.map(({ job, installation, client }) => [
          formatDate(installation.date),
          formatTimeRange(installation.startTime, installation.endTime),
          clientLabel(client),
          job.title || "-",
          installation.assignedTo || installation.crew || "-",
          installation.address || "-",
          installation.status || "Pendiente"
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 34, 42] }
      });
      pdf.save(`Calendario_Instalacion_${today()}.pdf`);
      showToast("PDF de instalaciones exportado.");
    }
    function exportJson() {
      const payload = {
        exportedAt: new Date().toISOString(),
        company: COMPANY,
        user: state.userEmail,
        clients: state.clients,
        jobs: state.jobs,
        expenses: state.expenses,
        recurringExpenses: state.recurringExpenses,
        inventoryItems: state.inventoryItems,
        inventoryMovements: state.inventoryMovements
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nj_crm_fase8_${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Respaldo JSON exportado.");
    }
    function createModulePdf(title, subtitle = "") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      pdf.setFillColor(15, 18, 24);
      pdf.rect(0, 0, 210, 34, "F");
      pdf.setTextColor(184, 255, 0);
      pdf.setFontSize(20);
      pdf.text(COMPANY.name, 14, 18);
      pdf.setTextColor(240, 240, 240);
      pdf.setFontSize(10);
      pdf.text(`Tel: ${COMPANY.phone}`, 14, 25);
      pdf.text(`Email: ${COMPANY.email}`, 68, 25);
      pdf.text(`Fecha: ${new Date().toLocaleString()}`, 145, 25);
      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(15);
      pdf.text(title, 14, 44);
      if (subtitle) {
        pdf.setFontSize(10);
        pdf.setTextColor(90, 90, 90);
        pdf.text(subtitle, 14, 50);
        pdf.setTextColor(20, 20, 20);
      }
      return pdf;
    }
    function exportDashboardPdf() {
      const pdf = createModulePdf('Dashboard general', 'Resumen del negocio y entregas próximas');
      pdf.autoTable({
        startY: 56,
        head: [["Indicador", "Valor"]],
        body: [
          ["Ventas del mes", $("mSales").textContent],
          ["Cobrado del mes", $("mCollected").textContent],
          ["Gastos del mes", $("mExpenses").textContent],
          ["Ganancia neta del mes", $("mProfit").textContent],
          ["Por cobrar general", $("allReceivable").textContent],
          ["Entregas hoy", $("dueTodayCount").textContent],
          ["Vencen en 7 días", $("due7Count").textContent],
          ["Trabajos vencidos", $("allOverdueJobs").textContent],
          ["Trabajos activos", $("allActiveJobs").textContent],
          ["Clientes", $("allClients").textContent]
        ],
        headStyles: { fillColor: [20,22,27] }
      });

      const dueRows = getDueSoonJobs(7).map(job => {
        const client = getClientById(job.clientId);
        const calc = computeJob(job);
        return [clientLabel(client), job.title || '-', job.dueDate || '-', job.status || '-', money(calc.balance)];
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Cliente", "Trabajo", "Entrega", "Estado", "Saldo"]],
        body: dueRows.length ? dueRows : [["-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      const frequentRows = Object.values(state.jobs.reduce((acc, job) => {
        if (!job.clientId) return acc;
        const calc = computeJob(job);
        if (!acc[job.clientId]) acc[job.clientId] = { clientId: job.clientId, jobs: 0, sales: 0, receivable: 0 };
        acc[job.clientId].jobs += 1;
        acc[job.clientId].sales += calc.sale;
        acc[job.clientId].receivable += calc.balance;
        return acc;
      }, {})).sort((a,b) => b.jobs - a.jobs || b.sales - a.sales).slice(0,8).map(item => [
        clientLabel(getClientById(item.clientId)), item.jobs, money(item.sales), money(item.receivable)
      ]);

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Cliente", "Trabajos", "Ventas", "Por cobrar"]],
        body: frequentRows.length ? frequentRows : [["-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.save(`Dashboard_NJ_${today()}.pdf`);
      showToast('PDF del dashboard exportado.');
    }
    function exportClientsPdf() {
      const rows = getFilteredClients();
      const pdf = createModulePdf('Módulo de clientes', 'Listado filtrado de clientes');
      pdf.autoTable({
        startY: 56,
        head: [["Nombre", "Empresa", "Teléfono", "Email", "Dirección", "Notas"]],
        body: rows.length ? rows.map(client => [
          client.name || '-',
          client.company || '-',
          client.phone || '-',
          client.email || '-',
          [client.address, client.city].filter(Boolean).join(', ') || '-',
          client.notes || '-'
        ]) : [["-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });
      pdf.save(`Clientes_NJ_${today()}.pdf`);
      showToast('PDF de clientes exportado.');
    }
    function exportJobsPdf() {
      const rows = getFilteredJobs();
      const pdf = createModulePdf('Lista de materiales por comprar', 'Generado desde la vista actual del módulo de trabajos');

      const summaryMap = new Map();
      const detailRows = [];

      rows.forEach(job => {
        const client = getClientById(job.clientId);
        (Array.isArray(job.materials) ? job.materials : []).forEach(item => {
          const materialName = cleanText(item.name) || "Material sin nombre";
          const qty = Number(item.qty || 0);
          const unitPrice = Number(item.price || 0);
          const total = qty * unitPrice;

          if (!summaryMap.has(materialName)) {
            summaryMap.set(materialName, {
              name: materialName,
              qty: 0,
              total: 0,
              jobs: new Set()
            });
          }

          const entry = summaryMap.get(materialName);
          entry.qty += qty;
          entry.total += total;
          entry.jobs.add(job.id);

          detailRows.push([
            clientLabel(client),
            job.title || '-',
            materialName,
            qty ? Number(qty).toFixed(2) : '0.00',
            money(unitPrice),
            money(total),
            job.dueDate || '-',
            job.status || '-'
          ]);
        });
      });

      const summaryRows = [...summaryMap.values()]
        .sort((a, b) => a.name.localeCompare(b.name))
        .map(item => [
          item.name,
          Number(item.qty).toFixed(2),
          money(item.total),
          String(item.jobs.size)
        ]);

      pdf.autoTable({
        startY: 56,
        head: [["Material", "Cantidad total", "Costo estimado", "Trabajos"]],
        body: summaryRows.length ? summaryRows : [["-","0.00","$0.00","0"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Cliente", "Trabajo", "Material", "Cantidad", "Costo unitario", "Costo total", "Entrega", "Estado"]],
        body: detailRows.length ? detailRows : [["-","-","-","0.00","$0.00","$0.00","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      pdf.save(`Lista_Materiales_Trabajos_${today()}.pdf`);
      showToast('PDF de materiales exportado.');
    }
    function exportExpensesPdf() {
      const rows = getFilteredExpenses();
      const pdf = createModulePdf('Módulo de gastos', 'Gastos filtrados y recurrentes');
      pdf.autoTable({
        startY: 56,
        head: [["Concepto", "Categoría", "Monto", "Fecha", "Fotos", "Notas"]],
        body: rows.length ? rows.map(expense => [
          expense.concept || '-',
          expense.category || '-',
          money(expense.amount),
          expense.date || '-',
          Array.isArray(expense.photos) ? String(expense.photos.length) : '0',
          expense.notes || '-'
        ]) : [["-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Recurrente", "Categoría", "Monto", "Día", "Activo", "Último mes"]],
        body: state.recurringExpenses.length ? state.recurringExpenses.map(item => [
          item.concept || '-',
          item.category || '-',
          money(item.amount),
          item.dayOfMonth || '-',
          item.active ? 'Sí' : 'No',
          item.lastGeneratedMonth || '-'
        ]) : [["-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.save(`Gastos_NJ_${today()}.pdf`);
      showToast('PDF de gastos exportado.');
    }
    function exportInventoryPdf() {
      const rows = getFilteredInventory();
      const pdf = createModulePdf('Módulo de inventario', 'Stock actual y movimientos recientes');
      pdf.autoTable({
        startY: 56,
        head: [["SKU", "Material", "Categoría", "Unidad", "Stock", "Mínimo", "Costo", "Valor", "Ubicación"]],
        body: rows.length ? rows.map(item => [
          item.sku || '-',
          item.name || '-',
          item.category || '-',
          item.unit || '-',
          Number(item.stock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
          Number(item.minStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
          money(item.unitCost),
          money(inventoryValue(item)),
          item.location || '-'
        ]) : [["-","-","-","-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      const moves = state.inventoryMovements.slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 40);
      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Fecha", "Material", "Tipo", "Cantidad", "Antes", "Después", "Referencia"]],
        body: moves.length ? moves.map(move => {
          const material = getInventoryItemById(move.itemId);
          return [
            move.date || '-',
            material?.name || move.itemName || '-',
            move.type || '-',
            Number(move.qty || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            Number(move.beforeStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            Number(move.afterStock || 0).toLocaleString(undefined, { maximumFractionDigits: 2 }),
            move.reference || '-'
          ];
        }) : [["-","-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      pdf.save(`Inventario_NJ_${today()}.pdf`);
      showToast('PDF de inventario exportado.');
    }
    function exportClientFullPdf(clientId) {
      const client = getClientById(clientId);
      if (!client) return showToast('No se encontró el cliente.');
      const jobs = getClientJobs(clientId);
      const totals = jobs.reduce((acc, job) => {
        const calc = computeJob(job);
        acc.sale += calc.sale;
        acc.cost += calc.cost;
        acc.paid += calc.paid;
        acc.balance += calc.balance;
        acc.profit += calc.profit;
        acc.photos += getJobDesignImages(job).length;
        return acc;
      }, { sale: 0, cost: 0, paid: 0, balance: 0, profit: 0, photos: 0 });

      const pdf = createModulePdf('Resumen general del cliente', clientLabel(client));
      pdf.autoTable({
        startY: 56,
        head: [["Campo", "Detalle"]],
        body: [
          ['Nombre', client.name || '-'],
          ['Empresa', client.company || '-'],
          ['Teléfono', client.phone || '-'],
          ['Email', client.email || '-'],
          ['Dirección', [client.address, client.city].filter(Boolean).join(', ') || '-'],
          ['Notas', client.notes || '-'],
          ['Trabajos registrados', String(jobs.length)],
          ['Ventas acumuladas', money(totals.sale)],
          ['Costo acumulado', money(totals.cost)],
          ['Ganancia acumulada', money(totals.profit)],
          ['Cobrado', money(totals.paid)],
          ['Saldo pendiente', money(totals.balance)],
          ['Fotos guardadas', String(totals.photos)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      const jobRows = jobs.map(job => {
        const calc = computeJob(job);
        return [
          job.title || '-',
          getJobTypeLabel(job),
          job.date || '-',
          job.dueDate || '-',
          job.status || '-',
          money(calc.sale),
          money(calc.paid),
          money(calc.balance),
          String(getJobDesignImages(job).length)
        ];
      });
      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Trabajo", "Tipo", "Fecha", "Entrega", "Estado", "Venta", "Pagado", "Saldo", "Fotos"]],
        body: jobRows.length ? jobRows : [["-","-","-","-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      jobs.forEach(job => {
        const calc = computeJob(job);
        const payments = getPaymentsList(job);
        const materials = Array.isArray(job.materials) ? job.materials : [];
        const photos = getJobDesignImages(job);

        pdf.addPage();
        pdf.setFontSize(15);
        pdf.text(job.title || 'Trabajo', 14, 18);
        pdf.setFontSize(10);
        pdf.text(`Tipo: ${getJobTypeLabel(job)} · Estado: ${job.status || '-'} · Entrega: ${job.dueDate || '-'}`, 14, 25);

        pdf.autoTable({
          startY: 32,
          head: [["Campo", "Detalle"]],
          body: [
            ['Descripción', job.description || '-'],
            ['Notas', job.notes || '-'],
            ['Checklist', checklistProgress(job)],
            ['Venta', money(calc.sale)],
            ['Costo', money(calc.cost)],
            ['Ganancia', money(calc.profit)],
            ['Pagado', money(calc.paid)],
            ['Saldo', money(calc.balance)],
            ['Fotos', photos.map(item => item.fileName || item.url).join(' | ') || '-']
          ],
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 8 }
        });

        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 8,
          head: [["Material", "Cantidad", "Costo unitario", "Total"]],
          body: materials.length ? materials.map(item => [
            item.name || item.inventoryName || '-',
            Number(item.qty || 0),
            money(item.price || 0),
            money(Number(item.qty || 0) * Number(item.price || 0))
          ]) : [["-","-","-","-"]],
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 8 }
        });

        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 8,
          head: [["Fecha", "Método", "Monto", "Nota"]],
          body: payments.length ? payments.map(pay => [
            pay.date || '-',
            pay.method || '-',
            money(pay.amount || 0),
            pay.note || '-'
          ]) : [["-","-","-","-"]],
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 8 }
        });
      });

      pdf.save(`Cliente_${(clientLabel(client) || 'cliente').replace(/\s+/g, '_')}_${today()}.pdf`);
      showToast('PDF completo del cliente exportado.');
    }
    function exportCurrentModulePdf() {
      if (state.currentView === 'dashboard') return exportDashboardPdf();
      if (state.currentView === 'clientes') return exportClientsPdf();
      if (state.currentView === 'trabajos') return exportJobsPdf();
      if (state.currentView === 'gastos') return exportExpensesPdf();
      if (state.currentView === 'inventario') return exportInventoryPdf();
      if (state.currentView === 'proveedores') return exportProvidersPdf();
      if (state.currentView === 'compras') return exportPurchaseOrdersPdf();
      if (state.currentView === 'instalaciones') return exportInstallationCalendarPdf();
      if (state.currentView === 'reportes') return exportReportsPdf();
      if (state.currentView === 'usuarios') return exportUsersPdf();
      return exportDashboardPdf();
    }
    async function urlToDataUrl(url) {
      const response = await fetch(url);
      if (!response.ok) throw new Error('No se pudo descargar la imagen.');
      const blob = await response.blob();
      return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }
    async function getImageDimensions(dataUrl) {
      return await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.width || 1, height: img.height || 1 });
        img.onerror = reject;
        img.src = dataUrl;
      });
    }
    async function addPrimaryJobPhotoToPdf(pdf, job, startY) {
      const images = getJobDesignImages(job);
      if (!images.length) return startY;

      const firstImage = images[0];

      try {
        const dataUrl = await urlToDataUrl(firstImage.url);
        const dims = await getImageDimensions(dataUrl);
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const marginX = 14;
        const maxWidth = pageWidth - (marginX * 2);
        const maxHeight = 95;
        let renderWidth = maxWidth;
        let renderHeight = renderWidth * (dims.height / dims.width);

        if (renderHeight > maxHeight) {
          renderHeight = maxHeight;
          renderWidth = renderHeight * (dims.width / dims.height);
        }

        let y = startY;
        const neededHeight = 16 + renderHeight + 10;
        if (y + neededHeight > pageHeight - 18) {
          pdf.addPage();
          y = 20;
        }

        pdf.setFontSize(11);
        pdf.setTextColor(20, 20, 20);
        pdf.text('Diseño / foto principal', marginX, y);
        y += 6;
        pdf.setDrawColor(220, 220, 220);
        pdf.roundedRect(marginX, y, renderWidth, renderHeight, 3, 3);
        pdf.addImage(dataUrl, 'JPEG', marginX, y, renderWidth, renderHeight);
        y += renderHeight + 6;

        pdf.setFontSize(9);
        pdf.setTextColor(90, 90, 90);
        pdf.text(`Archivo: ${firstImage.fileName || 'Imagen'}${images.length > 1 ? ` · Total fotos: ${images.length}` : ''}`, marginX, y);
        return y + 4;
      } catch (error) {
        console.error(error);
        let y = startY;
        const pageHeight = pdf.internal.pageSize.getHeight();
        if (y + 18 > pageHeight - 18) {
          pdf.addPage();
          y = 20;
        }
        pdf.setFontSize(10);
        pdf.setTextColor(120, 120, 120);
        pdf.text('No se pudo insertar la foto en el PDF, pero el archivo se generó igual.', 14, y);
        return y + 8;
      }
    }
    async function exportPurchaseMaterialsPdf(jobId) {
      const job = getJobById(jobId);
      if (!job) return showToast("No se encontró el trabajo.");

      const client = getClientById(job.clientId);
      const calc = computeJob(job);
      const materials = Array.isArray(job.materials) ? job.materials : [];
      const photos = getJobDesignImages(job);
      const pdf = createModulePdf('Lista interna de materiales', `${job.title || 'Trabajo'} · ${clientLabel(client)}`);

      pdf.autoTable({
        startY: 56,
        head: [["Campo", "Detalle"]],
        body: [
          ["Cliente", clientLabel(client)],
          ["Contacto", (client?.phone || "-") + (client?.email ? ` / ${client.email}` : "")],
          ["Dirección", [client?.address, client?.city].filter(Boolean).join(", ") || "-"],
          ["Trabajo", job.title || "-"],
          ["Tipo de trabajo", getJobTypeLabel(job)],
          ["Descripción", job.description || job.notes || "-"],
          ["Fecha", job.date || "-"],
          ["Entrega", job.dueDate || "-"],
          ["Estado", job.status || "Cotización"],
          ["Prioridad", job.priority || "Media"],
          ["Fotos guardadas", String(photos.length)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      const purchaseList = getJobPurchaseList(job);

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Material", "SKU", "Unidad", "Cantidad", "Stock actual", "Comprar", "Proveedor", "Costo total"]],
        body: materials.length ? materials.map(item => {
          const qty = Number(item.qty || 0);
          const unitPrice = Number(item.price || 0);
          const total = qty * unitPrice;
          const stockItem = item.inventoryId ? getInventoryItemById(item.inventoryId) : null;
          const stockQty = Number(stockItem?.stock || 0);
          const toBuyQty = item.inventoryId ? Math.max(qty - stockQty, 0) : qty;
          return [
            item.name || item.inventoryName || "-",
            stockItem?.sku || item.inventorySku || "-",
            stockItem?.unit || item.inventoryUnit || "-",
            qty ? qty.toFixed(2) : "0.00",
            item.inventoryId ? stockQty.toFixed(2) : "Manual",
            toBuyQty ? toBuyQty.toFixed(2) : "0.00",
            stockItem?.supplier || item.supplier || "-",
            money(total)
          ];
        }) : [["-","-","-","0.00","0.00","0.00","-","$0.00"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8.2 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Resumen interno", "Monto"]],
        body: [
          ["Costo de materiales", money(calc.materialsCost)],
          ["Mano de obra", money(calc.laborCost)],
          ["Gastos extra", money(calc.extraCost)],
          ["Gastos ligados", money(calc.linkedExpenses)],
          ["Costo interno total", money(calc.cost)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      if (purchaseList.length) {
        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 10,
          head: [["Faltante", "SKU", "Unidad", "Comprar", "Proveedor", "Motivo"]],
          body: purchaseList.map(item => [
            item.name || "Material",
            item.sku || "-",
            item.unit || "u",
            Number(item.toBuyQty || 0).toFixed(2),
            item.supplier || "-",
            item.reason || "-"
          ]),
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 9 }
        });
      }

      let finalY = pdf.lastAutoTable.finalY + 12;
      finalY = await addPrimaryJobPhotoToPdf(pdf, job, finalY);

      if (materials.length) {
        const pageHeight = pdf.internal.pageSize.getHeight();
        if (finalY + 20 > pageHeight - 18) {
          pdf.addPage();
          finalY = 20;
        }
        pdf.setFontSize(10);
        pdf.setTextColor(90, 90, 90);
        pdf.text("Este PDF usa la sección 'Materiales / costo interno' del trabajo para ayudarte a comprar materiales.", 14, finalY);
      }

      pdf.save(`Compra_Materiales_${(job.title || "trabajo").replace(/\s+/g, "_")}_${today()}.pdf`);
      showToast(photos.length ? "PDF de compra generado con foto." : "PDF de compra generado.");
    }
    async function exportQuotePdf(jobId) {
      const job = getJobById(jobId);
      if (!job) return showToast("No se encontró el trabajo.");

      const client = getClientById(job.clientId);
      const calc = computeJob(job);
      const quote = getQuote(job);
      const q = computeQuote(quote);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      pdf.setFillColor(15, 18, 24);
      pdf.rect(0, 0, 210, 34, "F");

      pdf.setTextColor(184, 255, 0);
      pdf.setFontSize(20);
      pdf.text(COMPANY.name, 14, 18);

      pdf.setTextColor(240, 240, 240);
      pdf.setFontSize(10);
      pdf.text(`Tel: ${COMPANY.phone}`, 14, 25);
      pdf.text(`Email: ${COMPANY.email}`, 70, 25);
      pdf.text(`Fecha: ${today()}`, 160, 25);

      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(15);
      pdf.text("Cotización / Orden de trabajo", 14, 44);

      pdf.autoTable({
        startY: 50,
        head: [["Campo", "Detalle"]],
        body: [
          ["Cliente", clientLabel(client)],
          ["Contacto", (client?.phone || "-") + (client?.email ? ` / ${client.email}` : "")],
          ["Dirección", [client?.address, client?.city].filter(Boolean).join(", ") || "-"],
          ["Trabajo", job.title || "-"],
          ["Tipo de trabajo", getJobTypeLabel(job)],
          ["Descripción", job.description || job.notes || "-"],
          ["Fecha", job.date || "-"],
          ["Entrega", job.dueDate || "-"],
          ["Prioridad", job.priority || "Media"],
          ["Estado", job.status || "Cotización"],
          ["Checklist", checklistProgress(job)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      const quoteRows = (quote.items || []).map(item => [
        item.description || "-",
        Number(item.qty || 0),
        money(item.price || 0),
        money(Number(item.qty || 0) * Number(item.price || 0))
      ]);

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Ítem", "Cantidad", "Precio", "Total"]],
        body: quoteRows.length ? quoteRows : [["-", "-", "-", "-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      const estimator = computeEstimator(getSavedEstimator(job));
      const estimatorRows = estimator.baseUnits > 0 || estimator.materialRate > 0 || estimator.saleRate > 0
        ? [[
            "Estimador fase 7",
            `${estimator.label} · Base ${estimator.baseUnits.toFixed(2)} ${estimator.mode === "unit" ? "und" : "ft²"} · Compra ${estimator.productionUnits.toFixed(2)} ${estimator.mode === "unit" ? "und" : "ft²"}`
          ]]
        : [];

      if (estimatorRows.length) {
        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 10,
          head: [["Módulo rápido", "Detalle"]],
          body: estimatorRows,
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 9 }
        });
      }

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Resumen cotización", "Monto"]],
        body: [
          ["Subtotal", money(q.subtotal)],
          ["Descuento", money(q.discountAmount)],
          ["Impuesto", money(q.taxAmount)],
          ["Total cotización", money(q.total)],
          ["Materiales", money(calc.materialsCost)],
          ["Mano de obra", money(calc.laborCost)],
          ["Gastos extra", money(calc.extraCost)],
          ["Costo interno total", money(calc.cost)],
          ["Precio final cliente", money(calc.sale)],
          ["Ganancia", money(calc.profit)],
          ["Margen", `${calc.margin.toFixed(2)}%`],
          ["Pagado", money(calc.paid)],
          ["Saldo pendiente", money(calc.balance)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      let finalY = pdf.lastAutoTable.finalY + 12;
      finalY = await addPrimaryJobPhotoToPdf(pdf, job, finalY);

      const pageHeight = pdf.internal.pageSize.getHeight();
      if (finalY + 24 > pageHeight - 18) {
        pdf.addPage();
        finalY = 20;
      }

      pdf.setFontSize(10);
      pdf.setTextColor(20, 20, 20);
      pdf.text("Términos básicos:", 14, finalY);
      pdf.text("1. Esta cotización puede cambiar si cambian medidas, materiales o alcance.", 14, finalY + 6);
      pdf.text("2. Producción e instalación avanzan según aprobación y pagos acordados.", 14, finalY + 12);
      pdf.text("3. Gracias por confiar en NJ Design & Print.", 14, finalY + 18);

      pdf.save(`Cotizacion_F6_${(job.title || "trabajo").replace(/\s+/g, "_")}_${today()}.pdf`);
      showToast(getJobDesignImages(job).length ? "Cotización PDF generada con foto." : "Cotización PDF generada.");
    }
    function exportUsersPdf() {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();
      const rows = getVisibleTeamMembers().map(member => [
        member.name || "-",
        member.email || "-",
        roleLabel(member.role || "employee"),
        member.active === false ? "Desactivado" : "Activo",
        formatDateTime(member.lastLoginAt),
        getModulePermissionSummary(member),
        member.notes || "-"
      ]);
      pdf.setFontSize(16);
      pdf.text("Usuarios y permisos", 14, 16);
      pdf.setFontSize(10);
      pdf.text(`Espacio: ${state.currentWorkspaceOwnerEmail || state.userEmail || "-"}`, 14, 24);
      pdf.autoTable({
        startY: 30,
        head: [["Nombre", "Correo", "Rol", "Estado", "Último acceso", "Módulos", "Notas"]],
        body: rows.length ? rows : [["-","-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });
      pdf.save(`Usuarios_Permisos_${today()}.pdf`);
      showToast("PDF de usuarios exportado.");
    }
    function exportProvidersPdf() {
      const rows = getFilteredProviders();
      const pdf = createModulePdf('Módulo de proveedores', 'Listado filtrado de proveedores');
      pdf.autoTable({
        startY: 56,
        head: [["Proveedor", "Contacto", "Teléfono", "Email", "Ciudad", "Notas"]],
        body: rows.length ? rows.map(provider => [
          providerDisplayName(provider),
          provider.contact || '-',
          provider.phone || '-',
          provider.email || '-',
          provider.city || '-',
          provider.notes || '-'
        ]) : [["-","-","-","-","-","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });
      pdf.save(`Proveedores_NJ_${today()}.pdf`);
      showToast('PDF de proveedores exportado.');
    }
    function exportPurchaseOrdersPdf() {
      const rows = getFilteredPurchaseOrders();
      const pdf = createModulePdf('Órdenes de compra', 'Vista filtrada del módulo de compras');
      pdf.autoTable({
        startY: 56,
        head: [["OC", "Proveedor", "Trabajo", "Fecha", "Entrega", "Items", "Total", "Estado"]],
        body: rows.length ? rows.map(po => [
          po.number || '-',
          po.providerName || '-',
          po.jobTitle || '-',
          po.date || '-',
          po.expectedDate || '-',
          String(getPurchaseOrderItems(po).length),
          money(getPurchaseOrderTotal(po)),
          po.status || '-'
        ]) : [["-","-","-","-","-","0","$0.00","-"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });
      pdf.save(`Ordenes_Compra_NJ_${today()}.pdf`);
      showToast('PDF de compras exportado.');
    }
    function exportSinglePurchaseOrderPdf(poId) {
      const po = getPurchaseOrderById(poId);
      if (!po) return showToast("No se encontró la orden.");

      const pdf = createModulePdf('Orden de compra', `Proveedor: ${po.providerName || '-'}`);
      pdf.autoTable({
        startY: 56,
        head: [["Campo", "Valor"]],
        body: [
          ["OC", po.number || '-'],
          ["Proveedor", po.providerName || '-'],
          ["Trabajo", po.jobTitle || '-'],
          ["Cliente", po.clientName || '-'],
          ["Fecha", po.date || '-'],
          ["Entrega esperada", po.expectedDate || '-'],
          ["Estado", po.status || '-'],
          ["Notas", po.notes || '-']
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Material", "SKU", "Unidad", "Cantidad", "Costo unitario", "Total"]],
        body: getPurchaseOrderItems(po).length ? getPurchaseOrderItems(po).map(item => [
          item.name || '-',
          item.sku || '-',
          item.unit || '-',
          Number(item.qty || 0).toFixed(2),
          money(item.unitCost || 0),
          money(item.total || 0)
        ]) : [["-","-","-","0.00","$0.00","$0.00"]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [["Resumen", "Valor"]],
        body: [["Total orden", money(getPurchaseOrderTotal(po))]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      pdf.save(`OC_${(po.number || "orden").replace(/\s+/g, "_")}_${today()}.pdf`);
      showToast('PDF de la orden generado.');
    }
