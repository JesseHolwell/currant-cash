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
import type { AccountEntry, AccountHistorySnapshot } from "../../../models";

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
  onResetMonthlyDelta
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
              <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#445563" tick={{ fill: "#7a95a5" }} />
              <YAxis
                stroke="#445563"
                tick={{ fill: "#7a95a5" }}
                width={96}
                tickFormatter={(value) => formatCurrency(Number(value), currency)}
              />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} contentStyle={{ background: "#0f141b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e4edf3" }} />
              <Legend />
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
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
              <CartesianGrid stroke="rgba(255,255,255,0.07)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#445563" tick={{ fill: "#7a95a5" }} />
              <YAxis
                stroke="#445563"
                tick={{ fill: "#7a95a5" }}
                width={96}
                tickFormatter={(value) => formatCurrency(Number(value), currency)}
              />
              <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} contentStyle={{ background: "#0f141b", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", color: "#e4edf3" }} />
              {maxGoalTarget > 0 ? (
                <Line type="monotone" dataKey="goal" stroke="#d9a15d" strokeDasharray="6 5" dot={false} name="Goal" />
              ) : null}
              <Line type="monotone" dataKey="netWorth" stroke="#b63b5d" strokeWidth={3} dot={{ r: 3, fill: "#b63b5d" }} name="Net Worth" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}
