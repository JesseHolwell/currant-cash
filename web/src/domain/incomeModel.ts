import type { IncomeModel, ModelComponent, PayrollDraft, RawTransaction } from "./types";
import { normalizeForMatch } from "./utils";

function toComponents(name: string, perPay: number, payEventCount: number): ModelComponent[] {
  if (perPay <= 0 || payEventCount <= 0) {
    return [];
  }
  return [{
    name,
    perPay: Number(perPay.toFixed(2)),
    total: Number((perPay * payEventCount).toFixed(2))
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
  const incomeTax = Number(payroll.incomeTax || 0);
  const superGross = Number(payroll.superGross || 0);
  const superTax = Number(payroll.superTax || 0);

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
        incomeTax,
        superGross,
        superTax,
        taxComponents: [],
        superComponents: []
      },
      totals: {
        salaryGross: 0,
        tax: 0,
        super: 0,
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
  const taxTotal = Number((payEventCount * incomeTax).toFixed(2));
  const superTotal = Number((payEventCount * superGross).toFixed(2));

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
      incomeTax: Number(incomeTax.toFixed(2)),
      superGross: Number(superGross.toFixed(2)),
      superTax: Number(superTax.toFixed(2))
    })),
    salary: {
      netPay: Number(netPay.toFixed(2)),
      grossPay: Number(grossPay.toFixed(2)),
      incomeTax: Number(incomeTax.toFixed(2)),
      superGross: Number(superGross.toFixed(2)),
      superTax: Number(superTax.toFixed(2)),
      taxComponents: toComponents("Income Tax", incomeTax, payEventCount),
      superComponents: toComponents("Super Guarantee", superGross, payEventCount)
    },
    totals: {
      salaryGross: salaryGrossTotal,
      tax: taxTotal,
      super: superTotal,
      otherCredits: Number(otherCredits.toFixed(2)),
      grossPlusOtherCredits: Number((salaryGrossTotal + otherCredits).toFixed(2)),
      netPlusOtherCredits: Number((salaryNetTotal + otherCredits).toFixed(2))
    }
  };
}
