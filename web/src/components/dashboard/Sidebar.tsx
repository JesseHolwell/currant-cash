import { formatCurrency } from "../../domain";
import type { DashboardTab, ResolvedGoalEntry } from "../../domain";

type AccountSummary = {
  netWorth: number;
  byBucket: Array<{ bucket: string; total: number }>;
};

type TabMeta = Record<
  DashboardTab,
  { label: string; title: string; subtitle: string }
>;

const TAB_ICONS: Partial<Record<DashboardTab, () => React.ReactElement>> = {
  dashboard: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3"/>
    </svg>
  ),
  expenses: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="9" width="3" height="6" rx="1" fill="currentColor"/>
      <rect x="6" y="5" width="3" height="10" rx="1" fill="currentColor" opacity="0.75"/>
      <rect x="11" y="1" width="3" height="14" rx="1" fill="currentColor" opacity="0.5"/>
    </svg>
  ),
  fireInsights: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 14c3.314 0 6-2.462 6-5.5 0-1.8-.9-3.2-2-4.1-.2 1.3-.8 2.1-1.5 2.4C10.2 5 9.5 2.5 7.5 1c0 2-1 3.2-2 4-.5.4-1 1.2-1 2.5 0 .7.2 1.3.5 1.8C4.4 9 4 8.2 4 7.4c-.6.8-1 1.9-1 3.1C3 13.5 5.2 14 8 14Z" fill="currentColor" opacity="0.85"/>
    </svg>
  ),
  income: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
      <path d="M8 4v1.5M8 10.5V12M6 6.5C6 5.7 6.9 5 8 5s2 .7 2 1.5c0 1.8-4 1.8-4 3.5C6 10.8 6.9 11.5 8 11.5s2-.7 2-1.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  ),
  accounts: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
      <path d="M1 6.5h14" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <rect x="3" y="9" width="3" height="1.5" rx="0.75" fill="currentColor" opacity="0.6"/>
    </svg>
  ),
  goals: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
      <circle cx="8" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" opacity="0.7"/>
      <circle cx="8" cy="8" r="1.5" fill="currentColor"/>
    </svg>
  ),
  categories: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 4h12M2 8h8M2 12h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.8"/>
      <circle cx="13" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.2" opacity="0.6"/>
      <path d="M13 9.8v1.2l.8.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
  imports: () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8"/>
      <path d="M2 11v1.5A1.5 1.5 0 0 0 3.5 14h9a1.5 1.5 0 0 0 1.5-1.5V11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </svg>
  ),
};

const NAV_TABS: DashboardTab[] = [
  "dashboard",
  "expenses",
  "fireInsights",
  "income",
  "accounts",
  "goals",
  "categories",
  "imports",
];

// React import needed for JSX in icon fns
import type React from "react";

export function Sidebar({
  tabMeta,
  activeTab,
  onTabChange,
  accountSummary,
  goals,
  currency,
}: {
  tabMeta: TabMeta;
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  accountSummary: AccountSummary;
  goals: ResolvedGoalEntry[];
  currency: string;
}) {
  return (
    <aside className="sidebar">
      <nav className="nav-list" aria-label="Dashboard navigation">
        {NAV_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab];
          return (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "nav-btn active" : "nav-btn"}
              onClick={() => onTabChange(tab)}
              aria-current={activeTab === tab ? "page" : undefined}
            >
              {Icon ? <Icon /> : null}
              <span>{tabMeta[tab].label}</span>
            </button>
          );
        })}
      </nav>

      <section className="sidebar-card">
        <p className="sidebar-label">Accounts</p>
        <ul className="sidebar-list">
          {accountSummary.byBucket.slice(0, 6).map((item) => (
            <li key={item.bucket}>
              <span>{item.bucket}</span>
              <strong>{formatCurrency(item.total, currency)}</strong>
            </li>
          ))}
        </ul>
        <div className="sidebar-total">
          <span>Net Worth</span>
          <strong>{formatCurrency(accountSummary.netWorth, currency)}</strong>
        </div>
      </section>

      <section className="sidebar-card">
        <p className="sidebar-label">Goals</p>
        <ul className="goal-mini-list">
          {goals.slice(0, 4).map((goal) => (
            <li key={goal.id}>
              <div>
                <span>{goal.name || "Untitled Goal"}</span>
                <small>
                  {Math.round(goal.progress * 100)}% ·{" "}
                  {formatCurrency(Math.round(goal.currentValue), currency)} /{" "}
                  {formatCurrency(Math.round(goal.target), currency)}
                </small>
              </div>
              <div className="goal-mini-track">
                <div
                  className="goal-mini-fill"
                  style={{ width: `${Math.round(goal.progress * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>
    </aside>
  );
}
