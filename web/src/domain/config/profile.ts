import profileExample from "./profile.example.json";
import type { AccountEntry, GoalEntry } from "../types";

type AliasDefinition = {
  label: string;
  needles: string[];
};

type CategorySeed = {
  category: string;
  subcategories: Array<{
    name: string;
    keywords: string[];
  }>;
};

type DomainProfile = {
  supportUrl: string | null;
  incomeSourceAliases: AliasDefinition[];
  merchantAliases: AliasDefinition[];
  defaultCategorySetup: CategorySeed[];
  defaultAccountEntries: AccountEntry[];
  defaultGoals: GoalEntry[];
};

const localProfileModule = Object.values(
  import.meta.glob<{ default: unknown }>("./profile.local.json", { eager: true }),
)[0];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseAliases(value: unknown): AliasDefinition[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      const label = typeof record.label === "string" ? record.label.trim() : "";
      const needles = parseStringArray(record.needles) ?? [];
      if (!label) {
        return null;
      }

      return { label, needles };
    })
    .filter((entry): entry is AliasDefinition => entry !== null);
}

function parseCategorySetup(value: unknown): CategorySeed[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      const category = typeof record.category === "string" ? record.category.trim() : "";
      if (!category || !Array.isArray(record.subcategories)) {
        return null;
      }

      const subcategories = record.subcategories
        .map((subcategory) => {
          const subcategoryRecord = asRecord(subcategory);
          if (!subcategoryRecord) {
            return null;
          }

          const name =
            typeof subcategoryRecord.name === "string"
              ? subcategoryRecord.name.trim()
              : "";
          const keywords = parseStringArray(subcategoryRecord.keywords) ?? [];
          if (!name) {
            return null;
          }

          return { name, keywords };
        })
        .filter(
          (
            subcategory,
          ): subcategory is { name: string; keywords: string[] } =>
            subcategory !== null,
        );

      return { category, subcategories };
    })
    .filter((entry): entry is CategorySeed => entry !== null);
}

function parseAccountEntries(value: unknown): AccountEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      const id = typeof record.id === "string" ? record.id.trim() : "";
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const bucket = typeof record.bucket === "string" ? record.bucket.trim() : "";
      const kind = record.kind === "asset" || record.kind === "liability" ? record.kind : null;
      const value = typeof record.value === "number" ? record.value : null;

      if (!id || !name || !bucket || !kind || value === null) {
        return null;
      }

      return { id, name, bucket, kind, value };
    })
    .filter((entry): entry is AccountEntry => entry !== null);
}

function parseGoals(value: unknown): GoalEntry[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  return value
    .map((entry) => {
      const record = asRecord(entry);
      if (!record) {
        return null;
      }

      const id = typeof record.id === "string" ? record.id.trim() : "";
      const name = typeof record.name === "string" ? record.name.trim() : "";
      const target = typeof record.target === "number" ? record.target : null;
      const current = typeof record.current === "number" ? record.current : null;
      const trackingMode =
        record.trackingMode === "manual" ||
        record.trackingMode === "accounts" ||
        record.trackingMode === "netWorth"
          ? record.trackingMode
          : null;
      const accountIds = parseStringArray(record.accountIds) ?? [];

      if (!id || !name || target === null || current === null || !trackingMode) {
        return null;
      }

      return { id, name, target, current, trackingMode, accountIds };
    })
    .filter((entry): entry is GoalEntry => entry !== null);
}

function parseSupportUrl(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function buildDomainProfile(source: unknown, fallback?: DomainProfile): DomainProfile {
  const record = asRecord(source) ?? {};

  return {
    supportUrl: parseSupportUrl(record.supportUrl) ?? fallback?.supportUrl ?? null,
    incomeSourceAliases:
      parseAliases(record.incomeSourceAliases) ?? fallback?.incomeSourceAliases ?? [],
    merchantAliases:
      parseAliases(record.merchantAliases) ?? fallback?.merchantAliases ?? [],
    defaultCategorySetup:
      parseCategorySetup(record.defaultCategorySetup) ??
      fallback?.defaultCategorySetup ??
      [],
    defaultAccountEntries:
      parseAccountEntries(record.defaultAccountEntries) ??
      fallback?.defaultAccountEntries ??
      [],
    defaultGoals: parseGoals(record.defaultGoals) ?? fallback?.defaultGoals ?? [],
  };
}

const exampleProfile = buildDomainProfile(profileExample);

export const domainProfile = buildDomainProfile(
  localProfileModule?.default,
  exampleProfile,
);
