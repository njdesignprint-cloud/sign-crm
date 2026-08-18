const test = require("node:test");
const assert = require("node:assert/strict");
const Bank = require("../assets/js/00-bank-reconciliation-core.js");

test("imports common bank CSV columns and ignores duplicates", () => {
  const csv = 'Date,Description,Amount\n08/01/2026,"Customer, Inc",350.00\n08/02/2026,Vinyl,$-60.00\n08/02/2026,Vinyl,$-60.00';
  const result = Bank.importStatementCsv(csv, "operating-bank");
  assert.equal(result.transactions.length, 2);
  assert.equal(result.duplicates, 1);
  assert.equal(result.transactions[0].date, "2026-08-01");
  assert.equal(result.transactions[1].amount, -60);
});

test("supports separate debit and credit columns", () => {
  const result = Bank.importStatementCsv('Posting Date,Description,Debit,Credit\n2026-08-01,Material,25.50,\n2026-08-02,Deposit,,100', "bank");
  assert.deepEqual(result.transactions.map(item => item.amount), [-25.5, 100]);
});

test("matches a unique cash movement within three days", () => {
  const entries = [{ id:"payment:1", date:"2026-08-02", description:"Customer payment", sourceType:"payment", lines:[{ accountCode:"1000", debit:350, credit:0 },{ accountCode:"1100", debit:0, credit:350 }] }];
  const matches = Bank.matchTransactions([{ id:"bank-1", accountId:"bank", date:"2026-08-01", description:"Deposit", amount:350 }], entries);
  assert.equal(matches[0].matchStatus, "matched");
  assert.equal(matches[0].match.entryId, "payment:1");
});

test("marks equally good candidates as ambiguous", () => {
  const entries = ["a","b"].map(id => ({ id, date:"2026-08-01", description:id, sourceType:"payment", lines:[{ accountCode:"1000", debit:100, credit:0 }] }));
  const matches = Bank.matchTransactions([{ id:"bank-1", accountId:"bank", date:"2026-08-01", description:"Deposit", amount:100 }], entries);
  assert.equal(matches[0].matchStatus, "ambiguous");
});
