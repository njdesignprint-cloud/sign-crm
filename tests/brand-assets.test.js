const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const frontend = path.resolve(__dirname, "..");
const pages = [
  "index.html",
  "client-approval-public.html",
  "invoice-payment-public.html",
  "design-proof-public.html",
  "privacy.html",
  "terms.html",
];

test("SignShop HQ pages use the C1 brand mark", () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(frontend, page), "utf8");
    assert.match(html, /signshophq-mark-c1\.svg/, `${page} must use the C1 mark`);
    assert.doesNotMatch(html, /signshophq-icon(?:-contrast)?\.png/, `${page} must not use the previous mark`);
  }
});

test("C1 brand mark is a compact accessible SVG with the approved colors", () => {
  const svg = fs.readFileSync(path.join(frontend, "assets/images/signshophq-mark-c1.svg"), "utf8");
  assert.match(svg, /viewBox="0 0 128 128"/);
  assert.match(svg, /<title[^>]*>SignShop HQ<\/title>/);
  for (const color of ["#1265F5", "#082B59", "#12B8B0"]) assert.match(svg, new RegExp(color, "i"));
  assert.doesNotMatch(svg, /(?:filter|gradient|script|foreignObject)/i);
});
