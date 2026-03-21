import { useAiStore } from "../store";

export function useAiSuggestions() {
  const {
    suggestions,
    status,
    lastRunAt,
    errorMessage,
    runCategorization,
    acceptSuggestion,
    rejectSuggestion,
    acceptAll,
    dismiss,
    reset
  } = useAiStore();

  return {
    aiSuggestions: { suggestions, status, lastRunAt, errorMessage },
    runAiCategorization: runCategorization,
    acceptSuggestion,
    rejectSuggestion,
    acceptAllSuggestions: acceptAll,
    dismissSuggestions: dismiss,
    resetSuggestions: reset
  };
}
