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
export type DashboardTab = "forecast" | "accounts" | "income" | "expenses" | "categories" | "transactionData" | "settings";

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

export type PayrollDraft = {
  employerKeywords: string;
  payFrequency: PayFrequency;
  netPay: number;
  grossPay: number;
  incomeTax: number;
  superGross: number;
  superTax: number;
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
  incomeTax: number;
  superGross: number;
  superTax: number;
};

export type IncomeModel = {
  enabled: boolean;
  payEventCount: number;
  salaryMatchIds?: string[];
  payEvents?: PayEvent[];
  totals: {
    salaryGross: number;
    tax: number;
    super: number;
    otherCredits: number;
    grossPlusOtherCredits: number;
    netPlusOtherCredits: number;
  };
  salary?: {
    netPay: number;
    grossPay: number;
    incomeTax: number;
    superGross: number;
    superTax: number;
    taxComponents?: ModelComponent[];
    superComponents?: ModelComponent[];
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
