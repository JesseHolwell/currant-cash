import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Sankey, Tooltip, XAxis, YAxis } from "recharts";
import { SUMMARY_TOP_MERCHANTS_PER_GROUP, formatCurrency, formatTimelineLabel } from "../../../models";
import type {
  BuildVizResult,
  FlowStartMode,
  IncomeBasisMode,
  MerchantDetailMode,
  TimelinePeriod
} from "../../../models";
import { FlowTooltip, LinkShape, NodeShape } from "../../../sankeyShapes";

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

  const effectiveLeftMargin = stageWidth > 0 ? Math.max(180, Math.round(stageWidth * 0.20)) : chartLeftMargin;
  const effectiveRightMargin = stageWidth > 0 ? Math.max(220, Math.round(stageWidth * 0.27)) : chartRightMargin;
  const effectiveChartHeight: number | string = isExpanded ? "calc(100vh - 180px)" : chartHeight;

  return (
    <>
      <section className="panel controls-panel expenses-controls">
        <div className="control-groups">
          <div className="control-block">
            <p className="control-label">Start From</p>
            <div className="mode-toggle">
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
            <div className="control-block">
              <p className="control-label">Income Basis</p>
              <div className="mode-toggle">
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

          <div className="control-block">
            <p className="control-label">Breakdown</p>
            <div className="mode-toggle">
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
        <div className="timeline-control">
          <label htmlFor="timeline-period">Timeline</label>
          <select
            id="timeline-period"
            value={timelinePeriod}
            onChange={(event) => onTimelinePeriodChange(event.target.value as TimelinePeriod)}
          >
            {timelineOptions.map((option) => (
              <option key={option} value={option}>
                {formatTimelineLabel(option)}
              </option>
            ))}
          </select>
        </div>
        <p className="controls-helper">
          {controlsDescription} {breakdownDescription}
        </p>
      </section>

      <section className="stats">
        {incomeMode === "expenses" ? (
          <>
            <article>
              <h2>Total Spend</h2>
              <p>{formatCurrency(viz.totalSpend, currency)}</p>
            </article>
            <article>
              <h2>Categories</h2>
              <p>{viz.categoryStats.length}</p>
            </article>
            <article>
              <h2>Subcategories</h2>
              <p>{viz.subcategoryCount}</p>
            </article>
            <article>
              <h2>Transactions</h2>
              <p>{viz.spendCount}</p>
            </article>
          </>
        ) : (
          <>
            <article>
              <h2>{incomeMode === "modeled" ? "Income (Gross)" : "Income"}</h2>
              <p>{formatCurrency(viz.totalIncome, currency)}</p>
            </article>
            <article>
              <h2>Total Spend</h2>
              <p>{formatCurrency(viz.totalSpend, currency)}</p>
            </article>
            <article>
              <h2>Savings</h2>
              <p>{formatCurrency(viz.savings, currency)}</p>
            </article>
            <article>
              <h2>Uncategorized</h2>
              <p>{uncategorizedCount}</p>
            </article>
          </>
        )}
      </section>

      <section className="expenses-layout">
        <div className="canvas-panel">
          <div className="canvas-header">
            <div>
              <h3>{flowTitle}</h3>
              {merchantDetailMode === "summary" ? (
                <p className="mode-note">
                  Summary view: top {SUMMARY_TOP_MERCHANTS_PER_GROUP} merchants per subcategory, rest grouped as Other.
                </p>
              ) : (
                <p className="mode-note">Detailed view: per-transaction nodes ({viz.merchantNodeCount}).</p>
              )}
            </div>
            <button type="button" className="mode-btn" onClick={() => setIsExpanded(true)}>
              Expand Chart
            </button>
          </div>

          {viz.spendCount === 0 && viz.totalIncome === 0 ? (
            <div className="sankey-empty">
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
        <section className="panel">
          <h3>Month-over-Month Spend</h3>
          <p className="mode-note">Stacked spend by category across all months.</p>
          <div className="line-chart-wrap">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={monthlyExpenseData.rows} margin={{ top: 12, right: 24, bottom: 8, left: 4 }}>
                <CartesianGrid stroke="rgba(61,36,56,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="rgba(61,36,56,0.25)" tick={{ fill: "#9E7088" }} />
                <YAxis
                  stroke="rgba(61,36,56,0.25)"
                  tick={{ fill: "#9E7088" }}
                  width={96}
                  tickFormatter={(value) => formatCurrency(Number(value), currency)}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(Number(value), currency)}
                  contentStyle={{ background: "#3D2438", border: "1px solid rgba(61,36,56,0.2)", borderRadius: "6px", color: "#F7F3E8" }}
                />
                <Legend />
                {monthlyExpenseData.categories.map((cat) => (
                  <Bar key={cat.category} dataKey={cat.category} stackId="spend" fill={cat.color} name={cat.category} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      ) : null}
    </>
  );
}
