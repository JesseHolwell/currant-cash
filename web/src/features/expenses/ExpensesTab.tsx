import { useEffect, useMemo, useRef, useState } from "react";
import './ExpensesTab.css';
import { Bar, BarChart, ResponsiveContainer, Sankey, Tooltip, XAxis, YAxis } from "recharts";
import { SUMMARY_TOP_MERCHANTS_PER_GROUP, formatCurrency, formatTimelineLabel } from "../../domain";
import type {
  BuildVizResult,
  FlowStartMode,
  IncomeBasisMode,
  MerchantDetailMode,
  TimelinePeriod
} from "../../domain";
import { FlowTooltip, LinkShape, NodeShape } from "../../sankeyShapes";

const SPEND_PALETTE = [
  "#5C1A2A",
  "#8B2942",
  "#A63355",
  "#C04168",
  "#D06080",
  "#DC8095",
  "#E8A5B5",
  "#F0C4CF",
  "#F7DDE4",
  "#FAE8ED",
];

type MonthlyCategoryConfig = {
  category: string;
  color: string;
};

type MonthlyExpenseData = {
  rows: Array<{ month: string; label: string; [key: string]: string | number }>;
  categories: MonthlyCategoryConfig[];
};

export function ExpensesTab({
  currency,
  flowStartMode,
  onFlowStartModeChange,
  incomeBasisMode,
  onIncomeBasisModeChange,
  incomeModelEnabled,
  merchantDetailMode,
  onMerchantDetailModeChange,
  timelinePeriod,
  onTimelinePeriodChange,
  timelineOptions,
  viz,
  uncategorizedCount,
  flowTitle,
  chartHeight,
  chartLeftMargin,
  chartRightMargin,
  nodePadding,
  monthlyExpenseData
}: {
  currency: string;
  flowStartMode: FlowStartMode;
  onFlowStartModeChange: (mode: FlowStartMode) => void;
  incomeBasisMode: IncomeBasisMode;
  onIncomeBasisModeChange: (mode: IncomeBasisMode) => void;
  incomeModelEnabled: boolean;
  merchantDetailMode: MerchantDetailMode;
  onMerchantDetailModeChange: (mode: MerchantDetailMode) => void;
  timelinePeriod: TimelinePeriod;
  onTimelinePeriodChange: (period: TimelinePeriod) => void;
  timelineOptions: TimelinePeriod[];
  viz: BuildVizResult;
  uncategorizedCount: number;
  flowTitle: string;
  chartHeight: number;
  chartLeftMargin: number;
  chartRightMargin: number;
  nodePadding: number;
  monthlyExpenseData: MonthlyExpenseData;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [stageWidth, setStageWidth] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const incomeMode = flowStartMode === "expenses" ? "expenses" : incomeBasisMode;
  const isIncomeFlow = flowStartMode === "income";
  const controlsDescription = isIncomeFlow
    ? incomeBasisMode === "modeled"
      ? "Modeled salary adds estimated gross pay, tax, and super on top of recorded deposits."
      : "Raw deposits uses recorded credit transactions only, without modeled salary, tax, or super."
    : "Expenses only removes income entirely and starts the flow from debit categorization.";
  const breakdownDescription = merchantDetailMode === "summary"
    ? `Summary groups merchants to the top ${SUMMARY_TOP_MERCHANTS_PER_GROUP} per subcategory.`
    : "Detailed shows each transaction as its own terminal node.";

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    const previousOverflow = document.body.style.overflow;
    if (isExpanded) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setStageWidth(entry.contentRect.width);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const momChange = useMemo(() => {
    if (monthlyExpenseData.rows.length < 2) return null;
    const sumRow = (row: { [key: string]: string | number }) =>
      monthlyExpenseData.categories.reduce((sum, cat) => {
        const val = row[cat.category];
        return sum + (typeof val === "number" ? val : 0);
      }, 0);
    const prev = sumRow(monthlyExpenseData.rows[monthlyExpenseData.rows.length - 2]);
    const curr = sumRow(monthlyExpenseData.rows[monthlyExpenseData.rows.length - 1]);
    if (prev === 0) return null;
    const pct = ((curr - prev) / prev) * 100;
    return { pct: Math.abs(Number(pct.toFixed(1))), up: pct >= 0 };
  }, [monthlyExpenseData]);

  const effectiveLeftMargin = stageWidth > 0 ? Math.max(180, Math.round(stageWidth * 0.20)) : chartLeftMargin;
  const effectiveRightMargin = stageWidth > 0 ? Math.max(220, Math.round(stageWidth * 0.27)) : chartRightMargin;
  const effectiveChartHeight: number | string = isExpanded ? "calc(100vh - 180px)" : chartHeight;

  return (
    <>
      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0 grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 items-start">
        <div className="flex flex-wrap gap-[0.7rem]">
          <div className="grid gap-[0.34rem]">
            <p className="m-0 text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">Start From</p>
            <div className="inline-flex items-center gap-[0.3rem]">
              <button
                type="button"
                className={isIncomeFlow ? "mode-btn active" : "mode-btn"}
                onClick={() => onFlowStartModeChange("income")}
              >
                Income
              </button>
              <button
                type="button"
                className={!isIncomeFlow ? "mode-btn active" : "mode-btn"}
                onClick={() => onFlowStartModeChange("expenses")}
              >
                Expenses Only
              </button>
            </div>
          </div>

          {isIncomeFlow ? (
            <div className="grid gap-[0.34rem]">
              <p className="m-0 text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">Income Basis</p>
              <div className="inline-flex items-center gap-[0.3rem]">
                <button
                  type="button"
                  className={incomeBasisMode === "modeled" ? "mode-btn active" : "mode-btn"}
                  disabled={!incomeModelEnabled}
                  onClick={() => onIncomeBasisModeChange("modeled")}
                >
                  Modeled Salary
                </button>
                <button
                  type="button"
                  className={incomeBasisMode === "raw" ? "mode-btn active" : "mode-btn"}
                  onClick={() => onIncomeBasisModeChange("raw")}
                >
                  Raw Deposits
                </button>
              </div>
            </div>
          ) : null}

          <div className="grid gap-[0.34rem]">
            <p className="m-0 text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">Breakdown</p>
            <div className="inline-flex items-center gap-[0.3rem]">
              <button
                type="button"
                className={merchantDetailMode === "summary" ? "mode-btn active" : "mode-btn"}
                onClick={() => onMerchantDetailModeChange("summary")}
              >
                Summary
              </button>
              <button
                type="button"
                className={merchantDetailMode === "full" ? "mode-btn active" : "mode-btn"}
                onClick={() => onMerchantDetailModeChange("full")}
              >
                Detailed
              </button>
            </div>
          </div>
        </div>
        <div className="inline-flex items-center gap-2">
          <label htmlFor="timeline-period" className="text-[0.72rem] uppercase tracking-[0.1em] text-muted font-bold">Timeline</label>
          <select
            id="timeline-period"
            value={timelinePeriod}
            className="border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            onChange={(event) => onTimelinePeriodChange(event.target.value as TimelinePeriod)}
          >
            {timelineOptions.map((option) => (
              <option key={option} value={option}>
                {formatTimelineLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <p className="col-span-full m-0 text-muted text-[0.78rem]">
          {controlsDescription} {breakdownDescription}
        </p>
      </section>

      <section className="grid grid-cols-4 gap-[0.65rem]">
        {incomeMode === "expenses" ? (
          <>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Total Spend</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(viz.totalSpend, currency)}</p>
              {momChange && (
                <span className={`stat-trend ${momChange.up ? "stat-trend--up" : "stat-trend--down"}`}>
                  {momChange.up ? "↑" : "↓"} {momChange.pct}% from last month
                </span>
              )}
            </article>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Categories</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{viz.categoryStats.length}</p>
            </article>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Subcategories</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{viz.subcategoryCount}</p>
            </article>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Transactions</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{viz.spendCount}</p>
            </article>
          </>
        ) : (
          <>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">{incomeMode === "modeled" ? "Income (Gross)" : "Income"}</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(viz.totalIncome, currency)}</p>
            </article>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Total Spend</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(viz.totalSpend, currency)}</p>
              {momChange && (
                <span className={`stat-trend ${momChange.up ? "stat-trend--up" : "stat-trend--down"}`}>
                  {momChange.up ? "↑" : "↓"} {momChange.pct}% from last month
                </span>
              )}
            </article>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Savings</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(viz.savings, currency)}</p>
            </article>
            <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
              <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Uncategorized</h2>
              <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{uncategorizedCount}</p>
            </article>
          </>
        )}
      </section>

      <section className="grid">
        <div className="border border-line rounded-md p-[0.95rem] bg-surface shadow-soft min-w-0">
          <div className="flex justify-between gap-3 mb-[0.8rem]">
            <div>
              <h3 className="font-display text-base tracking-[-0.02em] text-ink">{flowTitle}</h3>
              {merchantDetailMode === "summary" ? (
                <p className="text-muted text-[0.82rem] mt-[0.42rem]">
                  Summary view: top {SUMMARY_TOP_MERCHANTS_PER_GROUP} merchants per subcategory, rest grouped as Other.
                </p>
              ) : (
                <p className="text-muted text-[0.82rem] mt-[0.42rem]">Detailed view: per-transaction nodes ({viz.merchantNodeCount}).</p>
              )}
            </div>
            <button type="button" className="mode-btn flex-shrink-0" onClick={() => setIsExpanded(true)}>
              Expand Chart
            </button>
          </div>

          {viz.spendCount === 0 && viz.totalIncome === 0 ? (
            <div className="py-12 px-6 text-center text-muted">
              <p>No transaction data to display. Upload a CSV on the Transaction Data tab to get started.</p>
            </div>
          ) : (
            <>
              {isExpanded ? (
                <button
                  type="button"
                  aria-label="Close expanded chart"
                  className="sankey-backdrop"
                  onClick={() => setIsExpanded(false)}
                />
              ) : null}

              <div ref={stageRef} className={isExpanded ? "sankey-stage is-expanded" : "sankey-stage"}>
                {isExpanded ? (
                  <div className="sankey-stage-toolbar">
                    <button type="button" className="mode-btn" onClick={() => setIsExpanded(false)}>
                      Close Expanded View
                    </button>
                  </div>
                ) : null}
                <div className="chart" style={{ height: effectiveChartHeight }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <Sankey
                      data={viz.sankey}
                      nodePadding={nodePadding}
                      nodeWidth={14}
                      linkCurvature={0.3}
                      iterations={64}
                      sort={false}
                      margin={{ top: 42, right: effectiveRightMargin, bottom: 28, left: effectiveLeftMargin }}
                      node={NodeShape}
                      link={LinkShape}
                    >
                      <Tooltip content={<FlowTooltip currency={currency} />} />
                    </Sankey>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}
        </div>

      </section>

      {monthlyExpenseData.rows.length > 1 ? (
        <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Month-over-Month Spend</h3>
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">Stacked spend by category across all months.</p>
          <div className="mt-[0.8rem] h-[320px]">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyExpenseData.rows} margin={{ top: 12, right: 16, bottom: 8, left: 4 }} barCategoryGap="28%">
                <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#9E7088", fontSize: 12 }} />
                <YAxis hide />
                <Tooltip
                  formatter={(value: number, name: string) => [formatCurrency(Number(value), currency), name]}
                  contentStyle={{ background: "#3D2438", border: "none", borderRadius: "8px", color: "#F7F3E8", fontSize: "13px" }}
                  cursor={{ fill: "rgba(139,41,66,0.06)" }}
                />
                {monthlyExpenseData.categories.map((cat, index) => (
                  <Bar
                    key={cat.category}
                    dataKey={cat.category}
                    stackId="spend"
                    fill={SPEND_PALETTE[index % SPEND_PALETTE.length]}
                    name={cat.category}
                    radius={index === monthlyExpenseData.categories.length - 1 ? [4, 4, 0, 0] : undefined}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </>
  );
}
