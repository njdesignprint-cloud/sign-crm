const test = require("node:test");
const assert = require("node:assert/strict");
const AP = require("../assets/js/00-accounts-payable-core.js");

test("accounts payable supports partial payments and overdue balances", () => {
  const po = { status:"Recibida", total:500, dueDate:"2026-08-01", vendorPayments:[{ amount:125, status:"posted" }] };
  assert.equal(AP.paid(po), 125);
  assert.equal(AP.balance(po), 375);
  assert.equal(AP.status(po, "2026-08-15"), "overdue");
  assert.throws(() => AP.validatePayment(po, 400), /exceed/);
  assert.equal(AP.validatePayment(po, 375), 375);
});

test("drafts and cancelled orders are excluded from payable summaries", () => {
  const result = AP.summarize([
    { status:"Borrador", total:100 },
    { status:"Cancelada", total:200 },
    { status:"Enviada", total:300, vendorPayments:[{ amount:50 }] }
  ], "2026-08-15");
  assert.deepEqual(result, { outstanding:250, paid:50, overdue:0, openCount:1 });
});
