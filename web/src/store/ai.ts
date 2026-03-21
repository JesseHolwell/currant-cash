import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchAiCategorySuggestions } from "../lib/openai";
import { AI_SUGGESTIONS_STORAGE_KEY } from "../domain";
import type { AiCategorySuggestion, AiSuggestionsState, RawTransaction } from "../domain";

interface AiState {
  suggestions: AiCategorySuggestion[];
  status: AiSuggestionsState["status"];
  lastRunAt: string | null;
  errorMessage?: string;
  runCategorization: (
    apiKey: string,
    uncategorized: RawTransaction[],
    taxonomy: Map<string, string[]>
  ) => Promise<void>;
  acceptSuggestion: (transactionId: string) => void;
  rejectSuggestion: (transactionId: string) => void;
  acceptAll: () => void;
  dismiss: () => void;
  reset: () => void;
}

const DEFAULT_STATE = {
  suggestions: [] as AiCategorySuggestion[],
  status: "idle" as AiSuggestionsState["status"],
  lastRunAt: null as string | null,
  errorMessage: undefined as string | undefined
};

export const useAiStore = create<AiState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      runCategorization: async (apiKey, uncategorized, taxonomy) => {
        if (!apiKey.trim() || uncategorized.length === 0) return;
        set({ status: "running", errorMessage: undefined });
        try {
          const results = await fetchAiCategorySuggestions(apiKey, uncategorized, taxonomy);
          const existingById = new Map(
            get()
              .suggestions.filter((s) => s.status !== "pending")
              .map((s) => [s.transactionId, s])
          );
          const merged = new Map<string, AiCategorySuggestion>(existingById);
          for (const r of results) {
            merged.set(r.transactionId, {
              transactionId: r.transactionId,
              categoryGroup: r.categoryGroup,
              category: r.category,
              status: "pending"
            });
          }
          set({
            suggestions: Array.from(merged.values()),
            status: "done",
            lastRunAt: new Date().toISOString()
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "An unexpected error occurred.";
          set({ status: "error", errorMessage: message });
        }
      },

      acceptSuggestion: (transactionId) =>
        set((state) => ({
          suggestions: state.suggestions.map((s) =>
            s.transactionId === transactionId ? { ...s, status: "accepted" } : s
          )
        })),

      rejectSuggestion: (transactionId) =>
        set((state) => ({
          suggestions: state.suggestions.map((s) =>
            s.transactionId === transactionId ? { ...s, status: "rejected" } : s
          )
        })),

      acceptAll: () =>
        set((state) => ({
          suggestions: state.suggestions.map((s) =>
            s.status === "pending" ? { ...s, status: "accepted" } : s
          )
        })),

      dismiss: () => set({ status: "idle", suggestions: [] }),

      reset: () => {
        set(DEFAULT_STATE);
        localStorage.removeItem(AI_SUGGESTIONS_STORAGE_KEY);
      }
    }),
    {
      name: AI_SUGGESTIONS_STORAGE_KEY,
      partialize: (state) => ({
        suggestions: state.suggestions,
        status: state.status,
        lastRunAt: state.lastRunAt,
        errorMessage: state.errorMessage
      }),
      merge: (persisted, current) => {
        try {
          const raw = persisted as Partial<AiSuggestionsState>;
          if (!Array.isArray(raw?.suggestions)) return current;
          const suggestions: AiCategorySuggestion[] = raw.suggestions.filter(
            (s): s is AiCategorySuggestion =>
              s &&
              typeof s.transactionId === "string" &&
              typeof s.categoryGroup === "string" &&
              typeof s.category === "string" &&
              (s.status === "pending" || s.status === "accepted" || s.status === "rejected")
          );
          const rawStatus = raw.status;
          const status: AiSuggestionsState["status"] =
            rawStatus === "done" || rawStatus === "error" || rawStatus === "idle"
              ? rawStatus
              : "idle"; // treat "running" as idle on reload
          return {
            ...current,
            suggestions,
            status,
            lastRunAt: typeof raw.lastRunAt === "string" ? raw.lastRunAt : null,
            errorMessage:
              typeof raw.errorMessage === "string" ? raw.errorMessage : undefined
          };
        } catch {
          return current;
        }
      }
    }
  )
);
