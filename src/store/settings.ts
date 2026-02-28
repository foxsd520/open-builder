import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AISettings {
  apiKey: string;
  apiUrl: string;
  model: string;
}

export interface WebSearchSettings {
  tavilyApiKey: string;
  tavilyApiUrl: string;
}

export type Language = "system" | "zh" | "en";
export type Theme = "system" | "light" | "dark";

export interface SystemSettings {
  language: Language;
  theme: Theme;
}

interface SettingsState {
  ai: AISettings;
  webSearch: WebSearchSettings;
  system: SystemSettings;

  setAI: (settings: AISettings) => void;
  setWebSearch: (settings: WebSearchSettings) => void;
  setSystem: (settings: SystemSettings) => void;
  isAIValid: () => boolean;
  isWebSearchConfigured: () => boolean;
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ai: {
        apiKey: "",
        apiUrl: "https://api.openai.com/v1/chat/completions",
        model: "gpt-5.3-codex",
      },
      webSearch: {
        tavilyApiKey: "",
        tavilyApiUrl: "https://api.tavily.com",
      },
      system: {
        language: "system" as Language,
        theme: "system" as Theme,
      },

      setAI: (settings) => set({ ai: settings }),
      setWebSearch: (settings) => set({ webSearch: settings }),
      setSystem: (settings) => set({ system: settings }),

      isAIValid: () => {
        const { ai } = get();
        return !!(ai.apiKey && ai.apiUrl && ai.model);
      },

      isWebSearchConfigured: () => {
        return !!get().webSearch.tavilyApiKey;
      },
    }),
    {
      name: "open-builder-settings",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        ai: state.ai,
        webSearch: state.webSearch,
        system: state.system,
      }),
    },
  ),
);
