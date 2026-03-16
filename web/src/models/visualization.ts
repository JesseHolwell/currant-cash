import {
  ACCOUNT_COLORS,
  CATEGORY_COLORS,
  EMPTY_VIZ,
  EXCLUDED_CATEGORIES,
  HIDDEN_FIXED_LEAF_TAIL_VALUE,
  SUMMARY_TOP_MERCHANTS_PER_GROUP
} from "./constants";
import {
  formatCurrency,
  formatPercent,
  isInTimeline
} from "./formatting";
import {
  groupSubcategoryKey,
  resolveCategoryGroupBucket,
  resolveIncomeSource,
  resolveMerchantBucket,
  resolveSubcategoryBucket
} from "./rules";
import type {
  AccountStat,
  BuildVizResult,
  IncomeModel,
  IncomeMode,
  MerchantDetailMode,
  RawTransaction,
  TimelinePeriod,
  VizLink,
  VizNode
} from "./types";

type MerchantSummary = {
  merchant: string;
  total: number;
  count: number;
};

function summarizeMerchantStats(
  merchantStatsRaw: MerchantSummary[],
  subcategoryLabel: string,
  _subcategoryTotal: number
): MerchantSummary[] {
  if (merchantStatsRaw.length === 0) {
    return [];
  }

  const kept = merchantStatsRaw.slice(0, SUMMARY_TOP_MERCHANTS_PER_GROUP);
  const tail = merchantStatsRaw.slice(SUMMARY_TOP_MERCHANTS_PER_GROUP);

  const tailTotal = tail.reduce((sum, item) => sum + item.total, 0);
  const tailCount = tail.reduce((sum, item) => sum + item.count, 0);
  if (tailTotal > 0) {
    kept.push({
      merchant: `Other ${subcategoryLabel}`,
      total: Number(tailTotal.toFixed(2)),
      count: tailCount
    });
  }

  return kept;
}

export function buildVisualization(
  transactions: RawTransaction[],
  currency: string,
  mode: IncomeMode,
  incomeModel: IncomeModel | null,
  merchantDetailMode: MerchantDetailMode,
  timeline: TimelinePeriod
): BuildVizResult {
  const scopedTransactions = transactions.filter((transaction) => isInTimeline(transaction.date, timeline));

  const creditTransactions = scopedTransactions.filter((transaction) => {
    const bucket = resolveCategoryGroupBucket(transaction);
    return transaction.direction === "credit" && transaction.amount < 0 && bucket !== "Transfers";
  });

  const incomeBySource = new Map<string, number>();
  for (const transaction of creditTransactions) {
    const sourceName = resolveIncomeSource(transaction);
    const amount = Math.abs(transaction.amount);
    incomeBySource.set(sourceName, (incomeBySource.get(sourceName) ?? 0) + amount);
  }

  const rawIncomeSources = [...incomeBySource.entries()].sort((a, b) => b[1] - a[1]);
  const rawTotalIncome = rawIncomeSources.reduce((sum, [, total]) => sum + total, 0);
  const rawIncomeStats: AccountStat[] = rawIncomeSources.map(([source, total], index) => ({
    source,
    total,
    percent: rawTotalIncome > 0 ? total / rawTotalIncome : 0,
    color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length]
  }));

  const spendTransactions = scopedTransactions.filter((transaction) => {
    const bucket = resolveCategoryGroupBucket(transaction);
    return transaction.direction === "debit" && transaction.amount > 0 && !EXCLUDED_CATEGORIES.has(bucket);
  });
  const totalSpend = spendTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);

  const categoryTotals = new Map<string, { total: number; count: number }>();
  const subcategoryTotalsByGroup = new Map<string, Map<string, { total: number; count: number }>>();
  const merchantTotalsBySubcategory = new Map<string, Map<string, { total: number; count: number }>>();
  const transactionsBySubcategory = new Map<string, RawTransaction[]>();
  for (const transaction of spendTransactions) {
    const groupBucket = resolveCategoryGroupBucket(transaction);
    const subcategoryBucket = resolveSubcategoryBucket(transaction);
    const existing = categoryTotals.get(groupBucket);
    if (existing) {
      existing.total += transaction.amount;
      existing.count += 1;
    } else {
      categoryTotals.set(groupBucket, { total: transaction.amount, count: 1 });
    }

    if (!subcategoryTotalsByGroup.has(groupBucket)) {
      subcategoryTotalsByGroup.set(groupBucket, new Map<string, { total: number; count: number }>());
    }
    const subcategoryTotals = subcategoryTotalsByGroup.get(groupBucket);
    if (!subcategoryTotals) {
      continue;
    }
    const subcategoryExisting = subcategoryTotals.get(subcategoryBucket);
    if (subcategoryExisting) {
      subcategoryExisting.total += transaction.amount;
      subcategoryExisting.count += 1;
    } else {
      subcategoryTotals.set(subcategoryBucket, { total: transaction.amount, count: 1 });
    }

    const merchantBucket = resolveMerchantBucket(transaction);
    const groupSubcategory = groupSubcategoryKey(groupBucket, subcategoryBucket);
    if (!merchantTotalsBySubcategory.has(groupSubcategory)) {
      merchantTotalsBySubcategory.set(groupSubcategory, new Map<string, { total: number; count: number }>());
    }
    if (!transactionsBySubcategory.has(groupSubcategory)) {
      transactionsBySubcategory.set(groupSubcategory, []);
    }
    transactionsBySubcategory.get(groupSubcategory)?.push(transaction);
    const merchantTotals = merchantTotalsBySubcategory.get(groupSubcategory);
    if (!merchantTotals) {
      continue;
    }
    const merchantExisting = merchantTotals.get(merchantBucket);
    if (merchantExisting) {
      merchantExisting.total += transaction.amount;
      merchantExisting.count += 1;
    } else {
      merchantTotals.set(merchantBucket, { total: transaction.amount, count: 1 });
    }
  }

  const categoryStats = [...categoryTotals.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([category, summary], index) => ({
      category,
      total: summary.total,
      count: summary.count,
      percent: totalSpend > 0 ? summary.total / totalSpend : 0,
      color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
    }));
  const subcategoryStatsByGroup = new Map<string, Array<{ subcategory: string; total: number; count: number }>>();
  let subcategoryCount = 0;
  for (const group of categoryStats) {
    const subcategoryTotals = subcategoryTotalsByGroup.get(group.category);
    if (!subcategoryTotals) {
      continue;
    }
    const subcategoryStats = [...subcategoryTotals.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([subcategory, summary]) => ({
        subcategory,
        total: summary.total,
        count: summary.count
      }));
    subcategoryStatsByGroup.set(group.category, subcategoryStats);
    subcategoryCount += subcategoryStats.length;
  }

  if (mode === "expenses") {
    const nodes: VizNode[] = [];
    const links: VizLink[] = [];
    const nodeIndex = new Map<string, number>();

    const totalNodeKey = "total:spend";
    nodeIndex.set(totalNodeKey, nodes.length);
    nodes.push({
      name: "Total Spend",
      kind: "total",
      color: "#6B445C",
      value: totalSpend,
      percent: 1,
      labelMain: "Total Spend",
      labelSub: formatCurrency(totalSpend, currency)
    });

    for (const group of categoryStats) {
      const key = `group:${group.category}`;
      nodeIndex.set(key, nodes.length);
      nodes.push({
        name: group.category,
        kind: "group",
        color: group.color,
        value: group.total,
        percent: group.percent,
        labelMain: group.category,
        labelSub: `${formatCurrency(group.total, currency)} | ${formatPercent(group.percent)}`
      });
    }

    const totalNodeIndex = nodeIndex.get(totalNodeKey);
    if (totalNodeIndex === undefined) {
      return EMPTY_VIZ;
    }

    for (const group of categoryStats) {
      const target = nodeIndex.get(`group:${group.category}`);
      if (target === undefined) {
        continue;
      }
      links.push({
        source: totalNodeIndex,
        target,
        value: Number(group.total.toFixed(2)),
        color: group.color,
        kind: "group"
      });
    }

    let subcategoryNodeCount = 0;
    for (const group of categoryStats) {
      const groupNodeIndex = nodeIndex.get(`group:${group.category}`);
      const subcategoryStats = subcategoryStatsByGroup.get(group.category);
      if (groupNodeIndex === undefined || !subcategoryStats) {
        continue;
      }

      for (const subcategory of subcategoryStats) {
        const subcategoryKey = `subcategory:${group.category}:${subcategory.subcategory}`;
        nodeIndex.set(subcategoryKey, nodes.length);
        nodes.push({
          name: subcategory.subcategory,
          kind: "subcategory",
          color: group.color,
          value: subcategory.total,
          labelMain: subcategory.subcategory,
          labelSub: `${formatCurrency(subcategory.total, currency)} | ${subcategory.count} txn${subcategory.count === 1 ? "" : "s"}`
        });
        const subcategoryNodeIndex = nodeIndex.get(subcategoryKey);
        if (subcategoryNodeIndex === undefined) {
          continue;
        }
        links.push({
          source: groupNodeIndex,
          target: subcategoryNodeIndex,
          value: Number(subcategory.total.toFixed(2)),
          color: group.color,
          kind: "subcategory"
        });
        subcategoryNodeCount += 1;
      }
    }

    let merchantNodeCount = 0;
    for (const group of categoryStats) {
      const subcategoryStats = subcategoryStatsByGroup.get(group.category);
      if (!subcategoryStats) {
        continue;
      }

      for (const subcategory of subcategoryStats) {
        const subcategoryNodeIndex = nodeIndex.get(`subcategory:${group.category}:${subcategory.subcategory}`);
        const subcategoryKey = groupSubcategoryKey(group.category, subcategory.subcategory);
        const merchantTotals = merchantTotalsBySubcategory.get(subcategoryKey);
        const detailedTransactions = transactionsBySubcategory.get(subcategoryKey) ?? [];
        if (subcategoryNodeIndex === undefined) {
          continue;
        }

        if (merchantDetailMode === "full") {
          const sortedDetailedTransactions = [...detailedTransactions].sort((a, b) => (
            b.amount - a.amount || b.date.localeCompare(a.date)
          ));
          for (const transaction of sortedDetailedTransactions) {
            const detailName = resolveMerchantBucket(transaction);
            const merchantKey = `merchant:${group.category}:${subcategory.subcategory}:${transaction.id}`;
            nodeIndex.set(merchantKey, nodes.length);
            nodes.push({
              name: detailName,
              kind: "merchant",
              color: group.color,
              value: transaction.amount,
              labelMain: detailName,
              labelSub: `${formatCurrency(transaction.amount, currency)} | ${transaction.date}`
            });

            const merchantNodeIndex = nodeIndex.get(merchantKey);
            if (merchantNodeIndex === undefined) {
              continue;
            }
            links.push({
              source: subcategoryNodeIndex,
              target: merchantNodeIndex,
              value: Number(transaction.amount.toFixed(2)),
              color: group.color,
              kind: "merchant"
            });
            merchantNodeCount += 1;
          }
          continue;
        }

        if (!merchantTotals) {
          continue;
        }

        const merchantStatsRaw = [...merchantTotals.entries()]
          .sort((a, b) => b[1].total - a[1].total)
          .map(([merchant, summary]) => ({
            merchant,
            total: summary.total,
            count: summary.count
          }));
        const merchantStats = summarizeMerchantStats(merchantStatsRaw, subcategory.subcategory, subcategory.total);

        for (const merchant of merchantStats) {
          const merchantKey = `merchant:${group.category}:${subcategory.subcategory}:${merchant.merchant}`;
          nodeIndex.set(merchantKey, nodes.length);
          nodes.push({
            name: merchant.merchant,
            kind: "merchant",
            color: group.color,
            value: merchant.total,
            labelMain: merchant.merchant,
            labelSub: `${formatCurrency(merchant.total, currency)} | ${merchant.count} txn${merchant.count === 1 ? "" : "s"}`
          });

          const merchantNodeIndex = nodeIndex.get(merchantKey);
          if (merchantNodeIndex === undefined) {
            continue;
          }
          links.push({
            source: subcategoryNodeIndex,
            target: merchantNodeIndex,
            value: Number(merchant.total.toFixed(2)),
            color: group.color,
            kind: "merchant"
          });
          merchantNodeCount += 1;
        }
      }
    }

    return {
      sankey: { nodes, links },
      totalIncome: 0,
      totalSpend: Number(totalSpend.toFixed(2)),
      savings: 0,
      spendCount: spendTransactions.length,
      incomeStats: [],
      categoryStats,
      subcategoryCount,
      merchantNodeCount,
      modeledPayEventCount: 0,
      maxColumnNodes: Math.max(categoryStats.length, subcategoryNodeCount, merchantNodeCount, 1)
    };
  }

  const useModeled = mode === "modeled" && Boolean(incomeModel?.enabled);

  let incomeStats = rawIncomeStats;
  let totalIncome = rawTotalIncome;
  let cashAvailable = rawTotalIncome;
  let modeledPayEventCount = 0;
  let modeledTaxOutTotal = 0;
  let modeledSuperOutTotal = 0;
  let modeledSuperFundTaxTotal = 0;
  let modeledTaxBreakdown: Array<{ name: string; total: number; color: string }> = [];

  if (useModeled && incomeModel) {
    const salaryMatchIds = new Set(incomeModel.salaryMatchIds ?? []);
    const payEvents = (incomeModel.payEvents ?? []).filter((event) => isInTimeline(event.date, timeline));
    modeledPayEventCount = payEvents.length;

    const salaryGrossTotal = payEvents.reduce((sum, event) => sum + event.grossPay, 0);
    const salaryNetTotal = payEvents.reduce((sum, event) => sum + event.netPay, 0);
    const fallbackTaxTotal = payEvents.reduce((sum, event) => sum + event.incomeTax, 0);
    const fallbackSuperTotal = payEvents.reduce((sum, event) => sum + event.superGross, 0);
    const fallbackSuperTaxTotal = payEvents.reduce((sum, event) => sum + event.superTax, 0);

    const taxComponents =
      (incomeModel.salary?.taxComponents ?? []).map((component, index) => ({
        name: component.name,
        total: Number((component.perPay * modeledPayEventCount).toFixed(2)),
        color: index % 2 === 0 ? "#C4843E" : "#A06040"
      })) ?? [];

    const otherCredits = creditTransactions
      .filter((transaction) => !salaryMatchIds.has(transaction.id))
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

    const totalTax = taxComponents.length > 0
      ? taxComponents.reduce((sum, component) => sum + component.total, 0)
      : fallbackTaxTotal;
    const totalSuper = fallbackSuperTotal;

    const modeledIncomeStats: AccountStat[] = [];
    if (salaryGrossTotal > 0) {
      modeledIncomeStats.push({ source: "Income In", total: salaryGrossTotal, percent: 0, color: ACCOUNT_COLORS[0] });
    }
    if (totalSuper > 0) {
      modeledIncomeStats.push({ source: "Super In", total: totalSuper, percent: 0, color: ACCOUNT_COLORS[2] });
    }
    if (otherCredits > 0) {
      modeledIncomeStats.push({ source: "Other Credits", total: otherCredits, percent: 0, color: ACCOUNT_COLORS[1] });
    }

    totalIncome = salaryGrossTotal + totalSuper + otherCredits;
    cashAvailable = salaryNetTotal + otherCredits;
    incomeStats = modeledIncomeStats.map((item) => ({
      ...item,
      percent: totalIncome > 0 ? item.total / totalIncome : 0
    }));

    modeledTaxOutTotal = Number(totalTax.toFixed(2));
    modeledSuperOutTotal = Number(totalSuper.toFixed(2));
    modeledSuperFundTaxTotal = Number(fallbackSuperTaxTotal.toFixed(2));
    modeledTaxBreakdown = (
      taxComponents.length > 0
        ? taxComponents
        : [{ name: "Income Tax", total: modeledTaxOutTotal, color: "#C4843E" }]
    ).filter((component) => component.total > 0);
  }

  const savings = Math.max(0, cashAvailable - totalSpend);
  const showSavingsNode = !useModeled;
  const savingsOutflow: {
    category: string;
    total: number;
    count: number;
    percent: number;
    color: string;
  } | null = showSavingsNode && savings > 0
    ? {
        category: "Savings",
        total: savings,
        count: 0,
        percent: totalIncome > 0 ? savings / totalIncome : 0,
        color: "#3D8B4F"
      }
    : null;

  const nodes: VizNode[] = [];
  const links: VizLink[] = [];
  const nodeIndex = new Map<string, number>();

  for (const income of incomeStats) {
    const key = `income:${income.source}`;
    nodeIndex.set(key, nodes.length);
    nodes.push({
      name: income.source,
      kind: "income",
      color: income.color,
      value: income.total,
      percent: income.percent,
      labelMain: income.source,
      labelSub: `${formatCurrency(income.total, currency)} | ${formatPercent(income.percent)}`
    });
  }

  const totalNodeKey = "total:income";
  nodeIndex.set(totalNodeKey, nodes.length);
  nodes.push({
    name: useModeled ? "Gross Income" : "Total Income",
    kind: "total",
    color: "#6B445C",
    value: totalIncome,
    percent: 1,
    labelMain: useModeled ? "Gross Income" : "Total Income",
    labelSub: formatCurrency(totalIncome, currency)
  });

  if (savingsOutflow) {
    nodeIndex.set("savings:bucket", nodes.length);
    nodes.push({
      name: "Savings",
      kind: "savings",
      color: savingsOutflow.color,
      value: savingsOutflow.total,
      percent: totalIncome > 0 ? savingsOutflow.total / totalIncome : 0,
      labelMain: "Savings",
      labelSub: `${formatCurrency(savingsOutflow.total, currency)} | ${formatPercent(totalIncome > 0 ? savingsOutflow.total / totalIncome : 0)}`
    });
  }

  if (useModeled) {
    const modeledOutflows = [
      { key: "Net Income", total: Number(cashAvailable.toFixed(2)), color: "#3D8B4F" },
      { key: "Tax Out", total: modeledTaxOutTotal, color: "#C4843E" },
      { key: "Super Out", total: modeledSuperOutTotal, color: "#5C6FA8" }
    ].filter((outflow) => outflow.total > 0);

    for (const outflow of modeledOutflows) {
      const key = `fixed:${outflow.key}`;
      nodeIndex.set(key, nodes.length);
      nodes.push({
        name: outflow.key,
        kind: "fixed",
        color: outflow.color,
        value: outflow.total,
        percent: totalIncome > 0 ? outflow.total / totalIncome : 0,
        labelMain: outflow.key,
        labelSub: `${formatCurrency(outflow.total, currency)} | ${formatPercent(totalIncome > 0 ? outflow.total / totalIncome : 0)}`
      });
    }
  }

  for (const group of categoryStats) {
    const key = `group:${group.category}`;
    nodeIndex.set(key, nodes.length);
    nodes.push({
      name: group.category,
      kind: "group",
      color: group.color,
      value: group.total,
      percent: totalIncome > 0 ? group.total / totalIncome : 0,
      labelMain: group.category,
      labelSub: `${formatCurrency(group.total, currency)} | ${formatPercent(totalIncome > 0 ? group.total / totalIncome : 0)}`
    });
  }

  let fixedLeafNodeCount = 0;
  if (useModeled) {
    const addHiddenFixedLeafTail = (leafKey: string, leafNodeIndex: number): void => {
      const hiddenKey = `${leafKey}:tail`;
      nodeIndex.set(hiddenKey, nodes.length);
      nodes.push({
        name: hiddenKey,
        kind: "hidden",
        color: "transparent",
        value: HIDDEN_FIXED_LEAF_TAIL_VALUE
      });
      const hiddenNodeIndex = nodeIndex.get(hiddenKey);
      if (hiddenNodeIndex === undefined) {
        return;
      }
      links.push({
        source: leafNodeIndex,
        target: hiddenNodeIndex,
        value: HIDDEN_FIXED_LEAF_TAIL_VALUE,
        color: "transparent",
        kind: "hidden"
      });
    };

    const taxOutNodeIndex = nodeIndex.get("fixed:Tax Out");
    if (taxOutNodeIndex !== undefined) {
      for (const component of modeledTaxBreakdown) {
        const key = `fixedLeaf:Tax Out:${component.name}`;
        nodeIndex.set(key, nodes.length);
        nodes.push({
          name: component.name,
          kind: "fixedLeaf",
          color: component.color,
          value: component.total,
          labelMain: component.name,
          labelSub: `${formatCurrency(component.total, currency)}`
        });
        const leafNodeIndex = nodeIndex.get(key);
        if (leafNodeIndex === undefined) {
          continue;
        }
        links.push({
          source: taxOutNodeIndex,
          target: leafNodeIndex,
          value: Number(component.total.toFixed(2)),
          color: component.color,
          kind: "fixedLeaf"
        });
        addHiddenFixedLeafTail(key, leafNodeIndex);
        fixedLeafNodeCount += 1;
      }
    }

    const superOutNodeIndex = nodeIndex.get("fixed:Super Out");
    if (superOutNodeIndex !== undefined && modeledSuperFundTaxTotal > 0) {
      const key = "fixedLeaf:Super Out:Super Fund Tax";
      nodeIndex.set(key, nodes.length);
      nodes.push({
        name: "Super Fund Tax",
        kind: "fixedLeaf",
        color: "#5C6FA8",
        value: modeledSuperFundTaxTotal,
        labelMain: "Super Fund Tax",
        labelSub: `${formatCurrency(modeledSuperFundTaxTotal, currency)}`
      });
      const superFundTaxNodeIndex = nodeIndex.get(key);
      if (superFundTaxNodeIndex !== undefined) {
        links.push({
          source: superOutNodeIndex,
          target: superFundTaxNodeIndex,
          value: Number(modeledSuperFundTaxTotal.toFixed(2)),
          color: "#5C6FA8",
          kind: "fixedLeaf"
        });
        addHiddenFixedLeafTail(key, superFundTaxNodeIndex);
        fixedLeafNodeCount += 1;
      }
    }
  }

  let subcategoryNodeCount = 0;
  for (const group of categoryStats) {
    const subcategoryStats = subcategoryStatsByGroup.get(group.category);
    if (!subcategoryStats) {
      continue;
    }
    for (const subcategory of subcategoryStats) {
      const key = `subcategory:${group.category}:${subcategory.subcategory}`;
      nodeIndex.set(key, nodes.length);
      nodes.push({
        name: subcategory.subcategory,
        kind: "subcategory",
        color: group.color,
        value: subcategory.total,
        labelMain: subcategory.subcategory,
        labelSub: `${formatCurrency(subcategory.total, currency)} | ${subcategory.count} txn${subcategory.count === 1 ? "" : "s"}`
      });
      subcategoryNodeCount += 1;
    }
  }

  const totalNodeIndex = nodeIndex.get(totalNodeKey);
  if (totalNodeIndex === undefined) {
    return EMPTY_VIZ;
  }

  for (const income of incomeStats) {
    const source = nodeIndex.get(`income:${income.source}`);
    if (source === undefined) {
      continue;
    }
    links.push({
      source,
      target: totalNodeIndex,
      value: Number(income.total.toFixed(2)),
      color: income.color,
      kind: "income"
    });
  }

  let categoryParentNodeIndex = totalNodeIndex;
  if (useModeled) {
    const modeledOutflows = [
      { key: "Net Income", total: Number(cashAvailable.toFixed(2)), color: "#3D8B4F" },
      { key: "Tax Out", total: modeledTaxOutTotal, color: "#C4843E" },
      { key: "Super Out", total: modeledSuperOutTotal, color: "#5C6FA8" }
    ].filter((outflow) => outflow.total > 0);

    for (const outflow of modeledOutflows) {
      const target = nodeIndex.get(`fixed:${outflow.key}`);
      if (target === undefined) {
        continue;
      }
      links.push({
        source: totalNodeIndex,
        target,
        value: Number(outflow.total.toFixed(2)),
        color: outflow.color,
        kind: "fixed"
      });
    }

    const netIncomeNodeIndex = nodeIndex.get("fixed:Net Income");
    if (netIncomeNodeIndex !== undefined) {
      categoryParentNodeIndex = netIncomeNodeIndex;
    }
  }

  for (const group of categoryStats) {
    const target = nodeIndex.get(`group:${group.category}`);
    if (target === undefined) {
      continue;
    }
    links.push({
      source: categoryParentNodeIndex,
      target,
      value: Number(group.total.toFixed(2)),
      color: group.color,
      kind: "group"
    });
  }

  for (const group of categoryStats) {
    const groupNodeIndex = nodeIndex.get(`group:${group.category}`);
    const subcategoryStats = subcategoryStatsByGroup.get(group.category);
    if (groupNodeIndex === undefined || !subcategoryStats) {
      continue;
    }
    for (const subcategory of subcategoryStats) {
      const subcategoryNodeIndex = nodeIndex.get(`subcategory:${group.category}:${subcategory.subcategory}`);
      if (subcategoryNodeIndex === undefined) {
        continue;
      }
      links.push({
        source: groupNodeIndex,
        target: subcategoryNodeIndex,
        value: Number(subcategory.total.toFixed(2)),
        color: group.color,
        kind: "subcategory"
      });
    }
  }

  if (savingsOutflow) {
    const savingsTarget = nodeIndex.get("savings:bucket");
    if (savingsTarget !== undefined) {
      links.push({
        source: totalNodeIndex,
        target: savingsTarget,
        value: Number(savingsOutflow.total.toFixed(2)),
        color: savingsOutflow.color,
        kind: "savings"
      });
    }
  }

  let merchantNodeCount = 0;
  for (const group of categoryStats) {
    const subcategoryStats = subcategoryStatsByGroup.get(group.category);
    if (!subcategoryStats) {
      continue;
    }

    for (const subcategory of subcategoryStats) {
      const subcategoryNodeIndex = nodeIndex.get(`subcategory:${group.category}:${subcategory.subcategory}`);
      const subcategoryKey = groupSubcategoryKey(group.category, subcategory.subcategory);
      const merchantTotals = merchantTotalsBySubcategory.get(subcategoryKey);
      const detailedTransactions = transactionsBySubcategory.get(subcategoryKey) ?? [];
      if (subcategoryNodeIndex === undefined) {
        continue;
      }

      if (merchantDetailMode === "full") {
        const sortedDetailedTransactions = [...detailedTransactions].sort((a, b) => (
          b.amount - a.amount || b.date.localeCompare(a.date)
        ));
        for (const transaction of sortedDetailedTransactions) {
          const detailName = resolveMerchantBucket(transaction);
          const merchantKey = `merchant:${group.category}:${subcategory.subcategory}:${transaction.id}`;
          nodeIndex.set(merchantKey, nodes.length);
          nodes.push({
            name: detailName,
            kind: "merchant",
            color: group.color,
            value: transaction.amount,
            labelMain: detailName,
            labelSub: `${formatCurrency(transaction.amount, currency)} | ${transaction.date}`
          });

          const merchantNodeIndex = nodeIndex.get(merchantKey);
          if (merchantNodeIndex === undefined) {
            continue;
          }
          links.push({
            source: subcategoryNodeIndex,
            target: merchantNodeIndex,
            value: Number(transaction.amount.toFixed(2)),
            color: group.color,
            kind: "merchant"
          });
          merchantNodeCount += 1;
        }
        continue;
      }

      if (!merchantTotals) {
        continue;
      }

      const merchantStatsRaw = [...merchantTotals.entries()]
        .sort((a, b) => b[1].total - a[1].total)
        .map(([merchant, summary]) => ({
          merchant,
          total: summary.total,
          count: summary.count
        }));

      const merchantStats = summarizeMerchantStats(merchantStatsRaw, subcategory.subcategory, subcategory.total);

      for (const merchant of merchantStats) {
        const merchantKey = `merchant:${group.category}:${subcategory.subcategory}:${merchant.merchant}`;
        nodeIndex.set(merchantKey, nodes.length);
        nodes.push({
          name: merchant.merchant,
          kind: "merchant",
          color: group.color,
          value: merchant.total,
          labelMain: merchant.merchant,
          labelSub: `${formatCurrency(merchant.total, currency)} | ${merchant.count} txn${merchant.count === 1 ? "" : "s"}`
        });

        const merchantNodeIndex = nodeIndex.get(merchantKey);
        if (merchantNodeIndex === undefined) {
          continue;
        }
        links.push({
          source: subcategoryNodeIndex,
          target: merchantNodeIndex,
          value: Number(merchant.total.toFixed(2)),
          color: group.color,
          kind: "merchant"
        });
        merchantNodeCount += 1;
      }
    }
  }

  const modeledLayer3Count = useModeled
    ? Number(nodeIndex.has("fixed:Net Income"))
      + Number(nodeIndex.has("fixed:Tax Out"))
      + Number(nodeIndex.has("fixed:Super Out"))
    : 0;
  const secondColumnCount = 1;
  const thirdColumnCount = useModeled ? modeledLayer3Count : categoryStats.length + (savingsOutflow ? 1 : 0);
  const fourthColumnCount = useModeled ? categoryStats.length + fixedLeafNodeCount : subcategoryNodeCount;
  const fifthColumnCount = useModeled ? subcategoryNodeCount : merchantNodeCount;
  const sixthColumnCount = useModeled ? merchantNodeCount : 0;
  return {
    sankey: { nodes, links },
    totalIncome: Number(totalIncome.toFixed(2)),
    totalSpend: Number(totalSpend.toFixed(2)),
    savings: Number(savings.toFixed(2)),
    spendCount: spendTransactions.length,
    incomeStats,
    categoryStats,
    subcategoryCount,
    merchantNodeCount,
    modeledPayEventCount,
    maxColumnNodes: Math.max(incomeStats.length, secondColumnCount, thirdColumnCount, fourthColumnCount, fifthColumnCount, sixthColumnCount, 1)
  };
}
