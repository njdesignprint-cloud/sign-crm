const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

test("monthly closing UI is project-bound and requires explicit confirmation", () => {
  const source = read("assets/js/29-accounting.js");
  assert.match(source, /APP_ENVIRONMENT === "development"/);
  assert.match(source, /firebaseConfig\.projectId === "signshophq-dev"/);
  assert.match(source, /firebaseConfig\.projectId === "sign-crm-a7bda"/);
  assert.match(source, /window\.confirm/);
  assert.match(source, /accountingClosePeriod/);
});

test("monthly closing explains that it is permanent and reconciliation-gated", () => {
  const html = read("index.html");
  assert.match(html, /Close month permanently/);
  assert.match(html, /reconciled through month end/);
  assert.match(html, /Closing cannot be undone from the browser/);
  assert.match(html, /Download close package PDF/);
});

test("close package uses permanent entries and contains required monthly reports", () => {
  const source = read("assets/js/29-accounting.js");
  assert.match(source, /collection\("journalEntries"\)/);
  assert.match(source, /Monthly accounting close/);
  assert.match(source, /Profit and loss/);
  assert.match(source, /Balance sheet/);
  assert.match(source, /Cash flow and receivables/);
  assert.match(source, /Bank reconciliations/);
  assert.match(source, /Accounting_Close_/);
});

test("opening balance import is controlled, balanced and server posted", () => {
  const html = read("index.html");
  const source = read("assets/js/29-accounting.js");
  assert.match(html, /openingBalancePanel/);
  assert.match(source, /accountingImportOpeningBalance/);
  assert.match(source, /Debits and credits must be equal/);
  assert.match(source, /toUpperCase\(\) !== "IMPORT"/);
  assert.match(source, /permanentCloseEnabled\(\)/);
  assert.match(html, /Preview balances CSV/);
  assert.match(html, /Map to SignShop HQ/);
  assert.match(source, /OpeningBalanceCsv\.importTrialBalanceCsv/);
  assert.match(html, /Nothing is saved automatically/);
});

test("accounting activation stays blocked behind visible readiness controls", () => {
  const source = read("assets/js/29-accounting.js");
  const html = read("index.html");
  assert.match(source, /function accountingMigrationChecks/);
  assert.match(source, /missingPurchases === 0/);
  assert.match(source, /openingBalanceComparisonResult\?\.matched/);
  assert.match(source, /selectedClosedPeriod/);
  assert.match(html, /Accounting go-live readiness/);
  assert.match(html, /still requires explicit approval/);
  assert.match(source, /function exportAccountingMigrationReadinessPdf/);
  assert.match(source, /never authorizes Production automatically/);
  assert.match(html, /accountingMigrationReadinessPdfBtn/);
});

test("accounting settings load cannot create a render microtask loop", () => {
  const source = fs.readFileSync(path.join(root, "assets/js/29-accounting.js"), "utf8");
  assert.match(source, /state\.uid\s*&&\s*!accountingSettingsLoaded\s*&&\s*!accountingSettingsLoading/);
});
