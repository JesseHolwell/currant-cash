import { useRef, type ChangeEvent } from "react";

export function SettingsTab({
  statusMessage,
  errorMessage,
  onResetAllData,
  onExportAllData,
  onImportData
}: {
  statusMessage: string | null;
  errorMessage: string | null;
  onResetAllData: () => void;
  onExportAllData: () => void;
  onImportData: (file: File) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await onImportData(file);
    event.target.value = "";
  }

  return (
    <section className="panel settings-panel">
      <section className="settings-note">
        <h3>Browser Storage</h3>
        <p>
          Everything in Spendboard lives in this browser only. No data is sent to a server. If you clear browser storage,
          switch browsers, or use a fresh profile, your data will be lost unless you export a backup first.
        </p>
      </section>

      {statusMessage ? <p className="mode-note">{statusMessage}</p> : null}
      {errorMessage ? <p className="error">{errorMessage}</p> : null}

      <section className="settings-actions">
        <article className="settings-action-card">
          <h4>Clear All Data</h4>
          <p>Restore the app to its built-in defaults and remove imported CSV data and local edits.</p>
          <button type="button" className="mode-btn" onClick={onResetAllData}>
            Clear All Data
          </button>
        </article>

        <article className="settings-action-card">
          <h4>Export All My Data</h4>
          <p>Download a JSON backup containing your CSV batches, rules, accounts, goals, payroll config, and forecast settings.</p>
          <button type="button" className="mode-btn active" onClick={onExportAllData}>
            Export All My Data
          </button>
        </article>

        <article className="settings-action-card">
          <h4>Import Data</h4>
          <p>Restore a previously exported JSON backup into this browser.</p>
          <button type="button" className="mode-btn" onClick={() => fileInputRef.current?.click()}>
            Import Data
          </button>
          <input
            ref={fileInputRef}
            className="settings-file-input"
            type="file"
            accept="application/json,.json"
            onChange={handleFileChange}
          />
        </article>
      </section>
    </section>
  );
}
