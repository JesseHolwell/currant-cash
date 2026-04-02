import './AppNav.css';
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "../../lib/supabase";

export function AppNav({
  user,
  isDark,
  onToggleTheme,
  onSignIn,
  onGoHome,
  onGoToSettings,
  onToggleMobileNav,
  isMobileNavOpen = false,
}: {
  user: User | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onGoHome: () => void;
  onGoToSettings: () => void;
  onToggleMobileNav?: () => void;
  isMobileNavOpen?: boolean;
}) {
  const avatarInitial = user?.email?.charAt(0).toUpperCase() ?? "?";
  const avatarUrl = user?.user_metadata?.["avatar_url"] as string | undefined;

  return (
    <nav className="sticky top-0 z-20 w-full h-[var(--app-nav-height)] flex items-center justify-between px-4 sm:px-6 bg-[var(--bg-main)] border-b border-line">
      <div className="flex items-center gap-2 min-w-0">
        {onToggleMobileNav ? (
          <button
            type="button"
            className="app-nav-mobile-menu"
            onClick={onToggleMobileNav}
            aria-label={isMobileNavOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-controls="mobile-dashboard-navigation"
            aria-expanded={isMobileNavOpen}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              {isMobileNavOpen ? (
                <>
                  <path d="M4.5 4.5l9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d="M3.5 5.25h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M3.5 9h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  <path d="M3.5 12.75h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        ) : null}

        <button
          type="button"
          className="flex items-center gap-[0.6rem] bg-none border-0 px-2 py-1 cursor-pointer rounded-md transition-opacity hover:opacity-75 min-w-0"
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
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="app-nav-icon-btn"
          onClick={onToggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <circle cx="8" cy="8" r="3" fill="currentColor"/>
              <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M13.5 10.5A6.5 6.5 0 0 1 5.5 2.5a6.5 6.5 0 1 0 8 8Z" fill="currentColor"/>
            </svg>
          )}
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
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
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
