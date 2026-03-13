import type { AccountEntry, BuildVizResult, GoalEntry, ManualRulesState, PayrollDraft } from "./types";

export const EXCLUDED_CATEGORIES = new Set(["Transfers", "Income"]);

export const CATEGORY_COLORS = [
  "#36b8ac",
  "#6b67f2",
  "#8f45e8",
  "#35bf72",
  "#8a62de",
  "#f48b2b",
  "#3d73e6",
  "#eb59a7",
  "#2ca2f6",
  "#ef5e4a",
  "#fc845b",
  "#8f9eb4",
  "#79c81d",
  "#d18f2f"
];

export const ACCOUNT_COLORS = ["#2f9ef6", "#4db7ff", "#18c5d5"];
export const SUMMARY_TOP_MERCHANTS_PER_GROUP = 4;
export const HIDDEN_FIXED_LEAF_TAIL_VALUE = 0.0001;

export const MANUAL_RULES_STORAGE_KEY = "personal-spend-manual-rules-v1";
export const MANUAL_DRAFTS_STORAGE_KEY = "personal-spend-manual-drafts-v1";
export const CATEGORY_TAXONOMY_STORAGE_KEY = "personal-spend-category-taxonomy-v1";
export const ACCOUNT_ENTRIES_STORAGE_KEY = "personal-spend-account-entries-v1";
export const ACCOUNT_HISTORY_STORAGE_KEY = "personal-spend-account-history-v1";
export const GOALS_STORAGE_KEY = "personal-spend-goals-v1";
export const PAYROLL_DRAFT_STORAGE_KEY = "personal-spend-payroll-draft-v1";
export const FORECAST_SETTINGS_STORAGE_KEY = "personal-spend-forecast-settings-v1";
export const TRANSACTION_BATCHES_STORAGE_KEY = "personal-spend-transaction-batches-v1";
export const UPLOADED_TRANSACTIONS_STORAGE_KEY = "personal-spend-uploaded-transactions-v1";
export const UPLOADED_META_STORAGE_KEY = "personal-spend-uploaded-meta-v1";

export const EMPTY_MANUAL_RULES: ManualRulesState = { byId: {}, bySimilarity: {} };

export const CATEGORY_GROUP_ALIAS_MAP = new Map<string, string>([
  ["food", "Food & Drink"],
  ["mobility", "Transport"],
  ["recurring payments", "Subscriptions"]
]);

export const INCOME_SOURCE_ALIASES = [
  { label: "CAPE SPORTS Salary", needles: ["cape bionics", "cape sports"] },
  { label: "Spotify Credits", needles: ["spotify"] }
];

export const MERCHANT_ALIASES = [
  { label: "Uber Eats", needles: ["uber eats", "uber *eats"] },
  { label: "Uber One", needles: ["uber one"] },
  { label: "Spotify", needles: ["spotify"] },
  { label: "Coles", needles: ["coles"] },
  { label: "Woolworths", needles: ["woolworths"] },
  { label: "McDonald's", needles: ["mcdonald"] }
];

export const DEFAULT_CATEGORY_SETUP: Array<{ category: string; subcategories: string[] }> = [
  { category: "Food & Drink", subcategories: ["Groceries", "Deliveries", "Restaurants"] },
  { category: "Transport", subcategories: ["Transport"] },
  { category: "Lifestyle", subcategories: ["Shopping", "Gifts", "Hobbies"] },
  { category: "Subscriptions", subcategories: ["Memberships", "Subscriptions", "Interest"] },
  { category: "Health", subcategories: ["Health"] },
  { category: "Life", subcategories: ["Rent", "Phone", "Internet"] },
  { category: "Transfers", subcategories: ["Transfers"] },
  { category: "Income", subcategories: ["Income"] },
  { category: "Uncategorized", subcategories: ["Uncategorized"] }
];

export const DEFAULT_ACCOUNT_ENTRIES: AccountEntry[] = [
  { id: "acct_everyday", name: "Everyday Account", bucket: "Bank", kind: "asset", value: 4850 },
  { id: "acct_savings", name: "High Interest Savings", bucket: "Bank", kind: "asset", value: 18200 },
  { id: "acct_crypto", name: "Crypto", bucket: "Crypto", kind: "asset", value: 6000 },
  { id: "acct_shares", name: "Shares", bucket: "Stocks", kind: "asset", value: 12100 },
  { id: "acct_mortgage", name: "Mortgage", bucket: "Debt", kind: "liability", value: 42500 }
];

export const DEFAULT_GOALS: GoalEntry[] = [
  { id: "goal_emergency", name: "Emergency Fund", target: 15000, current: 9800 },
  { id: "goal_investing", name: "Investing Balance", target: 25000, current: 12100 }
];

export const EMPTY_PAYROLL_DRAFT: PayrollDraft = {
  employerKeywords: "",
  netPay: 0,
  grossPay: 0,
  incomeTax: 0,
  superGross: 0,
  superTax: 0,
  netTolerance: 2
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
  maxColumnNodes: 1
};
