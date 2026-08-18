const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Firestore has a deny-by-default fallback and protects financial imports",()=>{
  const rules=read("firestore.rules.proposed");
  assert.match(rules,/match \/\{document=\*\*\} \{ allow read,write: if false; \}/);
  for(const collection of ["plaidItems","plaidAccounts","plaidTransactions","journalEntries","bankTransactions"]){
    assert.match(rules,new RegExp(`match /${collection}/\\{id\\} \\{ allow read: if admin\\(ownerUid\\); allow write: if false; \\}`));
  }
});

test("production hosting sends browser security headers",()=>{
  const config=JSON.parse(read("firebase.json"));
  const headers=config.hosting.headers.flatMap(rule=>rule.headers||[]);
  const values=Object.fromEntries(headers.map(header=>[header.key,header.value]));
  assert.match(values["Content-Security-Policy"],/frame-ancestors 'none'/);
  assert.equal(values["X-Content-Type-Options"],"nosniff");
  assert.equal(values["X-Frame-Options"],"DENY");
  assert.match(values["Strict-Transport-Security"],/max-age=31536000/);
});

test("public invoice rendering escapes customer-controlled descriptions",()=>{
  const source=read("frontend/16-invoice-payment-public.js");
  assert.match(source,/safe\(line\.description\)/);
  assert.doesNotMatch(source,/\$\{line\.description\}/);
});

test("temporary generated artifacts are excluded from Git",()=>{
  assert.match(read(".gitignore"),/^tmp\/$/m);
});
