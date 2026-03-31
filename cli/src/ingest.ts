import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import yaml from "js-yaml";
import { z } from "zod";

type Direction = "debit" | "credit" | "neutral";

type SankeyNode = { name: string };
type SankeyLink = { source: number; target: number; value: number };

type NormalizedTransaction = {
  id: string;
  date: string;
  accountId: string;
  narrative: string;
  narrativeNormalized: string;
  merchant: string;
  debitAmount: number;
  creditAmount: number;
  amount: number;
  direction: Direction;
  balance: number | null;
  sourceCategory: string;
  category: string;
  categoryReason: string;
  categoryGroup: string;
  categoryGroupReason: string;
};

type CliOptions = {
  input: string;
  outDir: string;
  rulesFile: string;
  overridesFile: string;
  payrollFile: string;
  publishWeb: boolean;
};

type CategoryRulesFile = {
  rules?: Record<string, string[]>;
  groups?: Record<string, string[]>;
  group_rules?: Record<string, string[]>;
};

type OverridesFile = {
  overrides?: Record<string, string>;
  narrative_contains?: Record<string, string>;
  group_overrides?: Record<string, string>;
  group_narrative_contains?: Record<string, string>;
};

type PayrollConfig = {
  enabled?: boolean;
  employer_keywords?: string[];
  net_pay?: number;
  gross_pay?: number;
  income_tax?: number;
  super_gross?: number;
  super_tax?: number;
  net_tolerance?: number;
  tax_components?: Record<string, number>;
  super_components?: Record<string, number>;
};

type ModelComponent = {
  name: string;
  perPay: number;
  total: number;
};

type PayEvent = {
  transactionId: string;
  date: string;
  depositAmount: number;
  grossPay: number;
  netPay: number;
  incomeTax: number;
  superGross: number;
  superTax: number;
};

type IncomeModelOutput = {
  generatedAt: string;
  currency: string;
  enabled: boolean;
  employerKeywords: string[];
  payEventCount: number;
  salaryMatchIds: string[];
  payEvents: PayEvent[];
  matchedPayDateSamples: string[];
  salary: {
    netPay: number;
    grossPay: number;
    incomeTax: number;
    superGross: number;
    superTax: number;
    taxComponents: ModelComponent[];
    superComponents: ModelComponent[];
  };
  totals: {
    salaryNet: number;
    salaryGross: number;
    tax: number;
    super: number;
    superTax: number;
    otherCredits: number;
    grossPlusOtherCredits: number;
    netPlusOtherCredits: number;
  };
};

const bankRowSchema = z.object({
  "Bank Account": z.string(),
  Date: z.string(),
  Narrative: z.string(),
  "Debit Amount": z.string().optional(),
  "Credit Amount": z.string().optional(),
  Balance: z.string().optional(),
  Categories: z.string().optional(),
  Serial: z.string().optional()
});

const EXCLUDED_SPEND_GROUPS = new Set(["Income", "Transfers"]);

function findProjectRoot(startDir: string): string {
  let current = path.resolve(startDir);

  while (true) {
    const packageJsonPath = path.join(current, "package.json");
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJsonRaw = fs.readFileSync(packageJsonPath, "utf8");
        const packageJson = JSON.parse(packageJsonRaw) as { workspaces?: unknown };
        if (Array.isArray(packageJson.workspaces)) {
          return current;
        }
      } catch {
        // Keep walking upward.
      }
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return startDir;
    }
    current = parent;
  }
}

function resolveFromRoot(rootDir: string, value: string): string {
  if (path.isAbsolute(value)) {
    return value;
  }
  return path.resolve(rootDir, value);
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    input: "bank-export.csv",
    outDir: path.join("data", "processed"),
    rulesFile: path.join("rules", "categories.yml"),
    overridesFile: path.join("rules", "overrides.yml"),
    payrollFile: path.join("rules", "payroll.private.yml"),
    publishWeb: true
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--input" && argv[i + 1]) {
      options.input = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--out-dir" && argv[i + 1]) {
      options.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--rules" && argv[i + 1]) {
      options.rulesFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--overrides" && argv[i + 1]) {
      options.overridesFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--payroll" && argv[i + 1]) {
      options.payrollFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--no-publish-web") {
      options.publishWeb = false;
      continue;
    }
  }

  return options;
}

function parseMoney(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned) {
    return 0;
  }
  const numeric = Number.parseFloat(cleaned);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseDate(dateValue: string): string {
  const trimmed = dateValue.trim();
  const parts = trimmed.split("/");
  if (parts.length !== 3) {
    throw new Error(`Unsupported date format: ${dateValue}`);
  }
  const [dayStr, monthStr, yearStr] = parts;
  const day = Number.parseInt(dayStr, 10);
  const month = Number.parseInt(monthStr, 10);
  const year = Number.parseInt(yearStr, 10);
  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
    throw new Error(`Invalid date parts: ${dateValue}`);
  }
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function normalizeText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function inferMerchant(narrative: string): string {
  const cleaned = narrative
    .replace(/\s+/g, " ")
    .replace(/^DEPOSIT[-\s]OSKO PAYMENT\s+\d+\s+/i, "")
    .replace(/^WITHDRAWAL[-\s]OSKO PAYMENT\s+\d+\s+/i, "")
    .replace(/^WITHDRAWAL MOBILE\s+\d+\s+TFR\s+/i, "")
    .replace(/^PAYMENT BY AUTHORITY TO\s+/i, "")
    .replace(/^DEPOSIT\s+/i, "")
    .trim();

  return cleaned || narrative.trim();
}

function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return `tx_${hash.toString(16).padStart(8, "0")}`;
}

function loadYamlFile<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const content = fs.readFileSync(filePath, "utf8");
  const parsed = yaml.load(content);
  if (!parsed || typeof parsed !== "object") {
    return fallback;
  }
  return parsed as T;
}

function buildCategoryMatcher(
  rulesFile: CategoryRulesFile,
  overridesFile: OverridesFile
): {
  categoryFor: (transaction: Omit<NormalizedTransaction, "category" | "categoryReason" | "categoryGroup" | "categoryGroupReason">) => {
    category: string;
    reason: string;
    group: string;
    groupReason: string;
  };
} {
  const overridesById = Object.entries(overridesFile.overrides ?? {}).map(([id, category]) => [id.trim(), category.trim()]);
  const narrativeOverrides = Object.entries(overridesFile.narrative_contains ?? {}).map(([needle, category]) => [
    normalizeText(needle),
    category.trim()
  ]);
  const groupOverridesById = Object.entries(overridesFile.group_overrides ?? {}).map(([id, group]) => [id.trim(), group.trim()]);
  const groupNarrativeOverrides = Object.entries(overridesFile.group_narrative_contains ?? {}).map(([needle, group]) => [
    normalizeText(needle),
    group.trim()
  ]);

  const ruleEntries = Object.entries(rulesFile.rules ?? {}).map(([category, needles]) => ({
    category,
    needles: needles.map((needle) => normalizeText(needle))
  }));

  const groupRuleEntries = Object.entries(rulesFile.group_rules ?? {}).map(([group, needles]) => ({
    group,
    needles: needles.map((needle) => normalizeText(needle))
  }));

  const categoryToGroup = new Map<string, string>();
  for (const [group, categories] of Object.entries(rulesFile.groups ?? {})) {
    for (const category of categories) {
      categoryToGroup.set(category.trim(), group.trim());
    }
  }

  return {
    categoryFor(transaction) {
      let category: string | null = null;
      let reason: string | null = null;

      const idOverride = overridesById.find(([id]) => id === transaction.id);
      if (idOverride) {
        category = idOverride[1];
        reason = "override:id";
      }

      if (!category) {
        const narrativeOverride = narrativeOverrides.find(([needle]) => transaction.narrativeNormalized.includes(needle));
        if (narrativeOverride) {
          category = narrativeOverride[1];
          reason = `override:narrative:${narrativeOverride[0]}`;
        }
      }

      if (!category) {
        for (const entry of ruleEntries) {
          const matchedNeedle = entry.needles.find((needle) => transaction.narrativeNormalized.includes(needle));
          if (matchedNeedle) {
            category = entry.category;
            reason = `rule:${matchedNeedle}`;
            break;
          }
        }
      }

      if (!category && transaction.direction === "credit") {
        category = "Income";
        reason = "fallback:credit";
      }

      if (!category && transaction.sourceCategory.toUpperCase() === "INT") {
        category = "Interest";
        reason = "fallback:sourceCategory=INT";
      }

      if (!category) {
        category = "Uncategorized";
        reason = "fallback:uncategorized";
      }

      const groupIdOverride = groupOverridesById.find(([id]) => id === transaction.id);
      if (groupIdOverride) {
        return {
          category,
          reason: reason ?? "unknown",
          group: groupIdOverride[1],
          groupReason: "override:group:id"
        };
      }

      const groupNarrativeOverride = groupNarrativeOverrides.find(([needle]) => transaction.narrativeNormalized.includes(needle));
      if (groupNarrativeOverride) {
        return {
          category,
          reason: reason ?? "unknown",
          group: groupNarrativeOverride[1],
          groupReason: `override:group:narrative:${groupNarrativeOverride[0]}`
        };
      }

      for (const entry of groupRuleEntries) {
        const matchedNeedle = entry.needles.find((needle) => transaction.narrativeNormalized.includes(needle));
        if (matchedNeedle) {
          return {
            category,
            reason: reason ?? "unknown",
            group: entry.group,
            groupReason: `rule:group:${matchedNeedle}`
          };
        }
      }

      if (category === "Income") {
        return { category, reason: reason ?? "unknown", group: "Income", groupReason: "fallback:group=income" };
      }

      if (category === "Transfers") {
        return { category, reason: reason ?? "unknown", group: "Transfers", groupReason: "fallback:group=transfers" };
      }

      if (category === "Uncategorized") {
        return {
          category,
          reason: reason ?? "unknown",
          group: "Uncategorized",
          groupReason: "fallback:group=uncategorized"
        };
      }

      const mappedGroup = categoryToGroup.get(category);
      if (mappedGroup) {
        return {
          category,
          reason: reason ?? "unknown",
          group: mappedGroup,
          groupReason: "mapping:group-by-category"
        };
      }

      return {
        category,
        reason: reason ?? "unknown",
        group: "Other Spending",
        groupReason: "fallback:group=other-spending"
      };
    }
  };
}

function readCsvRows(inputPath: string): Array<z.infer<typeof bankRowSchema>> {
  const csvRaw = fs.readFileSync(inputPath, "utf8");
  const parsed = Papa.parse<Record<string, string>>(csvRaw, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(`CSV parse error at row ${firstError.row ?? "unknown"}: ${firstError.message}`);
  }

  return parsed.data
    .map((row) => bankRowSchema.parse(row))
    .filter((row) => row.Date.trim().length > 0 && row.Narrative.trim().length > 0);
}

function normalizeTransactions(
  rows: Array<z.infer<typeof bankRowSchema>>,
  categoryFor: (transaction: Omit<NormalizedTransaction, "category" | "categoryReason" | "categoryGroup" | "categoryGroupReason">) => {
    category: string;
    reason: string;
    group: string;
    groupReason: string;
  }
): NormalizedTransaction[] {
  return rows.map((row, index) => {
    const debitAmount = parseMoney(row["Debit Amount"]);
    const creditAmount = parseMoney(row["Credit Amount"]);
    const amount = debitAmount > 0 ? debitAmount : creditAmount > 0 ? -creditAmount : 0;
    const direction: Direction = debitAmount > 0 ? "debit" : creditAmount > 0 ? "credit" : "neutral";
    const narrative = row.Narrative.trim();
    const narrativeNormalized = normalizeText(narrative);
    const idSignature = [
      row.Date.trim(),
      row["Bank Account"].trim(),
      narrativeNormalized,
      debitAmount.toFixed(2),
      creditAmount.toFixed(2),
      row.Serial?.trim() || String(index)
    ].join("|");
    const id = hashString(idSignature);

    const baseTransaction: Omit<NormalizedTransaction, "category" | "categoryReason" | "categoryGroup" | "categoryGroupReason"> = {
      id,
      date: parseDate(row.Date),
      accountId: row["Bank Account"].trim(),
      narrative,
      narrativeNormalized,
      merchant: inferMerchant(narrative),
      debitAmount,
      creditAmount,
      amount,
      direction,
      balance: row.Balance ? parseMoney(row.Balance) : null,
      sourceCategory: (row.Categories ?? "").trim()
    };

    const categorization = categoryFor(baseTransaction);

    return {
      ...baseTransaction,
      category: categorization.category,
      categoryReason: categorization.reason,
      categoryGroup: categorization.group,
      categoryGroupReason: categorization.groupReason
    };
  });
}

function buildSankeyData(transactions: NormalizedTransaction[]): {
  generatedAt: string;
  currency: string;
  nodes: SankeyNode[];
  links: SankeyLink[];
  summary: {
    totalSpend: number;
    transactionCount: number;
  };
} {
  const spendTransactions = transactions.filter(
    (transaction) =>
      transaction.direction === "debit" &&
      transaction.amount > 0 &&
      !EXCLUDED_SPEND_GROUPS.has(transaction.categoryGroup)
  );

  const groupTotals = new Map<string, number>();
  const categoryTotalsByGroup = new Map<string, Map<string, number>>();

  for (const transaction of spendTransactions) {
    groupTotals.set(transaction.categoryGroup, (groupTotals.get(transaction.categoryGroup) ?? 0) + transaction.amount);

    if (!categoryTotalsByGroup.has(transaction.categoryGroup)) {
      categoryTotalsByGroup.set(transaction.categoryGroup, new Map<string, number>());
    }
    const categoryTotals = categoryTotalsByGroup.get(transaction.categoryGroup);
    if (!categoryTotals) {
      continue;
    }
    categoryTotals.set(transaction.category, (categoryTotals.get(transaction.category) ?? 0) + transaction.amount);
  }

  const nodes: SankeyNode[] = [{ name: "Total Spend" }];
  const nodeIndex = new Map<string, number>([["Total Spend", 0]]);

  const sortedGroups = [...groupTotals.entries()].sort(([a], [b]) => a.localeCompare(b));
  for (const [group] of sortedGroups) {
    nodeIndex.set(`group:${group}`, nodes.length);
    nodes.push({ name: group });
  }

  for (const [group, categories] of categoryTotalsByGroup.entries()) {
    for (const category of categories.keys()) {
      const categoryKey = `category:${group}:${category}`;
      if (!nodeIndex.has(categoryKey)) {
        nodeIndex.set(categoryKey, nodes.length);
        nodes.push({ name: category });
      }
    }
  }

  const links: SankeyLink[] = [];

  for (const [group, total] of sortedGroups) {
    const source = nodeIndex.get("Total Spend");
    const target = nodeIndex.get(`group:${group}`);
    if (source === undefined || target === undefined) {
      continue;
    }
    links.push({ source, target, value: Number(total.toFixed(2)) });

    const categories = categoryTotalsByGroup.get(group);
    if (!categories) {
      continue;
    }

    const sortedCategories = [...categories.entries()].sort(([a], [b]) => a.localeCompare(b));
    for (const [category, categoryTotal] of sortedCategories) {
      const categoryIndex = nodeIndex.get(`category:${group}:${category}`);
      if (categoryIndex === undefined) {
        continue;
      }
      links.push({
        source: target,
        target: categoryIndex,
        value: Number(categoryTotal.toFixed(2))
      });
    }
  }

  const totalSpend = [...groupTotals.values()].reduce((sum, value) => sum + value, 0);

  return {
    generatedAt: new Date().toISOString(),
    currency: "AUD",
    nodes,
    links,
    summary: {
      totalSpend: Number(totalSpend.toFixed(2)),
      transactionCount: spendTransactions.length
    }
  };
}

function normalizeComponentPerPayMap(
  components: Record<string, number> | undefined,
  fallbackLabel: string,
  fallbackValue: number
): Array<{ name: string; perPay: number }> {
  const entries = Object.entries(components ?? {})
    .map(([name, value]) => [name.trim(), Number(value)] as const)
    .filter(([name, value]) => name.length > 0 && Number.isFinite(value) && value > 0);

  if (entries.length > 0) {
    return entries.map(([name, perPay]) => ({ name, perPay: Number(perPay.toFixed(2)) }));
  }

  if (fallbackValue > 0) {
    return [{ name: fallbackLabel, perPay: Number(fallbackValue.toFixed(2)) }];
  }

  return [];
}

function toModelComponents(components: Array<{ name: string; perPay: number }>, payEventCount: number): ModelComponent[] {
  return components.map((component) => ({
    name: component.name,
    perPay: component.perPay,
    total: Number((component.perPay * payEventCount).toFixed(2))
  }));
}

function buildIncomeModel(transactions: NormalizedTransaction[], config: PayrollConfig): IncomeModelOutput {
  const employerKeywords = (config.employer_keywords ?? []).map((keyword) => normalizeText(keyword));
  const netPay = config.net_pay ?? 0;
  const grossPay = config.gross_pay ?? 0;
  const incomeTax = config.income_tax ?? 0;
  const superGross = config.super_gross ?? 0;
  const superTax = config.super_tax ?? 0;
  const tolerance = config.net_tolerance ?? 2;
  const taxComponentsPerPay = normalizeComponentPerPayMap(config.tax_components, "Income Tax", incomeTax);
  const superComponentsPerPay = normalizeComponentPerPayMap(config.super_components, "Super Guarantee", superGross);

  const disabledOutput: IncomeModelOutput = {
    generatedAt: new Date().toISOString(),
    currency: "AUD",
    enabled: false,
    employerKeywords,
    payEventCount: 0,
    salaryMatchIds: [],
    payEvents: [],
    matchedPayDateSamples: [],
    salary: {
      netPay,
      grossPay,
      incomeTax,
      superGross,
      superTax,
      taxComponents: [],
      superComponents: []
    },
    totals: {
      salaryNet: 0,
      salaryGross: 0,
      tax: 0,
      super: 0,
      superTax: 0,
      otherCredits: 0,
      grossPlusOtherCredits: 0,
      netPlusOtherCredits: 0
    }
  };

  if (!config.enabled) {
    return disabledOutput;
  }

  if (netPay <= 0 || grossPay <= 0) {
    return disabledOutput;
  }

  const creditTransactions = transactions.filter((transaction) => transaction.direction === "credit" && transaction.amount < 0);

  const salaryMatches = creditTransactions.filter((transaction) => {
    const amount = Math.abs(transaction.amount);
    const amountMatch = Math.abs(amount - netPay) <= tolerance;
    const merchantText = normalizeText(transaction.merchant);
    const keywordMatch = employerKeywords.some(
      (keyword) => transaction.narrativeNormalized.includes(keyword) || merchantText.includes(keyword)
    );
    return amountMatch || keywordMatch;
  }).sort((a, b) => a.date.localeCompare(b.date));

  const salaryMatchIds = new Set(salaryMatches.map((transaction) => transaction.id));

  const otherCredits = creditTransactions
    .filter((transaction) => !salaryMatchIds.has(transaction.id) && transaction.categoryGroup !== "Transfers")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const payEventCount = salaryMatches.length;
  const salaryNet = payEventCount * netPay;
  const salaryGross = payEventCount * grossPay;
  const totalTax = payEventCount * (taxComponentsPerPay.reduce((sum, component) => sum + component.perPay, 0) || incomeTax);
  const totalSuper = payEventCount * (superComponentsPerPay.reduce((sum, component) => sum + component.perPay, 0) || superGross);
  const totalSuperTax = payEventCount * superTax;
  const payEvents: PayEvent[] = salaryMatches.map((transaction) => ({
    transactionId: transaction.id,
    date: transaction.date,
    depositAmount: Number(Math.abs(transaction.amount).toFixed(2)),
    grossPay: Number(grossPay.toFixed(2)),
    netPay: Number(netPay.toFixed(2)),
    incomeTax: Number(incomeTax.toFixed(2)),
    superGross: Number(superGross.toFixed(2)),
    superTax: Number(superTax.toFixed(2))
  }));

  return {
    generatedAt: new Date().toISOString(),
    currency: "AUD",
    enabled: true,
    employerKeywords,
    payEventCount,
    salaryMatchIds: [...salaryMatchIds],
    payEvents,
    matchedPayDateSamples: salaryMatches.slice(0, 8).map((transaction) => transaction.date),
    salary: {
      netPay,
      grossPay,
      incomeTax,
      superGross,
      superTax,
      taxComponents: toModelComponents(taxComponentsPerPay, payEventCount),
      superComponents: toModelComponents(superComponentsPerPay, payEventCount)
    },
    totals: {
      salaryNet: Number(salaryNet.toFixed(2)),
      salaryGross: Number(salaryGross.toFixed(2)),
      tax: Number(totalTax.toFixed(2)),
      super: Number(totalSuper.toFixed(2)),
      superTax: Number(totalSuperTax.toFixed(2)),
      otherCredits: Number(otherCredits.toFixed(2)),
      grossPlusOtherCredits: Number((salaryGross + otherCredits).toFixed(2)),
      netPlusOtherCredits: Number((salaryNet + otherCredits).toFixed(2))
    }
  };
}

function writeJsonFile(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const projectRoot = findProjectRoot(process.cwd());
  const inputPath = resolveFromRoot(projectRoot, options.input);
  const outDir = resolveFromRoot(projectRoot, options.outDir);
  const rulesPath = resolveFromRoot(projectRoot, options.rulesFile);
  const overridesPath = resolveFromRoot(projectRoot, options.overridesFile);
  const payrollPath = resolveFromRoot(projectRoot, options.payrollFile);

  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input file does not exist: ${inputPath}`);
  }

  const rulesConfig = loadYamlFile<CategoryRulesFile>(rulesPath, {
    rules: {},
    groups: {},
    group_rules: {}
  });

  const overridesConfig = loadYamlFile<OverridesFile>(overridesPath, {
    overrides: {},
    narrative_contains: {},
    group_overrides: {},
    group_narrative_contains: {}
  });

  const payrollConfig = loadYamlFile<PayrollConfig>(payrollPath, {
    enabled: false,
    employer_keywords: [],
    net_pay: 0,
    gross_pay: 0,
    income_tax: 0,
    super_gross: 0,
    super_tax: 0,
    net_tolerance: 2,
    tax_components: {},
    super_components: {}
  });

  const matcher = buildCategoryMatcher(rulesConfig, overridesConfig);

  const rows = readCsvRows(inputPath);
  const transactions = normalizeTransactions(rows, matcher.categoryFor);
  const sankey = buildSankeyData(transactions);
  const incomeModel = buildIncomeModel(transactions, payrollConfig);

  const uncategorized = transactions.filter(
    (transaction) => transaction.direction === "debit" && transaction.category === "Uncategorized"
  );

  writeJsonFile(path.join(outDir, "transactions.json"), transactions);
  writeJsonFile(path.join(outDir, "sankey.json"), sankey);
  writeJsonFile(path.join(outDir, "income-model.json"), incomeModel);
  writeJsonFile(path.join(outDir, "uncategorized.json"), uncategorized);

  if (options.publishWeb) {
    const webPublicDir = path.join(projectRoot, "web", "public");
    if (fs.existsSync(webPublicDir)) {
      writeJsonFile(path.join(webPublicDir, "sankey.json"), sankey);
      writeJsonFile(path.join(webPublicDir, "income-model.json"), incomeModel);
      writeJsonFile(path.join(webPublicDir, "uncategorized.json"), uncategorized);
      writeJsonFile(path.join(webPublicDir, "transactions.json"), transactions);
    }
  }

  const categoryCounts = transactions.reduce<Record<string, number>>((acc, transaction) => {
    acc[transaction.category] = (acc[transaction.category] ?? 0) + 1;
    return acc;
  }, {});

  const groupCounts = transactions.reduce<Record<string, number>>((acc, transaction) => {
    acc[transaction.categoryGroup] = (acc[transaction.categoryGroup] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`Input rows: ${rows.length}`);
  console.log(`Normalized transactions: ${transactions.length}`);
  console.log(`Sankey spend transactions: ${sankey.summary.transactionCount}`);
  console.log(`Total spend: ${sankey.currency} ${sankey.summary.totalSpend.toFixed(2)}`);
  console.log(`Uncategorized debit transactions: ${uncategorized.length}`);
  console.log("Category counts:", categoryCounts);
  console.log("Category group counts:", groupCounts);
  if (incomeModel.enabled) {
    console.log(`Payroll model enabled: ${incomeModel.payEventCount} pay events matched`);
    console.log(`Modeled gross income: AUD ${incomeModel.totals.grossPlusOtherCredits.toFixed(2)}`);
  } else {
    console.log("Payroll model disabled (missing or disabled rules/payroll.private.yml)");
  }
  console.log(`Wrote output to: ${outDir}`);
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error("Ingestion failed:", message);
  process.exit(1);
}
