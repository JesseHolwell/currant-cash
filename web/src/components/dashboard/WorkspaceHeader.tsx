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
    <header className="workspace-header">
      <div className="workspace-header-title-row">
        <h2>{title}</h2>
        {isSampleMode ? <span className="sample-mode-badge">Sample Preview</span> : null}
      </div>
      <p className="subtitle">{subtitle}</p>
      <p className="mode-note">{generatedLabel}</p>
    </header>
  );
}
