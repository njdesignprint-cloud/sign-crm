(function (root, factory) {
  const api = factory(root.BankReconciliationCore);
  if (typeof module === "object" && module.exports) module.exports = api;
  root.OpeningBalanceCsv = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (BankCore) {
  const round = value => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;
  const clean = value => String(value ?? "").trim();
  const header = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
  const mappingKeyFor = value => clean(value).toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const parseAmount = value => {
    const raw = clean(value).replace(/[$,\s]/g, "");
    if (!raw) return 0;
    const negative = /^\(.+\)$/.test(raw);
    const amount = Number(raw.replace(/[()]/g, ""));
    if (!Number.isFinite(amount)) throw new Error(`Invalid amount: ${value}`);
    return round(negative ? -amount : amount);
  };

  function accountCodeFor(name = "") {
    const value = clean(name).toLowerCase().replace(/[’']/g, "");
    if (/accounts? receivable|cuentas? por cobrar|\ba\/r\b/.test(value)) return "1100";
    if (/inventory|inventario/.test(value)) return "1200";
    if (/fixed asset|equipment|vehicle|furniture|machinery|activo fijo|equipo|vehiculo|mobiliario/.test(value)) return "1500";
    if (/accounts? payable|cuentas? por pagar|\ba\/p\b/.test(value)) return "2000";
    if (/sales tax payable|impuesto.*venta.*pagar/.test(value)) return "2100";
    if (/customer deposit|unearned revenue|deferred revenue|deposito.*cliente|ingreso diferido/.test(value)) return "2200";
    if (/equity|retained earnings|opening balance|capital|patrimonio|utilidades retenidas/.test(value)) return "3000";
    if (/cash|bank|checking|savings|petty cash|undeposited funds|efectivo|banco|cheques|ahorros/.test(value)) return "1000";
    return "";
  }

  const normallyDebitAccount = code => ["1000", "1100", "1200", "1500"].includes(code);

  function summarizeSourceItems(sourceItems = [], manualMappings = {}) {
    const grouped = new Map();
    const unmapped = [];
    sourceItems.forEach(item => {
      const code = item.detectedCode || clean(manualMappings[item.row]);
      if (!code) {
        let debit = item.debit;
        let credit = item.credit;
        if (item.balance !== null) item.balance >= 0 ? credit = item.balance : debit = Math.abs(item.balance);
        unmapped.push({ row:item.row, accountName:item.accountName, debit, credit });
        return;
      }
      let debit = item.debit;
      let credit = item.credit;
      if (item.balance !== null) {
        debit = 0; credit = 0;
        if (normallyDebitAccount(code)) item.balance >= 0 ? debit = item.balance : credit = Math.abs(item.balance);
        else item.balance >= 0 ? credit = item.balance : debit = Math.abs(item.balance);
      }
      const current = grouped.get(code) || { accountCode:code, debit:0, credit:0, memo:"" };
      current.debit = round(current.debit + debit); current.credit = round(current.credit + credit);
      current.memo = current.memo ? `${current.memo}; ${item.accountName}` : item.accountName;
      grouped.set(code, current);
    });
    const lines = [...grouped.values()].map(item => {
      const net = round(item.debit - item.credit);
      return { ...item, debit:net > 0 ? net : 0, credit:net < 0 ? Math.abs(net) : 0, memo:item.memo.slice(0, 160) };
    }).filter(item => item.debit || item.credit).sort((a, b) => a.accountCode.localeCompare(b.accountCode));
    const totalDebit = round(lines.reduce((sum, item) => sum + item.debit, 0));
    const totalCredit = round(lines.reduce((sum, item) => sum + item.credit, 0));
    return { lines, unmapped, sourceRows:sourceItems.length, totalDebit, totalCredit, difference:round(totalDebit - totalCredit), balanced:unmapped.length === 0 && Math.abs(totalDebit - totalCredit) < 0.005 };
  }

  function importTrialBalanceCsv(text = "", manualMappings = {}) {
    if (!BankCore?.parseCsvRows) throw new Error("CSV parser is unavailable.");
    const rows = BankCore.parseCsvRows(text);
    const headerIndex = rows.findIndex(row => {
      const values = row.map(header);
      const hasAccount = values.some(value => ["account", "accountname", "cuenta", "nombredecuenta"].includes(value));
      const hasAmount = values.some(value => ["debit", "debits", "debito", "debitos", "credit", "credits", "credito", "creditos", "balance", "amount", "saldo", "monto"].includes(value));
      return hasAccount && hasAmount;
    });
    if (headerIndex < 0) throw new Error("The CSV needs Account and Debit/Credit or Balance columns.");
    const headers = rows[headerIndex].map(header);
    const find = names => headers.findIndex(value => names.includes(value));
    const accountIndex = find(["account", "accountname", "cuenta", "nombredecuenta"]);
    const debitIndex = find(["debit", "debits", "debito", "debitos"]);
    const creditIndex = find(["credit", "credits", "credito", "creditos"]);
    const balanceIndex = find(["balance", "amount", "saldo", "monto"]);
    if (accountIndex < 0 || ((debitIndex < 0 || creditIndex < 0) && balanceIndex < 0)) throw new Error("The CSV needs Account and Debit/Credit or Balance columns.");
    const sourceItems = [];
    rows.slice(headerIndex + 1).forEach((row, offset) => {
      const accountName = clean(row[accountIndex]);
      if (!accountName || /^total\b/i.test(accountName)) return;
      let debit = debitIndex >= 0 ? Math.abs(parseAmount(row[debitIndex])) : 0;
      let credit = creditIndex >= 0 ? Math.abs(parseAmount(row[creditIndex])) : 0;
      const code = accountCodeFor(accountName);
      let balance = null;
      if (balanceIndex >= 0 && debitIndex < 0 && creditIndex < 0) {
        balance = parseAmount(row[balanceIndex]);
        debit = 0; credit = 0;
      }
      if (!debit && !credit && !balance) return;
      sourceItems.push({ row:headerIndex + offset + 2, accountName, debit, credit, balance, detectedCode:code });
    });
    return { ...summarizeSourceItems(sourceItems, manualMappings), sourceItems };
  }

  function compareBalanceSheet(sourceLines = [], trialAccounts = [], tolerance = 0.01) {
    const normallyDebit = new Set(["1000", "1100", "1200", "1500"]);
    const source = new Map(sourceLines.map(item => [String(item.accountCode), round(normallyDebit.has(String(item.accountCode)) ? Number(item.debit || 0) - Number(item.credit || 0) : Number(item.credit || 0) - Number(item.debit || 0))]));
    const current = new Map(trialAccounts.map(item => [String(item.code), round(item.balance)]));
    const codes = [...new Set([...source.keys(), ...current.keys()].filter(code => ["1000", "1100", "1200", "1500", "2000", "2100", "2200", "3000"].includes(code)))].sort();
    const rows = codes.map(accountCode => {
      const sourceBalance = source.get(accountCode) || 0;
      const currentBalance = current.get(accountCode) || 0;
      const difference = round(currentBalance - sourceBalance);
      return { accountCode, sourceBalance, currentBalance, difference, matched:Math.abs(difference) <= Math.abs(Number(tolerance || 0.01)) };
    });
    return { rows, matched:rows.every(item => item.matched), differenceCount:rows.filter(item => !item.matched).length };
  }

  return { accountCodeFor, compareBalanceSheet, importTrialBalanceCsv, mappingKeyFor, summarizeSourceItems };
});
