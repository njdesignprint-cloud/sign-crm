const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const frontend = path.resolve(__dirname, "..");
const pages = [
  "index.html",
  "client-approval-public.html",
  "invoice-payment-public.html",
  "estimate-review-public.html",
  "invoice-view-public.html",
  "design-proof-public.html",
  "privacy.html",
  "terms.html",
];

test("SignShop HQ pages use the official favicon", () => {
  for (const page of pages) {
    const html = fs.readFileSync(path.join(frontend, page), "utf8");
    assert.match(html, /assets\/images\/favicon\.ico/, `${page} must use the official favicon`);
    assert.doesNotMatch(html, /signshophq-mark-c1\.svg/, `${page} must not use the provisional C1 mark`);
  }
});

test("official brand files are valid PNG and ICO assets", () => {
  const png = fs.readFileSync(path.join(frontend, "assets/images/signshop-header.png"));
  const ico = fs.readFileSync(path.join(frontend, "assets/images/favicon.ico"));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.deepEqual([...ico.subarray(0, 4)], [0, 0, 1, 0]);
  assert.ok(png.length > 10000);
  assert.ok(ico.length > 1000);
});

test("visible SignShop HQ headers use the official horizontal logo", () => {
  for (const page of ["index.html", "client-approval-public.html", "invoice-payment-public.html", "estimate-review-public.html", "invoice-view-public.html", "privacy.html", "terms.html"]) {
    const html = fs.readFileSync(path.join(frontend, page), "utf8");
    assert.match(html, /assets\/images\/signshop-header\.png/, `${page} must use the official horizontal logo`);
  }
});
