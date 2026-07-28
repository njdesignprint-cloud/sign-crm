(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PaymentUtils = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const TYPES = {
    deposit: { es: "Depósito / anticipo", en: "Deposit", sign: 1 },
    partial: { es: "Pago parcial", en: "Partial payment", sign: 1 },
    final: { es: "Pago final", en: "Final payment", sign: 1 },
    refund: { es: "Reembolso", en: "Refund", sign: -1 },
    legacy: { es: "Pago anterior", en: "Legacy payment", sign: 1 }
  };

  function normalizeType(value) {
    const type = String(value || "").trim().toLowerCase();
    return TYPES[type] ? type : "partial";
  }

  function effect(payment = {}) {
    const type = normalizeType(payment.type);
    return Math.abs(Number(payment.amount || 0)) * TYPES[type].sign;
  }

  function netPaid(payments = []) {
    return (Array.isArray(payments) ? payments : []).reduce((sum, payment) => sum + effect(payment), 0);
  }

  function typeLabel(type, language = "es") {
    const normalized = normalizeType(type);
    return TYPES[normalized][language === "en" ? "en" : "es"];
  }

  function depositSummary(job = {}, payments = []) {
    const list = Array.isArray(payments) ? payments : [];
    const depositPayments = list.filter(payment => normalizeType(payment.type) === "deposit");
    const classifiedReceived = depositPayments.reduce((sum, payment) => sum + effect(payment), 0);
    const manualReceived = Number(job.advance?.received || 0);
    const usesPayments = depositPayments.length > 0;
    const received = usesPayments ? classifiedReceived : manualReceived;
    return {
      received,
      classifiedReceived,
      manualReceived,
      usesPayments,
      mismatch: usesPayments && manualReceived > 0 && Math.abs(classifiedReceived - manualReceived) > 0.009
    };
  }

  return { TYPES, normalizeType, effect, netPaid, typeLabel, depositSummary };
});
