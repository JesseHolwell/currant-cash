import { domainProfile } from "./config/profile";
import type {
  AccountEntry,
  BuildVizResult,
  GoalEntry,
  ManualRulesState,
  PayrollDraft,
} from "./types";

export const EXCLUDED_CATEGORIES = new Set(["Transfers", "Income", "Ignored"]);
export const EXCLUDED_INCOME_CATEGORIES = new Set(["Transfers", "Ignored"]);

export const CATEGORY_COLORS = [
  "#8B2942", // Currant Red
  "#3D8B4F", // Currant Leaf
  "#C4843E", // Warm gold
  "#5C6FA8", // Muted blue
  "#9B6BA0", // Soft purple
  "#B05C40", // Terra cotta
  "#4A7A6B", // Teal green
  "#C4638A", // Rose pink
  "#7B9E5C", // Olive green
  "#5B7A9B", // Steel blue
  "#A06040", // Copper
  "#5C4A7A", // Deep purple
  "#8B6B3D", // Warm brown
  "#3D6B5C", // Forest green
];

export const ACCOUNT_COLORS = ["#8B2942", "#3D8B4F", "#C4843E", "#5C6FA8", "#9B6BA0"];
export const SUMMARY_TOP_MERCHANTS_PER_GROUP = 4;
export const HIDDEN_FIXED_LEAF_TAIL_VALUE = 0.0001;

export const MANUAL_RULES_STORAGE_KEY = "personal-spend-manual-rules-v1";
export const MANUAL_DRAFTS_STORAGE_KEY = "personal-spend-manual-drafts-v1";
export const CATEGORY_TAXONOMY_STORAGE_KEY =
  "personal-spend-category-taxonomy-v1";
export const ACCOUNT_ENTRIES_STORAGE_KEY = "personal-spend-account-entries-v1";
export const ACCOUNT_HISTORY_STORAGE_KEY = "personal-spend-account-history-v1";
export const GOALS_STORAGE_KEY = "personal-spend-goals-v1";
export const PAYROLL_DRAFT_STORAGE_KEY = "personal-spend-payroll-draft-v1";
export const FORECAST_SETTINGS_STORAGE_KEY =
  "personal-spend-forecast-settings-v1";
export const TRANSACTION_BATCHES_STORAGE_KEY =
  "personal-spend-transaction-batches-v1";
export const AI_SUGGESTIONS_STORAGE_KEY = "personal-spend-ai-suggestions-v1";
export const APP_SETTINGS_STORAGE_KEY = "personal-spend-settings-v1";
export const UPLOADED_TRANSACTIONS_STORAGE_KEY =
  "personal-spend-uploaded-transactions-v1";
export const UPLOADED_META_STORAGE_KEY = "personal-spend-uploaded-meta-v1";
export const MONTHLY_CHECKIN_DISMISSED_KEY = "personal-spend-monthly-checkin-dismissed-v1";

export const EMPTY_MANUAL_RULES: ManualRulesState = {
  byId: {},
  bySimilarity: {},
};

export const CATEGORY_GROUP_ALIAS_MAP = new Map<string, string>([
  ["food", "Food & Drink"],
  ["mobility", "Transport"],
  ["recurring payments", "Subscriptions & Tech"],
]);

export const APP_SUPPORT_URL = domainProfile.supportUrl;
export const INCOME_SOURCE_ALIASES = domainProfile.incomeSourceAliases;
export const MERCHANT_ALIASES = domainProfile.merchantAliases;
export const DEFAULT_CATEGORY_SETUP = domainProfile.defaultCategorySetup;
export const DEFAULT_ACCOUNT_ENTRIES: AccountEntry[] = domainProfile.defaultAccountEntries;
export const DEFAULT_GOALS: GoalEntry[] = domainProfile.defaultGoals;

export const DEFAULT_PAYROLL_FIELDS: PayrollDraft["fields"] = [
  { id: "income_tax", label: "Income tax", amount: 0, kind: "pre_tax_deduction" },
  { id: "super_gross", label: "Super", amount: 0, kind: "employer_contribution" },
  { id: "super_tax", label: "Super tax", amount: 0, kind: "contribution_tax" },
];

export const EMPTY_PAYROLL_DRAFT: PayrollDraft = {
  employerKeywords: "",
  payFrequency: "fortnightly",
  netPay: 0,
  grossPay: 0,
  fields: DEFAULT_PAYROLL_FIELDS,
};

export const EMPTY_VIZ: BuildVizResult = {
  sankey: { nodes: [], links: [] },
  totalIncome: 0,
  totalSpend: 0,
  savings: 0,
  spendCount: 0,
  incomeStats: [],
  categoryStats: [],
  subcategoryCount: 0,
  merchantNodeCount: 0,
  modeledPayEventCount: 0,
  maxColumnNodes: 1,
};
