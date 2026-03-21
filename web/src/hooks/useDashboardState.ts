import { useMemo } from "react";
import {
  applyManualRules,
  buildIncomeModelFromTransactions,
  buildResolvedGoals,
  buildVisualization,
  categoryTaxonomyFromDefinitions,
  deriveMetaFromBatches,
  isInTimeline,
  mergeTransactionsFromBatches,
  monthKey,
  resolveCategoryGroupBucket,
  resolveSubcategoryBucket
} from "../domain";
import type {
  AccountEntry,
  AccountHistorySnapshot,
  CategoryDefinition,
  FlowStartMode,
  GoalEntry,
  IncomeBasisMode,
  ManualRulesState,
  MerchantDetailMode,
  PayrollDraft,
  ResolvedGoalEntry,
  SankeyMeta,
  TimelinePeriod,
  TransactionBatch
} from "../domain";

interface DashboardStateInput {
  transactionBatches: TransactionBatch[];
  manualRules: ManualRulesState;
  categoryDefinitions: CategoryDefinition[];
  payrollDraft: PayrollDraft;
  accountEntries: AccountEntry[];
  accountHistory: AccountHistorySnapshot[];
  goals: GoalEntry[];
  flowStartMode: FlowStartMode;
  incomeBasisMode: IncomeBasisMode;
  merchantDetailMode: MerchantDetailMode;
  timelinePeriod: TimelinePeriod;
  rulesFilter: "needs" | "all";
  forecastStartNetWorth: number | null;
  forecastMonthlyDelta: number | null;
  fireCurrentAge: number;
  fireAnnualReturn: number;
  fireMultiplier: number;
}

export function useDashboardState({
  transactionBatches,
  manualRules,
  categoryDefinitions,
  payrollDraft,
  accountEntries,
  accountHistory,
  goals,
  flowStartMode,
  incomeBasisMode,
  merchantDetailMode,
  timelinePeriod,
  rulesFilter,
  forecastStartNetWorth,
  forecastMonthlyDelta,
  fireCurrentAge,
  fireAnnualReturn,
  fireMultiplier
}: DashboardStateInput) {
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
  const incomeMode = flowStartMode === "expenses" ? "expenses" : incomeBasisMode;

  const timelineOptions = useMemo(() => {
    const options = Array.from(
      new Set(effectiveTransactions.map((t) => monthKey(t.date)))
    ).sort();
    return ["all" as TimelinePeriod, ...options];
  }, [effectiveTransactions]);

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
    const scoped = effectiveTransactions.filter((t) => isInTimeline(t.date, timelinePeriod));
    return scoped
      .filter((t) => t.direction === "debit" && t.amount > 0)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [effectiveTransactions, timelinePeriod]);

  const uncategorizedInPeriod = useMemo(
    () => editableTransactions.filter((t) => resolveCategoryGroupBucket(t) === "Uncategorized"),
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
    if (branchCount >= 24) return 8;
    if (branchCount >= 16) return 12;
    if (branchCount >= 14) return 14;
    return 18;
  }, [viz.maxColumnNodes]);

  const subtitle = useMemo(() => {
    if (transactionBatches.length === 0) return "No CSV data loaded";
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
        "#8B2942",
        "#3D8B4F",
        "#C4843E",
        "#5C6FA8",
        "#9B6BA0",
        "#B05C40",
        "#4A7A6B",
        "#5C4A7A"
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

  const { inferredMonthlyNetFlow, inferredMonthlyExpenses, inferredMonthCount } = useMemo(() => {
    const byMonth = new Map<string, { credits: number; debits: number }>();
    for (const transaction of effectiveTransactions) {
      const month = monthKey(transaction.date);
      if (!byMonth.has(month)) {
        byMonth.set(month, { credits: 0, debits: 0 });
      }
      const current = byMonth.get(month);
      if (!current) continue;
      if (transaction.direction === "credit" && transaction.amount < 0) {
        current.credits += Math.abs(transaction.amount);
      }
      if (transaction.direction === "debit" && transaction.amount > 0) {
        current.debits += transaction.amount;
      }
    }
    const monthSummaries = [...byMonth.values()];
    if (monthSummaries.length === 0) {
      return { inferredMonthlyNetFlow: 0, inferredMonthlyExpenses: 0, inferredMonthCount: 0 };
    }
    const totalNet = monthSummaries.reduce((sum, s) => sum + (s.credits - s.debits), 0);
    const totalDebits = monthSummaries.reduce((sum, s) => sum + s.debits, 0);
    return {
      inferredMonthlyNetFlow: Number((totalNet / monthSummaries.length).toFixed(2)),
      inferredMonthlyExpenses: Number((totalDebits / monthSummaries.length).toFixed(2)),
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
      if (index > 0) running += monthlyForecastDelta;
      points.push({
        label: pointDate.toLocaleString("en-AU", { month: "short", year: "2-digit" }),
        monthKey: `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, "0")}`,
        netWorth: Number(running.toFixed(2)),
        goal: maxGoalTarget
      });
    }
    return points;
  }, [startNetWorth, monthlyForecastDelta, maxGoalTarget]);

  const fireInsightsData = useMemo(() => {
    const annualExpenses = inferredMonthlyExpenses * 12;
    const fireNumber = annualExpenses * fireMultiplier;
    const leanFireNumber = fireNumber * 0.6;
    const monthlyReturn = Math.pow(1 + fireAnnualReturn / 100, 1 / 12) - 1;
    const currentNW = accountSummary.netWorth;
    const monthlySavings = inferredMonthlyNetFlow;

    const yearsUntilRetire = Math.max(0, 65 - fireCurrentAge);
    const coastFireNumber =
      monthlyReturn > 0 && fireNumber > 0
        ? fireNumber / Math.pow(1 + monthlyReturn, yearsUntilRetire * 12)
        : fireNumber;

    let yearsToFire: number | null = null;
    if (fireNumber <= 0 || annualExpenses <= 0) {
      yearsToFire = null;
    } else if (currentNW >= fireNumber) {
      yearsToFire = 0;
    } else if (monthlyReturn > 0 && monthlySavings > 0) {
      const n =
        Math.log((fireNumber * monthlyReturn + monthlySavings) / (currentNW * monthlyReturn + monthlySavings)) /
        Math.log(1 + monthlyReturn);
      yearsToFire = n / 12;
    }

    const freqMultiplier =
      payrollDraft.payFrequency === "weekly" ? 52 / 12 : payrollDraft.payFrequency === "fortnightly" ? 26 / 12 : 1;
    const grossMonthlyIncome = payrollDraft.grossPay > 0 ? payrollDraft.grossPay * freqMultiplier : null;
    const savingsRate = grossMonthlyIncome ? (monthlySavings / grossMonthlyIncome) * 100 : null;

    const projectionData: Array<{ age: number; label: string; netWorth: number }> = [];
    let nw = currentNW;
    const annualGrowthFactor = Math.pow(1 + monthlyReturn, 12);
    const annualContribution =
      monthlyReturn > 0
        ? monthlySavings * ((annualGrowthFactor - 1) / monthlyReturn)
        : monthlySavings * 12;
    const maxYears = 60;
    for (let i = 0; i <= maxYears; i++) {
      projectionData.push({ age: fireCurrentAge + i, label: String(fireCurrentAge + i), netWorth: Math.round(nw) });
      if (i > 0 && nw >= fireNumber * 1.5) break;
      nw = nw * annualGrowthFactor + annualContribution;
    }

    return {
      fireNumber,
      leanFireNumber,
      coastFireNumber,
      yearsToFire,
      projectedFireAge: yearsToFire !== null && yearsToFire > 0
        ? fireCurrentAge + yearsToFire
        : yearsToFire === 0 ? fireCurrentAge : null,
      savingsRate,
      projectionData,
      monthlySavings
    };
  }, [
    inferredMonthlyExpenses,
    inferredMonthlyNetFlow,
    fireMultiplier,
    fireAnnualReturn,
    fireCurrentAge,
    accountSummary.netWorth,
    payrollDraft
  ]);

  const expensePieData = useMemo(() => {
    const top = viz.categoryStats.slice(0, 7).map((item) => ({
      name: item.category,
      value: Number(item.total.toFixed(2)),
      color: item.color
    }));
    const tail = viz.categoryStats.slice(7);
    const tailTotal = tail.reduce((sum, item) => sum + item.total, 0);
    if (tailTotal > 0) {
      top.push({ name: "Other", value: Number(tailTotal.toFixed(2)), color: "#9E7088" });
    }
    return top;
  }, [viz.categoryStats]);

  const monthlyExpenseData = useMemo(() => {
    const categoryColors = new Map(viz.categoryStats.map((stat) => [stat.category, stat.color]));
    const categoriesInViz = viz.categoryStats.map((stat) => stat.category);
    const byMonth = new Map<string, { month: string; [key: string]: string | number }>();
    for (const transaction of effectiveTransactions) {
      if (transaction.direction !== "debit" || transaction.amount <= 0) continue;
      const month = monthKey(transaction.date);
      if (!byMonth.has(month)) byMonth.set(month, { month });
      const row = byMonth.get(month);
      if (!row) continue;
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
        if (key !== "month" && key !== "label") usedCategories.add(key);
      }
    }
    const categories = categoriesInViz
      .filter((cat) => usedCategories.has(cat))
      .map((cat) => ({ category: cat, color: categoryColors.get(cat) ?? "#9E7088" }));
    return { rows, categories };
  }, [effectiveTransactions, viz.categoryStats]);

  return {
    transactions,
    meta,
    effectiveTransactions,
    incomeModel,
    incomeMode,
    timelineOptions,
    viz,
    configuredTaxonomy,
    categoryGroupOptions,
    subcategoryOptionsByGroup,
    editableTransactions,
    uncategorizedInPeriod,
    visibleEditableTransactions,
    flowTitle,
    chartHeight,
    chartLeftMargin,
    chartRightMargin,
    nodePadding,
    subtitle,
    accountSummary,
    resolvedGoals,
    accountHistorySorted,
    accountHistorySeries,
    accountHistoryChartData,
    inferredMonthlyNetFlow,
    inferredMonthlyExpenses,
    inferredMonthCount,
    startNetWorth,
    monthlyForecastDelta,
    maxGoalTarget,
    forecastPoints,
    fireInsightsData,
    expensePieData,
    monthlyExpenseData
  };
}
