import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import {
  PAY_FREQUENCY_OPTIONS,
  formatCurrency,
  getPayFrequencyMeta
} from "../../../models";
import type { PayrollDraft } from "../../../models";

const PAYROLL_FIELDS: Array<{
  key: keyof Omit<PayrollDraft, "employerKeywords" | "payFrequency">;
  label: string;
  hint: string;
  step?: string;
}> = [
  { key: "netPay", label: "Net pay", hint: "Amount deposited to your account each pay.", step: "0.01" },
  { key: "grossPay", label: "Gross pay", hint: "Salary before tax and super deductions.", step: "0.01" },
  { key: "incomeTax", label: "Income tax", hint: "PAYG withholding for the pay period.", step: "0.01" },
  { key: "superGross", label: "Super gross", hint: "Employer super contribution before super tax.", step: "0.01" },
  { key: "superTax", label: "Super tax", hint: "Contributions tax withheld from super.", step: "0.01" }
];

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
  const annualTax = Number((payrollDraft.incomeTax * payFrequency.periodsPerYear).toFixed(2));
  const annualSuper = Number((payrollDraft.superGross * payFrequency.periodsPerYear).toFixed(2));
  const annualGross = Number((payrollDraft.grossPay * payFrequency.periodsPerYear).toFixed(2));
  const annualPackage = Number((annualGross + annualSuper).toFixed(2));
  const monthlyTakeHome = Number((annualNet / 12).toFixed(2));
  const effectiveTaxRate = annualGross > 0 ? annualTax / annualGross : 0;
  const breakdownTotal = annualNet + annualTax + annualSuper;
  const breakdownData = [
    { name: "Take-home pay", value: annualNet, color: "#6f9335" },
    { name: "Income tax", value: annualTax, color: "#eba321" },
    { name: "Superannuation", value: annualSuper, color: "#46abd2" }
  ].filter((entry) => entry.value > 0);

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
          <small>Gross salary plus employer super</small>
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
          <a
            className="income-link"
            href="https://paycalculator.com.au/"
            target="_blank"
            rel="noreferrer"
          >
            To calculate this, use paycalculator.com.au
          </a>
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
            {PAYROLL_FIELDS.map((field) => (
              <label key={field.key} className="income-field-card">
                <span className="income-field-label">{field.label}</span>
                <span className="income-field-hint">{field.hint}</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step={field.step}
                  value={payrollDraft[field.key]}
                  onChange={(event) => onPayrollDraftChange({ [field.key]: Number(event.target.value) || 0 })}
                />
              </label>
            ))}
          </div>
        </section>

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
                      stroke="rgba(242, 247, 243, 0.98)"
                      strokeWidth={3}
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
