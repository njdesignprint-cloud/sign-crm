const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const core = fs.readFileSync(path.join(root, "assets/js/01-core.js"), "utf8");
const audit = fs.readFileSync(path.join(root, "assets/js/26-audit-log.js"), "utf8");
const rules = fs.readFileSync(path.resolve(root, "../firestore.rules.proposed"), "utf8");

test("audit log is admin-only, immutable and paginated", () => {
  assert.match(html, /data-view="auditoria"/);
  assert.match(html, /id="view-auditoria"/);
  assert.match(core, /module === "auditoria"\) return isAdmin\(\)/);
  assert.match(audit, /orderBy\("occurredAt", "desc"\)\.limit\(PAGE_SIZE \+ 1\)/);
  assert.match(audit, /startAfter\(cursor\)/);
  assert.doesNotMatch(audit, /collection\("events"\)\.(add|doc)\(/);
  assert.match(rules, /match \/workspaceAudit\/\{ownerUid\}\/events\/\{eventId\}/);
  assert.match(rules, /allow write: if false/);
});
