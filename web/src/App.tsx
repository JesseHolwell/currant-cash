import { useEffect, useMemo, useState } from "react";
import {
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
  UPLOADED_META_STORAGE_KEY,
  UPLOADED_TRANSACTIONS_STORAGE_KEY,
  applyManualRules,
  buildIncomeModelFromTransactions,
  buildDefaultCategoryDefinitions,
  buildVisualization,
  canonicalizeCategoryGroup,
  categoryTaxonomyFromDefinitions,
  createLocalId,
  isInTimeline,
  monthKey,
  parseForecastSettings,
  parseStoredRawTransactions,
  parseStoredSankeyMeta,
  parseStoredAccountEntries,
  parseBankCsvToTransactions,
  parseStoredCategoryDefinitions,
  parseStoredGoals,
  resolveCategoryGroupBucket,
  resolveSubcategoryBucket,
  sanitizeManualRule,
  sanitizePayrollDraft,
  similarityKeyForTransaction
} from "./models";
import type {
  AccountEntry,
  CategoryDefinition,
  DashboardTab,
  GoalEntry,
  IncomeMode,
  ManualRule,
  ManualRulesState,
  MerchantDetailMode,
  PayrollDraft,
  RawTransaction,
  SankeyMeta,
  TimelinePeriod,
  TransactionDraft
} from "./models";
import { AccountsTab } from "./components/dashboard/tabs/AccountsTab";
import { CategoriesTab } from "./components/dashboard/tabs/CategoriesTab";
import { ExpensesTab } from "./components/dashboard/tabs/ExpensesTab";
import { ForecastTab } from "./components/dashboard/tabs/ForecastTab";
import { IncomeTab } from "./components/dashboard/tabs/IncomeTab";
import { Sidebar } from "./components/dashboard/Sidebar";
import { WorkspaceHeader } from "./components/dashboard/WorkspaceHeader";
export default function App() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("forecast");
  const [transactions, setTransactions] = useState<RawTransaction[]>([]);
  const [incomeMode, setIncomeMode] = useState<IncomeMode>("raw");
  const [merchantDetailMode, setMerchantDetailMode] = useState<MerchantDetailMode>("summary");
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>("all");
  const [manualRules, setManualRules] = useState<ManualRulesState>(EMPTY_MANUAL_RULES);
  const [drafts, setDrafts] = useState<Record<string, TransactionDraft>>({});
  const [categoryDefinitions, setCategoryDefinitions] = useState<CategoryDefinition[]>(() => buildDefaultCategoryDefinitions());
  const [rulesFilter, setRulesFilter] = useState<"needs" | "all">("needs");
  const [hasHydratedLocalRules, setHasHydratedLocalRules] = useState(false);
  const [accountEntries, setAccountEntries] = useState<AccountEntry[]>(DEFAULT_ACCOUNT_ENTRIES);
  const [goals, setGoals] = useState<GoalEntry[]>(DEFAULT_GOALS);
  const [payrollDraft, setPayrollDraft] = useState<PayrollDraft>(EMPTY_PAYROLL_DRAFT);
  const [forecastStartNetWorth, setForecastStartNetWorth] = useState<number | null>(null);
  const [forecastMonthlyDelta, setForecastMonthlyDelta] = useState<number | null>(null);
  const [hasHydratedUiSettings, setHasHydratedUiSettings] = useState(false);
  const [meta, setMeta] = useState<SankeyMeta>({ generatedAt: "", currency: "AUD" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);

  useEffect(() => {
    try {
      const uploadedTransactionsRaw = localStorage.getItem(UPLOADED_TRANSACTIONS_STORAGE_KEY);
      const uploadedMetaRaw = localStorage.getItem(UPLOADED_META_STORAGE_KEY);

      const uploadedTransactions = parseStoredRawTransactions(uploadedTransactionsRaw ? JSON.parse(uploadedTransactionsRaw) : null);
      const uploadedMeta = parseStoredSankeyMeta(uploadedMetaRaw ? JSON.parse(uploadedMetaRaw) : null);

      if (uploadedTransactions.length > 0) {
        setTransactions(uploadedTransactions);
        setMeta(uploadedMeta ?? {
          generatedAt: new Date().toISOString(),
          currency: "AUD"
        });
        setUploadStatus(`Loaded ${uploadedTransactions.length} transactions from browser storage.`);
      } else {
        setTransactions([]);
        setMeta({ generatedAt: "", currency: "AUD" });
        setUploadStatus("No CSV dataset loaded yet. Upload a bank CSV to begin.");
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
      setTransactions([]);
      setMeta({ generatedAt: "", currency: "AUD" });
      setUploadStatus("Stored upload data is invalid. Upload a CSV to reset.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const rawRules = localStorage.getItem(MANUAL_RULES_STORAGE_KEY);
      if (rawRules) {
        const parsed = JSON.parse(rawRules) as Partial<ManualRulesState>;
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
        setManualRules({
          byId,
          bySimilarity
        });
      }

      const rawDrafts = localStorage.getItem(MANUAL_DRAFTS_STORAGE_KEY);
      if (rawDrafts) {
        const parsedDrafts = JSON.parse(rawDrafts) as Record<string, TransactionDraft>;
        const normalizedDrafts: Record<string, TransactionDraft> = {};
        for (const [transactionId, draft] of Object.entries(parsedDrafts)) {
          normalizedDrafts[transactionId] = {
            categoryGroup: canonicalizeCategoryGroup(draft.categoryGroup),
            category: (draft.category ?? "").trim(),
            nickname: draft.nickname ?? "",
            applySimilar: draft.applySimilar !== false
          };
        }
        setDrafts(normalizedDrafts);
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

  useEffect(() => {
    try {
      const rawAccounts = localStorage.getItem(ACCOUNT_ENTRIES_STORAGE_KEY);
      if (rawAccounts) {
        const parsedAccounts = parseStoredAccountEntries(JSON.parse(rawAccounts));
        if (parsedAccounts.length > 0) {
          setAccountEntries(parsedAccounts);
        }
      }

      const rawGoals = localStorage.getItem(GOALS_STORAGE_KEY);
      if (rawGoals) {
        const parsedGoals = parseStoredGoals(JSON.parse(rawGoals));
        if (parsedGoals.length > 0) {
          setGoals(parsedGoals);
        }
      }

      const rawPayroll = localStorage.getItem(PAYROLL_DRAFT_STORAGE_KEY);
      if (rawPayroll) {
        setPayrollDraft(sanitizePayrollDraft(JSON.parse(rawPayroll)));
      }

      const rawForecast = localStorage.getItem(FORECAST_SETTINGS_STORAGE_KEY);
      if (rawForecast) {
        const parsedForecast = parseForecastSettings(JSON.parse(rawForecast));
        setForecastStartNetWorth(parsedForecast.startNetWorth);
        setForecastMonthlyDelta(parsedForecast.monthlyDelta);
      }
    } catch {
      setAccountEntries(DEFAULT_ACCOUNT_ENTRIES);
      setGoals(DEFAULT_GOALS);
      setPayrollDraft(EMPTY_PAYROLL_DRAFT);
      setForecastStartNetWorth(null);
      setForecastMonthlyDelta(null);
    } finally {
      setHasHydratedUiSettings(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedUiSettings) {
      return;
    }
    localStorage.setItem(ACCOUNT_ENTRIES_STORAGE_KEY, JSON.stringify(accountEntries));
  }, [accountEntries, hasHydratedUiSettings]);

  useEffect(() => {
    if (!hasHydratedUiSettings) {
      return;
    }
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  }, [goals, hasHydratedUiSettings]);

  useEffect(() => {
    if (!hasHydratedUiSettings) {
      return;
    }
    localStorage.setItem(PAYROLL_DRAFT_STORAGE_KEY, JSON.stringify(payrollDraft));
  }, [payrollDraft, hasHydratedUiSettings]);

  useEffect(() => {
    if (!hasHydratedUiSettings) {
      return;
    }
    localStorage.setItem(FORECAST_SETTINGS_STORAGE_KEY, JSON.stringify({
      startNetWorth: forecastStartNetWorth,
      monthlyDelta: forecastMonthlyDelta
    }));
  }, [forecastStartNetWorth, forecastMonthlyDelta, hasHydratedUiSettings]);

  const effectiveTransactions = useMemo(
    () => applyManualRules(transactions, manualRules),
    [transactions, manualRules]
  );

  const webIncomeModel = useMemo(
    () => buildIncomeModelFromTransactions(effectiveTransactions, payrollDraft),
    [effectiveTransactions, payrollDraft]
  );

  const incomeModel = webIncomeModel;

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
    ? "Flow: Income/Super/Credits -> Gross Income -> Net/Tax/Super Out -> Category + Tax Leaves -> Subcategory -> Detailed Transactions"
    : incomeMode === "expenses"
      ? "Flow: Total Spend -> Category -> Subcategory -> Transactions"
      : "Flow: Income -> Category -> Subcategory -> Merchant + Savings";
  const chartHeight = useMemo(() => {
    const dynamicHeight = 360 + viz.maxColumnNodes * 34;
    return Math.max(460, Math.min(980, dynamicHeight));
  }, [viz.maxColumnNodes]);
  const chartRightMargin = incomeMode === "expenses" ? 430 : merchantDetailMode === "summary" ? 360 : 430;
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
    if (!meta.generatedAt) {
      return "No CSV dataset loaded";
    }
    return `Generated ${new Date(meta.generatedAt).toLocaleString("en-AU")}`;
  }, [meta.generatedAt]);

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

  const inferredMonthlyNetFlow = useMemo(() => {
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
      return 0;
    }
    const totalNet = monthSummaries.reduce((sum, summary) => sum + (summary.credits - summary.debits), 0);
    return Number((totalNet / monthSummaries.length).toFixed(2));
  }, [effectiveTransactions]);

  const startNetWorth = forecastStartNetWorth ?? accountSummary.netWorth;
  const monthlyForecastDelta = forecastMonthlyDelta ?? inferredMonthlyNetFlow;
  const maxGoalTarget = goals.reduce((max, goal) => Math.max(max, goal.target), 0);

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
        color: "#a3b0bf"
      });
    }
    return top;
  }, [viz.categoryStats]);

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

  function updateCategoryDefinition(id: string, patch: Partial<Omit<CategoryDefinition, "id">>): void {
    setCategoryDefinitions((prev) => prev.map((definition) => (
      definition.id === id ? { ...definition, ...patch } : definition
    )));
  }

  function addCategoryDefinition(): void {
    setCategoryDefinitions((prev) => [
      ...prev,
      { id: createLocalId("cat"), category: "", subcategories: "" }
    ]);
  }

  function removeCategoryDefinition(id: string): void {
    setCategoryDefinitions((prev) => prev.filter((definition) => definition.id !== id));
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
  }

  function addGoal(): void {
    setGoals((prev) => [
      ...prev,
      {
        id: createLocalId("goal"),
        name: "",
        target: 0,
        current: 0
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

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const csvRaw = await file.text();
      const imported = parseBankCsvToTransactions(csvRaw, categoryDefinitions);
      if (imported.transactions.length === 0) {
        setUploadStatus(`No transactions were parsed from ${file.name}. Check CSV columns and format.`);
        return;
      }

      setTransactions(imported.transactions);
      const uploadedMeta: SankeyMeta = {
        generatedAt: new Date().toISOString(),
        currency: "AUD"
      };
      const uploadedIncomeModel = buildIncomeModelFromTransactions(imported.transactions, payrollDraft);
      setMeta(uploadedMeta);
      setError(null);
      setTimelinePeriod("all");
      localStorage.setItem(UPLOADED_TRANSACTIONS_STORAGE_KEY, JSON.stringify(imported.transactions));
      localStorage.setItem(UPLOADED_META_STORAGE_KEY, JSON.stringify(uploadedMeta));
      if (!uploadedIncomeModel.enabled && incomeMode === "modeled") {
        setIncomeMode("raw");
      }

      if (imported.warnings.length > 0) {
        setUploadStatus(`Loaded ${imported.transactions.length} transactions from ${file.name} with ${imported.warnings.length} skipped row(s).`);
      } else {
        setUploadStatus(`Loaded ${imported.transactions.length} transactions from ${file.name}.`);
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
      setUploadStatus(`Upload failed: ${message}`);
    } finally {
      event.target.value = "";
    }
  }

  function clearUploadedData(): void {
    setTransactions([]);
    setMeta({ generatedAt: "", currency: "AUD" });
    setError(null);
    setTimelinePeriod("all");
    if (incomeMode === "modeled") {
      setIncomeMode("raw");
    }
    localStorage.removeItem(UPLOADED_TRANSACTIONS_STORAGE_KEY);
    localStorage.removeItem(UPLOADED_META_STORAGE_KEY);
    setUploadStatus("Cleared uploaded data. Upload a bank CSV to begin.");
  }

  if (loading) {
    return (
      <main className="dashboard-shell loading-state">
        <p>Loading saved dataset...</p>
      </main>
    );
  }

  const tabMeta: Record<DashboardTab, { label: string; title: string; subtitle: string }> = {
    forecast: {
      label: "Forecast",
      title: "Net Worth Forecast",
      subtitle: "Balance trajectory using your current net worth and monthly flow."
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
    }
  };

  const activeTabMeta = tabMeta[activeTab];

  return (
    <main className="dashboard-shell">
      <Sidebar
        tabMeta={tabMeta}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        accountSummary={accountSummary}
        goals={goals}
        currency={meta.currency}
      />

      <section className="workspace">
        <WorkspaceHeader
          title={activeTabMeta.title}
          subtitle={activeTabMeta.subtitle}
          generatedLabel={subtitle}
        />
        <section className="panel controls-panel upload-panel">
          <div>
            <h3>Data Source</h3>
            <p className="mode-note">
              Upload your raw bank CSV directly in the browser. Imported data is stored locally on this device.
            </p>
            {error ? <p className="error">{error}</p> : null}
            {uploadStatus ? <p className="mode-note">{uploadStatus}</p> : null}
          </div>
          <div className="mode-toggle">
            <label className="mode-btn active upload-btn">
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={(event) => {
                  void handleCsvUpload(event);
                }}
              />
            </label>
            <button type="button" className="mode-btn" onClick={clearUploadedData}>
              Clear Data
            </button>
          </div>
        </section>

        {activeTab === "forecast" ? (
          <ForecastTab
            currency={meta.currency}
            accountSummary={accountSummary}
            startNetWorth={startNetWorth}
            monthlyForecastDelta={monthlyForecastDelta}
            forecastStartNetWorth={forecastStartNetWorth}
            forecastMonthlyDelta={forecastMonthlyDelta}
            inferredMonthlyNetFlow={inferredMonthlyNetFlow}
            forecastPoints={forecastPoints}
            maxGoalTarget={maxGoalTarget}
            goals={goals}
            onForecastStartNetWorthChange={setForecastStartNetWorth}
            onForecastMonthlyDeltaChange={setForecastMonthlyDelta}
            onResetStartNetWorth={() => setForecastStartNetWorth(null)}
            onResetMonthlyDelta={() => setForecastMonthlyDelta(null)}
            onAddGoal={addGoal}
            onUpdateGoal={updateGoal}
            onRemoveGoal={removeGoal}
          />
        ) : null}

        {activeTab === "accounts" ? (
          <AccountsTab
            currency={meta.currency}
            accountSummary={accountSummary}
            accountEntries={accountEntries}
            onAddAccount={addAccount}
            onUpdateAccount={updateAccount}
            onRemoveAccount={removeAccount}
          />
        ) : null}

        {activeTab === "income" ? (
          <IncomeTab
            currency={meta.currency}
            payrollDraft={payrollDraft}
            onPayrollDraftChange={(patch) => setPayrollDraft((prev) => ({ ...prev, ...patch }))}
          />
        ) : null}

        {activeTab === "expenses" ? (
          <ExpensesTab
            currency={meta.currency}
            incomeMode={incomeMode}
            onIncomeModeChange={setIncomeMode}
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
            chartRightMargin={chartRightMargin}
            nodePadding={nodePadding}
            expensePieData={expensePieData}
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
    </main>
  );
}
