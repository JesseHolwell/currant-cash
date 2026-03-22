export function WorkspaceHeader({
  title,
  subtitle,
  generatedLabel,
  isSampleMode,
}: {
  title: string;
  subtitle: string;
  generatedLabel: string;
  isSampleMode?: boolean;
}) {
  return (
    <header className="bg-surface border border-line border-l-[3px] border-l-accent rounded-lg px-[1.35rem] py-[1.15rem] shadow-soft">
      <div className="flex items-center gap-2 mb-[0.3rem]">
        <h2 className="font-display text-[clamp(1.6rem,2.5vw,2.3rem)] tracking-[-0.04em] text-ink">{title}</h2>
        {isSampleMode ? <span className="sample-mode-badge">Sample Preview</span> : null}
      </div>
      <p className="text-ink-soft max-w-[70ch] text-[0.9rem]">{subtitle}</p>
      <p className="text-muted text-[0.82rem] mt-[0.42rem]">{generatedLabel}</p>
    </header>
  );
}
