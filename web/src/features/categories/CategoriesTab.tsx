import {
  formatCurrency,
  formatTimelineLabel,
  parseKeywordText,
  resolveCategoryGroupBucket,
  resolveSubcategoryBucket
} from "../../domain";
import type {
  AiCategorySuggestion,
  AiSuggestionsState,
  CategoryDefinition,
  CategorySubcategoryDefinition,
  RawTransaction,
  TimelinePeriod,
  TransactionDraft
} from "../../domain";
import { AiSuggestionBanner } from "./AiSuggestionBanner";
import type { AiBannerAuthState } from "./AiSuggestionBanner";

const inputCls = "border border-line-strong bg-surface text-ink rounded-sm pl-[0.6rem] pr-8 py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]";

export function CategoriesTab({
  currency,
  timelinePeriod,
  onTimelinePeriodChange,
  timelineOptions,
  uncategorizedCount,
  categoryDefinitions,
  onAddCategoryDefinition,
  onResetCategoryDefinitions,
  onUpdateCategoryDefinition,
  onRemoveCategoryDefinition,
  onAddCategorySubcategory,
  onUpdateCategorySubcategory,
  onRemoveCategorySubcategory,
  rulesFilter,
  onRulesFilterChange,
  onClearAllRules,
  visibleEditableTransactions,
  draftFor,
  onUpdateDraft,
  onSaveRule,
  onClearRule,
  subcategoryOptionsByGroup,
  categoryGroupOptions,
  isSignedIn,
  openaiApiKey,
  aiSuggestions,
  onRunAiSuggestions,
  onAcceptAiSuggestion,
  onAcceptAllAiSuggestions,
  onRejectAiSuggestion,
  onDismissAiSuggestions,
  onOpenApiKeyModal,
  onSignIn,
}: {
  currency: string;
  timelinePeriod: TimelinePeriod;
  onTimelinePeriodChange: (period: TimelinePeriod) => void;
  timelineOptions: TimelinePeriod[];
  uncategorizedCount: number;
  categoryDefinitions: CategoryDefinition[];
  onAddCategoryDefinition: () => void;
  onResetCategoryDefinitions: () => void;
  onUpdateCategoryDefinition: (id: string, patch: Partial<Pick<CategoryDefinition, "category">>) => void;
  onRemoveCategoryDefinition: (id: string) => void;
  onAddCategorySubcategory: (categoryId: string) => void;
  onUpdateCategorySubcategory: (
    categoryId: string,
    subcategoryId: string,
    patch: Partial<Omit<CategorySubcategoryDefinition, "id">>
  ) => void;
  onRemoveCategorySubcategory: (categoryId: string, subcategoryId: string) => void;
  rulesFilter: "needs" | "all";
  onRulesFilterChange: (filter: "needs" | "all") => void;
  onClearAllRules: () => void;
  visibleEditableTransactions: RawTransaction[];
  draftFor: (transaction: RawTransaction) => TransactionDraft;
  onUpdateDraft: (transaction: RawTransaction, patch: Partial<TransactionDraft>) => void;
  onSaveRule: (transaction: RawTransaction) => void;
  onClearRule: (transaction: RawTransaction) => void;
  subcategoryOptionsByGroup: Map<string, string[]>;
  categoryGroupOptions: string[];
  isSignedIn: boolean;
  openaiApiKey: string;
  aiSuggestions: AiSuggestionsState;
  onRunAiSuggestions: () => void;
  onAcceptAiSuggestion: (transactionId: string) => void;
  onAcceptAllAiSuggestions: () => void;
  onRejectAiSuggestion: (transactionId: string) => void;
  onDismissAiSuggestions: () => void;
  onOpenApiKeyModal: () => void;
  onSignIn: () => void;
}) {
  const pendingCount = aiSuggestions.suggestions.filter((s) => s.status === "pending").length;

  const bannerAuthState: AiBannerAuthState = (() => {
    if (!isSignedIn) return "unauthenticated";
    if (!openaiApiKey.trim()) return "no-key";
    if (aiSuggestions.status === "running") return "running";
    if (aiSuggestions.status === "error") return "error";
    if (aiSuggestions.status === "done" && pendingCount > 0) return "done";
    return "ready";
  })();

  const suggestionByTransactionId = new Map<string, AiCategorySuggestion>(
    aiSuggestions.suggestions
      .filter((s) => s.status === "pending")
      .map((s) => [s.transactionId, s])
  );
  return (
    <>
      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0 flex items-center justify-between gap-4 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <label htmlFor="timeline-period-categories" className="text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">Timeline</label>
          <select
            id="timeline-period-categories"
            value={timelinePeriod}
            className={inputCls}
            onChange={(event) => onTimelinePeriodChange(event.target.value as TimelinePeriod)}
          >
            {timelineOptions.map((option) => (
              <option key={option} value={option}>
                {formatTimelineLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <p className="text-muted text-[0.82rem]">Period: {formatTimelineLabel(timelinePeriod)} | Uncategorized: {uncategorizedCount}</p>
      </section>

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
          then child keywords, then category labels found in the narrative. Saved in this browser only.
        </p>
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

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <AiSuggestionBanner
          authState={bannerAuthState}
          pendingCount={pendingCount}
          uncategorizedCount={uncategorizedCount}
          errorMessage={aiSuggestions.errorMessage}
          onSignIn={onSignIn}
          onOpenApiKeyModal={onOpenApiKeyModal}
          onRunSuggestions={onRunAiSuggestions}
          onAcceptAll={onAcceptAllAiSuggestions}
          onDismiss={onDismissAiSuggestions}
        />
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Transaction Rules</h3>
          <div className="inline-flex items-center gap-[0.3rem]">
            <button
              type="button"
              className={rulesFilter === "needs" ? "mode-btn active" : "mode-btn"}
              onClick={() => onRulesFilterChange("needs")}
            >
              Needs Category
            </button>
            <button
              type="button"
              className={rulesFilter === "all" ? "mode-btn active" : "mode-btn"}
              onClick={() => onRulesFilterChange("all")}
            >
              All Debits
            </button>
          </div>
          <button type="button" className="mode-btn" onClick={onClearAllRules}>Clear All Rules</button>
        </div>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Save category, subcategory, and nickname, then optionally apply to similar transactions.
        </p>

        {visibleEditableTransactions.length === 0 ? (
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">Nothing to edit for this filter and timeline.</p>
        ) : (
          <ul className="list-none mt-[0.72rem] p-0 grid gap-[0.5rem]">
            {visibleEditableTransactions.slice(0, 120).map((transaction) => {
              const draft = draftFor(transaction);
              const draftSubcategoryOptions = subcategoryOptionsByGroup.get(draft.categoryGroup) ?? [];
              const aiSuggestion = suggestionByTransactionId.get(transaction.id);
              return (
                <li key={transaction.id} className="border border-line rounded-md p-3 hover:border-line-strong transition-colors">
                  <div className="grid grid-cols-[120px_minmax(0,1fr)_120px] gap-3 items-center">
                    <span className="font-bold text-ink-soft text-[0.82rem]">{transaction.date}</span>
                    <span className="text-ink whitespace-nowrap overflow-hidden text-ellipsis text-[0.9rem]">{transaction.merchant}</span>
                    <span className="text-right font-semibold text-ink text-[0.9rem]">{formatCurrency(transaction.amount, currency)}</span>
                  </div>
                  <div className="mt-[0.36rem] text-muted text-[0.76rem] flex flex-wrap gap-x-3">
                    <span>Current: {resolveCategoryGroupBucket(transaction)} -&gt; {resolveSubcategoryBucket(transaction)}</span>
                    <span>
                      Source: {transaction.manualSource === "id" ? "manual" : transaction.manualSource === "similar" ? "auto" : "default"}
                    </span>
                  </div>
                  {aiSuggestion ? (
                    <div className="mt-[0.52rem] flex flex-wrap gap-[0.4rem] items-center">
                      <select
                        value={draft.categoryGroup}
                        className={`${inputCls} flex-1 min-w-[130px]`}
                        onChange={(event) => {
                          const nextGroup = event.target.value;
                          const options = subcategoryOptionsByGroup.get(nextGroup) ?? [];
                          const nextCategory = options.includes(draft.category) ? draft.category : (options[0] ?? draft.category);
                          onUpdateDraft(transaction, { categoryGroup: nextGroup, category: nextCategory });
                        }}
                      >
                        {[...new Set([draft.categoryGroup, ...categoryGroupOptions].filter(Boolean))].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <select
                        value={draft.category}
                        aria-label="Subcategory"
                        className={`${inputCls} flex-1 min-w-[130px]`}
                        onChange={(event) => onUpdateDraft(transaction, { category: event.target.value })}
                      >
                        {[...new Set([draft.category, ...draftSubcategoryOptions].filter(Boolean))].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <span className="inline-flex items-center px-[0.4rem] py-[0.15rem] rounded-full text-[0.7rem] font-bold text-[#5C6FA8] bg-[#5C6FA8]/10">AI</span>
                      <button
                        type="button"
                        className="mode-btn active"
                        onClick={() => onAcceptAiSuggestion(transaction.id)}
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        className="mode-btn"
                        onClick={() => onRejectAiSuggestion(transaction.id)}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    <div className="mt-[0.52rem] flex flex-wrap gap-[0.4rem] items-center">
                      <select
                        value={draft.categoryGroup}
                        className={`${inputCls} flex-1 min-w-[130px]`}
                        onChange={(event) => {
                          const nextGroup = event.target.value;
                          const options = subcategoryOptionsByGroup.get(nextGroup) ?? [];
                          const nextCategory = options.includes(draft.category) ? draft.category : (options[0] ?? draft.category);
                          onUpdateDraft(transaction, {
                            categoryGroup: nextGroup,
                            category: nextCategory
                          });
                        }}
                      >
                        {[...new Set([draft.categoryGroup, ...categoryGroupOptions].filter(Boolean))].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <select
                        value={draft.category}
                        aria-label="Subcategory"
                        className={`${inputCls} flex-1 min-w-[130px]`}
                        onChange={(event) => onUpdateDraft(transaction, { category: event.target.value })}
                      >
                        {[...new Set([draft.category, ...draftSubcategoryOptions].filter(Boolean))].map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={draft.nickname}
                        placeholder="Nickname for chart label"
                        className={`${inputCls} flex-[2_1_180px] min-w-[140px]`}
                        onChange={(event) => onUpdateDraft(transaction, { nickname: event.target.value })}
                      />
                      <label className="inline-flex items-center gap-[0.3rem] text-[0.8rem] text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          checked={draft.applySimilar}
                          onChange={(event) => onUpdateDraft(transaction, { applySimilar: event.target.checked })}
                        />
                        Apply to similar
                      </label>
                      <button type="button" className="mode-btn active" onClick={() => onSaveRule(transaction)}>Save</button>
                      <button type="button" className="mode-btn" onClick={() => onClearRule(transaction)}>Reset</button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
