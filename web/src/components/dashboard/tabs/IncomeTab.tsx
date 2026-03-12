import { formatCurrency, formatPayrollYamlSnippet } from "../../../models";
import type { PayrollDraft } from "../../../models";

export function IncomeTab({
  currency,
  payrollDraft,
  onPayrollDraftChange
}: {
  currency: string;
  payrollDraft: PayrollDraft;
  onPayrollDraftChange: (patch: Partial<PayrollDraft>) => void;
}) {
  return (
    <>
      <section className="stats">
        <article>
          <h2>Gross Per Pay</h2>
          <p>{formatCurrency(payrollDraft.grossPay, currency)}</p>
        </article>
        <article>
          <h2>Net Per Pay</h2>
          <p>{formatCurrency(payrollDraft.netPay, currency)}</p>
        </article>
        <article>
          <h2>Tax Per Pay</h2>
          <p>{formatCurrency(payrollDraft.incomeTax, currency)}</p>
        </article>
        <article>
          <h2>Super Per Pay</h2>
          <p>{formatCurrency(payrollDraft.superGross, currency)}</p>
        </article>
      </section>

      <section className="panel">
        <h3>Payroll Configuration</h3>
        <p className="mode-note">
          This editor mirrors `rules/payroll.private.yml` fields and is saved locally in your browser.
        </p>
        <div className="income-grid">
          <label>
            Employer keywords (comma/new line)
            <textarea
              value={payrollDraft.employerKeywords}
              onChange={(event) => onPayrollDraftChange({ employerKeywords: event.target.value })}
            />
          </label>
          <label>
            Net pay
            <input
              type="number"
              value={payrollDraft.netPay}
              onChange={(event) => onPayrollDraftChange({ netPay: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            Gross pay
            <input
              type="number"
              value={payrollDraft.grossPay}
              onChange={(event) => onPayrollDraftChange({ grossPay: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            Income tax
            <input
              type="number"
              value={payrollDraft.incomeTax}
              onChange={(event) => onPayrollDraftChange({ incomeTax: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            Super gross
            <input
              type="number"
              value={payrollDraft.superGross}
              onChange={(event) => onPayrollDraftChange({ superGross: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            Super tax
            <input
              type="number"
              value={payrollDraft.superTax}
              onChange={(event) => onPayrollDraftChange({ superTax: Number(event.target.value) || 0 })}
            />
          </label>
          <label>
            Net tolerance
            <input
              type="number"
              value={payrollDraft.netTolerance}
              onChange={(event) => onPayrollDraftChange({ netTolerance: Number(event.target.value) || 0 })}
            />
          </label>
        </div>

        <h3>Generated YAML</h3>
        <pre className="yaml-preview">{formatPayrollYamlSnippet(payrollDraft)}</pre>
      </section>
    </>
  );
}
