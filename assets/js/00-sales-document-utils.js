(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.SalesDocumentUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function calculate(lines = [], discount = 0, taxPercent = 0) {
    const normalized = (Array.isArray(lines) ? lines : []).map(line => ({
      ...line,
      quantity: Math.max(0, Number(line.quantity || 0)),
      rate: Math.max(0, Number(line.rate || 0)),
      internalCost: Math.max(0, Number(line.internalCost || 0)),
      taxable: line.taxable !== false
    })).map(line => ({ ...line, amount:line.quantity * line.rate }));
    const subtotal = normalized.reduce((sum, line) => sum + line.amount, 0);
    const safeDiscount = Math.min(Math.max(0, Number(discount || 0)), subtotal);
    const taxableSubtotal = normalized.filter(line => line.taxable).reduce((sum, line) => sum + line.amount, 0);
    const discountRatio = subtotal > 0 ? safeDiscount / subtotal : 0;
    const taxableAfterDiscount = Math.max(0, taxableSubtotal * (1 - discountRatio));
    const safeTaxPercent = Math.max(0, Number(taxPercent || 0));
    const tax = taxableAfterDiscount * safeTaxPercent / 100;
    const total = Math.max(0, subtotal - safeDiscount + tax);
    const internalCost = normalized.reduce((sum, line) => sum + line.internalCost, 0);
    return { lines:normalized, subtotal, discount:safeDiscount, taxableSubtotal:taxableAfterDiscount, taxPercent:safeTaxPercent, tax, total, internalCost, profit:total - tax - internalCost };
  }

  function balance(document = {}) { return Math.max(0, Number(document.total || 0) - Math.max(0, Number(document.paidAmount || 0))); }

  function effectiveStatus(document = {}, currentDate = "") {
    const remaining = balance(document);
    if (document.type === "invoice" && !["paid", "void"].includes(document.status) && document.dueDate && currentDate && document.dueDate < currentDate && remaining > 0) return "overdue";
    if (document.type === "invoice" && Number(document.paidAmount || 0) > 0 && remaining > 0) return "partially_paid";
    if (document.type === "invoice" && Number(document.total || 0) > 0 && remaining <= 0) return "paid";
    return document.status || "draft";
  }

  return { calculate, balance, effectiveStatus };
});
