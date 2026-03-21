export type RawTransaction = {
  id: string;
  date: string;
  accountId: string;
  merchant: string;
  narrative: string;
  amount: number;
  direction: "debit" | "credit" | "neutral";
  category: string;
  categoryGroup?: string;
  categoryReason: string;
  manualNickname?: string;
  manualCategoryGroup?: string;
  manualCategory?: string;
  similarityKey?: string;
  manualSource?: "id" | "similar";
};

export type TransactionBatch = {
  id: string;
  fileName: string;
  importedAt: string;
  observedStart: string;
  observedEnd: string;
  coverageStart: string;
  coverageEnd: string;
  transactionCount: number;
  warningCount: number;
  warnings: string[];
  transactions: RawTransaction[];
};

export type ManualRule = {
  categoryGroup?: string;
  category?: string;
  nickname?: string;
};

export type ManualRulesState = {
  byId: Record<string, ManualRule>;
  bySimilarity: Record<string, ManualRule>;
};

export type TransactionDraft = {
  categoryGroup: string;
  category: string;
  nickname: string;
  applySimilar: boolean;
};

export type AiCategorySuggestion = {
  transactionId: string;
  categoryGroup: string;
  category: string;
  status: "pending" | "accepted" | "rejected";
};

export type AiSuggestionsState = {
  suggestions: AiCategorySuggestion[];
  status: "idle" | "running" | "done" | "error";
  lastRunAt: string | null;
  errorMessage?: string;
};

export type CategorySubcategoryDefinition = {
  id: string;
  name: string;
  keywords: string[];
};

export type CategoryDefinition = {
  id: string;
  category: string;
  subcategories: CategorySubcategoryDefinition[];
};

export type SankeyMeta = {
  generatedAt: string;
  currency: string;
};

export type IncomeBasisMode = "raw" | "modeled";
export type FlowStartMode = "income" | "expenses";
export type IncomeMode = IncomeBasisMode | "expenses";
export type MerchantDetailMode = "summary" | "full";
export type TimelinePeriod = "all" | `${number}-${number}`;
export type DashboardTab = "forecast" | "accounts" | "income" | "expenses" | "categories" | "transactionData" | "settings" | "fireInsights";

export type AccountKind = "asset" | "liability";

export type AccountEntry = {
  id: string;
  name: string;
  bucket: string;
  kind: AccountKind;
  value: number;
};

export type GoalTrackingMode = "manual" | "accounts" | "netWorth";

export type GoalEntry = {
  id: string;
  name: string;
  target: number;
  current: number;
  trackingMode: GoalTrackingMode;
  accountIds: string[];
};

export type ResolvedGoalEntry = GoalEntry & {
  currentValue: number;
  progress: number;
  sourceLabel: string;
  linkedAccountNames: string[];
};

export type AccountHistorySnapshot = {
  id: string;
  month: string;
  balances: Record<string, number>;
};

export type PayFrequency = "weekly" | "fortnightly" | "monthly";

/**
 * pre_tax_deduction  — reduces gross, doesn't hit bank (income tax, HELP, 401k pre-tax)
 * employer_contribution — on top of gross, goes to external fund (super guarantee, 401k match)
 * contribution_tax  — tax taken from employer contribution before it reaches the fund (super contributions tax)
 */
export type PayrollFieldKind = "pre_tax_deduction" | "employer_contribution" | "contribution_tax";

export type PayrollField = {
  id: string;
  label: string;
  amount: number;
  kind: PayrollFieldKind;
};

export type PayrollDraft = {
  employerKeywords: string;
  payFrequency: PayFrequency;
  netPay: number;
  grossPay: number;
  /** Additional deduction/contribution fields beyond net/gross. */
  fields: PayrollField[];
};

export type ModelComponent = {
  name: string;
  perPay: number;
  total: number;
};

export type PayEvent = {
  transactionId: string;
  date: string;
  depositAmount: number;
  grossPay: number;
  netPay: number;
  fields: Array<{ id: string; label: string; kind: PayrollFieldKind; amount: number }>;
};

export type IncomeModel = {
  enabled: boolean;
  payEventCount: number;
  salaryMatchIds?: string[];
  payEvents?: PayEvent[];
  totals: {
    salaryGross: number;
    /** Sum of pre_tax_deduction fields */
    tax: number;
    /** Sum of employer_contribution fields */
    super: number;
    /** Sum of contribution_tax fields */
    superTax: number;
    otherCredits: number;
    grossPlusOtherCredits: number;
    netPlusOtherCredits: number;
  };
  salary?: {
    netPay: number;
    grossPay: number;
    fields: PayrollField[];
    /** pre_tax_deduction fields as named components */
    taxComponents: ModelComponent[];
    /** employer_contribution fields as named components */
    superComponents: ModelComponent[];
    /** contribution_tax fields as named components */
    contributionTaxComponents: ModelComponent[];
  };
};

export type VizNode = {
  name: string;
  kind: "income" | "total" | "group" | "subcategory" | "merchant" | "fixed" | "fixedLeaf" | "savings" | "hidden";
  color: string;
  value: number;
  percent?: number;
  labelMain?: string;
  labelSub?: string;
};

export type VizLink = {
  source: number;
  target: number;
  value: number;
  color: string;
  kind: "income" | "group" | "subcategory" | "merchant" | "fixed" | "fixedLeaf" | "savings" | "hidden";
};

export type VizData = {
  nodes: VizNode[];
  links: VizLink[];
};

export type AccountStat = {
  source: string;
  total: number;
  percent: number;
  color: string;
};

export type CategoryStat = {
  category: string;
  total: number;
  percent: number;
  count: number;
  color: string;
};

export type BuildVizResult = {
  sankey: VizData;
  totalIncome: number;
  totalSpend: number;
  savings: number;
  spendCount: number;
  incomeStats: AccountStat[];
  categoryStats: CategoryStat[];
  subcategoryCount: number;
  merchantNodeCount: number;
  modeledPayEventCount: number;
  maxColumnNodes: number;
};

export type RechartsSankeyNode = {
  name?: string;
  kind?: "income" | "total" | "group" | "subcategory" | "merchant" | "fixed" | "fixedLeaf" | "savings" | "hidden";
  color?: string;
  labelMain?: string;
  labelSub?: string;
};

export type RechartsSankeyLinkPayload = {
  source?: RechartsSankeyNode;
  target?: RechartsSankeyNode;
  value?: number;
  color?: string;
  kind?: "income" | "group" | "subcategory" | "merchant" | "fixed" | "fixedLeaf" | "savings" | "hidden";
};
