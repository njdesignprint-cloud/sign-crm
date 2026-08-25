import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const expenses = fs.readFileSync(new URL("../assets/js/04-expenses.js", import.meta.url), "utf8");
const pdf = fs.readFileSync(new URL("../assets/js/07-pdf.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
const advance = fs.readFileSync(new URL("../assets/js/16-advance-control.js", import.meta.url), "utf8");
const dashboard = fs.readFileSync(new URL("../assets/js/14-dashboard-upgrade.js", import.meta.url), "utf8");

test("worker payments are job-linked expenses rather than customer collections", () => {
  assert.match(html, /value="worker_payment">Pago a trabajador/);
  assert.match(expenses, /recordType:.*worker_payment/);
  assert.match(expenses, /Selecciona el trabajo relacionado para descontar correctamente este pago/);
  assert.match(expenses, /data-worker-payment-receipt/);
  assert.match(html, /id="expenseApplyToAdvance"/);
  assert.match(expenses, /applyToAdvance:.*expenseApplyToAdvance/);
  assert.doesNotMatch(expenses, /payments\.push\([^)]*worker/i);
});

test("worker payments reduce available job deposit once without changing customer collections", () => {
  assert.match(advance, /expense\.recordType === "worker_payment"/);
  assert.match(advance, /expense\.applyToAdvance !== false/);
  assert.match(advance, /available: summary\.available - workerPaymentsSpent/);
  assert.match(dashboard, /monthSales - monthInternalCosts - monthExpenses/);
  assert.doesNotMatch(dashboard, /monthProfitBase - monthExpenses/);
});

test("worker payment receipts follow the supplied detailed template and support reviewed email", () => {
  assert.match(pdf, /function exportWorkerPaymentReceiptPdf/);
  assert.match(pdf, /function buildWorkerPaymentReceiptPdf/);
  assert.match(pdf, /The worker acknowledges receipt/);
  assert.match(pdf, /COMPANY REPRESENTATIVE/);
  assert.match(pdf, /WORKER SIGNATURE/);
  assert.match(html, /id="workerPaymentLines"/);
  assert.match(html, /id="workerPaymentReviewPdf"/);
  assert.match(expenses, /workerPaymentItems: getWorkerPaymentLines\(\)/);
  assert.match(expenses, /kind:"worker_payment"/);
  assert.match(expenses, /máximo de cuatro conceptos/);
  assert.match(expenses, /quantity \* item\.rate/);
  assert.match(pdf, /DESCRIPTION \/ PROJECT/);
  assert.match(pdf, /NET PAYMENT RECEIVED/);
});
