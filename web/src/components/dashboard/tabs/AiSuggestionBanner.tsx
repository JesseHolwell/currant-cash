export type AiBannerAuthState =
  | "unauthenticated"
  | "no-key"
  | "ready"
  | "running"
  | "done"
  | "error";

export function AiSuggestionBanner({
  authState,
  pendingCount,
  uncategorizedCount,
  errorMessage,
  onSignIn,
  onOpenApiKeyModal,
  onRunSuggestions,
  onAcceptAll,
  onDismiss,
}: {
  authState: AiBannerAuthState;
  pendingCount: number;
  uncategorizedCount: number;
  errorMessage?: string;
  onSignIn: () => void;
  onOpenApiKeyModal: () => void;
  onRunSuggestions: () => void;
  onAcceptAll: () => void;
  onDismiss: () => void;
}) {
  if (authState === "unauthenticated") {
    if (uncategorizedCount === 0) return null;
    return (
      <div className="ai-suggestion-banner ai-banner--unauthenticated">
        <span className="ai-banner-text">
          AI categorization is available for signed-in users.
        </span>
        <button type="button" className="ai-banner-action" onClick={onSignIn}>
          Sign in
        </button>
      </div>
    );
  }

  if (authState === "no-key") {
    if (uncategorizedCount === 0) return null;
    return (
      <div className="ai-suggestion-banner ai-banner--no-key">
        <span className="ai-banner-text">
          Add your OpenAI API key to enable AI suggestions.
        </span>
        <button type="button" className="ai-banner-action" onClick={onOpenApiKeyModal}>
          Set API key
        </button>
      </div>
    );
  }

  if (authState === "running") {
    return (
      <div className="ai-suggestion-banner ai-banner--running">
        <span className="ai-banner-spinner" aria-hidden="true" />
        <span className="ai-banner-text">Analysing {uncategorizedCount} transactions…</span>
      </div>
    );
  }

  if (authState === "error") {
    return (
      <div className="ai-suggestion-banner ai-banner--error">
        <span className="ai-banner-text">{errorMessage ?? "AI categorization failed."}</span>
        <button type="button" className="ai-banner-action" onClick={onRunSuggestions}>
          Retry
        </button>
      </div>
    );
  }

  if (authState === "done" && pendingCount > 0) {
    return (
      <div className="ai-suggestion-banner ai-banner--done">
        <span className="ai-banner-text">
          AI suggested {pendingCount === 1 ? "a category" : `categories for ${pendingCount} transactions`}.
          Review below or accept all.
        </span>
        <div className="ai-banner-actions">
          <button type="button" className="ai-banner-action ai-banner-action--primary" onClick={onAcceptAll}>
            Accept all
          </button>
          <button type="button" className="ai-banner-action" onClick={onDismiss}>
            Dismiss
          </button>
        </div>
      </div>
    );
  }

  // ready state (key set, not yet run)
  if (authState === "ready" && uncategorizedCount > 0) {
    return (
      <div className="ai-suggestion-banner ai-banner--ready">
        <span className="ai-banner-text">
          {uncategorizedCount} transaction{uncategorizedCount !== 1 ? "s" : ""} need{uncategorizedCount === 1 ? "s" : ""} categories.
        </span>
        <button type="button" className="ai-banner-action ai-banner-action--primary" onClick={onRunSuggestions}>
          Run AI suggestions
        </button>
      </div>
    );
  }

  return null;
}
