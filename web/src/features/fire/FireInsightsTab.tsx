import '../dashboard/DashboardTab.css';
import './FireInsightsTab.css';
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
    <div className={`border border-line rounded-md p-4 bg-surface${achieved ? " border-accent-leaf/40 bg-[var(--accent-leaf)]/5" : ""}`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="font-semibold text-ink text-[0.92rem]">{label}</span>
        {achieved ? <span className="text-[0.72rem] font-bold text-accent-leaf bg-[var(--accent-leaf)]/10 px-2 py-[0.2rem] rounded-full">Achieved</span> : null}
      </div>
      <p className="text-ink-soft text-[0.82rem] mb-2">{description}</p>
      <div className="flex items-center justify-between text-[0.82rem] text-ink-soft mb-2">
        <span>
          {formatCurrency(Math.round(current), currency)} /{" "}
          {formatCurrency(Math.round(target), currency)}
        </span>
        {!achieved ? (
          <span className="text-muted">
            {formatCurrency(Math.round(remaining), currency)} to go
          </span>
        ) : null}
      </div>
      <div className="h-2 rounded-full bg-[var(--accent-ring)] overflow-hidden">
        <div
          className="fire-milestone-fill"
          style={{ width: `${Math.round(progress * 100)}%` }}
        />
      </div>
      <span className="text-[0.72rem] text-muted mt-1 inline-block">{Math.round(progress * 100)}%</span>
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
  const inputCls = "border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)] w-full";

  return (
    <>
      <section className="grid grid-cols-4 gap-[0.65rem]">
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">FIRE Number</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">
            {hasExpenseData
              ? formatCurrency(Math.round(fireNumber), currency)
              : "—"}
          </p>
          <span className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">{fireMultiplier}× annual expenses</span>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Years to FIRE</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">
            {!hasExpenseData
              ? "—"
              : yearsToFire === null
              ? "∞"
              : yearsToFire === 0
              ? "Achieved"
              : `${Math.ceil(yearsToFire)} yrs`}
          </p>
          {projectedFireAge !== null && yearsToFire !== null && yearsToFire > 0 ? (
            <span className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">Age {Math.ceil(projectedFireAge)}</span>
          ) : null}
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Monthly Savings</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(Math.round(monthlySavings), currency)}</p>
          <span className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">From transaction history</span>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Savings Rate</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{savingsRate !== null ? `${Math.round(savingsRate)}%` : "—"}</p>
          <span className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">
            {savingsRate !== null ? "of gross income" : "Configure income tab"}
          </span>
        </article>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <h3 className="font-display text-base tracking-[-0.02em] text-ink">FIRE Configuration</h3>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">Adjust inputs to model your retirement timeline.</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-[0.85rem] mt-4">
          <label className="grid gap-[0.35rem]">
            <span className="text-[0.84rem] text-ink font-semibold">Current Age</span>
            <input
              type="number"
              min={16}
              max={99}
              value={currentAge}
              className={inputCls}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 16 && v <= 99) onCurrentAgeChange(v);
              }}
            />
          </label>
          <label className="grid gap-[0.35rem]">
            <span className="text-[0.84rem] text-ink font-semibold">Expected Annual Return (%)</span>
            <input
              type="number"
              min={0}
              max={30}
              step={0.5}
              value={annualReturn}
              className={inputCls}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 0 && v <= 30) onAnnualReturnChange(v);
              }}
            />
          </label>
          <label className="grid gap-[0.35rem]">
            <span className="text-[0.84rem] text-ink font-semibold">FIRE Multiplier (×)</span>
            <input
              type="number"
              min={10}
              max={50}
              step={1}
              value={fireMultiplier}
              className={inputCls}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= 10 && v <= 50) onFireMultiplierChange(v);
              }}
            />
            <span className="text-muted text-[0.75rem]">
              ≈ {(100 / fireMultiplier).toFixed(1)}% safe withdrawal rate
            </span>
          </label>
          <div className="grid gap-[0.35rem]">
            <span className="text-[0.84rem] text-ink font-semibold">Annual Expenses</span>
            <strong className="text-ink font-mono text-lg">
              {hasExpenseData
                ? formatCurrency(Math.round(monthlyExpenses * 12), currency)
                : "No data"}
            </strong>
            <span className="text-muted text-[0.75rem]">From transaction history</span>
          </div>
        </div>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <h3 className="font-display text-base tracking-[-0.02em] text-ink">Net Worth Projection</h3>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Projected growth with FIRE milestones at {annualReturn}% annual return.
        </p>
        {!hasExpenseData ? (
          <p className="text-muted text-[0.82rem] mt-4">
            Upload transaction data to see your FIRE projection.
          </p>
        ) : (
          <div className="mt-3 h-[360px] border border-line rounded-md bg-surface py-[0.4rem] px-[0.2rem]">
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

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <h3 className="font-display text-base tracking-[-0.02em] text-ink">FIRE Milestones</h3>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">Track your progress toward each milestone.</p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[0.85rem] mt-4">
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
