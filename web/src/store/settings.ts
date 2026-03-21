import { create } from "zustand";
import { persist } from "zustand/middleware";
import { APP_SETTINGS_STORAGE_KEY } from "../domain";

interface SettingsState {
  openaiApiKey: string;
  setOpenaiApiKey: (key: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      openaiApiKey: "",
      setOpenaiApiKey: (key) => set({ openaiApiKey: key })
    }),
    {
      name: APP_SETTINGS_STORAGE_KEY,
      partialize: (state) => ({ openaiApiKey: state.openaiApiKey })
    }
  )
);
