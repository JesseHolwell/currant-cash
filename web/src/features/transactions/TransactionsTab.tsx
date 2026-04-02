import {
  formatCurrency,
  formatTimelineLabel,
  resolveCategoryGroupBucket,
  resolveSubcategoryBucket
} from "../../domain";
import type {
  AiCategorySuggestion,
  AiSuggestionsState,
  RawTransaction,
  TimelinePeriod,
  TransactionExplorerFilters,
  TransactionDraft
} from "../../domain";
import { AiSuggestionBanner } from "../categories/AiSuggestionBanner";
import type { AiBannerAuthState } from "../categories/AiSuggestionBanner";

const inputCls = "border border-line-strong bg-surface text-ink rounded-sm pl-[0.6rem] pr-8 py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]";

export function TransactionsTab({
  currency,
  timelinePeriod,
  onTimelinePeriodChange,
  timelineOptions,
  uncategorizedCount,
  rulesFilter,
  onRulesFilterChange,
  transactionExplorerFilters,
  onTransactionExplorerFilterChange,
  onClearTransactionExplorerFilters,
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
  rulesFilter: "needs" | "all";
  onRulesFilterChange: (filter: "needs" | "all") => void;
  transactionExplorerFilters: TransactionExplorerFilters;
  onTransactionExplorerFilterChange: (patch: Partial<TransactionExplorerFilters>) => void;
  onClearTransactionExplorerFilters: () => void;
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
  const hasExplorerFilters = Boolean(
    transactionExplorerFilters.categoryGroup ||
    transactionExplorerFilters.startMonth ||
    transactionExplorerFilters.endMonth
  );

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

  const sourceLabelFor = (transaction: RawTransaction): string => {
    if (transaction.manualSource === "id") return "Manual rule";
    if (transaction.manualSource === "similar") return "Manual rule (similar)";
    if (transaction.classificationSource === "reprocessed-auto") return "Auto (reapplied)";
    return "Auto (imported)";
  };

  const activePeriodLabel = (() => {
    const startMonth = transactionExplorerFilters.startMonth;
    const endMonth = transactionExplorerFilters.endMonth;
    if (startMonth && endMonth) {
      return startMonth === endMonth
        ? formatTimelineLabel(startMonth as TimelinePeriod)
        : `${formatTimelineLabel(startMonth as TimelinePeriod)} - ${formatTimelineLabel(endMonth as TimelinePeriod)}`;
    }
    if (startMonth) return `From ${formatTimelineLabel(startMonth as TimelinePeriod)}`;
    if (endMonth) return `Up to ${formatTimelineLabel(endMonth as TimelinePeriod)}`;
    return formatTimelineLabel(timelinePeriod);
  })();

  return (
    <>
      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0 grid gap-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="grid gap-1 text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">
              Timeline
              <select
                id="timeline-period-transactions"
                value={timelinePeriod}
                className={inputCls}
                onChange={(event) => {
                  onTimelinePeriodChange(event.target.value as TimelinePeriod);
                  onTransactionExplorerFilterChange({ startMonth: "", endMonth: "" });
                }}
              >
                {timelineOptions.map((option) => (
                  <option key={option} value={option}>
                    {formatTimelineLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">
              Category
              <select
                value={transactionExplorerFilters.categoryGroup}
                className={inputCls}
                onChange={(event) => onTransactionExplorerFilterChange({ categoryGroup: event.target.value })}
              >
                <option value="">All categories</option>
                {categoryGroupOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">
              From
              <input
                type="month"
                value={transactionExplorerFilters.startMonth}
                className={inputCls}
                onChange={(event) => onTransactionExplorerFilterChange({ startMonth: event.target.value })}
              />
            </label>
            <label className="grid gap-1 text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">
              To
              <input
                type="month"
                value={transactionExplorerFilters.endMonth}
                className={inputCls}
                onChange={(event) => onTransactionExplorerFilterChange({ endMonth: event.target.value })}
              />
            </label>
          </div>
          <button type="button" className="mode-btn" onClick={onClearTransactionExplorerFilters} disabled={!hasExplorerFilters}>
            Clear Filters
          </button>
        </div>
        <p className="text-muted text-[0.82rem] m-0">
          Period: {activePeriodLabel} | Uncategorized: {uncategorizedCount} | Showing: {visibleEditableTransactions.length}
        </p>
        {hasExplorerFilters ? (
          <p className="text-muted text-[0.78rem] m-0">
            Drill-down filters are active. Adjust them here or clear them to return to the broader transaction list.
          </p>
        ) : null}
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
                    <span>Source: {sourceLabelFor(transaction)}</span>
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
