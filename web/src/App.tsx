import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACCOUNT_HISTORY_STORAGE_KEY,
  ACCOUNT_ENTRIES_STORAGE_KEY,
  CATEGORY_TAXONOMY_STORAGE_KEY,
  DEFAULT_ACCOUNT_ENTRIES,
  DEFAULT_GOALS,
  EMPTY_MANUAL_RULES,
  EMPTY_PAYROLL_DRAFT,
  FORECAST_SETTINGS_STORAGE_KEY,
  GOALS_STORAGE_KEY,
  MANUAL_DRAFTS_STORAGE_KEY,
  MANUAL_RULES_STORAGE_KEY,
  PAYROLL_DRAFT_STORAGE_KEY,
  TRANSACTION_BATCHES_STORAGE_KEY,
  UPLOADED_META_STORAGE_KEY,
  UPLOADED_TRANSACTIONS_STORAGE_KEY,
  applyManualRules,
  buildResolvedGoals,
  buildIncomeModelFromTransactions,
  buildTransactionBatch,
  buildDefaultCategoryDefinitions,
  buildVisualization,
  canonicalizeCategoryGroup,
  categoryTaxonomyFromDefinitions,
  createLocalId,
  deriveMetaFromBatches,
  isInTimeline,
  mergeTransactionsFromBatches,
  monthKey,
  normalizeCoverageRange,
  parseForecastSettings,
  parseBankCsvToTransactions,
  parseStoredAccountEntries,
  parseStoredAccountHistory,
  parseStoredCategoryDefinitions,
  parseStoredGoals,
  parseStoredTransactionBatches,
  resolveCategoryGroupBucket,
  resolveSubcategoryBucket,
  sanitizeManualRule,
  sanitizePayrollDraft,
  similarityKeyForTransaction
} from "./models";
import {
  useTransactionBatches,
  useCategoryRules,
  useAccountsGoals,
  usePayrollForecast,
  useAuth,
  useCloudSync
} from "./hooks";
import { useDarkMode } from "./hooks/useDarkMode";
import { isSupabaseConfigured } from "./lib/supabase";
import { LandingPage } from "./components/LandingPage";
import type {
  AccountEntry,
  AccountHistorySnapshot,
  CategoryDefinition,
  CategorySubcategoryDefinition,
  DashboardTab,
  FlowStartMode,
  GoalEntry,
  IncomeBasisMode,
  IncomeMode,
  ManualRule,
  ManualRulesState,
  MerchantDetailMode,
  PayrollDraft,
  RawTransaction,
  ResolvedGoalEntry,
  SankeyMeta,
  TimelinePeriod,
  TransactionBatch,
  TransactionDraft
} from "./models";
import { AccountsTab } from "./components/dashboard/tabs/AccountsTab";
import { CategoriesTab } from "./components/dashboard/tabs/CategoriesTab";
import { ExpensesTab } from "./components/dashboard/tabs/ExpensesTab";
import { ForecastTab } from "./components/dashboard/tabs/ForecastTab";
import { IncomeTab } from "./components/dashboard/tabs/IncomeTab";
import { SettingsTab } from "./components/dashboard/tabs/SettingsTab";
import { TransactionDataTab } from "./components/dashboard/tabs/TransactionDataTab";
import { Sidebar } from "./components/dashboard/Sidebar";
import { WorkspaceHeader } from "./components/dashboard/WorkspaceHeader";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthValue(month: string): string {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return currentMonthValue();
  }
  const nextDate = new Date(year, monthIndex + 1, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
}

const APP_BACKUP_VERSION = 1;
const FREE_TIER_KEY = "currant-free-tier";

const APP_STORAGE_KEYS = [
  TRANSACTION_BATCHES_STORAGE_KEY,
  UPLOADED_TRANSACTIONS_STORAGE_KEY,
  UPLOADED_META_STORAGE_KEY,
  MANUAL_RULES_STORAGE_KEY,
  MANUAL_DRAFTS_STORAGE_KEY,
  CATEGORY_TAXONOMY_STORAGE_KEY,
  ACCOUNT_ENTRIES_STORAGE_KEY,
  ACCOUNT_HISTORY_STORAGE_KEY,
  GOALS_STORAGE_KEY,
  PAYROLL_DRAFT_STORAGE_KEY,
  FORECAST_SETTINGS_STORAGE_KEY
] as const;

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

export default function App() {
  const { isDark, toggle: toggleTheme } = useDarkMode();
  const { user, authLoading, signInWithGoogle, signOut } = useAuth();
  const [bypassAuth, setBypassAuth] = useState(() => localStorage.getItem(FREE_TIER_KEY) === "1");
  const [showLanding, setShowLanding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const cloudLoadedRef = useRef(false);

  const [activeTab, setActiveTab] = useState<DashboardTab>("transactionData");
  const [flowStartMode, setFlowStartMode] = useState<FlowStartMode>("income");
  const [incomeBasisMode, setIncomeBasisMode] = useState<IncomeBasisMode>("raw");
  const [merchantDetailMode, setMerchantDetailMode] = useState<MerchantDetailMode>("summary");
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>("all");
  const [rulesFilter, setRulesFilter] = useState<"needs" | "all">("needs");
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const {
    transactionBatches,
    setTransactionBatches,
    transactionDataStatus,
    setTransactionDataStatus,
    error,
    setError,
    loading,
    setLoading
  } = useTransactionBatches();

  const {
    manualRules,
    setManualRules,
    drafts,
    setDrafts,
    categoryDefinitions,
    setCategoryDefinitions
  } = useCategoryRules();

  const {
    accountEntries,
    setAccountEntries,
    accountHistory,
    setAccountHistory,
    goals,
    setGoals
  } = useAccountsGoals();

  const {
    payrollDraft,
    setPayrollDraft,
    forecastStartNetWorth,
    setForecastStartNetWorth,
    forecastMonthlyDelta,
    setForecastMonthlyDelta
  } = usePayrollForecast();

  const { downloadSnapshot, scheduleSyncUpload } = useCloudSync(user, applySnapshot);

  const transactions = useMemo(
    () => mergeTransactionsFromBatches(transactionBatches),
    [transactionBatches]
  );

  const meta: SankeyMeta = useMemo(
    () => deriveMetaFromBatches(transactionBatches),
    [transactionBatches]
  );

  const effectiveTransactions = useMemo(
    () => applyManualRules(transactions, manualRules),
    [transactions, manualRules]
  );

  const webIncomeModel = useMemo(
    () => buildIncomeModelFromTransactions(effectiveTransactions, payrollDraft),
    [effectiveTransactions, payrollDraft]
  );

  const incomeModel = webIncomeModel;
  const incomeMode: IncomeMode = flowStartMode === "expenses" ? "expenses" : incomeBasisMode;

  const timelineOptions = useMemo(() => {
    const options = Array.from(new Set(effectiveTransactions.map((transaction) => monthKey(transaction.date)))).sort();
    return ["all" as TimelinePeriod, ...options];
  }, [effectiveTransactions]);

  useEffect(() => {
    if (timelinePeriod === "all") {
      return;
    }
    if (!timelineOptions.includes(timelinePeriod)) {
      setTimelinePeriod("all");
    }
  }, [timelineOptions, timelinePeriod]);

  // Cloud sync: load user's cloud data on sign-in (one-time per session).
  useEffect(() => {
    if (!user || loading || cloudLoadedRef.current) return;
    cloudLoadedRef.current = true;
    downloadSnapshot().then((snapshot) => {
      if (snapshot) {
        applySnapshot(snapshot);
      } else if (transactionBatches.length > 0) {
        setShowMigration(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  // Cloud sync: debounced upload on any state change while signed in.
  useEffect(() => {
    if (!user || !cloudLoadedRef.current) return;
    scheduleSyncUpload({
      transactionBatches,
      manualRules,
      drafts,
      categoryDefinitions,
      accountEntries,
      accountHistory,
      goals,
      payrollDraft,
      forecastSettings: { startNetWorth: forecastStartNetWorth, monthlyDelta: forecastMonthlyDelta }
    });
  // scheduleSyncUpload is intentionally omitted — it is stable within a session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transactionBatches, manualRules, drafts, categoryDefinitions, accountEntries, accountHistory, goals, payrollDraft, forecastStartNetWorth, forecastMonthlyDelta]);

  const viz = useMemo(
    () => buildVisualization(effectiveTransactions, meta.currency, incomeMode, incomeModel, merchantDetailMode, timelinePeriod),
    [effectiveTransactions, meta.currency, incomeMode, incomeModel, merchantDetailMode, timelinePeriod]
  );

  const configuredTaxonomy = useMemo(
    () => categoryTaxonomyFromDefinitions(categoryDefinitions),
    [categoryDefinitions]
  );

  const categoryGroupOptions = useMemo(() => {
    const groups = new Set<string>();
    for (const category of configuredTaxonomy.keys()) {
      groups.add(category);
    }
    for (const transaction of effectiveTransactions) {
      groups.add(resolveCategoryGroupBucket(transaction));
    }
    groups.delete("");
    return [...groups].sort((a, b) => a.localeCompare(b));
  }, [configuredTaxonomy, effectiveTransactions]);

  const subcategoryOptionsByGroup = useMemo(() => {
    const optionsByGroup = new Map<string, Set<string>>();
    for (const [group, subcategories] of configuredTaxonomy.entries()) {
      if (!optionsByGroup.has(group)) {
        optionsByGroup.set(group, new Set<string>());
      }
      for (const subcategory of subcategories) {
        optionsByGroup.get(group)?.add(subcategory);
      }
    }
    for (const transaction of effectiveTransactions) {
      const group = resolveCategoryGroupBucket(transaction);
      const subcategory = resolveSubcategoryBucket(transaction);
      if (!optionsByGroup.has(group)) {
        optionsByGroup.set(group, new Set<string>());
      }
      optionsByGroup.get(group)?.add(subcategory);
    }
    const finalized = new Map<string, string[]>();
    for (const [group, options] of optionsByGroup.entries()) {
      finalized.set(group, [...options].sort((a, b) => a.localeCompare(b)));
    }
    return finalized;
  }, [configuredTaxonomy, effectiveTransactions]);

  const editableTransactions = useMemo(() => {
    const scoped = effectiveTransactions.filter((transaction) => isInTimeline(transaction.date, timelinePeriod));
    return scoped
      .filter((transaction) => transaction.direction === "debit" && transaction.amount > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [effectiveTransactions, timelinePeriod]);

  const uncategorizedInPeriod = useMemo(
    () => editableTransactions.filter((transaction) => resolveCategoryGroupBucket(transaction) === "Uncategorized"),
    [editableTransactions]
  );

  const visibleEditableTransactions = useMemo(() => {
    if (rulesFilter === "all") {
      return editableTransactions;
    }
    return uncategorizedInPeriod;
  }, [rulesFilter, editableTransactions, uncategorizedInPeriod]);
  const flowTitle = incomeMode === "modeled"
    ? merchantDetailMode === "summary"
      ? "Flow: Income/Super/Credits -> Gross Income -> Net/Tax/Super Out -> Category -> Subcategory -> Merchant Summary"
      : "Flow: Income/Super/Credits -> Gross Income -> Net/Tax/Super Out -> Category -> Subcategory -> Detailed Transactions"
    : incomeMode === "expenses"
      ? merchantDetailMode === "summary"
        ? "Flow: Total Spend -> Category -> Subcategory -> Merchant Summary"
        : "Flow: Total Spend -> Category -> Subcategory -> Detailed Transactions"
      : merchantDetailMode === "summary"
        ? "Flow: Income -> Category -> Subcategory -> Merchant Summary + Savings"
        : "Flow: Income -> Category -> Subcategory -> Detailed Transactions + Savings";
  const chartHeight = useMemo(() => {
    const dynamicHeight = 360 + viz.maxColumnNodes * 34;
    return Math.max(460, Math.min(980, dynamicHeight));
  }, [viz.maxColumnNodes]);
  const chartLeftMargin = incomeMode === "modeled" ? 230 : 240;
  const chartRightMargin = merchantDetailMode === "summary" ? 360 : 420;
  const nodePadding = useMemo(() => {
    const branchCount = viz.maxColumnNodes;
    if (branchCount >= 24) {
      return 8;
    }
    if (branchCount >= 16) {
      return 12;
    }
    if (branchCount >= 14) {
      return 14;
    }
    return 18;
  }, [viz.maxColumnNodes]);

  const subtitle = useMemo(() => {
    if (transactionBatches.length === 0) {
      return "No CSV data loaded";
    }
    return `${transactionBatches.length} CSV file(s) | ${transactions.length} unique transaction(s)`;
  }, [transactionBatches.length, transactions.length]);

  const accountSummary = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    const buckets = new Map<string, number>();

    for (const account of accountEntries) {
      const signedValue = account.kind === "asset" ? account.value : -account.value;
      if (account.kind === "asset") {
        assets += account.value;
      } else {
        liabilities += account.value;
      }
      buckets.set(account.bucket, (buckets.get(account.bucket) ?? 0) + signedValue);
    }

    return {
      assets: Number(assets.toFixed(2)),
      liabilities: Number(liabilities.toFixed(2)),
      netWorth: Number((assets - liabilities).toFixed(2)),
      byBucket: [...buckets.entries()].map(([bucket, total]) => ({ bucket, total })).sort((a, b) => b.total - a.total)
    };
  }, [accountEntries]);

  const resolvedGoals: ResolvedGoalEntry[] = useMemo(
    () => buildResolvedGoals(goals, accountEntries, accountSummary.netWorth),
    [goals, accountEntries, accountSummary.netWorth]
  );

  const accountHistorySorted = useMemo(
    () => [...accountHistory].sort((a, b) => a.month.localeCompare(b.month)),
    [accountHistory]
  );

  const accountHistorySeries = useMemo(
    () => accountEntries.map((account, index) => ({
      accountId: account.id,
      dataKey: `acct_${account.id}`,
      label: account.name || `Account ${index + 1}`,
      color: [
        "#8B2942", // Currant Red
        "#3D8B4F", // Currant Leaf
        "#C4843E", // Warm gold
        "#5C6FA8", // Muted blue
        "#9B6BA0", // Soft purple
        "#B05C40", // Terra cotta
        "#4A7A6B", // Teal green
        "#5C4A7A"  // Deep purple
      ][index % 8]
    })),
    [accountEntries]
  );

  const accountHistoryChartData = useMemo<Array<{ month: string; label: string; [key: string]: string | number }>>(() => {
    return accountHistorySorted.map((snapshot) => {
      const monthDate = new Date(`${snapshot.month}-01T00:00:00`);
      const row: { month: string; label: string; [key: string]: number | string } = {
        month: snapshot.month,
        label: Number.isNaN(monthDate.getTime())
          ? snapshot.month
          : monthDate.toLocaleString("en-AU", { month: "short", year: "2-digit" }),
        totalNetWorth: 0
      };
      let runningTotal = 0;
      for (const account of accountEntries) {
        const rawValue = snapshot.balances[account.id] ?? 0;
        const signedValue = account.kind === "asset" ? rawValue : -rawValue;
        row[`acct_${account.id}`] = Number(signedValue.toFixed(2));
        runningTotal += signedValue;
      }
      row.totalNetWorth = Number(runningTotal.toFixed(2));
      return row;
    });
  }, [accountHistorySorted, accountEntries]);

  const { inferredMonthlyNetFlow, inferredMonthCount } = useMemo(() => {
    const byMonth = new Map<string, { credits: number; debits: number }>();
    for (const transaction of effectiveTransactions) {
      const month = monthKey(transaction.date);
      if (!byMonth.has(month)) {
        byMonth.set(month, { credits: 0, debits: 0 });
      }
      const current = byMonth.get(month);
      if (!current) {
        continue;
      }
      if (transaction.direction === "credit" && transaction.amount < 0) {
        current.credits += Math.abs(transaction.amount);
      }
      if (transaction.direction === "debit" && transaction.amount > 0) {
        current.debits += transaction.amount;
      }
    }
    const monthSummaries = [...byMonth.values()];
    if (monthSummaries.length === 0) {
      return { inferredMonthlyNetFlow: 0, inferredMonthCount: 0 };
    }
    const totalNet = monthSummaries.reduce((sum, summary) => sum + (summary.credits - summary.debits), 0);
    return {
      inferredMonthlyNetFlow: Number((totalNet / monthSummaries.length).toFixed(2)),
      inferredMonthCount: monthSummaries.length
    };
  }, [effectiveTransactions]);

  const startNetWorth = forecastStartNetWorth ?? accountSummary.netWorth;
  const monthlyForecastDelta = forecastMonthlyDelta ?? inferredMonthlyNetFlow;
  const maxGoalTarget = resolvedGoals.reduce((max, goal) => Math.max(max, goal.target), 0);

  const forecastPoints = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    const points: Array<{ label: string; monthKey: string; netWorth: number; goal: number }> = [];
    let running = startNetWorth;
    for (let index = 0; index < 18; index += 1) {
      const pointDate = new Date(base.getFullYear(), base.getMonth() + index, 1);
      if (index > 0) {
        running += monthlyForecastDelta;
      }
      points.push({
        label: pointDate.toLocaleString("en-AU", { month: "short", year: "2-digit" }),
        monthKey: `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, "0")}`,
        netWorth: Number(running.toFixed(2)),
        goal: maxGoalTarget
      });
    }
    return points;
  }, [startNetWorth, monthlyForecastDelta, maxGoalTarget]);

  const expensePieData = useMemo(() => {
    const top = viz.categoryStats.slice(0, 7).map((item) => ({
      name: item.category,
      value: Number(item.total.toFixed(2)),
      color: item.color
    }));
    const tail = viz.categoryStats.slice(7);
    const tailTotal = tail.reduce((sum, item) => sum + item.total, 0);
    if (tailTotal > 0) {
      top.push({
        name: "Other",
        value: Number(tailTotal.toFixed(2)),
        color: "#9E7088"
      });
    }
    return top;
  }, [viz.categoryStats]);

  const monthlyExpenseData = useMemo(() => {
    const categoryColors = new Map(viz.categoryStats.map((stat) => [stat.category, stat.color]));
    const categoriesInViz = viz.categoryStats.map((stat) => stat.category);
    const byMonth = new Map<string, { month: string; [key: string]: string | number }>();
    for (const transaction of effectiveTransactions) {
      if (transaction.direction !== "debit" || transaction.amount <= 0) {
        continue;
      }
      const month = monthKey(transaction.date);
      if (!byMonth.has(month)) {
        byMonth.set(month, { month });
      }
      const row = byMonth.get(month);
      if (!row) {
        continue;
      }
      const category = resolveCategoryGroupBucket(transaction);
      const current = typeof row[category] === "number" ? (row[category] as number) : 0;
      row[category] = Number((current + transaction.amount).toFixed(2));
    }
    const sortedMonths = [...byMonth.keys()].sort((a, b) => a.localeCompare(b));
    const rows = sortedMonths.map((month) => {
      const row = byMonth.get(month) ?? { month };
      const monthDate = new Date(`${month}-01T00:00:00`);
      return {
        ...row,
        label: Number.isNaN(monthDate.getTime())
          ? month
          : monthDate.toLocaleString("en-AU", { month: "short", year: "2-digit" })
      };
    });
    const usedCategories = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (key !== "month" && key !== "label") {
          usedCategories.add(key);
        }
      }
    }
    const categories = categoriesInViz
      .filter((cat) => usedCategories.has(cat))
      .map((cat) => ({
        category: cat,
        color: categoryColors.get(cat) ?? "#9E7088"
      }));
    return { rows, categories };
  }, [effectiveTransactions, viz.categoryStats]);

  function defaultDraftFor(transaction: RawTransaction): TransactionDraft {
    return {
      categoryGroup: resolveCategoryGroupBucket(transaction),
      category: resolveSubcategoryBucket(transaction),
      nickname: transaction.manualNickname ?? "",
      applySimilar: true
    };
  }

  function draftFor(transaction: RawTransaction): TransactionDraft {
    return drafts[transaction.id] ?? defaultDraftFor(transaction);
  }

  function updateDraft(transaction: RawTransaction, patch: Partial<TransactionDraft>): void {
    setDrafts((prev) => {
      const current = prev[transaction.id] ?? defaultDraftFor(transaction);
      return {
        ...prev,
        [transaction.id]: {
          ...current,
          ...patch
        }
      };
    });
  }

  function updateCategoryDefinition(id: string, patch: Partial<Pick<CategoryDefinition, "category">>): void {
    setCategoryDefinitions((prev) => prev.map((definition) => (
      definition.id === id ? { ...definition, ...patch } : definition
    )));
  }

  function addCategoryDefinition(): void {
    setCategoryDefinitions((prev) => [
      ...prev,
      {
        id: createLocalId("cat"),
        category: "",
        subcategories: [{ id: createLocalId("subcat"), name: "", keywords: [] }]
      }
    ]);
  }

  function removeCategoryDefinition(id: string): void {
    setCategoryDefinitions((prev) => prev.filter((definition) => definition.id !== id));
  }

  function addCategorySubcategory(categoryId: string): void {
    setCategoryDefinitions((prev) => prev.map((definition) => {
      if (definition.id !== categoryId) {
        return definition;
      }
      return {
        ...definition,
        subcategories: [
          ...definition.subcategories,
          { id: createLocalId("subcat"), name: "", keywords: [] }
        ]
      };
    }));
  }

  function updateCategorySubcategory(
    categoryId: string,
    subcategoryId: string,
    patch: Partial<Omit<CategorySubcategoryDefinition, "id">>
  ): void {
    setCategoryDefinitions((prev) => prev.map((definition) => {
      if (definition.id !== categoryId) {
        return definition;
      }
      return {
        ...definition,
        subcategories: definition.subcategories.map((subcategory) => (
          subcategory.id === subcategoryId ? { ...subcategory, ...patch } : subcategory
        ))
      };
    }));
  }

  function removeCategorySubcategory(categoryId: string, subcategoryId: string): void {
    setCategoryDefinitions((prev) => prev.map((definition) => {
      if (definition.id !== categoryId) {
        return definition;
      }
      return {
        ...definition,
        subcategories: definition.subcategories.filter((subcategory) => subcategory.id !== subcategoryId)
      };
    }));
  }

  function resetCategoryDefinitions(): void {
    setCategoryDefinitions(buildDefaultCategoryDefinitions());
  }

  function saveRule(transaction: RawTransaction): void {
    const draft = draftFor(transaction);
    const cleaned = sanitizeManualRule({
      categoryGroup: draft.categoryGroup,
      category: draft.category,
      nickname: draft.nickname
    });
    const similarityKey = transaction.similarityKey ?? similarityKeyForTransaction(transaction);

    setManualRules((prev) => {
      const byId = { ...prev.byId };
      const bySimilarity = { ...prev.bySimilarity };

      if (cleaned) {
        byId[transaction.id] = cleaned;
      } else {
        delete byId[transaction.id];
      }

      if (draft.applySimilar) {
        if (cleaned) {
          bySimilarity[similarityKey] = cleaned;
        } else {
          delete bySimilarity[similarityKey];
        }
      }

      return { byId, bySimilarity };
    });
  }

  function clearRule(transaction: RawTransaction): void {
    const similarityKey = transaction.similarityKey ?? similarityKeyForTransaction(transaction);
    setManualRules((prev) => {
      const byId = { ...prev.byId };
      const bySimilarity = { ...prev.bySimilarity };
      delete byId[transaction.id];
      delete bySimilarity[similarityKey];
      return { byId, bySimilarity };
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[transaction.id];
      return next;
    });
  }

  function clearAllRules(): void {
    setManualRules(EMPTY_MANUAL_RULES);
    setDrafts({});
    localStorage.removeItem(MANUAL_RULES_STORAGE_KEY);
    localStorage.removeItem(MANUAL_DRAFTS_STORAGE_KEY);
  }

  function addAccount(): void {
    setAccountEntries((prev) => [
      ...prev,
      {
        id: createLocalId("acct"),
        name: "",
        bucket: "Other",
        kind: "asset",
        value: 0
      }
    ]);
  }

  function updateAccount(id: string, patch: Partial<Omit<AccountEntry, "id">>): void {
    setAccountEntries((prev) => prev.map((account) => (
      account.id === id ? { ...account, ...patch } : account
    )));
  }

  function removeAccount(id: string): void {
    setAccountEntries((prev) => prev.filter((account) => account.id !== id));
    setAccountHistory((prev) => prev.map((snapshot) => {
      const nextBalances = { ...snapshot.balances };
      delete nextBalances[id];
      return {
        ...snapshot,
        balances: nextBalances
      };
    }));
    setGoals((prev) => prev.map((goal) => ({
      ...goal,
      accountIds: goal.accountIds.filter((accountId) => accountId !== id)
    })));
  }

  function addGoal(): void {
    setGoals((prev) => [
      ...prev,
      {
        id: createLocalId("goal"),
        name: "",
        target: 0,
        current: 0,
        trackingMode: "manual",
        accountIds: []
      }
    ]);
  }

  function updateGoal(id: string, patch: Partial<Omit<GoalEntry, "id">>): void {
    setGoals((prev) => prev.map((goal) => (
      goal.id === id ? { ...goal, ...patch } : goal
    )));
  }

  function removeGoal(id: string): void {
    setGoals((prev) => prev.filter((goal) => goal.id !== id));
  }

  function addAccountHistorySnapshot(): void {
    setAccountHistory((prev) => {
      const sorted = [...prev].sort((a, b) => a.month.localeCompare(b.month));
      const seedMonth = sorted.length === 0 ? currentMonthValue() : nextMonthValue(sorted[sorted.length - 1].month);
      const balances: Record<string, number> = {};
      for (const account of accountEntries) {
        balances[account.id] = Number(account.value.toFixed(2));
      }
      return [
        ...prev,
        {
          id: createLocalId("acct_hist"),
          month: seedMonth,
          balances
        }
      ];
    });
  }

  function updateAccountHistoryMonth(snapshotId: string, month: string): void {
    setAccountHistory((prev) => prev.map((snapshot) => (
      snapshot.id === snapshotId ? { ...snapshot, month } : snapshot
    )));
  }

  function updateAccountHistoryBalance(snapshotId: string, accountId: string, value: number): void {
    setAccountHistory((prev) => prev.map((snapshot) => {
      if (snapshot.id !== snapshotId) {
        return snapshot;
      }
      const normalizedValue = Number.isFinite(value) ? Number(value.toFixed(2)) : 0;
      return {
        ...snapshot,
        balances: {
          ...snapshot.balances,
          [accountId]: normalizedValue
        }
      };
    }));
  }

  function removeAccountHistorySnapshot(snapshotId: string): void {
    setAccountHistory((prev) => prev.filter((snapshot) => snapshot.id !== snapshotId));
  }

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const csvRaw = await file.text();
      const imported = parseBankCsvToTransactions(csvRaw, categoryDefinitions);
      if (imported.transactions.length === 0) {
        setTransactionDataStatus(`No transactions were parsed from ${file.name}. Check CSV columns and format.`);
        return;
      }

      const nextBatch = buildTransactionBatch({
        fileName: file.name,
        transactions: imported.transactions,
        warnings: imported.warnings
      });
      const mergedBefore = new Set(transactions.map((transaction) => transaction.id));
      const duplicateCount = nextBatch.transactions.filter((transaction) => mergedBefore.has(transaction.id)).length;

      setTransactionBatches((prev) => [nextBatch, ...prev]);
      setError(null);
      setTimelinePeriod("all");
      if (activeTab !== "transactionData") {
        setActiveTab("transactionData");
      }
      const uploadedIncomeModel = buildIncomeModelFromTransactions(imported.transactions, payrollDraft);
      if (!uploadedIncomeModel.enabled && incomeBasisMode === "modeled") {
        setIncomeBasisMode("raw");
      }

      if (imported.warnings.length > 0 || duplicateCount > 0) {
        setTransactionDataStatus(
          `Added ${file.name}: ${imported.transactions.length} transaction(s), ${duplicateCount} duplicate(s), ${imported.warnings.length} skipped row(s).`
        );
      } else {
        setTransactionDataStatus(`Added ${file.name} with ${imported.transactions.length} transaction(s).`);
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
      setTransactionDataStatus(`Upload failed: ${message}`);
    } finally {
      event.target.value = "";
    }
  }

  function updateBatchCoverage(batchId: string, patch: { coverageStart?: string; coverageEnd?: string }): void {
    setTransactionBatches((prev) => prev.map((batch) => {
      if (batch.id !== batchId) {
        return batch;
      }
      const nextStart = patch.coverageStart && patch.coverageStart.trim() ? patch.coverageStart : batch.coverageStart;
      const nextEnd = patch.coverageEnd && patch.coverageEnd.trim() ? patch.coverageEnd : batch.coverageEnd;
      const normalized = normalizeCoverageRange(nextStart, nextEnd);
      return {
        ...batch,
        coverageStart: normalized.start,
        coverageEnd: normalized.end
      };
    }));
    setTransactionDataStatus("Updated CSV coverage dates.");
  }

  function deleteBatch(batchId: string): void {
    setTransactionBatches((prev) => {
      const next = prev.filter((batch) => batch.id !== batchId);
      if (next.length === 0) {
        setActiveTab("transactionData");
      }
      return next;
    });
    setError(null);
    setTimelinePeriod("all");
    if (incomeBasisMode === "modeled") {
      setIncomeBasisMode("raw");
    }
    setTransactionDataStatus("Deleted CSV batch.");
  }

  function clearUploadedData(): void {
    setTransactionBatches([]);
    setError(null);
    setTimelinePeriod("all");
    setActiveTab("transactionData");
    if (incomeBasisMode === "modeled") {
      setIncomeBasisMode("raw");
    }
    setTransactionDataStatus("Cleared all CSV data. Add a CSV to begin.");
  }

  function resetAllData(): void {
    const confirmed = window.confirm(
      "Clear all Currant data in this browser and restore the built-in defaults?"
    );
    if (!confirmed) {
      return;
    }

    for (const key of APP_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }

    setTransactionBatches([]);
    setManualRules(EMPTY_MANUAL_RULES);
    setDrafts({});
    setCategoryDefinitions(buildDefaultCategoryDefinitions());
    setAccountEntries(DEFAULT_ACCOUNT_ENTRIES);
    setAccountHistory([]);
    setGoals(DEFAULT_GOALS);
    setPayrollDraft(EMPTY_PAYROLL_DRAFT);
    setForecastStartNetWorth(null);
    setForecastMonthlyDelta(null);
    setFlowStartMode("income");
    setIncomeBasisMode("raw");
    setMerchantDetailMode("summary");
    setTimelinePeriod("all");
    setRulesFilter("needs");
    setError(null);
    setTransactionDataStatus("Reset to built-in defaults. Add a CSV to begin.");
    setSettingsError(null);
    setSettingsStatus("Restored built-in defaults and cleared all browser-stored data.");
  }

  function handleContinueFree(): void {
    localStorage.setItem(FREE_TIER_KEY, "1");
    setBypassAuth(true);
    setShowLanding(false);
  }

  async function handleSignOut(): Promise<void> {
    localStorage.removeItem(FREE_TIER_KEY);
    setBypassAuth(false);
    await signOut();
  }

  function handleExportData(): void {
    const snapshot = {
      transactionBatches,
      manualRules,
      drafts,
      categoryDefinitions,
      accountEntries,
      accountHistory,
      goals,
      payrollDraft,
      forecastSettings: { startNetWorth: forecastStartNetWorth, monthlyDelta: forecastMonthlyDelta },
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `currant-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function applySnapshot(candidate: Record<string, unknown>): void {
    const nextTransactionBatches = parseStoredTransactionBatches(candidate.transactionBatches);
    const nextManualRules = sanitizeStoredManualRules(candidate.manualRules);
    const nextDrafts = sanitizeStoredDrafts(candidate.drafts);
    const nextCategoryDefinitions = parseStoredCategoryDefinitions(candidate.categoryDefinitions);
    const nextAccountEntries = parseStoredAccountEntries(candidate.accountEntries);
    const nextAccountHistory = parseStoredAccountHistory(candidate.accountHistory);
    const nextGoals = parseStoredGoals(candidate.goals);
    const nextPayrollDraft = sanitizePayrollDraft(candidate.payrollDraft);
    const nextForecast = parseForecastSettings(candidate.forecastSettings);

    setTransactionBatches(nextTransactionBatches);
    setManualRules(nextManualRules);
    setDrafts(nextDrafts);
    setCategoryDefinitions(nextCategoryDefinitions.length > 0 ? nextCategoryDefinitions : buildDefaultCategoryDefinitions());
    setAccountEntries(nextAccountEntries.length > 0 ? nextAccountEntries : DEFAULT_ACCOUNT_ENTRIES);
    setAccountHistory(nextAccountHistory);
    setGoals(nextGoals.length > 0 ? nextGoals : DEFAULT_GOALS);
    setPayrollDraft(nextPayrollDraft);
    setForecastStartNetWorth(nextForecast.startNetWorth);
    setForecastMonthlyDelta(nextForecast.monthlyDelta);
  }

  function migrateLocalDataToCloud(): void {
    scheduleSyncUpload({
      transactionBatches,
      manualRules,
      drafts,
      categoryDefinitions,
      accountEntries,
      accountHistory,
      goals,
      payrollDraft,
      forecastSettings: { startNetWorth: forecastStartNetWorth, monthlyDelta: forecastMonthlyDelta }
    }, 0);
    setShowMigration(false);
  }

  function exportAllData(): void {
    try {
      const backup = {
        version: APP_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          transactionBatches,
          manualRules,
          drafts,
          categoryDefinitions,
          accountEntries,
          accountHistory,
          goals,
          payrollDraft,
          forecastSettings: {
            startNetWorth: forecastStartNetWorth,
            monthlyDelta: forecastMonthlyDelta
          }
        }
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `currant-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSettingsError(null);
      setSettingsStatus("Exported a JSON backup of your browser data.");
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : String(exportError);
      setSettingsStatus(null);
      setSettingsError(`Export failed: ${message}`);
    }
  }

  async function importAllData(file: File): Promise<void> {
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const payload = parsed && typeof parsed === "object" && "data" in parsed
        ? (parsed as { data: unknown }).data
        : parsed;

      if (!payload || typeof payload !== "object") {
        throw new Error("Backup format is invalid.");
      }

      const candidate = payload as Record<string, unknown>;
      const nextTransactionBatches = parseStoredTransactionBatches(candidate.transactionBatches);
      const nextManualRules = sanitizeStoredManualRules(candidate.manualRules);
      const nextDrafts = sanitizeStoredDrafts(candidate.drafts);
      const nextCategoryDefinitions = parseStoredCategoryDefinitions(candidate.categoryDefinitions);
      const nextAccountEntries = parseStoredAccountEntries(candidate.accountEntries);
      const nextAccountHistory = parseStoredAccountHistory(candidate.accountHistory);
      const nextGoals = parseStoredGoals(candidate.goals);
      const nextPayrollDraft = sanitizePayrollDraft(candidate.payrollDraft);
      const nextForecast = parseForecastSettings(candidate.forecastSettings);

      for (const key of APP_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }

      setTransactionBatches(nextTransactionBatches);
      setManualRules(nextManualRules);
      setDrafts(nextDrafts);
      setCategoryDefinitions(nextCategoryDefinitions.length > 0 ? nextCategoryDefinitions : buildDefaultCategoryDefinitions());
      setAccountEntries(nextAccountEntries.length > 0 ? nextAccountEntries : DEFAULT_ACCOUNT_ENTRIES);
      setAccountHistory(nextAccountHistory);
      setGoals(nextGoals.length > 0 ? nextGoals : DEFAULT_GOALS);
      setPayrollDraft(nextPayrollDraft);
      setForecastStartNetWorth(nextForecast.startNetWorth);
      setForecastMonthlyDelta(nextForecast.monthlyDelta);
      setFlowStartMode("income");
      setIncomeBasisMode("raw");
      setMerchantDetailMode("summary");
      setTimelinePeriod("all");
      setRulesFilter("needs");
      setError(null);
      setTransactionDataStatus(
        nextTransactionBatches.length > 0
          ? `Imported ${nextTransactionBatches.length} CSV file(s) from backup.`
          : "No CSV dataset loaded yet. Add a CSV to begin."
      );
      setSettingsError(null);
      setSettingsStatus(`Imported backup from ${file.name}.`);
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : String(importError);
      setSettingsStatus(null);
      setSettingsError(`Import failed: ${message}`);
    }
  }

  if (loading || authLoading) {
    return (
      <main className="dashboard-shell loading-state">
        <p>Loading saved dataset...</p>
      </main>
    );
  }

  if ((isSupabaseConfigured && !user && !bypassAuth) || showLanding) {
    return (
      <LandingPage
        onContinueFree={handleContinueFree}
        onSignUp={signInWithGoogle}
        onLogIn={signInWithGoogle}
        onBack={showLanding ? () => setShowLanding(false) : undefined}
      />
    );
  }

  const tabMeta: Record<DashboardTab, { label: string; title: string; subtitle: string }> = {
    forecast: {
      label: "Dashboard",
      title: "Dashboard",
      subtitle: "Track your net worth trajectory and account trends."
    },
    accounts: {
      label: "Accounts",
      title: "Accounts",
      subtitle: "Track assets and liabilities that make up your net worth."
    },
    income: {
      label: "Income",
      title: "Income Model",
      subtitle: "Configure payroll values used for modeled salary flow."
    },
    expenses: {
      label: "Expenses",
      title: "Expense Analysis",
      subtitle: "Sankey + category breakdown for spend behavior."
    },
    categories: {
      label: "Categories",
      title: "Categories & Rules",
      subtitle: "Define taxonomy and classify transactions quickly."
    },
    settings: {
      label: "Settings",
      title: "Settings & Backups",
      subtitle: "Manage browser storage, backups, and full-app resets."
    },
    transactionData: {
      label: "Transaction Data",
      title: "Transaction Data",
      subtitle: "Manage uploaded CSV files, coverage ranges, and historical transaction periods."
    }
  };
  const outputTabs: DashboardTab[] = ["forecast", "expenses"];
  const inputTabs: DashboardTab[] = ["transactionData", "accounts", "income", "categories", "settings"];

  const activeTabMeta = tabMeta[activeTab];

  return (
    <main className="dashboard-shell">
      <Sidebar
        tabMeta={tabMeta}
        outputTabs={outputTabs}
        inputTabs={inputTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accountSummary={accountSummary}
        goals={resolvedGoals}
        currency={meta.currency}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        user={user}
        onSignOut={handleSignOut}
        onSignIn={() => setShowAuthModal(true)}
        onGoHome={() => setShowLanding(true)}
        onExportData={handleExportData}
      />

      <section className="workspace">
        <WorkspaceHeader
          title={activeTabMeta.title}
          subtitle={activeTabMeta.subtitle}
          generatedLabel={subtitle}
        />

        {activeTab === "transactionData" ? (
          <TransactionDataTab
            batches={transactionBatches}
            totalTransactionCount={transactions.length}
            statusMessage={transactionDataStatus}
            errorMessage={error}
            onUpload={handleCsvUpload}
            onUpdateBatchCoverage={updateBatchCoverage}
            onDeleteBatch={deleteBatch}
            onDeleteAllBatches={clearUploadedData}
          />
        ) : null}

        {activeTab === "forecast" ? (
          <ForecastTab
            currency={meta.currency}
            accountSummary={accountSummary}
            startNetWorth={startNetWorth}
            monthlyForecastDelta={monthlyForecastDelta}
            isMonthlyDeltaOverridden={forecastMonthlyDelta !== null}
            inferredMonthCount={inferredMonthCount}
            forecastPoints={forecastPoints}
            maxGoalTarget={maxGoalTarget}
            accountHistorySeries={accountHistorySeries}
            accountHistoryChartData={accountHistoryChartData}
            expensePieData={expensePieData}
          />
        ) : null}

        {activeTab === "accounts" ? (
          <AccountsTab
            currency={meta.currency}
            accountSummary={accountSummary}
            accountEntries={accountEntries}
            goals={resolvedGoals}
            accountHistorySnapshots={accountHistorySorted}
            inferredMonthlyNetFlow={inferredMonthlyNetFlow}
            forecastStartNetWorth={forecastStartNetWorth}
            forecastMonthlyDelta={forecastMonthlyDelta}
            onAddAccount={addAccount}
            onUpdateAccount={updateAccount}
            onRemoveAccount={removeAccount}
            onAddGoal={addGoal}
            onUpdateGoal={updateGoal}
            onRemoveGoal={removeGoal}
            onAddAccountHistorySnapshot={addAccountHistorySnapshot}
            onUpdateAccountHistoryMonth={updateAccountHistoryMonth}
            onUpdateAccountHistoryBalance={updateAccountHistoryBalance}
            onRemoveAccountHistorySnapshot={removeAccountHistorySnapshot}
            onForecastStartNetWorthChange={setForecastStartNetWorth}
            onForecastMonthlyDeltaChange={setForecastMonthlyDelta}
            onResetStartNetWorth={() => setForecastStartNetWorth(null)}
            onResetMonthlyDelta={() => setForecastMonthlyDelta(null)}
          />
        ) : null}

        {activeTab === "income" ? (
          <IncomeTab
            currency={meta.currency}
            payrollDraft={payrollDraft}
            matchedPayCount={incomeModel.payEventCount}
            onPayrollDraftChange={(patch) => setPayrollDraft((prev) => ({ ...prev, ...patch }))}
          />
        ) : null}

        {activeTab === "settings" ? (
          <SettingsTab
            statusMessage={settingsStatus}
            errorMessage={settingsError}
            onResetAllData={resetAllData}
            onExportAllData={exportAllData}
            onImportData={importAllData}
          />
        ) : null}

        {activeTab === "expenses" ? (
          <ExpensesTab
            currency={meta.currency}
            flowStartMode={flowStartMode}
            onFlowStartModeChange={setFlowStartMode}
            incomeBasisMode={incomeBasisMode}
            onIncomeBasisModeChange={setIncomeBasisMode}
            incomeModelEnabled={Boolean(incomeModel?.enabled)}
            merchantDetailMode={merchantDetailMode}
            onMerchantDetailModeChange={setMerchantDetailMode}
            timelinePeriod={timelinePeriod}
            onTimelinePeriodChange={setTimelinePeriod}
            timelineOptions={timelineOptions}
            viz={viz}
            uncategorizedCount={uncategorizedInPeriod.length}
            flowTitle={flowTitle}
            chartHeight={chartHeight}
            chartLeftMargin={chartLeftMargin}
            chartRightMargin={chartRightMargin}
            nodePadding={nodePadding}
            monthlyExpenseData={monthlyExpenseData}
          />
        ) : null}

        {activeTab === "categories" ? (
          <CategoriesTab
            currency={meta.currency}
            timelinePeriod={timelinePeriod}
            onTimelinePeriodChange={setTimelinePeriod}
            timelineOptions={timelineOptions}
            uncategorizedCount={uncategorizedInPeriod.length}
            categoryDefinitions={categoryDefinitions}
            onAddCategoryDefinition={addCategoryDefinition}
            onResetCategoryDefinitions={resetCategoryDefinitions}
            onUpdateCategoryDefinition={updateCategoryDefinition}
            onRemoveCategoryDefinition={removeCategoryDefinition}
            onAddCategorySubcategory={addCategorySubcategory}
            onUpdateCategorySubcategory={updateCategorySubcategory}
            onRemoveCategorySubcategory={removeCategorySubcategory}
            rulesFilter={rulesFilter}
            onRulesFilterChange={setRulesFilter}
            onClearAllRules={clearAllRules}
            visibleEditableTransactions={visibleEditableTransactions}
            draftFor={draftFor}
            onUpdateDraft={updateDraft}
            onSaveRule={saveRule}
            onClearRule={clearRule}
            subcategoryOptionsByGroup={subcategoryOptionsByGroup}
            categoryGroupOptions={categoryGroupOptions}
          />
        ) : null}
      </section>

      {/* Auth modal */}
      {showAuthModal ? (
        <div className="migration-overlay" onClick={() => setShowAuthModal(false)}>
          <div className="migration-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Sign in to Currant</h2>
            <p>Sign in with your Google or GitHub account to enable cloud sync across devices.</p>
            <div className="migration-actions">
              <button type="button" className="migration-btn-primary" onClick={signInWithGoogle}>
                Continue with Google
              </button>
            </div>
            <div className="migration-actions">
              <button type="button" className="migration-btn-secondary" onClick={() => setShowAuthModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Migration dialog */}
      {showMigration ? (
        <div className="migration-overlay">
          <div className="migration-dialog">
            <h2>Migrate local data to cloud?</h2>
            <p>
              You have local data saved in this browser. Would you like to upload it to your cloud account
              so it&apos;s available on all your devices?
            </p>
            <div className="migration-actions">
              <button type="button" className="migration-btn-primary" onClick={migrateLocalDataToCloud}>
                Yes, upload to cloud
              </button>
              <button type="button" className="migration-btn-secondary" onClick={() => setShowMigration(false)}>
                Keep local only
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
