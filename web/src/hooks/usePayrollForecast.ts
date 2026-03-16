import { useEffect, useState } from "react";
import {
  EMPTY_PAYROLL_DRAFT,
  FORECAST_SETTINGS_STORAGE_KEY,
  PAYROLL_DRAFT_STORAGE_KEY,
  parseForecastSettings,
  sanitizePayrollDraft
} from "../models";
import type { PayrollDraft } from "../models";

interface UsePayrollForecastResult {
  payrollDraft: PayrollDraft;
  setPayrollDraft: React.Dispatch<React.SetStateAction<PayrollDraft>>;
  forecastStartNetWorth: number | null;
  setForecastStartNetWorth: React.Dispatch<React.SetStateAction<number | null>>;
  forecastMonthlyDelta: number | null;
  setForecastMonthlyDelta: React.Dispatch<React.SetStateAction<number | null>>;
}

export function usePayrollForecast(): UsePayrollForecastResult {
  const [payrollDraft, setPayrollDraft] = useState<PayrollDraft>(EMPTY_PAYROLL_DRAFT);
  const [forecastStartNetWorth, setForecastStartNetWorth] = useState<number | null>(null);
  const [forecastMonthlyDelta, setForecastMonthlyDelta] = useState<number | null>(null);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    try {
      const rawPayroll = localStorage.getItem(PAYROLL_DRAFT_STORAGE_KEY);
      if (rawPayroll) {
        setPayrollDraft(sanitizePayrollDraft(JSON.parse(rawPayroll)));
      }

      const rawForecast = localStorage.getItem(FORECAST_SETTINGS_STORAGE_KEY);
      if (rawForecast) {
        const parsedForecast = parseForecastSettings(JSON.parse(rawForecast));
        setForecastStartNetWorth(parsedForecast.startNetWorth);
        setForecastMonthlyDelta(parsedForecast.monthlyDelta);
      }
    } catch {
      setPayrollDraft(EMPTY_PAYROLL_DRAFT);
      setForecastStartNetWorth(null);
      setForecastMonthlyDelta(null);
    } finally {
      setHasHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    localStorage.setItem(PAYROLL_DRAFT_STORAGE_KEY, JSON.stringify(payrollDraft));
  }, [payrollDraft, hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }
    localStorage.setItem(FORECAST_SETTINGS_STORAGE_KEY, JSON.stringify({
      startNetWorth: forecastStartNetWorth,
      monthlyDelta: forecastMonthlyDelta
    }));
  }, [forecastStartNetWorth, forecastMonthlyDelta, hasHydrated]);

  return {
    payrollDraft,
    setPayrollDraft,
    forecastStartNetWorth,
    setForecastStartNetWorth,
    forecastMonthlyDelta,
    setForecastMonthlyDelta
  };
}
