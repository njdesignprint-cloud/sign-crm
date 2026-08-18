(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AccountsPayableCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const payments = po => (Array.isArray(po?.vendorPayments) ? po.vendorPayments : []).filter(item => item && item.status !== "void");
  const total = po => round(Number(po?.total || 0));
  const paid = po => round(payments(po).reduce((sum, item) => sum + Number(item.amount || 0), 0));
  const balance = po => Math.max(0, round(total(po) - paid(po)));
  const isPayable = po => !["Borrador", "Cancelada"].includes(String(po?.status || "Borrador")) && total(po) > 0;
  function status(po, today = new Date().toISOString().slice(0, 10)) {
    if (!isPayable(po)) return "not_payable";
    const remaining = balance(po);
    if (remaining <= 0) return "paid";
    if (po?.dueDate && po.dueDate < today) return "overdue";
    if (paid(po) > 0) return "partial";
    return "open";
  }
  function summarize(purchaseOrders = [], today) {
    const payable = purchaseOrders.filter(isPayable);
    return {
      outstanding:round(payable.reduce((sum, po) => sum + balance(po), 0)),
      paid:round(payable.reduce((sum, po) => sum + paid(po), 0)),
      overdue:round(payable.filter(po => status(po, today) === "overdue").reduce((sum, po) => sum + balance(po), 0)),
      openCount:payable.filter(po => balance(po) > 0).length
    };
  }
  function validatePayment(po, amount) {
    const value = round(amount);
    if (!isPayable(po)) throw new Error("This purchase order is not an active payable.");
    if (value <= 0) throw new Error("Payment amount must be greater than zero.");
    if (value - balance(po) > 0.005) throw new Error("Payment cannot exceed the outstanding balance.");
    return value;
  }
  return { balance, isPayable, paid, payments, status, summarize, total, validatePayment };
});
