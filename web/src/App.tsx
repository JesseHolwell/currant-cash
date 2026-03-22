import { useEffect, useRef, useState } from "react";
import {
  ACCOUNT_HISTORY_STORAGE_KEY,
  ACCOUNT_ENTRIES_STORAGE_KEY,
  CATEGORY_TAXONOMY_STORAGE_KEY,
  DEFAULT_ACCOUNT_ENTRIES,
  DEFAULT_GOALS,
  EMPTY_MANUAL_RULES,
  EMPTY_PAYROLL_DRAFT,
  FORECAST_SETTINGS_STORAGE_KEY,
  GOALS_STORAGE_KEY,
  MANUAL_DRAFTS_STORAGE_KEY,
  MANUAL_RULES_STORAGE_KEY,
  PAYROLL_DRAFT_STORAGE_KEY,
  AI_SUGGESTIONS_STORAGE_KEY,
  TRANSACTION_BATCHES_STORAGE_KEY,
  UPLOADED_META_STORAGE_KEY,
  UPLOADED_TRANSACTIONS_STORAGE_KEY,
  buildDefaultCategoryDefinitions,
  buildIncomeModelFromTransactions,
  buildTransactionBatch,
  createLocalId,
  normalizeCoverageRange,
  parseForecastSettings,
  parseBankCsvToTransactions,
  parseStoredAccountEntries,
  parseStoredAccountHistory,
  parseStoredCategoryDefinitions,
  parseStoredDrafts,
  parseStoredGoals,
  parseStoredManualRules,
  parseStoredTransactionBatches,
  resolveCategoryGroupBucket,
  resolveSubcategoryBucket,
  sanitizeManualRule,
  sanitizePayrollDraft,
  similarityKeyForTransaction
} from "./domain";
import {
  useTransactionBatches,
  useCategoryRules,
  useAccountsGoals,
  usePayrollForecast,
  useAuth,
  useCloudSync
} from "./hooks";
import { useDarkMode } from "./hooks/useDarkMode";
import { useAiSuggestions } from "./hooks/useAiSuggestions";
import { useAppSettings } from "./hooks/useAppSettings";
import { useDashboardState } from "./hooks/useDashboardState";
import { useFireStore } from "./store/fire";
import { isSupabaseConfigured } from "./lib/supabase";
import { LandingPage } from "./components/LandingPage";
import { Dashboard } from "./components/dashboard/Dashboard";
import { OnboardingWizard } from "./components/onboarding/OnboardingWizard";
import { SAMPLE_DATASET } from "./domain/sampleData";
import type {
  AccountEntry,
  CategoryDefinition,
  CategorySubcategoryDefinition,
  DashboardTab,
  FlowStartMode,
  GoalEntry,
  IncomeBasisMode,
  MerchantDetailMode,
  RawTransaction,
  TimelinePeriod,
  TransactionDraft
} from "./domain";

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function nextMonthValue(month: string): string {
  const [yearRaw, monthRaw] = month.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) {
    return currentMonthValue();
  }
  const nextDate = new Date(year, monthIndex + 1, 1);
  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}`;
}

const APP_BACKUP_VERSION = 1;
const FREE_TIER_KEY = "currant-free-tier";
const SAMPLE_MODE_KEY = "currant-sample-mode";
const ONBOARDING_COMPLETE_KEY = "currant-onboarding-complete";

const APP_STORAGE_KEYS = [
  TRANSACTION_BATCHES_STORAGE_KEY,
  UPLOADED_TRANSACTIONS_STORAGE_KEY,
  UPLOADED_META_STORAGE_KEY,
  MANUAL_RULES_STORAGE_KEY,
  MANUAL_DRAFTS_STORAGE_KEY,
  CATEGORY_TAXONOMY_STORAGE_KEY,
  ACCOUNT_ENTRIES_STORAGE_KEY,
  ACCOUNT_HISTORY_STORAGE_KEY,
  GOALS_STORAGE_KEY,
  PAYROLL_DRAFT_STORAGE_KEY,
  FORECAST_SETTINGS_STORAGE_KEY
] as const;

export default function App() {
  const { isDark, toggle: toggleTheme } = useDarkMode();
  const { user, authLoading, signInWithGoogle, signOut } = useAuth();
  const [bypassAuth, setBypassAuth] = useState(() => localStorage.getItem(FREE_TIER_KEY) === "1");
  const [isSampleMode, setIsSampleMode] = useState(() => sessionStorage.getItem(SAMPLE_MODE_KEY) === "1");
  const [showLanding, setShowLanding] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showMigration, setShowMigration] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const cloudLoadedRef = useRef(false);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(0);

  const [activeTab, setActiveTab] = useState<DashboardTab>("forecast");
  const [flowStartMode, setFlowStartMode] = useState<FlowStartMode>("income");
  const [incomeBasisMode, setIncomeBasisMode] = useState<IncomeBasisMode>("raw");
  const [merchantDetailMode, setMerchantDetailMode] = useState<MerchantDetailMode>("summary");
  const [timelinePeriod, setTimelinePeriod] = useState<TimelinePeriod>("all");
  const [rulesFilter, setRulesFilter] = useState<"needs" | "all">("needs");
  const [settingsStatus, setSettingsStatus] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const { currentAge: fireCurrentAge, annualReturn: fireAnnualReturn, multiplier: fireMultiplier,
    setCurrentAge: setFireCurrentAge, setAnnualReturn: setFireAnnualReturn, setMultiplier: setFireMultiplier
  } = useFireStore();

  const {
    transactionBatches, setTransactionBatches,
    transactionDataStatus, setTransactionDataStatus,
    error, setError,
    loading
  } = useTransactionBatches();

  const {
    manualRules, setManualRules,
    drafts, setDrafts,
    categoryDefinitions, setCategoryDefinitions
  } = useCategoryRules();

  const {
    accountEntries, setAccountEntries,
    accountHistory, setAccountHistory,
    goals, setGoals
  } = useAccountsGoals();

  const {
    payrollDraft, setPayrollDraft,
    forecastStartNetWorth, setForecastStartNetWorth,
    forecastMonthlyDelta, setForecastMonthlyDelta
  } = usePayrollForecast();

  const { downloadSnapshot, scheduleSyncUpload } = useCloudSync(user, applySnapshot);

  const {
    openaiApiKey, setOpenaiApiKey,
    displayName, setDisplayName,
    birthYear, setBirthYear,
    currency, setCurrency,
  } = useAppSettings();
  const {
    aiSuggestions,
    runAiCategorization,
    acceptSuggestion,
    rejectSuggestion,
    acceptAllSuggestions,
    dismissSuggestions,
    resetSuggestions
  } = useAiSuggestions();

  // Cloud sync: load user's cloud data on sign-in (one-time per session).
  useEffect(() => {
    if (!user || loading || cloudLoadedRef.current) return;
    cloudLoadedRef.current = true;
    downloadSnapshot().then((snapshot) => {
      if (snapshot) {
        applySnapshot(snapshot);
      } else if (transactionBatches.length > 0) {
        setShowMigration(true);
      } else if (!localStorage.getItem(ONBOARDING_COMPLETE_KEY)) {
        setOnboardingStep(0);
        setShowOnboarding(true);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, loading]);

  // Exit sample mode automatically when the user signs in (cloud data takes over).
  useEffect(() => {
    if (user && isSampleMode) {
      sessionStorage.removeItem(SAMPLE_MODE_KEY);
      setIsSampleMode(false);
      setActiveTab("forecast");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cloud sync: debounced upload on any state change while signed in.
  useEffect(() => {
    if (!user || !cloudLoadedRef.current || isSampleMode) return;
    scheduleSyncUpload({
      transactionBatches,
      manualRules,
      drafts,
      categoryDefinitions,
      accountEntries,
      accountHistory,
      goals,
      payrollDraft,
      forecastSettings: { startNetWorth: forecastStartNetWorth, monthlyDelta: forecastMonthlyDelta }
    });
  // scheduleSyncUpload is intentionally omitted — it is stable within a session.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, transactionBatches, manualRules, drafts, categoryDefinitions, accountEntries, accountHistory, goals, payrollDraft, forecastStartNetWorth, forecastMonthlyDelta]);

  const sd = SAMPLE_DATASET;
  const derived = useDashboardState({
    transactionBatches: isSampleMode ? sd.transactionBatches : transactionBatches,
    manualRules: isSampleMode ? sd.manualRules : manualRules,
    categoryDefinitions: isSampleMode ? sd.categoryDefinitions : categoryDefinitions,
    payrollDraft: isSampleMode ? sd.payrollDraft : payrollDraft,
    accountEntries: isSampleMode ? sd.accountEntries : accountEntries,
    accountHistory: isSampleMode ? sd.accountHistory : accountHistory,
    goals: isSampleMode ? sd.goals : goals,
    flowStartMode,
    incomeBasisMode,
    merchantDetailMode,
    timelinePeriod,
    rulesFilter,
    forecastStartNetWorth: isSampleMode ? sd.forecastStartNetWorth : forecastStartNetWorth,
    forecastMonthlyDelta: isSampleMode ? sd.forecastMonthlyDelta : forecastMonthlyDelta,
    fireCurrentAge: isSampleMode ? sd.fireCurrentAge : (birthYear > 0 ? new Date().getFullYear() - birthYear : fireCurrentAge),
    fireAnnualReturn: isSampleMode ? sd.fireAnnualReturn : fireAnnualReturn,
    fireMultiplier: isSampleMode ? sd.fireMultiplier : fireMultiplier,
    currency: isSampleMode ? undefined : currency,
  });

  // Keep timeline period valid when data changes
  useEffect(() => {
    if (timelinePeriod === "all") return;
    if (!derived.timelineOptions.includes(timelinePeriod)) {
      setTimelinePeriod("all");
    }
  }, [derived.timelineOptions, timelinePeriod]);

  // ---------- Draft / rule helpers ----------

  function defaultDraftFor(transaction: RawTransaction): TransactionDraft {
    return {
      categoryGroup: resolveCategoryGroupBucket(transaction),
      category: resolveSubcategoryBucket(transaction),
      nickname: transaction.manualNickname ?? "",
      applySimilar: true
    };
  }

  function draftFor(transaction: RawTransaction): TransactionDraft {
    return drafts[transaction.id] ?? defaultDraftFor(transaction);
  }

  function updateDraft(transaction: RawTransaction, patch: Partial<TransactionDraft>): void {
    setDrafts((prev) => {
      const current = prev[transaction.id] ?? defaultDraftFor(transaction);
      return { ...prev, [transaction.id]: { ...current, ...patch } };
    });
  }

  // ---------- Category definition handlers ----------

  function updateCategoryDefinition(id: string, patch: Partial<Pick<CategoryDefinition, "category">>): void {
    setCategoryDefinitions((prev) => prev.map((d) => d.id === id ? { ...d, ...patch } : d));
  }

  function addCategoryDefinition(): void {
    setCategoryDefinitions((prev) => [
      ...prev,
      { id: createLocalId("cat"), category: "", subcategories: [{ id: createLocalId("subcat"), name: "", keywords: [] }] }
    ]);
  }

  function removeCategoryDefinition(id: string): void {
    setCategoryDefinitions((prev) => prev.filter((d) => d.id !== id));
  }

  function addCategorySubcategory(categoryId: string): void {
    setCategoryDefinitions((prev) => prev.map((d) => {
      if (d.id !== categoryId) return d;
      return { ...d, subcategories: [...d.subcategories, { id: createLocalId("subcat"), name: "", keywords: [] }] };
    }));
  }

  function updateCategorySubcategory(
    categoryId: string,
    subcategoryId: string,
    patch: Partial<Omit<CategorySubcategoryDefinition, "id">>
  ): void {
    setCategoryDefinitions((prev) => prev.map((d) => {
      if (d.id !== categoryId) return d;
      return { ...d, subcategories: d.subcategories.map((s) => s.id === subcategoryId ? { ...s, ...patch } : s) };
    }));
  }

  function removeCategorySubcategory(categoryId: string, subcategoryId: string): void {
    setCategoryDefinitions((prev) => prev.map((d) => {
      if (d.id !== categoryId) return d;
      return { ...d, subcategories: d.subcategories.filter((s) => s.id !== subcategoryId) };
    }));
  }

  function resetCategoryDefinitions(): void {
    setCategoryDefinitions(buildDefaultCategoryDefinitions());
  }

  // ---------- Rule handlers ----------

  function saveRule(transaction: RawTransaction): void {
    const draft = draftFor(transaction);
    const cleaned = sanitizeManualRule({
      categoryGroup: draft.categoryGroup,
      category: draft.category,
      nickname: draft.nickname
    });
    const similarityKey = transaction.similarityKey ?? similarityKeyForTransaction(transaction);

    setManualRules((prev) => {
      const byId = { ...prev.byId };
      const bySimilarity = { ...prev.bySimilarity };

      if (cleaned) {
        byId[transaction.id] = cleaned;
      } else {
        delete byId[transaction.id];
      }

      if (draft.applySimilar) {
        if (cleaned) {
          bySimilarity[similarityKey] = cleaned;
        } else {
          delete bySimilarity[similarityKey];
        }
      }

      return { byId, bySimilarity };
    });
  }

  function clearRule(transaction: RawTransaction): void {
    const similarityKey = transaction.similarityKey ?? similarityKeyForTransaction(transaction);
    setManualRules((prev) => {
      const byId = { ...prev.byId };
      const bySimilarity = { ...prev.bySimilarity };
      delete byId[transaction.id];
      delete bySimilarity[similarityKey];
      return { byId, bySimilarity };
    });
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[transaction.id];
      return next;
    });
  }

  function clearAllRules(): void {
    setManualRules(EMPTY_MANUAL_RULES);
    setDrafts({});
    localStorage.removeItem(MANUAL_RULES_STORAGE_KEY);
    localStorage.removeItem(MANUAL_DRAFTS_STORAGE_KEY);
  }

  // ---------- AI suggestion handlers ----------

  function handleRunAiSuggestions(): void {
    void runAiCategorization(openaiApiKey, derived.uncategorizedInPeriod, derived.configuredTaxonomy);
  }

  function handleAcceptAiSuggestion(transactionId: string): void {
    const suggestion = aiSuggestions.suggestions.find((s) => s.transactionId === transactionId);
    const transaction = derived.effectiveTransactions.find((t) => t.id === transactionId);
    if (!suggestion || !transaction) return;
    updateDraft(transaction, { categoryGroup: suggestion.categoryGroup, category: suggestion.category, applySimilar: true });
    saveRule(transaction);
    acceptSuggestion(transactionId);
  }

  function handleAcceptAllAiSuggestions(): void {
    for (const suggestion of aiSuggestions.suggestions) {
      if (suggestion.status === "pending") {
        handleAcceptAiSuggestion(suggestion.transactionId);
      }
    }
    acceptAllSuggestions();
  }

  // ---------- Account handlers ----------

  function addAccount(): void {
    setAccountEntries((prev) => [
      ...prev,
      { id: createLocalId("acct"), name: "", bucket: "Other", kind: "asset", value: 0 }
    ]);
  }

  function updateAccount(id: string, patch: Partial<Omit<AccountEntry, "id">>): void {
    setAccountEntries((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
  }

  function removeAccount(id: string): void {
    setAccountEntries((prev) => prev.filter((a) => a.id !== id));
    setAccountHistory((prev) => prev.map((snapshot) => {
      const nextBalances = { ...snapshot.balances };
      delete nextBalances[id];
      return { ...snapshot, balances: nextBalances };
    }));
    setGoals((prev) => prev.map((goal) => ({
      ...goal,
      accountIds: goal.accountIds.filter((accountId) => accountId !== id)
    })));
  }

  function addGoal(): void {
    setGoals((prev) => [
      ...prev,
      { id: createLocalId("goal"), name: "", target: 0, current: 0, trackingMode: "manual", accountIds: [] }
    ]);
  }

  function updateGoal(id: string, patch: Partial<Omit<GoalEntry, "id">>): void {
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, ...patch } : g));
  }

  function removeGoal(id: string): void {
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  function addAccountHistorySnapshot(): void {
    setAccountHistory((prev) => {
      const sorted = [...prev].sort((a, b) => a.month.localeCompare(b.month));
      const seedMonth = sorted.length === 0 ? currentMonthValue() : nextMonthValue(sorted[sorted.length - 1].month);
      const balances: Record<string, number> = {};
      for (const account of accountEntries) {
        balances[account.id] = Number(account.value.toFixed(2));
      }
      return [...prev, { id: createLocalId("acct_hist"), month: seedMonth, balances }];
    });
  }

  function updateAccountHistoryMonth(snapshotId: string, month: string): void {
    setAccountHistory((prev) => prev.map((s) => s.id === snapshotId ? { ...s, month } : s));
  }

  function updateAccountHistoryBalance(snapshotId: string, accountId: string, value: number): void {
    setAccountHistory((prev) => prev.map((s) => {
      if (s.id !== snapshotId) return s;
      return { ...s, balances: { ...s.balances, [accountId]: Number.isFinite(value) ? Number(value.toFixed(2)) : 0 } };
    }));
  }

  function removeAccountHistorySnapshot(snapshotId: string): void {
    setAccountHistory((prev) => prev.filter((s) => s.id !== snapshotId));
  }

  // ---------- Transaction / CSV handlers ----------

  async function handleCsvUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const csvRaw = await file.text();
      const imported = parseBankCsvToTransactions(csvRaw, categoryDefinitions);
      if (imported.transactions.length === 0) {
        setTransactionDataStatus(`No transactions were parsed from ${file.name}. Check CSV columns and format.`);
        return;
      }

      const nextBatch = buildTransactionBatch({ fileName: file.name, transactions: imported.transactions, warnings: imported.warnings });
      const mergedBefore = new Set(derived.transactions.map((t) => t.id));
      const duplicateCount = nextBatch.transactions.filter((t) => mergedBefore.has(t.id)).length;

      setTransactionBatches((prev) => [nextBatch, ...prev]);
      resetSuggestions();
      setError(null);
      setTimelinePeriod("all");
      if (activeTab !== "imports") setActiveTab("imports");

      const uploadedIncomeModel = buildIncomeModelFromTransactions(imported.transactions, payrollDraft);
      if (!uploadedIncomeModel.enabled && incomeBasisMode === "modeled") {
        setIncomeBasisMode("raw");
      }

      if (imported.warnings.length > 0 || duplicateCount > 0) {
        setTransactionDataStatus(
          `Added ${file.name}: ${imported.transactions.length} transaction(s), ${duplicateCount} duplicate(s), ${imported.warnings.length} skipped row(s).`
        );
      } else {
        setTransactionDataStatus(`Added ${file.name} with ${imported.transactions.length} transaction(s).`);
      }
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : String(uploadError);
      setTransactionDataStatus(`Upload failed: ${message}`);
    } finally {
      event.target.value = "";
    }
  }

  function updateBatchCoverage(batchId: string, patch: { coverageStart?: string; coverageEnd?: string }): void {
    setTransactionBatches((prev) => prev.map((batch) => {
      if (batch.id !== batchId) return batch;
      const nextStart = patch.coverageStart && patch.coverageStart.trim() ? patch.coverageStart : batch.coverageStart;
      const nextEnd = patch.coverageEnd && patch.coverageEnd.trim() ? patch.coverageEnd : batch.coverageEnd;
      const normalized = normalizeCoverageRange(nextStart, nextEnd);
      return { ...batch, coverageStart: normalized.start, coverageEnd: normalized.end };
    }));
    setTransactionDataStatus("Updated CSV coverage dates.");
  }

  function deleteBatch(batchId: string): void {
    setTransactionBatches((prev) => {
      const next = prev.filter((b) => b.id !== batchId);
      if (next.length === 0) setActiveTab("imports");
      return next;
    });
    setError(null);
    setTimelinePeriod("all");
    if (incomeBasisMode === "modeled") setIncomeBasisMode("raw");
    setTransactionDataStatus("Deleted CSV batch.");
  }

  function clearUploadedData(): void {
    setTransactionBatches([]);
    setError(null);
    setTimelinePeriod("all");
    setActiveTab("imports");
    if (incomeBasisMode === "modeled") setIncomeBasisMode("raw");
    setTransactionDataStatus("Cleared all CSV data. Add a CSV to begin.");
  }

  // ---------- Data management ----------

  function applySnapshot(candidate: Record<string, unknown>): void {
    const nextTransactionBatches = parseStoredTransactionBatches(candidate.transactionBatches);
    const nextManualRules = parseStoredManualRules(candidate.manualRules);
    const nextDrafts = parseStoredDrafts(candidate.drafts);
    const nextCategoryDefinitions = parseStoredCategoryDefinitions(candidate.categoryDefinitions);
    const nextAccountEntries = parseStoredAccountEntries(candidate.accountEntries);
    const nextAccountHistory = parseStoredAccountHistory(candidate.accountHistory);
    const nextGoals = parseStoredGoals(candidate.goals);
    const nextPayrollDraft = sanitizePayrollDraft(candidate.payrollDraft);
    const nextForecast = parseForecastSettings(candidate.forecastSettings);

    setTransactionBatches(nextTransactionBatches);
    setManualRules(nextManualRules);
    setDrafts(nextDrafts);
    setCategoryDefinitions(nextCategoryDefinitions.length > 0 ? nextCategoryDefinitions : buildDefaultCategoryDefinitions());
    setAccountEntries(nextAccountEntries.length > 0 ? nextAccountEntries : DEFAULT_ACCOUNT_ENTRIES);
    setAccountHistory(nextAccountHistory);
    setGoals(nextGoals.length > 0 ? nextGoals : DEFAULT_GOALS);
    setPayrollDraft(nextPayrollDraft);
    setForecastStartNetWorth(nextForecast.startNetWorth);
    setForecastMonthlyDelta(nextForecast.monthlyDelta);
  }

  function migrateLocalDataToCloud(): void {
    scheduleSyncUpload({
      transactionBatches, manualRules, drafts, categoryDefinitions,
      accountEntries, accountHistory, goals, payrollDraft,
      forecastSettings: { startNetWorth: forecastStartNetWorth, monthlyDelta: forecastMonthlyDelta }
    }, 0);
    setShowMigration(false);
  }

  function resetAllData(): void {
    const confirmed = window.confirm("Clear all Currant data in this browser and restore the built-in defaults?");
    if (!confirmed) return;

    for (const key of APP_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(AI_SUGGESTIONS_STORAGE_KEY);

    setTransactionBatches([]);
    setManualRules(EMPTY_MANUAL_RULES);
    setDrafts({});
    setCategoryDefinitions(buildDefaultCategoryDefinitions());
    setAccountEntries(DEFAULT_ACCOUNT_ENTRIES);
    setAccountHistory([]);
    setGoals(DEFAULT_GOALS);
    setPayrollDraft(EMPTY_PAYROLL_DRAFT);
    setForecastStartNetWorth(null);
    setForecastMonthlyDelta(null);
    setFlowStartMode("income");
    setIncomeBasisMode("raw");
    setMerchantDetailMode("summary");
    setTimelinePeriod("all");
    setRulesFilter("needs");
    setError(null);
    setTransactionDataStatus("Reset to built-in defaults. Add a CSV to begin.");
    setSettingsError(null);
    setSettingsStatus("Restored built-in defaults and cleared all browser-stored data.");
  }

  function exportAllData(): void {
    try {
      const backup = {
        version: APP_BACKUP_VERSION,
        exportedAt: new Date().toISOString(),
        data: {
          transactionBatches, manualRules, drafts, categoryDefinitions,
          accountEntries, accountHistory, goals, payrollDraft,
          forecastSettings: { startNetWorth: forecastStartNetWorth, monthlyDelta: forecastMonthlyDelta }
        }
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `currant-backup-${timestamp}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setSettingsError(null);
      setSettingsStatus("Exported a JSON backup of your browser data.");
    } catch (exportError) {
      const message = exportError instanceof Error ? exportError.message : String(exportError);
      setSettingsStatus(null);
      setSettingsError(`Export failed: ${message}`);
    }
  }

  async function importAllData(file: File): Promise<void> {
    try {
      const rawText = await file.text();
      const parsed = JSON.parse(rawText) as unknown;
      const payload = parsed && typeof parsed === "object" && "data" in parsed
        ? (parsed as { data: unknown }).data
        : parsed;

      if (!payload || typeof payload !== "object") {
        throw new Error("Backup format is invalid.");
      }

      const candidate = payload as Record<string, unknown>;
      const nextTransactionBatches = parseStoredTransactionBatches(candidate.transactionBatches);
      const nextManualRules = parseStoredManualRules(candidate.manualRules);
      const nextDrafts = parseStoredDrafts(candidate.drafts);
      const nextCategoryDefinitions = parseStoredCategoryDefinitions(candidate.categoryDefinitions);
      const nextAccountEntries = parseStoredAccountEntries(candidate.accountEntries);
      const nextAccountHistory = parseStoredAccountHistory(candidate.accountHistory);
      const nextGoals = parseStoredGoals(candidate.goals);
      const nextPayrollDraft = sanitizePayrollDraft(candidate.payrollDraft);
      const nextForecast = parseForecastSettings(candidate.forecastSettings);

      for (const key of APP_STORAGE_KEYS) {
        localStorage.removeItem(key);
      }

      setTransactionBatches(nextTransactionBatches);
      setManualRules(nextManualRules);
      setDrafts(nextDrafts);
      setCategoryDefinitions(nextCategoryDefinitions.length > 0 ? nextCategoryDefinitions : buildDefaultCategoryDefinitions());
      setAccountEntries(nextAccountEntries.length > 0 ? nextAccountEntries : DEFAULT_ACCOUNT_ENTRIES);
      setAccountHistory(nextAccountHistory);
      setGoals(nextGoals.length > 0 ? nextGoals : DEFAULT_GOALS);
      setPayrollDraft(nextPayrollDraft);
      setForecastStartNetWorth(nextForecast.startNetWorth);
      setForecastMonthlyDelta(nextForecast.monthlyDelta);
      setFlowStartMode("income");
      setIncomeBasisMode("raw");
      setMerchantDetailMode("summary");
      setTimelinePeriod("all");
      setRulesFilter("needs");
      setError(null);
      setTransactionDataStatus(
        nextTransactionBatches.length > 0
          ? `Imported ${nextTransactionBatches.length} CSV file(s) from backup.`
          : "No CSV dataset loaded yet. Add a CSV to begin."
      );
      setSettingsError(null);
      setSettingsStatus(`Imported backup from ${file.name}.`);
    } catch (importError) {
      const message = importError instanceof Error ? importError.message : String(importError);
      setSettingsStatus(null);
      setSettingsError(`Import failed: ${message}`);
    }
  }

  // ---------- Auth handlers ----------

  function handleContinueFree(): void {
    localStorage.setItem(FREE_TIER_KEY, "1");
    setBypassAuth(true);
    setShowLanding(false);
    if (!localStorage.getItem(ONBOARDING_COMPLETE_KEY)) {
      setOnboardingStep(0);
      setShowOnboarding(true);
    }
  }

  function handleEnterSampleMode(): void {
    sessionStorage.setItem(SAMPLE_MODE_KEY, "1");
    setIsSampleMode(true);
    // Also bypass auth so the dashboard renders without requiring sign-in
    if (!bypassAuth) {
      localStorage.setItem(FREE_TIER_KEY, "1");
      setBypassAuth(true);
    }
    setShowLanding(false);
    setActiveTab("forecast");
  }

  function handleExitSampleMode(): void {
    sessionStorage.removeItem(SAMPLE_MODE_KEY);
    setIsSampleMode(false);
    // Silently reset stores to a clean default state
    for (const key of APP_STORAGE_KEYS) {
      localStorage.removeItem(key);
    }
    localStorage.removeItem(AI_SUGGESTIONS_STORAGE_KEY);
    setTransactionBatches([]);
    setManualRules(EMPTY_MANUAL_RULES);
    setDrafts({});
    setCategoryDefinitions(buildDefaultCategoryDefinitions());
    setAccountEntries(DEFAULT_ACCOUNT_ENTRIES);
    setAccountHistory([]);
    setGoals(DEFAULT_GOALS);
    setPayrollDraft(EMPTY_PAYROLL_DRAFT);
    setForecastStartNetWorth(null);
    setForecastMonthlyDelta(null);
    setActiveTab("imports");
    // Show landing page if Supabase is configured so they can sign up / continue free
    if (isSupabaseConfigured) {
      localStorage.removeItem(FREE_TIER_KEY);
      setBypassAuth(false);
      setShowLanding(true);
    }
  }

  function handleCompleteOnboarding(goToTab?: string): void {
    localStorage.setItem(ONBOARDING_COMPLETE_KEY, "1");
    setShowOnboarding(false);
    if (goToTab) {
      setActiveTab(goToTab as DashboardTab);
    } else {
      setActiveTab("forecast");
    }
  }

  async function handleSignOut(): Promise<void> {
    localStorage.removeItem(FREE_TIER_KEY);
    setBypassAuth(false);
    await signOut();
  }

  // ---------- Render ----------

  if (loading || authLoading) {
    return (
      <main className="dashboard-shell loading-state">
        <p>Loading saved dataset...</p>
      </main>
    );
  }

  if ((isSupabaseConfigured && !user && !bypassAuth) || showLanding) {
    return (
      <LandingPage
        onContinueFree={handleContinueFree}
        onSignUp={signInWithGoogle}
        onLogIn={signInWithGoogle}
        onPreviewSample={handleEnterSampleMode}
        onBack={showLanding ? () => setShowLanding(false) : undefined}
      />
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingWizard
        step={onboardingStep}
        onStepChange={setOnboardingStep}
        onComplete={handleCompleteOnboarding}
        user={user}
        isDark={isDark}
        onToggleTheme={toggleTheme}
        onSignOut={handleSignOut}
        onSignIn={() => setShowAuthModal(true)}
        onGoHome={() => setShowLanding(true)}
        displayName={user?.user_metadata?.["full_name"] as string ?? displayName}
        onDisplayNameChange={setDisplayName}
        birthYear={birthYear}
        onBirthYearChange={setBirthYear}
        currency={currency}
        onCurrencyChange={setCurrency}
        payrollDraft={payrollDraft}
        onPayrollDraftChange={(patch) => setPayrollDraft((prev) => ({ ...prev, ...patch }))}
        accountEntries={accountEntries}
        onAddAccount={addAccount}
        onUpdateAccount={updateAccount}
        onRemoveAccount={removeAccount}
        goals={derived.resolvedGoals}
        onAddGoal={addGoal}
        onUpdateGoal={updateGoal}
        onRemoveGoal={removeGoal}
        inferredMonthlyExpenses={derived.inferredMonthlyExpenses}
        batches={transactionBatches}
        transactionDataStatus={transactionDataStatus}
        transactionError={error}
        onUpload={handleCsvUpload}
      />
    );
  }

  return (
    <Dashboard
      isSampleMode={isSampleMode}
      onExitSampleMode={handleExitSampleMode}
      user={user}
      isDark={isDark}
      onToggleTheme={toggleTheme}
      onSignOut={handleSignOut}
      onSignIn={() => setShowAuthModal(true)}
      onGoHome={() => setShowLanding(true)}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      flowStartMode={flowStartMode}
      onFlowStartModeChange={setFlowStartMode}
      incomeBasisMode={incomeBasisMode}
      onIncomeBasisModeChange={setIncomeBasisMode}
      merchantDetailMode={merchantDetailMode}
      onMerchantDetailModeChange={setMerchantDetailMode}
      timelinePeriod={timelinePeriod}
      onTimelinePeriodChange={setTimelinePeriod}
      rulesFilter={rulesFilter}
      onRulesFilterChange={setRulesFilter}
      transactionBatches={isSampleMode ? sd.transactionBatches : transactionBatches}
      transactionDataStatus={transactionDataStatus}
      error={error}
      manualRules={isSampleMode ? sd.manualRules : manualRules}
      drafts={isSampleMode ? {} : drafts}
      categoryDefinitions={isSampleMode ? sd.categoryDefinitions : categoryDefinitions}
      accountEntries={isSampleMode ? sd.accountEntries : accountEntries}
      accountHistory={isSampleMode ? sd.accountHistory : accountHistory}
      goals={isSampleMode ? sd.goals : goals}
      payrollDraft={isSampleMode ? sd.payrollDraft : payrollDraft}
      forecastStartNetWorth={isSampleMode ? sd.forecastStartNetWorth : forecastStartNetWorth}
      forecastMonthlyDelta={isSampleMode ? sd.forecastMonthlyDelta : forecastMonthlyDelta}
      fireCurrentAge={isSampleMode ? sd.fireCurrentAge : fireCurrentAge}
      fireAnnualReturn={isSampleMode ? sd.fireAnnualReturn : fireAnnualReturn}
      fireMultiplier={isSampleMode ? sd.fireMultiplier : fireMultiplier}
      openaiApiKey={openaiApiKey}
      aiSuggestions={aiSuggestions}
      derived={derived}
      settingsStatus={settingsStatus}
      settingsError={settingsError}
      showApiKeyModal={showApiKeyModal}
      showAuthModal={showAuthModal}
      showMigration={showMigration}
      onShowApiKeyModal={() => setShowApiKeyModal(true)}
      onCloseApiKeyModal={() => setShowApiKeyModal(false)}
      onCloseAuthModal={() => setShowAuthModal(false)}
      onConfirmMigration={migrateLocalDataToCloud}
      onDismissMigration={() => setShowMigration(false)}
      draftFor={draftFor}
      onUpdateDraft={updateDraft}
      onSaveRule={saveRule}
      onClearRule={clearRule}
      onClearAllRules={clearAllRules}
      onCsvUpload={handleCsvUpload}
      onUpdateBatchCoverage={updateBatchCoverage}
      onDeleteBatch={deleteBatch}
      onDeleteAllBatches={clearUploadedData}
      onAddCategoryDefinition={addCategoryDefinition}
      onResetCategoryDefinitions={resetCategoryDefinitions}
      onUpdateCategoryDefinition={updateCategoryDefinition}
      onRemoveCategoryDefinition={removeCategoryDefinition}
      onAddCategorySubcategory={addCategorySubcategory}
      onUpdateCategorySubcategory={updateCategorySubcategory}
      onRemoveCategorySubcategory={removeCategorySubcategory}
      onAddAccount={addAccount}
      onUpdateAccount={updateAccount}
      onRemoveAccount={removeAccount}
      onAddGoal={addGoal}
      onUpdateGoal={updateGoal}
      onRemoveGoal={removeGoal}
      onAddAccountHistorySnapshot={addAccountHistorySnapshot}
      onUpdateAccountHistoryMonth={updateAccountHistoryMonth}
      onUpdateAccountHistoryBalance={updateAccountHistoryBalance}
      onRemoveAccountHistorySnapshot={removeAccountHistorySnapshot}
      onForecastStartNetWorthChange={setForecastStartNetWorth}
      onForecastMonthlyDeltaChange={setForecastMonthlyDelta}
      onResetStartNetWorth={() => setForecastStartNetWorth(null)}
      onResetMonthlyDelta={() => setForecastMonthlyDelta(null)}
      onPayrollDraftChange={(patch) => setPayrollDraft((prev) => ({ ...prev, ...patch }))}
      onFireCurrentAgeChange={setFireCurrentAge}
      onFireAnnualReturnChange={setFireAnnualReturn}
      onFireMultiplierChange={setFireMultiplier}
      displayName={displayName}
      onDisplayNameChange={setDisplayName}
      birthYear={birthYear}
      onBirthYearChange={setBirthYear}
      onCurrencyChange={setCurrency}
      onResetAllData={resetAllData}
      onExportAllData={exportAllData}
      onImportData={importAllData}
      onRunAiSuggestions={handleRunAiSuggestions}
      onAcceptAiSuggestion={handleAcceptAiSuggestion}
      onAcceptAllAiSuggestions={handleAcceptAllAiSuggestions}
      onRejectAiSuggestion={rejectSuggestion}
      onDismissAiSuggestions={dismissSuggestions}
      onSaveApiKey={setOpenaiApiKey}
      onSignInWithGoogle={signInWithGoogle}
      onMigrateLocalDataToCloud={migrateLocalDataToCloud}
    />
  );
}
