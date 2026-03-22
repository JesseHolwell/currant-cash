import { buildTransactionBatch } from "./transactionData";
import type { CategoryDefinition, RawTransaction, TransactionBatch } from "./types";
import { similarityKeyForTransaction } from "./rules";

// Plaid types (subset of what the edge function returns)
export type PlaidAccount = {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: { current: number | null; available: number | null; iso_currency_code: string | null };
};

export type PlaidTransaction = {
  transaction_id: string;
  account_id: string;
  amount: number; // positive = debit (money out), negative = credit (money in)
  iso_currency_code: string | null;
  date: string; // YYYY-MM-DD posted date
  authorized_date: string | null;
  name: string;
  merchant_name: string | null;
  original_description: string | null;
  pending: boolean;
  personal_finance_category: {
    primary: string;
    detailed: string;
    confidence_level: string;
  } | null;
};

// Map Plaid's personal_finance_category.primary to our taxonomy category groups
const PLAID_CATEGORY_MAP: Record<string, { group: string; category: string }> = {
  FOOD_AND_DRINK: { group: "Food & Drink", category: "Restaurants" },
  TRANSPORTATION: { group: "Transport", category: "Transport" },
  TRAVEL: { group: "Transport", category: "Transport" },
  GENERAL_MERCHANDISE: { group: "Lifestyle", category: "Shopping" },
  ENTERTAINMENT: { group: "Lifestyle", category: "Hobbies" },
  PERSONAL_CARE: { group: "Lifestyle", category: "Shopping" },
  GENERAL_SERVICES: { group: "Lifestyle", category: "Shopping" },
  GOVERNMENT_AND_NON_PROFIT: { group: "Lifestyle", category: "Gifts" },
  MEDICAL: { group: "Health", category: "Health" },
  HOME_IMPROVEMENT: { group: "Life", category: "Life" },
  RENT_AND_UTILITIES: { group: "Life", category: "Internet" },
  LOAN_PAYMENTS: { group: "Life", category: "Life" },
  BANK_FEES: { group: "Subscriptions", category: "Subscriptions" },
  INCOME: { group: "Income", category: "Income" },
  TRANSFER_IN: { group: "Transfers", category: "Transfers" },
  TRANSFER_OUT: { group: "Transfers", category: "Transfers" },
};

function inferCategoryFromPlaid(
  tx: PlaidTransaction,
  _categoryDefinitions: CategoryDefinition[]
): { category: string; categoryGroup: string; categoryReason: string } {
  if (tx.personal_finance_category) {
    const mapped = PLAID_CATEGORY_MAP[tx.personal_finance_category.primary];
    if (mapped) {
      return {
        categoryGroup: mapped.group,
        category: mapped.category,
        categoryReason: `source:plaid:${tx.personal_finance_category.primary.toLowerCase()}`,
      };
    }
  }
  return { categoryGroup: undefined as unknown as string, category: "Uncategorized", categoryReason: "fallback:plaid-unmapped" };
}

export function plaidTransactionToRaw(
  tx: PlaidTransaction,
  categoryDefinitions: CategoryDefinition[]
): RawTransaction {
  const date = tx.authorized_date ?? tx.date;
  const narrative = tx.original_description ?? tx.name;
  const merchant = tx.merchant_name ?? tx.name;

  // Plaid: positive = debit (money out), negative = credit (money in)
  const amount = Math.abs(tx.amount);
  const direction: "debit" | "credit" | "neutral" =
    tx.amount > 0 ? "debit" : tx.amount < 0 ? "credit" : "neutral";

  const { category, categoryGroup, categoryReason } = inferCategoryFromPlaid(tx, categoryDefinitions);

  const raw: RawTransaction = {
    id: `plaid_${tx.transaction_id}`,
    date,
    accountId: tx.account_id,
    merchant,
    narrative,
    amount,
    direction,
    category,
    categoryGroup,
    categoryReason,
  };

  raw.similarityKey = similarityKeyForTransaction(raw);
  return raw;
}

export function buildPlaidBatch(
  institutionName: string,
  transactions: PlaidTransaction[],
  accounts: PlaidAccount[],
  categoryDefinitions: CategoryDefinition[]
): TransactionBatch {
  // Skip pending transactions — they don't have a stable ID yet
  const posted = transactions.filter((tx) => !tx.pending);

  const accountNames = accounts.reduce<Record<string, string>>((acc, a) => {
    acc[a.account_id] = a.name;
    return acc;
  }, {});

  const rawTransactions = posted.map((tx) => {
    const raw = plaidTransactionToRaw(tx, categoryDefinitions);
    // Override accountId with the human-readable account name for display
    return { ...raw, accountId: accountNames[tx.account_id] ?? tx.account_id };
  });

  return buildTransactionBatch({
    fileName: institutionName,
    transactions: rawTransactions,
    warnings: [],
  });
}
