import './Dashboard.css';
import type { User } from "@supabase/supabase-js";
import { AccountsTab } from "../../features/accounts/AccountsTab";
import { GoalsTab } from "../../features/goals/GoalsTab";
import { CategoriesTab } from "../../features/categories/CategoriesTab";
import { ApiKeyModal } from "../../features/categories/ApiKeyModal";
import { ExpensesTab } from "../../features/expenses/ExpensesTab";
import { FireInsightsTab } from "../../features/fire/FireInsightsTab";
import { DashboardTab as DashboardOverviewTab } from "../../features/dashboard/DashboardTab";
import { IncomeTab } from "../../features/income/IncomeTab";
import { SettingsTab } from "../../features/settings/SettingsTab";
import { TransactionDataTab } from "../../features/transactions/TransactionDataTab";
import { AppNav } from "./AppNav";
import { Sidebar } from "./Sidebar";
import { WorkspaceHeader } from "./WorkspaceHeader";
import type {
  AccountEntry,
  AccountHistorySnapshot,
  AiSuggestionsState,
  CategoryDefinition,
  DashboardTab,
  FlowStartMode,
  GoalEntry,
  IncomeBasisMode,
  ManualRulesState,
  MerchantDetailMode,
  PayrollDraft,
  RawTransaction,
  ResolvedGoalEntry,
  TimelinePeriod,
  TransactionBatch,
  TransactionDraft
} from "../../domain";
import type { useDashboardState } from "../../hooks/useDashboardState";

type DerivedState = ReturnType<typeof useDashboardState>;

interface DashboardProps {
  // Sample mode
  isSampleMode: boolean;
  onExitSampleMode: () => void;
  sampleBannerLabel?: string;

  // Auth
  user: User | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onSignOut: () => void;
  onSignIn: () => void;
  onGoHome: () => void;

  // UI State
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  flowStartMode: FlowStartMode;
  onFlowStartModeChange: (mode: FlowStartMode) => void;
  incomeBasisMode: IncomeBasisMode;
  onIncomeBasisModeChange: (mode: IncomeBasisMode) => void;
  merchantDetailMode: MerchantDetailMode;
  onMerchantDetailModeChange: (mode: MerchantDetailMode) => void;
  timelinePeriod: TimelinePeriod;
  onTimelinePeriodChange: (period: TimelinePeriod) => void;
  rulesFilter: "needs" | "all";
  onRulesFilterChange: (filter: "needs" | "all") => void;

  // Store state
  transactionBatches: TransactionBatch[];
  transactionDataStatus: string | null;
  error: string | null;
  manualRules: ManualRulesState;
  drafts: Record<string, TransactionDraft>;
  categoryDefinitions: CategoryDefinition[];
  accountEntries: AccountEntry[];
  accountHistory: AccountHistorySnapshot[];
  goals: GoalEntry[];
  payrollDraft: PayrollDraft;
  forecastStartNetWorth: number | null;
  forecastMonthlyDelta: number | null;
  fireCurrentAge: number;
  fireAnnualReturn: number;
  fireMultiplier: number;
  openaiApiKey: string;
  aiSuggestions: AiSuggestionsState;

  // Derived state (from useDashboardState)
  derived: DerivedState;

  // Settings UI state
  settingsStatus: string | null;
  settingsError: string | null;

  // Modal state
  showApiKeyModal: boolean;
  showAuthModal: boolean;
  showMigration: boolean;
  onShowApiKeyModal: () => void;
  onCloseApiKeyModal: () => void;
  onCloseAuthModal: () => void;
  onConfirmMigration: () => void;
  onDismissMigration: () => void;

  // Handlers
  draftFor: (transaction: RawTransaction) => TransactionDraft;
  onUpdateDraft: (transaction: RawTransaction, patch: Partial<TransactionDraft>) => void;
  onSaveRule: (transaction: RawTransaction) => void;
  onClearRule: (transaction: RawTransaction) => void;
  onClearAllRules: () => void;
  onCsvUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onPlaidConnect: (() => void) | null;
  plaidConnecting: boolean;
  plaidError: string | null;
  onUpdateBatchCoverage: (batchId: string, patch: { coverageStart?: string; coverageEnd?: string }) => void;
  onDeleteBatch: (batchId: string) => void;
  onDeleteAllBatches: () => void;
  onAddCategoryDefinition: () => void;
  onResetCategoryDefinitions: () => void;
  onUpdateCategoryDefinition: (id: string, patch: Partial<Pick<CategoryDefinition, "category">>) => void;
  onRemoveCategoryDefinition: (id: string) => void;
  onAddCategorySubcategory: (categoryId: string) => void;
  onUpdateCategorySubcategory: (categoryId: string, subcategoryId: string, patch: Partial<{ name: string; keywords: string[] }>) => void;
  onRemoveCategorySubcategory: (categoryId: string, subcategoryId: string) => void;
  onAddAccount: () => void;
  onUpdateAccount: (id: string, patch: Partial<Omit<AccountEntry, "id">>) => void;
  onRemoveAccount: (id: string) => void;
  onAddGoal: () => void;
  onUpdateGoal: (id: string, patch: Partial<Omit<GoalEntry, "id">>) => void;
  onRemoveGoal: (id: string) => void;
  onAddAccountHistorySnapshot: () => void;
  onUpdateAccountHistoryMonth: (snapshotId: string, month: string) => void;
  onUpdateAccountHistoryBalance: (snapshotId: string, accountId: string, value: number) => void;
  onRemoveAccountHistorySnapshot: (snapshotId: string) => void;
  onForecastStartNetWorthChange: (value: number | null) => void;
  onForecastMonthlyDeltaChange: (value: number | null) => void;
  onResetStartNetWorth: () => void;
  onResetMonthlyDelta: () => void;
  onPayrollDraftChange: (patch: Partial<PayrollDraft>) => void;
  onFireCurrentAgeChange: (age: number) => void;
  onFireAnnualReturnChange: (rate: number) => void;
  onFireMultiplierChange: (multiplier: number) => void;
  displayName: string;
  onDisplayNameChange: (name: string) => void;
  birthYear: number;
  onBirthYearChange: (year: number) => void;
  onCurrencyChange: (currency: string) => void;
  onDeleteAllData: () => Promise<void>;
  userEmail: string | null;
  onExportAllData: () => void;
  onImportData: (file: File) => Promise<void>;
  onRunAiSuggestions: () => void;
  onAcceptAiSuggestion: (transactionId: string) => void;
  onAcceptAllAiSuggestions: () => void;
  onRejectAiSuggestion: (transactionId: string) => void;
  onDismissAiSuggestions: () => void;
  onSaveApiKey: (key: string) => void;
  onSignInWithGoogle: () => void;
  onMigrateLocalDataToCloud: () => void;
}

const TAB_META: Record<DashboardTab, { label: string; title: string; subtitle: string }> = {
  dashboard: {
    label: "Dashboard",
    title: "Dashboard",
    subtitle: "Track your net worth trajectory and account trends."
  },
  accounts: {
    label: "Accounts",
    title: "Accounts",
    subtitle: "Track assets and liabilities that make up your net worth."
  },
  income: {
    label: "Income",
    title: "Income Model",
    subtitle: "Configure payroll values used for modeled salary flow."
  },
  expenses: {
    label: "Expenses",
    title: "Expense Analysis",
    subtitle: "Sankey + category breakdown for spend behavior."
  },
  categories: {
    label: "Categories",
    title: "Categories & Rules",
    subtitle: "Define taxonomy and classify transactions quickly."
  },
  settings: {
    label: "Settings",
    title: "Settings & Backups",
    subtitle: "Manage browser storage, backups, and full-app resets."
  },
  imports: {
    label: "Imports",
    title: "Imports",
    subtitle: "Manage uploaded CSV files, coverage ranges, and historical transaction periods."
  },
  fireInsights: {
    label: "FIRE",
    title: "FIRE Insights",
    subtitle: "Calculate your FIRE number, retirement timeline, and savings milestones."
  },
  goals: {
    label: "Goals",
    title: "Goals",
    subtitle: "Define savings and net worth targets, and track your progress."
  },
};

export function Dashboard({
  isSampleMode,
  onExitSampleMode,
  sampleBannerLabel = "Start with my data",
  user,
  isDark,
  onToggleTheme,
  onSignOut,
  onSignIn,
  onGoHome,
  activeTab,
  onTabChange,
  flowStartMode,
  onFlowStartModeChange,
  incomeBasisMode,
  onIncomeBasisModeChange,
  merchantDetailMode,
  onMerchantDetailModeChange,
  timelinePeriod,
  onTimelinePeriodChange,
  rulesFilter,
  onRulesFilterChange,
  transactionBatches,
  transactionDataStatus,
  error,
  categoryDefinitions,
  accountEntries,
  accountHistory,
  goals,
  payrollDraft,
  forecastStartNetWorth,
  forecastMonthlyDelta,
  fireCurrentAge,
  fireAnnualReturn,
  fireMultiplier,
  openaiApiKey,
  aiSuggestions,
  derived,
  settingsStatus,
  settingsError,
  showApiKeyModal,
  showAuthModal,
  showMigration,
  onShowApiKeyModal,
  onCloseApiKeyModal,
  onCloseAuthModal,
  onConfirmMigration,
  onDismissMigration,
  draftFor,
  onUpdateDraft,
  onSaveRule,
  onClearRule,
  onClearAllRules,
  onCsvUpload,
  onPlaidConnect,
  plaidConnecting,
  plaidError,
  onUpdateBatchCoverage,
  onDeleteBatch,
  onDeleteAllBatches,
  onAddCategoryDefinition,
  onResetCategoryDefinitions,
  onUpdateCategoryDefinition,
  onRemoveCategoryDefinition,
  onAddCategorySubcategory,
  onUpdateCategorySubcategory,
  onRemoveCategorySubcategory,
  onAddAccount,
  onUpdateAccount,
  onRemoveAccount,
  onAddGoal,
  onUpdateGoal,
  onRemoveGoal,
  onAddAccountHistorySnapshot,
  onUpdateAccountHistoryMonth,
  onUpdateAccountHistoryBalance,
  onRemoveAccountHistorySnapshot,
  onForecastStartNetWorthChange,
  onForecastMonthlyDeltaChange,
  onResetStartNetWorth,
  onResetMonthlyDelta,
  onPayrollDraftChange,
  onFireCurrentAgeChange,
  onFireAnnualReturnChange,
  onFireMultiplierChange,
  displayName,
  onDisplayNameChange,
  birthYear,
  onBirthYearChange,
  onCurrencyChange,
  onDeleteAllData,
  userEmail,
  onExportAllData,
  onImportData,
  onRunAiSuggestions,
  onAcceptAiSuggestion,
  onAcceptAllAiSuggestions,
  onRejectAiSuggestion,
  onDismissAiSuggestions,
  onSaveApiKey,
  onSignInWithGoogle,
  onMigrateLocalDataToCloud
}: DashboardProps) {
  const activeTabMeta = TAB_META[activeTab];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <AppNav
        user={user}
        isDark={isDark}
        onToggleTheme={onToggleTheme}
        onSignIn={onSignIn}
        onGoHome={onGoHome}
        onGoToSettings={() => onTabChange("settings")}
      />

      <main className="flex-1 w-full flex flex-row overflow-hidden animate-[rise_400ms_cubic-bezier(0.2,0.95,0.35,1)]">
        <Sidebar
          tabMeta={TAB_META}
          activeTab={activeTab}
          onTabChange={onTabChange}
          accountSummary={derived.accountSummary}
          goals={derived.resolvedGoals}
          currency={derived.meta.currency}
        />

        <section className="flex-1 min-w-0 overflow-y-auto px-6 py-5 pb-10 grid gap-[0.85rem] content-start">
          {isSampleMode ? (
            <div className="sample-banner">
              <span className="sample-banner-text">
                You&apos;re previewing sample data &mdash; no changes will be saved.
              </span>
              <button type="button" className="sample-banner-cta" onClick={onExitSampleMode}>
                {sampleBannerLabel} &rarr;
              </button>
            </div>
          ) : null}
          <WorkspaceHeader
            title={activeTabMeta.title}
            subtitle={activeTabMeta.subtitle}
            generatedLabel={derived.subtitle}
            isSampleMode={isSampleMode}
          />

          {activeTab === "imports" ? (
            <TransactionDataTab
              batches={transactionBatches}
              totalTransactionCount={derived.transactions.length}
              statusMessage={transactionDataStatus}
              errorMessage={error}
              onUpload={onCsvUpload}
              onPlaidConnect={onPlaidConnect}
              plaidConnecting={plaidConnecting}
              plaidError={plaidError}
              onUpdateBatchCoverage={onUpdateBatchCoverage}
              onDeleteBatch={onDeleteBatch}
              onDeleteAllBatches={onDeleteAllBatches}
            />
          ) : null}

          {activeTab === "dashboard" ? (
            <DashboardOverviewTab
              currency={derived.meta.currency}
              accountSummary={derived.accountSummary}
              startNetWorth={derived.startNetWorth}
              monthlyForecastDelta={derived.monthlyForecastDelta}
              isMonthlyDeltaOverridden={forecastMonthlyDelta !== null}
              inferredMonthCount={derived.inferredMonthCount}
              forecastPoints={derived.forecastPoints}
              maxGoalTarget={derived.maxGoalTarget}
              accountHistorySeries={derived.accountHistorySeries}
              accountHistoryChartData={derived.accountHistoryChartData}
              expensePieData={derived.expensePieData}
              accountEntries={accountEntries}
              savingsRate={derived.fireInsightsData.savingsRate}
              monthlySavings={derived.fireInsightsData.monthlySavings}
              projectedFireAge={derived.fireInsightsData.projectedFireAge}
              yearsToFire={derived.fireInsightsData.yearsToFire}
              currentAge={fireCurrentAge}
              onGoToFire={() => onTabChange("fireInsights")}
            />
          ) : null}

          {activeTab === "accounts" ? (
            <AccountsTab
              currency={derived.meta.currency}
              accountSummary={derived.accountSummary}
              accountEntries={accountEntries}
              accountHistorySnapshots={derived.accountHistorySorted}
              inferredMonthlyNetFlow={derived.inferredMonthlyNetFlow}
              forecastStartNetWorth={forecastStartNetWorth}
              forecastMonthlyDelta={forecastMonthlyDelta}
              onAddAccount={onAddAccount}
              onUpdateAccount={onUpdateAccount}
              onRemoveAccount={onRemoveAccount}
              onAddAccountHistorySnapshot={onAddAccountHistorySnapshot}
              onUpdateAccountHistoryMonth={onUpdateAccountHistoryMonth}
              onUpdateAccountHistoryBalance={onUpdateAccountHistoryBalance}
              onRemoveAccountHistorySnapshot={onRemoveAccountHistorySnapshot}
              onForecastStartNetWorthChange={onForecastStartNetWorthChange}
              onForecastMonthlyDeltaChange={onForecastMonthlyDeltaChange}
              onResetStartNetWorth={onResetStartNetWorth}
              onResetMonthlyDelta={onResetMonthlyDelta}
            />
          ) : null}

          {activeTab === "goals" ? (
            <GoalsTab
              currency={derived.meta.currency}
              goals={derived.resolvedGoals}
              accountEntries={accountEntries}
              inferredMonthlyExpenses={derived.inferredMonthlyExpenses}
              onAddGoal={onAddGoal}
              onUpdateGoal={onUpdateGoal}
              onRemoveGoal={onRemoveGoal}
            />
          ) : null}

          {activeTab === "income" ? (
            <IncomeTab
              currency={derived.meta.currency}
              payrollDraft={payrollDraft}
              matchedPayCount={derived.incomeModel.payEventCount}
              onPayrollDraftChange={onPayrollDraftChange}
            />
          ) : null}

          {activeTab === "settings" ? (
            <SettingsTab
              statusMessage={settingsStatus}
              errorMessage={settingsError}
              displayName={displayName}
              onDisplayNameChange={onDisplayNameChange}
              birthYear={birthYear}
              onBirthYearChange={onBirthYearChange}
              currency={derived.meta.currency}
              onCurrencyChange={onCurrencyChange}
              isSignedIn={!!user}
              userEmail={userEmail}
              onSignOut={onSignOut}
              onDeleteAllData={onDeleteAllData}
              onExportAllData={onExportAllData}
              onImportData={onImportData}
            />
          ) : null}

          {activeTab === "expenses" ? (
            <ExpensesTab
              currency={derived.meta.currency}
              flowStartMode={flowStartMode}
              onFlowStartModeChange={onFlowStartModeChange}
              incomeBasisMode={incomeBasisMode}
              onIncomeBasisModeChange={onIncomeBasisModeChange}
              incomeModelEnabled={Boolean(derived.incomeModel?.enabled)}
              merchantDetailMode={merchantDetailMode}
              onMerchantDetailModeChange={onMerchantDetailModeChange}
              timelinePeriod={timelinePeriod}
              onTimelinePeriodChange={onTimelinePeriodChange}
              timelineOptions={derived.timelineOptions}
              viz={derived.viz}
              uncategorizedCount={derived.uncategorizedInPeriod.length}
              flowTitle={derived.flowTitle}
              chartHeight={derived.chartHeight}
              chartLeftMargin={derived.chartLeftMargin}
              chartRightMargin={derived.chartRightMargin}
              nodePadding={derived.nodePadding}
              monthlyExpenseData={derived.monthlyExpenseData}
            />
          ) : null}

          {activeTab === "categories" ? (
            <CategoriesTab
              currency={derived.meta.currency}
              timelinePeriod={timelinePeriod}
              onTimelinePeriodChange={onTimelinePeriodChange}
              timelineOptions={derived.timelineOptions}
              uncategorizedCount={derived.uncategorizedInPeriod.length}
              categoryDefinitions={categoryDefinitions}
              onAddCategoryDefinition={onAddCategoryDefinition}
              onResetCategoryDefinitions={onResetCategoryDefinitions}
              onUpdateCategoryDefinition={onUpdateCategoryDefinition}
              onRemoveCategoryDefinition={onRemoveCategoryDefinition}
              onAddCategorySubcategory={onAddCategorySubcategory}
              onUpdateCategorySubcategory={onUpdateCategorySubcategory}
              onRemoveCategorySubcategory={onRemoveCategorySubcategory}
              rulesFilter={rulesFilter}
              onRulesFilterChange={onRulesFilterChange}
              onClearAllRules={onClearAllRules}
              visibleEditableTransactions={derived.visibleEditableTransactions}
              draftFor={draftFor}
              onUpdateDraft={onUpdateDraft}
              onSaveRule={onSaveRule}
              onClearRule={onClearRule}
              subcategoryOptionsByGroup={derived.subcategoryOptionsByGroup}
              categoryGroupOptions={derived.categoryGroupOptions}
              isSignedIn={!!user}
              openaiApiKey={openaiApiKey}
              aiSuggestions={aiSuggestions}
              onRunAiSuggestions={onRunAiSuggestions}
              onAcceptAiSuggestion={onAcceptAiSuggestion}
              onAcceptAllAiSuggestions={onAcceptAllAiSuggestions}
              onRejectAiSuggestion={onRejectAiSuggestion}
              onDismissAiSuggestions={onDismissAiSuggestions}
              onOpenApiKeyModal={onShowApiKeyModal}
              onSignIn={onSignIn}
            />
          ) : null}

          {activeTab === "fireInsights" ? (
            <FireInsightsTab
              currency={derived.meta.currency}
              currentNetWorth={derived.accountSummary.netWorth}
              monthlyExpenses={derived.inferredMonthlyExpenses}
              monthlySavings={derived.fireInsightsData.monthlySavings}
              currentAge={fireCurrentAge}
              annualReturn={fireAnnualReturn}
              fireMultiplier={fireMultiplier}
              onCurrentAgeChange={onFireCurrentAgeChange}
              onAnnualReturnChange={onFireAnnualReturnChange}
              onFireMultiplierChange={onFireMultiplierChange}
              fireNumber={derived.fireInsightsData.fireNumber}
              leanFireNumber={derived.fireInsightsData.leanFireNumber}
              coastFireNumber={derived.fireInsightsData.coastFireNumber}
              yearsToFire={derived.fireInsightsData.yearsToFire}
              projectedFireAge={derived.fireInsightsData.projectedFireAge}
              savingsRate={derived.fireInsightsData.savingsRate}
              projectionData={derived.fireInsightsData.projectionData}
            />
          ) : null}
        </section>
      </main>

      {showApiKeyModal ? (
        <ApiKeyModal
          currentKey={openaiApiKey}
          onSave={onSaveApiKey}
          onClose={onCloseApiKeyModal}
        />
      ) : null}

      {showAuthModal ? (
        <div className="migration-overlay" onClick={onCloseAuthModal}>
          <div className="migration-dialog" onClick={(e) => e.stopPropagation()}>
            <h2>Sign in to Currant</h2>
            <p>Sign in with your Google account to enable cloud sync across devices.</p>
            <div className="migration-actions">
              <button type="button" className="migration-btn-primary" onClick={onSignInWithGoogle}>
                Continue with Google
              </button>
            </div>
            <div className="migration-actions">
              <button type="button" className="migration-btn-secondary" onClick={onCloseAuthModal}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showMigration ? (
        <div className="migration-overlay">
          <div className="migration-dialog">
            <h2>Migrate local data to cloud?</h2>
            <p>
              You have local data saved in this browser. Would you like to upload it to your cloud account
              so it&apos;s available on all your devices?
            </p>
            <div className="migration-actions">
              <button type="button" className="migration-btn-primary" onClick={onMigrateLocalDataToCloud}>
                Yes, upload to cloud
              </button>
              <button type="button" className="migration-btn-secondary" onClick={onDismissMigration}>
                Keep local only
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
