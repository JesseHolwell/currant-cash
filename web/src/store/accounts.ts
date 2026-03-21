import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import {
  ACCOUNT_ENTRIES_STORAGE_KEY,
  ACCOUNT_HISTORY_STORAGE_KEY,
  DEFAULT_ACCOUNT_ENTRIES,
  DEFAULT_GOALS,
  GOALS_STORAGE_KEY,
  parseStoredAccountEntries,
  parseStoredAccountHistory,
  parseStoredGoals
} from "../domain";
import type { AccountEntry, AccountHistorySnapshot, GoalEntry } from "../domain";

type Updater<T> = T | ((prev: T) => T);

interface AccountsState {
  accountEntries: AccountEntry[];
  accountHistory: AccountHistorySnapshot[];
  goals: GoalEntry[];
  setAccountEntries: (entries: Updater<AccountEntry[]>) => void;
  setAccountHistory: (history: Updater<AccountHistorySnapshot[]>) => void;
  setGoals: (goals: Updater<GoalEntry[]>) => void;
}

type PersistedAccounts = {
  accountEntries: unknown;
  accountHistory: unknown;
  goals: unknown;
};

const accountsStorage = {
  getItem: (_name: string): StorageValue<PersistedAccounts> | null => {
    try {
      const entriesRaw = localStorage.getItem(ACCOUNT_ENTRIES_STORAGE_KEY);
      const historyRaw = localStorage.getItem(ACCOUNT_HISTORY_STORAGE_KEY);
      const goalsRaw = localStorage.getItem(GOALS_STORAGE_KEY);
      return {
        state: {
          accountEntries: entriesRaw ? JSON.parse(entriesRaw) : null,
          accountHistory: historyRaw ? JSON.parse(historyRaw) : null,
          goals: goalsRaw ? JSON.parse(goalsRaw) : null
        },
        version: 0
      };
    } catch {
      return null;
    }
  },
  setItem: (_name: string, value: StorageValue<AccountsState>) => {
    try {
      const { state } = value;
      localStorage.setItem(ACCOUNT_ENTRIES_STORAGE_KEY, JSON.stringify(state.accountEntries));
      localStorage.setItem(ACCOUNT_HISTORY_STORAGE_KEY, JSON.stringify(state.accountHistory));
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(state.goals));
    } catch {
      // ignore write errors
    }
  },
  removeItem: (_name: string) => {
    localStorage.removeItem(ACCOUNT_ENTRIES_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_HISTORY_STORAGE_KEY);
    localStorage.removeItem(GOALS_STORAGE_KEY);
  }
};

export const useAccountsStore = create<AccountsState>()(
  persist(
    (set) => ({
      accountEntries: DEFAULT_ACCOUNT_ENTRIES,
      accountHistory: [],
      goals: DEFAULT_GOALS,
      setAccountEntries: (entriesOrUpdater) =>
        set((state) => ({
          accountEntries:
            typeof entriesOrUpdater === "function"
              ? entriesOrUpdater(state.accountEntries)
              : entriesOrUpdater
        })),
      setAccountHistory: (historyOrUpdater) =>
        set((state) => ({
          accountHistory:
            typeof historyOrUpdater === "function"
              ? historyOrUpdater(state.accountHistory)
              : historyOrUpdater
        })),
      setGoals: (goalsOrUpdater) =>
        set((state) => ({
          goals:
            typeof goalsOrUpdater === "function"
              ? goalsOrUpdater(state.goals)
              : goalsOrUpdater
        }))
    }),
    {
      name: ACCOUNT_ENTRIES_STORAGE_KEY,
      storage: accountsStorage as never,
      merge: (persisted, current) => {
        try {
          const raw = persisted as PersistedAccounts;
          const parsedEntries = parseStoredAccountEntries(raw?.accountEntries);
          const parsedHistory = parseStoredAccountHistory(raw?.accountHistory);
          const parsedGoals = parseStoredGoals(raw?.goals);
          return {
            ...current,
            accountEntries: parsedEntries.length > 0 ? parsedEntries : DEFAULT_ACCOUNT_ENTRIES,
            accountHistory: parsedHistory,
            goals: parsedGoals.length > 0 ? parsedGoals : DEFAULT_GOALS
          };
        } catch {
          return {
            ...current,
            accountEntries: DEFAULT_ACCOUNT_ENTRIES,
            accountHistory: [],
            goals: DEFAULT_GOALS
          };
        }
      }
    }
  )
);
