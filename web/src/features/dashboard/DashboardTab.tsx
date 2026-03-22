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

function GoalCrossoverBadge({ viewBox, label }: { viewBox?: { x: number; y: number; height: number }; label: string }) {
  if (!viewBox) return null;
  const { x } = viewBox;
  const text = `🎯 ${label}`;
  const badgeW = text.length * 7 + 12;
  const badgeH = 22;
  const badgeX = x - badgeW / 2;
  const badgeY = 10;
  return (
    <g>
      <rect x={badgeX} y={badgeY} width={badgeW} height={badgeH} rx={5} fill="#C4843E" opacity={0.95} />
      <text x={x} y={badgeY + 14.5} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="600" fontFamily="inherit">
        {text}
      </text>
    </g>
  );
}

function SavingsRateCard({
  savingsRate,
  monthlySavings,
  currency,
}: {
  savingsRate: number | null;
  monthlySavings: number;
  currency: string;
}) {
  const r = 50, cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const arcLength = circumference * 0.75;
  const rate = savingsRate ?? 0;
  const progressLength = arcLength * Math.min(1, Math.max(0, rate / 100));

  const statusLabel =
    savingsRate === null ? null
    : savingsRate >= 20 ? "OPTIMAL"
    : savingsRate >= 10 ? "GOOD"
    : "LOW";

  return (
    <div className="fire-insight-card">
      <div className="fire-insight-card-icon fire-insight-card-icon--savings">🐷</div>
      <h3 className="fire-insight-card-title">Savings Rate</h3>
      <p className="fire-insight-card-subtitle">Percentage of income retained</p>
      <div className="fire-savings-gauge-wrap">
        <svg viewBox="0 0 120 120" className="fire-savings-gauge">
          <circle
            r={r} cx={cx} cy={cy}
            fill="none"
            stroke="var(--line)"
            strokeWidth={8}
            strokeDasharray={`${arcLength.toFixed(1)} ${(circumference - arcLength).toFixed(1)}`}
            strokeLinecap="round"
            transform={`rotate(135, ${cx}, ${cy})`}
          />
          {savingsRate !== null && (
            <circle
              r={r} cx={cx} cy={cy}
              fill="none"
              stroke="#3D8B4F"
              strokeWidth={8}
              strokeDasharray={`${progressLength.toFixed(1)} ${(circumference - progressLength).toFixed(1)}`}
              strokeLinecap="round"
              transform={`rotate(135, ${cx}, ${cy})`}
            />
          )}
        </svg>
        <div className="fire-savings-gauge-center">
          <span className="fire-savings-gauge-pct">
            {savingsRate !== null ? `${Math.round(rate)}%` : "—"}
          </span>
          {statusLabel && (
            <span className="fire-savings-gauge-status">{statusLabel}</span>
          )}
        </div>
      </div>
      <p className="fire-insight-card-note">
        {savingsRate !== null
          ? `${formatCurrency(Math.round(Math.abs(monthlySavings)), currency)}/month in savings`
          : "Configure Income tab to calculate"}
      </p>
    </div>
  );
}

function FireTimelineCard({
  currentAge,
  projectedFireAge,
  onAdjustClick,
}: {
  currentAge: number;
  projectedFireAge: number | null;
  onAdjustClick: () => void;
}) {
  const targetAge = projectedFireAge !== null ? Math.ceil(projectedFireAge) : null;
  const progress = targetAge !== null ? Math.min(1, currentAge / targetAge) : 0;

  return (
    <div className="fire-insight-card">
      <div className="fire-insight-card-icon fire-insight-card-icon--fire">🔥</div>
      <h3 className="fire-insight-card-title">FIRE Timeline</h3>
      <p className="fire-insight-card-subtitle">Estimated retirement age</p>
      {targetAge !== null ? (
        <>
          <div className="fire-timeline-age">
            <span className="fire-timeline-age-num">{targetAge}</span>
            <span className="fire-timeline-age-unit"> Years Old</span>
          </div>
          <div className="fire-timeline-track">
            <div
              className="fire-timeline-fill"
              style={{ width: `${Math.round(progress * 100)}%` }}
            />
          </div>
          <div className="fire-timeline-labels">
            <span>Current: {currentAge}</span>
            <span>Target: {targetAge}</span>
          </div>
        </>
      ) : (
        <p className="fire-insight-card-note">
          Add transaction data to see your timeline
        </p>
      )}
      <button
        type="button"
        className="fire-timeline-adjust-btn"
        onClick={onAdjustClick}
      >
        Adjust Simulations
      </button>
    </div>
  );
}

function FireInsightBanner({
  projectedFireAge,
  yearsToFire,
}: {
  projectedFireAge: number | null;
  yearsToFire: number | null;
}) {
  if (projectedFireAge === null || yearsToFire === null || yearsToFire <= 0) {
    return null;
  }
  const yrs = Math.ceil(yearsToFire);
  return (
    <div className="fire-insight-banner">
      <div className="fire-insight-banner-icon">🔥</div>
      <div className="fire-insight-banner-body">
        <h3 className="fire-insight-banner-title">
          At this rate, you could retire at {Math.ceil(projectedFireAge)}.
        </h3>
        <p className="fire-insight-banner-desc">
          That's {yrs} {yrs === 1 ? "year" : "years"} from now, based on your current saving patterns.
        </p>
      </div>
    </div>
  );
}

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

export function DashboardTab({
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
  savingsRate,
  monthlySavings,
  projectedFireAge,
  yearsToFire,
  currentAge,
  onGoToFire,
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
  savingsRate: number | null;
  monthlySavings: number;
  projectedFireAge: number | null;
  yearsToFire: number | null;
  currentAge: number;
  onGoToFire: () => void;
}) {
  return (
    <>
      <div className="fire-insight-cards">
        <SavingsRateCard
          savingsRate={savingsRate}
          monthlySavings={monthlySavings}
          currency={currency}
        />
        <FireTimelineCard
          currentAge={currentAge}
          projectedFireAge={projectedFireAge}
          onAdjustClick={onGoToFire}
        />
      </div>
      <FireInsightBanner
        projectedFireAge={projectedFireAge}
        yearsToFire={yearsToFire}
      />

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
              margin={{ top: 44, right: 24, bottom: 8, left: 4 }}
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
              {(() => {
                if (maxGoalTarget <= 0) return null;
                const crossover = forecastPoints.find((p, i) =>
                  p.goal > 0 &&
                  p.netWorth >= p.goal &&
                  (i === 0 || forecastPoints[i - 1].netWorth < forecastPoints[i - 1].goal)
                );
                if (!crossover) return null;
                return (
                  <ReferenceLine
                    x={crossover.label}
                    stroke="#C4843E"
                    strokeDasharray="4 3"
                    strokeWidth={1.5}
                    label={(props) => <GoalCrossoverBadge {...props} label={crossover.label} />}
                  />
                );
              })()}
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
