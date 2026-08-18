const test = require("node:test");
const assert = require("node:assert/strict");
const AccountingCore = require("../assets/js/00-accounting-core.js");

test("every generated accounting entry balances", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    salesDocuments:[{ id:"inv-1", type:"invoice", status:"sent", issueDate:"2026-08-01", number:"INV-1", total:108.25, tax:8.25, jobId:"job-1" }],
    jobs:[{ id:"job-1", title:"Sign", status:"Pagado", payments:[{ id:"pay-1", date:"2026-08-02", amount:108.25 }] }],
    expenses:[{ id:"exp-1", date:"2026-08-03", concept:"Vinyl", amount:25 }],
    commissionSettlements:[{ id:"com-1", paymentDate:"2026-08-04", salespersonName:"Seller", total:10, status:"paid" }]
  });
  assert.equal(entries.length, 4);
  entries.forEach(entry => assert.equal(entry.debit, entry.credit));
  const summary = AccountingCore.summarize(entries);
  assert.equal(summary.cash, 73.25);
  assert.equal(summary.receivable, 0);
  assert.equal(summary.salesTaxPayable, 8.25);
  assert.equal(summary.netIncome, 65);
});

test("void commissions and void invoices never enter the ledger", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    salesDocuments:[{ id:"void-invoice", type:"invoice", status:"void", issueDate:"2026-08-01", total:100 }],
    commissionSettlements:[{ id:"void-commission", paymentDate:"2026-08-01", total:20, status:"void" }]
  });
  assert.deepEqual(entries, []);
});

test("refunds reverse cash and restore accounts receivable", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    jobs:[{ id:"job-1", title:"Sign", status:"Cancelado", payments:[{ id:"refund-1", date:"2026-08-02", amount:40, type:"refund" }] }]
  });
  assert.equal(AccountingCore.summarize(entries).cash, -40);
  assert.equal(AccountingCore.summarize(entries).receivable, 40);
});

test("createEntry rejects an unbalanced journal entry", () => {
  assert.throws(() => AccountingCore.createEntry({
    id:"bad", date:"2026-08-01", description:"Bad", lines:[
      { accountCode:"1000", debit:10 }, { accountCode:"4000", credit:9 }
    ]
  }), /Unbalanced/);
});

test("financial statements stay balanced and expose cash flow", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    salesDocuments:[{ id:"inv-1", type:"invoice", status:"sent", issueDate:"2026-08-01", total:1000, tax:0, jobId:"job-1" }],
    jobs:[{ id:"job-1", title:"Test sign", payments:[{ id:"pay-1", date:"2026-08-02", amount:600 }] }],
    expenses:[{ id:"exp-1", date:"2026-08-03", amount:100, concept:"Material" }]
  });
  const profit = AccountingCore.profitAndLoss(entries);
  const balance = AccountingCore.balanceSheet(entries);
  const cash = AccountingCore.cashFlow(entries);
  assert.equal(profit.netIncome, 900);
  assert.equal(balance.totalAssets, 900);
  assert.equal(balance.difference, 0);
  assert.equal(cash.inflows, 600);
  assert.equal(cash.outflows, 100);
  assert.equal(cash.netCashFlow, 500);
});

test("accounts receivable aging uses invoice due dates and linked payments", () => {
  const report = AccountingCore.accountsReceivableAging({
    salesDocuments:[{ id:"inv-1", number:"INV-1", type:"invoice", status:"sent", issueDate:"2026-06-01", dueDate:"2026-06-30", total:1000, jobId:"job-1", clientSnapshot:{ company:"Example Client" } }],
    jobs:[{ id:"job-1", payments:[{ date:"2026-07-01", amount:250 }] }]
  }, "2026-08-14");
  assert.equal(report.rows[0].balance, 750);
  assert.equal(report.rows[0].bucket, "31_60");
  assert.equal(report.totals.total, 750);
});

test("supplier bills create accounts payable and split inventory from operating expense", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    purchaseOrders:[{
      id:"po-1", status:"Recibida", billDate:"2026-08-10", total:150, providerName:"Vinyl Supply",
      items:[{ inventoryId:"vinyl", qty:2, unitCost:50, total:100 }, { qty:1, unitCost:50, total:50 }]
    }]
  });
  assert.equal(entries.length, 1);
  const trial = AccountingCore.trialBalance(entries);
  assert.equal(trial.find(item => item.code === "1200").balance, 100);
  assert.equal(trial.find(item => item.code === "6000").balance, 50);
  assert.equal(trial.find(item => item.code === "2000").balance, 150);
  assert.equal(AccountingCore.balanceSheet(entries).difference, 0);
});

test("vendor payments reduce accounts payable and cash while void payments are ignored", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    purchaseOrders:[{
      id:"po-1", status:"Recibida", billDate:"2026-08-10", total:150,
      vendorPayments:[
        { id:"pay-1", date:"2026-08-12", amount:60, method:"ACH" },
        { id:"pay-void", date:"2026-08-12", amount:20, status:"void" }
      ]
    }]
  });
  const trial = AccountingCore.trialBalance(entries);
  assert.equal(entries.length, 2);
  assert.equal(trial.find(item => item.code === "2000").balance, 90);
  assert.equal(trial.find(item => item.code === "1000").balance, -60);
  assert.equal(AccountingCore.balanceSheet(entries).difference, 0);
});

test("draft and cancelled purchase orders never enter the ledger", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    purchaseOrders:[
      { id:"draft", status:"Borrador", date:"2026-08-10", total:100 },
      { id:"cancelled", status:"Cancelada", date:"2026-08-10", total:100 }
    ]
  });
  assert.deepEqual(entries, []);
});

test("deleted invoices in trash do not return as fallback job sales", () => {
  const entries = AccountingCore.buildProvisionalLedger({
    salesDocuments:[],
    trashItems:[{ type:"salesDocuments", payload:{ type:"invoice", jobId:"job-1", total:100 } }],
    jobs:[{ id:"job-1", title:"Test job", status:"En proceso", date:"2026-08-01", salePrice:100 }]
  });
  assert.equal(entries.some(entry => entry.sourceType === "invoice" || entry.sourceType === "job_sale_fallback"), false);
});
