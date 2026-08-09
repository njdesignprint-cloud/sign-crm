    function exportReportsPdf() {
      const pdf = createModulePdf(pdfText("Advanced reports", "Reportes avanzados"), pdfText("Financial and operating performance", "Rendimiento financiero y operativo"));
      const jobs = getFilteredReportJobs();
      const expenses = getFilteredReportExpenses();
      const orders = getFilteredReportPurchaseOrders();
      const confirmedJobs = jobs.filter(job => isConfirmedSaleJob(job));
      const potentialSales = jobs.filter(job => isEstimateJob(job)).reduce((sum, job) => sum + Number(job.sale || 0), 0);
      const sales = confirmedJobs.reduce((sum, job) => sum + Number(job.sale || 0), 0);
      const collected = jobs.reduce((sum, job) => sum + getPaymentsTotal(job), 0);
      const receivable = confirmedJobs.reduce((sum, job) => sum + computeJob(job).balance, 0);
      const internalCosts = confirmedJobs.reduce((sum, job) => sum + computeJob(job).baseCost, 0);
      const netProfit = sales - internalCosts - expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

      const { from, to, status } = getReportDateRange();
      const filterText = [
        from ? `Desde ${from}` : "Desde inicio",
        to ? `Hasta ${to}` : "Hasta hoy",
        status ? `Estado ${status}` : "Todos los estados"
      ].join(" · ");
      pdf.setFontSize(9);
      pdf.setTextColor(90, 90, 90);
      pdf.text(filterText, 14, 55);

      pdf.autoTable({
        startY: 60,
        head: [[pdfText("Metric", "Indicador"), pdfText("Value", "Valor")]],
        body: [
          [pdfText("Potential sales", "Ventas potenciales"), money(potentialSales)],
          [pdfText("Confirmed sales", "Ventas confirmadas"), money(sales)],
          [pdfText("Collected", "Cobrado filtrado"), money(collected)],
          [pdfText("Receivable", "Por cobrar"), money(receivable)],
          [pdfText("Net profit", "Utilidad neta"), money(netProfit)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      const monthlyRows = getReportsMonthlySummaryRows().map(row => [row.label, money(row.sales), money(row.collected), money(row.expenses), money(row.profit)]);
      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 8,
        head: [[pdfText("Month", "Mes"), pdfText("Sales", "Ventas"), pdfText("Collected", "Cobrado"), pdfText("Expenses", "Gastos"), pdfText("Net profit", "Utilidad neta")]],
        body: monthlyRows.length ? monthlyRows : pdfEmptyRow(5),
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
        head: [[pdfText("Customer", "Cliente"), pdfText("Job", "Trabajo"), pdfText("Status", "Estado"), pdfText("Sale", "Venta"), pdfText("Cost", "Costo"), pdfText("Profit", "Utilidad"), pdfText("Margin", "Margen")]],
        body: bestJobs.length ? bestJobs : pdfEmptyRow(7),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      const expenseRows = (() => {
        const categoryMap = {};
        expenses.forEach(expense => {
          const key = cleanText(expense.category) || pdfText("Uncategorized", "Sin categoría");
          if (!categoryMap[key]) categoryMap[key] = { category: key, total: 0, count: 0 };
          categoryMap[key].total += Number(expense.amount || 0);
          categoryMap[key].count += 1;
        });
        return Object.values(categoryMap).sort((a, b) => b.total - a.total).map(row => [row.category, money(row.total), String(row.count)]);
      })();

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 8,
        head: [[pdfText("Category", "Categoría"), pdfText("Total", "Total"), pdfText("Entries", "Movimientos")]],
        body: expenseRows.length ? expenseRows : pdfEmptyRow(3),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      savePdf(pdf, `Advanced_Reports_${today()}.pdf`);
      showToast("PDF de reportes generado.");
    }
    function exportInstallationCalendarPdf() {
      const rows = getFilteredInstallationJobs();
      const pdf = createModulePdf(pdfText("Installation calendar", "Calendario de instalación"), pdfText("Scheduled installation work", "Trabajos de instalación programados"));
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Date", "Fecha"), pdfText("Time", "Hora"), pdfText("Customer", "Cliente"), pdfText("Job", "Trabajo"), pdfText("Assigned to", "Responsable"), pdfText("Address", "Dirección"), pdfText("Status", "Estado")]],
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
      savePdf(pdf, `Installation_Calendar_${today()}.pdf`);
      showToast("PDF de instalaciones exportado.");
    }
    function exportJson() {
      const payload = {
        exportedAt: new Date().toISOString(),
        company: COMPANY,
        user: state.userEmail,
        clients: state.clients,
        prospects: state.prospects,
        salespeople: state.salespeople,
        commissionSettlements: state.commissionSettlements,
        companySettings: state.companySettings,
        jobs: state.jobs,
        salesDocuments: state.salesDocuments,
        expenses: state.expenses,
        recurringExpenses: state.recurringExpenses,
        inventoryItems: state.inventoryItems,
        inventoryMovements: state.inventoryMovements,
        providers: state.providers,
        purchaseOrders: state.purchaseOrders,
        teamMembers: state.teamMembers,
        trashItems: state.trashItems,
        weeklySettlements: state.weeklySettlements
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signshophq_backup_${today()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Respaldo JSON exportado.");
    }
    function pdfLanguage() {
      return (state.companySettings?.language || state.language || "en") === "es" ? "es" : "en";
    }
    function pdfText(en, es) { return pdfLanguage() === "es" ? es : en; }
    function pdfCompanyName() { return COMPANY.legalName || COMPANY.name || "SignShop HQ"; }
    function pdfSafeFileName(value, fallback = "document") {
      return cleanText(value || fallback).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || fallback;
    }
    function pdfEmptyRow(columns) {
      const row = new Array(Math.max(1, columns)).fill("");
      row[0] = pdfText("No records found", "No se encontraron registros");
      return row;
    }
    function addPdfFooter(pdf, confidentiality = "internal") {
      const pages = pdf.getNumberOfPages();
      const label = confidentiality === "customer"
        ? pdfText("Prepared for the customer", "Preparado para el cliente")
        : pdfText("CONFIDENTIAL · INTERNAL USE ONLY", "CONFIDENCIAL · SOLO PARA USO INTERNO");
      for (let page = 1; page <= pages; page += 1) {
        pdf.setPage(page);
        const width = pdf.internal.pageSize.getWidth();
        const height = pdf.internal.pageSize.getHeight();
        pdf.setDrawColor(215, 220, 228);
        pdf.line(14, height - 13, width - 14, height - 13);
        pdf.setFont(undefined, "normal");
        pdf.setFontSize(7.5);
        pdf.setTextColor(105, 112, 125);
        pdf.text(`${pdfCompanyName()} · ${label}`, 14, height - 8);
        pdf.text(`${pdfText("Page", "Página")} ${page} ${pdfText("of", "de")} ${pages}`, width - 14, height - 8, { align: "right" });
      }
      pdf.setPage(pages);
      return pdf;
    }
    function savePdf(pdf, fileName, confidentiality = "internal") {
      addPdfFooter(pdf, confidentiality);
      pdf.save(fileName);
    }
    function addPdfBrandMark(pdf, pageWidth = 210) {
      const logo = $("companyLogoPreview");
      if (COMPANY.logoUrl && logo?.complete && Number(logo.naturalWidth || 0) > 0) {
        try {
          const maxLogoWidth = 23;
          const maxLogoHeight = 23;
          const logoRatio = Number(logo.naturalWidth) / Math.max(1, Number(logo.naturalHeight));
          const logoWidth = logoRatio >= 1 ? maxLogoWidth : maxLogoHeight * logoRatio;
          const logoHeight = logoRatio >= 1 ? maxLogoWidth / logoRatio : maxLogoHeight;
          const logoX = 15 + (maxLogoWidth - logoWidth) / 2;
          const logoY = 6 + (maxLogoHeight - logoHeight) / 2;
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(14, 5, 25, 25, 3, 3, "F");
          pdf.addImage(logo, undefined, logoX, logoY, logoWidth, logoHeight, undefined, "FAST");
          return pageWidth;
        } catch (error) {
          console.warn("The configured company logo could not be embedded in the PDF; using initials instead.", error);
        }
      }
      const initials = pdfCompanyName().split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join("").toUpperCase() || "SH";
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(14, 8, 18, 18, 3, 3, "F");
      pdf.setTextColor(...companyPdfColor());
      pdf.setFont(undefined, "bold");
      pdf.setFontSize(10);
      pdf.text(initials, 23, 19.5, { align: "center" });
      pdf.setFont(undefined, "normal");
      return pageWidth;
    }
    function companyPdfColor() {
      const hex = /^#[0-9a-f]{6}$/i.test(COMPANY.brandColor || "") ? COMPANY.brandColor : "#0f172a";
      return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
    }
    function createModulePdf(title, subtitle = "") {
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF();

      pdf.setFillColor(...companyPdfColor());
      pdf.rect(0, 0, 210, 34, "F");
      addPdfBrandMark(pdf);
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.text(pdfCompanyName(), 43, 15);
      pdf.setTextColor(240, 240, 240);
      pdf.setFontSize(7.5);
      const contact = [COMPANY.phone, COMPANY.email, COMPANY.website].filter(Boolean).join(" · ");
      const contactLines = pdf.splitTextToSize(
        contact || pdfText("Company contact not configured", "Contacto de la empresa sin configurar"),
        118
      ).slice(0, 2);
      pdf.text(contactLines, 43, 22.5);
      pdf.setFontSize(7);
      pdf.text(`${pdfText("Generated", "Generado")}: ${new Date().toLocaleString(pdfLanguage() === "es" ? "es-US" : "en-US")}`, 196, 29, { align: "right" });
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
      const value = (id, fallback = "-") => $(id)?.textContent?.trim() || fallback;
      const pdf = createModulePdf(pdfText('Business dashboard', 'Dashboard general'), pdfText('Business summary and upcoming deliveries', 'Resumen del negocio y entregas próximas'));
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Metric", "Indicador"), pdfText("Value", "Valor")]],
        body: [
          [pdfText("Period sales", "Ventas del período"), value("mSales", money(0))],
          [pdfText("Period collected", "Cobrado del período"), value("mCollected", money(0))],
          [pdfText("Period expenses", "Gastos del período"), value("mExpenses", money(0))],
          [pdfText("Net profit", "Ganancia neta"), value("mProfit", money(0))],
          [pdfText("Total receivable", "Por cobrar general"), value("allReceivable", money(0))],
          [pdfText("Due today", "Entregas hoy"), value("dueTodayCount", "0")],
          [pdfText("Due within 7 days", "Vencen en 7 días"), value("due7Count", String(getDueSoonJobs(7).length))],
          [pdfText("Overdue jobs", "Trabajos vencidos"), value("allOverdueJobs", String(state.jobs.filter(job => isOverdue(job)).length))],
          [pdfText("Active jobs", "Trabajos activos"), value("allActiveJobs", String(state.jobs.filter(job => ACTIVE_STATUSES.includes(job.status)).length))],
          [pdfText("Clients", "Clientes"), value("allClients", String(state.clients.length))]
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
        head: [[pdfText("Customer", "Cliente"), pdfText("Job", "Trabajo"), pdfText("Due date", "Entrega"), pdfText("Status", "Estado"), pdfText("Balance", "Saldo")]],
        body: dueRows.length ? dueRows : pdfEmptyRow(5),
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
        head: [[pdfText("Customer", "Cliente"), pdfText("Jobs", "Trabajos"), pdfText("Sales", "Ventas"), pdfText("Receivable", "Por cobrar")]],
        body: frequentRows.length ? frequentRows : pdfEmptyRow(4),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      savePdf(pdf, `Dashboard_${today()}.pdf`);
      showToast('PDF del dashboard exportado.');
    }
    function exportClientsPdf() {
      const rows = getFilteredClients();
      const pdf = createModulePdf(pdfText('Clients', 'Clientes'), pdfText('Filtered client list', 'Listado filtrado de clientes'));
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Name", "Nombre"), pdfText("Company", "Empresa"), pdfText("Phone", "Teléfono"), "Email", pdfText("Address", "Dirección"), pdfText("Notes", "Notas")]],
        body: rows.length ? rows.map(client => [
          client.name || '-',
          client.company || '-',
          client.phone || '-',
          client.email || '-',
          [client.address, client.city].filter(Boolean).join(', ') || '-',
          client.notes || '-'
        ]) : pdfEmptyRow(6),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });
      savePdf(pdf, `Clients_${today()}.pdf`);
      showToast('PDF de clientes exportado.');
    }
    function exportJobsPdf() {
      const rows = getFilteredJobs();
      const pdf = createModulePdf(pdfText('Materials purchasing list', 'Lista de materiales por comprar'), pdfText('Generated from the current jobs view', 'Generado desde la vista actual de trabajos'));

      const summaryMap = new Map();
      const detailRows = [];

      rows.forEach(job => {
        const client = getClientById(job.clientId);
        (Array.isArray(job.materials) ? job.materials : []).forEach(item => {
          const materialName = cleanText(item.name) || pdfText("Unnamed material", "Material sin nombre");
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
        head: [[pdfText("Material", "Material"), pdfText("Total quantity", "Cantidad total"), pdfText("Estimated cost", "Costo estimado"), pdfText("Jobs", "Trabajos")]],
        body: summaryRows.length ? summaryRows : pdfEmptyRow(4),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Customer", "Cliente"), pdfText("Job", "Trabajo"), pdfText("Material", "Material"), pdfText("Quantity", "Cantidad"), pdfText("Unit cost", "Costo unitario"), pdfText("Total cost", "Costo total"), pdfText("Due date", "Entrega"), pdfText("Status", "Estado")]],
        body: detailRows.length ? detailRows : pdfEmptyRow(8),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      if (isAdmin() && typeof getJobCommissionBreakdown === "function") {
        const commissionRows = rows.map(job => {
          const calc = getJobCommissionBreakdown(job);
          return [job.title || "-", calc.salespersonName || "Not assigned", `${calc.rate.toFixed(2)}%`, money(calc.projected), money(calc.earned), money(calc.previouslyPaid), money(calc.available)];
        });
        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 10,
          head: [["Job", "Salesperson", "Rate", "Projected", "Earned", "Settled", "Outstanding"]],
          body: commissionRows.length ? commissionRows : pdfEmptyRow(7),
          headStyles: { fillColor: companyPdfColor() },
          styles: { fontSize: 8 }
        });
      }

      savePdf(pdf, `Job_Materials_${today()}.pdf`);
      showToast('PDF de materiales exportado.');
    }
    function exportExpensesPdf() {
      const rows = getFilteredExpenses();
      const pdf = createModulePdf(pdfText('Expenses', 'Gastos'), pdfText('Filtered and recurring expenses', 'Gastos filtrados y recurrentes'));
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Description", "Concepto"), pdfText("Category", "Categoría"), pdfText("Amount", "Monto"), pdfText("Date", "Fecha"), pdfText("Photos", "Fotos"), pdfText("Notes", "Notas")]],
        body: rows.length ? rows.map(expense => [
          expense.concept || '-',
          expense.category || '-',
          money(expense.amount),
          expense.date || '-',
          Array.isArray(expense.photos) ? String(expense.photos.length) : '0',
          expense.notes || '-'
        ]) : pdfEmptyRow(6),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Recurring expense", "Recurrente"), pdfText("Category", "Categoría"), pdfText("Amount", "Monto"), pdfText("Day", "Día"), pdfText("Active", "Activo"), pdfText("Last month", "Último mes")]],
        body: state.recurringExpenses.length ? state.recurringExpenses.map(item => [
          item.concept || '-',
          item.category || '-',
          money(item.amount),
          item.dayOfMonth || '-',
          item.active ? pdfText('Yes', 'Sí') : pdfText('No', 'No'),
          item.lastGeneratedMonth || '-'
        ]) : pdfEmptyRow(6),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      savePdf(pdf, `Expenses_${today()}.pdf`);
      showToast('PDF de gastos exportado.');
    }
    function exportWorkerPaymentReceiptPdf(expenseId) {
      const expense = state.expenses.find(item => item.id === expenseId && item.recordType === "worker_payment");
      if (!expense) return showToast(pdfText("Worker payment not found.", "No se encontró el pago al trabajador."));
      const job = getJobById(expense.jobId || "");
      const client = job ? getClientById(job.clientId) : null;
      const pdf = createModulePdf(pdfText("WORKER PAYMENT RECEIPT", "COMPROBANTE DE PAGO AL TRABAJADOR"), pdfText("Payment record and acknowledgment", "Registro y confirmación del pago"));
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Field", "Campo"), pdfText("Details", "Detalles")]],
        body: [
          [pdfText("Worker", "Trabajador"), expense.workerName || "-"],
          [pdfText("Work performed", "Labor realizada"), expense.workerRole || expense.concept || "-"],
          [pdfText("Related job", "Trabajo relacionado"), job ? getJobDisplayLabel(job) : "-"],
          [pdfText("Customer", "Cliente"), client ? (client.company || client.name || "-") : "-"],
          [pdfText("Payment date", "Fecha del pago"), expense.date || "-"],
          [pdfText("Work period", "Período trabajado"), `${expense.periodFrom || "-"} ${pdfText("to", "a")} ${expense.periodTo || "-"}`],
          [pdfText("Payment method", "Método de pago"), expense.paymentMethod || "-"],
          [pdfText("Amount paid", "Monto pagado"), money(expense.amount)],
          [pdfText("Notes", "Notas"), expense.notes || "-"]
        ],
        headStyles:{fillColor:companyPdfColor()}, styles:{fontSize:9}
      });
      let y = pdf.lastAutoTable.finalY + 14;
      pdf.setFontSize(9);
      pdf.text(pdfText("The worker acknowledges receipt of the payment described above.", "El trabajador confirma haber recibido el pago descrito anteriormente."), 14, y);
      y += 18;
      pdf.text(`${pdfText("Company representative", "Representante de la empresa")}: ______________________________`, 14, y);
      pdf.text(`${pdfText("Worker", "Trabajador")}: ______________________________`, 112, y);
      y += 13;
      pdf.text(`${pdfText("Signature", "Firma")}: ______________________________`, 14, y);
      pdf.text(`${pdfText("Signature", "Firma")}: ______________________________`, 112, y);
      y += 13;
      pdf.text(`${pdfText("Date", "Fecha")}: ______________________________`, 14, y);
      pdf.text(`${pdfText("Date", "Fecha")}: ______________________________`, 112, y);
      savePdf(pdf, `Worker_Payment_${expense.workerName || expense.date || today()}.pdf`, "internal");
      showToast(pdfText("Worker payment receipt exported.", "Comprobante de pago exportado."));
    }
    function exportInventoryPdf() {
      const rows = getFilteredInventory();
      const pdf = createModulePdf(pdfText('Inventory', 'Inventario'), pdfText('Current stock and recent movements', 'Stock actual y movimientos recientes'));
      pdf.autoTable({
        startY: 56,
        head: [["SKU", pdfText("Material", "Material"), pdfText("Category", "Categoría"), pdfText("Unit", "Unidad"), pdfText("Stock", "Stock"), pdfText("Minimum", "Mínimo"), pdfText("Cost", "Costo"), pdfText("Value", "Valor"), pdfText("Location", "Ubicación")]],
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
        ]) : pdfEmptyRow(9),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      const moves = state.inventoryMovements.slice().sort((a,b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 40);
      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Date", "Fecha"), pdfText("Material", "Material"), pdfText("Type", "Tipo"), pdfText("Quantity", "Cantidad"), pdfText("Before", "Antes"), pdfText("After", "Después"), pdfText("Reference", "Referencia")]],
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
        }) : pdfEmptyRow(7),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });

      savePdf(pdf, `Inventory_${today()}.pdf`);
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

      const pdf = createModulePdf(pdfText('Internal client summary', 'Resumen interno del cliente'), clientLabel(client));
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Field", "Campo"), pdfText("Details", "Detalle")]],
        body: [
          [pdfText('Name', 'Nombre'), client.name || '-'],
          [pdfText('Company', 'Empresa'), client.company || '-'],
          [pdfText('Phone', 'Teléfono'), client.phone || '-'],
          ['Email', client.email || '-'],
          [pdfText('Address', 'Dirección'), [client.address, client.city].filter(Boolean).join(', ') || '-'],
          [pdfText('Notes', 'Notas'), client.notes || '-'],
          [pdfText('Registered jobs', 'Trabajos registrados'), String(jobs.length)],
          [pdfText('Total sales', 'Ventas acumuladas'), money(totals.sale)],
          [pdfText('Total cost', 'Costo acumulado'), money(totals.cost)],
          [pdfText('Total profit', 'Ganancia acumulada'), money(totals.profit)],
          [pdfText('Collected', 'Cobrado'), money(totals.paid)],
          [pdfText('Outstanding balance', 'Saldo pendiente'), money(totals.balance)],
          [pdfText('Saved photos', 'Fotos guardadas'), String(totals.photos)]
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
        head: [[pdfText("Job", "Trabajo"), pdfText("Type", "Tipo"), pdfText("Date", "Fecha"), pdfText("Due date", "Entrega"), pdfText("Status", "Estado"), pdfText("Sale", "Venta"), pdfText("Paid", "Pagado"), pdfText("Balance", "Saldo"), pdfText("Photos", "Fotos")]],
        body: jobRows.length ? jobRows : pdfEmptyRow(9),
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
        pdf.text(job.title || pdfText('Job', 'Trabajo'), 14, 18);
        pdf.setFontSize(10);
        pdf.text(`Tipo: ${getJobTypeLabel(job)} · Estado: ${job.status || '-'} · Entrega: ${job.dueDate || '-'}`, 14, 25);

        pdf.autoTable({
          startY: 32,
          head: [[pdfText("Field", "Campo"), pdfText("Details", "Detalle")]],
          body: [
            [pdfText('Description', 'Descripción'), job.description || '-'],
            [pdfText('Notes', 'Notas'), job.notes || '-'],
            ['Checklist', checklistProgress(job)],
            [pdfText('Sale', 'Venta'), money(calc.sale)],
            [pdfText('Cost', 'Costo'), money(calc.cost)],
            [pdfText('Profit', 'Ganancia'), money(calc.profit)],
            [pdfText('Paid', 'Pagado'), money(calc.paid)],
            [pdfText('Balance', 'Saldo'), money(calc.balance)],
            [pdfText('Photos', 'Fotos'), photos.map(item => item.fileName || item.url).join(' | ') || '-']
          ],
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 8 }
        });

        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 8,
          head: [[pdfText("Material", "Material"), pdfText("Quantity", "Cantidad"), pdfText("Unit cost", "Costo unitario"), pdfText("Total", "Total")]],
          body: materials.length ? materials.map(item => [
            item.name || item.inventoryName || '-',
            Number(item.qty || 0),
            money(item.price || 0),
            money(Number(item.qty || 0) * Number(item.price || 0))
          ]) : pdfEmptyRow(4),
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 8 }
        });

        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 8,
          head: [[pdfText("Date", "Fecha"), pdfText("Method", "Método"), pdfText("Amount", "Monto"), pdfText("Note", "Nota")]],
          body: payments.length ? payments.map(pay => [
            pay.date || '-',
            pay.method || '-',
            money(pay.amount || 0),
            pay.note || '-'
          ]) : pdfEmptyRow(4),
          headStyles: { fillColor: [20,22,27] },
          styles: { fontSize: 8 }
        });
      });

      savePdf(pdf, `Client_${pdfSafeFileName(clientLabel(client), 'client')}_${today()}.pdf`);
      showToast('PDF completo del cliente exportado.');
    }
    function exportCurrentModulePdf() {
      if (state.currentView === 'dashboard') return exportDashboardPdf();
      if (state.currentView === 'clientes') return exportClientsPdf();
      if (state.currentView === 'vendedores') return exportSalespeoplePdf();
      if (state.currentView === 'trabajos') return exportJobsPdf();
      if (state.currentView === 'gastos') return exportExpensesPdf();
      if (state.currentView === 'inventario') return exportInventoryPdf();
      if (state.currentView === 'proveedores') return exportProvidersPdf();
      if (state.currentView === 'compras') return exportPurchaseOrdersPdf();
      if (state.currentView === 'instalaciones') return exportInstallationCalendarPdf();
      if (state.currentView === 'reportes') return exportReportsPdf();
      if (state.currentView === 'liquidaciones' && typeof window.exportWeeklySettlementPdf === 'function') return window.exportWeeklySettlementPdf();
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
      const pdf = createModulePdf(pdfText('Internal materials list', 'Lista interna de materiales'), `${job.title || pdfText('Job', 'Trabajo')} · ${clientLabel(client)}`);

      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Field", "Campo"), pdfText("Details", "Detalle")]],
        body: [
          [pdfText("Customer", "Cliente"), clientLabel(client)],
          [pdfText("Contact", "Contacto"), (client?.phone || "-") + (client?.email ? ` / ${client.email}` : "")],
          [pdfText("Address", "Dirección"), [client?.address, client?.city].filter(Boolean).join(", ") || "-"],
          [pdfText("Job", "Trabajo"), job.title || "-"],
          [pdfText("Job type", "Tipo de trabajo"), getJobTypeLabel(job)],
          [pdfText("Description", "Descripción"), job.description || job.notes || "-"],
          [pdfText("Date", "Fecha"), job.date || "-"],
          [pdfText("Due date", "Entrega"), job.dueDate || "-"],
          [pdfText("Status", "Estado"), job.status || pdfText("Estimate", "Cotización")],
          [pdfText("Priority", "Prioridad"), job.priority || pdfText("Medium", "Media")],
          [pdfText("Saved photos", "Fotos guardadas"), String(photos.length)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      const purchaseList = getJobPurchaseList(job);

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Material", "Material"), "SKU", pdfText("Unit", "Unidad"), pdfText("Quantity", "Cantidad"), pdfText("Current stock", "Stock actual"), pdfText("To purchase", "Comprar"), pdfText("Supplier", "Proveedor"), pdfText("Total cost", "Costo total")]],
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
            item.inventoryId ? stockQty.toFixed(2) : pdfText("Manual", "Manual"),
            toBuyQty ? toBuyQty.toFixed(2) : "0.00",
            stockItem?.supplier || item.supplier || "-",
            money(total)
          ];
        }) : pdfEmptyRow(8),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8.2 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Internal summary", "Resumen interno"), pdfText("Amount", "Monto")]],
        body: [
          [pdfText("Materials cost", "Costo de materiales"), money(calc.materialsCost)],
          [pdfText("Labor", "Mano de obra"), money(calc.laborCost)],
          [pdfText("Additional costs", "Gastos extra"), money(calc.extraCost)],
          [pdfText("Linked expenses", "Gastos ligados"), money(calc.linkedExpenses)],
          [pdfText("Total internal cost", "Costo interno total"), money(calc.cost)]
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      if (purchaseList.length) {
        pdf.autoTable({
          startY: pdf.lastAutoTable.finalY + 10,
          head: [[pdfText("Missing material", "Faltante"), "SKU", pdfText("Unit", "Unidad"), pdfText("To purchase", "Comprar"), pdfText("Supplier", "Proveedor"), pdfText("Reason", "Motivo")]],
          body: purchaseList.map(item => [
            item.name || pdfText("Material", "Material"),
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
        pdf.text(pdfText("This PDF uses the job's internal materials and costs to support purchasing.", "Este PDF usa los materiales y costos internos del trabajo para ayudarte a comprar."), 14, finalY);
      }

      savePdf(pdf, `Internal_Materials_${pdfSafeFileName(job.title, "job")}_${today()}.pdf`);
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

      pdf.setFillColor(...companyPdfColor());
      pdf.rect(0, 0, 210, 34, "F");
      addPdfBrandMark(pdf);

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.text(pdfCompanyName(), 38, 16);

      pdf.setTextColor(240, 240, 240);
      pdf.setFontSize(10);
      pdf.text([COMPANY.phone, COMPANY.email, COMPANY.website].filter(Boolean).join(" · "), 38, 24);
      pdf.text(`${pdfText("Date", "Fecha")}: ${today()}`, 196, 24, { align: "right" });

      pdf.setTextColor(20, 20, 20);
      pdf.setFontSize(15);
      pdf.text(pdfText("CUSTOMER ESTIMATE", "COTIZACIÓN PARA EL CLIENTE"), 14, 44);

      pdf.autoTable({
        startY: 50,
        head: [[pdfText("Field", "Campo"), pdfText("Details", "Detalle")]],
        body: [
          [pdfText("Customer", "Cliente"), clientLabel(client)],
          [pdfText("Contact", "Contacto"), (client?.phone || "-") + (client?.email ? ` / ${client.email}` : "")],
          [pdfText("Project", "Proyecto"), job.title || "-"],
          [pdfText("Description / scope", "Descripción / alcance"), job.description || "-"],
          [pdfText("Estimate date", "Fecha de cotización"), job.date || today()],
          [pdfText("Estimated delivery", "Entrega estimada"), job.dueDate || pdfText("To be confirmed", "Por confirmar")]
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
        head: [[pdfText("Item", "Ítem"), pdfText("Quantity", "Cantidad"), pdfText("Unit price", "Precio unitario"), pdfText("Total", "Total")]],
        body: quoteRows.length ? quoteRows : pdfEmptyRow(4),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Estimate summary", "Resumen de cotización"), pdfText("Amount", "Monto")]],
        body: [
          [pdfText("Subtotal", "Subtotal"), money(q.subtotal)],
          [pdfText("Discount", "Descuento"), money(q.discountAmount)],
          [pdfText("Sales tax", "Impuesto"), money(q.taxAmount)],
          [pdfText("TOTAL CUSTOMER PRICE", "PRECIO TOTAL AL CLIENTE"), money(q.total || calc.sale)],
          [pdfText("Payments received", "Pagos recibidos"), money(calc.paid)],
          [pdfText("Remaining balance", "Saldo pendiente"), money(Math.max((q.total || calc.sale) - calc.paid, 0))]
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
      pdf.text(pdfText("Estimate terms:", "Condiciones de la cotización:"), 14, finalY);
      const terms = pdfLanguage() === "es"
        ? ["Esta cotización es válida por 30 días, salvo indicación diferente por escrito.", "Los cambios de medidas, materiales o alcance pueden modificar el precio y la fecha de entrega.", "La producción comienza después de la aprobación y del depósito acordado."]
        : ["This estimate is valid for 30 days unless otherwise stated in writing.", "Changes to measurements, materials, or scope may change price and delivery date.", "Production begins after approval and the agreed deposit are received."];
      terms.forEach((term, index) => pdf.text(`${index + 1}. ${term}`, 14, finalY + 6 + (index * 6)));
      pdf.setFont(undefined, "bold");
      pdf.text(pdfText("Customer approval: ____________________    Date: ____________", "Aprobación del cliente: ____________________    Fecha: ____________"), 14, finalY + 30);

      savePdf(pdf, `Estimate_${pdfSafeFileName(job.title, "job")}_${today()}.pdf`, "customer");
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
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Name", "Nombre"), pdfText("Email", "Correo"), pdfText("Role", "Rol"), pdfText("Status", "Estado"), pdfText("Last access", "Último acceso"), pdfText("Modules", "Módulos"), pdfText("Notes", "Notas")]],
        body: rows.length ? rows : pdfEmptyRow(7),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 8 }
      });
      savePdf(pdf, `Users_Permissions_${today()}.pdf`);
      showToast("PDF de usuarios exportado.");
    }
    function exportProvidersPdf() {
      const rows = getFilteredProviders();
      const pdf = createModulePdf(pdfText('Suppliers', 'Proveedores'), pdfText('Filtered supplier list', 'Listado filtrado de proveedores'));
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Supplier", "Proveedor"), pdfText("Contact", "Contacto"), pdfText("Phone", "Teléfono"), "Email", pdfText("City", "Ciudad"), pdfText("Notes", "Notas")]],
        body: rows.length ? rows.map(provider => [
          providerDisplayName(provider),
          provider.contact || '-',
          provider.phone || '-',
          provider.email || '-',
          provider.city || '-',
          provider.notes || '-'
        ]) : pdfEmptyRow(6),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });
      savePdf(pdf, `Suppliers_${today()}.pdf`);
      showToast('PDF de proveedores exportado.');
    }
    function exportPurchaseOrdersPdf() {
      const rows = getFilteredPurchaseOrders();
      const pdf = createModulePdf(pdfText('Purchase orders', 'Órdenes de compra'), pdfText('Filtered purchasing view', 'Vista filtrada de compras'));
      pdf.autoTable({
        startY: 56,
        head: [["PO", pdfText("Supplier", "Proveedor"), pdfText("Job", "Trabajo"), pdfText("Date", "Fecha"), pdfText("Due date", "Entrega"), pdfText("Items", "Items"), pdfText("Total", "Total"), pdfText("Status", "Estado")]],
        body: rows.length ? rows.map(po => [
          po.number || '-',
          po.providerName || '-',
          po.jobTitle || '-',
          po.date || '-',
          po.expectedDate || '-',
          String(getPurchaseOrderItems(po).length),
          money(getPurchaseOrderTotal(po)),
          po.status || '-'
        ]) : pdfEmptyRow(8),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });
      savePdf(pdf, `Purchase_Orders_${today()}.pdf`);
      showToast('PDF de compras exportado.');
    }
    function exportSinglePurchaseOrderPdf(poId) {
      const po = getPurchaseOrderById(poId);
      if (!po) return showToast("No se encontró la orden.");

      const pdf = createModulePdf(pdfText('Purchase order', 'Orden de compra'), `${pdfText('Supplier', 'Proveedor')}: ${po.providerName || '-'}`);
      pdf.autoTable({
        startY: 56,
        head: [[pdfText("Field", "Campo"), pdfText("Value", "Valor")]],
        body: [
          ["PO", po.number || '-'],
          [pdfText("Supplier", "Proveedor"), po.providerName || '-'],
          [pdfText("Job", "Trabajo"), po.jobTitle || '-'],
          [pdfText("Customer", "Cliente"), po.clientName || '-'],
          [pdfText("Date", "Fecha"), po.date || '-'],
          [pdfText("Expected delivery", "Entrega esperada"), po.expectedDate || '-'],
          [pdfText("Status", "Estado"), po.status || '-'],
          [pdfText("Notes", "Notas"), po.notes || '-']
        ],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Material", "Material"), "SKU", pdfText("Unit", "Unidad"), pdfText("Quantity", "Cantidad"), pdfText("Unit cost", "Costo unitario"), pdfText("Total", "Total")]],
        body: getPurchaseOrderItems(po).length ? getPurchaseOrderItems(po).map(item => [
          item.name || '-',
          item.sku || '-',
          item.unit || '-',
          Number(item.qty || 0).toFixed(2),
          money(item.unitCost || 0),
          money(item.total || 0)
        ]) : pdfEmptyRow(6),
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 9 }
      });

      pdf.autoTable({
        startY: pdf.lastAutoTable.finalY + 10,
        head: [[pdfText("Summary", "Resumen"), pdfText("Value", "Valor")]],
        body: [[pdfText("Order total", "Total orden"), money(getPurchaseOrderTotal(po))]],
        headStyles: { fillColor: [20,22,27] },
        styles: { fontSize: 10 }
      });

      savePdf(pdf, `Purchase_Order_${pdfSafeFileName(po.number, "order")}_${today()}.pdf`);
      showToast('PDF de la orden generado.');
    }
