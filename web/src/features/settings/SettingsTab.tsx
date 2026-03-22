import { useRef, useState, type ChangeEvent } from "react";

const CURRENT_YEAR = new Date().getFullYear();

const CURRENCY_OPTIONS = [
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "NZD", label: "NZD — New Zealand Dollar" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
];

export function SettingsTab({
  statusMessage,
  errorMessage,
  displayName,
  onDisplayNameChange,
  birthYear,
  onBirthYearChange,
  currency,
  onCurrencyChange,
  isSignedIn,
  userEmail,
  onSignOut,
  onDeleteAllData,
  onExportAllData,
  onImportData,
}: {
  statusMessage: string | null;
  errorMessage: string | null;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  birthYear: number;
  onBirthYearChange: (year: number) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  isSignedIn: boolean;
  userEmail: string | null;
  onSignOut: () => void;
  onDeleteAllData: () => Promise<void>;
  onExportAllData: () => void;
  onImportData: (file: File) => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [birthYearDraft, setBirthYearDraft] = useState<string>(birthYear > 0 ? String(birthYear) : "");

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    await onImportData(file);
    event.target.value = "";
  }

  const currentAge = birthYear > 0 ? CURRENT_YEAR - birthYear : null;

  return (
    <>
      <section className="panel settings-panel">
        <h3>Profile</h3>
        {userEmail && (
          <div className="settings-signed-in-row">
            <p className="settings-signed-in-as">
              Signed in as <strong>{userEmail}</strong>
            </p>
            <button type="button" className="mode-btn" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        )}
        <p className="mode-note">
          Used to personalise the app and power calculations.
        </p>

        <div className="settings-profile-grid">
          <label className="settings-profile-field">
            <span className="settings-field-label">Display name</span>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="Your name"
              value={displayName}
              onChange={(e) => onDisplayNameChange(e.target.value)}
            />
          </label>

          <label className="settings-profile-field">
            <span className="settings-field-label">Currency</span>
            <select
              value={currency}
              onChange={(e) => onCurrencyChange(e.target.value)}
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="settings-profile-field">
            <span className="settings-field-label">Birth year</span>
            <input
              type="number"
              inputMode="numeric"
              min={1920}
              max={CURRENT_YEAR - 10}
              placeholder="e.g. 1990"
              value={birthYearDraft}
              onChange={(e) => setBirthYearDraft(e.target.value)}
              onBlur={() => {
                const val = Number(birthYearDraft);
                onBirthYearChange(
                  val >= 1920 && val <= CURRENT_YEAR - 10 ? val : 0,
                );
              }}
            />
            {currentAge !== null && (
              <span className="settings-field-hint">Age: {currentAge}</span>
            )}
          </label>
        </div>
      </section>

      <section className="panel settings-panel">
        <h3>Support</h3>
        <p className="mode-note">
          Currant is open source.{" "}
          <a
            href="https://github.com/JesseHolwell/personal-spend/issues"
            target="_blank"
            rel="noopener noreferrer"
          >
            Raise an issue on GitHub
          </a>{" "}
          if you run into a bug or have a feature request.
        </p>
      </section>

      <section className="panel settings-panel">
        <section className="settings-note">
          <h3>Browser Storage</h3>
          <p>
            Everything in Currant lives in this browser only. No data is sent to
            a server. If you clear browser storage, switch browsers, or use a
            fresh profile, your data will be lost unless you export a backup
            first.
          </p>
        </section>

        {statusMessage ? <p className="mode-note">{statusMessage}</p> : null}
        {errorMessage ? <p className="error">{errorMessage}</p> : null}

        <section className="settings-actions">
          <article className="settings-action-card settings-action-card--danger">
            <h4>Delete All My Data</h4>
            <p>
              {isSignedIn
                ? "Permanently delete all your data from this device and from the cloud. This cannot be undone."
                : "Permanently delete all your data from this browser. This cannot be undone."}
            </p>
            <button
              type="button"
              className="mode-btn mode-btn--danger"
              onClick={() => {
                void onDeleteAllData();
              }}
            >
              Delete All My Data
            </button>
          </article>

          <article className="settings-action-card">
            <h4>Export All My Data</h4>
            <p>
              Download a JSON backup containing your CSV batches, rules,
              accounts, goals, payroll config, and forecast settings.
            </p>
            <button
              type="button"
              className="mode-btn active"
              onClick={onExportAllData}
            >
              Export All My Data
            </button>
          </article>

          <article className="settings-action-card">
            <h4>Import Data</h4>
            <p>Restore a previously exported JSON backup into this browser.</p>
            <button
              type="button"
              className="mode-btn"
              onClick={() => fileInputRef.current?.click()}
            >
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
    </>
  );
}
