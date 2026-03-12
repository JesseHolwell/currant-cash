import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { formatCurrency } from "../../../models";
import type { GoalEntry } from "../../../models";

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
  goals: GoalEntry[];
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
            const progress = goal.target > 0 ? Math.max(0, Math.min(1, goal.current / goal.target)) : 0;
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
                    Current
                    <input
                      type="number"
                      value={goal.current}
                      onChange={(event) => onUpdateGoal(goal.id, { current: Number(event.target.value) || 0 })}
                    />
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
                <div className="goal-track">
                  <div className="goal-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
                <p className="mode-note">{Math.round(progress * 100)}% complete</p>
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
