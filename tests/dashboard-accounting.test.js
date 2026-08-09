const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("dashboard net profit subtracts job internal costs and period expenses", () => {
  const jobs = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const reports = fs.readFileSync(path.join(__dirname, "../assets/js/06-installation-reports.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.equal(
    jobs.includes("const periodInternalCosts = confirmedJobs"),
    true
  );
  assert.equal(
    jobs.includes('$("mProfit").textContent = money(periodSales - periodInternalCosts - periodExpenses - periodCommissions);'),
    true
  );
  assert.equal(
    jobs.includes('$("mProfit").textContent = money(periodSales - periodExpenses);'),
    false
  );
  assert.equal(html.includes('assets/js/03-jobs.js?v=20260809-2'), true);
  assert.equal(reports.includes("const netProfit = sales - internalCosts - expenses.reduce"), true);
  assert.equal(reports.includes("computeJob(job).profit, 0) - expenses.reduce"), false);
});

test("paid sales commissions reduce real job profit and cash reports without changing collections", () => {
  const jobs = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const salespeople = fs.readFileSync(path.join(__dirname, "../assets/js/22-salespeople.js"), "utf8");
  const weekly = fs.readFileSync(path.join(__dirname, "../assets/js/15-weekly-settlements.js"), "utf8");

  assert.equal(jobs.includes("function getJobPaidCommissionTotal"), true);
  assert.equal(jobs.includes("pricingCalc.totalCost + linkedExpenses + paidCommission"), true);
  assert.equal(jobs.includes("profitBeforeCommission"), true);
  assert.equal(salespeople.includes("computeJob(job).profitBeforeCommission"), true);
  assert.equal(weekly.includes('type: "Comisión"'), true);
  assert.equal(jobs.includes("periodExpenses + periodCommissions"), true);
});

test("each job exposes an owner-focused financial breakdown", () => {
  const jobs = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  for (const id of ["sumSale", "sumPaid", "sumBalance", "sumOtherLinkedExpenses", "sumWorkerPayments", "sumPaidCommission", "sumProfit"]) {
    assert.equal(html.includes(`id="${id}"`), true);
  }
  assert.equal(jobs.includes("function getJobLinkedExpenseBreakdown"), true);
  assert.equal(jobs.includes('expense.recordType === "worker_payment"'), true);
  assert.equal(jobs.includes("realProfit: profitBeforeCommission"), true);
});

test("estimates stay potential until the job becomes an approved sale", () => {
  const jobs = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const reports = fs.readFileSync(path.join(__dirname, "../assets/js/06-installation-reports.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.equal(jobs.includes('function isEstimateJob(job = {})'), true);
  assert.equal(jobs.includes('function isConfirmedSaleJob(job = {})'), true);
  assert.equal(jobs.includes('const confirmedJobs = filteredJobs.filter(job => isConfirmedSaleJob(job));'), true);
  assert.equal(jobs.includes('const estimateJobs = filteredJobs.filter(job => isEstimateJob(job));'), true);
  assert.equal(jobs.includes('getPendingPaymentJobs().filter(job => isConfirmedSaleJob(job)).length'), true);
  assert.equal(reports.includes('const confirmedJobs = jobs.filter(job => isConfirmedSaleJob(job));'), true);
  assert.equal(reports.includes('const estimateJobs = jobs.filter(job => isEstimateJob(job));'), true);
  assert.equal(html.includes('id="mPotentialSales"'), true);
  assert.equal(html.includes('id="reportPotentialSalesTotal"'), true);
});
