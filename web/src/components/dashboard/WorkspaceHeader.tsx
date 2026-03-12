export function WorkspaceHeader({
  title,
  subtitle,
  generatedLabel
}: {
  title: string;
  subtitle: string;
  generatedLabel: string;
}) {
  return (
    <header className="workspace-header">
      <p className="eyebrow">Personal Spend</p>
      <h2>{title}</h2>
      <p className="subtitle">{subtitle}</p>
      <p className="mode-note">{generatedLabel}</p>
    </header>
  );
}
