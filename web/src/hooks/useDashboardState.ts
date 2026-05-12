import { useMemo } from "react";
import {
  annualNetLockedContribution,
  applyManualRules,
  buildIncomeModelFromTransactions,
  buildResolvedGoals,
  buildVisualization,
  categoryTaxonomyFromDefinitions,
  deriveMetaFromBatches,
  isExcludedFromIncomeAnalytics,
  isExcludedFromSpendAnalytics,
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
  TransactionExplorerFilters,
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
  transactionExplorerFilters: TransactionExplorerFilters;
  fireCurrentAge: number;
  fireAnnualReturn: number;
  fireMultiplier: number;
  firePreservationAge: number;
  /** User-configured currency override. Falls back to batch-derived currency. */
  currency?: string;
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
  transactionExplorerFilters,
  fireCurrentAge,
  fireAnnualReturn,
  fireMultiplier,
  firePreservationAge,
  currency: currencyOverride
}: DashboardStateInput) {
  const transactions = useMemo(
    () => mergeTransactionsFromBatches(transactionBatches),
    [transactionBatches]
  );

  const meta: SankeyMeta = useMemo(
    () => {
      const derived = deriveMetaFromBatches(transactionBatches);
      return currencyOverride ? { ...derived, currency: currencyOverride } : derived;
    },
    [transactionBatches, currencyOverride]
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

  const allEditableTransactions = useMemo(
    () => effectiveTransactions
      .filter((t) => t.direction === "debit" && t.amount > 0)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [effectiveTransactions]
  );

  const editableTransactions = useMemo(() => {
    const scoped = allEditableTransactions.filter((t) => isInTimeline(t.date, timelinePeriod));
    return scoped;
  }, [allEditableTransactions, timelinePeriod]);

  const uncategorizedInPeriod = useMemo(
    () => editableTransactions.filter((t) => resolveCategoryGroupBucket(t) === "Uncategorized"),
    [editableTransactions]
  );

  const transactionExplorerTransactions = useMemo(() => {
    const defaultMonth = timelinePeriod === "all" ? "" : timelinePeriod;
    const startMonth = transactionExplorerFilters.startMonth || defaultMonth;
    const endMonth = transactionExplorerFilters.endMonth || defaultMonth;
    const rangeStart = startMonth && endMonth && startMonth.localeCompare(endMonth) > 0 ? endMonth : startMonth;
    const rangeEnd = startMonth && endMonth && startMonth.localeCompare(endMonth) > 0 ? startMonth : endMonth;

    return allEditableTransactions.filter((transaction) => {
      const transactionMonth = monthKey(transaction.date);
      if (rangeStart && transactionMonth.localeCompare(rangeStart) < 0) {
        return false;
      }
      if (rangeEnd && transactionMonth.localeCompare(rangeEnd) > 0) {
        return false;
      }
      if (
        transactionExplorerFilters.categoryGroup &&
        resolveCategoryGroupBucket(transaction) !== transactionExplorerFilters.categoryGroup
      ) {
        return false;
      }
      return true;
    });
  }, [allEditableTransactions, timelinePeriod, transactionExplorerFilters]);

  const transactionExplorerUncategorizedCount = useMemo(
    () => transactionExplorerTransactions.filter((t) => resolveCategoryGroupBucket(t) === "Uncategorized").length,
    [transactionExplorerTransactions]
  );

  const visibleEditableTransactions = useMemo(() => {
    if (rulesFilter === "all") {
      return transactionExplorerTransactions;
    }
    return transactionExplorerTransactions.filter((t) => resolveCategoryGroupBucket(t) === "Uncategorized");
  }, [rulesFilter, transactionExplorerTransactions]);

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

  const effectiveAccountEntries = useMemo(() => {
    if (accountHistory.length === 0) return accountEntries;
    const latestSnapshot = [...accountHistory].sort((a, b) => b.date.localeCompare(a.date))[0];
    return accountEntries.map((account) => {
      const historyValue = latestSnapshot.balances[account.id];
      return historyValue !== undefined ? { ...account, value: historyValue } : account;
    });
  }, [accountEntries, accountHistory]);

  const accountSummary = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    let lockedAssets = 0;
    const buckets = new Map<string, number>();

    for (const account of effectiveAccountEntries) {
      const signedValue = account.kind === "asset" ? account.value : -account.value;
      if (account.kind === "asset") {
        assets += account.value;
        if (account.lockedUntilAge !== undefined) {
          lockedAssets += account.value;
        }
      } else {
        liabilities += account.value;
      }
      buckets.set(account.bucket, (buckets.get(account.bucket) ?? 0) + signedValue);
    }

    const netWorth = assets - liabilities;
    // Liquid net worth = everything we could actually spend before preservation age.
    // Liabilities reduce the liquid side (they're due before retirement, not against locked super).
    const liquidNetWorth = (assets - lockedAssets) - liabilities;

    return {
      assets: Number(assets.toFixed(2)),
      liabilities: Number(liabilities.toFixed(2)),
      netWorth: Number(netWorth.toFixed(2)),
      lockedAssets: Number(lockedAssets.toFixed(2)),
      liquidNetWorth: Number(liquidNetWorth.toFixed(2)),
      byBucket: [...buckets.entries()].map(([bucket, total]) => ({ bucket, total })).sort((a, b) => b.total - a.total)
    };
  }, [effectiveAccountEntries]);

  const resolvedGoals: ResolvedGoalEntry[] = useMemo(
    () => buildResolvedGoals(goals, effectiveAccountEntries, accountSummary.netWorth),
    [goals, effectiveAccountEntries, accountSummary.netWorth]
  );

  const accountHistorySorted = useMemo(
    () => [...accountHistory].sort((a, b) => a.date.localeCompare(b.date)),
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
      const snapshotDate = new Date(`${snapshot.date}T00:00:00`);
      const month = snapshot.date.slice(0, 7);
      const row: { month: string; label: string; [key: string]: number | string } = {
        month,
        label: Number.isNaN(snapshotDate.getTime())
          ? snapshot.date
          : snapshotDate.toLocaleString("en-AU", { month: "short", year: "2-digit" }),
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
      if (transaction.direction === "credit" && transaction.amount < 0 && !isExcludedFromIncomeAnalytics(transaction)) {
        current.credits += Math.abs(transaction.amount);
      }
      if (transaction.direction === "debit" && transaction.amount > 0 && !isExcludedFromSpendAnalytics(transaction)) {
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

  const startNetWorth = accountSummary.netWorth;
  const monthlyForecastDelta = inferredMonthlyNetFlow;
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
    const annualReturnRate = fireAnnualReturn / 100;
    const totalNW = accountSummary.netWorth;
    const liquidNW = accountSummary.liquidNetWorth;
    const lockedNW = accountSummary.lockedAssets;
    const hasLockedAssets = lockedNW > 0;
    const monthlySavings = inferredMonthlyNetFlow;

    // PV of an annuity: amount needed today to fund `payment` annually for `years` years at rate r.
    function pvAnnuity(payment: number, years: number, r: number): number {
      if (years <= 0 || payment <= 0) return 0;
      if (r <= 0) return payment * years;
      return payment * (1 - Math.pow(1 + r, -years)) / r;
    }

    // Two-phase targets — used when any account is locked (e.g. super).
    const bridgeYears = Math.max(0, firePreservationAge - fireCurrentAge);
    const bridgeTarget = pvAnnuity(annualExpenses, bridgeYears, annualReturnRate);
    const perpetualTarget = fireNumber;
    // Future value of a stream of annual contributions C over N years at rate r:
    // FV = C × ((1+r)^N − 1) / r   (FV of an ordinary annuity)
    const annualLockedContribution = annualNetLockedContribution(payrollDraft);
    function fvAnnuity(c: number, years: number, r: number): number {
      if (years <= 0 || c <= 0) return 0;
      if (r <= 0) return c * years;
      return c * (Math.pow(1 + r, years) - 1) / r;
    }
    const projectedLockedAtPreservation =
      lockedNW * Math.pow(1 + annualReturnRate, bridgeYears)
      + fvAnnuity(annualLockedContribution, bridgeYears, annualReturnRate);
    // Equivalent locked balance needed today so it grows to perpetualTarget by preservation age.
    const lockedTargetToday = annualReturnRate > 0 && bridgeYears > 0
      ? perpetualTarget / Math.pow(1 + annualReturnRate, bridgeYears)
      : perpetualTarget;

    const bridgeAchieved = bridgeTarget > 0 && liquidNW >= bridgeTarget;
    const perpetualAchieved = perpetualTarget > 0 && projectedLockedAtPreservation >= perpetualTarget;
    const twoPhaseAchieved = bridgeAchieved && perpetualAchieved;

    const yearsUntilRetire = Math.max(0, 65 - fireCurrentAge);
    const coastFireNumber =
      monthlyReturn > 0 && fireNumber > 0
        ? fireNumber / Math.pow(1 + monthlyReturn, yearsUntilRetire * 12)
        : fireNumber;

    let yearsToFire: number | null = null;
    if (fireNumber <= 0 || annualExpenses <= 0) {
      yearsToFire = null;
    } else if (hasLockedAssets) {
      // Two-phase: iterate forward; FIRE achieved when liquid covers bridge AND projected super covers perpetual.
      if (twoPhaseAchieved) {
        yearsToFire = 0;
      } else if (monthlyReturn > 0 && monthlySavings > 0) {
        const annualGrowthFactor = Math.pow(1 + monthlyReturn, 12);
        const annualContribution = monthlySavings * ((annualGrowthFactor - 1) / monthlyReturn);
        let liquidT = liquidNW;
        let lockedT = lockedNW;
        for (let t = 1; t <= 60; t++) {
          liquidT = liquidT * annualGrowthFactor + annualContribution;
          lockedT = lockedT * annualGrowthFactor + annualLockedContribution;
          const yearsRemaining = Math.max(0, firePreservationAge - fireCurrentAge - t);
          const bridgeNeed = pvAnnuity(annualExpenses, yearsRemaining, annualReturnRate);
          // Once user stops working (FIRE'd), no further super contributions.
          const lockedAtPres = lockedT * Math.pow(1 + annualReturnRate, yearsRemaining);
          if (liquidT >= bridgeNeed && lockedAtPres >= perpetualTarget) {
            yearsToFire = t;
            break;
          }
        }
      }
    } else if (totalNW >= fireNumber) {
      yearsToFire = 0;
    } else if (monthlyReturn > 0 && monthlySavings > 0) {
      const n =
        Math.log((fireNumber * monthlyReturn + monthlySavings) / (totalNW * monthlyReturn + monthlySavings)) /
        Math.log(1 + monthlyReturn);
      yearsToFire = n / 12;
    }

    const freqMultiplier =
      payrollDraft.payFrequency === "weekly" ? 52 / 12 : payrollDraft.payFrequency === "fortnightly" ? 26 / 12 : 1;
    const grossMonthlyIncome = payrollDraft.grossPay > 0 ? payrollDraft.grossPay * freqMultiplier : null;
    const savingsRate = grossMonthlyIncome ? (monthlySavings / grossMonthlyIncome) * 100 : null;

    // Projection: track liquid + locked separately so the chart can show them.
    const projectionData: Array<{ age: number; label: string; netWorth: number; liquid: number; locked: number }> = [];
    let liquidProj = liquidNW;
    let lockedProj = lockedNW;
    const annualGrowthFactor = Math.pow(1 + monthlyReturn, 12);
    const annualContribution =
      monthlyReturn > 0
        ? monthlySavings * ((annualGrowthFactor - 1) / monthlyReturn)
        : monthlySavings * 12;
    for (let i = 0; i <= 60; i++) {
      projectionData.push({
        age: fireCurrentAge + i,
        label: String(fireCurrentAge + i),
        netWorth: Math.round(liquidProj + lockedProj),
        liquid: Math.round(liquidProj),
        locked: Math.round(lockedProj)
      });
      if (i > 0 && (liquidProj + lockedProj) >= fireNumber * 1.5) break;
      liquidProj = liquidProj * annualGrowthFactor + annualContribution;
      lockedProj = lockedProj * annualGrowthFactor + annualLockedContribution;
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
      monthlySavings,
      hasLockedAssets,
      liquidNetWorth: liquidNW,
      lockedNetWorth: lockedNW,
      bridgeYears,
      bridgeTarget,
      perpetualTarget,
      lockedTargetToday,
      projectedLockedAtPreservation,
      annualLockedContribution,
      bridgeAchieved,
      perpetualAchieved,
      twoPhaseAchieved
    };
  }, [
    inferredMonthlyExpenses,
    inferredMonthlyNetFlow,
    fireMultiplier,
    fireAnnualReturn,
    fireCurrentAge,
    firePreservationAge,
    accountSummary.netWorth,
    accountSummary.liquidNetWorth,
    accountSummary.lockedAssets,
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
    transactionExplorerTransactions,
    transactionExplorerUncategorizedCount,
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
