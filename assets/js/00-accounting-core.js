(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AccountingCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const CHART_OF_ACCOUNTS = Object.freeze([
    { code:"1000", name:"Cash and bank", type:"asset", normal:"debit" },
    { code:"1100", name:"Accounts receivable", type:"asset", normal:"debit" },
    { code:"1200", name:"Inventory asset", type:"asset", normal:"debit" },
    { code:"1500", name:"Fixed assets", type:"asset", normal:"debit" },
    { code:"2000", name:"Accounts payable", type:"liability", normal:"credit" },
    { code:"2100", name:"Sales tax payable", type:"liability", normal:"credit" },
    { code:"2200", name:"Customer deposits", type:"liability", normal:"credit" },
    { code:"3000", name:"Owner equity", type:"equity", normal:"credit" },
    { code:"4000", name:"Sales revenue", type:"revenue", normal:"credit" },
    { code:"5000", name:"Cost of goods sold", type:"expense", normal:"debit" },
    { code:"6000", name:"Operating expenses", type:"expense", normal:"debit" },
    { code:"6010", name:"Sales commissions", type:"expense", normal:"debit" }
  ]);

  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const positive = value => Math.max(0, round(value));

  function line(accountCode, debit = 0, credit = 0, memo = "") {
    return { accountCode:String(accountCode), debit:positive(debit), credit:positive(credit), memo:String(memo || "") };
  }

  function createEntry({ id, date, description, sourceType, sourceId, lines }) {
    const normalized = (Array.isArray(lines) ? lines : []).map(item => line(item.accountCode, item.debit, item.credit, item.memo));
    const debit = round(normalized.reduce((sum, item) => sum + item.debit, 0));
    const credit = round(normalized.reduce((sum, item) => sum + item.credit, 0));
    if (!id || !date || !description) throw new Error("Accounting entries require an id, date and description.");
    if (normalized.length < 2) throw new Error("Accounting entries require at least two lines.");
    if (debit <= 0 || Math.abs(debit - credit) > 0.005) throw new Error(`Unbalanced accounting entry ${id}.`);
    return { id:String(id), date:String(date), description:String(description), sourceType:String(sourceType || "manual"), sourceId:String(sourceId || ""), debit, credit, lines:normalized };
  }

  function calculateDocumentAmounts(document = {}) {
    const total = positive(document.total ?? document.sale);
    const tax = Math.min(total, positive(document.tax ?? document.taxAmount));
    return { total, tax, revenue:round(total - tax) };
  }

  function calculateJobAmounts(job = {}) {
    const quote = job.quote || {};
    const items = Array.isArray(quote.items) ? quote.items : [];
    const rawSubtotal = items.reduce((sum, item) => sum + positive(item.quantity ?? item.qty ?? 0) * positive(item.unitPrice ?? item.price ?? 0), 0);
    const discount = quote.discountType === "percent"
      ? rawSubtotal * Math.min(100, positive(quote.discountValue)) / 100
      : Math.min(rawSubtotal, positive(quote.discountValue));
    const subtotal = round(Math.max(0, rawSubtotal - discount));
    const tax = round(subtotal * positive(quote.taxPercent) / 100);
    const total = positive(job.sale || subtotal + tax);
    const safeTax = Math.min(total, tax);
    return { total, tax:safeTax, revenue:round(total - safeTax) };
  }

  function paymentEffect(payment = {}) {
    const amount = positive(payment.amount);
    return ["refund", "reembolso"].includes(String(payment.type || "").toLowerCase()) ? -amount : amount;
  }

  function saleEntry(source, amounts, sourceType) {
    if (!amounts.total) return null;
    const reference = source.number || source.title || source.id || "Sale";
    return createEntry({
      id:`sale:${sourceType}:${source.id}`,
      date:source.issueDate || source.date,
      description:`Sale · ${reference}`,
      sourceType,
      sourceId:source.id,
      lines:[
        line("1100", amounts.total, 0, "Customer balance"),
        line("4000", 0, amounts.revenue, "Sale before tax"),
        ...(amounts.tax ? [line("2100", 0, amounts.tax, "Sales tax collected") ] : [])
      ]
    });
  }

  function buildProvisionalLedger(data = {}) {
    const entries = [];
    const documents = (data.salesDocuments || []).filter(item => item.type === "invoice" && item.status !== "void");
    const invoicedJobIds = new Set(documents.map(item => item.jobId).filter(Boolean));
    (data.trashItems || []).filter(item => item.type === "salesDocuments" && item.payload?.type === "invoice").forEach(item => {
      if (item.payload?.jobId) invoicedJobIds.add(item.payload.jobId);
    });

    documents.forEach(document => {
      const entry = saleEntry(document, calculateDocumentAmounts(document), "invoice");
      if (entry) entries.push(entry);
    });

    (data.jobs || []).filter(job => !["Cotización", "Cancelado"].includes(job.status) && !invoicedJobIds.has(job.id)).forEach(job => {
      const entry = saleEntry(job, calculateJobAmounts(job), "job_sale_fallback");
      if (entry) entries.push(entry);
    });

    (data.jobs || []).forEach(job => (Array.isArray(job.payments) ? job.payments : []).forEach((payment, index) => {
      const effect = paymentEffect(payment);
      if (!effect || !payment.date) return;
      const amount = Math.abs(effect);
      entries.push(createEntry({
        id:`payment:${job.id}:${payment.id || index}`,
        date:payment.date,
        description:`${effect < 0 ? "Refund" : "Customer payment"} · ${job.title || job.id}`,
        sourceType:effect < 0 ? "refund" : "payment",
        sourceId:job.id,
        lines:effect < 0
          ? [line("1100", amount, 0, "Customer balance restored"), line("1000", 0, amount, "Cash refunded")]
          : [line("1000", amount, 0, "Cash received"), line("1100", 0, amount, "Customer balance reduced")]
      }));
    }));

    (data.expenses || []).forEach(expense => {
      const amount = positive(expense.amount);
      if (!amount || !expense.date) return;
      entries.push(createEntry({
        id:`expense:${expense.id}`,
        date:expense.date,
        description:`Expense · ${expense.concept || expense.category || expense.id}`,
        sourceType:"expense",
        sourceId:expense.id,
        lines:[line("6000", amount, 0, expense.category || "Operating expense"), line("1000", 0, amount, expense.paymentMethod || "Paid")]
      }));
    });

    (data.purchaseOrders || []).filter(po => !["Borrador", "Cancelada"].includes(String(po.status || "Borrador"))).forEach(po => {
      const amount = positive(po.total);
      const billDate = po.billDate || po.date;
      if (!amount || !billDate) return;
      const items = Array.isArray(po.items) ? po.items : [];
      const inventoryAmount = round(items.filter(item => item.inventoryId).reduce((sum, item) => sum + positive(item.total ?? (positive(item.qty) * positive(item.unitCost))), 0));
      const safeInventoryAmount = Math.min(amount, inventoryAmount);
      const expenseAmount = round(amount - safeInventoryAmount);
      const reference = po.supplierInvoiceNumber || po.number || po.id;
      entries.push(createEntry({
        id:`vendor-bill:${po.id}`,
        date:billDate,
        description:`Vendor bill · ${po.providerName || reference}`,
        sourceType:"vendor_bill",
        sourceId:po.id,
        lines:[
          ...(safeInventoryAmount ? [line("1200", safeInventoryAmount, 0, "Inventory purchased")] : []),
          ...(expenseAmount ? [line("6000", expenseAmount, 0, "Non-inventory purchase")] : []),
          line("2000", 0, amount, `Supplier invoice ${reference}`)
        ]
      }));

      (Array.isArray(po.vendorPayments) ? po.vendorPayments : []).filter(payment => payment && payment.status !== "void").forEach((payment, index) => {
        const paidAmount = positive(payment.amount);
        if (!paidAmount || !payment.date) return;
        entries.push(createEntry({
          id:`vendor-payment:${po.id}:${payment.id || index}`,
          date:payment.date,
          description:`Vendor payment · ${po.providerName || reference}`,
          sourceType:"vendor_payment",
          sourceId:po.id,
          lines:[line("2000", paidAmount, 0, `Supplier invoice ${reference}`), line("1000", 0, paidAmount, payment.method || "Paid")]
        }));
      });
    });

    (data.commissionSettlements || []).filter(item => item.status !== "void").forEach(settlement => {
      const amount = positive(settlement.total);
      if (!amount || !settlement.paymentDate) return;
      entries.push(createEntry({
        id:`commission:${settlement.id}`,
        date:settlement.paymentDate,
        description:`Commission · ${settlement.salespersonName || settlement.id}`,
        sourceType:"commission",
        sourceId:settlement.id,
        lines:[line("6010", amount, 0, "Sales commission"), line("1000", 0, amount, settlement.method || "Paid")]
      }));
    });

    return entries.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  }

  function filterEntries(entries = [], from = "", to = "") {
    return entries.filter(entry => (!from || entry.date >= from) && (!to || entry.date <= to));
  }

  function trialBalance(entries = [], chart = CHART_OF_ACCOUNTS) {
    const byCode = new Map(chart.map(account => [account.code, { ...account, debit:0, credit:0, balance:0 }]));
    entries.forEach(entry => entry.lines.forEach(item => {
      if (!byCode.has(item.accountCode)) throw new Error(`Unknown account ${item.accountCode}.`);
      const account = byCode.get(item.accountCode);
      account.debit = round(account.debit + item.debit);
      account.credit = round(account.credit + item.credit);
    }));
    return [...byCode.values()].map(account => ({
      ...account,
      balance:round(account.normal === "debit" ? account.debit - account.credit : account.credit - account.debit)
    })).filter(account => account.debit || account.credit);
  }

  function summarize(entries = []) {
    const accounts = trialBalance(entries);
    const value = code => accounts.find(account => account.code === code)?.balance || 0;
    const revenue = value("4000");
    const expenses = round(value("5000") + value("6000") + value("6010"));
    return {
      cash:value("1000"), receivable:value("1100"), salesTaxPayable:value("2100"),
      revenue, expenses, netIncome:round(revenue - expenses), entryCount:entries.length,
      totalDebits:round(entries.reduce((sum, entry) => sum + entry.debit, 0)),
      totalCredits:round(entries.reduce((sum, entry) => sum + entry.credit, 0))
    };
  }

  function profitAndLoss(entries = []) {
    const accounts = trialBalance(entries);
    const revenue = accounts.filter(account => account.type === "revenue");
    const expenses = accounts.filter(account => account.type === "expense");
    const totalRevenue = round(revenue.reduce((sum, account) => sum + account.balance, 0));
    const totalExpenses = round(expenses.reduce((sum, account) => sum + account.balance, 0));
    return { revenue, expenses, totalRevenue, totalExpenses, netIncome:round(totalRevenue - totalExpenses) };
  }

  function balanceSheet(entries = []) {
    const accounts = trialBalance(entries);
    const assets = accounts.filter(account => account.type === "asset");
    const liabilities = accounts.filter(account => account.type === "liability");
    const equity = accounts.filter(account => account.type === "equity");
    const earnings = profitAndLoss(entries).netIncome;
    const totalAssets = round(assets.reduce((sum, account) => sum + account.balance, 0));
    const totalLiabilities = round(liabilities.reduce((sum, account) => sum + account.balance, 0));
    const recordedEquity = round(equity.reduce((sum, account) => sum + account.balance, 0));
    const totalEquity = round(recordedEquity + earnings);
    return { assets, liabilities, equity, currentEarnings:earnings, totalAssets, totalLiabilities, totalEquity, difference:round(totalAssets - totalLiabilities - totalEquity) };
  }

  function cashFlow(entries = []) {
    const movements = entries.flatMap(entry => entry.lines.filter(item => item.accountCode === "1000").map(item => ({
      date:entry.date, description:entry.description, sourceType:entry.sourceType, amount:round(item.debit - item.credit)
    })));
    const inflows = round(movements.filter(item => item.amount > 0).reduce((sum, item) => sum + item.amount, 0));
    const outflows = round(Math.abs(movements.filter(item => item.amount < 0).reduce((sum, item) => sum + item.amount, 0)));
    return { movements, inflows, outflows, netCashFlow:round(inflows - outflows) };
  }

  function accountsReceivableAging(data = {}, asOf = "") {
    const cutoff = asOf || "9999-12-31";
    const jobs = new Map((data.jobs || []).map(job => [job.id, job]));
    const rows = (data.salesDocuments || []).filter(document => document.type === "invoice" && document.status !== "void" && (document.issueDate || "") <= cutoff).map(document => {
      const job = jobs.get(document.jobId) || {};
      const collected = round((job.payments || []).filter(payment => (payment.date || "") <= cutoff).reduce((sum, payment) => sum + paymentEffect(payment), 0));
      const total = calculateDocumentAmounts(document).total;
      const balance = round(Math.max(0, total - collected));
      const dueDate = document.dueDate || document.issueDate || cutoff;
      const daysPastDue = Math.max(0, Math.floor((Date.parse(`${cutoff}T00:00:00Z`) - Date.parse(`${dueDate}T00:00:00Z`)) / 86400000));
      const bucket = daysPastDue === 0 ? "current" : daysPastDue <= 30 ? "1_30" : daysPastDue <= 60 ? "31_60" : daysPastDue <= 90 ? "61_90" : "over_90";
      return { id:document.id, number:document.number || document.id, customer:document.clientSnapshot?.company || document.clientSnapshot?.name || job.clientName || "Customer", issueDate:document.issueDate || "", dueDate, total, collected, balance, daysPastDue, bucket };
    }).filter(row => row.balance > 0);
    const totals = { current:0, "1_30":0, "31_60":0, "61_90":0, over_90:0, total:0 };
    rows.forEach(row => { totals[row.bucket] = round(totals[row.bucket] + row.balance); totals.total = round(totals.total + row.balance); });
    return { rows:rows.sort((a, b) => b.daysPastDue - a.daysPastDue), totals };
  }

  return { CHART_OF_ACCOUNTS, line, createEntry, calculateDocumentAmounts, calculateJobAmounts, paymentEffect, buildProvisionalLedger, filterEntries, trialBalance, summarize, profitAndLoss, balanceSheet, cashFlow, accountsReceivableAging };
});
