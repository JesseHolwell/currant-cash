import { formatCurrency } from "../../domain";
import type { AccountEntry, AccountHistorySnapshot } from "../../domain";

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
  accountHistorySnapshots,
  inferredMonthlyNetFlow,
  forecastStartNetWorth,
  forecastMonthlyDelta,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onAddAccountHistorySnapshot,
  onUpdateAccountHistoryMonth,
  onUpdateAccountHistoryBalance,
  onRemoveAccountHistorySnapshot,
  onForecastStartNetWorthChange,
  onForecastMonthlyDeltaChange,
  onResetStartNetWorth,
  onResetMonthlyDelta
}: {
  currency: string;
  accountSummary: AccountSummary;
  accountEntries: AccountEntry[];
  accountHistorySnapshots: AccountHistorySnapshot[];
  inferredMonthlyNetFlow: number;
  forecastStartNetWorth: number | null;
  forecastMonthlyDelta: number | null;
  onAddAccount: () => void;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  onRemoveAccount: (id: string) => void;
  onAddAccountHistorySnapshot: () => void;
  onUpdateAccountHistoryMonth: (snapshotId: string, month: string) => void;
  onUpdateAccountHistoryBalance: (snapshotId: string, accountId: string, value: number) => void;
  onRemoveAccountHistorySnapshot: (snapshotId: string) => void;
  onForecastStartNetWorthChange: (value: number | null) => void;
  onForecastMonthlyDeltaChange: (value: number | null) => void;
  onResetStartNetWorth: () => void;
  onResetMonthlyDelta: () => void;
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
          <h3>Account Balance History</h3>
          <button type="button" className="mode-btn active" onClick={onAddAccountHistorySnapshot}>
            Add Month Snapshot
          </button>
        </div>
        <p className="mode-note">
          Enter monthly balances for each account. Liabilities should be entered as positive balances; they are treated as
          negative in the chart.
        </p>
        {accountHistorySnapshots.length === 0 ? (
          <p className="mode-note">No monthly snapshots yet. Add your first month to start the trend chart.</p>
        ) : (
          <div className="history-wrap">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Month</th>
                  {accountEntries.map((account) => (
                    <th key={account.id}>{account.name || "Untitled Account"}</th>
                  ))}
                  <th />
                </tr>
              </thead>
              <tbody>
                {accountHistorySnapshots.map((snapshot) => (
                  <tr key={snapshot.id}>
                    <td>
                      <input
                        type="month"
                        value={snapshot.month}
                        onChange={(event) => onUpdateAccountHistoryMonth(snapshot.id, event.target.value)}
                      />
                    </td>
                    {accountEntries.map((account) => (
                      <td key={`${snapshot.id}-${account.id}`}>
                        <input
                          type="number"
                          value={snapshot.balances[account.id] ?? 0}
                          onChange={(event) => onUpdateAccountHistoryBalance(
                            snapshot.id,
                            account.id,
                            Number(event.target.value) || 0
                          )}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className="mode-btn"
                        onClick={() => onRemoveAccountHistorySnapshot(snapshot.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel controls-panel">
        <h3>Forecast Inputs</h3>
        <div className="control-grid">
          <label>
            Start net worth
            <input
              type="number"
              value={forecastStartNetWorth ?? ""}
              placeholder={`${accountSummary.netWorth}`}
              onChange={(event) => {
                const next = event.target.value.trim();
                onForecastStartNetWorthChange(next ? Number(next) : null);
              }}
            />
          </label>
          <label>
            Monthly forecast delta
            <input
              type="number"
              value={forecastMonthlyDelta ?? ""}
              placeholder={`${inferredMonthlyNetFlow}`}
              onChange={(event) => {
                const next = event.target.value.trim();
                onForecastMonthlyDeltaChange(next ? Number(next) : null);
              }}
            />
          </label>
        </div>
        <div className="mode-toggle">
          <button type="button" className="mode-btn" onClick={onResetStartNetWorth}>
            Use account total
          </button>
          <button type="button" className="mode-btn" onClick={onResetMonthlyDelta}>
            Use inferred delta
          </button>
        </div>
      </section>
    </>
  );
}
