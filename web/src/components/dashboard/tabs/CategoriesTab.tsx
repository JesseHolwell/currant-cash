import {
  formatCurrency,
  formatTimelineLabel,
  resolveCategoryGroupBucket,
  resolveSubcategoryBucket
} from "../../../models";
import type {
  CategoryDefinition,
  RawTransaction,
  TimelinePeriod,
  TransactionDraft
} from "../../../models";

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
  rulesFilter,
  onRulesFilterChange,
  onClearAllRules,
  visibleEditableTransactions,
  draftFor,
  onUpdateDraft,
  onSaveRule,
  onClearRule,
  subcategoryOptionsByGroup,
  categoryGroupOptions
}: {
  currency: string;
  timelinePeriod: TimelinePeriod;
  onTimelinePeriodChange: (period: TimelinePeriod) => void;
  timelineOptions: TimelinePeriod[];
  uncategorizedCount: number;
  categoryDefinitions: CategoryDefinition[];
  onAddCategoryDefinition: () => void;
  onResetCategoryDefinitions: () => void;
  onUpdateCategoryDefinition: (id: string, patch: Partial<Omit<CategoryDefinition, "id">>) => void;
  onRemoveCategoryDefinition: (id: string) => void;
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
}) {
  return (
    <>
      <section className="panel controls-panel">
        <div className="timeline-control">
          <label htmlFor="timeline-period-categories">Timeline</label>
          <select
            id="timeline-period-categories"
            value={timelinePeriod}
            onChange={(event) => onTimelinePeriodChange(event.target.value as TimelinePeriod)}
          >
            {timelineOptions.map((option) => (
              <option key={option} value={option}>
                {formatTimelineLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <p className="mode-note">Period: {formatTimelineLabel(timelinePeriod)} | Uncategorized: {uncategorizedCount}</p>
      </section>

      <section className="taxonomy">
        <div className="rules-header">
          <h3>Category Setup</h3>
          <div className="mode-toggle">
            <button type="button" className="mode-btn active" onClick={onAddCategoryDefinition}>Add Category</button>
            <button type="button" className="mode-btn" onClick={onResetCategoryDefinitions}>Reset Defaults</button>
          </div>
        </div>
        <p className="mode-note">
          Customize categories and comma-separated subcategories. Saved in this browser only.
        </p>
        <ul className="taxonomy-list">
          {categoryDefinitions.map((definition) => (
            <li key={definition.id} className="taxonomy-item">
              <input
                type="text"
                value={definition.category}
                placeholder="Category name"
                onChange={(event) => onUpdateCategoryDefinition(definition.id, { category: event.target.value })}
              />
              <input
                type="text"
                value={definition.subcategories}
                placeholder="Subcategories (comma separated)"
                onChange={(event) => onUpdateCategoryDefinition(definition.id, { subcategories: event.target.value })}
              />
              <button type="button" className="mode-btn" onClick={() => onRemoveCategoryDefinition(definition.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="uncategorized">
        <div className="rules-header">
          <h3>Transaction Rules</h3>
          <div className="mode-toggle">
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
        <p className="mode-note">
          Save category, subcategory, and nickname, then optionally apply to similar transactions.
        </p>

        {visibleEditableTransactions.length === 0 ? (
          <p>Nothing to edit for this filter and timeline.</p>
        ) : (
          <ul className="rules-list">
            {visibleEditableTransactions.slice(0, 120).map((transaction) => {
              const draft = draftFor(transaction);
              const draftSubcategoryOptions = subcategoryOptionsByGroup.get(draft.categoryGroup) ?? [];
              const draftSubcategoryListId = `subcategory-options-${transaction.id}`;
              return (
                <li key={transaction.id} className="rule-item">
                  <div className="rule-item-top">
                    <span className="rule-date">{transaction.date}</span>
                    <span className="rule-merchant">{transaction.merchant}</span>
                    <span className="rule-amount">{formatCurrency(transaction.amount, currency)}</span>
                  </div>
                  <div className="rule-item-meta">
                    <span>Current: {resolveCategoryGroupBucket(transaction)} -&gt; {resolveSubcategoryBucket(transaction)}</span>
                    <span>
                      Source: {transaction.manualSource === "id" ? "manual" : transaction.manualSource === "similar" ? "auto" : "default"}
                    </span>
                  </div>
                  <div className="rule-controls">
                    <select
                      value={draft.categoryGroup}
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
                      {categoryGroupOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      list={draftSubcategoryListId}
                      value={draft.category}
                      placeholder="Subcategory"
                      onChange={(event) => onUpdateDraft(transaction, { category: event.target.value })}
                    />
                    <datalist id={draftSubcategoryListId}>
                      {draftSubcategoryOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                    <input
                      type="text"
                      value={draft.nickname}
                      placeholder="Nickname for chart label"
                      onChange={(event) => onUpdateDraft(transaction, { nickname: event.target.value })}
                    />
                    <label className="rule-checkbox">
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
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
