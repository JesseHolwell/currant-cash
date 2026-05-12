import { create } from "zustand";
import { persist } from "zustand/middleware";

const FIRE_SETTINGS_STORAGE_KEY = "fire_settings";

interface FireState {
  currentAge: number;
  annualReturn: number;
  multiplier: number;
  /** Age at which locked retirement assets (super / 401k) become accessible. */
  preservationAge: number;
  setCurrentAge: (age: number) => void;
  setAnnualReturn: (rate: number) => void;
  setMultiplier: (multiplier: number) => void;
  setPreservationAge: (age: number) => void;
}

export const useFireStore = create<FireState>()(
  persist(
    (set) => ({
      currentAge: 30,
      annualReturn: 7,
      multiplier: 25,
      preservationAge: 60,
      setCurrentAge: (age) => set({ currentAge: age }),
      setAnnualReturn: (rate) => set({ annualReturn: rate }),
      setMultiplier: (multiplier) => set({ multiplier }),
      setPreservationAge: (age) => set({ preservationAge: age })
    }),
    {
      name: FIRE_SETTINGS_STORAGE_KEY,
      partialize: (state) => ({
        currentAge: state.currentAge,
        annualReturn: state.annualReturn,
        multiplier: state.multiplier,
        preservationAge: state.preservationAge
      })
    }
  )
);
