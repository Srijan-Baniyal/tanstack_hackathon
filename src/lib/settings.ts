export interface Settings {
  openRouterKey: string;
  vercelAiGateway: string;
  systemPrompts: string[];
}

const SETTINGS_STORAGE_KEY = "dashboard-settings";

const DEFAULT_SETTINGS: Settings = {
  openRouterKey: "",
  vercelAiGateway: "",
  systemPrompts: [],
};

const isBrowser = () => typeof window !== "undefined";

export const getSettings = (): Settings => {
  if (!isBrowser()) {
    return { ...DEFAULT_SETTINGS };
  }

  const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!stored) {
    return { ...DEFAULT_SETTINGS };
  }

  try {
    const parsed = JSON.parse(stored) as Partial<Settings>;
    return {
      openRouterKey: parsed.openRouterKey ?? "",
      vercelAiGateway: parsed.vercelAiGateway ?? "",
      systemPrompts: Array.isArray(parsed.systemPrompts)
        ? parsed.systemPrompts
        : [],
    };
  } catch (error) {
    console.warn("Failed to parse stored settings", error);
    return { ...DEFAULT_SETTINGS };
  }
};

export const saveSettings = (settings: Settings) => {
  if (!isBrowser()) {
    return;
  }

  const sanitized: Settings = {
    openRouterKey: settings.openRouterKey.trim(),
    vercelAiGateway: settings.vercelAiGateway.trim(),
    systemPrompts: settings.systemPrompts
      .map((prompt) => prompt.trim())
      .filter((prompt) => prompt.length > 0),
  };

  window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(sanitized));

  // Dispatch custom event for same-tab updates
  window.dispatchEvent(new CustomEvent('settingsChanged', { detail: sanitized }));

  return sanitized;
};
