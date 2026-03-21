import { DEFAULT_PAYROLL_FIELDS, EMPTY_PAYROLL_DRAFT } from "./constants";
import type { PayFrequency, PayrollDraft, PayrollField, PayrollFieldKind } from "./types";

export const PAY_FREQUENCY_OPTIONS: Array<{ value: PayFrequency; label: string; periodsPerYear: number }> = [
  { value: "weekly", label: "Weekly", periodsPerYear: 52 },
  { value: "fortnightly", label: "Fortnightly", periodsPerYear: 26 },
  { value: "monthly", label: "Monthly", periodsPerYear: 12 }
];

export function getPayFrequencyMeta(frequency: PayFrequency) {
  return PAY_FREQUENCY_OPTIONS.find((option) => option.value === frequency) ?? PAY_FREQUENCY_OPTIONS[1];
}

const VALID_FIELD_KINDS = new Set<PayrollFieldKind>(["pre_tax_deduction", "employer_contribution", "contribution_tax"]);

function sanitizeField(raw: unknown): PayrollField | null {
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as Record<string, unknown>;
  const id = typeof candidate.id === "string" ? candidate.id : null;
  const label = typeof candidate.label === "string" ? candidate.label : null;
  const kind = VALID_FIELD_KINDS.has(candidate.kind as PayrollFieldKind) ? (candidate.kind as PayrollFieldKind) : null;
  if (!id || !label || !kind) return null;
  const amount = typeof candidate.amount === "number" && Number.isFinite(candidate.amount)
    ? Number(candidate.amount.toFixed(2))
    : 0;
  return { id, label, amount, kind };
}

export function sanitizePayrollDraft(raw: unknown): PayrollDraft {
  if (!raw || typeof raw !== "object") {
    return EMPTY_PAYROLL_DRAFT;
  }
  const candidate = raw as Record<string, unknown>;
  const payFrequency = candidate.payFrequency === "weekly" || candidate.payFrequency === "fortnightly" || candidate.payFrequency === "monthly"
    ? candidate.payFrequency
    : EMPTY_PAYROLL_DRAFT.payFrequency;
  const toNumber = (value: unknown, fallback: number): number => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : fallback;
  };
  const netPay = toNumber(candidate.netPay, 0);
  const grossPay = toNumber(candidate.grossPay, 0);

  // New format: has a `fields` array
  if (Array.isArray(candidate.fields)) {
    const fields = candidate.fields
      .map(sanitizeField)
      .filter((f): f is PayrollField => f !== null);
    return {
      employerKeywords: typeof candidate.employerKeywords === "string" ? candidate.employerKeywords : "",
      payFrequency,
      netPay,
      grossPay,
      fields: fields.length > 0 ? fields : DEFAULT_PAYROLL_FIELDS
    };
  }

  // Legacy format: had incomeTax, superGross, superTax as top-level numbers — migrate to fields
  const legacyFields: PayrollField[] = [];
  const incomeTax = toNumber(candidate.incomeTax, 0);
  const superGross = toNumber(candidate.superGross, 0);
  const superTax = toNumber(candidate.superTax, 0);
  legacyFields.push({ id: "income_tax", label: "Income tax", amount: incomeTax, kind: "pre_tax_deduction" });
  legacyFields.push({ id: "super_gross", label: "Super", amount: superGross, kind: "employer_contribution" });
  legacyFields.push({ id: "super_tax", label: "Super tax", amount: superTax, kind: "contribution_tax" });

  return {
    employerKeywords: typeof candidate.employerKeywords === "string" ? candidate.employerKeywords : "",
    payFrequency,
    netPay,
    grossPay,
    fields: legacyFields
  };
}
