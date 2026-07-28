const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("job commission columns, filters and PDF details are admin-only", () => {
  const jobs = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const pdf = fs.readFileSync(path.join(__dirname, "../assets/js/07-pdf.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.equal(jobs.includes('const showCommission = isAdmin()'), true);
  assert.equal(jobs.includes('commissionFilter === "outstanding"'), true);
  assert.equal(jobs.includes('commissionFilter === "zero_rate"'), true);
  assert.equal(jobs.includes('commissionFilter === "missing_assignment"'), true);
  assert.equal(pdf.includes('isAdmin() && typeof getJobCommissionBreakdown'), true);
  assert.equal(html.includes('id="jobCommissionHeader" class="hidden"'), true);
  assert.equal(html.includes('id="jobSalespersonFilter" class="select hidden"'), true);
});
