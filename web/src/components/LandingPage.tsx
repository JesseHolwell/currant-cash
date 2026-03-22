import { useEffect, useState } from "react";

type LandingPageProps = {
  onContinueFree: () => void;
  onSignUp: () => void;
  onLogIn: () => void;
  onPreviewSample: () => void;
  onBack?: () => void;
};

const FEATURES = [
  {
    icon: "📈",
    title: "Net Worth Forecast",
    description:
      "Project your net worth trajectory months ahead with a live chart driven by your actual cash flow.",
  },
  {
    icon: "🌊",
    title: "Expense Flow",
    description:
      "Sankey diagram that maps your income to categories — instantly see where every dollar goes.",
  },
  {
    icon: "🔥",
    title: "FIRE Insights",
    description:
      "Calculate your FIRE number, projected retirement age, and savings rate with configurable assumptions.",
  },
  {
    icon: "🏷️",
    title: "Auto-categorisation",
    description:
      "AI-powered first-pass category suggestions on CSV upload with one-click rule creation.",
  },
  {
    icon: "🏦",
    title: "Accounts & Goals",
    description:
      "Track assets and liabilities, set savings goals, and watch progress bars fill as you save.",
  },
  {
    icon: "🔒",
    title: "Privacy first",
    description:
      "Free tier works entirely offline in your browser — no data ever leaves your device unless you choose cloud sync.",
  },
];

const COMPARISON = [
  { feature: "Forecast & expense analysis", free: true, premium: true },
  { feature: "Accounts & goals", free: true, premium: true },
  { feature: "Income modelling", free: true, premium: true },
  { feature: "CSV upload & categorisation rules", free: true, premium: true },
  { feature: "Data export / import", free: true, premium: true },
  { feature: "FIRE Insights tab", free: true, premium: true },
  { feature: "Cloud sync across devices", free: false, premium: true },
  { feature: "AI auto-categorisation", free: false, premium: true },
];

export function LandingPage({
  onContinueFree,
  onSignUp,
  onLogIn,
  onPreviewSample,
  onBack,
}: LandingPageProps) {
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const FADE_START = 50;
    const FADE_END = 150;
    const onScroll = () => {
      const scrollY = window.scrollY;
      const p = Math.min(
        1,
        Math.max(0, (scrollY - FADE_START) / (FADE_END - FADE_START)),
      );
      setProgress(p);
      setScrolled(scrollY > 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="landing">
      {/* ── Nav header ── */}
      <nav className={`landing-nav${scrolled ? " landing-nav--scrolled" : ""}`}>
        <div className="landing-nav-brand">
          <div
            className="brand-mark"
            aria-hidden="true"
            style={{
              transform: `scale(${1 - 0.5 * progress})`,
              transformOrigin: "left center",
              marginRight: `${-28 * progress}px`,
            }}
          >
            <span className="brand-leaf" />
            <span className="brand-berry brand-berry-top" />
            <span className="brand-berry brand-berry-left" />
            <span className="brand-berry brand-berry-right" />
          </div>
          <span
            className="landing-nav-wordmark"
            style={{
              opacity: progress,
              transform: `translateY(${(1 - progress) * 6}px)`,
            }}
          >
            Currant
          </span>
        </div>
        <div className="landing-nav-actions">
          {onBack ? (
            <button
              type="button"
              className="landing-btn-ghost"
              onClick={onBack}
            >
              ← Back to dashboard
            </button>
          ) : null}
          <button type="button" className="landing-nav-login" onClick={onLogIn}>
            Log in
          </button>
          <button
            type="button"
            className="landing-btn-primary landing-nav-signup"
            onClick={onSignUp}
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <header className="landing-hero">
        <h1
          className="landing-hero-brand"
          aria-hidden="true"
          style={{
            opacity: 1 - progress,
            transform: `translateY(${-14 * progress}px)`,
          }}
        >
          Currant
        </h1>
        <p className="landing-tagline">
          Financial Health, Naturally Preserved.
        </p>
        <p className="landing-description">
          An offline-first dashboard for your bank CSVs. Track net worth,
          expenses, and FIRE projections without ever creating an account or
          linking a bank.
        </p>
        <div className="landing-cta-group">
          <button
            type="button"
            className="landing-btn-primary"
            onClick={onContinueFree}
          >
            Continue for free
          </button>
          <button
            type="button"
            className="landing-btn-secondary"
            onClick={onPreviewSample}
          >
            Preview with sample data
          </button>
        </div>
      </header>

      {/* ── Feature Highlights ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">Everything you need</h2>
        <div className="landing-features">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="landing-feature-card">
              <span className="landing-feature-icon" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="landing-feature-title">{feature.title}</h3>
              <p className="landing-feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free vs Premium ── */}
      <section className="landing-section">
        <h2 className="landing-section-title">Free vs Premium</h2>
        <p className="landing-section-subtitle">
          The free tier is fully featured offline. Premium adds cloud sync and
          AI.
        </p>
        <div className="landing-pricing">
          <table className="landing-comparison-table">
            <thead>
              <tr>
                <th className="landing-col-feature">Feature</th>
                <th className="landing-col-tier">Free</th>
                <th className="landing-col-tier landing-col-premium">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <td>{row.feature}</td>
                  <td className="landing-cell-check">{row.free ? "✓" : "—"}</td>
                  <td className="landing-cell-check landing-cell-premium">
                    {row.premium ? "✓" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="landing-section landing-section-bottom">
        <h2 className="landing-section-title">Ready to start?</h2>
        <div className="landing-cta-group">
          <button
            type="button"
            className="landing-btn-primary"
            onClick={onContinueFree}
          >
            Continue for free
          </button>
          <button
            type="button"
            className="landing-btn-secondary"
            onClick={onPreviewSample}
          >
            Preview with sample data
          </button>
        </div>
      </section>

      <footer className="landing-footer">
        <p>
          © {new Date().getFullYear()} Currant · Built for financial clarity
        </p>
      </footer>
    </div>
  );
}
