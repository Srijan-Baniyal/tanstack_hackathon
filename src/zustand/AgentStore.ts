import { create } from "zustand";
import {
  VERCEL_MODELS,
  fetchOpenRouterModels,
  type Model,
  type ProviderType,
} from "@/lib/models";

export const DEFAULT_AGENT_COUNT = 1;
export const MAX_AGENTS = 4;
export const DEFAULT_PROMPT_KEY = "__default__" as const;
export const NONE_PROMPT_KEY = "__none__" as const;
const DEFAULT_VERCEL_MODEL_ID = VERCEL_MODELS[0]?.id ?? "gpt-4o";

export type SystemPromptKey = "__default__" | "__none__" | `custom-${number}`;

export interface AgentConfig {
  provider: ProviderType;
  modelId?: string;
  systemPromptKey: SystemPromptKey;
  webSearch?: "none" | "native" | "firecrawl";
}

export interface PreparedAgentConfig {
  provider: ProviderType;
  modelId?: string;
  systemPrompt: string;
  webSearch?: "none" | "native" | "firecrawl";
}

type AgentStoreState = {
  agentCount: number;
  agentConfigs: AgentConfig[];
  openRouterModels: Model[];
  isLoadingOpenRouterModels: boolean;
  openRouterError: string | null;
  setAgentCount: (count: number) => void;
  setProvider: (index: number, provider: ProviderType) => void;
  setModelId: (index: number, modelId: string) => void;
  setSystemPromptKey: (index: number, key: SystemPromptKey) => void;
  setWebSearch: (
    index: number,
    value: "none" | "native" | "firecrawl"
  ) => void;
  ensureOpenRouterModels: (openRouterKey: string) => Promise<void>;
  validateSystemPromptKeys: (customPromptCount: number) => void;
  resetAgents: () => void;
};

const createAgentConfig = (): AgentConfig => ({
  provider: "vercel",
  modelId: DEFAULT_VERCEL_MODEL_ID,
  systemPromptKey: DEFAULT_PROMPT_KEY,
  webSearch: "none",
});

const initialState: Pick<
  AgentStoreState,
  | "agentCount"
  | "agentConfigs"
  | "openRouterModels"
  | "isLoadingOpenRouterModels"
  | "openRouterError"
> = {
  agentCount: DEFAULT_AGENT_COUNT,
  agentConfigs: Array.from({ length: DEFAULT_AGENT_COUNT }, createAgentConfig),
  openRouterModels: [],
  isLoadingOpenRouterModels: false,
  openRouterError: null,
};

export const useAgentStore = create<AgentStoreState>((set, get) => ({
  ...initialState,

  setAgentCount: (count) => {
    if (!Number.isFinite(count)) return;
    const nextCount = Math.min(Math.max(Math.floor(count), 1), MAX_AGENTS);

    set((state) => {
      if (nextCount > state.agentConfigs.length) {
        const additions = Array.from(
          { length: nextCount - state.agentConfigs.length },
          createAgentConfig
        );
        return {
          agentCount: nextCount,
          agentConfigs: [...state.agentConfigs, ...additions],
        };
      }

      if (nextCount < state.agentConfigs.length) {
        return {
          agentCount: nextCount,
          agentConfigs: state.agentConfigs.slice(0, nextCount),
        };
      }

      return {
        agentCount: nextCount,
        agentConfigs: state.agentConfigs,
      };
    });
  },

  setProvider: (index, provider) => {
    set((state) => {
      if (!state.agentConfigs[index]) {
        return state;
      }

      const nextConfigs = [...state.agentConfigs];
      const target: AgentConfig = { ...nextConfigs[index], provider };

      if (provider === "vercel") {
        target.modelId = VERCEL_MODELS[0]?.id ?? DEFAULT_VERCEL_MODEL_ID;
      } else {
        const models = state.openRouterModels;
        target.modelId = models[0]?.id;
      }

      nextConfigs[index] = target;
      return { agentConfigs: nextConfigs };
    });
  },

  setModelId: (index, modelId) => {
    set((state) => {
      if (!state.agentConfigs[index]) {
        return state;
      }

      const nextConfigs = [...state.agentConfigs];
      nextConfigs[index] = { ...nextConfigs[index], modelId };
      return { agentConfigs: nextConfigs };
    });
  },

  setSystemPromptKey: (index, key) => {
    set((state) => {
      if (!state.agentConfigs[index]) {
        return state;
      }

      const nextConfigs = [...state.agentConfigs];
      nextConfigs[index] = { ...nextConfigs[index], systemPromptKey: key };
      return { agentConfigs: nextConfigs };
    });
  },

  setWebSearch: (index, value) => {
    set((state) => {
      if (!state.agentConfigs[index]) {
        return state;
      }

      const nextConfigs = [...state.agentConfigs];
      nextConfigs[index] = { ...nextConfigs[index], webSearch: value };
      return { agentConfigs: nextConfigs };
    });
  },

  ensureOpenRouterModels: async (openRouterKey) => {
    const { isLoadingOpenRouterModels, openRouterModels } = get();
    if (isLoadingOpenRouterModels || openRouterModels.length > 0) {
      return;
    }

    set({ isLoadingOpenRouterModels: true, openRouterError: null });

    try {
      const models = await fetchOpenRouterModels(openRouterKey);
      set({ openRouterModels: models });
    } catch (error) {
      console.error("Unable to load OpenRouter models", error);
      set({ openRouterError: "Unable to load OpenRouter models" });
    } finally {
      set({ isLoadingOpenRouterModels: false });
    }
  },
  validateSystemPromptKeys: (customPromptCount) => {
    set((state) => {
      const nextConfigs = state.agentConfigs.map((agent) => {
        if (agent.systemPromptKey.startsWith("custom-")) {
          const index = Number(agent.systemPromptKey.split("-")[1]);
          if (!Number.isFinite(index) || index >= customPromptCount) {
            return { ...agent, systemPromptKey: DEFAULT_PROMPT_KEY };
          }
        }
        return agent;
      });
      return { agentConfigs: nextConfigs };
    });
  },

  resetAgents: () => {
    set({
      agentCount: initialState.agentCount,
      agentConfigs: Array.from(
        { length: initialState.agentCount },
        createAgentConfig
      ),
    });
  },
}));
