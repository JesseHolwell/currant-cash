import { DEFAULT_CATEGORY_SETUP } from "./constants";
import type { CategoryDefinition } from "./types";
import { createLocalId, normalizeForMatch } from "./utils";

export function normalizeCategoryLabel(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function parseSubcategoryText(value: string): string[] {
  const labels = value
    .split(/[,\n]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
  const unique = new Set<string>();
  const next: string[] = [];
  for (const label of labels) {
    const dedupeKey = normalizeForMatch(label);
    if (!dedupeKey || unique.has(dedupeKey)) {
      continue;
    }
    unique.add(dedupeKey);
    next.push(label);
  }
  return next;
}

export function buildDefaultCategoryDefinitions(): CategoryDefinition[] {
  return DEFAULT_CATEGORY_SETUP.map((item) => ({
    id: createLocalId("cat"),
    category: item.category,
    subcategories: item.subcategories.join(", ")
  }));
}

export function parseStoredCategoryDefinitions(raw: unknown): CategoryDefinition[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const next: CategoryDefinition[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const candidate = item as { id?: unknown; category?: unknown; subcategories?: unknown };
    const category = typeof candidate.category === "string" ? normalizeCategoryLabel(candidate.category) : "";
    if (!category) {
      continue;
    }
    const subcategoriesRaw = Array.isArray(candidate.subcategories)
      ? candidate.subcategories.filter((entry): entry is string => typeof entry === "string").join(", ")
      : typeof candidate.subcategories === "string"
        ? candidate.subcategories
        : "";
    const parsedSubcategories = parseSubcategoryText(subcategoriesRaw);
    next.push({
      id: typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : createLocalId("cat"),
      category,
      subcategories: (parsedSubcategories.length > 0 ? parsedSubcategories : [category]).join(", ")
    });
  }
  return next;
}

export function categoryTaxonomyFromDefinitions(definitions: CategoryDefinition[]): Map<string, string[]> {
  const taxonomy = new Map<string, string[]>();
  for (const definition of definitions) {
    const category = normalizeCategoryLabel(definition.category);
    if (!category) {
      continue;
    }
    const parsedSubcategories = parseSubcategoryText(definition.subcategories);
    const labels = parsedSubcategories.length > 0 ? parsedSubcategories : [category];
    const existing = taxonomy.get(category) ?? [];
    const dedupe = new Set(existing.map((label) => normalizeForMatch(label)));
    for (const label of labels) {
      const dedupeKey = normalizeForMatch(label);
      if (!dedupeKey || dedupe.has(dedupeKey)) {
        continue;
      }
      dedupe.add(dedupeKey);
      existing.push(label);
    }
    taxonomy.set(category, existing);
  }
  return taxonomy;
}
