import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import {
  CATEGORY_TAXONOMY_STORAGE_KEY,
  EMPTY_MANUAL_RULES,
  MANUAL_DRAFTS_STORAGE_KEY,
  MANUAL_RULES_STORAGE_KEY,
  buildDefaultCategoryDefinitions,
  canonicalizeCategoryGroup,
  parseStoredCategoryDefinitions,
  sanitizeManualRule
} from "../domain";
import type {
  CategoryDefinition,
  ManualRule,
  ManualRulesState,
  TransactionDraft
} from "../domain";

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
  for (const [key, rule] of Object.entries(parsed.bySimilarity ?? {})) {
    const cleaned = sanitizeManualRule(rule ?? {});
    if (cleaned) {
      bySimilarity[key] = cleaned;
    }
  }
  return { byId, bySimilarity };
}

function sanitizeStoredDrafts(raw: unknown): Record<string, TransactionDraft> {
  if (!raw || typeof raw !== "object") {
    return {};
  }
  const parsedDrafts = raw as Record<string, TransactionDraft>;
  const result: Record<string, TransactionDraft> = {};
  for (const [id, draft] of Object.entries(parsedDrafts)) {
    result[id] = {
      categoryGroup: canonicalizeCategoryGroup(draft.categoryGroup),
      category: (draft.category ?? "").trim(),
      nickname: draft.nickname ?? "",
      applySimilar: draft.applySimilar !== false
    };
  }
  return result;
}

type Updater<T> = T | ((prev: T) => T);

interface CategoriesState {
  manualRules: ManualRulesState;
  drafts: Record<string, TransactionDraft>;
  categoryDefinitions: CategoryDefinition[];
  setManualRules: (rules: Updater<ManualRulesState>) => void;
  setDrafts: (drafts: Updater<Record<string, TransactionDraft>>) => void;
  setCategoryDefinitions: (defs: Updater<CategoryDefinition[]>) => void;
}

type PersistedCategories = {
  manualRules: unknown;
  drafts: unknown;
  categoryDefinitions: unknown;
};

const categoriesStorage = {
  getItem: (_name: string): StorageValue<PersistedCategories> | null => {
    try {
      const rulesRaw = localStorage.getItem(MANUAL_RULES_STORAGE_KEY);
      const draftsRaw = localStorage.getItem(MANUAL_DRAFTS_STORAGE_KEY);
      const taxonomyRaw = localStorage.getItem(CATEGORY_TAXONOMY_STORAGE_KEY);
      return {
        state: {
          manualRules: rulesRaw ? JSON.parse(rulesRaw) : null,
          drafts: draftsRaw ? JSON.parse(draftsRaw) : null,
          categoryDefinitions: taxonomyRaw ? JSON.parse(taxonomyRaw) : null
        },
        version: 0
      };
    } catch {
      return null;
    }
  },
  setItem: (_name: string, value: StorageValue<CategoriesState>) => {
    try {
      const { state } = value;
      localStorage.setItem(MANUAL_RULES_STORAGE_KEY, JSON.stringify(state.manualRules));
      localStorage.setItem(MANUAL_DRAFTS_STORAGE_KEY, JSON.stringify(state.drafts));
      localStorage.setItem(CATEGORY_TAXONOMY_STORAGE_KEY, JSON.stringify(state.categoryDefinitions));
    } catch {
      // ignore write errors
    }
  },
  removeItem: (_name: string) => {
    localStorage.removeItem(MANUAL_RULES_STORAGE_KEY);
    localStorage.removeItem(MANUAL_DRAFTS_STORAGE_KEY);
    localStorage.removeItem(CATEGORY_TAXONOMY_STORAGE_KEY);
  }
};

export const useCategoriesStore = create<CategoriesState>()(
  persist(
    (set) => ({
      manualRules: EMPTY_MANUAL_RULES,
      drafts: {},
      categoryDefinitions: buildDefaultCategoryDefinitions(),
      setManualRules: (rulesOrUpdater) =>
        set((state) => ({
          manualRules:
            typeof rulesOrUpdater === "function"
              ? rulesOrUpdater(state.manualRules)
              : rulesOrUpdater
        })),
      setDrafts: (draftsOrUpdater) =>
        set((state) => ({
          drafts:
            typeof draftsOrUpdater === "function"
              ? draftsOrUpdater(state.drafts)
              : draftsOrUpdater
        })),
      setCategoryDefinitions: (defsOrUpdater) =>
        set((state) => ({
          categoryDefinitions:
            typeof defsOrUpdater === "function"
              ? defsOrUpdater(state.categoryDefinitions)
              : defsOrUpdater
        }))
    }),
    {
      name: MANUAL_RULES_STORAGE_KEY,
      storage: categoriesStorage as never,
      merge: (persisted, current) => {
        try {
          const raw = persisted as PersistedCategories;
          const manualRules = sanitizeStoredManualRules(raw?.manualRules);
          const drafts = sanitizeStoredDrafts(raw?.drafts);
          const parsed = parseStoredCategoryDefinitions(raw?.categoryDefinitions);
          const categoryDefinitions =
            parsed.length > 0 ? parsed : buildDefaultCategoryDefinitions();
          return { ...current, manualRules, drafts, categoryDefinitions };
        } catch {
          return {
            ...current,
            manualRules: EMPTY_MANUAL_RULES,
            drafts: {},
            categoryDefinitions: buildDefaultCategoryDefinitions()
          };
        }
      }
    }
  )
);
