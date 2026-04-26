
(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function injectAdvanceVisualStyles() {
    if (document.getElementById("advanceVisualStyles")) return;
    const style = document.createElement("style");
    style.id = "advanceVisualStyles";
    style.textContent = `
      .advance-table-col { min-width: 120px; }
      .advance-table-cell {
        font-weight: 800;
        color: #b8ff2c;
        white-space: nowrap;
      }
      .advance-table-sub {
        display:block;
        margin-top:4px;
        font-size:11px;
        color: var(--muted);
        font-weight: 600;
      }
      .production-advance-line {
        margin-top: 8px;
        padding: 8px 10px;
        border: 1px solid rgba(184,255,44,.12);
        border-radius: 10px;
        background: rgba(184,255,44,.06);
        font-size: 12px;
        line-height: 1.35;
      }
      .production-advance-line strong {
        color: #d9ff7a;
        font-size: 13px;
      }
      .production-advance-line .muted {
        color: var(--text-soft, #b8c0cf);
        font-size: 11px;
        display: block;
        margin-top: 2px;
      }
    `;
    document.head.appendChild(style);
  }

  function moneySafe(value) {
    if (typeof money === "function") return money(value || 0);
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function cleanSafe(value) {
    if (typeof cleanText === "function") return cleanText(value);
    return String(value || "").trim();
  }

  function normalizeAdvance(data = {}) {
    return {
      received: Number(data.received || 0),
      ledger: Array.isArray(data.ledger) ? data.ledger : []
    };
  }

  function computeAdvance(data = {}) {
    const normalized = normalizeAdvance(data);
    const spent = normalized.ledger.reduce((sum, item) => {
      const status = cleanSafe(item.status);
      const apply = !!item.applyToAdvance;
      return sum + (status === "Pagado" && apply ? Number(item.amount || 0) : 0);
    }, 0);
    return {
      received: normalized.received,
      spent,
      available: normalized.received - spent
    };
  }

  function findJobById(jobId) {
    if (!jobId) return null;
    if (typeof getJobById === "function") return getJobById(jobId);
    if (window.state && Array.isArray(state.jobs)) {
      return state.jobs.find(j => String(j.id) === String(jobId)) || null;
    }
    return null;
  }

  function ensureJobsHeader() {
    const table = document.querySelector("#jobsTableView table");
    if (!table) return false;
    const headRow = table.querySelector("thead tr");
    if (!headRow) return false;
    if (headRow.querySelector('[data-col="advance-available"]')) return true;

    const saldoTh = [...headRow.children].find(th => cleanSafe(th.textContent) === "Saldo");
    const th = document.createElement("th");
    th.textContent = "Anticipo disp.";
    th.dataset.col = "advance-available";
    th.className = "advance-table-col";

    if (saldoTh && saldoTh.nextSibling) {
      headRow.insertBefore(th, saldoTh.nextSibling);
    } else {
      headRow.appendChild(th);
    }
    return true;
  }

  function patchJobsTable() {
    if (!ensureJobsHeader()) return;

    const tbody = document.getElementById("jobsBody");
    if (!tbody) return;

    [...tbody.querySelectorAll("tr")].forEach(row => {
      if (row.querySelector('[data-cell="advance-available"]')) return;

      const actionButton = row.querySelector("[data-edit-job], [data-status-job], [data-pay-job]");
      const jobId = actionButton?.dataset.editJob || actionButton?.dataset.statusJob || actionButton?.dataset.payJob;
      const job = findJobById(jobId);
      const advance = computeAdvance(job?.advance || {});

      const cell = document.createElement("td");
      cell.dataset.cell = "advance-available";
      cell.className = "advance-table-cell";
      cell.innerHTML = `
        ${moneySafe(advance.available)}
        <span class="advance-table-sub">${moneySafe(advance.spent)} / ${moneySafe(advance.received)}</span>
      `;

      const saldoCell = [...row.children][9]; // current saldo column position before insert
      if (saldoCell && saldoCell.nextSibling) {
        row.insertBefore(cell, saldoCell.nextSibling);
      } else {
        row.appendChild(cell);
      }
    });
  }

  function patchProductionCards() {
    const cards = document.querySelectorAll(".production-card[data-job-id], .production-card [data-job-id]");
    if (!cards.length) return;

    document.querySelectorAll(".production-card").forEach(card => {
      if (card.querySelector(".production-advance-line")) return;

      const jobId = card.dataset.jobId
        || card.querySelector("[data-job-id]")?.dataset.jobId
        || card.querySelector('[data-action="edit"]')?.dataset.jobId
        || card.querySelector('[data-action="open"]')?.dataset.jobId;

      const job = findJobById(jobId);
      if (!job) return;

      const advance = computeAdvance(job.advance || {});
      const block = document.createElement("div");
      block.className = "production-advance-line";
      block.innerHTML = `
        <strong>Anticipo disp.: ${moneySafe(advance.available)}</strong>
        <span class="muted">Usado ${moneySafe(advance.spent)} de ${moneySafe(advance.received)}</span>
      `;

      const actionWrap = card.querySelector(".production-card-actions");
      if (actionWrap) {
        card.insertBefore(block, actionWrap);
      } else {
        card.appendChild(block);
      }
    });
  }

  function patchDueSoonTable() {
    const table = document.querySelector("#dueSoonBody");
    if (!table) return;
    // No structural changes here to avoid shifting the dashboard layout unexpectedly.
  }

  function runPatches() {
    injectAdvanceVisualStyles();
    patchJobsTable();
    patchProductionCards();
    patchDueSoonTable();
  }

  ready(function () {
    runPatches();

    let lastJobsLen = -1;
    let lastProdCount = -1;

    setInterval(function () {
      const jobsLen = window.state?.jobs?.length ?? -1;
      const prodCount = document.querySelectorAll(".production-card").length;
      if (jobsLen !== lastJobsLen || prodCount !== lastProdCount) {
        lastJobsLen = jobsLen;
        lastProdCount = prodCount;
        runPatches();
      } else {
        // still re-run lightly because renderJobs/renderBoard rebuild DOM
        patchJobsTable();
        patchProductionCards();
      }
    }, 800);
  });
})();
