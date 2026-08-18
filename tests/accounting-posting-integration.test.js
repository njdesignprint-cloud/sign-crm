const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("permanent posting is restricted to the approved development and production projects", () => {
  const source = read("assets/js/00-accounting-posting.js");
  assert.match(source, /APP_ENVIRONMENT === "development"/);
  assert.match(source, /firebaseConfig\.projectId === "sign-crm-a7bda"/);
  assert.match(source, /accountingPostSourceDocument/);
});

test("successful business saves request idempotent accounting posting", () => {
  assert.match(read("assets/js/04-expenses.js"), /postAccountingSource\("expense", savedExpenseId\)/);
  assert.match(read("assets/js/04-expenses.js"), /postAccountingSource\("job_payment", jobId, savedPayment\.id\)/);
  assert.match(read("assets/js/22-salespeople.js"), /postAccountingSource\("commission", settlement\.id\)/);
  assert.match(read("assets/js/22-salespeople.js"), /postAccountingSource\("commission", id\)/);
  assert.match(read("assets/js/27-sales-documents.js"), /postAccountingSource\("invoice", savedDocumentId\)/);
  assert.match(read("assets/js/08-providers-compras.js"), /postAccountingSource\("vendor_bill", savedPurchaseOrderId\)/);
  assert.match(read("assets/js/08-providers-compras.js"), /postAccountingSource\("vendor_payment", po\.id, payment\.id\)/);
});

test("an accounting outage never reverses a successfully saved business record", () => {
  const source = read("assets/js/00-accounting-posting.js");
  assert.match(source, /return \{ deferred:true, error \}/);
  assert.match(source, /business record remains saved/);
});

test("purchase orders show server-owned accounting status with controlled production posting", () => {
  const core = read("assets/js/01-core.js");
  const auth = read("assets/js/11-auth.js");
  const purchases = read("assets/js/08-providers-compras.js");
  assert.match(core, /accountingPostingStates: \[\]/);
  assert.match(auth, /accountingPostingStatesRef\(\)\.limit\(500\)\.onSnapshot/);
  assert.match(purchases, /activeEntryIds\.has\(item\.id\)/);
  assert.match(purchases, /sourceType === "vendor_bill"/);
  assert.match(purchases, /sourceType === "vendor_payment"/);
  assert.match(purchases, /\["development","production"\]/);
  assert.match(read("index.html"), /<th>Accounting<\/th>/);
});

test("admins can safely post only missing purchase-order accounting records", () => {
  const purchases = read("assets/js/08-providers-compras.js");
  const init = read("assets/js/12-init.js");
  assert.match(purchases, /function purchaseOrderMissingAccountingSources/);
  assert.match(purchases, /\["development","production"\]/);
  assert.match(purchases, /data-post-missing-po/);
  assert.match(purchases, /postAccountingSource\(item\.sourceType, po\.id, item\.sourceEventId\)/);
  assert.match(init, /postMissingPurchaseOrderAccounting\(target\.dataset\.postMissingPo\)/);
});

test("development never calls the production QuickBooks backend", () => {
  const quickBooks = read("assets/js/28-quickbooks.js");
  assert.match(quickBooks, /APP_ENVIRONMENT === "production"/);
  assert.match(quickBooks, /firebaseConfig\.projectId === "sign-crm-a7bda"/);
  assert.match(quickBooks, /QuickBooks is disabled outside Production/);
});
