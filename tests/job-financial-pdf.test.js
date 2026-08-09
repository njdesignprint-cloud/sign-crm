const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("each job exposes a bilingual internal financial PDF", () => {
  const pdf = fs.readFileSync(path.join(__dirname, "../assets/js/07-pdf.js"), "utf8");
  const jobs = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const init = fs.readFileSync(path.join(__dirname, "../assets/js/12-init.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.equal(pdf.includes("function exportJobFinancialSummaryPdf(jobId)"), true);
  assert.equal(pdf.includes('pdfText("JOB FINANCIAL SUMMARY", "RESUMEN FINANCIERO DEL TRABAJO")'), true);
  assert.equal(pdf.includes('pdfText("FINAL PROFIT", "GANANCIA FINAL")'), true);
  assert.equal(pdf.includes("calc.workerPayments"), true);
  assert.equal(pdf.includes("calc.paidCommission"), true);
  assert.equal(pdf.includes('savePdf(pdf, `Job_Financial_Summary_'), true);
  assert.equal(jobs.includes("data-job-financial-pdf"), true);
  assert.equal(init.includes("target.dataset.jobFinancialPdf"), true);
  assert.equal(html.includes('id="exportJobFinancialSummaryBtn"'), true);
});
