import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  TRANSACTION_BATCHES_STORAGE_KEY,
  UPLOADED_META_STORAGE_KEY,
  UPLOADED_TRANSACTIONS_STORAGE_KEY,
  buildTransactionBatch,
  parseStoredRawTransactions,
  parseStoredSankeyMeta,
  parseStoredTransactionBatches
} from "../domain";
import type { TransactionBatch } from "../domain";

type Updater<T> = T | ((prev: T) => T);

interface TransactionsState {
  transactionBatches: TransactionBatch[];
  transactionDataStatus: string | null;
  error: string | null;
  loading: boolean;
  setTransactionBatches: (batches: Updater<TransactionBatch[]>) => void;
  setLoading: (loading: boolean) => void;
  addBatch: (batch: TransactionBatch) => void;
  removeBatch: (id: string) => void;
  updateBatch: (id: string, update: Partial<TransactionBatch>) => void;
  setTransactionDataStatus: (status: string | null) => void;
  setError: (error: string | null) => void;
}

export const useTransactionsStore = create<TransactionsState>()(
  persist(
    (set) => ({
      transactionBatches: [],
      transactionDataStatus: null,
      error: null,
      loading: true,

      setLoading: (loading) => set({ loading }),

      setTransactionBatches: (batchesOrUpdater) =>
        set((state) => {
          const batches =
            typeof batchesOrUpdater === "function"
              ? batchesOrUpdater(state.transactionBatches)
              : batchesOrUpdater;
          return {
            transactionBatches: batches,
            transactionDataStatus:
              batches.length > 0
                ? `Loaded ${batches.length} CSV file(s) from browser storage.`
                : "No CSV dataset loaded yet. Add a CSV to begin."
          };
        }),

      addBatch: (batch) =>
        set((state) => ({
          transactionBatches: [...state.transactionBatches, batch],
          transactionDataStatus: `Loaded ${state.transactionBatches.length + 1} CSV file(s) from browser storage.`
        })),

      removeBatch: (id) =>
        set((state) => {
          const next = state.transactionBatches.filter((b) => b.id !== id);
          return {
            transactionBatches: next,
            transactionDataStatus:
              next.length > 0
                ? `Loaded ${next.length} CSV file(s) from browser storage.`
                : "No CSV dataset loaded yet. Add a CSV to begin."
          };
        }),

      updateBatch: (id, update) =>
        set((state) => ({
          transactionBatches: state.transactionBatches.map((b) =>
            b.id === id ? { ...b, ...update } : b
          )
        })),

      setTransactionDataStatus: (status) => set({ transactionDataStatus: status }),
      setError: (error) => set({ error })
    }),
    {
      name: TRANSACTION_BATCHES_STORAGE_KEY,
      partialize: (state) => ({ transactionBatches: state.transactionBatches }),
      merge: (persisted, current) => {
        try {
          const raw = (persisted as { transactionBatches?: unknown })?.transactionBatches;
          const batches = parseStoredTransactionBatches(raw ?? []);

          if (batches.length > 0) {
            return {
              ...current,
              transactionBatches: batches,
              loading: false,
              transactionDataStatus: `Loaded ${batches.length} CSV file(s) from browser storage.`
            };
          }

          // Attempt legacy migration from v1 storage keys
          const legacyTransactionsRaw = localStorage.getItem(UPLOADED_TRANSACTIONS_STORAGE_KEY);
          const legacyMetaRaw = localStorage.getItem(UPLOADED_META_STORAGE_KEY);
          const legacyTransactions = parseStoredRawTransactions(
            legacyTransactionsRaw ? JSON.parse(legacyTransactionsRaw) : null
          );
          const legacyMeta = parseStoredSankeyMeta(legacyMetaRaw ? JSON.parse(legacyMetaRaw) : null);

          if (legacyTransactions.length > 0) {
            const migratedBatch = buildTransactionBatch({
              fileName: "Legacy upload",
              importedAt: legacyMeta?.generatedAt,
              transactions: legacyTransactions
            });
            localStorage.removeItem(UPLOADED_TRANSACTIONS_STORAGE_KEY);
            localStorage.removeItem(UPLOADED_META_STORAGE_KEY);
            return {
              ...current,
              transactionBatches: [migratedBatch],
              loading: false,
              transactionDataStatus: `Migrated 1 legacy CSV dataset with ${legacyTransactions.length} transactions.`
            };
          }

          return {
            ...current,
            transactionBatches: [],
            loading: false,
            transactionDataStatus: "No CSV dataset loaded yet. Add a CSV to begin."
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            ...current,
            transactionBatches: [],
            loading: false,
            error: message,
            transactionDataStatus: "Stored transaction data is invalid. Add a CSV to reset."
          };
        }
      }
    }
  )
);
