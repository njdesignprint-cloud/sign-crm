(function () {
  const TAX_RESERVE_RATE = 30;
  const BUSINESS_RESERVE_RATE = 30;

  function dateFromYmd(value) {
    const [year, month, day] = String(value || "").split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
  }

  function ymd(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function mondayFor(value = new Date()) {
    const date = value instanceof Date ? new Date(value) : dateFromYmd(value);
    date.setHours(12, 0, 0, 0);
    const day = date.getDay();
    date.setDate(date.getDate() - (day === 0 ? 6 : day - 1));
    return ymd(date);
  }

  function addDays(value, days) {
    const date = dateFromYmd(value);
    date.setDate(date.getDate() + days);
    return ymd(date);
  }

  function formatDate(value) {
    return dateFromYmd(value).toLocaleDateString("es-US", {
      month: "short",
      day: "2-digit",
      year: "numeric"
    });
  }

  function paymentSalesTaxShare(job, paymentAmount) {
    if (typeof getQuote !== "function" || typeof computeQuote !== "function") return 0;
    const calculation = computeQuote(getQuote(job));
    const invoiceTotal = Number(calculation.total || job.sale || 0);
    const taxAmount = Number(calculation.taxAmount || 0);
    if (invoiceTotal <= 0 || taxAmount <= 0) return 0;
    return Number(paymentAmount || 0) * Math.min(taxAmount / invoiceTotal, 1);
  }

  function getWeekCalculation(weekStart) {
    const weekEnd = addDays(weekStart, 6);
    const payments = [];
    state.jobs.forEach(job => {
      const client = typeof getClientById === "function" ? getClientById(job.clientId) : null;
      const jobLabel = `${typeof clientLabel === "function" ? clientLabel(client) : "Cliente"} · ${job.title || "Trabajo"}`;
      (typeof getPaymentsList === "function" ? getPaymentsList(job) : []).forEach(payment => {
        const date = cleanText(payment.date);
        if (!date || date < weekStart || date > weekEnd) return;
        const amount = Math.max(Number(payment.amount || 0), 0);
        payments.push({
          date,
          type: "Cobro",
          concept: jobLabel,
          amount,
          salesTax: paymentSalesTaxShare(job, amount)
        });
      });
    });

    const expenses = state.expenses
      .filter(expense => expense.date >= weekStart && expense.date <= weekEnd)
      .map(expense => ({
        date: expense.date,
        type: "Gasto",
        concept: expense.concept || expense.category || "Gasto",
        amount: Math.max(Number(expense.amount || 0), 0)
      }));

    const grossCollected = payments.reduce((sum, item) => sum + item.amount, 0);
    const salesTax = payments.reduce((sum, item) => sum + item.salesTax, 0);
    const expenseTotal = expenses.reduce((sum, item) => sum + item.amount, 0);
    const netProfit = Math.max(grossCollected - salesTax - expenseTotal, 0);
    const taxReserve = netProfit * TAX_RESERVE_RATE / 100;
    const businessReserve = netProfit * BUSINESS_RESERVE_RATE / 100;
    const recommendedPay = Math.max(netProfit - taxReserve - businessReserve, 0);

    return {
      weekStart,
      weekEnd,
      grossCollected,
      salesTax,
      expenseTotal,
      netProfit,
      taxReserve,
      businessReserve,
      recommendedPay,
      payments,
      expenses,
      movements: [...payments, ...expenses].sort((a, b) => a.date.localeCompare(b.date))
    };
  }

  function currentClosedSettlement(weekStart) {
    return state.weeklySettlements.find(item => item.weekStart === weekStart) || null;
  }

  function setText(id, value) {
    const element = $(id);
    if (element) element.textContent = value;
  }

  function renderDetail(calculation) {
    const body = $("settlementDetailBody");
    if (!body) return;
    body.innerHTML = calculation.movements.map(item => `
      <tr>
        <td>${safe(formatDate(item.date))}</td>
        <td><span class="pill ${item.type === "Cobro" ? "state-active" : "st-cancelado"}">${safe(item.type)}</span></td>
        <td>${safe(item.concept)}</td>
        <td class="${item.type === "Cobro" ? "ok-text" : "danger-text"}">${item.type === "Cobro" ? "+" : "−"}${money(item.amount)}</td>
      </tr>
    `).join("");
    $("settlementDetailEmpty")?.classList.toggle("hidden", calculation.movements.length > 0);
  }

  function renderHistory() {
    const body = $("settlementHistoryBody");
    if (!body) return;
    body.innerHTML = state.weeklySettlements.map(item => `
      <tr>
        <td>${safe(formatDate(item.weekStart))} – ${safe(formatDate(item.weekEnd))}</td>
        <td>${money(item.grossCollected)}</td>
        <td>${money(item.expenseTotal)}</td>
        <td>${money(item.taxReserve)}</td>
        <td>${money(item.businessReserve)}</td>
        <td class="ok-text"><strong>${money(item.actualPay)}</strong></td>
        <td>${safe(item.paymentReference || "—")}</td>
        <td><span class="pill state-active">Pagada</span></td>
      </tr>
    `).join("");
    $("settlementHistoryEmpty")?.classList.toggle("hidden", state.weeklySettlements.length > 0);
  }

  window.renderWeeklySettlements = function () {
    if (!$("settlementWeekStart")) return;
    const selected = mondayFor($("settlementWeekStart").value || new Date());
    $("settlementWeekStart").value = selected;
    const calculation = getWeekCalculation(selected);
    const closed = currentClosedSettlement(selected);
    const display = closed || calculation;

    setText("settlementGrossCollected", money(display.grossCollected));
    setText("settlementSalesTax", money(display.salesTax));
    setText("settlementExpenses", money(display.expenseTotal));
    setText("settlementNetProfit", money(display.netProfit));
    setText("settlementBaseProfit", money(display.netProfit));
    setText("settlementTaxRateLabel", `${display.taxReserveRate || TAX_RESERVE_RATE}%`);
    setText("settlementBusinessRateLabel", `${display.businessReserveRate || BUSINESS_RESERVE_RATE}%`);
    setText("settlementTaxReserve", money(display.taxReserve));
    setText("settlementBusinessReserve", money(display.businessReserve));
    setText("settlementRecommendedPay", money(display.recommendedPay));
    setText("settlementRangeLabel", `${formatDate(calculation.weekStart)} al ${formatDate(calculation.weekEnd)} · lunes a domingo`);

    const status = $("settlementStatusPill");
    status.textContent = closed ? "Pagada" : "Borrador";
    status.className = `pill ${closed ? "state-active" : "pr-media"}`;

    const closeButton = $("btnCloseSettlement");
    closeButton.disabled = !!closed;
    closeButton.textContent = closed ? "Semana cerrada" : "Registrar pago y cerrar semana";
    $("settlementActualPay").disabled = !!closed;
    $("settlementPaidAt").disabled = !!closed;
    $("settlementPaymentReference").disabled = !!closed;
    $("settlementNotes").disabled = !!closed;

    if (closed) {
      $("settlementActualPay").value = Number(closed.actualPay || 0).toFixed(2);
      $("settlementPaidAt").value = closed.paidAt || "";
      $("settlementPaymentReference").value = closed.paymentReference || "";
      $("settlementNotes").value = closed.notes || "";
      setText("settlementClosedNotice", `Semana cerrada por ${closed.closedBy || "el propietario"} el ${formatDate(closed.paidAt || closed.weekEnd)}.`);
      $("settlementClosedNotice").classList.remove("hidden");
    } else {
      $("settlementActualPay").value = calculation.recommendedPay.toFixed(2);
      if (!$("settlementPaidAt").value) $("settlementPaidAt").value = today();
      $("settlementPaymentReference").value = "";
      $("settlementNotes").value = "";
      $("settlementClosedNotice").classList.add("hidden");
    }

    renderDetail(closed?.movements ? { movements: closed.movements } : calculation);
    renderHistory();
  };

  async function closeWeeklySettlement() {
    if (!isOwner()) return showToast("Solo el propietario puede cerrar una liquidación.");
    const weekStart = mondayFor($("settlementWeekStart").value);
    if (currentClosedSettlement(weekStart)) return showToast("Esta semana ya está cerrada.");
    const calculation = getWeekCalculation(weekStart);
    const actualPay = Math.max(Number($("settlementActualPay").value || 0), 0);
    const paidAt = cleanText($("settlementPaidAt").value);
    if (!paidAt) return showToast("Selecciona la fecha del pago.");
    if (actualPay > calculation.recommendedPay + 0.005) {
      return showToast("El pago no debe superar la cantidad recomendada.");
    }
    if (!confirm(`¿Cerrar la semana y registrar un pago de ${money(actualPay)}? Después no podrá modificarse.`)) return;

    const payload = {
      ...calculation,
      taxReserveRate: TAX_RESERVE_RATE,
      businessReserveRate: BUSINESS_RESERVE_RATE,
      actualPay,
      paidAt,
      paymentReference: cleanText($("settlementPaymentReference").value),
      notes: cleanText($("settlementNotes").value),
      status: "paid",
      closedBy: state.userEmail || "propietario",
      closedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    delete payload.payments;
    delete payload.expenses;

    try {
      await weeklySettlementsRef().doc(weekStart).set(payload);
      showToast("Pago registrado y semana cerrada.");
    } catch (error) {
      console.error(error);
      showToast("No se pudo cerrar la liquidación.");
    }
  }

  window.exportWeeklySettlementPdf = function () {
    const { jsPDF } = window.jspdf;
    const weekStart = mondayFor($("settlementWeekStart").value || new Date());
    const calculation = currentClosedSettlement(weekStart) || getWeekCalculation(weekStart);
    const pdf = new jsPDF();
    pdf.setFontSize(18);
    pdf.text("Liquidación semanal del propietario", 14, 18);
    pdf.setFontSize(10);
    pdf.text(`${formatDate(calculation.weekStart)} al ${formatDate(calculation.weekEnd)}`, 14, 25);
    pdf.autoTable({
      startY: 32,
      head: [["Concepto", "Monto"]],
      body: [
        ["Cobros recibidos", money(calculation.grossCollected)],
        ["Sales tax separado", money(calculation.salesTax)],
        ["Gastos pagados", money(calculation.expenseTotal)],
        ["Ganancia neta de caja", money(calculation.netProfit)],
        [`Reserva de impuestos (${calculation.taxReserveRate || TAX_RESERVE_RATE}%)`, money(calculation.taxReserve)],
        [`Reserva del negocio (${calculation.businessReserveRate || BUSINESS_RESERVE_RATE}%)`, money(calculation.businessReserve)],
        ["Pago recomendado", money(calculation.recommendedPay)],
        ["Pago registrado", money(calculation.actualPay ?? calculation.recommendedPay)]
      ],
      headStyles: { fillColor: [30, 34, 42] }
    });
    pdf.save(`Liquidacion_${calculation.weekStart}.pdf`);
    showToast("PDF de liquidación exportado.");
  };

  function shiftWeek(days) {
    $("settlementWeekStart").value = addDays(mondayFor($("settlementWeekStart").value || new Date()), days);
    renderWeeklySettlements();
  }

  function bootWeeklySettlements() {
    if (!$("settlementWeekStart")) return;
    $("settlementWeekStart").value = mondayFor(new Date());
    $("settlementPaidAt").value = today();
    $("settlementWeekStart").addEventListener("change", renderWeeklySettlements);
    $("btnSettlementPrevWeek").addEventListener("click", () => shiftWeek(-7));
    $("btnSettlementNextWeek").addEventListener("click", () => shiftWeek(7));
    $("btnSettlementCurrentWeek").addEventListener("click", () => {
      $("settlementWeekStart").value = mondayFor(new Date());
      renderWeeklySettlements();
    });
    $("btnCloseSettlement").addEventListener("click", closeWeeklySettlement);
    renderWeeklySettlements();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootWeeklySettlements);
  } else {
    bootWeeklySettlements();
  }
})();
