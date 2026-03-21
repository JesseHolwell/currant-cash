import { useEffect, useState } from "react";
import { fetchAiCategorySuggestions } from "../lib/openai";
import { AI_SUGGESTIONS_STORAGE_KEY } from "../models";
import type { AiCategorySuggestion, AiSuggestionsState, RawTransaction } from "../models";

const DEFAULT_STATE: AiSuggestionsState = {
  suggestions: [],
  status: "idle",
  lastRunAt: null,
};

function loadSuggestions(): AiSuggestionsState {
  try {
    const raw = localStorage.getItem(AI_SUGGESTIONS_STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<AiSuggestionsState>;
    if (!Array.isArray(parsed.suggestions)) return DEFAULT_STATE;
    const suggestions: AiCategorySuggestion[] = parsed.suggestions
      .filter(
        (s): s is AiCategorySuggestion =>
          s &&
          typeof s.transactionId === "string" &&
          typeof s.categoryGroup === "string" &&
          typeof s.category === "string" &&
          (s.status === "pending" || s.status === "accepted" || s.status === "rejected")
      );
    return {
      suggestions,
      status:
        parsed.status === "done" ||
        parsed.status === "error" ||
        parsed.status === "idle" ||
        parsed.status === "running"
          ? // Don't restore "running" — treat as idle so user can retry
            parsed.status === "running"
            ? "idle"
            : parsed.status
          : "idle",
      lastRunAt: typeof parsed.lastRunAt === "string" ? parsed.lastRunAt : null,
      errorMessage: typeof parsed.errorMessage === "string" ? parsed.errorMessage : undefined,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export function useAiSuggestions() {
  const [state, setState] = useState<AiSuggestionsState>(DEFAULT_STATE);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setState(loadSuggestions());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(AI_SUGGESTIONS_STORAGE_KEY, JSON.stringify(state));
  }, [state, hasHydrated]);

  async function runAiCategorization(
    apiKey: string,
    uncategorizedTransactions: RawTransaction[],
    taxonomy: Map<string, string[]>
  ): Promise<void> {
    if (!apiKey.trim() || uncategorizedTransactions.length === 0) return;

    setState((prev) => ({ ...prev, status: "running", errorMessage: undefined }));

    try {
      const results = await fetchAiCategorySuggestions(apiKey, uncategorizedTransactions, taxonomy);
      const existingById = new Map(
        state.suggestions
          .filter((s) => s.status !== "pending")
          .map((s) => [s.transactionId, s])
      );

      const newSuggestions: AiCategorySuggestion[] = results.map((r) => ({
        transactionId: r.transactionId,
        categoryGroup: r.categoryGroup,
        category: r.category,
        status: "pending",
      }));

      // Merge: keep accepted/rejected from prior run, add new pending
      const merged = new Map<string, AiCategorySuggestion>();
      for (const s of existingById.values()) merged.set(s.transactionId, s);
      for (const s of newSuggestions) merged.set(s.transactionId, s);

      setState({
        suggestions: Array.from(merged.values()),
        status: "done",
        lastRunAt: new Date().toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setState((prev) => ({ ...prev, status: "error", errorMessage: message }));
    }
  }

  function acceptSuggestion(transactionId: string) {
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) =>
        s.transactionId === transactionId ? { ...s, status: "accepted" } : s
      ),
    }));
  }

  function rejectSuggestion(transactionId: string) {
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) =>
        s.transactionId === transactionId ? { ...s, status: "rejected" } : s
      ),
    }));
  }

  function acceptAllSuggestions() {
    setState((prev) => ({
      ...prev,
      suggestions: prev.suggestions.map((s) =>
        s.status === "pending" ? { ...s, status: "accepted" } : s
      ),
    }));
  }

  function dismissSuggestions() {
    setState((prev) => ({ ...prev, status: "idle", suggestions: [] }));
  }

  function resetSuggestions() {
    setState(DEFAULT_STATE);
    localStorage.removeItem(AI_SUGGESTIONS_STORAGE_KEY);
  }

  return {
    aiSuggestions: state,
    runAiCategorization,
    acceptSuggestion,
    rejectSuggestion,
    acceptAllSuggestions,
    dismissSuggestions,
    resetSuggestions,
  };
}
