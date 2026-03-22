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
      <section className="grid grid-cols-4 gap-[0.65rem]">
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Assets</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(accountSummary.assets, currency)}</p>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Liabilities</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(accountSummary.liabilities, currency)}</p>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Net Worth</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(accountSummary.netWorth, currency)}</p>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Accounts</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{accountEntries.length}</p>
        </article>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Account Breakdown</h3>
          <button type="button" className="mode-btn active" onClick={onAddAccount}>Add Account</button>
        </div>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Track any balance category you want (bank, crypto, stocks, debt). Liabilities reduce net worth.
        </p>
        <ul className="list-none mt-3 p-0 grid gap-[0.48rem]">
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

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Account Balance History</h3>
          <button type="button" className="mode-btn active" onClick={onAddAccountHistorySnapshot}>
            Add Month Snapshot
          </button>
        </div>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Enter monthly balances for each account. Liabilities should be entered as positive balances; they are treated as
          negative in the chart.
        </p>
        {accountHistorySnapshots.length === 0 ? (
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">No monthly snapshots yet. Add your first month to start the trend chart.</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-muted text-[0.72rem] uppercase tracking-[0.08em] py-[0.5rem] px-[0.6rem] border-b border-line">Month</th>
                  {accountEntries.map((account) => (
                    <th key={account.id} className="text-left font-semibold text-muted text-[0.72rem] uppercase tracking-[0.08em] py-[0.5rem] px-[0.6rem] border-b border-line">{account.name || "Untitled Account"}</th>
                  ))}
                  <th className="border-b border-line" />
                </tr>
              </thead>
              <tbody>
                {accountHistorySnapshots.map((snapshot) => (
                  <tr key={snapshot.id} className="hover:bg-[var(--bg-warm)] transition-colors">
                    <td className="py-[0.4rem] px-[0.5rem] border-b border-line">
                      <input
                        type="month"
                        value={snapshot.month}
                        className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                        onChange={(event) => onUpdateAccountHistoryMonth(snapshot.id, event.target.value)}
                      />
                    </td>
                    {accountEntries.map((account) => (
                      <td key={`${snapshot.id}-${account.id}`} className="py-[0.4rem] px-[0.5rem] border-b border-line">
                        <input
                          type="number"
                          value={snapshot.balances[account.id] ?? 0}
                          className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                          onChange={(event) => onUpdateAccountHistoryBalance(
                            snapshot.id,
                            account.id,
                            Number(event.target.value) || 0
                          )}
                        />
                      </td>
                    ))}
                    <td className="py-[0.4rem] px-[0.5rem] border-b border-line">
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

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft flex items-center justify-between gap-[0.8rem] flex-wrap">
        <div>
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Forecast Inputs</h3>
          <div className="grid grid-cols-2 gap-[0.6rem] w-full mt-3">
            <label className="grid gap-[0.25rem] text-[0.75rem] text-ink-soft font-semibold">
              Start net worth
              <input
                type="number"
                value={forecastStartNetWorth ?? ""}
                placeholder={`${accountSummary.netWorth}`}
                className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                onChange={(event) => {
                  const next = event.target.value.trim();
                  onForecastStartNetWorthChange(next ? Number(next) : null);
                }}
              />
            </label>
            <label className="grid gap-[0.25rem] text-[0.75rem] text-ink-soft font-semibold">
              Monthly forecast delta
              <input
                type="number"
                value={forecastMonthlyDelta ?? ""}
                placeholder={`${inferredMonthlyNetFlow}`}
                className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                onChange={(event) => {
                  const next = event.target.value.trim();
                  onForecastMonthlyDeltaChange(next ? Number(next) : null);
                }}
              />
            </label>
          </div>
        </div>
        <div className="inline-flex items-center gap-[0.4rem] flex-wrap">
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
