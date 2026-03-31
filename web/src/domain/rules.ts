import {
  CATEGORY_GROUP_ALIAS_MAP,
  EXCLUDED_CATEGORIES,
  EXCLUDED_INCOME_CATEGORIES,
  INCOME_SOURCE_ALIASES,
  MERCHANT_ALIASES
} from "./constants";
import { EMPTY_MANUAL_RULES } from "./constants";
import type {
  ManualRule,
  ManualRulesState,
  RawTransaction,
  TransactionDraft
} from "./types";
import {
  cleanupLabel,
  findAliasLabel,
  normalizeForMatch,
  toTitleLabel
} from "./utils";

export function normalizeSimilarityKey(value: string): string {
  return normalizeForMatch(value)
    .replace(/\b\d+\b/g, " ")
    .replace(/\b(?:aus|australia|sydney|melbourne|pty|ltd|debit|visa|mastercard|card|payment|withdrawal|deposit|online|pymt|help|frgn|amt)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function canonicalizeCategoryGroup(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) {
    return "";
  }
  return CATEGORY_GROUP_ALIAS_MAP.get(normalizeForMatch(trimmed)) ?? trimmed;
}

export function resolveCategoryGroupBucket(transaction: RawTransaction): string {
  const bucket = canonicalizeCategoryGroup(transaction.categoryGroup ?? transaction.category);
  return bucket.length > 0 ? bucket : "Uncategorized";
}

export function resolveSubcategoryBucket(transaction: RawTransaction): string {
  const subcategory = transaction.category?.trim() ?? "";
  if (subcategory.length > 0) {
    return subcategory;
  }
  return resolveCategoryGroupBucket(transaction);
}

export function isExcludedFromSpendAnalytics(transaction: RawTransaction): boolean {
  return EXCLUDED_CATEGORIES.has(resolveCategoryGroupBucket(transaction));
}

export function isExcludedFromIncomeAnalytics(transaction: RawTransaction): boolean {
  return EXCLUDED_INCOME_CATEGORIES.has(resolveCategoryGroupBucket(transaction));
}

export function groupSubcategoryKey(group: string, subcategory: string): string {
  return `${group}\u0000${subcategory}`;
}

export function similarityKeyForTransaction(transaction: RawTransaction): string {
  const joined = `${transaction.merchant} ${transaction.narrative}`.trim();
  const key = normalizeSimilarityKey(joined);
  if (key.length > 0) {
    return key;
  }
  return normalizeForMatch(transaction.merchant || transaction.narrative || transaction.id);
}

export function sanitizeManualRule(rule: ManualRule): ManualRule | null {
  const categoryGroup = canonicalizeCategoryGroup(rule.categoryGroup);
  const category = rule.category?.trim() || "";
  const nickname = rule.nickname?.trim() || "";
  const next: ManualRule = {};
  if (categoryGroup.length > 0) {
    next.categoryGroup = categoryGroup;
  }
  if (category.length > 0) {
    next.category = category;
  }
  if (nickname.length > 0) {
    next.nickname = nickname;
  }
  return Object.keys(next).length > 0 ? next : null;
}

export function applyManualRules(transactions: RawTransaction[], rules: ManualRulesState): RawTransaction[] {
  return transactions.map((transaction) => {
    const similarityKey = similarityKeyForTransaction(transaction);
    const similarityRule = rules.bySimilarity[similarityKey];
    const directRule = rules.byId[transaction.id];
    const mergedRule: ManualRule = {
      ...(similarityRule ?? {}),
      ...(directRule ?? {})
    };
    const cleanRule = sanitizeManualRule(mergedRule);
    return {
      ...transaction,
      similarityKey,
      manualSource: directRule ? "id" : similarityRule ? "similar" : undefined,
      classificationSource: directRule
        ? "manual-id"
        : similarityRule
          ? "manual-similar"
          : transaction.classificationSource,
      manualNickname: cleanRule?.nickname,
      manualCategoryGroup: cleanRule?.categoryGroup,
      manualCategory: cleanRule?.category,
      category: cleanRule?.category ?? transaction.category,
      categoryGroup: cleanRule?.categoryGroup ?? canonicalizeCategoryGroup(transaction.categoryGroup ?? transaction.category)
    };
  });
}

export function parseStoredManualRules(raw: unknown): ManualRulesState {
  if (!raw || typeof raw !== "object") {
    return EMPTY_MANUAL_RULES;
  }
  const parsed = raw as Partial<ManualRulesState>;
  const byId: Record<string, ManualRule> = {};
  const bySimilarity: Record<string, ManualRule> = {};

  for (const [id, rule] of Object.entries(parsed.byId ?? {})) {
    const cleaned = sanitizeManualRule(rule ?? {});
    if (cleaned) {
      byId[id] = cleaned;
    }
  }

  for (const [similarity, rule] of Object.entries(parsed.bySimilarity ?? {})) {
    const cleaned = sanitizeManualRule(rule ?? {});
    if (cleaned) {
      bySimilarity[similarity] = cleaned;
    }
  }

  return { byId, bySimilarity };
}

export function parseStoredDrafts(raw: unknown): Record<string, TransactionDraft> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const parsedDrafts = raw as Record<string, TransactionDraft>;
  const normalizedDrafts: Record<string, TransactionDraft> = {};
  for (const [transactionId, draft] of Object.entries(parsedDrafts)) {
    normalizedDrafts[transactionId] = {
      categoryGroup: canonicalizeCategoryGroup(draft.categoryGroup),
      category: (draft.category ?? "").trim(),
      nickname: draft.nickname ?? "",
      applySimilar: draft.applySimilar !== false
    };
  }
  return normalizedDrafts;
}

export function resolveIncomeSource(transaction: RawTransaction): string {
  if (transaction.manualNickname && transaction.manualNickname.trim().length > 0) {
    return transaction.manualNickname.trim();
  }
  const text = `${transaction.merchant} ${transaction.narrative}`.trim();
  const alias = findAliasLabel(text, INCOME_SOURCE_ALIASES);
  if (alias) {
    return alias;
  }

  const raw = transaction.merchant || transaction.narrative || "Income";
  return cleanupLabel(toTitleLabel(raw));
}

export function resolveMerchantBucket(transaction: RawTransaction): string {
  if (transaction.manualNickname && transaction.manualNickname.trim().length > 0) {
    return transaction.manualNickname.trim();
  }
  const text = `${transaction.merchant} ${transaction.narrative}`.trim();
  const alias = findAliasLabel(text, MERCHANT_ALIASES);
  if (alias) {
    return alias;
  }

  const raw = transaction.merchant || transaction.narrative || "Unspecified Merchant";
  return cleanupLabel(toTitleLabel(raw));
}
