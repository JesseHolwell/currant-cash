import { describe, expect, it } from "vitest";
import {
  parsePastedTable,
  parseNumericCell,
  detectDateFormat,
  parseDateForFormat,
  suggestColumnMappings,
  buildSnapshotsFromImport,
  validatePlan,
  type ImportPlan
} from "../snapshotImport";
import type { AccountEntry, AccountHistorySnapshot } from "../types";

describe("parsePastedTable", () => {
  it("parses tab-separated paste from a spreadsheet", () => {
    const text = "Date\tDebit\tSavings\n07/12/2021\t1000\t2000\n11/01/2022\t1500\t2200";
    const t = parsePastedTable(text);
    expect(t.delimiter).toBe("\t");
    expect(t.hadHeaderRow).toBe(true);
    expect(t.headers).toEqual(["Date", "Debit", "Savings"]);
    expect(t.rows).toEqual([
      ["07/12/2021", "1000", "2000"],
      ["11/01/2022", "1500", "2200"]
    ]);
  });

  it("parses CSV with quoted cells", () => {
    const text = 'Date,Account,Balance\n2022-01-01,"My, account","1,234.56"';
    const t = parsePastedTable(text);
    expect(t.delimiter).toBe(",");
    expect(t.rows[0]).toEqual(["2022-01-01", "My, account", "1,234.56"]);
  });

  it("falls back to generated headers when first row looks numeric", () => {
    const text = "2022-01-01\t1000\t2000\n2022-02-01\t1500\t2200";
    const t = parsePastedTable(text);
    expect(t.hadHeaderRow).toBe(false);
    expect(t.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
    expect(t.rows.length).toBe(2);
  });

  it("normalizes ragged rows to the widest width", () => {
    const text = "Date\tA\tB\tC\n2022-01-01\t1\t2";
    const t = parsePastedTable(text);
    expect(t.rows[0]).toEqual(["2022-01-01", "1", "2", ""]);
  });
});

describe("parseNumericCell", () => {
  it("strips currency and commas", () => {
    expect(parseNumericCell("$1,234.56")).toBe(1234.56);
    expect(parseNumericCell("€12 345")).toBe(12345);
  });

  it("handles accounting parens as negative", () => {
    expect(parseNumericCell("($500.25)")).toBe(-500.25);
  });

  it("returns null for empty/non-numeric", () => {
    expect(parseNumericCell("")).toBeNull();
    expect(parseNumericCell("  ")).toBeNull();
    expect(parseNumericCell("-")).toBeNull();
    expect(parseNumericCell("abc")).toBeNull();
  });
});

describe("detectDateFormat", () => {
  it("locks DMY when first segment exceeds 12", () => {
    expect(detectDateFormat(["25/04/2023", "10/05/2024"])).toBe("DMY");
  });

  it("locks MDY when second segment exceeds 12", () => {
    expect(detectDateFormat(["04/25/2023", "05/10/2024"])).toBe("MDY");
  });

  it("detects YMD with 4-digit leading year", () => {
    expect(detectDateFormat(["2023-04-25", "2024-05-10"])).toBe("YMD");
  });

  it("defaults to DMY when ambiguous", () => {
    expect(detectDateFormat(["01/02/2024", "03/04/2024"])).toBe("DMY");
  });
});

describe("parseDateForFormat", () => {
  it("parses DMY into ISO", () => {
    expect(parseDateForFormat("07/12/2021", "DMY")).toBe("2021-12-07");
  });

  it("parses MDY into ISO", () => {
    expect(parseDateForFormat("12/07/2021", "MDY")).toBe("2021-12-07");
  });

  it("parses YMD into ISO", () => {
    expect(parseDateForFormat("2021-12-07", "YMD")).toBe("2021-12-07");
  });

  it("handles 2-digit years", () => {
    expect(parseDateForFormat("07/12/22", "DMY")).toBe("2022-12-07");
    expect(parseDateForFormat("07/12/85", "DMY")).toBe("1985-12-07");
  });

  it("rejects invalid dates", () => {
    expect(parseDateForFormat("32/01/2024", "DMY")).toBeNull();
    expect(parseDateForFormat("not a date", "DMY")).toBeNull();
  });
});

const ACCOUNTS: AccountEntry[] = [
  { id: "debit", name: "Debit", bucket: "Bank", kind: "asset", value: 0 },
  { id: "savings", name: "Savings", bucket: "Bank", kind: "asset", value: 0 },
  { id: "crypto", name: "Crypto", bucket: "Crypto", kind: "asset", value: 0 },
  { id: "shares", name: "Shares", bucket: "Stocks", kind: "asset", value: 0 },
  { id: "credit", name: "Credit", bucket: "Debt", kind: "liability", value: 0 }
];

describe("suggestColumnMappings", () => {
  it("identifies the date column", () => {
    const roles = suggestColumnMappings(
      ["Date", "Westpac Debit", "Savings"],
      ["07/12/2021", "1000", "2000"],
      ACCOUNTS
    );
    expect(roles[0]).toEqual({ kind: "date" });
  });

  it("matches account columns by substring", () => {
    const roles = suggestColumnMappings(
      ["Date", "Westpac Debit", "Savings"],
      ["07/12/2021", "1000", "2000"],
      ACCOUNTS
    );
    expect(roles[1]).toEqual({ kind: "account", accountId: "debit" });
    expect(roles[2]).toEqual({ kind: "account", accountId: "savings" });
  });

  it("skips computed/aggregate columns", () => {
    const roles = suggestColumnMappings(
      ["Date", "Debit", "Assets", "Net worth"],
      ["07/12/2021", "1000", "5000", "5000"],
      ACCOUNTS
    );
    expect(roles[2]).toEqual({ kind: "skip" });
    expect(roles[3]).toEqual({ kind: "skip" });
  });

  it("doesn't assign the same account twice", () => {
    const roles = suggestColumnMappings(
      ["Date", "Westpac Debit", "Another Debit"],
      ["07/12/2021", "1000", "2000"],
      ACCOUNTS
    );
    const assigned = roles.filter((r) => r.kind === "account").map((r) => (r.kind === "account" ? r.accountId : ""));
    expect(new Set(assigned).size).toBe(assigned.length);
  });
});

describe("validatePlan", () => {
  it("flags missing date column", () => {
    const plan: ImportPlan = {
      columnRoles: [{ kind: "account", accountId: "debit" }],
      dateFormat: "DMY",
      duplicatePolicy: "skip"
    };
    expect(validatePlan(plan).valid).toBe(false);
  });

  it("flags zero account mappings", () => {
    const plan: ImportPlan = {
      columnRoles: [{ kind: "date" }],
      dateFormat: "DMY",
      duplicatePolicy: "skip"
    };
    expect(validatePlan(plan).valid).toBe(false);
  });

  it("passes a valid plan", () => {
    const plan: ImportPlan = {
      columnRoles: [{ kind: "date" }, { kind: "account", accountId: "debit" }],
      dateFormat: "DMY",
      duplicatePolicy: "skip"
    };
    expect(validatePlan(plan).valid).toBe(true);
  });
});

describe("buildSnapshotsFromImport", () => {
  const table = parsePastedTable(
    "Date\tDebit\tSavings\n07/12/2021\t1000\t2000\n11/01/2022\t1500\t2200"
  );

  it("creates new snapshots with parsed dates", () => {
    const plan: ImportPlan = {
      columnRoles: [
        { kind: "date" },
        { kind: "account", accountId: "debit" },
        { kind: "account", accountId: "savings" }
      ],
      dateFormat: "DMY",
      duplicatePolicy: "skip"
    };
    const result = buildSnapshotsFromImport(table, plan, []);
    expect(result.errors).toEqual([]);
    expect(result.newDates).toBe(2);
    expect(result.snapshots.length).toBe(2);
    expect(result.snapshots[0].date).toBe("2021-12-07");
    expect(result.snapshots[0].balances.debit).toBe(1000);
    expect(result.snapshots[1].date).toBe("2022-01-11");
  });

  it("skips duplicates when policy is skip", () => {
    const existing: AccountHistorySnapshot[] = [
      { id: "x", date: "2021-12-07", balances: { debit: 999 } }
    ];
    const plan: ImportPlan = {
      columnRoles: [
        { kind: "date" },
        { kind: "account", accountId: "debit" },
        { kind: "account", accountId: "savings" }
      ],
      dateFormat: "DMY",
      duplicatePolicy: "skip"
    };
    const result = buildSnapshotsFromImport(table, plan, existing);
    expect(result.skippedDuplicates).toBe(1);
    expect(result.newDates).toBe(1);
    const dec = result.snapshots.find((s) => s.date === "2021-12-07")!;
    expect(dec.balances.debit).toBe(999); // unchanged
  });

  it("merges balances when policy is replace", () => {
    const existing: AccountHistorySnapshot[] = [
      { id: "x", date: "2021-12-07", balances: { debit: 999, crypto: 50 } }
    ];
    const plan: ImportPlan = {
      columnRoles: [
        { kind: "date" },
        { kind: "account", accountId: "debit" },
        { kind: "account", accountId: "savings" }
      ],
      dateFormat: "DMY",
      duplicatePolicy: "replace"
    };
    const result = buildSnapshotsFromImport(table, plan, existing);
    expect(result.replacedDuplicates).toBe(1);
    const dec = result.snapshots.find((s) => s.date === "2021-12-07")!;
    expect(dec.balances.debit).toBe(1000); // overwritten
    expect(dec.balances.crypto).toBe(50);  // preserved (not imported)
  });

  it("records errors for unparseable date rows but continues", () => {
    const tbl = parsePastedTable("Date\tDebit\nNOT_A_DATE\t100\n01/01/2024\t200");
    const plan: ImportPlan = {
      columnRoles: [{ kind: "date" }, { kind: "account", accountId: "debit" }],
      dateFormat: "DMY",
      duplicatePolicy: "skip"
    };
    const result = buildSnapshotsFromImport(tbl, plan, []);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].row).toBe(1);
    expect(result.newDates).toBe(1);
  });
});
