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
    // min-h-screen flex flex-col items-center, bg from --bg-main token
    <div className="min-h-screen flex flex-col items-center bg-bg text-ink">
      {/* ── Nav header ── */}
      {/*
        Keep landing-nav / landing-nav--scrolled as CSS classes:
        they have a transition on padding, backdrop-filter, box-shadow, and
        border-color that is impractical to replicate inline.
      */}
      <nav className={`landing-nav${scrolled ? " landing-nav--scrolled" : ""}`}>
        {/* brand left: flex row, vertically centred, gap */}
        <div className="flex items-center gap-2.5">
          {/*
            brand-mark / brand-leaf / brand-berry* are intricate SVG-like
            pseudo-element shapes defined in CSS — keep as CSS classes.
          */}
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
          {/*
            landing-nav-wordmark keeps its CSS class because it uses a
            gradient background-clip text technique with --berry-highlight
            which can't be expressed cleanly in Tailwind arbitrary values.
          */}
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

        {/* nav actions: flex row, vertically centred, gap */}
        <div className="flex items-center gap-2">
          {onBack ? (
            <button
              type="button"
              className="landing-btn-ghost"
              onClick={onBack}
            >
              ← Back to dashboard
            </button>
          ) : null}
          {/* Log in — plain text button */}
          <button
            type="button"
            className="px-4 py-2 bg-transparent border-none text-[0.9375rem] font-medium text-ink-soft cursor-pointer rounded-md transition-colors duration-150 hover:text-ink"
            onClick={onLogIn}
          >
            Log in
          </button>
          {/*
            landing-btn-primary keeps its CSS class because it carries a
            box-shadow with the berry colour and hover lift animation.
            landing-nav-signup only adjusts padding/font-size — inline it.
          */}
          <button
            type="button"
            className="landing-btn-primary px-[1.125rem] py-2 text-[0.9375rem]"
            onClick={onSignUp}
          >
            Sign up
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      {/* width: min(720px, 92vw), centred, flex col, text-center, gap */}
      <header className="w-[min(720px,92vw)] mx-auto mt-14 mb-16 flex flex-col items-center text-center gap-5">
        {/*
          landing-hero-brand keeps its CSS class: clamp font-size,
          gradient background-clip text, and will-change.
        */}
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

        {/* Tagline */}
        <p className="m-0 text-[1.375rem] font-semibold text-ink tracking-[-0.02em]">
          Financial Health, Naturally Preserved.
        </p>

        {/* Description */}
        <p className="m-0 text-base text-ink-soft leading-[1.65] max-w-[560px]">
          An offline-first dashboard for your bank CSVs. Track net worth,
          expenses, and FIRE projections without ever creating an account or
          linking a bank.
        </p>

        {/* CTA group */}
        <div className="flex flex-wrap justify-center gap-3 mt-2">
          <button
            type="button"
            className="landing-btn-primary"
            onClick={onContinueFree}
          >
            Continue for free
          </button>
          {/* landing-btn-secondary keeps its CSS class: accent border colour + hover fill */}
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
      {/* width: min(1000px, 92vw), centred, bottom margin */}
      <section className="w-[min(1000px,92vw)] mx-auto mb-20">
        {/* Section title: Fraunces, 1.75rem, -0.03em tracking */}
        <h2 className="mt-0 mb-5 font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Everything you need
        </h2>

        {/* Features grid: auto-fill minmax(280px, 1fr) */}
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-[var(--panel-strong)] border border-line rounded-lg px-6 py-5 flex flex-col gap-2 shadow-soft"
            >
              <span className="text-2xl leading-none" aria-hidden="true">
                {feature.icon}
              </span>
              <h3 className="m-0 text-base font-bold tracking-[-0.02em] text-ink">
                {feature.title}
              </h3>
              <p className="m-0 text-[0.875rem] text-ink-soft leading-[1.6]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Free vs Premium ── */}
      <section className="w-[min(1000px,92vw)] mx-auto mb-20">
        <h2 className="mt-0 mb-5 font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Free vs Premium
        </h2>
        <p className="mt-[-0.75rem] mb-6 text-ink-soft text-[0.9375rem]">
          The free tier is fully featured offline. Premium adds cloud sync and
          AI.
        </p>

        {/* Scrollable table wrapper */}
        <div className="overflow-x-auto rounded-lg border border-line shadow-soft">
          <table className="w-full border-collapse text-[0.9rem] bg-[var(--panel-strong)] rounded-lg overflow-hidden">
            <thead className="bg-sidebar border-b border-line">
              <tr>
                {/* Feature column header: 60% wide, uppercase label */}
                <th className="w-3/5 px-4 py-3 text-left font-semibold text-[0.8rem] tracking-[0.08em] uppercase text-muted">
                  Feature
                </th>
                {/* Tier column headers: centred, bold */}
                <th className="px-4 py-3 text-center font-bold text-[0.875rem] text-ink">
                  Free
                </th>
                <th className="px-4 py-3 text-center font-bold text-[0.875rem] text-accent">
                  Premium
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr
                  key={row.feature}
                  className="border-b border-line last:border-b-0 hover:bg-[var(--accent-soft)]"
                >
                  <td className="px-4 py-3 text-left">{row.feature}</td>
                  <td className="px-4 py-3 text-center text-[0.9rem] font-semibold text-ink-soft">
                    {row.free ? "✓" : "—"}
                  </td>
                  <td className="px-4 py-3 text-center text-[0.9rem] font-semibold text-accent">
                    {row.premium ? "✓" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section className="w-[min(1000px,92vw)] mx-auto mb-16 flex flex-col items-center text-center gap-6">
        <h2 className="mt-0 mb-5 font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">
          Ready to start?
        </h2>
        <div className="flex flex-wrap justify-center gap-3 mt-2">
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

      {/* Footer */}
      <footer className="w-full text-center px-4 pt-6 pb-8 text-muted text-[0.8125rem] border-t border-line">
        <p>
          © {new Date().getFullYear()} Currant · Built for financial clarity
        </p>
      </footer>
    </div>
  );
}
