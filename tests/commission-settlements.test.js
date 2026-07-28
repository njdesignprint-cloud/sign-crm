const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("commission settlements are additive, auditable and included in backups", () => {
  const core = fs.readFileSync(path.join(__dirname, "../assets/js/01-core.js"), "utf8");
  const feature = fs.readFileSync(path.join(__dirname, "../assets/js/22-salespeople.js"), "utf8");
  const backup = fs.readFileSync(path.join(__dirname, "../assets/js/10-backup-misc.js"), "utf8");
  const pdf = fs.readFileSync(path.join(__dirname, "../assets/js/07-pdf.js"), "utf8");

  assert.equal(core.includes('collection("commissionSettlements")'), true);
  assert.equal(feature.includes('status: "void"'), true);
  assert.equal(feature.includes("commissionSettlementsRef().doc(id).delete"), false);
  assert.equal(feature.includes("previouslyPaid"), true);
  assert.equal(backup.includes("commissionSettlements"), true);
  assert.equal(pdf.includes("commissionSettlements: state.commissionSettlements"), true);
});
