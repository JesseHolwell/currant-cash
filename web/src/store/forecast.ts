import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import {
  EMPTY_PAYROLL_DRAFT,
  PAYROLL_DRAFT_STORAGE_KEY,
  sanitizePayrollDraft
} from "../domain";
import type { PayrollDraft } from "../domain";

type Updater<T> = T | ((prev: T) => T);

interface ForecastState {
  payrollDraft: PayrollDraft;
  setPayrollDraft: (draft: Updater<PayrollDraft>) => void;
}

type PersistedForecast = {
  payrollDraft: unknown;
};

const forecastStorage = {
  getItem: (_name: string): StorageValue<PersistedForecast> | null => {
    try {
      const payrollRaw = localStorage.getItem(PAYROLL_DRAFT_STORAGE_KEY);
      return {
        state: {
          payrollDraft: payrollRaw ? JSON.parse(payrollRaw) : null
        },
        version: 0
      };
    } catch {
      return null;
    }
  },
  setItem: (_name: string, value: StorageValue<ForecastState>) => {
    try {
      const { state } = value;
      localStorage.setItem(PAYROLL_DRAFT_STORAGE_KEY, JSON.stringify(state.payrollDraft));
    } catch {
      // ignore write errors
    }
  },
  removeItem: (_name: string) => {
    localStorage.removeItem(PAYROLL_DRAFT_STORAGE_KEY);
  }
};

export const useForecastStore = create<ForecastState>()(
  persist(
    (set) => ({
      payrollDraft: EMPTY_PAYROLL_DRAFT,
      setPayrollDraft: (draftOrUpdater) =>
        set((state) => ({
          payrollDraft:
            typeof draftOrUpdater === "function"
              ? draftOrUpdater(state.payrollDraft)
              : draftOrUpdater
        }))
    }),
    {
      name: PAYROLL_DRAFT_STORAGE_KEY,
      storage: forecastStorage as never,
      merge: (persisted, current) => {
        try {
          const raw = persisted as PersistedForecast;
          const payrollDraft = raw?.payrollDraft
            ? sanitizePayrollDraft(raw.payrollDraft)
            : EMPTY_PAYROLL_DRAFT;
          return {
            ...current,
            payrollDraft
          };
        } catch {
          return {
            ...current,
            payrollDraft: EMPTY_PAYROLL_DRAFT
          };
        }
      }
    }
  )
);
