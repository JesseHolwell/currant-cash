import { formatCurrency } from "../../models";
import type { DashboardTab, ResolvedGoalEntry } from "../../models";

type AccountSummary = {
  netWorth: number;
  byBucket: Array<{ bucket: string; total: number }>;
};

type TabMeta = Record<DashboardTab, { label: string; title: string; subtitle: string }>;

export function Sidebar({
  tabMeta,
  outputTabs,
  inputTabs,
  activeTab,
  onTabChange,
  accountSummary,
  goals,
  currency
}: {
  tabMeta: TabMeta;
  outputTabs: DashboardTab[];
  inputTabs: DashboardTab[];
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  accountSummary: AccountSummary;
  goals: ResolvedGoalEntry[];
  currency: string;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <p className="brand-eyebrow">Personal</p>
        <h1>Spendboard</h1>
      </div>

      <nav className="nav-list">
        <div className="nav-section">
          <p className="nav-section-title">Outputs</p>
          {outputTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "nav-btn active" : "nav-btn"}
              onClick={() => onTabChange(tab)}
            >
              {tabMeta[tab].label}
            </button>
          ))}
        </div>
        <div className="nav-section">
          <p className="nav-section-title">Inputs</p>
          {inputTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              className={activeTab === tab ? "nav-btn active" : "nav-btn"}
              onClick={() => onTabChange(tab)}
            >
              {tabMeta[tab].label}
            </button>
          ))}
        </div>
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
          {goals.slice(0, 4).map((goal) => {
            return (
              <li key={goal.id}>
                <div>
                  <span>{goal.name || "Untitled Goal"}</span>
                  <small>{formatCurrency(goal.currentValue, currency)} / {formatCurrency(goal.target, currency)} · {goal.sourceLabel}</small>
                </div>
                <div className="goal-mini-track">
                  <div className="goal-mini-fill" style={{ width: `${Math.round(goal.progress * 100)}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
