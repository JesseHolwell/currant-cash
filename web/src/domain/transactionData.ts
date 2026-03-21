import type { RawTransaction, SankeyMeta, TransactionBatch } from "./types";
import { createLocalId } from "./utils";

function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function sortTransactionBatches(batches: TransactionBatch[]): TransactionBatch[] {
  return [...batches].sort((a, b) => {
    if (a.coverageStart !== b.coverageStart) {
      return b.coverageStart.localeCompare(a.coverageStart);
    }
    return b.importedAt.localeCompare(a.importedAt);
  });
}

export function inferObservedRange(transactions: RawTransaction[]): { start: string; end: string } | null {
  if (transactions.length === 0) {
    return null;
  }
  const dates = transactions
    .map((transaction) => transaction.date)
    .filter((date) => isIsoDate(date))
    .sort((a, b) => a.localeCompare(b));
  if (dates.length === 0) {
    return null;
  }
  return {
    start: dates[0],
    end: dates[dates.length - 1]
  };
}

export function buildTransactionBatch({
  fileName,
  importedAt,
  transactions,
  warnings
}: {
  fileName: string;
  importedAt?: string;
  transactions: RawTransaction[];
  warnings?: string[];
}): TransactionBatch {
  const observedRange = inferObservedRange(transactions);
  if (!observedRange) {
    throw new Error("Cannot build a transaction batch without valid transaction dates.");
  }

  const safeWarnings = warnings ?? [];
  return {
    id: createLocalId("batch"),
    fileName: fileName.trim() || "Uploaded CSV",
    importedAt: importedAt ?? new Date().toISOString(),
    observedStart: observedRange.start,
    observedEnd: observedRange.end,
    coverageStart: observedRange.start,
    coverageEnd: observedRange.end,
    transactionCount: transactions.length,
    warningCount: safeWarnings.length,
    warnings: safeWarnings,
    transactions
  };
}

export function mergeTransactionsFromBatches(batches: TransactionBatch[]): RawTransaction[] {
  const deduped = new Map<string, RawTransaction>();
  const orderedBatches = sortTransactionBatches(batches);

  for (const batch of orderedBatches) {
    for (const transaction of batch.transactions) {
      if (!deduped.has(transaction.id)) {
        deduped.set(transaction.id, transaction);
      }
    }
  }

  return [...deduped.values()].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return a.id.localeCompare(b.id);
  });
}

export function normalizeCoverageRange(start: string, end: string): { start: string; end: string } {
  if (!isIsoDate(start) || !isIsoDate(end)) {
    return { start, end };
  }
  if (start <= end) {
    return { start, end };
  }
  return { start: end, end: start };
}

export function deriveMetaFromBatches(batches: TransactionBatch[]): SankeyMeta {
  if (batches.length === 0) {
    return { generatedAt: "", currency: "AUD" };
  }
  const latest = [...batches].sort((a, b) => b.importedAt.localeCompare(a.importedAt))[0];
  return {
    generatedAt: latest?.importedAt ?? "",
    currency: "AUD"
  };
}

export function buildCoveredDaySet(batches: TransactionBatch[]): Set<string> {
  const coveredDays = new Set<string>();
  for (const batch of batches) {
    if (!isIsoDate(batch.coverageStart) || !isIsoDate(batch.coverageEnd)) {
      continue;
    }
    const { start, end } = normalizeCoverageRange(batch.coverageStart, batch.coverageEnd);
    const cursor = new Date(`${start}T00:00:00`);
    const finalTime = new Date(`${end}T00:00:00`).getTime();
    while (!Number.isNaN(cursor.getTime()) && cursor.getTime() <= finalTime) {
      coveredDays.add(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }
  }
  return coveredDays;
}
