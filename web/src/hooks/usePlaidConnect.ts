import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import type { PlaidLinkOnSuccess } from "react-plaid-link";
import { buildPlaidBatch } from "../domain/plaidImport";
import type { CategoryDefinition, TransactionBatch } from "../domain";

type UsePlaidConnectOptions = {
  supabaseUrl: string | undefined;
  categoryDefinitions: CategoryDefinition[];
  onBatchReady: (batch: TransactionBatch) => void;
};

export function usePlaidConnect({ supabaseUrl, categoryDefinitions, onBatchReady }: UsePlaidConnectOptions) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccess = useCallback<PlaidLinkOnSuccess>(
    async (publicToken, metadata) => {
      if (!supabaseUrl) return;
      setSyncing(true);
      setError(null);
      try {
        const res = await fetch(`${supabaseUrl}/functions/v1/plaid-exchange-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_name: metadata.institution?.name ?? "Bank",
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error ?? "Failed to fetch transactions from bank.");
          return;
        }

        const batch = buildPlaidBatch(
          metadata.institution?.name ?? "Bank",
          data.transactions,
          data.accounts,
          categoryDefinitions
        );

        onBatchReady(batch);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred while connecting your bank.");
      } finally {
        setSyncing(false);
        setLinkToken(null);
      }
    },
    [supabaseUrl, categoryDefinitions, onBatchReady]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess,
    onExit: (err) => {
      setConnecting(false);
      if (err) {
        setError(err.error_message ?? "Bank connection cancelled.");
      }
      setLinkToken(null);
    },
  });

  // Auto-open Link once the token is ready
  useEffect(() => {
    if (linkToken && ready) {
      setConnecting(false);
      open();
    }
  }, [linkToken, ready, open]);

  const connect = useCallback(async () => {
    if (!supabaseUrl) {
      setError("Supabase must be configured to connect a bank account.");
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const res = await fetch(`${supabaseUrl}/functions/v1/plaid-create-link-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to initialize bank connection.");
        setConnecting(false);
        return;
      }

      setLinkToken(data.link_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize bank connection.");
      setConnecting(false);
    }
  }, [supabaseUrl]);

  const loading = connecting || syncing;
  const loadingLabel = syncing ? "Importing…" : "Connecting…";

  return { connect, loading, loadingLabel, error, clearError: () => setError(null) };
}
