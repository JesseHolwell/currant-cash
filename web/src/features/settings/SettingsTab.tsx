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

const inputCls = "border border-line-strong bg-surface text-ink rounded-sm pl-[0.6rem] pr-8 py-[0.45rem] text-[0.83rem] focus:outline-none focus:border-[var(--accent-border)] focus:shadow-[0_0_0_3px_var(--accent-ring)] w-full";

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
  onRestartOnboarding,
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
  onRestartOnboarding: () => void;
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
      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <h3 className="font-display text-base tracking-[-0.02em] text-ink">Profile</h3>
        {userEmail && (
          <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
            <p className="text-ink-soft text-[0.88rem]">
              Signed in as <strong className="text-ink">{userEmail}</strong>
            </p>
            <button type="button" className="mode-btn" onClick={onSignOut}>
              Sign out
            </button>
          </div>
        )}
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Used to personalise the app and power calculations.
        </p>

        <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[0.85rem] mt-4">
          <label className="grid gap-[0.35rem]">
            <span className="text-[0.84rem] text-ink font-bold">Display name</span>
            <input
              type="text"
              autoComplete="given-name"
              placeholder="Your name"
              value={displayName}
              className={inputCls}
              onChange={(e) => onDisplayNameChange(e.target.value)}
            />
          </label>

          <label className="grid gap-[0.35rem]">
            <span className="text-[0.84rem] text-ink font-bold">Currency</span>
            <select
              value={currency}
              className={inputCls}
              onChange={(e) => onCurrencyChange(e.target.value)}
            >
              {CURRENCY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-[0.35rem]">
            <span className="text-[0.84rem] text-ink font-bold">Birth year</span>
            <input
              type="number"
              inputMode="numeric"
              min={1920}
              max={CURRENT_YEAR - 10}
              placeholder="e.g. 1990"
              value={birthYearDraft}
              className={inputCls}
              onChange={(e) => setBirthYearDraft(e.target.value)}
              onBlur={() => {
                const val = Number(birthYearDraft);
                onBirthYearChange(
                  val >= 1920 && val <= CURRENT_YEAR - 10 ? val : 0,
                );
              }}
            />
            {currentAge !== null && (
              <span className="text-muted text-[0.75rem]">Age: {currentAge}</span>
            )}
          </label>
        </div>
        <div className="mt-4 pt-4 border-t border-line">
          <button type="button" className="mode-btn" onClick={onRestartOnboarding}>
            Re-do onboarding
          </button>
        </div>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <h3 className="font-display text-base tracking-[-0.02em] text-ink">Support</h3>
        <p className="text-muted text-[0.82rem] mt-[0.42rem]">
          Currant is open source.{" "}
          <a
            href="https://github.com/JesseHolwell/personal-spend/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-accent underline hover:opacity-80"
          >
            Raise an issue on GitHub
          </a>{" "}
          if you run into a bug or have a feature request.
        </p>
      </section>

      <section className="border border-line rounded-md p-4 bg-surface shadow-soft min-w-0">
        <div className="mb-4">
          <h3 className="font-display text-base tracking-[-0.02em] text-ink">Browser Storage</h3>
          <p className="text-ink-soft text-[0.88rem] mt-2">
            Everything in Currant lives in this browser only. No data is sent to
            a server. If you clear browser storage, switch browsers, or use a
            fresh profile, your data will be lost unless you export a backup
            first.
          </p>
        </div>

        {statusMessage ? <p className="text-muted text-[0.82rem] mt-[0.42rem]">{statusMessage}</p> : null}
        {errorMessage ? <p className="text-danger text-sm mt-2">{errorMessage}</p> : null}

        <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-[0.85rem] mt-4">
          <article className="border border-danger/30 bg-danger-soft rounded-md p-4">
            <h4 className="font-semibold text-danger text-[0.92rem]">Delete All My Data</h4>
            <p className="text-ink-soft text-[0.83rem] mt-1 mb-3">
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

          <article className="border border-line rounded-md p-4 bg-surface hover:border-line-strong transition-colors">
            <h4 className="font-semibold text-ink text-[0.92rem]">Export All My Data</h4>
            <p className="text-ink-soft text-[0.83rem] mt-1 mb-3">
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

          <article className="border border-line rounded-md p-4 bg-surface hover:border-line-strong transition-colors">
            <h4 className="font-semibold text-ink text-[0.92rem]">Import Data</h4>
            <p className="text-ink-soft text-[0.83rem] mt-1 mb-3">Restore a previously exported JSON backup into this browser.</p>
            <button
              type="button"
              className="mode-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              Import Data
            </button>
            <input
              ref={fileInputRef}
              className="hidden"
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
            />
          </article>
        </div>
      </section>
    </>
  );
}
