const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("commission settlements are additive, auditable and included in backups", () => {
  const core = fs.readFileSync(path.join(__dirname, "../assets/js/01-core.js"), "utf8");
  const feature = fs.readFileSync(path.join(__dirname, "../assets/js/22-salespeople.js"), "utf8");
  const backup = fs.readFileSync(path.join(__dirname, "../assets/js/10-backup-misc.js"), "utf8");
  const pdf = fs.readFileSync(path.join(__dirname, "../assets/js/07-pdf.js"), "utf8");

  assert.equal(core.includes('collection("commissionSettlements")'), true);
  assert.equal(feature.includes('status: "void"'), true);
  assert.equal(feature.includes("commissionSettlementsRef().doc(id).delete"), false);
  assert.equal(feature.includes("previouslyPaid"), true);
  assert.equal(feature.includes('Object.hasOwn(job, "commission")'), true);
  assert.equal(feature.includes("commissionSettlementDocumentId"), true);
  assert.equal(feature.includes('httpsCallable("sendSalesDocumentEmail")'), true);
  assert.equal(feature.includes('kind:"commission_settlement"'), true);
  assert.equal(feature.includes("buildCommissionSettlementPdf"), true);
  assert.equal(feature.includes("jobDate >= periodFrom"), true);
  assert.match(feature, /calc\.projectedBase.*calc\.rate.*calc\.projected/);
  assert.match(feature, /saleAmount:Number\(job\.sale/);
  assert.match(feature, /eligibleBase:Number\(calc\.projectedBase/);
  assert.match(feature, /commissionInvoiceOrWorkOrder/);
  assert.match(feature, /commissionDisplayNumber/);
  assert.match(feature, /commissionDisplayDate/);
  assert.match(feature, /enableMultiline\(\)/);
  assert.match(feature, /\[line\.clientName,commissionCompactProjectTitle\(line\.jobTitle\)\]/);
  assert.match(feature, /commissionCompactProjectTitle/);
  assert.equal(backup.includes("commissionSettlements"), true);
  assert.equal(pdf.includes("commissionSettlements: state.commissionSettlements"), true);
});

test("commission settlement email is authenticated, idempotent and attaches the branded PDF", () => {
  const email = fs.readFileSync(path.join(__dirname, "../../functions/src/email.ts"), "utf8");
  const index = fs.readFileSync(path.join(__dirname, "../../functions/src/index.ts"), "utf8");
  assert.doesNotMatch(index, /sendCommissionSettlementEmail/);
  assert.match(email, /async function sendCommissionSettlementEmail/);
  assert.match(email, /request\.data\?\.kind === "commission_settlement"/);
  assert.match(email, /if \(!request\.auth\)/);
  assert.match(email, /commission-settlement-\$\{ownerId\}-\$\{settlementId\}/);
  assert.match(email, /"Liquidacion_Comision" : "Commission_Statement"/);
  assert.match(email, /reviewedSubject/);
  assert.match(email, /reviewedMessage/);
  assert.match(email, /emailStatus:"sent"/);
  assert.match(email, /emailStatus:"missing_email"/);
});

test("commission statements preserve the reference form and support bilingual review", async () => {
  const { PDFDocument } = require("../../functions/node_modules/pdf-lib");
  for (const language of ["en", "es"]) {
    const bytes = fs.readFileSync(path.join(__dirname, `../assets/pdf/commission-payment-statement-${language}.pdf`));
    const document = await PDFDocument.load(bytes);
    assert.equal(document.getPageCount(), 1);
    assert.equal(document.getForm().getFields().length, 73);
  }
  const feature = fs.readFileSync(path.join(__dirname, "../assets/js/22-salespeople.js"), "utf8");
  assert.match(feature, /commissionSettlementReviewModal/);
  assert.match(feature, /SETTLEMENT NOTES/);
  assert.match(feature, /commissionSaveOnlyBtn/);
});

test("commission settlement summary follows the light modal theme", () => {
  const theme = fs.readFileSync(path.join(__dirname, "../assets/css/theme.css"), "utf8");
  assert.match(theme, /#commissionSettlementModal \.summary-box\s*\{/);
  assert.match(theme, /#commissionSettlementModal \.summary-box>div\s*\{/);
  assert.match(theme, /background:var\(--surface-subtle\)!important/);
  assert.match(theme, /background:var\(--surface-input\)!important/);
});
