import axios from "axios";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export type ProviderType = "vercel" | "openrouter";

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
}

export const DEFAULT_SYSTEM_PROMPT = "You are a helpful assistant.";

// Curated list of models that Vercel AI Gateway supports out of the box.
// These align with the providers exposed by the `ai` sdk today.
export const VERCEL_MODELS: Model[] = [
  // OpenAI
  { id: "gpt-4.1", name: "GPT-4.1", provider: "openai", contextWindow: 128000 },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    provider: "openai",
    contextWindow: 128000,
  },
  { id: "gpt-4o", name: "GPT-4o", provider: "openai", contextWindow: 128000 },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    contextWindow: 64000,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    provider: "openai",
    contextWindow: 128000,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    provider: "openai",
    contextWindow: 16385,
  },

  // Anthropic
  {
    id: "claude-3-5-sonnet-latest",
    name: "Claude 3.5 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
  },
  {
    id: "claude-3-5-haiku-latest",
    name: "Claude 3.5 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
  },
  {
    id: "claude-3-opus-20240229",
    name: "Claude 3 Opus",
    provider: "anthropic",
    contextWindow: 200000,
  },
  {
    id: "claude-3-sonnet-20240229",
    name: "Claude 3 Sonnet",
    provider: "anthropic",
    contextWindow: 200000,
  },
  {
    id: "claude-3-haiku-20240307",
    name: "Claude 3 Haiku",
    provider: "anthropic",
    contextWindow: 200000,
  },

  // Google Gemini
  {
    id: "gemini-2.0-pro-exp",
    name: "Gemini 2.0 Pro Experimental",
    provider: "google",
    contextWindow: 2000000,
  },
  {
    id: "gemini-1.5-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    contextWindow: 2000000,
  },
  {
    id: "gemini-1.5-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    contextWindow: 1000000,
  },
  {
    id: "gemini-1.5-flash-8b",
    name: "Gemini 1.5 Flash 8B",
    provider: "google",
    contextWindow: 1000000,
  },

  // Mistral
  {
    id: "mistral-large-latest",
    name: "Mistral Large",
    provider: "mistral",
    contextWindow: 128000,
  },
  {
    id: "mistral-small-latest",
    name: "Mistral Small",
    provider: "mistral",
    contextWindow: 32000,
  },
  {
    id: "mistral-nemo",
    name: "Mistral Nemo",
    provider: "mistral",
    contextWindow: 32000,
  },

  // Meta
  {
    id: "meta-llama/llama-3.1-405b-instruct",
    name: "Llama 3.1 405B",
    provider: "meta",
    contextWindow: 131072,
  },
  {
    id: "meta-llama/llama-3.1-70b-instruct",
    name: "Llama 3.1 70B",
    provider: "meta",
    contextWindow: 131072,
  },
  {
    id: "meta-llama/llama-3.1-8b-instruct",
    name: "Llama 3.1 8B",
    provider: "meta",
    contextWindow: 131072,
  },

  // Others exposed via the gateway
  {
    id: "perplexity/llama-3.1-sonar-large-128k-online",
    name: "Perplexity Sonar Large",
    provider: "perplexity",
    contextWindow: 128000,
  },
  {
    id: "perplexity/llama-3.1-sonar-small-128k-online",
    name: "Perplexity Sonar Small",
    provider: "perplexity",
    contextWindow: 128000,
  },
  {
    id: "xai/grok-beta",
    name: "xAI Grok Beta",
    provider: "xai",
    contextWindow: 131072,
  },
];

let openRouterModelsCache: Model[] | null = null;
let openRouterFetchPromise: Promise<Model[]> | null = null;

type OpenRouterApiModel = {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
};

type OpenRouterApiResponse = {
  data?: OpenRouterApiModel[];
};

export async function fetchOpenRouterModels(apiKey?: string): Promise<Model[]> {
  if (openRouterModelsCache && openRouterModelsCache.length > 0) {
    return openRouterModelsCache;
  }

  if (openRouterFetchPromise) {
    return openRouterFetchPromise;
  }

  openRouterFetchPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      const { data } = await axios.get<OpenRouterApiResponse>(
        "https://openrouter.ai/api/v1/models",
        { headers }
      );

      const mapped: Model[] = Array.isArray(data?.data)
        ? data.data.map((model) => ({
            id: String(model?.id ?? ""),
            name: model?.name
              ? String(model.name)
              : String(model?.id ?? "Unnamed model"),
            provider: "openrouter",
            contextWindow:
              typeof model?.context_length === "number"
                ? model.context_length
                : undefined,
          }))
        : [];

      openRouterModelsCache = mapped;
      return mapped;
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? `${error.response?.status ?? ""} ${error.response?.statusText ?? ""}`.trim()
        : "";
      console.error(
        `Failed to fetch OpenRouter models${detail ? `: ${detail}` : ""}`,
        error
      );

      const fallback: Model[] = [
        {
          id: "openai/gpt-4o",
          name: "GPT-4o",
          provider: "openrouter",
          contextWindow: 128000,
        },
        {
          id: "anthropic/claude-3.5-sonnet",
          name: "Claude 3.5 Sonnet",
          provider: "openrouter",
          contextWindow: 200000,
        },
        {
          id: "meta-llama/llama-3.1-70b-instruct",
          name: "Llama 3.1 70B",
          provider: "openrouter",
          contextWindow: 131072,
        },
        {
          id: "google/gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          provider: "openrouter",
          contextWindow: 2000000,
        },
      ];

      openRouterModelsCache = fallback;
      return fallback;
    } finally {
      openRouterFetchPromise = null;
    }
  })();

  return openRouterFetchPromise;
}

export function clearOpenRouterModelCache() {
  openRouterModelsCache = null;
}

export function getIndependentModels(): Model[] {
  return [];
}

export function useOpenRouterModels(
  apiKey?: string
): UseQueryResult<Model[], Error> {
  return useQuery<Model[], Error>({
    queryKey: ["openRouterModels", apiKey ?? null],
    queryFn: () => fetchOpenRouterModels(apiKey),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
