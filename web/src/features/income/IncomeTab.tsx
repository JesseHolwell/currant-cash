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

const inputCls = "border border-line-strong bg-surface text-ink rounded-sm px-[0.6rem] py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)] w-full";

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
      <section className="grid grid-cols-4 gap-[0.65rem]">
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Pay Schedule</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{payFrequency.label}</p>
          <small className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">{payFrequency.periodsPerYear} pay periods per year</small>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Monthly Take-home</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(monthlyTakeHome, currency)}</p>
          <small className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">Estimated from your per-pay net value</small>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Annual Package</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{formatCurrency(annualPackage, currency)}</p>
          <small className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">Gross salary plus employer contributions</small>
        </article>
        <article className="border border-line rounded-md px-4 py-[0.9rem] bg-surface shadow-soft hover:border-line-strong transition-colors">
          <h2 className="text-[0.72rem] uppercase tracking-[0.12em] text-muted font-bold">Matched Salary Credits</h2>
          <p className="font-mono text-ink font-semibold tracking-[-0.03em] mt-[0.38rem] text-[clamp(1.2rem,1.8vw,1.55rem)]">{matchedPayCount}</p>
          <small className="text-[0.68rem] text-muted font-normal mt-[0.2rem] inline-block">Transactions found using employer name matching</small>
        </article>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0 grid gap-4">
        <div>
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Payroll Configuration</h3>
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">Enter the per-pay values used to recognise and model salary transactions.</p>
        </div>

        <div className="border border-line rounded-md p-4">
          <div className="mb-3">
            <h4 className="font-display text-[0.95rem] text-ink m-0">Employer Matching</h4>
            <p className="text-ink-soft text-[0.8rem] mt-[0.18rem]">Enter your company name as it appears in your transactions. This is only used to match salary credits in your records.</p>
          </div>
          <div className="grid grid-cols-[minmax(0,1.4fr)_minmax(220px,0.8fr)] gap-[0.65rem]">
            <label className="grid gap-[0.34rem] border border-line rounded-md p-3 bg-surface hover:border-line-strong transition-colors content-start">
              <span className="text-[0.84rem] text-ink font-semibold">Employer name</span>
              <span className="text-muted text-[0.78rem] min-h-[2.2em]">Use the employer name or descriptor shown on your salary transactions.</span>
              <input
                type="text"
                autoComplete="organization"
                value={payrollDraft.employerKeywords}
                placeholder="Acme Pty Ltd"
                className={inputCls}
                onChange={(event) => onPayrollDraftChange({ employerKeywords: event.target.value })}
              />
            </label>
            <label className="grid gap-[0.34rem] border border-line rounded-md p-3 bg-surface hover:border-line-strong transition-colors content-start">
              <span className="text-[0.84rem] text-ink font-semibold">Pay frequency</span>
              <span className="text-muted text-[0.78rem] min-h-[2.2em]">Used to convert per-pay values into monthly and annual totals.</span>
              <select
                value={payrollDraft.payFrequency}
                className={inputCls}
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
          <p className="text-muted text-[0.82rem] mt-[0.42rem]">
            {payrollDraft.employerKeywords.trim()
              ? `Currently matching ${matchedPayCount} salary credit${matchedPayCount === 1 ? "" : "s"} from your uploaded transaction records.`
              : "Add an employer name to enable salary matching."}
          </p>
        </div>

        <div className="border border-line rounded-md p-4">
          <div className="mb-3">
            <h4 className="font-display text-[0.95rem] text-ink m-0">Per Pay Values</h4>
            <p className="text-ink-soft text-[0.8rem] mt-[0.18rem]">These should reflect a normal pay run, not a yearly total.</p>
          </div>
          <div className="grid grid-cols-3 gap-[0.65rem]">
            <label className="grid gap-[0.34rem] border border-line rounded-md p-3 bg-surface hover:border-line-strong transition-colors">
              <span className="text-[0.84rem] text-ink font-semibold">Net pay</span>
              <span className="text-muted text-[0.78rem] min-h-[2.2em]">Amount deposited to your account each pay.</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={payrollDraft.netPay}
                className={inputCls}
                onChange={(event) => onPayrollDraftChange({ netPay: Number(event.target.value) || 0 })}
              />
            </label>
            <label className="grid gap-[0.34rem] border border-line rounded-md p-3 bg-surface hover:border-line-strong transition-colors">
              <span className="text-[0.84rem] text-ink font-semibold">Gross pay</span>
              <span className="text-muted text-[0.78rem] min-h-[2.2em]">Salary before deductions.</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={payrollDraft.grossPay}
                className={inputCls}
                onChange={(event) => onPayrollDraftChange({ grossPay: Number(event.target.value) || 0 })}
              />
            </label>
          </div>
        </div>

        {KIND_ORDER.map((kind) => {
          const meta = FIELD_KIND_META[kind];
          const fields = payrollDraft.fields.filter((f) => f.kind === kind);
          return (
            <div key={kind} className="border border-line rounded-md p-4">
              <div className="mb-3">
                <h4 className="font-display text-[0.95rem] text-ink m-0">{meta.label}</h4>
                <p className="text-ink-soft text-[0.8rem] mt-[0.18rem]">{meta.hint}</p>
              </div>
              {fields.length > 0 && (
                <div className="grid grid-cols-3 gap-[0.65rem] mb-3">
                  {fields.map((field) => (
                    <div key={field.id} className="grid gap-[0.34rem] border border-line rounded-md p-3 bg-surface hover:border-line-strong transition-colors content-start">
                      <div className="flex items-center gap-[0.4rem]">
                        <input
                          className="flex-1 text-[0.84rem] bg-transparent border-0 border-b border-line text-ink focus:outline-none focus:border-b-accent py-[0.1rem]"
                          type="text"
                          value={field.label}
                          onChange={(event) => updateField(field.id, { label: event.target.value })}
                          placeholder="Field name"
                        />
                        <button
                          type="button"
                          className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full border border-line text-muted text-base leading-none cursor-pointer hover:border-line-strong hover:text-ink bg-transparent"
                          onClick={() => removeField(field.id)}
                          aria-label={`Remove ${field.label}`}
                        >
                          ×
                        </button>
                      </div>
                      <span className="text-muted text-[0.78rem]">Per-pay amount</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={field.amount}
                        className={inputCls}
                        onChange={(event) => updateField(field.id, { amount: Number(event.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-[0.35rem] border border-line rounded-sm px-3 py-[0.35rem] text-[0.8rem] text-muted bg-transparent cursor-pointer hover:border-line-strong hover:text-ink transition-colors"
                onClick={() => addField(kind)}
              >
                + {meta.addLabel}
              </button>
            </div>
          );
        })}

        <div className="border border-line rounded-md p-4">
          <div className="mb-3">
            <h4 className="font-display text-[0.95rem] text-ink m-0">Annual Income Breakdown</h4>
            <p className="text-ink-soft text-[0.8rem] mt-[0.18rem]">Based on your {payFrequency.label.toLowerCase()} pay cycle and the per-pay values above.</p>
          </div>
          {breakdownData.length === 0 ? (
            <p className="text-muted text-[0.82rem] mt-[0.42rem]">Add your pay values to see an annual breakdown.</p>
          ) : (
            <div className="grid grid-cols-[minmax(280px,0.9fr)_minmax(260px,1fr)] gap-[0.65rem]">
              <div className="min-h-[300px] border border-line rounded-md bg-surface">
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

              <div className="grid gap-[0.8rem] content-start">
                <div className="grid grid-cols-2 gap-[0.65rem]">
                  <article className="grid gap-[0.18rem] border border-line rounded-md p-3 bg-surface">
                    <span className="text-muted text-[0.74rem] uppercase tracking-[0.1em]">Gross salary</span>
                    <strong className="text-ink text-[1.18rem] font-mono font-semibold">{formatCurrency(annualGross, currency)}</strong>
                  </article>
                  <article className="grid gap-[0.18rem] border border-line rounded-md p-3 bg-surface">
                    <span className="text-muted text-[0.74rem] uppercase tracking-[0.1em]">Effective tax rate</span>
                    <strong className="text-ink text-[1.18rem] font-mono font-semibold">{(effectiveTaxRate * 100).toFixed(1)}%</strong>
                  </article>
                </div>
                <ul className="list-none m-0 p-0 grid gap-[0.38rem]">
                  {breakdownData.map((entry) => {
                    const percent = breakdownTotal > 0 ? (entry.value / breakdownTotal) * 100 : 0;
                    return (
                      <li key={entry.name} className="grid grid-cols-[auto_minmax(0,1fr)] gap-[0.6rem] items-center border border-line rounded-md p-[0.55rem] hover:border-line-strong transition-colors">
                        <span className="w-3 h-3 rounded-full flex-shrink-0 self-start mt-[0.25rem]" style={{ backgroundColor: entry.color }} />
                        <div>
                          <strong className="block text-ink text-[0.85rem] font-semibold">{entry.name}</strong>
                          <small className="text-ink-soft text-[0.8rem]">{formatCurrency(entry.value, currency)} · {percent.toFixed(1)}%</small>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
