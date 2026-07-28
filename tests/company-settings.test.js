const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("company settings use one additive workspace document and are backed up", () => {
  const core = fs.readFileSync(path.join(__dirname, "../assets/js/01-core.js"), "utf8");
  const settings = fs.readFileSync(path.join(__dirname, "../assets/js/23-company-settings.js"), "utf8");
  const backup = fs.readFileSync(path.join(__dirname, "../assets/js/10-backup-misc.js"), "utf8");
  const exportSource = fs.readFileSync(path.join(__dirname, "../assets/js/07-pdf.js"), "utf8");

  assert.equal(core.includes('collection("settings").doc("company")'), true);
  assert.equal(settings.includes("companySettingsRef().set"), true);
  assert.equal(settings.includes("{ merge: true }"), true);
  assert.equal(settings.includes("clientsRef()."), false);
  assert.equal(settings.includes("jobsRef()."), false);
  assert.equal(backup.includes("companySettingsRef().set"), true);
  assert.equal(exportSource.includes("companySettings: state.companySettings"), true);
});
