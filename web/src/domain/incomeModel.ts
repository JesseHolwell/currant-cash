import type { IncomeModel, ModelComponent, PayrollDraft, RawTransaction } from "./types";
import { normalizeForMatch } from "./utils";

function toComponents(field: { label: string; amount: number }, payEventCount: number): ModelComponent[] {
  if (field.amount <= 0 || payEventCount <= 0) {
    return [];
  }
  return [{
    name: field.label,
    perPay: Number(field.amount.toFixed(2)),
    total: Number((field.amount * payEventCount).toFixed(2))
  }];
}

function extractKeywords(raw: string): string[] {
  return raw
    .split(/[,\n]/)
    .map((entry) => normalizeForMatch(entry))
    .filter(Boolean);
}

export function buildIncomeModelFromTransactions(
  transactions: RawTransaction[],
  payroll: PayrollDraft
): IncomeModel {
  const keywords = extractKeywords(payroll.employerKeywords);
  const netPay = Number(payroll.netPay || 0);
  const grossPay = Number(payroll.grossPay || 0);

  const preTaxFields = payroll.fields.filter((f) => f.kind === "pre_tax_deduction");
  const employerContribFields = payroll.fields.filter((f) => f.kind === "employer_contribution");
  const contribTaxFields = payroll.fields.filter((f) => f.kind === "contribution_tax");

  const isConfigEnabled = keywords.length > 0 && netPay > 0 && grossPay > 0;
  if (!isConfigEnabled) {
    return {
      enabled: false,
      payEventCount: 0,
      salaryMatchIds: [],
      payEvents: [],
      salary: {
        netPay,
        grossPay,
        fields: payroll.fields,
        taxComponents: [],
        superComponents: [],
        contributionTaxComponents: []
      },
      totals: {
        salaryGross: 0,
        tax: 0,
        super: 0,
        superTax: 0,
        otherCredits: 0,
        grossPlusOtherCredits: 0,
        netPlusOtherCredits: 0
      }
    };
  }

  const creditTransactions = transactions.filter((transaction) => transaction.direction === "credit" && transaction.amount < 0);

  const salaryMatches = creditTransactions.filter((transaction) => {
    const merchant = normalizeForMatch(transaction.merchant);
    const narrative = normalizeForMatch(transaction.narrative);
    return keywords.some((keyword) => merchant.includes(keyword) || narrative.includes(keyword));
  }).sort((a, b) => a.date.localeCompare(b.date));

  const salaryMatchIds = new Set(salaryMatches.map((transaction) => transaction.id));
  const payEventCount = salaryMatches.length;

  const otherCredits = creditTransactions
    .filter((transaction) => !salaryMatchIds.has(transaction.id) && transaction.categoryGroup !== "Transfers")
    .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0);

  const salaryGrossTotal = Number((payEventCount * grossPay).toFixed(2));
  const salaryNetTotal = Number((payEventCount * netPay).toFixed(2));
  const taxTotal = Number((payEventCount * preTaxFields.reduce((s, f) => s + f.amount, 0)).toFixed(2));
  const superTotal = Number((payEventCount * employerContribFields.reduce((s, f) => s + f.amount, 0)).toFixed(2));
  const superTaxTotal = Number((payEventCount * contribTaxFields.reduce((s, f) => s + f.amount, 0)).toFixed(2));

  const eventFields = payroll.fields.map((f) => ({ id: f.id, label: f.label, kind: f.kind, amount: f.amount }));

  return {
    enabled: true,
    payEventCount,
    salaryMatchIds: [...salaryMatchIds],
    payEvents: salaryMatches.map((transaction) => ({
      transactionId: transaction.id,
      date: transaction.date,
      depositAmount: Number(Math.abs(transaction.amount).toFixed(2)),
      grossPay: Number(grossPay.toFixed(2)),
      netPay: Number(netPay.toFixed(2)),
      fields: eventFields
    })),
    salary: {
      netPay: Number(netPay.toFixed(2)),
      grossPay: Number(grossPay.toFixed(2)),
      fields: payroll.fields,
      taxComponents: preTaxFields.flatMap((f) => toComponents(f, payEventCount)),
      superComponents: employerContribFields.flatMap((f) => toComponents(f, payEventCount)),
      contributionTaxComponents: contribTaxFields.flatMap((f) => toComponents(f, payEventCount))
    },
    totals: {
      salaryGross: salaryGrossTotal,
      tax: taxTotal,
      super: superTotal,
      superTax: superTaxTotal,
      otherCredits: Number(otherCredits.toFixed(2)),
      grossPlusOtherCredits: Number((salaryGrossTotal + otherCredits).toFixed(2)),
      netPlusOtherCredits: Number((salaryNetTotal + otherCredits).toFixed(2))
    }
  };
}
