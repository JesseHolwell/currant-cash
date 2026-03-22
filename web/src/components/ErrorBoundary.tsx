import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render(): ReactNode {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div role="alert" className="flex flex-col items-center justify-center min-h-[70vh] text-center gap-4 p-8">
          <h2 className="font-display text-xl text-ink">Something went wrong</h2>
          <p className="text-ink-soft">An unexpected error occurred. Your data is safe — refresh the page to continue.</p>
          <details className="text-left text-sm text-muted">
            <summary className="cursor-pointer">Error details</summary>
            <pre className="mt-2 p-3 bg-[var(--bg-warm)] rounded-md overflow-auto text-xs">{this.state.error.message}</pre>
          </details>
          <button className="mode-btn active" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      );
    }
    return this.props.children;
  }
}
