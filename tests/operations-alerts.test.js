const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("alert center covers every actionable job filter", () => {
  const source = fs.readFileSync(path.join(__dirname, "../assets/js/20-operations-alerts.js"), "utf8");
  const filters = ["overdue", "unassigned", "blocked", "waiting_client", "install_week", "balance", "production"];

  filters.forEach(filter => assert.match(source, new RegExp(`\\b${filter}:`)));
  assert.equal(source.includes('setView("trabajos")'), true);
  assert.equal(source.includes("setJobsQuickFilter(filter)"), true);
  assert.equal(source.includes("jobsRef("), false);
  assert.equal(source.includes(".update("), false);
  assert.equal(source.includes(".add("), false);
});
