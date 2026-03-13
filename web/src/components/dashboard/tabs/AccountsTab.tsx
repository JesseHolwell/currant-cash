import { formatCurrency } from "../../../models";
import type { AccountEntry, GoalEntry, ResolvedGoalEntry } from "../../../models";

type AccountKind = "asset" | "liability";

type AccountSummary = {
  assets: number;
  liabilities: number;
  netWorth: number;
};

export function AccountsTab({
  currency,
  accountSummary,
  accountEntries,
  goals,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal
}: {
  currency: string;
  accountSummary: AccountSummary;
  accountEntries: AccountEntry[];
  goals: ResolvedGoalEntry[];
  onAddAccount: () => void;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  onRemoveAccount: (id: string) => void;
  onAddGoal: () => void;
  onUpdateGoal: (id: string, patch: Partial<Omit<GoalEntry, "id">>) => void;
  onRemoveGoal: (id: string) => void;
}) {
  return (
    <>
      <section className="stats">
        <article>
          <h2>Assets</h2>
          <p>{formatCurrency(accountSummary.assets, currency)}</p>
        </article>
        <article>
          <h2>Liabilities</h2>
          <p>{formatCurrency(accountSummary.liabilities, currency)}</p>
        </article>
        <article>
          <h2>Net Worth</h2>
          <p>{formatCurrency(accountSummary.netWorth, currency)}</p>
        </article>
        <article>
          <h2>Accounts</h2>
          <p>{accountEntries.length}</p>
        </article>
      </section>

      <section className="panel">
        <div className="rules-header">
          <h3>Account Breakdown</h3>
          <button type="button" className="mode-btn active" onClick={onAddAccount}>Add Account</button>
        </div>
        <p className="mode-note">
          Track any balance category you want (bank, crypto, stocks, debt). Liabilities reduce net worth.
        </p>
        <ul className="account-list">
          {accountEntries.map((account) => (
            <li key={account.id} className="account-row">
              <input
                type="text"
                value={account.name}
                placeholder="Account name"
                onChange={(event) => onUpdateAccount(account.id, { name: event.target.value })}
              />
              <input
                type="text"
                value={account.bucket}
                placeholder="Category"
                onChange={(event) => onUpdateAccount(account.id, { bucket: event.target.value })}
              />
              <select
                value={account.kind}
                onChange={(event) => onUpdateAccount(account.id, { kind: event.target.value as AccountKind })}
              >
                <option value="asset">Asset (Credit)</option>
                <option value="liability">Liability (Debit)</option>
              </select>
              <input
                type="number"
                value={account.value}
                onChange={(event) => onUpdateAccount(account.id, { value: Number(event.target.value) || 0 })}
              />
              <button type="button" className="mode-btn" onClick={() => onRemoveAccount(account.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <div className="rules-header">
          <h3>Goals</h3>
          <button type="button" className="mode-btn active" onClick={onAddGoal}>Add Goal</button>
        </div>
        <p className="mode-note">
          Define savings or net worth targets against manual values, selected accounts, or total net worth.
        </p>
        <div className="goal-grid">
          {goals.map((goal) => {
            return (
              <article key={goal.id} className="goal-card">
                <div className="goal-card-row">
                  <input
                    type="text"
                    value={goal.name}
                    placeholder="Goal name"
                    onChange={(event) => onUpdateGoal(goal.id, { name: event.target.value })}
                  />
                  <button type="button" className="mode-btn" onClick={() => onRemoveGoal(goal.id)}>Delete</button>
                </div>
                <div className="goal-card-row compact">
                  <label>
                    Tracking
                    <select
                      value={goal.trackingMode}
                      onChange={(event) => onUpdateGoal(goal.id, { trackingMode: event.target.value as GoalEntry["trackingMode"] })}
                    >
                      <option value="manual">Manual</option>
                      <option value="accounts">Selected Accounts</option>
                      <option value="netWorth">Net Worth</option>
                    </select>
                  </label>
                  <label>
                    Target
                    <input
                      type="number"
                      value={goal.target}
                      onChange={(event) => onUpdateGoal(goal.id, { target: Number(event.target.value) || 0 })}
                    />
                  </label>
                </div>
                {goal.trackingMode === "manual" ? (
                  <div className="goal-card-row compact">
                    <label>
                      Current
                      <input
                        type="number"
                        value={goal.current}
                        onChange={(event) => onUpdateGoal(goal.id, { current: Number(event.target.value) || 0 })}
                      />
                    </label>
                  </div>
                ) : null}
                {goal.trackingMode === "accounts" ? (
                  <div className="goal-account-picker">
                    {accountEntries.map((account) => (
                      <label key={`${goal.id}-${account.id}`} className="goal-account-option">
                        <input
                          type="checkbox"
                          checked={goal.accountIds.includes(account.id)}
                          onChange={(event) => {
                            const nextIds = event.target.checked
                              ? [...goal.accountIds, account.id]
                              : goal.accountIds.filter((accountId) => accountId !== account.id);
                            onUpdateGoal(goal.id, { accountIds: [...new Set(nextIds)] });
                          }}
                        />
                        <span>{account.name || "Untitled Account"}</span>
                      </label>
                    ))}
                  </div>
                ) : null}
                {goal.trackingMode === "netWorth" ? (
                  <p className="mode-note">This goal tracks total net worth across all accounts.</p>
                ) : null}
                {goal.trackingMode !== "manual" ? (
                  <p className="mode-note">Current value updates from linked balances automatically.</p>
                ) : null}
                {goal.trackingMode !== "manual" ? (
                  <div className="goal-card-row compact">
                    <label>
                      Current Value
                      <input type="text" value={formatCurrency(goal.currentValue, currency)} readOnly />
                    </label>
                  </div>
                ) : null}
                <div className="goal-track">
                  <div className="goal-fill" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                </div>
                <p className="mode-note">{goal.sourceLabel} | {Math.round(goal.progress * 100)}% complete</p>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
