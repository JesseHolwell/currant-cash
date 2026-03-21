import { describe, expect, it } from "vitest";
import {
  categoryTaxonomyFromDefinitions,
  normalizeCategoryLabel,
  parseStoredCategoryDefinitions,
  parseSubcategoryText
} from "../taxonomy";
import type { CategoryDefinition } from "../types";

const makeDefinition = (category: string, subcategoryNames: string[] = []): CategoryDefinition => ({
  id: `cat-${category}`,
  category,
  subcategories: subcategoryNames.map((name, i) => ({ id: `sub-${i}`, name, keywords: [] }))
});

describe("normalizeCategoryLabel", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normalizeCategoryLabel("  Food  ")).toBe("Food");
  });

  it("collapses multiple internal spaces", () => {
    expect(normalizeCategoryLabel("Eating   Out")).toBe("Eating Out");
  });

  it("preserves casing", () => {
    expect(normalizeCategoryLabel("Eating Out")).toBe("Eating Out");
  });
});

describe("parseSubcategoryText", () => {
  it("splits on commas", () => {
    expect(parseSubcategoryText("Coffee, Tea, Juice")).toEqual(["Coffee", "Tea", "Juice"]);
  });

  it("splits on newlines", () => {
    expect(parseSubcategoryText("Coffee\nTea\nJuice")).toEqual(["Coffee", "Tea", "Juice"]);
  });

  it("filters empty entries", () => {
    expect(parseSubcategoryText("Coffee,,Juice")).toEqual(["Coffee", "Juice"]);
    expect(parseSubcategoryText(",\n,")).toEqual([]);
  });

  it("deduplicates case-insensitively", () => {
    const result = parseSubcategoryText("Coffee, coffee, COFFEE");
    expect(result).toHaveLength(1);
    expect(result[0]).toBe("Coffee");
  });
});

describe("categoryTaxonomyFromDefinitions", () => {
  it("returns an empty Map for no definitions", () => {
    expect(categoryTaxonomyFromDefinitions([])).toEqual(new Map());
  });

  it("maps category to its subcategory names", () => {
    const definitions = [makeDefinition("Food", ["Groceries", "Eating Out"])];
    const taxonomy = categoryTaxonomyFromDefinitions(definitions);
    expect(taxonomy.get("Food")).toEqual(["Groceries", "Eating Out"]);
  });

  it("falls back to the category name itself when subcategories are empty", () => {
    const definitions = [makeDefinition("Utilities", [])];
    const taxonomy = categoryTaxonomyFromDefinitions(definitions);
    expect(taxonomy.get("Utilities")).toEqual(["Utilities"]);
  });

  it("merges definitions for the same category without duplicates", () => {
    const definitions = [makeDefinition("Food", ["Groceries"]), makeDefinition("Food", ["Groceries", "Dining"])];
    const taxonomy = categoryTaxonomyFromDefinitions(definitions);
    const subcategories = taxonomy.get("Food") ?? [];
    expect(subcategories).toContain("Groceries");
    expect(subcategories).toContain("Dining");
    expect(subcategories.filter((s) => s === "Groceries")).toHaveLength(1);
  });

  it("skips definitions with empty category names", () => {
    const definitions = [makeDefinition("", ["Subcategory"]), makeDefinition("Food", ["Groceries"])];
    const taxonomy = categoryTaxonomyFromDefinitions(definitions);
    expect(taxonomy.has("")).toBe(false);
    expect(taxonomy.has("Food")).toBe(true);
  });
});

describe("parseStoredCategoryDefinitions", () => {
  it("returns empty array for non-array input", () => {
    expect(parseStoredCategoryDefinitions(null)).toEqual([]);
    expect(parseStoredCategoryDefinitions("string")).toEqual([]);
    expect(parseStoredCategoryDefinitions(42)).toEqual([]);
  });

  it("parses a well-formed array of category definitions", () => {
    const raw = [{ id: "cat-1", category: "Food", subcategories: [{ id: "sub-1", name: "Groceries", keywords: [] }] }];
    const result = parseStoredCategoryDefinitions(raw);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("Food");
    expect(result[0].subcategories[0].name).toBe("Groceries");
  });

  it("skips entries with missing or empty category", () => {
    const raw = [{ id: "cat-1", category: "", subcategories: [] }, { id: "cat-2", category: "Food", subcategories: [] }];
    const result = parseStoredCategoryDefinitions(raw);
    expect(result).toHaveLength(1);
    expect(result[0].category).toBe("Food");
  });

  it("generates an id when none is provided", () => {
    const raw = [{ category: "Food", subcategories: [] }];
    const result = parseStoredCategoryDefinitions(raw);
    expect(result[0].id).toBeTruthy();
  });

  it("parses subcategories provided as plain strings", () => {
    const raw = [{ id: "cat-1", category: "Food", subcategories: ["Groceries", "Dining"] }];
    const result = parseStoredCategoryDefinitions(raw);
    const names = result[0].subcategories.map((s) => s.name);
    expect(names).toContain("Groceries");
    expect(names).toContain("Dining");
  });
});
