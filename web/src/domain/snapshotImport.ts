import { createLocalId } from "./utils";
import type { AccountEntry, AccountHistorySnapshot } from "./types";

export type ImportDelimiter = "\t" | "," | ";";

export interface ParsedTable {
  headers: string[];
  rows: string[][];
  hadHeaderRow: boolean;
  delimiter: ImportDelimiter;
}

export type DateFormat = "DMY" | "MDY" | "YMD";

export type ColumnRole =
  | { kind: "date" }
  | { kind: "account"; accountId: string }
  | { kind: "skip" };

export type DuplicatePolicy = "skip" | "replace";

export interface ImportPlan {
  columnRoles: ColumnRole[];
  dateFormat: DateFormat;
  duplicatePolicy: DuplicatePolicy;
}

export interface ImportRowError {
  row: number; // 1-indexed in the parsed-table sense (excluding header)
  message: string;
}

export interface ImportResult {
  snapshots: AccountHistorySnapshot[];
  errors: ImportRowError[];
  newDates: number;
  skippedDuplicates: number;
  replacedDuplicates: number;
}

const DELIMITERS: ImportDelimiter[] = ["\t", ",", ";"];

function pickDelimiter(line: string): ImportDelimiter {
  let best: ImportDelimiter = "\t";
  let bestCount = -1;
  for (const d of DELIMITERS) {
    const count = line.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

// Split a CSV-ish line respecting double-quoted cells.
function splitLine(line: string, delimiter: ImportDelimiter): string[] {
  if (delimiter === "\t") {
    // Tabs from spreadsheets rarely involve quoting; fast path.
    return line.split("\t");
  }
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

// A row is considered a header row if the cells look mostly textual rather than numeric/date.
function looksLikeHeaderRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  let textualNonEmpty = 0;
  let numericLooking = 0;
  for (const cell of cells) {
    const trimmed = cell.trim();
    if (!trimmed) continue;
    if (/^[-+]?\$?\s*[\d,.()-]+\s*%?$/.test(trimmed)) {
      numericLooking++;
    } else if (/^\d{1,4}[\/\-.]\d{1,4}([\/\-.]\d{1,4})?$/.test(trimmed)) {
      numericLooking++;
    } else {
      textualNonEmpty++;
    }
  }
  return textualNonEmpty > numericLooking && textualNonEmpty > 0;
}

export function parsePastedTable(text: string): ParsedTable {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = cleaned.split("\n").map((l) => l).filter((l, idx, all) => {
    // keep last empty line out, but keep blank inner lines as-is (don't usually appear)
    if (l.trim().length > 0) return true;
    return idx !== all.length - 1;
  }).filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], hadHeaderRow: false, delimiter: "\t" };
  }

  const delimiter = pickDelimiter(lines[0]);
  const matrix = lines.map((line) => splitLine(line, delimiter).map((c) => c.trim()));

  // Normalize column count to the widest row.
  const width = matrix.reduce((m, row) => Math.max(m, row.length), 0);
  for (const row of matrix) {
    while (row.length < width) row.push("");
  }

  const hadHeaderRow = matrix.length > 1 && looksLikeHeaderRow(matrix[0]);
  const headers: string[] = hadHeaderRow
    ? matrix[0].map((h, i) => h || `Column ${i + 1}`)
    : matrix[0].map((_, i) => `Column ${i + 1}`);
  const rows = hadHeaderRow ? matrix.slice(1) : matrix;

  return { headers, rows, hadHeaderRow, delimiter };
}

// ─── Numeric ──────────────────────────────────────────────────────────────────

export function parseNumericCell(raw: string): number | null {
  if (raw == null) return null;
  let s = String(raw).trim();
  if (!s) return null;
  // Accounting parens for negatives: ($1,234.56) → -1234.56
  let sign = 1;
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1).trim();
  }
  // Strip currency symbols, commas, spaces, %
  s = s.replace(/[$£€¥]/g, "").replace(/,/g, "").replace(/\s+/g, "").replace(/%$/, "");
  if (s === "" || s === "-" || s === "+") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return sign * n;
}

// ─── Dates ────────────────────────────────────────────────────────────────────

interface RawDate {
  a: number; // first segment
  b: number; // second segment
  c: number; // third segment
}

function splitDate(raw: string): RawDate | null {
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,4})[\/\-.](\d{1,4})[\/\-.](\d{1,4})$/);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  const c = Number(m[3]);
  if (![a, b, c].every((n) => Number.isFinite(n))) return null;
  return { a, b, c };
}

/**
 * Look at a sample of date strings and pick the most likely format.
 * Heuristics:
 *  - 4-digit first segment → YMD.
 *  - Any cell where the *first* segment > 12 → must be DMY.
 *  - Any cell where the *second* segment > 12 → must be MDY.
 *  - Otherwise default to DMY (matches AU/EU; user can override).
 */
export function detectDateFormat(samples: string[]): DateFormat {
  let dmyEvidence = 0;
  let mdyEvidence = 0;
  let ymdEvidence = 0;

  for (const raw of samples) {
    const parts = splitDate(raw);
    if (!parts) continue;
    if (parts.a > 1900) {
      ymdEvidence += 2;
      continue;
    }
    if (parts.a > 12 && parts.a <= 31) dmyEvidence++;
    if (parts.b > 12 && parts.b <= 31) mdyEvidence++;
  }

  if (ymdEvidence > dmyEvidence && ymdEvidence > mdyEvidence) return "YMD";
  if (mdyEvidence > dmyEvidence) return "MDY";
  return "DMY";
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function normalizeYear(y: number): number {
  if (y >= 100) return y;
  // 2-digit year: 0-69 → 2000s, 70-99 → 1900s. (Sane default for personal finance.)
  return y < 70 ? 2000 + y : 1900 + y;
}

function isValidYmd(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const d = new Date(year, month - 1, day);
  return d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day;
}

export function parseDateForFormat(raw: string, format: DateFormat): string | null {
  const parts = splitDate(raw);
  if (!parts) return null;
  let day: number, month: number, year: number;
  if (format === "YMD") {
    year = normalizeYear(parts.a);
    month = parts.b;
    day = parts.c;
  } else if (format === "MDY") {
    month = parts.a;
    day = parts.b;
    year = normalizeYear(parts.c);
  } else {
    // DMY
    day = parts.a;
    month = parts.b;
    year = normalizeYear(parts.c);
  }
  if (!isValidYmd(year, month, day)) return null;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

// ─── Column suggestion ────────────────────────────────────────────────────────

const COMPUTED_COLUMN_HINTS = ["net worth", "networth", "total", "assets", "liabilities", "debt", "subtotal"];

/**
 * Suggest a role for each column header given the available accounts.
 *  - Headers matching computed/aggregate names default to `skip`.
 *  - One column with the strongest "date-like" signal becomes `date`.
 *  - Remaining columns map to the most similar account by case-insensitive substring.
 *  - If nothing matches, defaults to `skip` (user picks).
 */
export function suggestColumnMappings(
  headers: string[],
  sampleRow: string[] | undefined,
  accounts: AccountEntry[]
): ColumnRole[] {
  const usedAccounts = new Set<string>();
  const lowerAccounts = accounts.map((a) => ({ id: a.id, name: a.name.toLowerCase(), bucket: a.bucket.toLowerCase() }));

  // First pass: identify the date column. Pick the one whose sample value looks like a date,
  // tiebreaker on header containing "date".
  let dateColumn = -1;
  let dateScore = -1;
  for (let i = 0; i < headers.length; i++) {
    let score = 0;
    if (/date|day|when/i.test(headers[i] || "")) score += 2;
    if (sampleRow && splitDate(sampleRow[i] || "")) score += 3;
    if (score > dateScore) {
      dateScore = score;
      dateColumn = score > 0 ? i : -1;
    }
  }

  const roles: ColumnRole[] = headers.map((header, i) => {
    if (i === dateColumn) return { kind: "date" };
    const lower = (header || "").toLowerCase().trim();
    if (!lower) return { kind: "skip" };
    if (COMPUTED_COLUMN_HINTS.some((hint) => lower.includes(hint))) return { kind: "skip" };

    // Find best account match by substring (either direction) on name or bucket.
    let best: { id: string; score: number } | null = null;
    for (const a of lowerAccounts) {
      if (usedAccounts.has(a.id)) continue;
      let s = 0;
      if (lower === a.name) s = 100;
      else if (lower.includes(a.name) || a.name.includes(lower)) s = 50;
      else if (lower.includes(a.bucket) || a.bucket.includes(lower)) s = 25;
      if (s > 0 && (!best || s > best.score)) {
        best = { id: a.id, score: s };
      }
    }

    if (best) {
      usedAccounts.add(best.id);
      return { kind: "account", accountId: best.id };
    }
    return { kind: "skip" };
  });

  return roles;
}

// ─── Plan validation ─────────────────────────────────────────────────────────

export interface PlanValidation {
  valid: boolean;
  reasons: string[];
}

export function validatePlan(plan: ImportPlan): PlanValidation {
  const reasons: string[] = [];
  const dateCount = plan.columnRoles.filter((r) => r.kind === "date").length;
  if (dateCount === 0) reasons.push("Pick a Date column.");
  if (dateCount > 1) reasons.push("Only one column can be the Date column.");
  const accountCount = plan.columnRoles.filter((r) => r.kind === "account").length;
  if (accountCount === 0) reasons.push("Map at least one column to an account.");
  return { valid: reasons.length === 0, reasons };
}

// ─── Build snapshots ──────────────────────────────────────────────────────────

export function buildSnapshotsFromImport(
  table: ParsedTable,
  plan: ImportPlan,
  existing: AccountHistorySnapshot[]
): ImportResult {
  const errors: ImportRowError[] = [];
  const existingByDate = new Map<string, AccountHistorySnapshot>(existing.map((s) => [s.date, s]));
  const dateColumn = plan.columnRoles.findIndex((r) => r.kind === "date");
  const accountColumns: Array<{ index: number; accountId: string }> = [];
  for (let i = 0; i < plan.columnRoles.length; i++) {
    const role = plan.columnRoles[i];
    if (role.kind === "account") accountColumns.push({ index: i, accountId: role.accountId });
  }

  if (dateColumn === -1 || accountColumns.length === 0) {
    return { snapshots: existing, errors: [{ row: 0, message: "Invalid plan." }], newDates: 0, skippedDuplicates: 0, replacedDuplicates: 0 };
  }

  // Build by date: latest row for a given date wins within the imported set
  const importedByDate = new Map<string, Record<string, number>>();
  for (let r = 0; r < table.rows.length; r++) {
    const row = table.rows[r];
    const rawDate = row[dateColumn] ?? "";
    const date = parseDateForFormat(rawDate, plan.dateFormat);
    if (!date) {
      errors.push({ row: r + 1, message: `Couldn't parse date "${rawDate}".` });
      continue;
    }
    const balances: Record<string, number> = importedByDate.get(date) ?? {};
    for (const { index, accountId } of accountColumns) {
      const cell = row[index] ?? "";
      const numeric = parseNumericCell(cell);
      // Empty cell = 0 for that account on that date.
      balances[accountId] = numeric === null ? 0 : Number(numeric.toFixed(2));
    }
    importedByDate.set(date, balances);
  }

  let newDates = 0;
  let skippedDuplicates = 0;
  let replacedDuplicates = 0;
  const merged = new Map<string, AccountHistorySnapshot>(existingByDate);

  for (const [date, balances] of importedByDate.entries()) {
    const exists = existingByDate.get(date);
    if (exists) {
      if (plan.duplicatePolicy === "skip") {
        skippedDuplicates++;
        continue;
      }
      // Replace: keep id, swap balances. (Other accounts not in the import default to 0
      // would erase good data, so merge: imported balances overwrite per-account, others kept.)
      merged.set(date, { ...exists, balances: { ...exists.balances, ...balances } });
      replacedDuplicates++;
    } else {
      newDates++;
      merged.set(date, { id: createLocalId("acct_hist"), date, balances });
    }
  }

  const snapshots = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { snapshots, errors, newDates, skippedDuplicates, replacedDuplicates };
}
