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
    jobs.includes('$("mProfit").textContent = money(periodSales - periodInternalCosts - periodExpenses);'),
    true
  );
  assert.equal(
    jobs.includes('$("mProfit").textContent = money(periodSales - periodExpenses);'),
    false
  );
  assert.equal(html.includes('assets/js/03-jobs.js?v=20260730-14'), true);
  assert.equal(reports.includes("const netProfit = sales - internalCosts - expenses.reduce"), true);
  assert.equal(reports.includes("computeJob(job).profit, 0) - expenses.reduce"), false);
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
