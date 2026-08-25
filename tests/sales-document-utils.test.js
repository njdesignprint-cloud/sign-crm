const test = require("node:test");
const assert = require("node:assert/strict");
const SalesDocumentUtils = require("../assets/js/00-sales-document-utils.js");
const fs = require("node:fs");
const path = require("node:path");

test("calculates discount, taxable lines, tax and internal profit", () => {
  const result = SalesDocumentUtils.calculate([
    { quantity:2, rate:100, internalCost:60, taxable:true },
    { quantity:1, rate:50, internalCost:10, taxable:false }
  ], 25, 8.25);
  assert.equal(result.subtotal, 250);
  assert.equal(result.discount, 25);
  assert.equal(result.taxableSubtotal, 180);
  assert.equal(result.tax, 14.85);
  assert.equal(result.total, 239.85);
  assert.equal(result.internalCost, 70);
  assert.equal(result.profit, 155);
});

test("invoice module keeps bilingual terms, backups and job-linked payments", () => {
  const moduleSource = fs.readFileSync(path.join(__dirname, "../assets/js/27-sales-documents.js"), "utf8");
  const backupSource = fs.readFileSync(path.join(__dirname, "../assets/js/07-pdf.js"), "utf8");
  const paymentSource = fs.readFileSync(path.join(__dirname, "../assets/js/04-expenses.js"), "utf8");
  assert.match(moduleSource, /PAYMENT OPTIONS: Zelle \$\{paymentPhone\}/);
  assert.match(moduleSource, /OPCIONES DE PAGO: Zelle \$\{paymentPhone\}/);
  assert.match(moduleSource, /const issuerName = typeof pdfCompanyName/);
  assert.doesNotMatch(moduleSource, /NJ Design & Print no se hace responsable/);
  assert.match(moduleSource, /Customer Signature/);
  assert.match(moduleSource, /Firma del cliente/);
  assert.match(backupSource, /salesDocuments: state\.salesDocuments/);
  assert.match(paymentSource, /invoiceId: state\.workingPaymentInvoiceId/);
  assert.match(paymentSource, /paidAmount:invoicePaid/);
});

test("an estimate never becomes collected and invoice status follows payments", () => {
  assert.equal(SalesDocumentUtils.effectiveStatus({ type:"estimate", total:1000, paidAmount:1000, status:"accepted" }, "2026-08-08"), "accepted");
  assert.equal(SalesDocumentUtils.effectiveStatus({ type:"invoice", total:1000, paidAmount:400, status:"open", dueDate:"2026-08-20" }, "2026-08-08"), "partially_paid");
  assert.equal(SalesDocumentUtils.effectiveStatus({ type:"invoice", total:1000, paidAmount:1000, status:"open" }, "2026-08-08"), "paid");
  assert.equal(SalesDocumentUtils.effectiveStatus({ type:"invoice", total:1000, paidAmount:500, status:"void" }, "2026-08-08"), "void");
  assert.equal(SalesDocumentUtils.effectiveStatus({ type:"invoice", total:1000, paidAmount:0, status:"open", dueDate:"2026-08-01" }, "2026-08-08"), "overdue");
});

test("a linked invoice recognizes unallocated payments already collected on the job", () => {
  const moduleSource = fs.readFileSync(path.join(__dirname, "../assets/js/27-sales-documents.js"), "utf8");
  assert.equal(moduleSource.includes("function availableJobCollectedForInvoice"), true);
  assert.equal(moduleSource.includes("getPaymentsTotal(job)"), true);
  assert.equal(moduleSource.includes('item.type === "invoice" && item.status !== "void"'), true);
  assert.equal(moduleSource.includes("Math.min(invoiceTotal, availableJobCollectedForInvoice(jobId))"), true);
});

test("sales documents can be deleted recoverably and update accounting", () => {
  const moduleSource = fs.readFileSync(path.join(__dirname, "../assets/js/27-sales-documents.js"), "utf8");
  const trashSource = fs.readFileSync(path.join(__dirname, "../assets/js/24-trash.js"), "utf8");
  assert.match(moduleSource, /data-sales-doc-delete/);
  assert.match(moduleSource, /moveRecordToTrash\("salesDocuments"/);
  assert.match(trashSource, /salesDocuments:salesDocumentsRef/);
  assert.match(trashSource, /linkedPayments/);
});

test("the public approval thank-you page stays open until the customer closes it", () => {
  const approvalSource = fs.readFileSync(path.join(__dirname, "../15-client-approval-public.js"), "utf8");
  assert.doesNotMatch(approvalSource, /setTimeout\(closePage/);
  assert.match(approvalSource, /Puedes dejar esta página abierta o cerrarla cuando quieras/);
  assert.match(approvalSource, /approvalCloseBtn/);
});

test("sales documents preserve a per-document address and provide a full-page preview", () => {
  const moduleSource = fs.readFileSync(path.join(__dirname, "../assets/js/27-sales-documents.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(moduleSource, /serviceAddress:cleanText\(\$\("salesDocAddress"\)\.value\)/);
  assert.match(moduleSource, /item\.serviceAddress \|\| customer\.address/);
  assert.match(moduleSource, /data-sales-doc-preview/);
  assert.match(moduleSource, /pdf\.output\("bloburl"\)/);
  assert.match(html, /id="salesDocAddress"/);
  assert.match(html, /id="previewSalesDocumentBtn"/);
});

test("email review keeps controls readable and company logos bounded", () => {
  const styles = fs.readFileSync(path.join(__dirname, "../assets/css/styles.css"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../index.html"), "utf8");
  assert.match(styles, /#salesDocumentEmailModal \.check-item\{background:var\(--card\)/);
  assert.match(styles, /\.email-preview-card>img\{[^}]*max-width:180px;[^}]*max-height:72px/);
  assert.match(styles, /\.email-review-layout\{display:grid;grid-template-columns:/);
  assert.match(page, /styles\.css\?v=20260824-payment-ui-1/);
});
