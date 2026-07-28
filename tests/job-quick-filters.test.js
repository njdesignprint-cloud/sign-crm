const test = require("node:test");
const assert = require("node:assert/strict");
const { matches, responsibleValues } = require("../assets/js/01-job-quick-filters.js");

const context = {
  aliases: ["worker@example.com", "Ana Worker"],
  today: "2026-07-28",
  weekEnd: "2026-08-04",
  overdue: false,
  balance: 0
};

test("mine recognizes workflow and legacy responsible fields", () => {
  assert.equal(matches({ status: "Diseño", workflow: { assignments: { design: "Ana Worker" } } }, "mine", context), true);
  assert.equal(matches({ status: "Producción", production: { responsible: "worker@example.com" } }, "mine", context), true);
  assert.equal(matches({ status: "Pagado", workflow: { assignments: { design: "Ana Worker" } } }, "mine", context), false);
});

test("unassigned checks every operational responsibility", () => {
  assert.equal(matches({ status: "Cotización" }, "unassigned", context), true);
  assert.equal(matches({ status: "Cotización", installation: { assignedTo: "Crew A" } }, "unassigned", context), false);
  assert.deepEqual(responsibleValues({ workflow: { assignments: { sales: "Sales A", collections: "Billing A" } } }), ["sales a", "billing a"]);
});

test("operational filters classify status, approvals, dates and balances", () => {
  assert.equal(matches({ status: "Diseño", clientApproval: { designStatus: "enviado" } }, "waiting_client", context), true);
  assert.equal(matches({ status: "Producción", production: { blocked: true } }, "blocked", context), true);
  assert.equal(matches({ status: "Diseño", production: { stage: "listo_instalar" } }, "production", context), true);
  assert.equal(matches({ status: "Instalación", installation: { date: "2026-08-02", status: "Confirmada" } }, "install_week", context), true);
  assert.equal(matches({ status: "Instalación", installation: { date: "2026-08-08", status: "Confirmada" } }, "install_week", context), false);
  assert.equal(matches({ status: "Entregado" }, "balance", { ...context, balance: 125 }), true);
  assert.equal(matches({ status: "Pagado" }, "overdue", { ...context, overdue: true }), false);
});
