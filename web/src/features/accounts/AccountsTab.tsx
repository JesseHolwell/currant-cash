import { useState } from "react";
import { formatCurrency, getCadenceLabels } from "../../domain";
import type { AccountEntry, AccountHistorySnapshot, PayFrequency } from "../../domain";
import { ImportSnapshotsModal } from "./ImportSnapshotsModal";

type AccountKind = "asset" | "liability";

type AccountSummary = {
  assets: number;
  liabilities: number;
  netWorth: number;
  lockedAssets: number;
  liquidNetWorth: number;
};

export function AccountsTab({
  currency,
  accountSummary,
  accountEntries,
  accountHistorySnapshots,
  payFrequency,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onAddAccountHistorySnapshot,
  onUpdateAccountHistoryDate,
  onUpdateAccountHistoryBalance,
  onRemoveAccountHistorySnapshot,
  onReplaceAccountHistory
}: {
  currency: string;
  accountSummary: AccountSummary;
  accountEntries: AccountEntry[];
  accountHistorySnapshots: AccountHistorySnapshot[];
  payFrequency: PayFrequency;
  onAddAccount: () => void;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  onRemoveAccount: (id: string) => void;
  onAddAccountHistorySnapshot: () => void;
  onUpdateAccountHistoryDate: (snapshotId: string, date: string) => void;
  onUpdateAccountHistoryBalance: (snapshotId: string, accountId: string, value: number) => void;
  onRemoveAccountHistorySnapshot: (snapshotId: string) => void;
  onReplaceAccountHistory: (snapshots: AccountHistorySnapshot[]) => void;
}) {
  const cadence = getCadenceLabels(payFrequency);
  const [showImport, setShowImport] = useState(false);
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
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(accountSummary.liquidNetWorth, currency)}</p>
          {accountSummary.lockedAssets > 0 ? (
            <span className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">
              + {formatCurrency(accountSummary.lockedAssets, currency)} locked = {formatCurrency(accountSummary.netWorth, currency)} total
            </span>
          ) : null}
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
                onChange={(event) => onUpdateAccount(account.id, {
                  kind: event.target.value as AccountKind,
                  // Liabilities can't be locked — clear if user switches kind.
                  ...(event.target.value === "liability" ? { lockedUntilAge: undefined } : {})
                })}
              >
                <option value="asset">Asset (Credit)</option>
                <option value="liability">Liability (Debit)</option>
              </select>
              {account.kind === "asset" ? (
                <label
                  className="flex items-center gap-[0.4rem] text-[0.78rem] text-muted"
                  title="Locked retirement asset (e.g. superannuation). Counts toward net worth but isn't spendable until the chosen age."
                >
                  <span aria-hidden="true">🔒</span>
                  <input
                    type="number"
                    min={40}
                    max={75}
                    step={1}
                    placeholder="—"
                    value={account.lockedUntilAge ?? ""}
                    onChange={(event) => {
                      const raw = event.target.value;
                      if (raw === "") {
                        onUpdateAccount(account.id, { lockedUntilAge: undefined });
                        return;
                      }
                      const v = Number(raw);
                      if (Number.isFinite(v) && v >= 16 && v <= 100) {
                        onUpdateAccount(account.id, { lockedUntilAge: Math.round(v) });
                      }
                    }}
                    style={{ width: "4rem" }}
                  />
                </label>
              ) : <span />}
              <button type="button" className="mode-btn" onClick={() => onRemoveAccount(account.id)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <div className="flex items-center justify-between gap-3 mb-2">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Account Balance History</h3>
          <div className="flex items-center gap-2">
            <button type="button" className="mode-btn" onClick={() => setShowImport(true)}>
              Import…
            </button>
            <button type="button" className="mode-btn active" onClick={onAddAccountHistorySnapshot}>
              Add Snapshot
            </button>
          </div>
        </div>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Record balances each {cadence.noun} (or whenever you check in). Liabilities should be entered as positive balances;
          they are treated as negative in the chart.
        </p>
        {accountHistorySnapshots.length === 0 ? (
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">No snapshots yet. Add your first check-in to start the trend chart.</p>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className="text-left font-semibold text-muted text-[0.72rem] uppercase tracking-[0.08em] py-[0.5rem] px-[0.6rem] border-b border-line">Date</th>
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
                        type="date"
                        value={snapshot.date}
                        className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                        onChange={(event) => onUpdateAccountHistoryDate(snapshot.id, event.target.value)}
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

      {showImport ? (
        <ImportSnapshotsModal
          accounts={accountEntries}
          existingSnapshots={accountHistorySnapshots}
          onClose={() => setShowImport(false)}
          onImport={(snapshots) => onReplaceAccountHistory(snapshots)}
        />
      ) : null}
    </>
  );
}
