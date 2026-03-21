import type { User } from "@supabase/supabase-js";
import { formatCurrency } from "../../models";
import type { DashboardTab, ResolvedGoalEntry } from "../../models";
import { isSupabaseConfigured } from "../../lib/supabase";

type AccountSummary = {
  netWorth: number;
  byBucket: Array<{ bucket: string; total: number }>;
};

type TabMeta = Record<
  DashboardTab,
  { label: string; title: string; subtitle: string }
>;

export function Sidebar({
  tabMeta,
  outputTabs,
  inputTabs,
  activeTab,
  onTabChange,
  accountSummary,
  goals,
  currency,
  isDark,
  onToggleTheme,
  user,
  onSignOut,
  onSignIn,
  onGoHome,
  onExportData,
}: {
  tabMeta: TabMeta;
  outputTabs: DashboardTab[];
  inputTabs: DashboardTab[];
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  accountSummary: AccountSummary;
  goals: ResolvedGoalEntry[];
  currency: string;
  isDark: boolean;
  onToggleTheme: () => void;
  user: User | null;
  onSignOut: () => void;
  onSignIn: () => void;
  onGoHome: () => void;
  onExportData: () => void;
}) {
  const avatarInitial = user?.email?.charAt(0).toUpperCase() ?? "?";
  const avatarUrl = user?.user_metadata?.["avatar_url"] as string | undefined;
  return (
    <aside className="sidebar">
      <div className="brand">
        <button type="button" className="brand-lockup brand-home-btn" onClick={onGoHome} aria-label="Go to home page">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-leaf" />
            <span className="brand-berry brand-berry-top" />
            <span className="brand-berry brand-berry-left" />
            <span className="brand-berry brand-berry-right" />
          </div>
          <div className="brand-copy">
            <h1>Currant</h1>
            <p className="brand-tagline">Financial Health</p>
          </div>
        </button>
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

      <button type="button" className="theme-toggle" onClick={onToggleTheme}>
        <span className="theme-toggle-icon">{isDark ? "☀" : "☾"}</span>
        {isDark ? "Light mode" : "Dark mode"}
      </button>

      {isSupabaseConfigured ? (
        <div className="sidebar-user">
          {user ? (
            <>
              <div className="sidebar-user-info">
                <div className="sidebar-user-avatar">
                  {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarInitial}
                </div>
                <span className="sidebar-user-email">{user.email}</span>
              </div>
              <div className="sidebar-user-actions">
                <button
                  type="button"
                  className="sidebar-action-btn"
                  onClick={onExportData}
                >
                  Export data
                </button>
                <button
                  type="button"
                  className="sidebar-sign-out-btn"
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <div className="sidebar-sign-in-prompt">
              <span className="sidebar-free-label">Free tier — local only</span>
              <button
                type="button"
                className="sidebar-sign-in-btn"
                onClick={onSignIn}
              >
                Sign in for cloud sync
              </button>
            </div>
          )}
        </div>
      ) : null}

      <section className="sidebar-card">
        <p className="sidebar-label">Goals</p>
        <ul className="goal-mini-list">
          {goals.slice(0, 4).map((goal) => {
            return (
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
            );
          })}
        </ul>
      </section>
    </aside>
  );
}
