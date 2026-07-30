const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = file => fs.readFileSync(path.join(__dirname, file), "utf8");
const core = read("../assets/js/01-core.js");
const init = read("../assets/js/12-init.js");

test("critical modal drafts warn before being discarded", () => {
  for (const id of ["clientModal", "jobModal", "paymentModal", "expenseModal"]) assert.match(core, new RegExp(`"${id}"`));
  assert.match(core, /function serializeModalDraft\(id\)/);
  assert.match(core, /function isModalDraftDirty\(id\)/);
  assert.match(core, /window\.confirm\(discardDraftMessage\(\)\)/);
  assert.match(init, /confirmDiscardAllModalDrafts\(\)/);
  assert.match(init, /window\.addEventListener\("beforeunload"/);
});

test("successful critical saves clear draft warnings before closing", () => {
  const expectations = [
    ["../assets/js/02-clients.js", "clientModal"],
    ["../assets/js/03-jobs.js", "jobModal"],
    ["../assets/js/04-expenses.js", "expenseModal"],
    ["../assets/js/04-expenses.js", "paymentModal"]
  ];
  for (const [file, id] of expectations) {
    const source = read(file);
    assert.match(source, new RegExp(`markModalSaved\\("${id}"\\)`));
    assert.match(source, new RegExp(`closeModal\\("${id}", true\\)`));
  }
});
