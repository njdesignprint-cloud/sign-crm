const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

test("production and development Firebase configurations cannot be confused",()=>{
  const root=path.join(__dirname,"../..");
  const production=fs.readFileSync(path.join(root,"frontend/runtime-config.js"),"utf8");
  const development=fs.readFileSync(path.join(root,"environments/development/runtime-config.js"),"utf8");
  const core=fs.readFileSync(path.join(root,"frontend/assets/js/01-core.js"),"utf8");
  assert.match(production,/environment:\s*"production"/);
  assert.match(production,/projectId:\s*"sign-crm-a7bda"/);
  assert.doesNotMatch(production,/signshophq-dev/);
  assert.match(development,/environment:\s*"development"/);
  assert.match(development,/projectId:\s*"signshophq-dev"/);
  assert.doesNotMatch(development,/sign-crm-a7bda/);
  assert.match(core,/Firebase project does not match the selected application environment/);
});
