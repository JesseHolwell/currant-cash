import { EMPTY_PAYROLL_DRAFT } from "./constants";
import type { PayFrequency, PayrollDraft } from "./types";

export const PAY_FREQUENCY_OPTIONS: Array<{ value: PayFrequency; label: string; periodsPerYear: number }> = [
  { value: "weekly", label: "Weekly", periodsPerYear: 52 },
  { value: "fortnightly", label: "Fortnightly", periodsPerYear: 26 },
  { value: "monthly", label: "Monthly", periodsPerYear: 12 }
];

export function getPayFrequencyMeta(frequency: PayFrequency) {
  return PAY_FREQUENCY_OPTIONS.find((option) => option.value === frequency) ?? PAY_FREQUENCY_OPTIONS[1];
}

export function sanitizePayrollDraft(raw: unknown): PayrollDraft {
  if (!raw || typeof raw !== "object") {
    return EMPTY_PAYROLL_DRAFT;
  }
  const candidate = raw as Partial<PayrollDraft>;
  const payFrequency = candidate.payFrequency === "weekly" || candidate.payFrequency === "fortnightly" || candidate.payFrequency === "monthly"
    ? candidate.payFrequency
    : EMPTY_PAYROLL_DRAFT.payFrequency;
  const toNumber = (value: unknown, fallback: number): number => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : fallback;
  };
  return {
    employerKeywords: typeof candidate.employerKeywords === "string" ? candidate.employerKeywords : "",
    payFrequency,
    netPay: toNumber(candidate.netPay, 0),
    grossPay: toNumber(candidate.grossPay, 0),
    incomeTax: toNumber(candidate.incomeTax, 0),
    superGross: toNumber(candidate.superGross, 0),
    superTax: toNumber(candidate.superTax, 0)
  };
}
