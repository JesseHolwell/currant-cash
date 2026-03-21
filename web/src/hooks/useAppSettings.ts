import { useEffect, useState } from "react";
import { APP_SETTINGS_STORAGE_KEY } from "../models";

type AppSettings = {
  openaiApiKey: string;
};

const DEFAULT_SETTINGS: AppSettings = {
  openaiApiKey: "",
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      openaiApiKey: typeof parsed.openaiApiKey === "string" ? parsed.openaiApiKey : "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadSettings());
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    localStorage.setItem(APP_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, hasHydrated]);

  function setOpenaiApiKey(key: string) {
    setSettings((prev) => ({ ...prev, openaiApiKey: key }));
  }

  return {
    openaiApiKey: settings.openaiApiKey,
    setOpenaiApiKey,
  };
}
