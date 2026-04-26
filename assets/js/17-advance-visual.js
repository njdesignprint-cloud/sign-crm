(function () {
  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  function moneySafe(value) {
    if (typeof money === "function") return money(value || 0);
    return `$${Number(value || 0).toFixed(2)}`;
  }

  function cleanSafe(value) {
    if (typeof cleanText === "function") return cleanText(value);
    return String(value || "").trim();
  }

  function getAdvanceSummary(job = {}) {
    if (typeof window.getJobAdvanceSummary === "function") {
      return window.getJobAdvanceSummary(job);
    }
    const adv = job.advance || {};
    const received = Number(adv.received || 0);
    const ledger = Array.isArray(adv.ledger) ? adv.ledger : [];
    const spent = ledger.reduce((sum, item) => {
      return sum + (cleanSafe(item.status) === "Pagado" && item.applyToAdvance ? Number(item.amount || 0) : 0);
    }, 0);
    return { received, spent, available: received - spent };
  }

  function injectStyles() {
    if (document.getElementById("advanceVisualStyles")) return;
    const style = document.createElement("style");
    style.id = "advanceVisualStyles";
    style.textContent = `
      .advance-table-col { min-width: 120px; }
      .advance-table-cell { font-weight: 800; color: #b8ff2c; white-space: nowrap; }
      .advance-table-sub { display:block; margin-top:4px; font-size:11px; color: var(--muted); font-weight: 600; }
      .production-advance-line {
        margin-top: 8px; padding: 8px 10px; border: 1px solid rgba(184,255,44,.12);
        border-radius: 10px; background: rgba(184,255,44,.06); font-size: 12px; line-height: 1.35;
      }
      .production-advance-line strong { color: #d9ff7a; font-size: 13px; }
      .production-advance-line .muted { color: var(--text-soft, #b8c0cf); font-size: 11px; display: block; margin-top: 2px; }
    `;
    document.head.appendChild(style);
  }

  function findJobById(jobId) {
    if (!jobId) return null;
    if (typeof getJobById === "function") return getJobById(jobId);
    if (window.state && Array.isArray(state.jobs)) {
      return state.jobs.find(j => String(j.id) === String(jobId)) || null;
    }
    return null;
  }

  function findClientLabel(job) {
    try {
      if (!job || typeof getClientById !== "function" || typeof clientLabel !== "function") return "";
      return cleanSafe(clientLabel(getClientById(job.clientId)));
    } catch (e) {
      return "";
    }
  }

  function findProductionJobFromCard(card) {
    const buttonWithId = card.querySelector("[data-job-id]");
    if (buttonWithId?.dataset.jobId) return findJobById(buttonWithId.dataset.jobId);

    const candidates = [
      card.querySelector("[data-edit-job]")?.dataset.editJob,
      card.querySelector("[data-status-job]")?.dataset.statusJob,
      card.querySelector("[data-open-job]")?.dataset.openJob
    ].filter(Boolean);

    for (const id of candidates) {
      const job = findJobById(id);
      if (job) return job;
    }

    const title = cleanSafe(card.querySelector("h4, .production-card-title, strong")?.textContent);
    const client = cleanSafe(card.querySelector(".client, small, .production-client")?.textContent);

    if (window.state && Array.isArray(state.jobs) && title) {
      return state.jobs.find(job => {
        const sameTitle = cleanSafe(job.title || job.jobName) === title;
        if (!sameTitle) return false;
        if (!client) return true;
        return findClientLabel(job) === client;
      }) || null;
    }

    return null;
  }

  function ensureJobsHeader() {
    const table = document.querySelector("#jobsTableView table, #view-trabajos table, table");
    if (!table) return false;
    const headRow = table.querySelector("thead tr");
    if (!headRow) return false;
    if (headRow.querySelector('[data-col="advance-available"]')) return true;

    const saldoTh = [...headRow.children].find(th => cleanSafe(th.textContent) === "Saldo");
    const th = document.createElement("th");
    th.textContent = "Anticipo disp.";
    th.dataset.col = "advance-available";
    th.className = "advance-table-col";

    if (saldoTh && saldoTh.nextSibling) headRow.insertBefore(th, saldoTh.nextSibling);
    else headRow.appendChild(th);
    return true;
  }

  function patchJobsTable() {
    if (!ensureJobsHeader()) return;
    const tbody = document.getElementById("jobsBody");
    if (!tbody) return;

    [...tbody.querySelectorAll("tr")].forEach(row => {
      const editBtn = row.querySelector("[data-edit-job]");
      const statusBtn = row.querySelector("[data-status-job]");
      const payBtn = row.querySelector("[data-pay-job]");
      const jobId = editBtn?.dataset.editJob || statusBtn?.dataset.statusJob || payBtn?.dataset.payJob;
      const job = findJobById(jobId);
      if (!job) return;

      const advance = getAdvanceSummary(job);
      let cell = row.querySelector('[data-cell="advance-available"]');
      if (!cell) {
        cell = document.createElement("td");
        cell.dataset.cell = "advance-available";
        cell.className = "advance-table-cell";
        const saldoCell = [...row.children][9];
        if (saldoCell && saldoCell.nextSibling) row.insertBefore(cell, saldoCell.nextSibling);
        else row.appendChild(cell);
      }

      cell.innerHTML = `
        ${moneySafe(advance.available)}
        <span class="advance-table-sub">${moneySafe(advance.spent)} / ${moneySafe(advance.received)}</span>
      `;
    });
  }

  function patchProductionCards() {
    document.querySelectorAll(".production-card").forEach(card => {
      const job = findProductionJobFromCard(card);
      if (!job) return;

      const advance = getAdvanceSummary(job);
      let line = card.querySelector(".production-advance-line");
      if (!line) {
        line = document.createElement("div");
        line.className = "production-advance-line";
        const actionWrap = card.querySelector(".production-card-actions, .kanban-actions");
        if (actionWrap) card.insertBefore(line, actionWrap);
        else card.appendChild(line);
      }

      line.innerHTML = `
        <strong>Anticipo disp.: ${moneySafe(advance.available)}</strong>
        <span class="muted">Usado ${moneySafe(advance.spent)} de ${moneySafe(advance.received)}</span>
      `;
    });
  }

  function run() {
    injectStyles();
    patchJobsTable();
    patchProductionCards();
  }

  ready(function () {
    run();

    let lastJobsLen = -1;
    let lastProdCards = -1;

    setInterval(function () {
      const jobsLen = window.state?.jobs?.length ?? -1;
      const prodCards = document.querySelectorAll(".production-card").length;
      if (jobsLen !== lastJobsLen || prodCards !== lastProdCards) {
        lastJobsLen = jobsLen;
        lastProdCards = prodCards;
      }
      run();
    }, 700);
  });
})();
