import '../onboarding/OnboardingWizard.css';
import './MonthlyCheckInWizard.css';
import { useState } from "react";
import { AppNav } from "../dashboard/AppNav";
import { formatCurrency } from "../../domain";
import type { AccountEntry } from "../../domain";
import type { User } from "@supabase/supabase-js";

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  {
    label: "Balances",
    title: "Update your account balances",
    subtitle: "Enter current balances to keep your net worth and forecast accurate.",
    why: "Accurate balances power your forecast, FIRE number, and goal progress tracking. Even a rough update makes a big difference.",
  },
  {
    label: "Import",
    title: "Import new transactions",
    subtitle: "Upload a CSV from your bank to bring your spending data up to date.",
    why: "Fresh transactions keep your Expenses view current and ensure all new spending gets correctly categorized.",
  },
  {
    label: "Categorize",
    title: "Review categories",
    subtitle: "Make sure new transactions are correctly categorized.",
    why: "Correct categories ensure your Expenses Sankey and spending patterns reflect reality.",
  },
] as const;

const TOTAL_STEPS = STEPS.length;

// ─── Wizard shell ─────────────────────────────────────────────────────────────

type ShellProps = {
  step: number;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  onExit: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  children: React.ReactNode;
};

function CheckInShell({
  step,
  onBack,
  onSkip,
  onNext,
  onExit,
  nextLabel = "Next",
  nextDisabled,
  children,
}: ShellProps) {
  const meta = STEPS[step];

  return (
    <div className="flex-1 flex items-start justify-center px-4 pt-10 pb-16">
      <div className="w-full max-w-[680px] flex flex-col">
        {/* Progress */}
        <div className="flex items-center gap-3 mb-10">
          <div className="flex-1 flex gap-1">
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className={`onboarding-progress-segment ${i <= step ? "is-active" : ""}`}
              />
            ))}
          </div>
          <span className="text-[0.72rem] font-semibold tracking-[0.06em] text-muted whitespace-nowrap">
            STEP {step + 1} OF {TOTAL_STEPS}
          </span>
          <span className="text-[0.72rem] font-bold tracking-[0.08em] text-accent whitespace-nowrap">
            {meta.label.toUpperCase()}
          </span>
          <button
            type="button"
            className="bg-none border-none text-muted text-[0.72rem] cursor-pointer py-1 pl-3 border-l border-line transition-colors duration-150 hover:text-ink-soft whitespace-nowrap"
            onClick={onExit}
          >
            ← Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-[clamp(1.75rem,4vw,2.5rem)] font-bold text-ink m-0 mb-2 leading-[1.15]">
            {meta.title}
          </h1>
          <p className="text-ink-soft text-[0.95rem] m-0 max-w-[480px] mx-auto">
            {meta.subtitle}
          </p>
        </div>

        {/* Body */}
        <div className="bg-surface border border-line rounded-xl p-7 mb-5 shadow-soft">
          {children}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mb-4">
          {step > 0 ? (
            <button
              type="button"
              className="bg-none border-none text-muted text-[0.875rem] cursor-pointer py-2 px-0 transition-colors duration-150 hover:text-ink-soft"
              onClick={onBack}
            >
              ← Back
            </button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="bg-none border-none text-ink-soft text-[0.875rem] cursor-pointer py-2 px-0 underline underline-offset-[3px] transition-colors duration-150 hover:text-ink"
              onClick={onSkip}
            >
              Skip for now
            </button>
            <button
              type="button"
              className="onboarding-btn-primary"
              onClick={onNext}
              disabled={nextDisabled}
            >
              {nextLabel} →
            </button>
          </div>
        </div>

        {/* Why this matters */}
        <div className="flex items-start gap-[0.6rem] bg-accent-soft border border-accent rounded-lg px-4 py-[0.875rem] mt-1">
          <span className="text-base text-accent shrink-0 mt-px" aria-hidden="true">ℹ</span>
          <p className="m-0 text-[0.82rem] text-ink-soft leading-[1.5]">
            <strong>Why this matters:</strong> {meta.why}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 0: Balances ─────────────────────────────────────────────────────────

function BalancesStep({
  accountEntries,
  currency,
  onUpdateAccount,
}: {
  accountEntries: AccountEntry[];
  currency: string;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
}) {
  if (accountEntries.length === 0) {
    return (
      <p className="text-center text-ink-soft text-[0.875rem] py-4">
        No accounts configured yet. Head to the Accounts tab to add them.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="checkin-accounts-header">
        <span>Account</span>
        <span>Current balance</span>
      </div>
      {accountEntries.map((acct) => (
        <div key={acct.id} className="checkin-account-row">
          <div className="checkin-account-info">
            <span className="checkin-account-name">{acct.name || "Unnamed account"}</span>
            <span className="checkin-account-meta">{acct.bucket} · {acct.kind}</span>
          </div>
          <div className="onboarding-currency-input checkin-account-input-wrap">
            <span>{currency}</span>
            <input
              type="number"
              value={acct.value}
              onChange={(e) => onUpdateAccount(acct.id, { value: parseFloat(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
              aria-label={`Balance for ${acct.name}`}
            />
          </div>
        </div>
      ))}
      <div className="checkin-net-worth">
        <span>Net worth</span>
        <strong>
          {formatCurrency(
            accountEntries.reduce(
              (sum, a) => sum + (a.kind === "asset" ? a.value : -a.value),
              0
            ),
            currency
          )}
        </strong>
      </div>
    </div>
  );
}

// ─── Step 1: Import ───────────────────────────────────────────────────────────

function ImportStep({
  onCsvUpload,
  uploadStatus,
  lastCoverageEnd,
  daysSinceImport,
  uploaded,
}: {
  onCsvUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadStatus: string | null;
  lastCoverageEnd: string | null;
  daysSinceImport: number;
  uploaded: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      {lastCoverageEnd && (
        <div className="checkin-import-hint">
          <span aria-hidden="true">📅</span>
          <span>
            {daysSinceImport > 0
              ? `It's been ${daysSinceImport} day${daysSinceImport !== 1 ? "s" : ""} since your last import.`
              : "Your data is up to date."}{" "}
            Export from your bank starting from <strong>{lastCoverageEnd}</strong>.
          </span>
        </div>
      )}

      <label className="onboarding-dropzone">
        <div className="text-accent mb-1" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="6" y="10" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
            <path d="M13 17h14M13 22h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="30" cy="10" r="7" fill="var(--accent)" opacity="0.15" />
            <path d="M30 7v6M27 10h6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[0.95rem] font-semibold text-ink">
          {uploaded ? "Upload another file" : "Drag & Drop your CSV file"}
        </span>
        <span className="text-[0.82rem] text-muted">or click to browse from your computer</span>
        <div className="flex gap-[0.4rem] mt-1">
          <span className="border border-line-strong rounded-sm px-2 py-[0.15rem] text-[0.75rem] font-semibold text-muted tracking-[0.04em]">CSV</span>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="onboarding-file-input"
          onChange={(e) => { void onCsvUpload(e); }}
        />
      </label>

      {uploaded && uploadStatus && (
        <div className="flex items-center gap-[0.6rem] bg-[rgba(61,139,79,0.08)] border border-[rgba(61,139,79,0.25)] rounded-md px-[0.875rem] py-[0.65rem] text-[0.875rem] text-ink">
          <span className="text-base text-accent-leaf font-bold shrink-0" aria-hidden="true">✓</span>
          <span>{uploadStatus}</span>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Categorize ───────────────────────────────────────────────────────

function CategorizeStep({
  uncategorizedCount,
  onGoToCategories,
}: {
  uncategorizedCount: number;
  onGoToCategories: () => void;
}) {
  if (uncategorizedCount === 0) {
    return (
      <div className="text-center py-4 flex flex-col gap-3 items-center">
        <span className="text-[2.5rem]" aria-hidden="true">✓</span>
        <p className="text-ink m-0 font-semibold">All transactions are categorized</p>
        <p className="text-ink-soft text-[0.875rem] m-0">
          You're all set — nothing needs attention here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-4 justify-center">
        <div className="flex flex-col items-center gap-[0.2rem]">
          <strong className="text-[2rem] font-bold font-display text-accent">
            {uncategorizedCount.toLocaleString()}
          </strong>
          <span className="text-[0.82rem] text-muted">
            transaction{uncategorizedCount !== 1 ? "s" : ""} uncategorized
          </span>
        </div>
      </div>

      <button
        type="button"
        className="flex items-start gap-4 p-5 border-[1.5px] border-accent rounded-lg bg-accent-soft text-left cursor-pointer transition-colors duration-150 hover:bg-[rgba(139,41,66,0.15)] w-full"
        onClick={onGoToCategories}
      >
        <span className="text-[1.25rem] shrink-0 text-accent mt-[2px]" aria-hidden="true">✦</span>
        <div>
          <strong className="block text-[0.95rem] text-ink mb-[0.3rem]">Review in Categories</strong>
          <p className="m-0 text-[0.82rem] text-ink-soft leading-[1.4]">
            Head to the Categories tab to assign rules and categorize your spending.
          </p>
        </div>
      </button>

      <p className="flex items-start gap-[0.4rem] text-[0.82rem] text-ink-soft">
        <span aria-hidden="true">💡</span>
        You can skip this now and categorize later — your transactions are already saved.
      </p>
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export interface MonthlyCheckInWizardProps {
  onExit: () => void;
  onGoToCategories: () => void;
  // Nav
  user: User | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onGoHome: () => void;
  // Balances
  accountEntries: AccountEntry[];
  currency: string;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  // Import
  onCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  uploadStatus: string | null;
  lastCoverageEnd: string | null;
  daysSinceImport: number;
  // Categorize
  uncategorizedCount: number;
}

export function MonthlyCheckInWizard({
  onExit,
  onGoToCategories,
  user,
  isDark,
  onToggleTheme,
  onSignIn,
  onGoHome,
  accountEntries,
  currency,
  onUpdateAccount,
  onCsvUpload,
  uploadStatus,
  lastCoverageEnd,
  daysSinceImport,
  uncategorizedCount,
}: MonthlyCheckInWizardProps) {
  const [step, setStep] = useState(0);
  const [uploaded, setUploaded] = useState(false);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    await onCsvUpload(e);
    setUploaded(true);
  }

  function goNext() {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      onExit();
    }
  }

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-main)]">
      <AppNav
        user={user}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onSignIn={onSignIn}
        onGoHome={onGoHome}
        onGoToSettings={() => { /* no-op during check-in */ }}
      />
      <CheckInShell
        step={step}
        onBack={goBack}
        onSkip={goNext}
        onNext={goNext}
        onExit={onExit}
        nextLabel={isLastStep ? "Done" : "Next"}
      >
        {step === 0 && (
          <BalancesStep
            accountEntries={accountEntries}
            currency={currency}
            onUpdateAccount={onUpdateAccount}
          />
        )}
        {step === 1 && (
          <ImportStep
            onCsvUpload={handleUpload}
            uploadStatus={uploadStatus}
            lastCoverageEnd={lastCoverageEnd}
            daysSinceImport={daysSinceImport}
            uploaded={uploaded}
          />
        )}
        {step === 2 && (
          <CategorizeStep
            uncategorizedCount={uncategorizedCount}
            onGoToCategories={onGoToCategories}
          />
        )}
      </CheckInShell>
    </div>
  );
}

