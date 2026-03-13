import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrency } from "../../../models";
import type { AccountEntry, AccountHistorySnapshot, GoalEntry, ResolvedGoalEntry } from "../../../models";

type AccountSummary = {
  assets: number;
  liabilities: number;
  netWorth: number;
};

type ForecastPoint = {
  label: string;
  monthKey: string;
  netWorth: number;
  goal: number;
};

type AccountHistorySeries = {
  accountId: string;
  dataKey: string;
  label: string;
  color: string;
};

type AccountHistoryChartRow = {
  month: string;
  label: string;
  [key: string]: string | number;
};

export function ForecastTab({
  currency,
  accountSummary,
  startNetWorth,
  monthlyForecastDelta,
  forecastStartNetWorth,
  forecastMonthlyDelta,
  inferredMonthlyNetFlow,
  forecastPoints,
  maxGoalTarget,
  goals,
  accountEntries,
  accountHistorySnapshots,
  accountHistorySeries,
  accountHistoryChartData,
  onAddAccountHistorySnapshot,
  onUpdateAccountHistoryMonth,
  onUpdateAccountHistoryBalance,
  onRemoveAccountHistorySnapshot,
  onForecastStartNetWorthChange,
  onForecastMonthlyDeltaChange,
  onResetStartNetWorth,
  onResetMonthlyDelta,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal
}: {
  currency: string;
  accountSummary: AccountSummary;
  startNetWorth: number;
  monthlyForecastDelta: number;
  forecastStartNetWorth: number | null;
  forecastMonthlyDelta: number | null;
  inferredMonthlyNetFlow: number;
  forecastPoints: ForecastPoint[];
  maxGoalTarget: number;
  goals: ResolvedGoalEntry[];
  accountEntries: AccountEntry[];
  accountHistorySnapshots: AccountHistorySnapshot[];
  accountHistorySeries: AccountHistorySeries[];
  accountHistoryChartData: AccountHistoryChartRow[];
  onAddAccountHistorySnapshot: () => void;
  onUpdateAccountHistoryMonth: (snapshotId: string, month: string) => void;
  onUpdateAccountHistoryBalance: (snapshotId: string, accountId: string, value: number) => void;
  onRemoveAccountHistorySnapshot: (snapshotId: string) => void;
  onForecastStartNetWorthChange: (value: number | null) => void;
  onForecastMonthlyDeltaChange: (value: number | null) => void;
  onResetStartNetWorth: () => void;
  onResetMonthlyDelta: () => void;
  onAddGoal: () => void;
  onUpdateGoal: (id: string, patch: Partial<Omit<GoalEntry, "id">>) => void;
  onRemoveGoal: (id: string) => void;
}) {
  return (
    <>
      <section className="stats">
        <article>
          <h2>Current Net Worth</h2>
          <p>{formatCurrency(startNetWorth, currency)}</p>
        </article>
        <article>
          <h2>Monthly Delta</h2>
          <p>{formatCurrency(monthlyForecastDelta, currency)}</p>
        </article>
        <article>
          <h2>Assets</h2>
          <p>{formatCurrency(accountSummary.assets, currency)}</p>
        </article>
        <article>
          <h2>Liabilities</h2>
          <p>{formatCurrency(accountSummary.liabilities, currency)}</p>
        </article>
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

      <section className="panel">
        <h3>Account Trend</h3>
        <p className="mode-note">Stacked area view by account over time.</p>
        <div className="line-chart-wrap account-area-wrap">
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart data={accountHistoryChartData} margin={{ top: 12, right: 24, bottom: 8, left: 4 }}>
              <CartesianGrid stroke="#e4dccf" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#8f877a" />
              <YAxis
                stroke="#8f877a"
                width={96}
                tickFormatter={(value) => formatCurrency(Number(value), currency)}
              />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} />
              <Legend />
              <ReferenceLine y={0} stroke="#9ca9aa" strokeDasharray="4 4" />
              {accountHistorySeries.map((series) => (
                <Area
                  key={series.accountId}
                  type="monotone"
                  dataKey={series.dataKey}
                  name={series.label}
                  stackId="balances"
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.24}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel controls-panel">
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

      <section className="panel">
        <h3>Forecast</h3>
        <div className="line-chart-wrap">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={forecastPoints} margin={{ top: 12, right: 24, bottom: 8, left: 4 }}>
              <CartesianGrid stroke="#e4dccf" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#8f877a" />
              <YAxis
                stroke="#8f877a"
                width={96}
                tickFormatter={(value) => formatCurrency(Number(value), currency)}
              />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} />
              {maxGoalTarget > 0 ? (
                <Line type="monotone" dataKey="goal" stroke="#8db58d" strokeDasharray="6 5" dot={false} name="Goal" />
              ) : null}
              <Line type="monotone" dataKey="netWorth" stroke="#b67934" strokeWidth={3} dot={{ r: 3 }} name="Net Worth" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h3>Goals</h3>
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
        <div className="mode-toggle">
          <button type="button" className="mode-btn active" onClick={onAddGoal}>Add Goal</button>
        </div>
      </section>
    </>
  );
}
