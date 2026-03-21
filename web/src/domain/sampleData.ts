/**
 * Sample dataset for the onboarding preview experience.
 * Used when isSampleMode is active — data is injected directly as props,
 * never written to localStorage or Supabase.
 */

import type {
  AccountEntry,
  AccountHistorySnapshot,
  CategoryDefinition,
  GoalEntry,
  ManualRulesState,
  PayrollDraft,
  TransactionBatch,
} from "./types";

export type SampleDataset = {
  transactionBatches: TransactionBatch[];
  manualRules: ManualRulesState;
  categoryDefinitions: CategoryDefinition[];
  accountEntries: AccountEntry[];
  accountHistory: AccountHistorySnapshot[];
  goals: GoalEntry[];
  payrollDraft: PayrollDraft;
  forecastStartNetWorth: number | null;
  forecastMonthlyDelta: number | null;
  fireCurrentAge: number;
  fireAnnualReturn: number;
  fireMultiplier: number;
};

// ─── Category definitions ─────────────────────────────────────────────────────

const SAMPLE_CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: "smpl_cat_food",
    category: "Food & Drink",
    subcategories: [
      { id: "smpl_sub_groceries", name: "Groceries", keywords: ["coles", "woolworths", "aldi", "iga"] },
      { id: "smpl_sub_deliveries", name: "Deliveries", keywords: ["uber eats", "menulog", "doordash"] },
      { id: "smpl_sub_restaurants", name: "Restaurants", keywords: ["mcdonald", "kfc", "subway", "nandos"] },
    ],
  },
  {
    id: "smpl_cat_transport",
    category: "Transport",
    subcategories: [
      { id: "smpl_sub_transport", name: "Transport", keywords: ["uber", "opal", "petrol", "liberty"] },
    ],
  },
  {
    id: "smpl_cat_lifestyle",
    category: "Lifestyle",
    subcategories: [
      { id: "smpl_sub_shopping", name: "Shopping", keywords: ["cotton on", "myer", "david jones", "jb hi-fi"] },
      { id: "smpl_sub_gifts", name: "Gifts", keywords: [] },
      { id: "smpl_sub_hobbies", name: "Hobbies", keywords: ["steam", "playstation"] },
    ],
  },
  {
    id: "smpl_cat_subscriptions",
    category: "Subscriptions",
    subcategories: [
      { id: "smpl_sub_memberships", name: "Memberships", keywords: ["anytime fitness", "gym"] },
      { id: "smpl_sub_subscriptions", name: "Subscriptions", keywords: ["netflix", "spotify", "disney", "youtube"] },
      { id: "smpl_sub_interest", name: "Interest", keywords: ["interest charge"] },
    ],
  },
  {
    id: "smpl_cat_health",
    category: "Health",
    subcategories: [
      { id: "smpl_sub_health", name: "Health", keywords: ["bupa", "chemist", "priceline", "pharmacy"] },
    ],
  },
  {
    id: "smpl_cat_life",
    category: "Life",
    subcategories: [
      { id: "smpl_sub_rent", name: "Rent", keywords: ["rent", "real estate", "property"] },
      { id: "smpl_sub_phone", name: "Phone", keywords: ["telstra", "optus", "vodafone"] },
      { id: "smpl_sub_internet", name: "Internet", keywords: ["iinet", "aussie broadband", "tpg"] },
    ],
  },
  {
    id: "smpl_cat_transfers",
    category: "Transfers",
    subcategories: [
      { id: "smpl_sub_transfers", name: "Transfers", keywords: [] },
    ],
  },
  {
    id: "smpl_cat_income",
    category: "Income",
    subcategories: [
      { id: "smpl_sub_income", name: "Income", keywords: [] },
    ],
  },
  {
    id: "smpl_cat_uncategorized",
    category: "Uncategorized",
    subcategories: [
      { id: "smpl_sub_uncategorized", name: "Uncategorized", keywords: [] },
    ],
  },
];

// ─── Manual rules ─────────────────────────────────────────────────────────────

const SAMPLE_MANUAL_RULES: ManualRulesState = {
  byId: {},
  bySimilarity: {
    "acme corp": { categoryGroup: "Income", category: "Income" },
    "coles": { categoryGroup: "Food & Drink", category: "Groceries" },
    "woolworths": { categoryGroup: "Food & Drink", category: "Groceries" },
    "uber eats": { categoryGroup: "Food & Drink", category: "Deliveries" },
    "menulog": { categoryGroup: "Food & Drink", category: "Deliveries" },
    "mcdonald": { categoryGroup: "Food & Drink", category: "Restaurants" },
    "nandos": { categoryGroup: "Food & Drink", category: "Restaurants" },
    "thai house": { categoryGroup: "Food & Drink", category: "Restaurants" },
    "bavarian": { categoryGroup: "Food & Drink", category: "Restaurants" },
    "donut king": { categoryGroup: "Food & Drink", category: "Restaurants" },
    "local pub": { categoryGroup: "Food & Drink", category: "Restaurants" },
    "uber": { categoryGroup: "Transport", category: "Transport" },
    "liberty petrol": { categoryGroup: "Transport", category: "Transport" },
    "petrol station": { categoryGroup: "Transport", category: "Transport" },
    "bp petrol": { categoryGroup: "Transport", category: "Transport" },
    "anytime fitness": { categoryGroup: "Subscriptions", category: "Memberships" },
    "netflix": { categoryGroup: "Subscriptions", category: "Subscriptions" },
    "spotify": { categoryGroup: "Subscriptions", category: "Subscriptions" },
    "disney plus": { categoryGroup: "Subscriptions", category: "Subscriptions" },
    "telstra": { categoryGroup: "Life", category: "Phone" },
    "iinet": { categoryGroup: "Life", category: "Internet" },
    "bupa": { categoryGroup: "Health", category: "Health" },
    "chemist warehouse": { categoryGroup: "Health", category: "Health" },
    "priceline pharmacy": { categoryGroup: "Health", category: "Health" },
    "cotton on": { categoryGroup: "Lifestyle", category: "Shopping" },
    "myer": { categoryGroup: "Lifestyle", category: "Gifts" },
    "jb hifi": { categoryGroup: "Lifestyle", category: "Shopping" },
    "harvey norman": { categoryGroup: "Lifestyle", category: "Shopping" },
    "lorna jane": { categoryGroup: "Lifestyle", category: "Shopping" },
    "apple": { categoryGroup: "Lifestyle", category: "Shopping" },
    "steam": { categoryGroup: "Lifestyle", category: "Hobbies" },
    "rent real estate": { categoryGroup: "Life", category: "Rent" },
    "transfer to savings": { categoryGroup: "Transfers", category: "Transfers" },
  },
};

// ─── Account entries ──────────────────────────────────────────────────────────

const SAMPLE_ACCOUNT_ENTRIES: AccountEntry[] = [
  { id: "smpl_everyday", name: "Everyday Account", bucket: "Bank", kind: "asset", value: 6240 },
  { id: "smpl_savings", name: "High Interest Savings", bucket: "Bank", kind: "asset", value: 24800 },
  { id: "smpl_etf", name: "Vanguard ETF", bucket: "Stocks", kind: "asset", value: 21500 },
  { id: "smpl_crypto", name: "Crypto", bucket: "Crypto", kind: "asset", value: 4200 },
  { id: "smpl_credit", name: "Credit Card", bucket: "Credit", kind: "liability", value: 1840 },
];

// ─── Goals ────────────────────────────────────────────────────────────────────

const SAMPLE_GOALS: GoalEntry[] = [
  {
    id: "smpl_goal_ef",
    name: "Emergency Fund",
    target: 15000,
    current: 0,
    trackingMode: "accounts",
    accountIds: ["smpl_savings"],
  },
  {
    id: "smpl_goal_deposit",
    name: "Home Deposit",
    target: 80000,
    current: 0,
    trackingMode: "netWorth",
    accountIds: [],
  },
];

// ─── Account history (Jul–Dec 2024) ──────────────────────────────────────────

const SAMPLE_ACCOUNT_HISTORY: AccountHistorySnapshot[] = [
  {
    id: "smpl_hist_jul",
    month: "2024-07",
    balances: { smpl_everyday: 5200, smpl_savings: 18000, smpl_etf: 16800, smpl_crypto: 3100, smpl_credit: 1200 },
  },
  {
    id: "smpl_hist_aug",
    month: "2024-08",
    balances: { smpl_everyday: 5400, smpl_savings: 19500, smpl_etf: 17200, smpl_crypto: 3200, smpl_credit: 1400 },
  },
  {
    id: "smpl_hist_sep",
    month: "2024-09",
    balances: { smpl_everyday: 5800, smpl_savings: 21000, smpl_etf: 18500, smpl_crypto: 3600, smpl_credit: 1300 },
  },
  {
    id: "smpl_hist_oct",
    month: "2024-10",
    balances: { smpl_everyday: 6000, smpl_savings: 22400, smpl_etf: 19200, smpl_crypto: 3900, smpl_credit: 1600 },
  },
  {
    id: "smpl_hist_nov",
    month: "2024-11",
    balances: { smpl_everyday: 5900, smpl_savings: 23600, smpl_etf: 20500, smpl_crypto: 4000, smpl_credit: 1700 },
  },
  {
    id: "smpl_hist_dec",
    month: "2024-12",
    balances: { smpl_everyday: 6240, smpl_savings: 24800, smpl_etf: 21500, smpl_crypto: 4200, smpl_credit: 1840 },
  },
];

// ─── Payroll ──────────────────────────────────────────────────────────────────

const SAMPLE_PAYROLL_DRAFT: PayrollDraft = {
  employerKeywords: "ACME CORP",
  payFrequency: "fortnightly",
  netPay: 2800,
  grossPay: 3846,
  fields: [
    { id: "income_tax", label: "Income tax", amount: 830, kind: "pre_tax_deduction" },
    { id: "super_gross", label: "Super (11%)", amount: 423, kind: "employer_contribution" },
    { id: "super_tax", label: "Super tax (15%)", amount: 63, kind: "contribution_tax" },
  ],
};

// ─── Transaction batches ──────────────────────────────────────────────────────

const OCT_TRANSACTIONS = [
  // Income
  { id: "smpl_oct_01", date: "2024-10-04", accountId: "smpl_everyday", merchant: "ACME CORP", narrative: "ACME CORP Salary", amount: -2800, direction: "credit" as const, category: "Income", categoryGroup: "Income", categoryReason: "rule", similarityKey: "acme corp" },
  { id: "smpl_oct_02", date: "2024-10-18", accountId: "smpl_everyday", merchant: "ACME CORP", narrative: "ACME CORP Salary", amount: -2800, direction: "credit" as const, category: "Income", categoryGroup: "Income", categoryReason: "rule", similarityKey: "acme corp" },
  // Rent
  { id: "smpl_oct_03", date: "2024-10-01", accountId: "smpl_everyday", merchant: "Rent Real Estate", narrative: "Rent - Real Estate Payment", amount: 1800, direction: "debit" as const, category: "Rent", categoryGroup: "Life", categoryReason: "rule", similarityKey: "rent real estate" },
  // Groceries
  { id: "smpl_oct_04", date: "2024-10-02", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 134.8, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_oct_05", date: "2024-10-08", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678", amount: 97.4, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  { id: "smpl_oct_06", date: "2024-10-13", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 108.6, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_oct_07", date: "2024-10-20", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678", amount: 84.2, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  { id: "smpl_oct_08", date: "2024-10-25", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 122.5, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_oct_09", date: "2024-10-29", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678", amount: 78.9, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  // Subscriptions
  { id: "smpl_oct_10", date: "2024-10-02", accountId: "smpl_everyday", merchant: "Spotify", narrative: "SPOTIFY AUSTRALIA", amount: 11.99, direction: "debit" as const, category: "Subscriptions", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "spotify" },
  { id: "smpl_oct_11", date: "2024-10-03", accountId: "smpl_everyday", merchant: "Netflix", narrative: "NETFLIX.COM", amount: 22.99, direction: "debit" as const, category: "Subscriptions", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "netflix" },
  { id: "smpl_oct_12", date: "2024-10-05", accountId: "smpl_everyday", merchant: "Anytime Fitness", narrative: "ANYTIME FITNESS GYM", amount: 29.99, direction: "debit" as const, category: "Memberships", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "anytime fitness" },
  // Life bills
  { id: "smpl_oct_13", date: "2024-10-08", accountId: "smpl_everyday", merchant: "Telstra", narrative: "TELSTRA MONTHLY", amount: 65, direction: "debit" as const, category: "Phone", categoryGroup: "Life", categoryReason: "rule", similarityKey: "telstra" },
  { id: "smpl_oct_14", date: "2024-10-09", accountId: "smpl_everyday", merchant: "iiNet", narrative: "IINET BROADBAND", amount: 79.99, direction: "debit" as const, category: "Internet", categoryGroup: "Life", categoryReason: "rule", similarityKey: "iinet" },
  // Health
  { id: "smpl_oct_15", date: "2024-10-09", accountId: "smpl_everyday", merchant: "Bupa Health", narrative: "BUPA HEALTH INSURANCE", amount: 95, direction: "debit" as const, category: "Health", categoryGroup: "Health", categoryReason: "rule", similarityKey: "bupa" },
  { id: "smpl_oct_16", date: "2024-10-28", accountId: "smpl_everyday", merchant: "Chemist Warehouse", narrative: "CHEMIST WAREHOUSE 123", amount: 34.5, direction: "debit" as const, category: "Health", categoryGroup: "Health", categoryReason: "rule", similarityKey: "chemist warehouse" },
  // Food delivery & restaurants
  { id: "smpl_oct_17", date: "2024-10-10", accountId: "smpl_everyday", merchant: "Uber Eats", narrative: "UBER EATS DELIVERY", amount: 38.5, direction: "debit" as const, category: "Deliveries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "uber eats" },
  { id: "smpl_oct_18", date: "2024-10-22", accountId: "smpl_everyday", merchant: "Uber Eats", narrative: "UBER EATS DELIVERY", amount: 45.6, direction: "debit" as const, category: "Deliveries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "uber eats" },
  { id: "smpl_oct_19", date: "2024-10-19", accountId: "smpl_everyday", merchant: "McDonald's", narrative: "MCDONALDS 7654", amount: 18.4, direction: "debit" as const, category: "Restaurants", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "mcdonald" },
  { id: "smpl_oct_20", date: "2024-10-25", accountId: "smpl_everyday", merchant: "The Local Pub", narrative: "THE LOCAL PUB EFTPOS", amount: 62, direction: "debit" as const, category: "Restaurants", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "local pub" },
  // Transport
  { id: "smpl_oct_21", date: "2024-10-15", accountId: "smpl_everyday", merchant: "Uber", narrative: "UBER TRIP", amount: 22.3, direction: "debit" as const, category: "Transport", categoryGroup: "Transport", categoryReason: "rule", similarityKey: "uber" },
  { id: "smpl_oct_22", date: "2024-10-27", accountId: "smpl_everyday", merchant: "Uber", narrative: "UBER TRIP", amount: 16.8, direction: "debit" as const, category: "Transport", categoryGroup: "Transport", categoryReason: "rule", similarityKey: "uber" },
  // Lifestyle
  { id: "smpl_oct_23", date: "2024-10-16", accountId: "smpl_credit", merchant: "Cotton On", narrative: "COTTON ON GROUP", amount: 89, direction: "debit" as const, category: "Shopping", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "cotton on" },
  { id: "smpl_oct_24", date: "2024-10-26", accountId: "smpl_credit", merchant: "Harvey Norman", narrative: "HARVEY NORMAN EFTPOS", amount: 249, direction: "debit" as const, category: "Shopping", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "harvey norman" },
  { id: "smpl_oct_25", date: "2024-10-30", accountId: "smpl_everyday", merchant: "Steam", narrative: "STEAM PURCHASE", amount: 29, direction: "debit" as const, category: "Hobbies", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "steam" },
  // Transfer to savings
  { id: "smpl_oct_26", date: "2024-10-18", accountId: "smpl_everyday", merchant: "Transfer to Savings", narrative: "TRANSFER TO SAVINGS ACCT", amount: 600, direction: "neutral" as const, category: "Transfers", categoryGroup: "Transfers", categoryReason: "rule", similarityKey: "transfer to savings" },
];

const NOV_TRANSACTIONS = [
  // Income
  { id: "smpl_nov_01", date: "2024-11-01", accountId: "smpl_everyday", merchant: "ACME CORP", narrative: "ACME CORP Salary", amount: -2800, direction: "credit" as const, category: "Income", categoryGroup: "Income", categoryReason: "rule", similarityKey: "acme corp" },
  { id: "smpl_nov_02", date: "2024-11-15", accountId: "smpl_everyday", merchant: "ACME CORP", narrative: "ACME CORP Salary", amount: -2800, direction: "credit" as const, category: "Income", categoryGroup: "Income", categoryReason: "rule", similarityKey: "acme corp" },
  // Rent
  { id: "smpl_nov_03", date: "2024-11-01", accountId: "smpl_everyday", merchant: "Rent Real Estate", narrative: "Rent - Real Estate Payment", amount: 1800, direction: "debit" as const, category: "Rent", categoryGroup: "Life", categoryReason: "rule", similarityKey: "rent real estate" },
  // Groceries
  { id: "smpl_nov_04", date: "2024-11-03", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 116.3, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_nov_05", date: "2024-11-07", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678", amount: 93.4, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  { id: "smpl_nov_06", date: "2024-11-12", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 98.7, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_nov_07", date: "2024-11-19", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678", amount: 71.8, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  { id: "smpl_nov_08", date: "2024-11-26", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 104.2, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_nov_09", date: "2024-11-29", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678", amount: 87.6, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  // Subscriptions
  { id: "smpl_nov_10", date: "2024-11-02", accountId: "smpl_everyday", merchant: "Spotify", narrative: "SPOTIFY AUSTRALIA", amount: 11.99, direction: "debit" as const, category: "Subscriptions", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "spotify" },
  { id: "smpl_nov_11", date: "2024-11-03", accountId: "smpl_everyday", merchant: "Netflix", narrative: "NETFLIX.COM", amount: 22.99, direction: "debit" as const, category: "Subscriptions", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "netflix" },
  { id: "smpl_nov_12", date: "2024-11-04", accountId: "smpl_everyday", merchant: "Anytime Fitness", narrative: "ANYTIME FITNESS GYM", amount: 29.99, direction: "debit" as const, category: "Memberships", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "anytime fitness" },
  // Life bills
  { id: "smpl_nov_13", date: "2024-11-08", accountId: "smpl_everyday", merchant: "Telstra", narrative: "TELSTRA MONTHLY", amount: 65, direction: "debit" as const, category: "Phone", categoryGroup: "Life", categoryReason: "rule", similarityKey: "telstra" },
  { id: "smpl_nov_14", date: "2024-11-05", accountId: "smpl_everyday", merchant: "iiNet", narrative: "IINET BROADBAND", amount: 79.99, direction: "debit" as const, category: "Internet", categoryGroup: "Life", categoryReason: "rule", similarityKey: "iinet" },
  // Health
  { id: "smpl_nov_15", date: "2024-11-09", accountId: "smpl_everyday", merchant: "Bupa Health", narrative: "BUPA HEALTH INSURANCE", amount: 95, direction: "debit" as const, category: "Health", categoryGroup: "Health", categoryReason: "rule", similarityKey: "bupa" },
  { id: "smpl_nov_16", date: "2024-11-26", accountId: "smpl_everyday", merchant: "Priceline Pharmacy", narrative: "PRICELINE PHARMACY", amount: 28.9, direction: "debit" as const, category: "Health", categoryGroup: "Health", categoryReason: "rule", similarityKey: "priceline pharmacy" },
  // Food delivery & restaurants
  { id: "smpl_nov_17", date: "2024-11-06", accountId: "smpl_everyday", merchant: "Uber Eats", narrative: "UBER EATS DELIVERY", amount: 41.2, direction: "debit" as const, category: "Deliveries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "uber eats" },
  { id: "smpl_nov_18", date: "2024-11-23", accountId: "smpl_everyday", merchant: "Uber Eats", narrative: "UBER EATS DELIVERY", amount: 36.8, direction: "debit" as const, category: "Deliveries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "uber eats" },
  { id: "smpl_nov_19", date: "2024-11-18", accountId: "smpl_everyday", merchant: "Thai House", narrative: "THAI HOUSE RESTAURANT", amount: 74, direction: "debit" as const, category: "Restaurants", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "thai house" },
  { id: "smpl_nov_20", date: "2024-11-29", accountId: "smpl_everyday", merchant: "The Bavarian", narrative: "THE BAVARIAN BAR + GRILL", amount: 92.4, direction: "debit" as const, category: "Restaurants", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "bavarian" },
  // Transport
  { id: "smpl_nov_21", date: "2024-11-13", accountId: "smpl_everyday", merchant: "Uber", narrative: "UBER TRIP", amount: 19.4, direction: "debit" as const, category: "Transport", categoryGroup: "Transport", categoryReason: "rule", similarityKey: "uber" },
  { id: "smpl_nov_22", date: "2024-11-28", accountId: "smpl_everyday", merchant: "Liberty Petrol", narrative: "LIBERTY PETROL STATION", amount: 68.5, direction: "debit" as const, category: "Transport", categoryGroup: "Transport", categoryReason: "rule", similarityKey: "liberty petrol" },
  // Lifestyle
  { id: "smpl_nov_23", date: "2024-11-21", accountId: "smpl_credit", merchant: "Lorna Jane", narrative: "LORNA JANE ACTIVEWEAR", amount: 119, direction: "debit" as const, category: "Shopping", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "lorna jane" },
  { id: "smpl_nov_24", date: "2024-11-27", accountId: "smpl_everyday", merchant: "Steam", narrative: "STEAM PURCHASE", amount: 19.99, direction: "debit" as const, category: "Hobbies", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "steam" },
  // Transfer to savings
  { id: "smpl_nov_25", date: "2024-11-15", accountId: "smpl_everyday", merchant: "Transfer to Savings", narrative: "TRANSFER TO SAVINGS ACCT", amount: 600, direction: "neutral" as const, category: "Transfers", categoryGroup: "Transfers", categoryReason: "rule", similarityKey: "transfer to savings" },
];

const DEC_TRANSACTIONS = [
  // Income
  { id: "smpl_dec_01", date: "2024-12-06", accountId: "smpl_everyday", merchant: "ACME CORP", narrative: "ACME CORP Salary", amount: -2800, direction: "credit" as const, category: "Income", categoryGroup: "Income", categoryReason: "rule", similarityKey: "acme corp" },
  { id: "smpl_dec_02", date: "2024-12-20", accountId: "smpl_everyday", merchant: "ACME CORP", narrative: "ACME CORP Salary", amount: -2800, direction: "credit" as const, category: "Income", categoryGroup: "Income", categoryReason: "rule", similarityKey: "acme corp" },
  // Rent
  { id: "smpl_dec_03", date: "2024-12-01", accountId: "smpl_everyday", merchant: "Rent Real Estate", narrative: "Rent - Real Estate Payment", amount: 1800, direction: "debit" as const, category: "Rent", categoryGroup: "Life", categoryReason: "rule", similarityKey: "rent real estate" },
  // Groceries (higher in December for Christmas)
  { id: "smpl_dec_04", date: "2024-12-02", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 128.4, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_dec_05", date: "2024-12-08", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678", amount: 108.6, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  { id: "smpl_dec_06", date: "2024-12-12", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 89.9, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_dec_07", date: "2024-12-19", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678 - Xmas shop", amount: 142.3, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  { id: "smpl_dec_08", date: "2024-12-23", accountId: "smpl_everyday", merchant: "Coles", narrative: "COLES SUPERMARKETS 1234", amount: 167.8, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "coles" },
  { id: "smpl_dec_09", date: "2024-12-24", accountId: "smpl_everyday", merchant: "Woolworths", narrative: "WOOLWORTHS 5678 - Christmas Eve", amount: 198.4, direction: "debit" as const, category: "Groceries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "woolworths" },
  // Subscriptions
  { id: "smpl_dec_10", date: "2024-12-02", accountId: "smpl_everyday", merchant: "Spotify", narrative: "SPOTIFY AUSTRALIA", amount: 11.99, direction: "debit" as const, category: "Subscriptions", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "spotify" },
  { id: "smpl_dec_11", date: "2024-12-02", accountId: "smpl_everyday", merchant: "Netflix", narrative: "NETFLIX.COM", amount: 22.99, direction: "debit" as const, category: "Subscriptions", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "netflix" },
  { id: "smpl_dec_12", date: "2024-12-03", accountId: "smpl_everyday", merchant: "Anytime Fitness", narrative: "ANYTIME FITNESS GYM", amount: 29.99, direction: "debit" as const, category: "Memberships", categoryGroup: "Subscriptions", categoryReason: "rule", similarityKey: "anytime fitness" },
  // Life bills
  { id: "smpl_dec_13", date: "2024-12-08", accountId: "smpl_everyday", merchant: "Telstra", narrative: "TELSTRA MONTHLY", amount: 65, direction: "debit" as const, category: "Phone", categoryGroup: "Life", categoryReason: "rule", similarityKey: "telstra" },
  { id: "smpl_dec_14", date: "2024-12-04", accountId: "smpl_everyday", merchant: "iiNet", narrative: "IINET BROADBAND", amount: 79.99, direction: "debit" as const, category: "Internet", categoryGroup: "Life", categoryReason: "rule", similarityKey: "iinet" },
  // Health
  { id: "smpl_dec_15", date: "2024-12-09", accountId: "smpl_everyday", merchant: "Bupa Health", narrative: "BUPA HEALTH INSURANCE", amount: 95, direction: "debit" as const, category: "Health", categoryGroup: "Health", categoryReason: "rule", similarityKey: "bupa" },
  { id: "smpl_dec_16", date: "2024-12-27", accountId: "smpl_everyday", merchant: "Chemist Warehouse", narrative: "CHEMIST WAREHOUSE 123", amount: 42.8, direction: "debit" as const, category: "Health", categoryGroup: "Health", categoryReason: "rule", similarityKey: "chemist warehouse" },
  // Food delivery & restaurants
  { id: "smpl_dec_17", date: "2024-12-05", accountId: "smpl_everyday", merchant: "Uber Eats", narrative: "UBER EATS DELIVERY", amount: 52.3, direction: "debit" as const, category: "Deliveries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "uber eats" },
  { id: "smpl_dec_18", date: "2024-12-17", accountId: "smpl_everyday", merchant: "Uber Eats", narrative: "UBER EATS DELIVERY", amount: 48.9, direction: "debit" as const, category: "Deliveries", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "uber eats" },
  { id: "smpl_dec_19", date: "2024-12-24", accountId: "smpl_everyday", merchant: "Donut King", narrative: "DONUT KING PTY LTD", amount: 24.5, direction: "debit" as const, category: "Restaurants", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "donut king" },
  { id: "smpl_dec_20", date: "2024-12-28", accountId: "smpl_everyday", merchant: "The Local Pub", narrative: "THE LOCAL PUB EFTPOS", amount: 84, direction: "debit" as const, category: "Restaurants", categoryGroup: "Food & Drink", categoryReason: "rule", similarityKey: "local pub" },
  // Transport (more trips in December)
  { id: "smpl_dec_21", date: "2024-12-13", accountId: "smpl_everyday", merchant: "Uber", narrative: "UBER TRIP", amount: 34.2, direction: "debit" as const, category: "Transport", categoryGroup: "Transport", categoryReason: "rule", similarityKey: "uber" },
  { id: "smpl_dec_22", date: "2024-12-22", accountId: "smpl_everyday", merchant: "BP Petrol", narrative: "BP PETROL STATION", amount: 72.4, direction: "debit" as const, category: "Transport", categoryGroup: "Transport", categoryReason: "rule", similarityKey: "bp petrol" },
  // Lifestyle — Christmas gifts and Boxing Day
  { id: "smpl_dec_23", date: "2024-12-16", accountId: "smpl_credit", merchant: "Myer", narrative: "MYER DEPARTMENT STORE", amount: 189, direction: "debit" as const, category: "Gifts", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "myer" },
  { id: "smpl_dec_24", date: "2024-12-19", accountId: "smpl_credit", merchant: "JB Hi-Fi", narrative: "JB HI-FI STORES", amount: 329, direction: "debit" as const, category: "Gifts", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "jb hifi" },
  { id: "smpl_dec_25", date: "2024-12-26", accountId: "smpl_credit", merchant: "Apple", narrative: "APPLE.COM/AU BOXING DAY", amount: 299, direction: "debit" as const, category: "Shopping", categoryGroup: "Lifestyle", categoryReason: "rule", similarityKey: "apple" },
  // Transfer to savings (reduced in December)
  { id: "smpl_dec_26", date: "2024-12-20", accountId: "smpl_everyday", merchant: "Transfer to Savings", narrative: "TRANSFER TO SAVINGS ACCT", amount: 400, direction: "neutral" as const, category: "Transfers", categoryGroup: "Transfers", categoryReason: "rule", similarityKey: "transfer to savings" },
];

function makeBatch(
  id: string,
  fileName: string,
  importedAt: string,
  start: string,
  end: string,
  transactions: typeof OCT_TRANSACTIONS
): TransactionBatch {
  return {
    id,
    fileName,
    importedAt,
    observedStart: start,
    observedEnd: end,
    coverageStart: start,
    coverageEnd: end,
    transactionCount: transactions.length,
    warningCount: 0,
    warnings: [],
    transactions,
  };
}

const SAMPLE_TRANSACTION_BATCHES: TransactionBatch[] = [
  makeBatch("smpl_batch_oct", "bank-oct-2024.csv", "2024-11-02T09:00:00Z", "2024-10-01", "2024-10-31", OCT_TRANSACTIONS),
  makeBatch("smpl_batch_nov", "bank-nov-2024.csv", "2024-12-03T09:15:00Z", "2024-11-01", "2024-11-30", NOV_TRANSACTIONS),
  makeBatch("smpl_batch_dec", "bank-dec-2024.csv", "2025-01-06T10:30:00Z", "2024-12-01", "2024-12-31", DEC_TRANSACTIONS),
];

// ─── Export ───────────────────────────────────────────────────────────────────

export const SAMPLE_DATASET: SampleDataset = {
  transactionBatches: SAMPLE_TRANSACTION_BATCHES,
  manualRules: SAMPLE_MANUAL_RULES,
  categoryDefinitions: SAMPLE_CATEGORY_DEFINITIONS,
  accountEntries: SAMPLE_ACCOUNT_ENTRIES,
  accountHistory: SAMPLE_ACCOUNT_HISTORY,
  goals: SAMPLE_GOALS,
  payrollDraft: SAMPLE_PAYROLL_DRAFT,
  forecastStartNetWorth: null,
  forecastMonthlyDelta: null,
  fireCurrentAge: 28,
  fireAnnualReturn: 7,
  fireMultiplier: 25,
};
