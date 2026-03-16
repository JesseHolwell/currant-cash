import { useEffect, useState } from "react";
import {
  TRANSACTION_BATCHES_STORAGE_KEY,
  UPLOADED_META_STORAGE_KEY,
  UPLOADED_TRANSACTIONS_STORAGE_KEY,
  buildTransactionBatch,
  parseStoredRawTransactions,
  parseStoredSankeyMeta,
  parseStoredTransactionBatches
} from "../models";
import type { TransactionBatch } from "../models";

interface UseTransactionBatchesResult {
  transactionBatches: TransactionBatch[];
  setTransactionBatches: React.Dispatch<React.SetStateAction<TransactionBatch[]>>;
  transactionDataStatus: string | null;
  setTransactionDataStatus: React.Dispatch<React.SetStateAction<string | null>>;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loading: boolean;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useTransactionBatches(): UseTransactionBatchesResult {
  const [transactionBatches, setTransactionBatches] = useState<TransactionBatch[]>([]);
  const [transactionDataStatus, setTransactionDataStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasHydratedTransactionData, setHasHydratedTransactionData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const storedBatchesRaw = localStorage.getItem(TRANSACTION_BATCHES_STORAGE_KEY);
      const storedBatches = parseStoredTransactionBatches(storedBatchesRaw ? JSON.parse(storedBatchesRaw) : null);

      if (storedBatches.length > 0) {
        setTransactionBatches(storedBatches);
        setTransactionDataStatus(`Loaded ${storedBatches.length} CSV file(s) from browser storage.`);
      } else {
        const uploadedTransactionsRaw = localStorage.getItem(UPLOADED_TRANSACTIONS_STORAGE_KEY);
        const uploadedMetaRaw = localStorage.getItem(UPLOADED_META_STORAGE_KEY);
        const uploadedTransactions = parseStoredRawTransactions(uploadedTransactionsRaw ? JSON.parse(uploadedTransactionsRaw) : null);
        const uploadedMeta = parseStoredSankeyMeta(uploadedMetaRaw ? JSON.parse(uploadedMetaRaw) : null);

        if (uploadedTransactions.length > 0) {
          const migratedBatch = buildTransactionBatch({
            fileName: "Legacy upload",
            importedAt: uploadedMeta?.generatedAt,
            transactions: uploadedTransactions
          });
          setTransactionBatches([migratedBatch]);
          setTransactionDataStatus(`Migrated 1 legacy CSV dataset with ${uploadedTransactions.length} transactions.`);
        } else {
          setTransactionBatches([]);
          setTransactionDataStatus("No CSV dataset loaded yet. Add a CSV to begin.");
        }
      }
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : String(loadError);
      setError(message);
      setTransactionBatches([]);
      setTransactionDataStatus("Stored transaction data is invalid. Add a CSV to reset.");
    } finally {
      setHasHydratedTransactionData(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!hasHydratedTransactionData) {
      return;
    }
    localStorage.setItem(TRANSACTION_BATCHES_STORAGE_KEY, JSON.stringify(transactionBatches));
    localStorage.removeItem(UPLOADED_TRANSACTIONS_STORAGE_KEY);
    localStorage.removeItem(UPLOADED_META_STORAGE_KEY);
  }, [transactionBatches, hasHydratedTransactionData]);

  return {
    transactionBatches,
    setTransactionBatches,
    transactionDataStatus,
    setTransactionDataStatus,
    error,
    setError,
    loading,
    setLoading
  };
}
