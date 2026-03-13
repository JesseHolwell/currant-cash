import type {
  AccountEntry,
  AccountHistorySnapshot,
  AccountKind,
  GoalEntry,
  RawTransaction,
  SankeyMeta,
  TransactionBatch
} from "./types";
import { createLocalId } from "./utils";

export function parseStoredAccountEntries(raw: unknown): AccountEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: AccountEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as {
      id?: unknown;
      name?: unknown;
      bucket?: unknown;
      kind?: unknown;
      value?: unknown;
    };
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!name) {
      continue;
    }
    const bucket = typeof candidate.bucket === "string" && candidate.bucket.trim() ? candidate.bucket.trim() : "Other";
    const kind: AccountKind = candidate.kind === "liability" ? "liability" : "asset";
    const numericValue = typeof candidate.value === "number" ? candidate.value : Number(candidate.value);
    next.push({
      id: typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : createLocalId("acct"),
      name,
      bucket,
      kind,
      value: Number.isFinite(numericValue) ? Number(numericValue.toFixed(2)) : 0
    });
  }
  return next;
}

export function parseStoredGoals(raw: unknown): GoalEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: GoalEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as {
      id?: unknown;
      name?: unknown;
      target?: unknown;
      current?: unknown;
      trackingMode?: unknown;
      accountIds?: unknown;
    };
    const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
    if (!name) {
      continue;
    }
    const target = typeof candidate.target === "number" ? candidate.target : Number(candidate.target);
    const current = typeof candidate.current === "number" ? candidate.current : Number(candidate.current);
    const trackingMode = candidate.trackingMode === "accounts"
      || candidate.trackingMode === "netWorth"
      || candidate.trackingMode === "manual"
      ? candidate.trackingMode
      : "manual";
    const accountIds = Array.isArray(candidate.accountIds)
      ? candidate.accountIds.filter((accountId): accountId is string => typeof accountId === "string" && accountId.trim().length > 0)
      : [];
    next.push({
      id: typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : createLocalId("goal"),
      name,
      target: Number.isFinite(target) ? Number(target.toFixed(2)) : 0,
      current: Number.isFinite(current) ? Number(current.toFixed(2)) : 0,
      trackingMode,
      accountIds
    });
  }
  return next;
}

export function parseStoredAccountHistory(raw: unknown): AccountHistorySnapshot[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: AccountHistorySnapshot[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as {
      id?: unknown;
      month?: unknown;
      balances?: unknown;
    };
    if (typeof candidate.month !== "string" || !/^\d{4}-\d{2}$/.test(candidate.month)) {
      continue;
    }
    const balances: Record<string, number> = {};
    if (candidate.balances && typeof candidate.balances === "object") {
      for (const [accountId, value] of Object.entries(candidate.balances as Record<string, unknown>)) {
        const numericValue = typeof value === "number" ? value : Number(value);
        if (!Number.isFinite(numericValue)) {
          continue;
        }
        balances[accountId] = Number(numericValue.toFixed(2));
      }
    }
    next.push({
      id: typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : createLocalId("acct_hist"),
      month: candidate.month,
      balances
    });
  }
  return next.sort((a, b) => a.month.localeCompare(b.month));
}

export function parseForecastSettings(raw: unknown): { startNetWorth: number | null; monthlyDelta: number | null } {
  if (!raw || typeof raw !== "object") {
    return { startNetWorth: null, monthlyDelta: null };
  }
  const candidate = raw as { startNetWorth?: unknown; monthlyDelta?: unknown };
  const start = Number(candidate.startNetWorth);
  const delta = Number(candidate.monthlyDelta);
  return {
    startNetWorth: Number.isFinite(start) ? Number(start.toFixed(2)) : null,
    monthlyDelta: Number.isFinite(delta) ? Number(delta.toFixed(2)) : null
  };
}

export function parseStoredRawTransactions(raw: unknown): RawTransaction[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: RawTransaction[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as Partial<RawTransaction>;
    if (
      typeof candidate.id !== "string"
      || typeof candidate.date !== "string"
      || typeof candidate.accountId !== "string"
      || typeof candidate.merchant !== "string"
      || typeof candidate.narrative !== "string"
      || typeof candidate.amount !== "number"
      || (candidate.direction !== "debit" && candidate.direction !== "credit" && candidate.direction !== "neutral")
      || typeof candidate.category !== "string"
      || typeof candidate.categoryReason !== "string"
    ) {
      continue;
    }
    next.push({
      id: candidate.id,
      date: candidate.date,
      accountId: candidate.accountId,
      merchant: candidate.merchant,
      narrative: candidate.narrative,
      amount: candidate.amount,
      direction: candidate.direction,
      category: candidate.category,
      categoryReason: candidate.categoryReason,
      categoryGroup: typeof candidate.categoryGroup === "string" ? candidate.categoryGroup : undefined,
      manualNickname: typeof candidate.manualNickname === "string" ? candidate.manualNickname : undefined,
      manualCategoryGroup: typeof candidate.manualCategoryGroup === "string" ? candidate.manualCategoryGroup : undefined,
      manualCategory: typeof candidate.manualCategory === "string" ? candidate.manualCategory : undefined,
      similarityKey: typeof candidate.similarityKey === "string" ? candidate.similarityKey : undefined,
      manualSource: candidate.manualSource === "id" || candidate.manualSource === "similar" ? candidate.manualSource : undefined
    });
  }
  return next;
}

export function parseStoredTransactionBatches(raw: unknown): TransactionBatch[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: TransactionBatch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as Partial<TransactionBatch>;
    const fileName = typeof candidate.fileName === "string" ? candidate.fileName.trim() : "";
    const importedAt = typeof candidate.importedAt === "string" ? candidate.importedAt : "";
    const observedStart = typeof candidate.observedStart === "string" ? candidate.observedStart : "";
    const observedEnd = typeof candidate.observedEnd === "string" ? candidate.observedEnd : "";
    const coverageStart = typeof candidate.coverageStart === "string" ? candidate.coverageStart : observedStart;
    const coverageEnd = typeof candidate.coverageEnd === "string" ? candidate.coverageEnd : observedEnd;
    const transactions = parseStoredRawTransactions(candidate.transactions);
    if (!fileName || !importedAt || !observedStart || !observedEnd || !coverageStart || !coverageEnd || transactions.length === 0) {
      continue;
    }

    const warnings = Array.isArray(candidate.warnings)
      ? candidate.warnings.filter((warning): warning is string => typeof warning === "string")
      : [];
    const transactionCount = typeof candidate.transactionCount === "number"
      ? candidate.transactionCount
      : Number(candidate.transactionCount);
    const warningCount = typeof candidate.warningCount === "number"
      ? candidate.warningCount
      : Number(candidate.warningCount);

    next.push({
      id: typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : createLocalId("batch"),
      fileName,
      importedAt,
      observedStart,
      observedEnd,
      coverageStart,
      coverageEnd,
      transactionCount: Number.isFinite(transactionCount) ? transactionCount : transactions.length,
      warningCount: Number.isFinite(warningCount) ? warningCount : warnings.length,
      warnings,
      transactions
    });
  }
  return next.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export function parseStoredSankeyMeta(raw: unknown): SankeyMeta | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }
  const candidate = raw as Partial<SankeyMeta>;
  if (typeof candidate.generatedAt !== "string" || typeof candidate.currency !== "string") {
    return null;
  }
  return {
    generatedAt: candidate.generatedAt,
    currency: candidate.currency
  };
}
