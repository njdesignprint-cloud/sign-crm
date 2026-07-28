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

test("payment integration is loaded before jobs and preserves legacy paid records", () => {
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  const paymentSource = fs.readFileSync(path.join(__dirname, "../assets/js/04-expenses.js"), "utf8");
  const advanceSource = fs.readFileSync(path.join(__dirname, "../assets/js/16-advance-control.js"), "utf8");

  assert.ok(html.indexOf("02-payment-utils.js") < html.indexOf("03-jobs.js"));
  assert.equal(html.includes('id="paymentType"'), true);
  assert.equal(paymentSource.includes('id: "p-legacy-"'), true);
  assert.equal(paymentSource.includes("PaymentUtils.netPaid(payments)"), true);
  assert.equal(advanceSource.includes("PaymentUtils.depositSummary"), true);
});
