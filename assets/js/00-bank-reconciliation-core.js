(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.BankReconciliationCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const DEFAULT_ACCOUNTS = Object.freeze([
    { id:"operating-bank", name:"Operating bank", type:"bank", ledgerAccountCode:"1000", active:true },
    { id:"cash", name:"Cash", type:"cash", ledgerAccountCode:"1000", active:true },
    { id:"zelle", name:"Zelle clearing", type:"clearing", ledgerAccountCode:"1000", active:true },
    { id:"card-clearing", name:"Card processor clearing", type:"clearing", ledgerAccountCode:"1000", active:true }
  ]);

  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const clean = value => String(value ?? "").trim();

  function parseCsvRows(text = "") {
    const rows = [];
    let row = [], field = "", quoted = false;
    const source = String(text || "").replace(/^\uFEFF/, "");
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char === '"' && quoted && source[i + 1] === '"') { field += '"'; i++; }
      else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) { row.push(field); field = ""; }
      else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && source[i + 1] === "\n") i++;
        row.push(field); field = "";
        if (row.some(value => clean(value))) rows.push(row);
        row = [];
      } else field += char;
    }
    if (field || row.length) { row.push(field); if (row.some(value => clean(value))) rows.push(row); }
    return rows;
  }

  function normalizeHeader(value = "") {
    return clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  function parseAmount(value) {
    const raw = clean(value).replace(/[$,\s]/g, "");
    if (!raw) return 0;
    const parentheses = /^\(.+\)$/.test(raw);
    const amount = Number(raw.replace(/[()]/g, ""));
    if (!Number.isFinite(amount)) throw new Error(`Invalid amount: ${value}`);
    return round(parentheses ? -amount : amount);
  }

  function isoDate(value) {
    const raw = clean(value);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
    const match = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
    if (!match) throw new Error(`Invalid date: ${value}`);
    const year = match[3].length === 2 ? Number(`20${match[3]}`) : Number(match[3]);
    const month = Number(match[1]), day = Number(match[2]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Invalid date: ${value}`);
    return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
  }

  function fingerprint(transaction = {}) {
    const description = clean(transaction.description).toLowerCase().replace(/\s+/g, " ");
    return [clean(transaction.accountId), clean(transaction.date), round(transaction.amount).toFixed(2), description].join("|");
  }

  function importStatementCsv(text, accountId, existingFingerprints = []) {
    const rows = parseCsvRows(text);
    if (rows.length < 2) throw new Error("The CSV needs a header and at least one transaction.");
    const headers = rows[0].map(normalizeHeader);
    const find = names => headers.findIndex(header => names.includes(header));
    const dateIndex = find(["date", "transactiondate", "postingdate", "fecha"]);
    const descriptionIndex = find(["description", "memo", "name", "details", "descripcion", "concepto"]);
    const amountIndex = find(["amount", "transactionamount", "importe", "monto"]);
    const debitIndex = find(["debit", "withdrawal", "retiro", "cargo"]);
    const creditIndex = find(["credit", "deposit", "deposito", "abono"]);
    if (dateIndex < 0 || descriptionIndex < 0 || (amountIndex < 0 && debitIndex < 0 && creditIndex < 0)) {
      throw new Error("CSV columns must include date, description and amount, or debit/credit.");
    }
    const known = new Set(existingFingerprints.map(String));
    const seen = new Set();
    const transactions = [];
    let duplicates = 0;
    rows.slice(1).forEach((row, index) => {
      if (!row.some(value => clean(value))) return;
      const amount = amountIndex >= 0 ? parseAmount(row[amountIndex]) : round(parseAmount(row[creditIndex]) - Math.abs(parseAmount(row[debitIndex])));
      if (!amount) return;
      const transaction = {
        id:`statement-${index + 1}`, accountId:clean(accountId), date:isoDate(row[dateIndex]),
        description:clean(row[descriptionIndex]) || "Bank transaction", amount
      };
      transaction.fingerprint = fingerprint(transaction);
      if (known.has(transaction.fingerprint) || seen.has(transaction.fingerprint)) { duplicates++; return; }
      seen.add(transaction.fingerprint); transactions.push(transaction);
    });
    return { transactions, duplicates, totalRows:rows.length - 1 };
  }

  function cashMovements(entries = []) {
    return entries.flatMap(entry => entry.lines.filter(line => line.accountCode === "1000" && (line.debit || line.credit)).map((line, index) => ({
      id:`${entry.id}:${index}`, entryId:entry.id, date:entry.date, description:entry.description,
      amount:round(line.debit - line.credit), sourceType:entry.sourceType
    })));
  }

  function dayDistance(left, right) {
    return Math.abs((Date.parse(`${left}T00:00:00Z`) - Date.parse(`${right}T00:00:00Z`)) / 86400000);
  }

  function matchTransactions(transactions = [], entries = [], toleranceDays = 3) {
    const movements = cashMovements(entries);
    const used = new Set();
    return transactions.map(transaction => {
      const candidates = movements.filter(movement => !used.has(movement.id) && Math.abs(movement.amount - transaction.amount) < 0.005 && dayDistance(movement.date, transaction.date) <= toleranceDays)
        .sort((a, b) => dayDistance(a.date, transaction.date) - dayDistance(b.date, transaction.date));
      const bestDistance = candidates.length ? dayDistance(candidates[0].date, transaction.date) : null;
      const equallyBest = candidates.filter(candidate => dayDistance(candidate.date, transaction.date) === bestDistance);
      if (equallyBest.length !== 1) return { ...transaction, matchStatus:candidates.length ? "ambiguous" : "unmatched", match:null };
      used.add(equallyBest[0].id);
      return { ...transaction, matchStatus:"matched", match:equallyBest[0] };
    });
  }

  function summarize(matches = []) {
    return {
      imported:matches.length,
      matched:matches.filter(item => item.matchStatus === "matched").length,
      ambiguous:matches.filter(item => item.matchStatus === "ambiguous").length,
      unmatched:matches.filter(item => item.matchStatus === "unmatched").length,
      netMovement:round(matches.reduce((sum, item) => sum + item.amount, 0))
    };
  }

  return { DEFAULT_ACCOUNTS, parseCsvRows, parseAmount, isoDate, fingerprint, importStatementCsv, cashMovements, matchTransactions, summarize };
});
