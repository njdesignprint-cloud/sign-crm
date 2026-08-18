const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'..'),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),client=fs.readFileSync(path.join(root,'assets/js/33-bank-feed.js'),'utf8'),server=fs.readFileSync(path.join(root,'../functions/src/plaid.ts'),'utf8'),rules=fs.readFileSync(path.join(root,'../firestore.rules.proposed'),'utf8');

test('bank center exposes the guarded QuickBooks-style review workflow',()=>{
  assert.match(html,/id="view-banco"/);assert.match(html,/Pendientes/);assert.match(html,/Categorizados/);assert.match(html,/Emparejados/);assert.match(html,/Excluidos/);
  for(const action of ['categorize','match','exclude','undo'])assert.match(client,new RegExp(`['"]${action}['"]`));
});
test('bank reviews and rules can only be written by server callables',()=>{
  assert.match(server,/export const plaidReviewTransaction = onCall/);assert.match(server,/export const plaidManageRule = onCall/);
  assert.match(rules,/match \/plaidTransactions\/\{id\} \{ allow read: if admin\(ownerUid\); allow write: if false; \}/);
  assert.match(rules,/match \/plaidRules\/\{id\} \{ allow read: if admin\(ownerUid\); allow write: if false; \}/);
  assert.doesNotMatch(client,/\.collection\([^)]+plaidTransactions[^)]*\)\.(add|set|update)/);
});
test('rules remain suggestions and matching verifies amounts',()=>{
  assert.match(html,/nunca registran automáticamente/);assert.match(server,/targetAmounts\.some/);assert.match(server,/autoConfirm:false/);
});
test('sync never fails silently when no Plaid item exists',()=>{
  assert.match(client,/Conectar banco primero/);assert.match(client,/setView\('configuracion'\)/);assert.match(client,/\$\('plaidSyncBtn'\)\?\.click\(\)/);
});
