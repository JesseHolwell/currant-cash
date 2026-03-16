import { useEffect, useState } from "react";
import {
  ACCOUNT_ENTRIES_STORAGE_KEY,
  ACCOUNT_HISTORY_STORAGE_KEY,
  DEFAULT_ACCOUNT_ENTRIES,
  DEFAULT_GOALS,
  GOALS_STORAGE_KEY,
  parseStoredAccountEntries,
  parseStoredAccountHistory,
  parseStoredGoals
} from "../models";
import type {
  AccountEntry,
  AccountHistorySnapshot,
  GoalEntry
} from "../models";

interface UseAccountsGoalsResult {
  accountEntries: AccountEntry[];
  setAccountEntries: React.Dispatch<React.SetStateAction<AccountEntry[]>>;
  accountHistory: AccountHistorySnapshot[];
  setAccountHistory: React.Dispatch<React.SetStateAction<AccountHistorySnapshot[]>>;
  goals: GoalEntry[];
  setGoals: React.Dispatch<React.SetStateAction<GoalEntry[]>>;
}

export function useAccountsGoals(): UseAccountsGoalsResult {
  const [accountEntries, setAccountEntries] = useState<AccountEntry[]>(DEFAULT_ACCOUNT_ENTRIES);
  const [accountHistory, setAccountHistory] = useState<AccountHistorySnapshot[]>([]);
  const [goals, setGoals] = useState<GoalEntry[]>(DEFAULT_GOALS);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawAccounts = localStorage.getItem(ACCOUNT_ENTRIES_STORAGE_KEY);
      if (rawAccounts) {
        const parsedAccounts = parseStoredAccountEntries(JSON.parse(rawAccounts));
        if (parsedAccounts.length > 0) {
          setAccountEntries(parsedAccounts);
        }
      }

      const rawAccountHistory = localStorage.getItem(ACCOUNT_HISTORY_STORAGE_KEY);
      if (rawAccountHistory) {
        const parsedHistory = parseStoredAccountHistory(JSON.parse(rawAccountHistory));
        setAccountHistory(parsedHistory);
      }

      const rawGoals = localStorage.getItem(GOALS_STORAGE_KEY);
      if (rawGoals) {
        const parsedGoals = parseStoredGoals(JSON.parse(rawGoals));
        if (parsedGoals.length > 0) {
          setGoals(parsedGoals);
        }
      }
    } catch {
      setAccountEntries(DEFAULT_ACCOUNT_ENTRIES);
      setAccountHistory([]);
      setGoals(DEFAULT_GOALS);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    localStorage.setItem(ACCOUNT_ENTRIES_STORAGE_KEY, JSON.stringify(accountEntries));
  }, [accountEntries, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    localStorage.setItem(ACCOUNT_HISTORY_STORAGE_KEY, JSON.stringify(accountHistory));
  }, [accountHistory, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals));
  }, [goals, hasHydrated]);

  return {
    accountEntries,
    setAccountEntries,
    accountHistory,
    setAccountHistory,
    goals,
    setGoals
  };
}
