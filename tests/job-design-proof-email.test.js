const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("design proof approval supports reviewed To and CC recipients", () => {
  const moduleSource = fs.readFileSync(path.join(__dirname, "../assets/js/03-jobs.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");

  assert.match(html, /id="jobDesignProofTo"/);
  assert.match(html, /id="jobDesignProofCc"/);
  assert.match(html, /id="sendJobDesignProofBtn"[^>]*>Enviar para aprobación</);
  assert.match(moduleSource, /httpsCallable\("sendJobDesignProof"\)/);
  assert.match(moduleSource, /fileName:file\.name, to, cc, pdfBase64/);
});
