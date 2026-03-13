import { useEffect, useState } from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { SUMMARY_TOP_MERCHANTS_PER_GROUP, formatCurrency, formatTimelineLabel } from "../../../models";
import type {
  BuildVizResult,
  FlowStartMode,
  IncomeBasisMode,
  MerchantDetailMode,
  TimelinePeriod
} from "../../../models";
import { FlowTooltip, LinkShape, NodeShape } from "../../../sankeyShapes";

type ExpensePieDatum = {
  name: string;
  value: number;
  color: string;
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
  expensePieData
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
  expensePieData: ExpensePieDatum[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
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

          {isExpanded ? (
            <button
              type="button"
              aria-label="Close expanded chart"
              className="sankey-backdrop"
              onClick={() => setIsExpanded(false)}
            />
          ) : null}

          <div className={isExpanded ? "sankey-stage is-expanded" : "sankey-stage"}>
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
                  margin={{ top: 42, right: chartRightMargin, bottom: 28, left: chartLeftMargin }}
                  node={NodeShape}
                  link={LinkShape}
                >
                  <Tooltip content={<FlowTooltip currency={currency} />} />
                </Sankey>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <aside className="panel pie-panel">
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
                <Tooltip formatter={(value: number) => formatCurrency(Number(value), currency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </aside>
      </section>
    </>
  );
}
