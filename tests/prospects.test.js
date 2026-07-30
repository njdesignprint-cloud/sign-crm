const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("prospects are a client-connected secured module", () => {
  const core = read("assets/js/01-core.js");
  const auth = read("assets/js/11-auth.js");
  const rules = fs.readFileSync(path.join(__dirname, "../../firestore.rules.proposed"), "utf8");
  assert.match(core, /function prospectsRef\(\)/);
  assert.match(core, /module === "prospectos".*"clientes"/s);
  assert.match(auth, /prospectsRef\(\).*onSnapshot/s);
  assert.match(rules, /match \/prospects\/\{id\}.*moduleClientes/s);
});

test("prospects support outreach, follow-up, maps and safe client conversion", () => {
  const module = read("assets/js/02-prospects.js");
  assert.match(module, /openProspectWhatsapp/);
  assert.match(module, /openProspectEmail/);
  assert.match(module, /openProspectMaps/);
  assert.match(module, /saveProspectFollowup/);
  assert.match(module, /findDuplicateClient/);
  assert.match(module, /findDuplicateProspect/);
  assert.match(module, /prospectMessageWithPortfolio/);
  assert.match(module, /https:\/\/njdesignprintllc\.com\//);
  assert.match(module, /Already a client/);
  assert.match(module, /whatsappStatus/);
  assert.match(module, /batch\.set\(clientDoc/);
  assert.match(module, /batch\.update\(prospectsRef/);
  assert.match(module, /convertedClientId/);
});

test("prospects are included in JSON backup and restore", () => {
  const pdf = read("assets/js/07-pdf.js");
  const backup = read("assets/js/10-backup-misc.js");
  assert.match(pdf, /prospects: state\.prospects/);
  assert.match(backup, /data\.prospects/);
  assert.match(backup, /await prospectsRef\(\)\.add/);
});
