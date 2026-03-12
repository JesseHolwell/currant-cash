import Papa from "papaparse";
import { categoryTaxonomyFromDefinitions } from "./taxonomy";
import type { CategoryDefinition, RawTransaction } from "./types";
import { normalizeForMatch, toTitleLabel } from "./utils";

type CsvBankRow = {
  "Bank Account"?: string;
  Date?: string;
  Narrative?: string;
  "Debit Amount"?: string;
  "Credit Amount"?: string;
  Balance?: string;
  Categories?: string;
  Serial?: string;
};

type CsvImportResult = {
  transactions: RawTransaction[];
  warnings: string[];
};

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
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
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

function buildSubcategoryLookup(categoryDefinitions: CategoryDefinition[]): Map<string, { group: string; subcategory: string }> {
  const taxonomy = categoryTaxonomyFromDefinitions(categoryDefinitions);
  const lookup = new Map<string, { group: string; subcategory: string }>();

  for (const [group, subcategories] of taxonomy.entries()) {
    lookup.set(normalizeForMatch(group), { group, subcategory: group });
    for (const subcategory of subcategories) {
      lookup.set(normalizeForMatch(subcategory), { group, subcategory });
    }
  }

  return lookup;
}

function inferCategory(
  narrative: string,
  sourceCategory: string,
  direction: RawTransaction["direction"],
  lookup: Map<string, { group: string; subcategory: string }>
): { category: string; categoryGroup: string; categoryReason: string } {
  if (direction === "credit") {
    return { category: "Income", categoryGroup: "Income", categoryReason: "fallback:credit" };
  }

  const normalizedSourceCategory = normalizeForMatch(sourceCategory);
  if (normalizedSourceCategory) {
    const fromLookup = lookup.get(normalizedSourceCategory);
    if (fromLookup) {
      return {
        category: fromLookup.subcategory,
        categoryGroup: fromLookup.group,
        categoryReason: "source:categories-field"
      };
    }

    if (normalizedSourceCategory === "int") {
      const interestMapped = lookup.get(normalizeForMatch("Interest"));
      if (interestMapped) {
        return {
          category: interestMapped.subcategory,
          categoryGroup: interestMapped.group,
          categoryReason: "source:categories-field:int"
        };
      }
      return {
        category: "Interest",
        categoryGroup: "Uncategorized",
        categoryReason: "source:categories-field:int"
      };
    }
  }

  const narrativeNormalized = normalizeText(narrative);
  for (const [needle, mapped] of lookup.entries()) {
    if (!needle || needle.length < 4) {
      continue;
    }
    if (narrativeNormalized.includes(needle)) {
      return {
        category: mapped.subcategory,
        categoryGroup: mapped.group,
        categoryReason: `fallback:narrative:${needle}`
      };
    }
  }

  return {
    category: "Uncategorized",
    categoryGroup: "Uncategorized",
    categoryReason: "fallback:uncategorized"
  };
}

export function parseBankCsvToTransactions(csvRaw: string, categoryDefinitions: CategoryDefinition[]): CsvImportResult {
  const parsed = Papa.parse<CsvBankRow>(csvRaw, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    const firstError = parsed.errors[0];
    throw new Error(`CSV parse error at row ${firstError.row ?? "unknown"}: ${firstError.message}`);
  }

  const warnings: string[] = [];
  const subcategoryLookup = buildSubcategoryLookup(categoryDefinitions);
  const transactions: RawTransaction[] = [];

  parsed.data.forEach((row, index) => {
    const dateValue = (row.Date ?? "").trim();
    const narrative = (row.Narrative ?? "").trim();

    if (!dateValue || !narrative) {
      return;
    }

    try {
      const debitAmount = parseMoney(row["Debit Amount"]);
      const creditAmount = parseMoney(row["Credit Amount"]);
      const amount = debitAmount > 0 ? debitAmount : creditAmount > 0 ? -creditAmount : 0;
      const direction: RawTransaction["direction"] = debitAmount > 0 ? "debit" : creditAmount > 0 ? "credit" : "neutral";

      const normalizedDate = parseDate(dateValue);
      const sourceCategory = (row.Categories ?? "").trim();
      const categorization = inferCategory(narrative, sourceCategory, direction, subcategoryLookup);

      const idSignature = [
        dateValue,
        (row["Bank Account"] ?? "").trim(),
        normalizeText(narrative),
        debitAmount.toFixed(2),
        creditAmount.toFixed(2),
        row.Serial?.trim() || String(index)
      ].join("|");

      transactions.push({
        id: hashString(idSignature),
        date: normalizedDate,
        accountId: (row["Bank Account"] ?? "uploaded-account").trim() || "uploaded-account",
        merchant: inferMerchant(narrative),
        narrative,
        amount,
        direction,
        category: categorization.category || toTitleLabel(sourceCategory) || "Uncategorized",
        categoryGroup: categorization.categoryGroup,
        categoryReason: categorization.categoryReason
      });
    } catch (error) {
      warnings.push(`Skipped row ${index + 2}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return { transactions, warnings };
}
