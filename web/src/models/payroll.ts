import { EMPTY_PAYROLL_DRAFT } from "./constants";
import type { PayrollDraft } from "./types";

export function sanitizePayrollDraft(raw: unknown): PayrollDraft {
  if (!raw || typeof raw !== "object") {
    return EMPTY_PAYROLL_DRAFT;
  }
  const candidate = raw as Partial<PayrollDraft>;
  const toNumber = (value: unknown, fallback: number): number => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? Number(numeric.toFixed(2)) : fallback;
  };
  return {
    employerKeywords: typeof candidate.employerKeywords === "string" ? candidate.employerKeywords : "",
    netPay: toNumber(candidate.netPay, 0),
    grossPay: toNumber(candidate.grossPay, 0),
    incomeTax: toNumber(candidate.incomeTax, 0),
    superGross: toNumber(candidate.superGross, 0),
    superTax: toNumber(candidate.superTax, 0),
    netTolerance: toNumber(candidate.netTolerance, 2)
  };
}

export function formatPayrollYamlSnippet(draft: PayrollDraft): string {
  const keywords = draft.employerKeywords
    .split(/[,\n]/)
    .map((entry) => entry.trim())
    .filter(Boolean);
  const keywordLines = keywords.length > 0
    ? keywords.map((keyword) => `  - ${keyword}`).join("\n")
    : "  - your employer";
  return [
    "enabled: true",
    "employer_keywords:",
    keywordLines,
    `net_pay: ${draft.netPay.toFixed(2)}`,
    `gross_pay: ${draft.grossPay.toFixed(2)}`,
    `income_tax: ${draft.incomeTax.toFixed(2)}`,
    `super_gross: ${draft.superGross.toFixed(2)}`,
    `super_tax: ${draft.superTax.toFixed(2)}`,
    `net_tolerance: ${draft.netTolerance.toFixed(2)}`
  ].join("\n");
}
