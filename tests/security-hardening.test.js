const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"../..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

test("Firestore has a deny-by-default fallback and protects financial imports",()=>{
  const rules=read("firestore.rules.proposed");
  assert.match(rules,/match \/\{document=\*\*\} \{ allow read,write: if false; \}/);
  for(const collection of ["plaidItems","plaidAccounts","plaidTransactions"]){
    assert.match(rules,new RegExp(`match /${collection}/\\{id\\} \\{ allow read: if signedIn\\(\\) && request\\.auth\\.uid == ownerUid; allow write: if false; \\}`));
  }
  for(const collection of ["journalEntries","bankTransactions"]){
    assert.match(rules,new RegExp(`match /${collection}/\\{id\\} \\{ allow read: if admin\\(ownerUid\\); allow write: if false; \\}`));
  }
});

test("Plaid data is subscribed only for the workspace owner",()=>{
  const auth=read("frontend/assets/js/11-auth.js");
  assert.match(auth,/if \(isOwner\(\)\) \{[\s\S]*collection\("plaidAccounts"\)[\s\S]*collection\("plaidItems"\)[\s\S]*collection\("plaidTransactions"\)/);
  assert.match(auth,/else \{\s*state\.plaidAccounts = \[\];\s*state\.plaidItems = \[\];\s*state\.plaidTransactions = \[\];/);
});

test("the bank summary belongs to the dashboard, not prospects",()=>{
  const html=read("frontend/index.html");
  const dashboard=html.slice(html.indexOf('<section id="view-dashboard"'),html.indexOf('<section id="view-clientes"'));
  const prospects=html.slice(html.indexOf('<section id="view-prospectos"'),html.indexOf('<section id="view-vendedores"'));
  assert.match(dashboard,/id="dashboardBankCard"/);
  assert.doesNotMatch(prospects,/id="dashboardBankCard"/);
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
