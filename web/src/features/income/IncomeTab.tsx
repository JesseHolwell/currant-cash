import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  PAY_FREQUENCY_OPTIONS,
  formatCurrency,
  getPayFrequencyMeta
} from "../../domain";
import type { PayrollDraft, PayrollField, PayrollFieldKind } from "../../domain";

const FIELD_KIND_META: Record<PayrollFieldKind, { label: string; hint: string; addLabel: string; colors: string[] }> = {
  pre_tax_deduction: {
    label: "Tax & Deductions",
    hint: "Reduces your gross pay, but doesn't appear in your bank account (e.g. income tax, HELP, federal tax, 401k pre-tax).",
    addLabel: "Add deduction",
    colors: ["#C4843E", "#A06040", "#B05C40"]
  },
  employer_contribution: {
    label: "Employer Contributions",
    hint: "On top of your gross, goes to an external fund — not your bank account (e.g. superannuation, 401k match).",
    addLabel: "Add contribution",
    colors: ["#5C6FA8", "#4A7A6B", "#5B7A9B"]
  },
  contribution_tax: {
    label: "Contribution Taxes",
    hint: "Tax taken from employer contributions before they reach the fund (e.g. super contributions tax).",
    addLabel: "Add contribution tax",
    colors: ["#9B6BA0", "#8B2942", "#C4638A"]
  }
};

const KIND_ORDER: PayrollFieldKind[] = ["pre_tax_deduction", "employer_contribution", "contribution_tax"];

function generateId(): string {
  return `field_${Math.random().toString(36).slice(2, 9)}`;
}

export function IncomeTab({
  currency,
  payrollDraft,
  matchedPayCount,
  onPayrollDraftChange
}: {
  currency: string;
  payrollDraft: PayrollDraft;
  matchedPayCount: number;
  onPayrollDraftChange: (patch: Partial<PayrollDraft>) => void;
}) {
  const payFrequency = getPayFrequencyMeta(payrollDraft.payFrequency);
  const annualNet = Number((payrollDraft.netPay * payFrequency.periodsPerYear).toFixed(2));
  const annualGross = Number((payrollDraft.grossPay * payFrequency.periodsPerYear).toFixed(2));

  const annualEmployerContributions = payrollDraft.fields
    .filter((f) => f.kind === "employer_contribution")
    .reduce((sum, f) => sum + f.amount * payFrequency.periodsPerYear, 0);
  const annualPreTaxDeductions = payrollDraft.fields
    .filter((f) => f.kind === "pre_tax_deduction")
    .reduce((sum, f) => sum + f.amount * payFrequency.periodsPerYear, 0);

  const annualPackage = Number((annualGross + annualEmployerContributions).toFixed(2));
  const monthlyTakeHome = Number((annualNet / 12).toFixed(2));
  const effectiveTaxRate = annualGross > 0 ? annualPreTaxDeductions / annualGross : 0;

  // Pie chart: take-home + all fields with positive amounts
  const TAKE_HOME_COLOR = "#3D8B4F";
  const breakdownData: Array<{ name: string; value: number; color: string }> = [];
  if (annualNet > 0) {
    breakdownData.push({ name: "Take-home pay", value: annualNet, color: TAKE_HOME_COLOR });
  }
  for (const kind of KIND_ORDER) {
    const meta = FIELD_KIND_META[kind];
    const fields = payrollDraft.fields.filter((f) => f.kind === kind);
    fields.forEach((field, idx) => {
      const annualValue = Number((field.amount * payFrequency.periodsPerYear).toFixed(2));
      if (annualValue > 0) {
        breakdownData.push({
          name: field.label,
          value: annualValue,
          color: meta.colors[idx % meta.colors.length]
        });
      }
    });
  }
  const breakdownTotal = breakdownData.reduce((sum, entry) => sum + entry.value, 0);

  function updateField(id: string, patch: Partial<PayrollField>) {
    onPayrollDraftChange({
      fields: payrollDraft.fields.map((f) => f.id === id ? { ...f, ...patch } : f)
    });
  }

  function removeField(id: string) {
    onPayrollDraftChange({
      fields: payrollDraft.fields.filter((f) => f.id !== id)
    });
  }

  function addField(kind: PayrollFieldKind) {
    const meta = FIELD_KIND_META[kind];
    const newField: PayrollField = {
      id: generateId(),
      label: meta.addLabel.replace("Add ", ""),
      amount: 0,
      kind
    };
    onPayrollDraftChange({ fields: [...payrollDraft.fields, newField] });
  }

  return (
    <>
      <section className="stats">
        <article>
          <h2>Pay Schedule</h2>
          <p>{payFrequency.label}</p>
          <small>{payFrequency.periodsPerYear} pay periods per year</small>
        </article>
        <article>
          <h2>Monthly Take-home</h2>
          <p>{formatCurrency(monthlyTakeHome, currency)}</p>
          <small>Estimated from your per-pay net value</small>
        </article>
        <article>
          <h2>Annual Package</h2>
          <p>{formatCurrency(annualPackage, currency)}</p>
          <small>Gross salary plus employer contributions</small>
        </article>
        <article>
          <h2>Matched Salary Credits</h2>
          <p>{matchedPayCount}</p>
          <small>Transactions found using employer name matching</small>
        </article>
      </section>

      <section className="panel income-panel">
        <div className="income-header">
          <div>
            <h3>Payroll Configuration</h3>
            <p className="mode-note">Enter the per-pay values used to recognise and model salary transactions.</p>
          </div>
        </div>

        <section className="income-section">
          <div className="income-section-heading">
            <h4>Employer Matching</h4>
            <p>Enter your company name as it appears in your transactions. This is only used to match salary credits in your records.</p>
          </div>
          <div className="income-config-grid">
            <label className="income-field-card income-config-card">
              <span className="income-field-label">Employer name</span>
              <span className="income-field-hint">Use the employer name or descriptor shown on your salary transactions.</span>
              <input
                type="text"
                autoComplete="organization"
                value={payrollDraft.employerKeywords}
                placeholder="Acme Pty Ltd"
                onChange={(event) => onPayrollDraftChange({ employerKeywords: event.target.value })}
              />
            </label>
            <label className="income-field-card income-config-card">
              <span className="income-field-label">Pay frequency</span>
              <span className="income-field-hint">Used to convert per-pay values into monthly and annual totals.</span>
              <select
                value={payrollDraft.payFrequency}
                onChange={(event) => onPayrollDraftChange({ payFrequency: event.target.value as PayrollDraft["payFrequency"] })}
              >
                {PAY_FREQUENCY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="mode-note">
            {payrollDraft.employerKeywords.trim()
              ? `Currently matching ${matchedPayCount} salary credit${matchedPayCount === 1 ? "" : "s"} from your uploaded transaction records.`
              : "Add an employer name to enable salary matching."}
          </p>
        </section>

        <section className="income-section">
          <div className="income-section-heading">
            <h4>Per Pay Values</h4>
            <p>These should reflect a normal pay run, not a yearly total.</p>
          </div>
          <div className="income-field-grid">
            <label className="income-field-card">
              <span className="income-field-label">Net pay</span>
              <span className="income-field-hint">Amount deposited to your account each pay.</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={payrollDraft.netPay}
                onChange={(event) => onPayrollDraftChange({ netPay: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="income-field-card">
              <span className="income-field-label">Gross pay</span>
              <span className="income-field-hint">Salary before deductions.</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={payrollDraft.grossPay}
                onChange={(event) => onPayrollDraftChange({ grossPay: Number(event.target.value) || 0 })}
              />
            </label>
          </div>
        </section>

        {KIND_ORDER.map((kind) => {
          const meta = FIELD_KIND_META[kind];
          const fields = payrollDraft.fields.filter((f) => f.kind === kind);
          return (
            <section key={kind} className="income-section">
              <div className="income-section-heading">
                <h4>{meta.label}</h4>
                <p>{meta.hint}</p>
              </div>
              {fields.length > 0 && (
                <div className="income-field-grid">
                  {fields.map((field) => (
                    <div key={field.id} className="income-field-card income-field-editable">
                      <div className="income-field-label-row">
                        <input
                          className="income-field-label-input"
                          type="text"
                          value={field.label}
                          onChange={(event) => updateField(field.id, { label: event.target.value })}
                          placeholder="Field name"
                        />
                        <button
                          type="button"
                          className="income-field-remove"
                          onClick={() => removeField(field.id)}
                          aria-label={`Remove ${field.label}`}
                        >
                          ×
                        </button>
                      </div>
                      <span className="income-field-hint">Per-pay amount</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={field.amount}
                        onChange={(event) => updateField(field.id, { amount: Number(event.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="income-add-field-btn"
                onClick={() => addField(kind)}
              >
                + {meta.addLabel}
              </button>
            </section>
          );
        })}

        <section className="income-section">
          <div className="income-section-heading">
            <h4>Annual Income Breakdown</h4>
            <p>Based on your {payFrequency.label.toLowerCase()} pay cycle and the per-pay values above.</p>
          </div>
          {breakdownData.length === 0 ? (
            <p className="mode-note">Add your pay values to see an annual breakdown.</p>
          ) : (
            <div className="income-breakdown-layout">
              <div className="income-breakdown-chart">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={78}
                      outerRadius={118}
                      paddingAngle={2}
                      stroke="rgba(247, 243, 232, 0.8)"
                      strokeWidth={2}
                    >
                      {breakdownData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="income-breakdown-summary">
                <div className="income-breakdown-totals">
                  <article>
                    <span>Gross salary</span>
                    <strong>{formatCurrency(annualGross, currency)}</strong>
                  </article>
                  <article>
                    <span>Effective tax rate</span>
                    <strong>{(effectiveTaxRate * 100).toFixed(1)}%</strong>
                  </article>
                </div>
                <ul className="income-breakdown-list">
                  {breakdownData.map((entry) => {
                    const percent = breakdownTotal > 0 ? (entry.value / breakdownTotal) * 100 : 0;
                    return (
                      <li key={entry.name}>
                        <span className="income-breakdown-dot" style={{ backgroundColor: entry.color }} />
                        <div>
                          <strong>{entry.name}</strong>
                          <small>{formatCurrency(entry.value, currency)} · {percent.toFixed(1)}%</small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
