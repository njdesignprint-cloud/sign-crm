const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { prepareJobPayload } = require("../assets/js/00-job-save-utils.js");

test("editing preserves sensitive form sections and existing collections", () => {
  const basePayload = {
    title: "Letrero principal",
    clientApproval: { estimateStatus: "aprobado", token: "safe-token" },
    advance: { received: 500, ledger: [{ amount: 120 }] },
    workflow: { assignments: { production: "Ana" } },
    internalNotesLog: [{ text: "Mantener esta nota" }]
  };
  const existingJob = {
    payments: [{ id: "payment-1", amount: 500 }],
    designImages: [{ publicId: "image-1" }],
    activityLog: [{ text: "Creado" }],
    paid: 0
  };

  const result = prepareJobPayload(basePayload, {
    existingJob,
    activityLogBase: existingJob.activityLog,
    logEntry: { text: "Trabajo actualizado" }
  });

  assert.deepEqual(result.clientApproval, basePayload.clientApproval);
  assert.deepEqual(result.advance, basePayload.advance);
  assert.deepEqual(result.workflow, basePayload.workflow);
  assert.deepEqual(result.internalNotesLog, basePayload.internalNotesLog);
  assert.deepEqual(result.payments, existingJob.payments);
  assert.deepEqual(result.designImages, existingJob.designImages);
  assert.deepEqual(result.activityLog, [{ text: "Creado" }, { text: "Trabajo actualizado" }]);
  assert.equal(result.paid, 0);
  assert.notStrictEqual(result.payments, existingJob.payments);
  assert.notStrictEqual(result.designImages, existingJob.designImages);
  assert.equal(Object.hasOwn(result, "createdAt"), false);
});

test("creating starts clean collections and carries pending images", () => {
  const pendingImages = [{ publicId: "pending-1" }];
  const createdAt = { serverTimestamp: true };
  const result = prepareJobPayload({ title: "Trabajo nuevo" }, {
    isNew: true,
    existingJob: { payments: [{ id: "old" }], designImages: [{ publicId: "old" }] },
    pendingImages,
    logEntry: { text: "Trabajo creado" },
    createdAt
  });

  assert.deepEqual(result.payments, []);
  assert.deepEqual(result.designImages, pendingImages);
  assert.notStrictEqual(result.designImages, pendingImages);
  assert.deepEqual(result.activityLog, [{ text: "Trabajo creado" }]);
  assert.equal(result.createdAt, createdAt);
});

test("advance module no longer replaces saveJob", () => {
  const jobsSource = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const advanceSource = fs.readFileSync(path.join(__dirname, "../assets/js/16-advance-control.js"), "utf8");
  const htmlSource = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.equal((jobsSource.match(/async function saveJob\s*\(/g) || []).length, 1);
  assert.equal((jobsSource.match(/function buildJobPayload\s*\(/g) || []).length, 1);
  assert.equal(jobsSource.includes("clientApproval: getCurrentClientApprovalForm()"), true);
  assert.equal(jobsSource.includes("advance: typeof getCurrentAdvanceForm"), true);
  assert.equal(jobsSource.includes("workflow: typeof getCurrentJobWorkflow"), true);
  assert.equal(/\bsaveJob\s*=(?!=)/.test(advanceSource), false);
  assert.equal(advanceSource.includes("window.getCurrentAdvanceForm = getCurrentAdvanceForm"), true);
  assert.ok(htmlSource.indexOf("00-job-save-utils.js") < htmlSource.indexOf("03-jobs.js"));
});
