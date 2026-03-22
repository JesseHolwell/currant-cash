import type { User } from "@supabase/supabase-js";
import type {
  AccountEntry,
  AccountKind,
  GoalEntry,
  PayrollDraft,
  ResolvedGoalEntry,
  TransactionBatch,
} from "../../domain";
import {
  PAY_FREQUENCY_OPTIONS,
  formatCurrency,
} from "../../domain";
import { AppNav } from "../dashboard/AppNav";

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEPS = [
  {
    label: "About You",
    title: "Let's get to know you",
    subtitle: "A few quick details to personalise your experience. All fields are optional except currency.",
    why: "Your name personalises the app, your birth year powers FIRE retirement projections, and currency ensures all figures display correctly.",
  },
  {
    label: "Income",
    title: "What's your income?",
    subtitle: "This helps us model your savings rate and FIRE projections.",
    why: "Accurate income data lets Currant calculate your safe withdrawal rate and predict your time to financial independence.",
  },
  {
    label: "Accounts",
    title: "Add your accounts",
    subtitle: "Connect your financial life. Rough estimates are perfect for your initial FIRE projection.",
    why: "Your net worth snapshot is the foundation of every forecast and goal progress calculation.",
  },
  {
    label: "Upload",
    title: "Upload your bank transactions",
    subtitle: "Export a CSV from your bank's website. We support most major formats.",
    why: "Transaction history powers the Expenses view, category rules, and income modelling.",
  },
  {
    label: "Categorize",
    title: "Categorise your transactions",
    subtitle: "Organise your financial story. Set up rules to sort through your recent activity.",
    why: "Categories unlock the Expenses Sankey and let Currant separate spending from transfers automatically.",
  },
  {
    label: "Goals",
    title: "Do you have financial goals?",
    subtitle: "Goals appear as overlay lines on your forecast chart, giving you a target to aim for.",
    why: "Concrete goals like a 6-month runway or house deposit turn abstract numbers into a plan.",
  },
] as const;

// ─── Shared wizard layout ─────────────────────────────────────────────────────

type WizardShellProps = {
  step: number;
  totalSteps: number;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  hideBack?: boolean;
  children: React.ReactNode;
};

function WizardShell({
  step,
  totalSteps,
  onBack,
  onSkip,
  onNext,
  nextLabel = "Next",
  nextDisabled,
  hideBack,
  children,
}: WizardShellProps) {
  const meta = STEPS[step];

  return (
    <div className="onboarding-backdrop">
      <div className="onboarding-card">
        {/* Progress */}
        <div className="onboarding-progress">
          <div className="onboarding-progress-track">
            {STEPS.map((s, i) => (
              <div
                key={s.label}
                className={`onboarding-progress-segment ${i <= step ? "is-active" : ""}`}
              />
            ))}
          </div>
          <span className="onboarding-step-label">
            STEP {step + 1} OF {totalSteps}
          </span>
          <span className="onboarding-tab-label">{meta.label.toUpperCase()}</span>
        </div>

        {/* Header */}
        <div className="onboarding-header">
          <h1 className="onboarding-title">{meta.title}</h1>
          <p className="onboarding-subtitle">{meta.subtitle}</p>
        </div>

        {/* Body */}
        <div className="onboarding-body">{children}</div>

        {/* Navigation */}
        <div className="onboarding-nav">
          {!hideBack && step > 0 ? (
            <button type="button" className="onboarding-btn-ghost" onClick={onBack}>
              ← Back
            </button>
          ) : (
            <span />
          )}
          <div className="onboarding-nav-right">
            <button type="button" className="onboarding-btn-skip" onClick={onSkip}>
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
        <div className="onboarding-why">
          <span className="onboarding-why-icon" aria-hidden="true">ℹ</span>
          <p>
            <strong>Why this matters:</strong> {meta.why}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Step 0: About You ────────────────────────────────────────────────────────

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

type AboutYouStepProps = {
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  birthYear: number;
  onBirthYearChange: (year: number) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
};

function AboutYouStep({
  displayName,
  onDisplayNameChange,
  birthYear,
  onBirthYearChange,
  currency,
  onCurrencyChange,
}: AboutYouStepProps) {
  const age = birthYear > 0 ? CURRENT_YEAR - birthYear : "";

  return (
    <div className="onboarding-about">
      <div className="onboarding-field-grid">
        <label className="onboarding-field">
          <span className="onboarding-field-label">What should we call you? <span className="onboarding-optional">optional</span></span>
          <input
            type="text"
            autoComplete="given-name"
            placeholder="Your name"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
        </label>

        <label className="onboarding-field">
          <span className="onboarding-field-label">
            Currency <span className="onboarding-required">required</span>
          </span>
          <select value={currency} onChange={(e) => onCurrencyChange(e.target.value)}>
            {CURRENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="onboarding-field">
        <span className="onboarding-field-label">
          How old are you? <span className="onboarding-optional">optional</span>
        </span>
        <span className="onboarding-field-hint">Used for FIRE retirement projections.</span>
        <input
          type="number"
          inputMode="numeric"
          min={10}
          max={100}
          placeholder="e.g. 32"
          value={age}
          onChange={(e) => {
            const val = Number(e.target.value);
            onBirthYearChange(val >= 10 && val <= 100 ? CURRENT_YEAR - val : 0);
          }}
        />
      </label>
    </div>
  );
}

// ─── Step 1: Income ───────────────────────────────────────────────────────────

type IncomeStepProps = {
  payrollDraft: PayrollDraft;
  onPayrollDraftChange: (patch: Partial<PayrollDraft>) => void;
  currency: string;
};

function IncomeStep({ payrollDraft, onPayrollDraftChange, currency }: IncomeStepProps) {
  const monthlyNet =
    payrollDraft.netPay > 0
      ? (() => {
          const freq = PAY_FREQUENCY_OPTIONS.find((o) => o.value === payrollDraft.payFrequency);
          const periods = freq ? { weekly: 52, fortnightly: 26, monthly: 12 }[payrollDraft.payFrequency] ?? 12 : 12;
          return (payrollDraft.netPay * periods) / 12;
        })()
      : null;

  return (
    <div className="onboarding-income">
      <div className="onboarding-field-grid">
        <label className="onboarding-field">
          <span className="onboarding-field-label">Net monthly pay</span>
          <span className="onboarding-field-hint">Amount that arrives in your bank each pay.</span>
          <div className="onboarding-currency-input">
            <span>{currency === "USD" ? "$" : currency === "AUD" ? "A$" : currency === "GBP" ? "£" : "$"}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={payrollDraft.netPay || ""}
              onChange={(e) => onPayrollDraftChange({ netPay: Number(e.target.value) || 0 })}
            />
          </div>
        </label>

        <label className="onboarding-field">
          <span className="onboarding-field-label">Gross monthly pay</span>
          <span className="onboarding-field-hint">Salary before tax and deductions.</span>
          <div className="onboarding-currency-input">
            <span>{currency === "USD" ? "$" : currency === "AUD" ? "A$" : currency === "GBP" ? "£" : "$"}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={payrollDraft.grossPay || ""}
              onChange={(e) => onPayrollDraftChange({ grossPay: Number(e.target.value) || 0 })}
            />
          </div>
        </label>
      </div>

      <div className="onboarding-field-row">
        <label className="onboarding-field">
          <span className="onboarding-field-label">Pay frequency</span>
          <select
            value={payrollDraft.payFrequency}
            onChange={(e) =>
              onPayrollDraftChange({ payFrequency: e.target.value as PayrollDraft["payFrequency"] })
            }
          >
            {PAY_FREQUENCY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="onboarding-field">
          <span className="onboarding-field-label">Employer name</span>
          <span className="onboarding-field-hint">Used to match salary credits in your CSV.</span>
          <input
            type="text"
            autoComplete="organization"
            placeholder="e.g. Acme Pty Ltd"
            value={payrollDraft.employerKeywords}
            onChange={(e) => onPayrollDraftChange({ employerKeywords: e.target.value })}
          />
        </label>
      </div>

      {monthlyNet !== null && (
        <div className="onboarding-derived-stat">
          <span>Estimated monthly take-home</span>
          <strong>{formatCurrency(monthlyNet, currency)}</strong>
        </div>
      )}
    </div>
  );
}

// ─── Step 2: Accounts ─────────────────────────────────────────────────────────

type AccountsStepProps = {
  accountEntries: AccountEntry[];
  onAddAccount: () => void;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  onRemoveAccount: (id: string) => void;
  currency: string;
};

const BUCKET_OPTIONS = ["Bank", "Crypto", "Stocks", "Property", "Other"];

function AccountsStep({
  accountEntries,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  currency,
}: AccountsStepProps) {
  const assets = accountEntries.filter((a) => a.kind === "asset").reduce((s, a) => s + a.value, 0);
  const liabilities = accountEntries.filter((a) => a.kind === "liability").reduce((s, a) => s + a.value, 0);
  const netWorth = assets - liabilities;

  return (
    <div className="onboarding-accounts">
      <div className="onboarding-accounts-table">
        <div className="onboarding-accounts-thead">
          <span>Account name</span>
          <span>Type</span>
          <span className="onboarding-col-right">Current balance</span>
          <span />
        </div>

        {accountEntries.map((account) => (
          <div key={account.id} className="onboarding-accounts-row">
            <input
              type="text"
              placeholder="e.g. Main Checking"
              value={account.name}
              onChange={(e) => onUpdateAccount(account.id, { name: e.target.value })}
            />
            <select
              value={account.kind === "liability" ? "__liability__" : account.bucket}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "__liability__") {
                  onUpdateAccount(account.id, { kind: "liability" as AccountKind, bucket: "Debt" });
                } else {
                  onUpdateAccount(account.id, { kind: "asset" as AccountKind, bucket: val });
                }
              }}
            >
              {BUCKET_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="__liability__">Liability / Debt</option>
            </select>
            <div className="onboarding-currency-input onboarding-col-right">
              <span>$</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={account.value || ""}
                placeholder="0.00"
                onChange={(e) => onUpdateAccount(account.id, { value: Number(e.target.value) || 0 })}
              />
            </div>
            <button
              type="button"
              className="onboarding-row-remove"
              onClick={() => onRemoveAccount(account.id)}
              aria-label="Remove account"
            >
              ×
            </button>
          </div>
        ))}

        <button type="button" className="onboarding-add-row" onClick={onAddAccount}>
          + Add account
        </button>
      </div>

      <div className="onboarding-net-worth-banner">
        <div>
          <span className="onboarding-net-worth-label">Real-time snapshot</span>
          <span className="onboarding-net-worth-sub">Calculated across all entries</span>
        </div>
        <div className="onboarding-net-worth-right">
          <span className="onboarding-net-worth-label">Total net worth</span>
          <strong className="onboarding-net-worth-value">{formatCurrency(netWorth, currency)}</strong>
        </div>
      </div>
    </div>
  );
}

// ─── Step 3: Goals ────────────────────────────────────────────────────────────

type GoalsStepProps = {
  goals: ResolvedGoalEntry[];
  accountEntries: AccountEntry[];
  onAddGoal: () => void;
  onUpdateGoal: (id: string, patch: Partial<Omit<GoalEntry, "id">>) => void;
  onRemoveGoal: (id: string) => void;
  inferredMonthlyExpenses: number;
  currency: string;
};

function GoalsStep({ goals, accountEntries, onAddGoal, onUpdateGoal, onRemoveGoal, inferredMonthlyExpenses, currency }: GoalsStepProps) {
  return (
    <div className="onboarding-goals">
      {goals.length === 0 ? (
        <div className="onboarding-empty-goals">
          <p>No goals yet. Add your first savings target below.</p>
        </div>
      ) : (
        <div className="onboarding-goals-list">
          {goals.map((goal) => (
            <div key={goal.id} className="onboarding-goal-card">
              <div className="onboarding-goal-row">
                <div className="onboarding-field">
                  <span className="onboarding-field-label">Goal name</span>
                  <input
                    type="text"
                    placeholder="e.g. Emergency fund"
                    value={goal.name}
                    onChange={(e) => onUpdateGoal(goal.id, { name: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="onboarding-row-remove"
                  onClick={() => onRemoveGoal(goal.id)}
                  aria-label="Remove goal"
                >
                  ×
                </button>
              </div>

              <div className="onboarding-goal-fields">
                <label className="onboarding-field">
                  <span className="onboarding-field-label">Current</span>
                  <div className="onboarding-currency-input">
                    <span>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={goal.current || ""}
                      placeholder="0"
                      onChange={(e) => onUpdateGoal(goal.id, { current: Number(e.target.value) || 0 })}
                    />
                  </div>
                </label>
                <label className="onboarding-field">
                  <span className="onboarding-field-label">Target</span>
                  <div className="onboarding-currency-input">
                    <span>$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={goal.target || ""}
                      placeholder="10,000"
                      onChange={(e) => onUpdateGoal(goal.id, { target: Number(e.target.value) || 0 })}
                    />
                  </div>
                </label>
              </div>

              {goal.target > 0 && (
                <div className="onboarding-goal-progress">
                  <div
                    className="onboarding-goal-fill"
                    style={{ width: `${Math.min(100, Math.round(goal.progress * 100))}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <button type="button" className="onboarding-add-row" onClick={onAddGoal}>
        + Add goal
      </button>

      {inferredMonthlyExpenses > 0 ? (
        <p className="onboarding-tip">
          <span aria-hidden="true">💡</span> A 3-month emergency fund is the recommended minimum. Based on your average monthly expenses of {formatCurrency(inferredMonthlyExpenses, currency)}, that&rsquo;s <strong>{formatCurrency(inferredMonthlyExpenses * 3, currency)}</strong>.
        </p>
      ) : (
        <p className="onboarding-tip">
          <span aria-hidden="true">💡</span> Upload your transactions first and we&rsquo;ll suggest an emergency fund target based on your actual spending.
        </p>
      )}
    </div>
  );
}

// ─── Step 4: Upload ───────────────────────────────────────────────────────────

type UploadStepProps = {
  batches: TransactionBatch[];
  statusMessage: string | null;
  errorMessage: string | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

function UploadStep({ batches, statusMessage, errorMessage, onUpload }: UploadStepProps) {
  const totalTransactions = batches.reduce((s, b) => s + b.transactionCount, 0);

  return (
    <div className="onboarding-upload">
      <label className="onboarding-dropzone">
        <div className="onboarding-dropzone-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="6" y="10" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
            <path d="M13 17h14M13 22h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="30" cy="10" r="7" fill="var(--accent)" opacity="0.15" />
            <path d="M30 7v6M27 10h6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="onboarding-dropzone-title">Drag &amp; Drop your CSV file</span>
        <span className="onboarding-dropzone-sub">or click to browse from your computer</span>
        <div className="onboarding-dropzone-formats">
          <span>CSV</span>
          <span>XLSX</span>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="onboarding-file-input"
          onChange={(e) => { void onUpload(e); }}
        />
      </label>

      {errorMessage && <p className="onboarding-error">{errorMessage}</p>}

      {batches.length > 0 ? (
        <div className="onboarding-upload-success">
          <span className="onboarding-success-icon" aria-hidden="true">✓</span>
          <div>
            <strong>{batches.length} file{batches.length > 1 ? "s" : ""} uploaded</strong>
            <span className="onboarding-muted"> — {totalTransactions.toLocaleString()} transactions imported</span>
          </div>
        </div>
      ) : statusMessage ? (
        <p className="onboarding-muted">{statusMessage}</p>
      ) : null}

      <div className="onboarding-upload-institutions">
        <span className="onboarding-muted">Compatible with institutions like</span>
        <div className="onboarding-institution-list">
          <span>Chase</span>
          <span>Barclays</span>
          <span>HSBC</span>
          <span>Commonwealth</span>
          <span>ANZ</span>
          <span>Revolut</span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 5: Categorize ───────────────────────────────────────────────────────

type CategorizeStepProps = {
  batches: TransactionBatch[];
  onGoToCategorize: () => void;
};

function CategorizeStep({ batches, onGoToCategorize }: CategorizeStepProps) {
  const totalTransactions = batches.reduce((s, b) => s + b.transactionCount, 0);
  const hasTransactions = totalTransactions > 0;

  return (
    <div className="onboarding-categorize">
      {hasTransactions ? (
        <>
          <div className="onboarding-categorize-summary">
            <div className="onboarding-categorize-stat">
              <strong>{totalTransactions.toLocaleString()}</strong>
              <span>transactions imported</span>
            </div>
          </div>

          <div className="onboarding-categorize-options">
            <button
              type="button"
              className="onboarding-categorize-card is-primary"
              onClick={onGoToCategorize}
            >
              <span className="onboarding-categorize-card-icon" aria-hidden="true">✦</span>
              <div>
                <strong>Set up rules manually</strong>
                <p>Head to the Categories tab to define keyword rules and categorise your spending.</p>
              </div>
            </button>
          </div>

          <p className="onboarding-tip">
            <span aria-hidden="true">💡</span> You can skip this now and categorise later — your transactions are already saved.
          </p>
        </>
      ) : (
        <div className="onboarding-categorize-empty">
          <p>No transactions uploaded yet. You can upload a CSV any time from the <strong>Imports</strong> tab, then head to <strong>Categories</strong> to set up your rules.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

export type OnboardingWizardProps = {
  step: number;
  onStepChange: (step: number) => void;
  onComplete: (goToTab?: string) => void;
  // Nav
  user: User | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignIn: () => void;
  onGoHome: () => void;
  // Profile (step 0)
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  birthYear: number;
  onBirthYearChange: (year: number) => void;
  currency: string;
  onCurrencyChange: (currency: string) => void;
  // Income
  payrollDraft: PayrollDraft;
  onPayrollDraftChange: (patch: Partial<PayrollDraft>) => void;
  // Accounts
  accountEntries: AccountEntry[];
  onAddAccount: () => void;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  onRemoveAccount: (id: string) => void;
  // Goals
  goals: ResolvedGoalEntry[];
  onAddGoal: () => void;
  onUpdateGoal: (id: string, patch: Partial<Omit<GoalEntry, "id">>) => void;
  onRemoveGoal: (id: string) => void;
  inferredMonthlyExpenses: number;
  // Upload
  batches: TransactionBatch[];
  transactionDataStatus: string | null;
  transactionError: string | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
};

const TOTAL_STEPS = STEPS.length;

export function OnboardingWizard({
  step,
  onStepChange,
  onComplete,
  user,
  isDark,
  onToggleTheme,
  onSignIn,
  onGoHome,
  displayName,
  onDisplayNameChange,
  birthYear,
  onBirthYearChange,
  currency,
  onCurrencyChange,
  payrollDraft,
  onPayrollDraftChange,
  accountEntries,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  goals,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
  inferredMonthlyExpenses,
  batches,
  transactionDataStatus,
  transactionError,
  onUpload,
}: OnboardingWizardProps) {
  function goNext() {
    if (step < TOTAL_STEPS - 1) {
      onStepChange(step + 1);
    } else {
      onComplete();
    }
  }

  function goBack() {
    if (step > 0) onStepChange(step - 1);
  }

  function skip() {
    goNext();
  }

  function handleCategorizeAndGo() {
    onComplete("categories");
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const isFirstStep = step === 0;

  return (
    <div className="onboarding-shell">
      <AppNav
        user={user}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onSignIn={onSignIn}
        onGoHome={onGoHome}
        onGoToSettings={() => { /* no-op during onboarding */ }}
      />
      <WizardShell
        step={step}
      totalSteps={TOTAL_STEPS}
      onBack={goBack}
      onSkip={skip}
      onNext={goNext}
      nextLabel={isLastStep ? "Finish setup" : "Next"}
      hideBack={isFirstStep}
    >
      {step === 0 && (
        <AboutYouStep
          displayName={displayName}
          onDisplayNameChange={onDisplayNameChange}
          birthYear={birthYear}
          onBirthYearChange={onBirthYearChange}
          currency={currency}
          onCurrencyChange={onCurrencyChange}
        />
      )}
      {step === 1 && (
        <IncomeStep
          payrollDraft={payrollDraft}
          onPayrollDraftChange={onPayrollDraftChange}
          currency={currency}
        />
      )}
      {step === 2 && (
        <AccountsStep
          accountEntries={accountEntries}
          onAddAccount={onAddAccount}
          onUpdateAccount={onUpdateAccount}
          onRemoveAccount={onRemoveAccount}
          currency={currency}
        />
      )}
      {step === 3 && (
        <UploadStep
          batches={batches}
          statusMessage={transactionDataStatus}
          errorMessage={transactionError}
          onUpload={onUpload}
        />
      )}
      {step === 4 && (
        <CategorizeStep
          batches={batches}
          onGoToCategorize={handleCategorizeAndGo}
        />
      )}
      {step === 5 && (
        <GoalsStep
          goals={goals}
          accountEntries={accountEntries}
          onAddGoal={onAddGoal}
          onUpdateGoal={onUpdateGoal}
          onRemoveGoal={onRemoveGoal}
          inferredMonthlyExpenses={inferredMonthlyExpenses}
          currency={currency}
        />
      )}
    </WizardShell>
    </div>
  );
}
