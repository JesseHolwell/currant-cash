import { describe, expect, it } from "vitest";
import { parseBankCsvToTransactions } from "../csvImport";
import type { CategoryDefinition } from "../types";

const NO_CATEGORIES: CategoryDefinition[] = [];

const FOOD_CATEGORIES: CategoryDefinition[] = [
  {
    id: "cat-food",
    category: "Food",
    subcategories: [
      { id: "sub-groceries", name: "Groceries", keywords: ["woolworths", "coles", "aldi"] },
      { id: "sub-dining", name: "Dining", keywords: ["mcdonald", "uber eats"] }
    ]
  }
];

function makeCsv(rows: string[]): string {
  const header = "Bank Account,Date,Narrative,Debit Amount,Credit Amount,Balance,Categories,Serial";
  return [header, ...rows].join("\n");
}

describe("parseBankCsvToTransactions", () => {
  it("parses a basic debit transaction", () => {
    const csv = makeCsv(["12345678,01/03/2024,Woolworths 1234 Sydney,85.50,,1234.56,,TX001"]);
    const { transactions, warnings } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(transactions).toHaveLength(1);
    expect(warnings).toHaveLength(0);
    const tx = transactions[0];
    expect(tx.amount).toBe(85.5);
    expect(tx.direction).toBe("debit");
    expect(tx.date).toBe("2024-03-01");
  });

  it("parses a credit transaction with negative amount", () => {
    const csv = makeCsv(["12345678,01/03/2024,Salary Payment,,3000.00,8000.00,,"]);
    const { transactions } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(transactions[0].direction).toBe("credit");
    expect(transactions[0].amount).toBe(-3000);
  });

  it("infers Food/Groceries category from keyword match", () => {
    const csv = makeCsv(["12345678,01/03/2024,Woolworths Supermarket,50.00,,500.00,,"]);
    const { transactions } = parseBankCsvToTransactions(csv, FOOD_CATEGORIES);
    const tx = transactions[0];
    expect(tx.categoryGroup).toBe("Food");
    expect(tx.category).toBe("Groceries");
  });

  it("assigns 'Income' category to credit transactions regardless of keyword", () => {
    const csv = makeCsv(["12345678,01/03/2024,Woolworths Refund,,50.00,500.00,,"]);
    const { transactions } = parseBankCsvToTransactions(csv, FOOD_CATEGORIES);
    expect(transactions[0].categoryGroup).toBe("Income");
  });

  it("uses the Categories CSV column when it matches a known category", () => {
    const csv = makeCsv(["12345678,01/03/2024,Unknown Merchant,30.00,,200.00,Food,"]);
    const { transactions } = parseBankCsvToTransactions(csv, FOOD_CATEGORIES);
    expect(transactions[0].categoryGroup).toBe("Food");
  });

  it("deduplicates identical bank rows and emits a warning", () => {
    const row = "12345678,01/03/2024,Woolworths,50.00,,500.00,,TX001";
    const csv = makeCsv([row, row]);
    const { transactions, warnings } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(transactions).toHaveLength(1);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/duplicate/i);
  });

  it("accepts ISO date format (YYYY-MM-DD)", () => {
    const csv = makeCsv(["12345678,2024-03-01,Coles,40.00,,800.00,,"]);
    const { transactions, warnings } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(transactions).toHaveLength(1);
    expect(warnings).toHaveLength(0);
    expect(transactions[0].date).toBe("2024-03-01");
  });

  it("skips rows with missing date or narrative and does not throw", () => {
    const csv = makeCsv([
      "12345678,,Woolworths,50.00,,500.00,,",
      "12345678,01/03/2024,,25.00,,475.00,,"
    ]);
    const { transactions } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(transactions).toHaveLength(0);
  });

  it("warns for rows with unparsable dates instead of throwing", () => {
    const csv = makeCsv(["12345678,not-a-date,Merchant,50.00,,500.00,,"]);
    const { transactions, warnings } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(transactions).toHaveLength(0);
    expect(warnings).toHaveLength(1);
  });

  it("produces a stable transaction id across identical row content", () => {
    const row = "12345678,01/03/2024,Woolworths,50.00,,500.00,,TX001";
    const csv = makeCsv([row]);
    const { transactions: first } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    const { transactions: second } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(first[0].id).toBe(second[0].id);
  });

  it("returns an empty result for a header-only CSV", () => {
    const { transactions, warnings } = parseBankCsvToTransactions(
      "Bank Account,Date,Narrative,Debit Amount,Credit Amount,Balance,Categories,Serial",
      NO_CATEGORIES
    );
    expect(transactions).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("strips OSKO payment prefixes when inferring merchant", () => {
    const csv = makeCsv(["12345678,01/03/2024,DEPOSIT-OSKO PAYMENT 99999 John Smith,0,,1000.00,,"]);
    const { transactions } = parseBankCsvToTransactions(csv, NO_CATEGORIES);
    expect(transactions[0].merchant).not.toMatch(/OSKO/i);
  });
});
