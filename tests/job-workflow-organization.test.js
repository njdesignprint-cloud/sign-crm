const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("new job workflow keeps the first step focused in English and Spanish", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "../assets/js/19-job-workflow.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.equal(workflow.includes('{ key: "resumen", label: "1 · Información" }'), true);
  assert.equal(workflow.includes('panels.get("operacion").appendChild(buildAssignmentBox())'), true);
  assert.equal(workflow.includes("recorded payments"), true);
  assert.equal(workflow.includes("job designs \\/ photos"), true);
  assert.equal(workflow.includes("quick job estimator"), true);
  assert.equal(workflow.includes('className = "job-advanced-pricing"'), true);
  assert.equal(workflow.includes('panel.querySelector("#jobPricingBox")'), true);
  assert.equal(workflow.includes('panel.querySelector("#jobEstimatorBox")'), true);
  assert.equal(workflow.includes("Customer price"), true);
  assert.equal(workflow.includes("Collected / balance"), true);
  assert.equal(workflow.includes('data-job-quick-tab="cotizacion"'), true);
  assert.equal(workflow.includes('data-job-quick-payment'), true);
  assert.equal(workflow.includes('el("openPaymentFromJobBtn")?.click()'), true);
  assert.equal(workflow.includes("localizeNextAction(next)"), true);
  assert.equal(html.includes('<option value="Aprobado">Aprobado</option>'), true);
  assert.equal(html.includes('<option value="Media" selected>Media</option>'), true);
  assert.equal(html.includes('class="box job-basics-box"'), true);
  assert.equal(html.includes('id="jobQuoteBox"'), true);
  assert.equal(html.includes('id="jobApprovalBox"'), true);
  assert.equal(html.includes('id="jobPricingBox"'), true);
  assert.equal(html.includes('id="jobEstimatorBox"'), true);
  assert.equal(html.includes('id="jobTitle"'), true);
  assert.equal(html.includes('id="jobSale"'), true);
});
