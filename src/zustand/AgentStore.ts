import { create } from "zustand";
import {
  fetchOpenRouterModels,
  type Model,
  type ProviderType,
} from "../lib/models";

export const DEFAULT_AGENT_COUNT = 1;
export const MAX_AGENTS = 10;
export const NONE_PROMPT_KEY = "__none__" as const;
export type SystemPromptKey = "__none__" | `custom-${number}`;

export interface AgentConfig {
  provider: ProviderType;
  modelId?: string;
  systemPromptKey: SystemPromptKey;
  webSearch?: "none" | "firecrawl";
  systemPromptOverride?: string;
}

export interface PreparedAgentConfig {
  provider: ProviderType;
  modelId?: string;
  systemPrompt: string;
  webSearch?: "none" | "firecrawl";
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
  setWebSearch: (index: number, value: "none" | "firecrawl") => void;
  ensureOpenRouterModels: (openRouterKey: string) => Promise<void>;
  validateSystemPromptKeys: (customPromptCount: number) => void;
  hydrateFromPreparedAgents: (
    agents: PreparedAgentConfig[],
    systemPrompts: string[]
  ) => void;
  resetAgents: () => void;
};

const createAgentConfig = (): AgentConfig => ({
  provider: "vercel",
  modelId: undefined,
  systemPromptKey: NONE_PROMPT_KEY,
  webSearch: "none",
  systemPromptOverride: undefined,
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
        target.modelId = undefined;
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
      nextConfigs[index] = {
        ...nextConfigs[index],
        systemPromptKey: key,
        systemPromptOverride: undefined,
      };
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
            return {
              ...agent,
              systemPromptKey: NONE_PROMPT_KEY,
              systemPromptOverride: undefined,
            };
          }
        }
        return agent;
      });
      return { agentConfigs: nextConfigs };
    });
  },

  hydrateFromPreparedAgents: (agents, systemPrompts) => {
    set(() => {
      if (!Array.isArray(agents) || agents.length === 0) {
        return {
          agentCount: initialState.agentCount,
          agentConfigs: Array.from(
            { length: initialState.agentCount },
            createAgentConfig
          ),
        };
      }

      const deriveKey = (
        prompt: string
      ): {
        key: SystemPromptKey;
        override?: string;
      } => {
        if (!prompt.trim()) {
          return { key: NONE_PROMPT_KEY };
        }

        const trimmed = prompt.trim();
        const matchedIndex = systemPrompts.findIndex(
          (stored) => stored === trimmed
        );

        if (matchedIndex >= 0) {
          return {
            key: `custom-${matchedIndex}` as SystemPromptKey,
          };
        }

        return { key: NONE_PROMPT_KEY, override: trimmed };
      };

      const nextAgents = agents.slice(0, MAX_AGENTS).map((agent) => {
        const { key, override } = deriveKey(agent.systemPrompt ?? "");
        const provider: ProviderType =
          agent.provider === "openrouter" ? "openrouter" : "vercel";
        const webSearch =
          agent.webSearch === "firecrawl"
            ? agent.webSearch
            : "none";

        const config: AgentConfig = {
          provider,
          modelId: agent.modelId,
          systemPromptKey: key,
          webSearch,
          systemPromptOverride: override,
        };

        return config;
      });

      const count = nextAgents.length > 0 ? nextAgents.length : 1;
      return {
        agentCount: count,
        agentConfigs:
          nextAgents.length > 0
            ? nextAgents
            : Array.from({ length: count }, createAgentConfig),
      };
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
