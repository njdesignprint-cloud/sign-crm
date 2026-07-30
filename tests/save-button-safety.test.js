const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const core = fs.readFileSync(path.join(__dirname, "../assets/js/01-core.js"), "utf8");
const init = fs.readFileSync(path.join(__dirname, "../assets/js/12-init.js"), "utf8");

test("critical saves use one reusable busy-state guard", () => {
  assert.match(core, /async function withSaveButton\(buttonId, pendingLabel, action\)/);
  assert.match(core, /button\.dataset\.saveBusy === "true"/);
  assert.match(core, /button\.disabled = true/);
  assert.match(core, /finally \{/);
  for (const id of ["saveClientBtn", "saveJobBtn", "saveExpenseBtn", "savePaymentBtn"]) {
    assert.match(init, new RegExp(`withSaveButton\\("${id}"`));
  }
});

test("permission rendering cannot re-enable a save while it is busy", () => {
  assert.match(core, /el\.disabled = el\.dataset\.saveBusy === "true" \|\| !canEditModule\(module\)/);
});
