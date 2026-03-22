import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../../lib/supabase";

export function AppNav({
  user,
  isDark,
  onToggleTheme,
  onSignIn,
  onGoHome,
  onGoToSettings,
}: {
  user: User | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onGoHome: () => void;
  onGoToSettings: () => void;
}) {
  const avatarInitial = user?.email?.charAt(0).toUpperCase() ?? "?";
  const avatarUrl = user?.user_metadata?.["avatar_url"] as string | undefined;

  return (
    <nav className="app-nav">
      <button
        type="button"
        className="app-nav-brand"
        onClick={onGoHome}
        aria-label="Go to home"
      >
        <div className="brand-mark brand-mark-sm" aria-hidden="true">
          <span className="brand-leaf" />
          <span className="brand-berry brand-berry-top" />
          <span className="brand-berry brand-berry-left" />
          <span className="brand-berry brand-berry-right" />
        </div>
        <span className="app-nav-wordmark">Currant</span>
      </button>

      <div className="app-nav-actions">
        <button
          type="button"
          className="app-nav-icon-btn"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? "☀" : "☾"}
        </button>
        {isSupabaseConfigured ? (
          user ? (
            <button
              type="button"
              className="app-nav-avatar"
              onClick={onGoToSettings}
              aria-label="Settings"
              title="Settings"
            >
              {avatarUrl ? <img src={avatarUrl} alt="" /> : avatarInitial}
            </button>
          ) : (
            <>
              <button
                type="button"
                className="app-nav-icon-btn"
                onClick={onGoToSettings}
                aria-label="Settings"
                title="Settings"
              >
                ⚙
              </button>
              <button
                type="button"
                className="app-nav-sign-in"
                onClick={onSignIn}
              >
                Sign in
              </button>
            </>
          )
        ) : (
          <button
            type="button"
            className="app-nav-icon-btn"
            onClick={onGoToSettings}
            aria-label="Settings"
            title="Settings"
          >
            ⚙
          </button>
        )}
      </div>
    </nav>
  );
}
