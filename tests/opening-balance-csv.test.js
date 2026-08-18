const test = require("node:test");
const assert = require("node:assert/strict");
global.BankReconciliationCore = require("../assets/js/00-bank-reconciliation-core.js");
const OpeningCsv = require("../assets/js/00-opening-balance-csv.js");

test("imports a QuickBooks trial balance and groups balance-sheet accounts", () => {
  const csv = 'Trial Balance\nAs of June 30, 2026\nAccount,Debit,Credit\nChecking,$700.00,\nAccounts Receivable,$300.00,\nAccounts Payable,,$200.00\nOpening Balance Equity,,$800.00\nTOTAL,$1,000.00,$1,000.00';
  const result = OpeningCsv.importTrialBalanceCsv(csv);
  assert.equal(result.balanced, true);
  assert.deepEqual(result.lines.map(item => [item.accountCode, item.debit, item.credit]), [["1000",700,0],["1100",300,0],["2000",0,200],["3000",0,800]]);
});

test("blocks automatic readiness when a nonzero account is unmapped", () => {
  const csv = 'Account,Debit,Credit\nChecking,100,\nMystery liability,,100';
  const result = OpeningCsv.importTrialBalanceCsv(csv);
  assert.equal(result.balanced, false);
  assert.equal(result.unmapped[0].accountName, "Mystery liability");
});

test("manually maps an unknown QuickBooks account and restores readiness", () => {
  const csv = 'Account,Debit,Credit\nChecking,100,\nMystery liability,,100';
  const initial = OpeningCsv.importTrialBalanceCsv(csv);
  const result = OpeningCsv.importTrialBalanceCsv(csv, { [initial.unmapped[0].row]:"2000" });
  assert.equal(result.balanced, true);
  assert.deepEqual(result.lines.map(item => [item.accountCode, item.debit, item.credit]), [["1000",100,0],["2000",0,100]]);
});

test("uses the selected account side for an unknown balance-column row", () => {
  const csv = 'Account,Balance\nSpecial reserve account,100\nOpening Balance Equity,100';
  const initial = OpeningCsv.importTrialBalanceCsv(csv);
  const result = OpeningCsv.importTrialBalanceCsv(csv, { [initial.unmapped[0].row]:"1000" });
  assert.equal(result.balanced, true);
  assert.deepEqual(result.lines.map(item => [item.accountCode, item.debit, item.credit]), [["1000",100,0],["3000",0,100]]);
});

test("creates a stable normalized key for remembered QuickBooks mappings", () => {
  assert.equal(OpeningCsv.mappingKeyFor("  Owner’s   Special-Reserve  "), "owners special reserve");
});

test("supports one balance column and normal account sides", () => {
  const result = OpeningCsv.importTrialBalanceCsv('Cuenta,Saldo\nBanco,500\nCuentas por pagar,200\nPatrimonio,300');
  assert.equal(result.balanced, true);
  assert.deepEqual(result.lines.map(item => [item.accountCode, item.debit, item.credit]), [["1000",500,0],["2000",0,200],["3000",0,300]]);
});

test("compares QuickBooks balance-sheet lines with SignShop HQ at cutover", () => {
  const result = OpeningCsv.compareBalanceSheet(
    [{ accountCode:"1000", debit:500, credit:0 }, { accountCode:"2000", debit:0, credit:200 }],
    [{ code:"1000", balance:500 }, { code:"2000", balance:190 }]
  );
  assert.equal(result.matched, false);
  assert.equal(result.differenceCount, 1);
  assert.deepEqual(result.rows.map(item => [item.accountCode, item.difference, item.matched]), [["1000",0,true],["2000",-10,false]]);
});
