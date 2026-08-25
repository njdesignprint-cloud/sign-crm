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
  assert.match(values["Content-Security-Policy"],/script-src[^;]+https:\/\/www\.google\.com[^;]+https:\/\/www\.recaptcha\.net/);
  assert.match(values["Content-Security-Policy"],/script-src-elem 'self'/);
  assert.doesNotMatch(values["Content-Security-Policy"],/script-src 'self' 'unsafe-inline'/);
  assert.equal(values["X-Content-Type-Options"],"nosniff");
  assert.equal(values["X-Frame-Options"],"DENY");
  assert.match(values["Strict-Transport-Security"],/max-age=31536000/);
  const htmlCache=config.hosting.headers.find(rule=>rule.source==="**/*.html");
  assert.match(htmlCache.headers[0].value,/no-store/);
  const rootCache=config.hosting.headers.find(rule=>rule.source==="/");
  assert.match(rootCache.headers[0].value,/no-store/);
});

test("legal pages do not require inline script blocks",()=>{
  for(const page of ["privacy.html","terms.html"]){
    const html=read(`frontend/${page}`);
    assert.match(html,/script src="legal-language\.js"/);
    assert.doesNotMatch(html,/<script>/);
  }
});

test("authentication avoids account enumeration and restricts registration to invitations",()=>{
  const auth=read("frontend/assets/js/11-auth.js");
  assert.match(auth,/No pudimos iniciar sesión/);
  assert.doesNotMatch(auth,/Ese usuario no existe/);
  assert.doesNotMatch(auth,/La contraseña es incorrecta/);
  assert.match(auth,/password\.length < 10/);
  assert.match(auth,/!isSuper && !isInvited/);
  assert.match(auth,/await user\.delete\(\)/);
  assert.match(auth,/Si el correo pertenece a una cuenta/);
});

test("owners can enroll in SMS MFA and complete an MFA sign-in challenge",()=>{
  const html=read("frontend/index.html");
  const auth=read("frontend/assets/js/11-auth.js");
  const mfa=read("frontend/assets/js/34-mfa.js");
  assert.match(html,/id="mfaPhoneNumber"/);
  assert.match(html,/id="mfaVerifyEmailBtn"/);
  assert.match(html,/id="authMfaModal"/);
  assert.match(html,/id="authMfaModal" class="modal-backdrop"/);
  assert.match(html,/class="modal auth-mfa-dialog"/);
  assert.match(auth,/auth\/multi-factor-auth-required/);
  assert.match(mfa,/user\.multiFactor/);
  assert.match(mfa,/multiFactorUser\(user\)\.getSession\(\)/);
  assert.match(mfa,/PhoneMultiFactorGenerator\.assertion/);
  assert.match(mfa,/resolveSignIn\(assertion\)/);
  assert.match(mfa,/sendEmailVerification/);
  assert.doesNotMatch(mfa,/sendEmailVerification\(\{\s*url:/);
  assert.match(mfa,/auth\/unverified-email/);
});

test("public invoice rendering escapes customer-controlled descriptions",()=>{
  const source=read("frontend/16-invoice-payment-public.js");
  assert.match(source,/safe\(line\.description\)/);
  assert.doesNotMatch(source,/\$\{line\.description\}/);
});

test("temporary generated artifacts are excluded from Git",()=>{
  assert.match(read(".gitignore"),/^tmp\/$/m);
});

test("App Check is initialized on authenticated and public Firebase pages",()=>{
  const runtime=read("frontend/runtime-config.js");
  const helper=read("frontend/app-check.js");
  assert.match(runtime,/recaptchaEnterpriseSiteKey/);
  assert.match(helper,/ReCaptchaEnterpriseProvider/);
  assert.match(helper,/\.activate\([^,]+,true\)/);
  for(const page of ["index.html","invoice-payment-public.html","client-approval-public.html","estimate-review-public.html","invoice-view-public.html","design-proof-public.html"]){
    const html=read(`frontend/${page}`);
    assert.match(html,/firebase-app-check-compat\.js/);
    assert.match(html,/app-check\.js/);
  }
  for(const script of ["assets/js/01-core.js","16-invoice-payment-public.js","15-client-approval-public.js","estimate-review-public.js","invoice-view-public.js","design-proof-public.js"]){
    assert.match(read(`frontend/${script}`),/initializeSignShopAppCheck/);
  }
});
