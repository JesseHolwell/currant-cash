import { formatCurrency } from "../../../models";
import type { AccountEntry } from "../../../models";

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
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount
}: {
  currency: string;
  accountSummary: AccountSummary;
  accountEntries: AccountEntry[];
  onAddAccount: () => void;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  onRemoveAccount: (id: string) => void;
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
    </>
  );
}
