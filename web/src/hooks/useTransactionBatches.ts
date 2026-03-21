import { useTransactionsStore } from "../store";

export function useTransactionBatches() {
  return useTransactionsStore();
}
