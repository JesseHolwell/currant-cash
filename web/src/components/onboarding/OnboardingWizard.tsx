import React from 'react';
import './OnboardingWizard.css';
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
            STEP {step + 1} OF {totalSteps}
          </span>
          <span className="text-[0.72rem] font-bold tracking-[0.08em] text-accent whitespace-nowrap">
            {meta.label.toUpperCase()}
          </span>
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
          {!hideBack && step > 0 ? (
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
  const [ageInput, setAgeInput] = React.useState(
    birthYear > 0 ? String(CURRENT_YEAR - birthYear) : ""
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 max-[540px]:grid-cols-1">
        <label className="onboarding-field">
          <span className="onboarding-field-label">
            What should we call you?{" "}
            <span className="text-[0.72rem] font-normal text-muted normal-case tracking-normal ml-[0.3rem]">optional</span>
          </span>
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
            Currency{" "}
            <span className="text-[0.72rem] font-semibold text-accent normal-case tracking-normal ml-[0.3rem]">required</span>
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
          How old are you?{" "}
          <span className="text-[0.72rem] font-normal text-muted normal-case tracking-normal ml-[0.3rem]">optional</span>
        </span>
        <span className="onboarding-field-hint">Used for FIRE retirement projections.</span>
        <input
          type="number"
          inputMode="numeric"
          min={10}
          max={100}
          placeholder="e.g. 32"
          value={ageInput}
          onChange={(e) => {
            setAgeInput(e.target.value);
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

const PERIODS_PER_YEAR: Record<string, number> = { weekly: 52, fortnightly: 26, monthly: 12 };

function IncomeStep({ payrollDraft, onPayrollDraftChange, currency }: IncomeStepProps) {
  const periods = PERIODS_PER_YEAR[payrollDraft.payFrequency] ?? 12;
  const currencySymbol = currency === "USD" ? "$" : currency === "AUD" ? "A$" : currency === "GBP" ? "£" : "$";

  const [yearlyNet, setYearlyNet] = React.useState(
    payrollDraft.netPay > 0 ? String(Math.round(payrollDraft.netPay * periods)) : ""
  );
  const [yearlyGross, setYearlyGross] = React.useState(
    payrollDraft.grossPay > 0 ? String(Math.round(payrollDraft.grossPay * periods)) : ""
  );

  const monthlyNet = Number(yearlyNet) > 0 ? Number(yearlyNet) / 12 : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 max-[540px]:grid-cols-1">
        <label className="onboarding-field">
          <span className="onboarding-field-label">Net yearly pay</span>
          <span className="onboarding-field-hint">Total take-home after tax per year.</span>
          <div className="onboarding-currency-input">
            <span>{currencySymbol}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder="0"
              value={yearlyNet}
              onChange={(e) => {
                setYearlyNet(e.target.value);
                const yearly = Number(e.target.value) || 0;
                onPayrollDraftChange({ netPay: yearly > 0 ? yearly / periods : 0 });
              }}
            />
          </div>
        </label>

        <label className="onboarding-field">
          <span className="onboarding-field-label">Gross yearly pay</span>
          <span className="onboarding-field-hint">Total salary before tax per year.</span>
          <div className="onboarding-currency-input">
            <span>{currencySymbol}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              placeholder="0"
              value={yearlyGross}
              onChange={(e) => {
                setYearlyGross(e.target.value);
                const yearly = Number(e.target.value) || 0;
                onPayrollDraftChange({ grossPay: yearly > 0 ? yearly / periods : 0 });
              }}
            />
          </div>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[540px]:grid-cols-1">
        <label className="onboarding-field">
          <span className="onboarding-field-label">Pay frequency</span>
          <select
            value={payrollDraft.payFrequency}
            onChange={(e) => {
              const freq = e.target.value as PayrollDraft["payFrequency"];
              const newPeriods = PERIODS_PER_YEAR[freq] ?? 12;
              onPayrollDraftChange({
                payFrequency: freq,
                netPay: Number(yearlyNet) > 0 ? Number(yearlyNet) / newPeriods : 0,
                grossPay: Number(yearlyGross) > 0 ? Number(yearlyGross) / newPeriods : 0,
              });
            }}
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
        <div className="flex items-center justify-between bg-accent-soft border border-accent rounded-md px-4 py-[0.65rem] text-[0.85rem] text-ink-soft">
          <span>Estimated monthly take-home</span>
          <strong className="text-accent text-base font-bold">{formatCurrency(monthlyNet, currency)}</strong>
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <div className="onboarding-accounts-thead">
          <span>Account name</span>
          <span>Type</span>
          <span className="text-right">Current balance</span>
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
            <div className="onboarding-currency-input text-right">
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

      <div className="flex items-center justify-between bg-accent-soft border border-accent rounded-md px-4 py-3 mt-1">
        <div>
          <span className="block text-[0.72rem] font-bold tracking-[0.06em] uppercase text-accent">Real-time snapshot</span>
          <span className="block text-[0.78rem] text-muted">Calculated across all entries</span>
        </div>
        <div className="text-right">
          <span className="block text-[0.72rem] font-bold tracking-[0.06em] uppercase text-accent">Total net worth</span>
          <strong className="text-[1.4rem] font-bold text-accent font-display">{formatCurrency(netWorth, currency)}</strong>
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
    <div className="flex flex-col">
      {goals.length === 0 ? (
        <div className="text-muted text-[0.875rem] py-4 text-center">
          <p>No goals yet. Add your first savings target below.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {goals.map((goal) => (
            <div key={goal.id} className="border border-line rounded-md p-4 bg-surface">
              <div className="flex items-start gap-2 mb-3">
                <div className="onboarding-field flex-1">
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

              <div className="grid grid-cols-2 gap-3">
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
                <div className="mt-3 h-[6px] rounded-full bg-[rgba(139,41,66,0.12)] overflow-hidden">
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
        <p className="flex items-start gap-[0.4rem] mt-4 text-[0.82rem] text-ink-soft">
          <span aria-hidden="true">💡</span> A 3-month emergency fund is the recommended minimum. Based on your average monthly expenses of {formatCurrency(inferredMonthlyExpenses, currency)}, that&rsquo;s <strong>{formatCurrency(inferredMonthlyExpenses * 3, currency)}</strong>.
        </p>
      ) : (
        <p className="flex items-start gap-[0.4rem] mt-4 text-[0.82rem] text-ink-soft">
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
    <div className="flex flex-col gap-4">
      <label className="onboarding-dropzone">
        <div className="text-accent mb-1" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect x="6" y="10" width="28" height="24" rx="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity="0.4" />
            <path d="M13 17h14M13 22h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="30" cy="10" r="7" fill="var(--accent)" opacity="0.15" />
            <path d="M30 7v6M27 10h6" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span className="text-[0.95rem] font-semibold text-ink">Drag &amp; Drop your CSV file</span>
        <span className="text-[0.82rem] text-muted">or click to browse from your computer</span>
        <div className="flex gap-[0.4rem] mt-1">
          <span className="border border-line-strong rounded-sm px-2 py-[0.15rem] text-[0.75rem] font-semibold text-muted tracking-[0.04em]">CSV</span>
          <span className="border border-line-strong rounded-sm px-2 py-[0.15rem] text-[0.75rem] font-semibold text-muted tracking-[0.04em]">XLSX</span>
        </div>
        <input
          type="file"
          accept=".csv,text/csv"
          className="onboarding-file-input"
          onChange={(e) => { void onUpload(e); }}
        />
      </label>

      {errorMessage && <p className="text-danger text-[0.85rem] mt-2">{errorMessage}</p>}

      {batches.length > 0 ? (
        <div className="flex items-center gap-[0.6rem] bg-[rgba(61,139,79,0.08)] border border-[rgba(61,139,79,0.25)] rounded-md px-[0.875rem] py-[0.65rem] text-[0.875rem] text-ink">
          <span className="text-base text-accent-leaf font-bold shrink-0" aria-hidden="true">✓</span>
          <div>
            <strong>{batches.length} file{batches.length > 1 ? "s" : ""} uploaded</strong>
            <span className="text-muted text-[0.82rem]"> — {totalTransactions.toLocaleString()} transactions imported</span>
          </div>
        </div>
      ) : statusMessage ? (
        <p className="text-muted text-[0.82rem]">{statusMessage}</p>
      ) : null}

      <div className="flex flex-col items-center gap-[0.4rem]">
        <span className="text-muted text-[0.82rem]">Compatible with institutions like</span>
        <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center">
          {["Chase", "Barclays", "HSBC", "Commonwealth", "ANZ", "Revolut"].map((name) => (
            <span key={name} className="text-[0.78rem] font-bold tracking-[0.08em] text-line-strong uppercase">
              {name}
            </span>
          ))}
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
    <div className="flex flex-col gap-5">
      {hasTransactions ? (
        <>
          <div className="flex gap-4 justify-center">
            <div className="flex flex-col items-center gap-[0.2rem]">
              <strong className="text-[2rem] font-bold font-display text-accent">{totalTransactions.toLocaleString()}</strong>
              <span className="text-[0.82rem] text-muted">transactions imported</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="flex items-start gap-4 p-5 border-[1.5px] border-accent rounded-lg bg-accent-soft text-left cursor-pointer transition-colors duration-150 hover:bg-[rgba(139,41,66,0.15)]"
              onClick={onGoToCategorize}
            >
              <span className="text-[1.25rem] shrink-0 text-accent mt-[2px]" aria-hidden="true">✦</span>
              <div>
                <strong className="block text-[0.95rem] text-ink mb-[0.3rem]">Review transactions now</strong>
                <p className="m-0 text-[0.82rem] text-ink-soft leading-[1.4]">Head to the Transactions tab to apply rules and categorise your spending.</p>
              </div>
            </button>
          </div>

          <p className="flex items-start gap-[0.4rem] mt-0 text-[0.82rem] text-ink-soft">
            <span aria-hidden="true">💡</span> You can skip this now and categorise later — your transactions are already saved.
          </p>
        </>
      ) : (
        <div className="text-center py-4 text-ink-soft text-[0.875rem] leading-[1.6]">
          <p>No transactions uploaded yet. You can upload a CSV any time from the <strong>Imports</strong> tab, then head to <strong>Transactions</strong> to review and categorize them.</p>
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
  onAccountsStepComplete: () => void;
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
  onAccountsStepComplete,
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
    if (step === 2) onAccountsStepComplete();
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
    onComplete("transactions");
  }

  const isLastStep = step === TOTAL_STEPS - 1;
  const isFirstStep = step === 0;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-main)]">
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
