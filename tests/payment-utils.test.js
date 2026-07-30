const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const PaymentUtils = require("../assets/js/02-payment-utils.js");

test("old payments remain positive and refunds reduce the collected total", () => {
  const payments = [
    { amount: 500 },
    { amount: 200, type: "deposit" },
    { amount: 50, type: "refund" }
  ];

  assert.equal(PaymentUtils.netPaid(payments), 650);
  assert.equal(PaymentUtils.normalizeType(undefined), "partial");
  assert.equal(PaymentUtils.effect({ amount: 50, type: "refund" }), -50);
});

test("classified deposits drive the advance without deleting the manual legacy value", () => {
  const summary = PaymentUtils.depositSummary(
    { advance: { received: 300 } },
    [{ amount: 200, type: "deposit" }, { amount: 100, type: "partial" }]
  );

  assert.equal(summary.received, 200);
  assert.equal(summary.manualReceived, 300);
  assert.equal(summary.usesPayments, true);
  assert.equal(summary.mismatch, true);
});

test("jobs without classified deposits keep their manual advance", () => {
  const summary = PaymentUtils.depositSummary(
    { advance: { received: 425 } },
    [{ amount: 425 }]
  );

  assert.equal(summary.received, 425);
  assert.equal(summary.usesPayments, false);
  assert.equal(summary.mismatch, false);
});

test("an existing payment can be reclassified without changing its identity or total", () => {
  const original = [{ id: "p-1", amount: 1000, type: "partial", method: "Zelle" }];
  const result = PaymentUtils.replaceById(original, "p-1", { amount: 1000, type: "deposit", method: "Zelle" });

  assert.equal(result.found, true);
  assert.deepEqual(result.payments, [{ id: "p-1", amount: 1000, type: "deposit", method: "Zelle" }]);
  assert.equal(PaymentUtils.netPaid(result.payments), 1000);
  assert.equal(PaymentUtils.depositSummary({}, result.payments).received, 1000);
  assert.equal(original[0].type, "partial");
});

test("payment integration is loaded before jobs and preserves legacy paid records", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const paymentSource = fs.readFileSync(path.join(__dirname, "../assets/js/04-expenses.js"), "utf8");
  const advanceSource = fs.readFileSync(path.join(__dirname, "../assets/js/16-advance-control.js"), "utf8");

  assert.ok(html.indexOf("02-payment-utils.js") < html.indexOf("03-jobs.js"));
  assert.equal(html.includes('id="paymentType"'), true);
  assert.equal(paymentSource.includes('id: "p-legacy-"'), true);
  assert.equal(paymentSource.includes("PaymentUtils.netPaid(payments)"), true);
  assert.equal(paymentSource.includes("state.editingPaymentId"), true);
  assert.equal(paymentSource.includes("payments.splice(editingIndex, 1, savedPayment)"), true);
  assert.equal(paymentSource.includes('"p-legacy-" + job.id'), true);
  assert.equal(paymentSource.includes('$("paymentJobId").disabled = true'), true);
  assert.equal(html.includes('id="paymentModalTitle"'), true);
  assert.equal(advanceSource.includes("PaymentUtils.depositSummary"), true);
});
