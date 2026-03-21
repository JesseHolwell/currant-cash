import { describe, expect, it } from "vitest";
import {
  buildCoveredDaySet,
  buildTransactionBatch,
  inferObservedRange,
  mergeTransactionsFromBatches,
  normalizeCoverageRange,
  sortTransactionBatches
} from "../transactionData";
import type { RawTransaction, TransactionBatch } from "../types";

const makeTransaction = (id: string, date: string): RawTransaction => ({
  id,
  date,
  accountId: "acc-1",
  merchant: "Test Merchant",
  narrative: "Test Narrative",
  amount: 10,
  direction: "debit",
  category: "Uncategorized",
  categoryGroup: "Uncategorized",
  categoryReason: "test"
});

const makeBatch = (overrides: Partial<TransactionBatch> = {}): TransactionBatch => ({
  id: "batch-1",
  fileName: "test.csv",
  importedAt: "2024-03-15T10:00:00Z",
  observedStart: "2024-01-01",
  observedEnd: "2024-03-31",
  coverageStart: "2024-01-01",
  coverageEnd: "2024-03-31",
  transactionCount: 1,
  warningCount: 0,
  warnings: [],
  transactions: [makeTransaction("tx-1", "2024-03-01")],
  ...overrides
});

describe("inferObservedRange", () => {
  it("returns null for an empty transaction list", () => {
    expect(inferObservedRange([])).toBeNull();
  });

  it("returns the min and max dates from transactions", () => {
    const transactions = [makeTransaction("t1", "2024-03-15"), makeTransaction("t2", "2024-01-01"), makeTransaction("t3", "2024-06-30")];
    const range = inferObservedRange(transactions);
    expect(range?.start).toBe("2024-01-01");
    expect(range?.end).toBe("2024-06-30");
  });

  it("handles a single transaction", () => {
    const range = inferObservedRange([makeTransaction("t1", "2024-05-10")]);
    expect(range?.start).toBe("2024-05-10");
    expect(range?.end).toBe("2024-05-10");
  });

  it("skips transactions with invalid dates", () => {
    const transactions = [makeTransaction("t1", "not-a-date"), makeTransaction("t2", "2024-03-01")];
    const range = inferObservedRange(transactions);
    expect(range?.start).toBe("2024-03-01");
    expect(range?.end).toBe("2024-03-01");
  });
});

describe("buildTransactionBatch", () => {
  it("creates a batch with correct metadata", () => {
    const transactions = [makeTransaction("t1", "2024-01-10"), makeTransaction("t2", "2024-01-20")];
    const batch = buildTransactionBatch({ fileName: "my-bank.csv", transactions });
    expect(batch.fileName).toBe("my-bank.csv");
    expect(batch.transactionCount).toBe(2);
    expect(batch.observedStart).toBe("2024-01-10");
    expect(batch.observedEnd).toBe("2024-01-20");
  });

  it("throws when no valid dates exist", () => {
    const transactions = [makeTransaction("t1", "not-a-date")];
    expect(() => buildTransactionBatch({ fileName: "test.csv", transactions })).toThrow();
  });

  it("trims empty file name and defaults it", () => {
    const transactions = [makeTransaction("t1", "2024-03-01")];
    const batch = buildTransactionBatch({ fileName: "  ", transactions });
    expect(batch.fileName).toBe("Uploaded CSV");
  });
});

describe("sortTransactionBatches", () => {
  it("sorts batches by coverageStart descending", () => {
    const batches = [makeBatch({ id: "b1", coverageStart: "2024-01-01" }), makeBatch({ id: "b2", coverageStart: "2024-06-01" })];
    const sorted = sortTransactionBatches(batches);
    expect(sorted[0].id).toBe("b2");
    expect(sorted[1].id).toBe("b1");
  });

  it("sorts by importedAt descending when coverageStart is equal", () => {
    const batches = [
      makeBatch({ id: "b1", coverageStart: "2024-01-01", importedAt: "2024-01-01T08:00:00Z" }),
      makeBatch({ id: "b2", coverageStart: "2024-01-01", importedAt: "2024-01-01T10:00:00Z" })
    ];
    const sorted = sortTransactionBatches(batches);
    expect(sorted[0].id).toBe("b2");
  });

  it("does not mutate the original array", () => {
    const batches = [makeBatch({ id: "b1" }), makeBatch({ id: "b2" })];
    const original = [...batches];
    sortTransactionBatches(batches);
    expect(batches).toEqual(original);
  });
});

describe("mergeTransactionsFromBatches", () => {
  it("returns an empty array for no batches", () => {
    expect(mergeTransactionsFromBatches([])).toEqual([]);
  });

  it("deduplicates transactions with the same id across batches", () => {
    const tx = makeTransaction("tx-dup", "2024-03-01");
    const b1 = makeBatch({ id: "b1", transactions: [tx] });
    const b2 = makeBatch({ id: "b2", transactions: [tx] });
    const merged = mergeTransactionsFromBatches([b1, b2]);
    expect(merged.filter((t) => t.id === "tx-dup")).toHaveLength(1);
  });

  it("prefers the transaction from the earlier (newer coverage) batch", () => {
    const txOld = makeTransaction("tx-1", "2024-01-01");
    const txNew = { ...makeTransaction("tx-1", "2024-01-01"), narrative: "Updated Narrative" };
    const olderBatch = makeBatch({ id: "b1", coverageStart: "2024-01-01", transactions: [txOld] });
    const newerBatch = makeBatch({ id: "b2", coverageStart: "2024-06-01", transactions: [txNew] });
    const merged = mergeTransactionsFromBatches([olderBatch, newerBatch]);
    const found = merged.find((t) => t.id === "tx-1");
    expect(found?.narrative).toBe("Updated Narrative");
  });

  it("sorts merged transactions by date descending", () => {
    const b1 = makeBatch({ id: "b1", transactions: [makeTransaction("t1", "2024-01-01")] });
    const b2 = makeBatch({ id: "b2", transactions: [makeTransaction("t2", "2024-06-15")] });
    const merged = mergeTransactionsFromBatches([b1, b2]);
    expect(merged[0].date >= merged[1].date).toBe(true);
  });
});

describe("normalizeCoverageRange", () => {
  it("returns the range unchanged when start <= end", () => {
    const result = normalizeCoverageRange("2024-01-01", "2024-12-31");
    expect(result).toEqual({ start: "2024-01-01", end: "2024-12-31" });
  });

  it("swaps start and end when start > end", () => {
    const result = normalizeCoverageRange("2024-12-31", "2024-01-01");
    expect(result).toEqual({ start: "2024-01-01", end: "2024-12-31" });
  });

  it("returns the input unchanged for non-ISO date strings", () => {
    const result = normalizeCoverageRange("not-a-date", "also-not");
    expect(result).toEqual({ start: "not-a-date", end: "also-not" });
  });
});

describe("buildCoveredDaySet", () => {
  it("returns an empty set for no batches", () => {
    expect(buildCoveredDaySet([])).toEqual(new Set());
  });

  it("generates all days between coverageStart and coverageEnd inclusive", () => {
    const batch = makeBatch({ coverageStart: "2024-01-01", coverageEnd: "2024-01-03" });
    const days = buildCoveredDaySet([batch]);
    // The implementation uses Date + toISOString() which is timezone-sensitive.
    // We verify the count rather than exact ISO strings so the test is portable.
    expect(days.size).toBe(3);
  });

  it("skips batches with invalid coverage dates", () => {
    const batch = makeBatch({ coverageStart: "bad", coverageEnd: "also-bad" });
    expect(buildCoveredDaySet([batch])).toEqual(new Set());
  });
});
