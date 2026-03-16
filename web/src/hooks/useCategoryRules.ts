import { useEffect, useState } from "react";
import {
  CATEGORY_TAXONOMY_STORAGE_KEY,
  EMPTY_MANUAL_RULES,
  MANUAL_DRAFTS_STORAGE_KEY,
  MANUAL_RULES_STORAGE_KEY,
  buildDefaultCategoryDefinitions,
  canonicalizeCategoryGroup,
  parseStoredCategoryDefinitions,
  sanitizeManualRule
} from "../models";
import type {
  CategoryDefinition,
  ManualRule,
  ManualRulesState,
  TransactionDraft
} from "../models";

function sanitizeStoredManualRules(raw: unknown): ManualRulesState {
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

function sanitizeStoredDrafts(raw: unknown): Record<string, TransactionDraft> {
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

interface UseCategoryRulesResult {
  manualRules: ManualRulesState;
  setManualRules: React.Dispatch<React.SetStateAction<ManualRulesState>>;
  drafts: Record<string, TransactionDraft>;
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, TransactionDraft>>>;
  categoryDefinitions: CategoryDefinition[];
  setCategoryDefinitions: React.Dispatch<React.SetStateAction<CategoryDefinition[]>>;
}

export function useCategoryRules(): UseCategoryRulesResult {
  const [manualRules, setManualRules] = useState<ManualRulesState>(EMPTY_MANUAL_RULES);
  const [drafts, setDrafts] = useState<Record<string, TransactionDraft>>({});
  const [categoryDefinitions, setCategoryDefinitions] = useState<CategoryDefinition[]>(() => buildDefaultCategoryDefinitions());
  const [hasHydratedLocalRules, setHasHydratedLocalRules] = useState(false);

  useEffect(() => {
    try {
      const rawRules = localStorage.getItem(MANUAL_RULES_STORAGE_KEY);
      if (rawRules) {
        setManualRules(sanitizeStoredManualRules(JSON.parse(rawRules)));
      }

      const rawDrafts = localStorage.getItem(MANUAL_DRAFTS_STORAGE_KEY);
      if (rawDrafts) {
        setDrafts(sanitizeStoredDrafts(JSON.parse(rawDrafts)));
      }

      const rawCategoryTaxonomy = localStorage.getItem(CATEGORY_TAXONOMY_STORAGE_KEY);
      if (rawCategoryTaxonomy) {
        const parsedTaxonomy = parseStoredCategoryDefinitions(JSON.parse(rawCategoryTaxonomy));
        if (parsedTaxonomy.length > 0) {
          setCategoryDefinitions(parsedTaxonomy);
        }
      }
    } catch {
      setManualRules(EMPTY_MANUAL_RULES);
      setDrafts({});
      setCategoryDefinitions(buildDefaultCategoryDefinitions());
    } finally {
      setHasHydratedLocalRules(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedLocalRules) {
      return;
    }
    localStorage.setItem(MANUAL_RULES_STORAGE_KEY, JSON.stringify(manualRules));
  }, [manualRules, hasHydratedLocalRules]);

  useEffect(() => {
    if (!hasHydratedLocalRules) {
      return;
    }
    localStorage.setItem(MANUAL_DRAFTS_STORAGE_KEY, JSON.stringify(drafts));
  }, [drafts, hasHydratedLocalRules]);

  useEffect(() => {
    if (!hasHydratedLocalRules) {
      return;
    }
    localStorage.setItem(CATEGORY_TAXONOMY_STORAGE_KEY, JSON.stringify(categoryDefinitions));
  }, [categoryDefinitions, hasHydratedLocalRules]);

  return {
    manualRules,
    setManualRules,
    drafts,
    setDrafts,
    categoryDefinitions,
    setCategoryDefinitions
  };
}
