import { formatCurrency } from "../../domain";
import type { AccountEntry, GoalEntry, ResolvedGoalEntry } from "../../domain";

export function GoalsTab({
  currency,
  goals,
  accountEntries,
  inferredMonthlyExpenses,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
}: {
  currency: string;
  goals: ResolvedGoalEntry[];
  accountEntries: AccountEntry[];
  inferredMonthlyExpenses: number;
  onAddGoal: () => void;
  onUpdateGoal: (id: string, patch: Partial<Omit<GoalEntry, "id">>) => void;
  onRemoveGoal: (id: string) => void;
}) {
  return (
    <>
      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Goals</h3>
          <button type="button" className="mode-btn active" onClick={onAddGoal}>Add Goal</button>
        </div>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Define savings or net worth targets against manual values, selected accounts, or total net worth.
        </p>
        {inferredMonthlyExpenses > 0 ? (
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">
            A 6-month emergency fund is recommended. Based on your average monthly expenses of {formatCurrency(inferredMonthlyExpenses, currency)}, that&apos;s{" "}
            <strong className="text-ink">{formatCurrency(inferredMonthlyExpenses * 6, currency)}</strong>.
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-2 gap-[0.65rem]">
          {goals.map((goal) => (
            <article key={goal.id} className="border border-line rounded-md p-3 bg-surface hover:border-line-strong transition-colors">
              <div className="flex gap-[0.45rem] items-center">
                <input
                  type="text"
                  value={goal.name}
                  placeholder="Goal name"
                  className="flex-1 border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                  onChange={(event) => onUpdateGoal(goal.id, { name: event.target.value })}
                />
                <button type="button" className="mode-btn" onClick={() => onRemoveGoal(goal.id)}>Delete</button>
              </div>
              <div className="flex gap-[0.45rem] items-center mt-[0.45rem]">
                <label className="grid gap-[0.25rem] text-[0.75rem] text-ink-soft font-semibold w-full">
                  Tracking
                  <select
                    value={goal.trackingMode}
                    className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                    onChange={(event) => onUpdateGoal(goal.id, { trackingMode: event.target.value as GoalEntry["trackingMode"] })}
                  >
                    <option value="manual">Manual</option>
                    <option value="accounts">Selected Accounts</option>
                    <option value="netWorth">Net Worth</option>
                  </select>
                </label>
                <label className="grid gap-[0.25rem] text-[0.75rem] text-ink-soft font-semibold w-full">
                  Target
                  <input
                    type="number"
                    value={goal.target}
                    className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                    onChange={(event) => onUpdateGoal(goal.id, { target: Number(event.target.value) || 0 })}
                  />
                </label>
              </div>
              {goal.trackingMode === "manual" ? (
                <div className="flex gap-[0.45rem] items-center mt-[0.45rem]">
                  <label className="grid gap-[0.25rem] text-[0.75rem] text-ink-soft font-semibold w-full">
                    Current
                    <input
                      type="number"
                      value={goal.current}
                      className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                      onChange={(event) => onUpdateGoal(goal.id, { current: Number(event.target.value) || 0 })}
                    />
                  </label>
                </div>
              ) : null}
              {goal.trackingMode === "accounts" ? (
                <div className="mt-[0.55rem] grid grid-cols-2 gap-[0.4rem]">
                  {accountEntries.map((account) => (
                    <label key={`${goal.id}-${account.id}`} className="flex items-center gap-[0.4rem] border border-line rounded-sm px-[0.52rem] py-[0.45rem] bg-surface text-ink-soft text-[0.78rem] font-semibold">
                      <input
                        type="checkbox"
                        checked={goal.accountIds.includes(account.id)}
                        onChange={(event) => {
                          const nextIds = event.target.checked
                            ? [...goal.accountIds, account.id]
                            : goal.accountIds.filter((id) => id !== account.id);
                          onUpdateGoal(goal.id, { accountIds: [...new Set(nextIds)] });
                        }}
                      />
                      <span>{account.name || "Untitled Account"}</span>
                    </label>
                  ))}
                </div>
              ) : null}
              {goal.trackingMode === "netWorth" ? (
                <p className="text-muted text-[0.82rem] mt-[0.42rem]">This goal tracks total net worth across all accounts.</p>
              ) : null}
              {goal.trackingMode !== "manual" ? (
                <p className="text-muted text-[0.82rem] mt-[0.42rem]">Current value updates from linked balances automatically.</p>
              ) : null}
              {goal.trackingMode !== "manual" ? (
                <div className="flex gap-[0.45rem] items-center mt-[0.45rem]">
                  <label className="grid gap-[0.25rem] text-[0.75rem] text-ink-soft font-semibold w-full">
                    Current Value
                    <input type="text" value={formatCurrency(goal.currentValue, currency)} readOnly className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem]" />
                  </label>
                </div>
              ) : null}
              <div className="mt-2 h-2 rounded-full bg-[var(--accent-ring)] overflow-hidden">
                <div className="goal-fill" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
              </div>
              <p className="text-muted text-[0.82rem] mt-[0.42rem]">{goal.sourceLabel} | {Math.round(goal.progress * 100)}% complete</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
