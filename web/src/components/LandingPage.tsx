type LandingPageProps = {
  onContinueFree: () => void;
  onSignUp: () => void;
  onLogIn: () => void;
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
  onBack,
}: LandingPageProps) {
  return (
    <div className="landing">
      {onBack ? (
        <div className="landing-back-bar">
          <button type="button" className="landing-btn-ghost" onClick={onBack}>
            ← Back to dashboard
          </button>
        </div>
      ) : null}
      {/* ── Hero ── */}
      <header className="landing-hero">
        <div className="landing-brand">
          <div className="brand-mark" aria-hidden="true">
            <span className="brand-leaf" />
            <span className="brand-berry brand-berry-top" />
            <span className="brand-berry brand-berry-left" />
            <span className="brand-berry brand-berry-right" />
          </div>
          <h1 className="landing-wordmark">Currant</h1>
        </div>
        <p className="landing-tagline">Your personal finance command centre</p>
        <p className="landing-description">
          Upload bank CSVs, model your salary, visualise your spending, forecast
          your net worth, and plan your path to financial independence — all in
          one beautiful dashboard.
        </p>
        <div className="landing-cta-group">
          <button
            type="button"
            className="landing-btn-primary"
            onClick={onSignUp}
          >
            Sign up free
          </button>
          <button
            type="button"
            className="landing-btn-secondary"
            onClick={onLogIn}
          >
            Log in
          </button>
          <button
            type="button"
            className="landing-btn-ghost"
            onClick={onContinueFree}
          >
            Continue with free tier →
          </button>
        </div>
        <p className="landing-free-note">
          No account required for the free tier — everything runs locally in
          your browser.
        </p>
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
            onClick={onSignUp}
          >
            Create free account
          </button>
          <button
            type="button"
            className="landing-btn-ghost"
            onClick={onContinueFree}
          >
            Skip — use offline
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
