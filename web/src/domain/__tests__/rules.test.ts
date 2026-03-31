import { describe, expect, it } from "vitest";
import {
  applyManualRules,
  canonicalizeCategoryGroup,
  isExcludedFromIncomeAnalytics,
  isExcludedFromSpendAnalytics,
  normalizeSimilarityKey,
  resolveCategoryGroupBucket,
  sanitizeManualRule,
  similarityKeyForTransaction
} from "../rules";
import type { ManualRulesState, RawTransaction } from "../types";

const makeTransaction = (overrides: Partial<RawTransaction> = {}): RawTransaction => ({
  id: "tx-001",
  date: "2024-03-15",
  accountId: "acc-1",
  merchant: "Woolworths",
  narrative: "Woolworths 1234 Sydney",
  amount: 85.5,
  direction: "debit",
  category: "Groceries",
  categoryGroup: "Food",
  categoryReason: "fallback:keyword:woolworths",
  ...overrides
});

const emptyRules: ManualRulesState = { byId: {}, bySimilarity: {} };

describe("normalizeSimilarityKey", () => {
  it("removes standalone numbers", () => {
    const key = normalizeSimilarityKey("Woolworths 1234 Sydney");
    expect(key).not.toMatch(/\b1234\b/);
  });

  it("removes common noise words", () => {
    const key = normalizeSimilarityKey("Coles Debit Visa Payment");
    expect(key).not.toMatch(/\bdebit\b/i);
    expect(key).not.toMatch(/\bvisa\b/i);
    expect(key).not.toMatch(/\bpayment\b/i);
  });

  it("returns a non-empty trimmed string for normal input", () => {
    const key = normalizeSimilarityKey("Netflix Subscription");
    expect(key.trim()).toBeTruthy();
  });

  it("handles empty string", () => {
    expect(normalizeSimilarityKey("")).toBe("");
  });
});

describe("canonicalizeCategoryGroup", () => {
  it("returns empty string for null or undefined", () => {
    expect(canonicalizeCategoryGroup(null)).toBe("");
    expect(canonicalizeCategoryGroup(undefined)).toBe("");
    expect(canonicalizeCategoryGroup("")).toBe("");
  });

  it("trims whitespace", () => {
    const result = canonicalizeCategoryGroup("  Food  ");
    expect(result).not.toMatch(/^\s/);
    expect(result).not.toMatch(/\s$/);
  });

  it("returns the original value when no alias is found", () => {
    expect(canonicalizeCategoryGroup("CustomCategory")).toBe("CustomCategory");
  });
});

describe("resolveCategoryGroupBucket", () => {
  it("returns 'Uncategorized' when no category info is present", () => {
    const tx = makeTransaction({ categoryGroup: "", category: "" });
    expect(resolveCategoryGroupBucket(tx)).toBe("Uncategorized");
  });

  it("uses categoryGroup when present", () => {
    const tx = makeTransaction({ categoryGroup: "Transport", category: "Fuel" });
    expect(resolveCategoryGroupBucket(tx)).toBe("Transport");
  });
});

describe("analytics exclusion helpers", () => {
  it("excludes Ignored debits from spend analytics", () => {
    const tx = makeTransaction({ categoryGroup: "Ignored", category: "Ignored" });
    expect(isExcludedFromSpendAnalytics(tx)).toBe(true);
  });

  it("excludes Transfers credits from income analytics", () => {
    const tx = makeTransaction({
      direction: "credit",
      amount: -85.5,
      categoryGroup: "Transfers",
      category: "Bank Transfer"
    });
    expect(isExcludedFromIncomeAnalytics(tx)).toBe(true);
  });
});

describe("similarityKeyForTransaction", () => {
  it("produces a deterministic key from merchant and narrative", () => {
    const tx = makeTransaction();
    const key1 = similarityKeyForTransaction(tx);
    const key2 = similarityKeyForTransaction(tx);
    expect(key1).toBe(key2);
  });

  it("produces different keys for clearly different transactions", () => {
    const tx1 = makeTransaction({ merchant: "Netflix", narrative: "Netflix Subscription" });
    const tx2 = makeTransaction({ merchant: "Spotify", narrative: "Spotify Premium" });
    expect(similarityKeyForTransaction(tx1)).not.toBe(similarityKeyForTransaction(tx2));
  });

  it("falls back to id when merchant and narrative are empty", () => {
    const tx = makeTransaction({ merchant: "", narrative: "", id: "tx-fallback" });
    const key = similarityKeyForTransaction(tx);
    expect(key).toBeTruthy();
    expect(key.length).toBeGreaterThan(0);
  });
});

describe("sanitizeManualRule", () => {
  it("returns null for an empty rule", () => {
    expect(sanitizeManualRule({})).toBeNull();
    expect(sanitizeManualRule({ categoryGroup: "", category: "", nickname: "" })).toBeNull();
  });

  it("preserves valid category group", () => {
    const rule = sanitizeManualRule({ categoryGroup: "Food" });
    expect(rule?.categoryGroup).toBeTruthy();
  });

  it("preserves valid nickname", () => {
    const rule = sanitizeManualRule({ nickname: "Netflix" });
    expect(rule?.nickname).toBe("Netflix");
  });

  it("trims whitespace from fields", () => {
    const rule = sanitizeManualRule({ nickname: "  Netflix  " });
    expect(rule?.nickname).toBe("Netflix");
  });
});

describe("applyManualRules", () => {
  it("returns transactions unchanged when no rules match", () => {
    const tx = makeTransaction();
    const result = applyManualRules([tx], emptyRules);
    // category is preserved; categoryGroup is canonicalized (e.g. "Food" → "Food & Drink")
    expect(result[0].category).toBe(tx.category);
    expect(result[0].manualSource).toBeUndefined();
    expect(result[0].manualNickname).toBeUndefined();
  });

  it("applies a direct rule by transaction id", () => {
    const tx = makeTransaction({ id: "tx-001" });
    const rules: ManualRulesState = {
      byId: { "tx-001": { categoryGroup: "Entertainment", category: "Streaming" } },
      bySimilarity: {}
    };
    const [result] = applyManualRules([tx], rules);
    expect(result.category).toBe("Streaming");
    expect(result.categoryGroup).toBe("Entertainment");
    expect(result.manualSource).toBe("id");
    expect(result.classificationSource).toBe("manual-id");
  });

  it("applies a similarity rule when no direct rule exists", () => {
    const tx = makeTransaction({ merchant: "Netflix", narrative: "Netflix Subscription" });
    const similarityKey = similarityKeyForTransaction(tx);
    const rules: ManualRulesState = {
      byId: {},
      bySimilarity: { [similarityKey]: { categoryGroup: "Entertainment", nickname: "Netflix" } }
    };
    const [result] = applyManualRules([tx], rules);
    expect(result.categoryGroup).toBe("Entertainment");
    expect(result.manualNickname).toBe("Netflix");
    expect(result.manualSource).toBe("similar");
    expect(result.classificationSource).toBe("manual-similar");
  });

  it("direct rule takes precedence over similarity rule", () => {
    const tx = makeTransaction({ id: "tx-001" });
    const similarityKey = similarityKeyForTransaction(tx);
    const rules: ManualRulesState = {
      byId: { "tx-001": { category: "Direct Category" } },
      bySimilarity: { [similarityKey]: { category: "Similarity Category" } }
    };
    const [result] = applyManualRules([tx], rules);
    expect(result.category).toBe("Direct Category");
    expect(result.manualSource).toBe("id");
  });

  it("attaches similarityKey to each transaction", () => {
    const tx = makeTransaction();
    const [result] = applyManualRules([tx], emptyRules);
    expect(result.similarityKey).toBeTruthy();
  });
});
