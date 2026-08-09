const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("closing a job requires payment, invoice coverage and settled commission", () => {
  const jobs = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const init = fs.readFileSync(path.join(__dirname, "../assets/js/12-init.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.equal(jobs.includes("function getJobCloseReview(job = {})"), true);
  assert.equal(jobs.includes('blockers.push("balance")'), true);
  assert.equal(jobs.includes('blockers.push("invoice")'), true);
  assert.equal(jobs.includes('blockers.push("invoice_coverage")'), true);
  assert.equal(jobs.includes('blockers.push("commission")'), true);
  assert.equal(jobs.includes('status:"Pagado"'), true);
  assert.equal(jobs.includes("closedAt:firebase.firestore.FieldValue.serverTimestamp()"), true);
  assert.equal(jobs.includes("data-close-job-review"), true);
  assert.equal(init.includes("target.dataset.closeJobReview"), true);
  assert.equal(html.includes('id="jobCloseModal"'), true);
  assert.equal(html.includes('id="confirmJobCloseBtn"'), true);
});
