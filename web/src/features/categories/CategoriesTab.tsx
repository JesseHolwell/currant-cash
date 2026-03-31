import { parseKeywordText } from "../../domain";
import type { CategoryDefinition, CategorySubcategoryDefinition } from "../../domain";

const inputCls = "border border-line-strong bg-surface text-ink rounded-sm pl-[0.6rem] pr-8 py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]";

export function CategoriesTab({
  categoryDefinitions,
  onAddCategoryDefinition,
  onResetCategoryDefinitions,
  onReapplyCategoryDefinitions,
  onUpdateCategoryDefinition,
  onRemoveCategoryDefinition,
  onAddCategorySubcategory,
  onUpdateCategorySubcategory,
  onRemoveCategorySubcategory,
  hasPendingCategoryReapply,
  pendingCategoryReapplyCount,
}: {
  categoryDefinitions: CategoryDefinition[];
  onAddCategoryDefinition: () => void;
  onResetCategoryDefinitions: () => void;
  onReapplyCategoryDefinitions: () => void;
  onUpdateCategoryDefinition: (id: string, patch: Partial<Pick<CategoryDefinition, "category">>) => void;
  onRemoveCategoryDefinition: (id: string) => void;
  onAddCategorySubcategory: (categoryId: string) => void;
  onUpdateCategorySubcategory: (
    categoryId: string,
    subcategoryId: string,
    patch: Partial<Omit<CategorySubcategoryDefinition, "id">>
  ) => void;
  onRemoveCategorySubcategory: (categoryId: string, subcategoryId: string) => void;
  hasPendingCategoryReapply: boolean;
  pendingCategoryReapplyCount: number;
}) {
  return (
    <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-display text-base tracking-[-0.02em] text-ink">Category Setup</h3>
        <div className="inline-flex items-center gap-[0.3rem]">
          <button type="button" className="mode-btn active" onClick={onAddCategoryDefinition}>Add Category</button>
          <button type="button" className="mode-btn" onClick={onResetCategoryDefinitions}>Reset Defaults</button>
        </div>
      </div>
      <p className="text-muted text-[0.82rem] mt-[0.42rem]">
        Set the parent taxonomy here, then add child keywords for import matching. Uploads use the bank category first,
        then child keywords, then category labels found in the narrative. Existing transactions keep their current
        auto-categories until you reapply this setup.
      </p>
      {hasPendingCategoryReapply ? (
        <div className="mt-3 rounded-md border border-line-strong bg-[var(--bg-warm)] p-3 flex items-center justify-between gap-3 flex-wrap">
          <p className="m-0 text-[0.82rem] text-ink-soft">
            Category changes are pending for {pendingCategoryReapplyCount.toLocaleString()} stored transaction
            {pendingCategoryReapplyCount === 1 ? "" : "s"}. Manual rules still override these results.
          </p>
          <button type="button" className="mode-btn active" onClick={onReapplyCategoryDefinitions}>
            Reapply To Existing
          </button>
        </div>
      ) : null}
      <div className="grid gap-[0.65rem] mt-3">
        {categoryDefinitions.map((definition) => {
          const keywordCount = definition.subcategories.reduce((sum, subcategory) => sum + subcategory.keywords.length, 0);
          return (
            <article key={definition.id} className="border border-line rounded-md p-3 bg-surface">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="grid gap-[0.35rem] flex-1">
                  <span className="text-[0.74rem] uppercase tracking-[0.1em] text-muted font-bold">Parent category</span>
                  <input
                    type="text"
                    value={definition.category}
                    placeholder="Category name"
                    className={`${inputCls} w-full`}
                    onChange={(event) => onUpdateCategoryDefinition(definition.id, { category: event.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-[0.8rem] text-ink-soft">
                    {definition.subcategories.length} child{definition.subcategories.length === 1 ? "" : "ren"} | {keywordCount} keyword
                    {keywordCount === 1 ? "" : "s"}
                  </span>
                  <button type="button" className="mode-btn" onClick={() => onRemoveCategoryDefinition(definition.id)}>Delete</button>
                </div>
              </div>

              <div className="grid gap-[0.3rem]">
                {definition.subcategories.length === 0 ? (
                  <div className="p-[0.8rem] rounded-sm bg-[var(--bg-warm)]">
                    <p className="text-muted text-[0.82rem] m-0">No child categories yet. Add one so uploads have somewhere specific to land.</p>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[minmax(160px,220px)_minmax(0,1fr)] gap-2 text-[0.72rem] text-muted font-bold px-1">
                      <span>Name</span>
                      <span>Keywords (comma separated)</span>
                    </div>
                    {definition.subcategories.map((subcategory) => (
                      <div key={subcategory.id} className="grid grid-cols-[minmax(160px,220px)_minmax(0,1fr)_auto] gap-2 items-center">
                        <input
                          type="text"
                          value={subcategory.name}
                          placeholder="Groceries"
                          className={inputCls}
                          onChange={(event) => onUpdateCategorySubcategory(definition.id, subcategory.id, { name: event.target.value })}
                        />
                        <input
                          type="text"
                          value={subcategory.keywords.join(", ")}
                          placeholder="coles, woolworths, uber eats"
                          className={inputCls}
                          onChange={(event) => onUpdateCategorySubcategory(
                            definition.id,
                            subcategory.id,
                            { keywords: parseKeywordText(event.target.value) }
                          )}
                        />
                        <button
                          type="button"
                          className="mode-btn"
                          onClick={() => onRemoveCategorySubcategory(definition.id, subcategory.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </>
                )}
              </div>

              <div className="flex justify-start mt-2">
                <button type="button" className="mode-btn active" onClick={() => onAddCategorySubcategory(definition.id)}>
                  Add Child Category
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
