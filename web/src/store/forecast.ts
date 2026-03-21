import { create } from "zustand";
import { persist, type StorageValue } from "zustand/middleware";
import {
  EMPTY_PAYROLL_DRAFT,
  FORECAST_SETTINGS_STORAGE_KEY,
  PAYROLL_DRAFT_STORAGE_KEY,
  parseForecastSettings,
  sanitizePayrollDraft
} from "../domain";
import type { PayrollDraft } from "../domain";

type Updater<T> = T | ((prev: T) => T);

interface ForecastState {
  payrollDraft: PayrollDraft;
  forecastStartNetWorth: number | null;
  forecastMonthlyDelta: number | null;
  setPayrollDraft: (draft: Updater<PayrollDraft>) => void;
  setForecastStartNetWorth: (value: number | null) => void;
  setForecastMonthlyDelta: (value: number | null) => void;
}

type PersistedForecast = {
  payrollDraft: unknown;
  forecastSettings: unknown;
};

const forecastStorage = {
  getItem: (_name: string): StorageValue<PersistedForecast> | null => {
    try {
      const payrollRaw = localStorage.getItem(PAYROLL_DRAFT_STORAGE_KEY);
      const forecastRaw = localStorage.getItem(FORECAST_SETTINGS_STORAGE_KEY);
      return {
        state: {
          payrollDraft: payrollRaw ? JSON.parse(payrollRaw) : null,
          forecastSettings: forecastRaw ? JSON.parse(forecastRaw) : null
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
      localStorage.setItem(
        FORECAST_SETTINGS_STORAGE_KEY,
        JSON.stringify({
          startNetWorth: state.forecastStartNetWorth,
          monthlyDelta: state.forecastMonthlyDelta
        })
      );
    } catch {
      // ignore write errors
    }
  },
  removeItem: (_name: string) => {
    localStorage.removeItem(PAYROLL_DRAFT_STORAGE_KEY);
    localStorage.removeItem(FORECAST_SETTINGS_STORAGE_KEY);
  }
};

export const useForecastStore = create<ForecastState>()(
  persist(
    (set) => ({
      payrollDraft: EMPTY_PAYROLL_DRAFT,
      forecastStartNetWorth: null,
      forecastMonthlyDelta: null,
      setPayrollDraft: (draftOrUpdater) =>
        set((state) => ({
          payrollDraft:
            typeof draftOrUpdater === "function"
              ? draftOrUpdater(state.payrollDraft)
              : draftOrUpdater
        })),
      setForecastStartNetWorth: (value) => set({ forecastStartNetWorth: value }),
      setForecastMonthlyDelta: (value) => set({ forecastMonthlyDelta: value })
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
          const { startNetWorth, monthlyDelta } = parseForecastSettings(raw?.forecastSettings ?? {});
          return {
            ...current,
            payrollDraft,
            forecastStartNetWorth: startNetWorth,
            forecastMonthlyDelta: monthlyDelta
          };
        } catch {
          return {
            ...current,
            payrollDraft: EMPTY_PAYROLL_DRAFT,
            forecastStartNetWorth: null,
            forecastMonthlyDelta: null
          };
        }
      }
    }
  )
);
