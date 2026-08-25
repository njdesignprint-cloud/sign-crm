const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const source = fs.readFileSync(path.join(__dirname, "../assets/js/04-expenses.js"), "utf8");
const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
const pdf = fs.readFileSync(path.join(__dirname, "../assets/js/07-pdf.js"), "utf8");

test("general and recurring expenses expose a payment method", () => {
  assert.equal((html.match(/id="expensePaymentMethod"/g) || []).length, 1);
  assert.equal((html.match(/id="recurringPaymentMethod"/g) || []).length, 1);
  assert.match(source, /paymentMethod: cleanText\(\$\("expensePaymentMethod"\)\.value\)/);
  assert.match(source, /paymentMethod: recurring\.paymentMethod \|\| "Efectivo"/);
});

test("recurring expenses wait until their due day and do not write for read-only users", () => {
  assert.match(source, /if \(!canWriteData\("gastos"\)\) return/);
  assert.match(source, /if \(currentDay < dueDay\) continue/);
});

test("expense list exposes receipt links and the PDF includes accounting detail and a total", () => {
  assert.match(source, /Ver \(\$\{photos\.length\}\)/);
  assert.match(pdf, /Filtered expense total/);
  assert.match(pdf, /expense\.paymentMethod/);
  assert.match(pdf, /getJobDisplayLabel/);
});
