const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const pdfSource = fs.readFileSync(path.join(__dirname, "..", "assets", "js", "07-pdf.js"), "utf8");
const quoteStart = pdfSource.indexOf("async function exportQuotePdf");
const quoteEnd = pdfSource.indexOf("function exportUsersPdf", quoteStart);
const quoteSource = pdfSource.slice(quoteStart, quoteEnd);

test("customer estimate excludes internal costs and profitability", () => {
  assert.ok(quoteStart >= 0 && quoteEnd > quoteStart);
  for (const forbidden of ["calc.materialsCost", "calc.laborCost", "calc.extraCost", "calc.cost", "calc.profit", "calc.margin", "computeEstimator"])
    assert.equal(quoteSource.includes(forbidden), false, `customer estimate exposes ${forbidden}`);
});

test("customer estimate has customer-only filename and footer", () => {
  assert.match(quoteSource, /Estimate_\$\{pdfSafeFileName/);
  assert.match(quoteSource, /savePdf\(pdf, [\s\S]*"customer"\)/);
  assert.doesNotMatch(quoteSource, /Cotizacion_F6|NJ design|NJ_/i);
});

test("PDF exports use safe footer and no legacy NJ or F6 filenames", () => {
  assert.match(pdfSource, /CONFIDENTIAL · INTERNAL USE ONLY/);
  assert.match(pdfSource, /function addPdfFooter/);
  assert.doesNotMatch(pdfSource, /pdf\.save\(`[^`]*(?:_NJ_|Cotizacion_F6)/);
});

test("dashboard export tolerates missing interface counters", () => {
  const start = pdfSource.indexOf("function exportDashboardPdf");
  const end = pdfSource.indexOf("function exportClientsPdf", start);
  const source = pdfSource.slice(start, end);
  assert.match(source, /\$\(id\)\?\.textContent/);
  assert.match(source, /String\(state\.clients\.length\)/);
});

test("PDF templates follow company language and use a safe logo fallback", () => {
  assert.match(pdfSource, /state\.companySettings\?\.language/);
  assert.match(pdfSource, /function pdfText\(en, es\)/);
  assert.match(pdfSource, /COMPANY\.logoUrl/);
  assert.match(pdfSource, /companyLogoPreview/);
  assert.match(pdfSource, /using initials instead/);
});

test("internal PDF tables localize their important headings", () => {
  for (const heading of [
    'pdfText("Customer", "Cliente")',
    'pdfText("Job", "Trabajo")',
    'pdfText("Status", "Estado")',
    'pdfText("Amount", "Monto")',
    'pdfText("Supplier", "Proveedor")',
    'pdfText("Unit cost", "Costo unitario")'
  ]) assert.match(pdfSource, new RegExp(heading.replace(/[()]/g, "\\$&")));
});
