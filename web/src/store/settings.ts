import { create } from "zustand";
import { persist } from "zustand/middleware";
import { APP_SETTINGS_STORAGE_KEY } from "../domain";

interface SettingsState {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
  displayName: string;
  setDisplayName: (name: string) => void;
  /** Birth year (e.g. 1990). 0 means not set. Used to compute current age for FIRE. */
  birthYear: number;
  setBirthYear: (year: number) => void;
  /** ISO 4217 currency code, e.g. "AUD", "USD", "GBP". */
  currency: string;
  setCurrency: (currency: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openaiApiKey: "",
      setOpenaiApiKey: (key) => set({ openaiApiKey: key }),
      displayName: "",
      setDisplayName: (name) => set({ displayName: name }),
      birthYear: 0,
      setBirthYear: (year) => set({ birthYear: year }),
      currency: "AUD",
      setCurrency: (currency) => set({ currency }),
    }),
    {
      name: APP_SETTINGS_STORAGE_KEY,
      partialize: (state) => ({
        openaiApiKey: state.openaiApiKey,
        displayName: state.displayName,
        birthYear: state.birthYear,
        currency: state.currency,
      })
    }
  )
);
