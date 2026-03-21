import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrency } from "../../domain";

type ProjectionPoint = {
  age: number;
  label: string;
  netWorth: number;
};

function FireMilestone({
  label,
  description,
  target,
  current,
  currency,
}: {
  label: string;
  description: string;
  target: number;
  current: number;
  currency: string;
}) {
  const progress = target > 0 ? Math.min(1, current / target) : 0;
  const achieved = current >= target;
  const remaining = Math.max(0, target - current);

  return (
    <div className={`fire-milestone${achieved ? " fire-milestone--achieved" : ""}`}>
      <div className="fire-milestone-header">
        <span className="fire-milestone-label">{label}</span>
        {achieved ? <span className="fire-milestone-badge">Achieved</span> : null}
      </div>
      <p className="fire-milestone-desc">{description}</p>
      <div className="fire-milestone-amounts">
        <span>
          {formatCurrency(Math.round(current), currency)} /{" "}
          {formatCurrency(Math.round(target), currency)}
        </span>
        {!achieved ? (
          <span className="fire-milestone-remaining">
            {formatCurrency(Math.round(remaining), currency)} to go
          </span>
        ) : null}
      </div>
      <div className="fire-milestone-track">
        <div
          className="fire-milestone-fill"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <span className="fire-milestone-pct">{Math.round(progress * 100)}%</span>
    </div>
  );
}

export function FireInsightsTab({
  currency,
  currentNetWorth,
  monthlyExpenses,
  monthlySavings,
  currentAge,
  annualReturn,
  fireMultiplier,
  onCurrentAgeChange,
  onAnnualReturnChange,
  onFireMultiplierChange,
  fireNumber,
  leanFireNumber,
  coastFireNumber,
  yearsToFire,
  projectedFireAge,
  savingsRate,
  projectionData,
}: {
  currency: string;
  currentNetWorth: number;
  monthlyExpenses: number;
  monthlySavings: number;
  currentAge: number;
  annualReturn: number;
  fireMultiplier: number;
  onCurrentAgeChange: (v: number) => void;
  onAnnualReturnChange: (v: number) => void;
  onFireMultiplierChange: (v: number) => void;
  fireNumber: number;
  leanFireNumber: number;
  coastFireNumber: number;
  yearsToFire: number | null;
  projectedFireAge: number | null;
  savingsRate: number | null;
  projectionData: ProjectionPoint[];
}) {
  const hasExpenseData = monthlyExpenses > 0;

  return (
    <>
      <section className="stats">
        <article>
          <h2>FIRE Number</h2>
          <p>
            {hasExpenseData
              ? formatCurrency(Math.round(fireNumber), currency)
              : "—"}
          </p>
          <span className="stat-source">{fireMultiplier}× annual expenses</span>
        </article>
        <article>
          <h2>Years to FIRE</h2>
          <p>
            {!hasExpenseData
              ? "—"
              : yearsToFire === null
              ? "∞"
              : yearsToFire === 0
              ? "Achieved"
              : `${Math.ceil(yearsToFire)} yrs`}
          </p>
          {projectedFireAge !== null && yearsToFire !== null && yearsToFire > 0 ? (
            <span className="stat-source">Age {Math.ceil(projectedFireAge)}</span>
          ) : null}
        </article>
        <article>
          <h2>Monthly Savings</h2>
          <p>{formatCurrency(Math.round(monthlySavings), currency)}</p>
          <span className="stat-source">From transaction history</span>
        </article>
        <article>
          <h2>Savings Rate</h2>
          <p>{savingsRate !== null ? `${Math.round(savingsRate)}%` : "—"}</p>
          <span className="stat-source">
            {savingsRate !== null ? "of gross income" : "Configure income tab"}
          </span>
        </article>
      </section>

      <section className="panel">
        <h3>FIRE Configuration</h3>
        <p className="mode-note">Adjust inputs to model your retirement timeline.</p>
        <div className="fire-config-grid">
          <label className="fire-config-field">
            <span>Current Age</span>
            <input
              type="number"
              min={16}
              max={99}
              value={currentAge}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 16 && v <= 99) onCurrentAgeChange(v);
              }}
            />
          </label>
          <label className="fire-config-field">
            <span>Expected Annual Return (%)</span>
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={annualReturn}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 30) onAnnualReturnChange(v);
              }}
            />
          </label>
          <label className="fire-config-field">
            <span>FIRE Multiplier (×)</span>
            <input
              type="number"
              min={10}
              max={50}
              step={1}
              value={fireMultiplier}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 10 && v <= 50) onFireMultiplierChange(v);
              }}
            />
            <span className="fire-config-hint">
              ≈ {(100 / fireMultiplier).toFixed(1)}% safe withdrawal rate
            </span>
          </label>
          <div className="fire-config-field fire-config-info">
            <span>Annual Expenses</span>
            <strong>
              {hasExpenseData
                ? formatCurrency(Math.round(monthlyExpenses * 12), currency)
                : "No data"}
            </strong>
            <span className="fire-config-hint">From transaction history</span>
          </div>
        </div>
      </section>

      <section className="panel">
        <h3>Net Worth Projection</h3>
        <p className="mode-note">
          Projected growth with FIRE milestones at {annualReturn}% annual return.
        </p>
        {!hasExpenseData ? (
          <p className="mode-note" style={{ marginTop: "1rem" }}>
            Upload transaction data to see your FIRE projection.
          </p>
        ) : (
          <div className="line-chart-wrap">
            <ResponsiveContainer width="100%" height={380}>
              <LineChart
                data={projectionData}
                margin={{ top: 16, right: 24, bottom: 8, left: 4 }}
              >
                <CartesianGrid stroke="rgba(61,36,56,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  stroke="rgba(61,36,56,0.25)"
                  tick={{ fill: "#9E7088" }}
                  label={{ value: "Age", position: "insideBottomRight", offset: -4, fill: "#9E7088", fontSize: 11 }}
                />
                <YAxis
                  stroke="rgba(61,36,56,0.25)"
                  tick={{ fill: "#9E7088" }}
                  width={96}
                  tickFormatter={(v) => formatCurrency(Number(v), currency)}
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(Number(v), currency), "Net Worth"]}
                  labelFormatter={(label) => `Age ${label}`}
                  contentStyle={{
                    background: "#3D2438",
                    border: "1px solid rgba(61,36,56,0.2)",
                    borderRadius: "6px",
                    color: "#F7F3E8",
                  }}
                />
                {coastFireNumber > 0 && coastFireNumber < fireNumber ? (
                  <ReferenceLine
                    y={coastFireNumber}
                    stroke="#7BA3A8"
                    strokeDasharray="5 4"
                    label={{ value: "Coast FIRE", position: "insideTopLeft", fill: "#7BA3A8", fontSize: 11 }}
                  />
                ) : null}
                <ReferenceLine
                  y={leanFireNumber}
                  stroke="#C4843E"
                  strokeDasharray="5 4"
                  label={{ value: "Lean FIRE", position: "insideTopLeft", fill: "#C4843E", fontSize: 11 }}
                />
                <ReferenceLine
                  y={fireNumber}
                  stroke="#3D7A52"
                  strokeDasharray="5 4"
                  label={{ value: "Full FIRE", position: "insideTopLeft", fill: "#3D7A52", fontSize: 11 }}
                />
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
        )}
      </section>

      <section className="panel">
        <h3>FIRE Milestones</h3>
        <p className="mode-note">Track your progress toward each milestone.</p>
        <div className="fire-milestones">
          <FireMilestone
            label="Coast FIRE"
            description={`Enough invested today to reach Full FIRE by age 65 with no further contributions.`}
            target={coastFireNumber}
            current={currentNetWorth}
            currency={currency}
          />
          <FireMilestone
            label="Lean FIRE"
            description={`${fireMultiplier}× a 40%-reduced annual expense budget.`}
            target={leanFireNumber}
            current={currentNetWorth}
            currency={currency}
          />
          <FireMilestone
            label="Full FIRE"
            description={`${fireMultiplier}× your current annual expenses (${(100 / fireMultiplier).toFixed(1)}% SWR).`}
            target={fireNumber}
            current={currentNetWorth}
            currency={currency}
          />
        </div>
      </section>
    </>
  );
}
