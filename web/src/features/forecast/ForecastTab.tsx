import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../../domain";

const ALLOCATION_COLORS = [
  "#C4856A", "#7BA3A8", "#8B7BAD", "#A8B87B", "#AD7B8B",
  "#7BA88B", "#B8A87B", "#7B8BAD", "#A87B7B", "#7BADB8",
];

type ExpensePieDatum = {
  name: string;
  value: number;
  color: string;
};

type AccountEntry = {
  id: string;
  name: string;
  value: number;
  kind: "asset" | "liability";
};

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
  isMonthlyDeltaOverridden,
  inferredMonthCount,
  forecastPoints,
  maxGoalTarget,
  accountHistorySeries,
  accountHistoryChartData,
  expensePieData,
  accountEntries,
}: {
  currency: string;
  accountSummary: AccountSummary;
  startNetWorth: number;
  monthlyForecastDelta: number;
  isMonthlyDeltaOverridden: boolean;
  inferredMonthCount: number;
  forecastPoints: ForecastPoint[];
  maxGoalTarget: number;
  accountHistorySeries: AccountHistorySeries[];
  accountHistoryChartData: AccountHistoryChartRow[];
  expensePieData: ExpensePieDatum[];
  accountEntries: AccountEntry[];
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
        <h3>Account Trend</h3>
        <p className="mode-note">Stacked area view by account over time.</p>
        <div className="line-chart-wrap account-area-wrap">
          <ResponsiveContainer width="100%" height={360}>
            <AreaChart
              data={accountHistoryChartData}
              margin={{ top: 12, right: 24, bottom: 8, left: 4 }}
            >
              <CartesianGrid
                stroke="rgba(61,36,56,0.08)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                stroke="rgba(61,36,56,0.25)"
                tick={{ fill: "#9E7088" }}
              />
              <YAxis
                stroke="rgba(61,36,56,0.25)"
                tick={{ fill: "#9E7088" }}
                width={96}
                tickFormatter={(value) =>
                  formatCurrency(Number(value), currency)
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  formatCurrency(Number(value), currency)
                }
                contentStyle={{
                  background: "#3D2438",
                  border: "1px solid rgba(61,36,56,0.2)",
                  borderRadius: "6px",
                  color: "#F7F3E8",
                }}
              />
              <Legend />
              <ReferenceLine
                y={0}
                stroke="rgba(61,36,56,0.15)"
                strokeDasharray="4 4"
              />
              {accountHistorySeries.map((series) => (
                <Area
                  key={series.accountId}
                  type="monotone"
                  dataKey={series.dataKey}
                  name={series.label}
                  stackId="balances"
                  stroke={series.color}
                  fill={series.color}
                  fillOpacity={0.18}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="panel">
        <h3>Forecast</h3>
        <div className="line-chart-wrap">
          <ResponsiveContainer width="100%" height={360}>
            <LineChart
              data={forecastPoints}
              margin={{ top: 12, right: 24, bottom: 8, left: 4 }}
            >
              <CartesianGrid
                stroke="rgba(61,36,56,0.08)"
                strokeDasharray="3 3"
              />
              <XAxis
                dataKey="label"
                stroke="rgba(61,36,56,0.25)"
                tick={{ fill: "#9E7088" }}
              />
              <YAxis
                stroke="rgba(61,36,56,0.25)"
                tick={{ fill: "#9E7088" }}
                width={96}
                tickFormatter={(value) =>
                  formatCurrency(Number(value), currency)
                }
              />
              <Tooltip
                formatter={(value: number) =>
                  formatCurrency(Number(value), currency)
                }
                contentStyle={{
                  background: "#3D2438",
                  border: "1px solid rgba(61,36,56,0.2)",
                  borderRadius: "6px",
                  color: "#F7F3E8",
                }}
              />
              {maxGoalTarget > 0 ? (
                <Line
                  type="monotone"
                  dataKey="goal"
                  stroke="#C4843E"
                  strokeDasharray="6 5"
                  dot={false}
                  name="Goal"
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="netWorth"
                stroke="#8B2942"
                strokeWidth={3}
                dot={{ r: 3, fill: "#8B2942" }}
                name="Net Worth"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {(expensePieData.length > 0 || accountEntries.length > 0) ? (
        <section className="panel pie-row-panel">
          {accountEntries.length > 0 ? (
            <div className="pie-chart-block">
              <h3>Asset Allocation</h3>
              <div className="pie-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={accountEntries.map((a) => ({ name: a.name || "Untitled", value: Math.abs(a.value), kind: a.kind }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={114}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {accountEntries.map((account, index) => (
                        <Cell
                          key={account.id}
                          fill={ALLOCATION_COLORS[index % ALLOCATION_COLORS.length]}
                          opacity={account.kind === "liability" ? 0.5 : 1}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(Number(value), currency)}
                      contentStyle={{
                        background: "#3D2438",
                        border: "1px solid rgba(61,36,56,0.2)",
                        borderRadius: "6px",
                        color: "#F7F3E8",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
          {expensePieData.length > 0 ? (
            <div className="pie-chart-block">
              <h3>Expense Breakdown</h3>
              <div className="pie-wrap">
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={114}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {expensePieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => formatCurrency(Number(value), currency)}
                      contentStyle={{
                        background: "#3D2438",
                        border: "1px solid rgba(61,36,56,0.2)",
                        borderRadius: "6px",
                        color: "#F7F3E8",
                      }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
