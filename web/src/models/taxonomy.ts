import { DEFAULT_CATEGORY_SETUP } from "./constants";
import type { CategoryDefinition, CategorySubcategoryDefinition } from "./types";
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

export function parseKeywordText(value: string): string[] {
  return parseSubcategoryText(value);
}

function buildSubcategoryDefinition(name: string, keywords: string[] = []): CategorySubcategoryDefinition {
  return {
    id: createLocalId("subcat"),
    name: normalizeCategoryLabel(name),
    keywords: parseKeywordText(keywords.join(", "))
  };
}

export function buildDefaultCategoryDefinitions(): CategoryDefinition[] {
  return DEFAULT_CATEGORY_SETUP.map((item) => ({
    id: createLocalId("cat"),
    category: item.category,
    subcategories: item.subcategories.map((subcategory) => buildSubcategoryDefinition(subcategory.name, subcategory.keywords))
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
    const candidate = item as {
      id?: unknown;
      category?: unknown;
      subcategories?: unknown;
    };
    const category = typeof candidate.category === "string" ? normalizeCategoryLabel(candidate.category) : "";
    if (!category) {
      continue;
    }

    const parsedSubcategories = (() => {
      if (Array.isArray(candidate.subcategories)) {
        const structured = candidate.subcategories
          .map((entry) => {
            if (typeof entry === "string") {
              const normalizedName = normalizeCategoryLabel(entry);
              return normalizedName ? buildSubcategoryDefinition(normalizedName) : null;
            }
            if (!entry || typeof entry !== "object") {
              return null;
            }
            const subcategory = entry as { id?: unknown; name?: unknown; keywords?: unknown };
            const name = typeof subcategory.name === "string" ? normalizeCategoryLabel(subcategory.name) : "";
            if (!name) {
              return null;
            }
            const keywords = Array.isArray(subcategory.keywords)
              ? subcategory.keywords.filter((keyword): keyword is string => typeof keyword === "string")
              : typeof subcategory.keywords === "string"
                ? parseKeywordText(subcategory.keywords)
                : [];
            return {
              id: typeof subcategory.id === "string" && subcategory.id.trim().length > 0 ? subcategory.id : createLocalId("subcat"),
              name,
              keywords: parseKeywordText(keywords.join(", "))
            };
          })
          .filter((entry): entry is CategorySubcategoryDefinition => entry !== null);

        if (structured.length > 0) {
          return structured;
        }
      }

      const subcategoriesRaw = typeof candidate.subcategories === "string"
        ? candidate.subcategories
        : Array.isArray(candidate.subcategories)
          ? candidate.subcategories.filter((entry): entry is string => typeof entry === "string").join(", ")
          : "";
      return parseSubcategoryText(subcategoriesRaw).map((name) => buildSubcategoryDefinition(name));
    })();

    next.push({
      id: typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : createLocalId("cat"),
      category,
      subcategories: parsedSubcategories.length > 0 ? parsedSubcategories : [buildSubcategoryDefinition(category)]
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
    const labels = definition.subcategories
      .map((subcategory) => normalizeCategoryLabel(subcategory.name))
      .filter(Boolean);
    const parsedSubcategories = labels.length > 0 ? labels : [category];
    const existing = taxonomy.get(category) ?? [];
    const dedupe = new Set(existing.map((label) => normalizeForMatch(label)));
    for (const label of parsedSubcategories) {
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
