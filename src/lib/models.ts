import axios from "axios";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";

export type ProviderType = "vercel" | "openrouter";

export interface Model {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
}

const DEFAULT_VERCEL_MODELS_URL = "https://ai-gateway.vercel.sh/v1/models";

let openRouterModelsCache: Model[] | null = null;
let openRouterFetchPromise: Promise<Model[]> | null = null;

const vercelModelsCache = new Map<string, Model[]>();
const vercelFetchPromises = new Map<string, Promise<Model[]>>();

type OpenRouterApiModel = {
  id?: unknown;
  name?: unknown;
  context_length?: unknown;
};

type OpenRouterApiResponse = {
  data?: OpenRouterApiModel[];
};

type VercelApiModel = {
  id?: unknown;
  name?: unknown;
  owned_by?: unknown;
  context_window?: unknown;
};

type VercelApiResponse = {
  data?: VercelApiModel[];
};

const formatVercelOwner = (owner: string): string => {
  if (!owner) {
    return "Vercel";
  }

  const normalized = owner.replace(/[-_.]+/g, " ").trim();
  if (!normalized) {
    return "Vercel";
  }

  if (/[A-Z]/.test(normalized)) {
    return normalized;
  }

  return normalized
    .split(/\s+/)
    .map((segment) => {
      if (!segment) {
        return segment;
      }

      if (segment.length <= 3 || /\d/.test(segment)) {
        return segment.toUpperCase();
      }

      return segment.charAt(0).toUpperCase() + segment.slice(1);
    })
    .join(" ");
};

const normalizeVercelModelsUrl = (gatewayUrl?: string): string => {
  const trimmed = (gatewayUrl ?? "").trim();
  if (!trimmed) {
    return DEFAULT_VERCEL_MODELS_URL;
  }

  try {
    const url = new URL(trimmed);
    const pathname = url.pathname.replace(/\/+$/, "");
    if (pathname.endsWith("/models")) {
      url.pathname = pathname;
      return url.toString();
    }
    url.pathname = `${pathname}/models`.replace(/\/+/, "/");
    return url.toString();
  } catch {
    const prepared = trimmed.includes("://") ? trimmed : `https://${trimmed}`;
    const withoutTrailingSlash = prepared.replace(/\/+$/, "");
    if (withoutTrailingSlash.endsWith("/models")) {
      return withoutTrailingSlash;
    }
    return `${withoutTrailingSlash}/models`;
  }
};

const mapVercelModels = (response: VercelApiResponse): Model[] => {
  const candidates = Array.isArray(response?.data) ? response.data : [];
  const models: Model[] = [];

  for (const candidate of candidates) {
    if (
      !candidate ||
      typeof candidate.id !== "string" ||
      !candidate.id.trim()
    ) {
      continue;
    }

    const baseName =
      typeof candidate.name === "string" && candidate.name.trim().length > 0
        ? candidate.name.trim()
        : candidate.id;

    const owner =
      typeof candidate.owned_by === "string" &&
      candidate.owned_by.trim().length > 0
        ? candidate.owned_by.trim()
        : null;

    const ownerLabel = owner ? formatVercelOwner(owner) : null;

    const name = ownerLabel ? `${ownerLabel}: ${baseName}` : baseName;

    models.push({
      id: candidate.id,
      name,
      provider: "vercel",
      contextWindow:
        typeof candidate.context_window === "number"
          ? candidate.context_window
          : undefined,
    });
  }

  return models.sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
  );
};

const getVercelCacheKey = (gatewayUrl?: string) =>
  normalizeVercelModelsUrl(gatewayUrl);

export async function fetchVercelModels(gatewayUrl?: string): Promise<Model[]> {
  const cacheKey = getVercelCacheKey(gatewayUrl);

  const cached = vercelModelsCache.get(cacheKey);
  if (cached && cached.length > 0) {
    return cached;
  }

  const inFlight = vercelFetchPromises.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  const fetchPromise = (async () => {
    try {
      const { data } = await axios.get<VercelApiResponse>(cacheKey, {
        headers: { Accept: "application/json" },
      });

      const mapped = mapVercelModels(data);
      vercelModelsCache.set(cacheKey, mapped);
      return mapped;
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? `${error.response?.status ?? ""} ${error.response?.statusText ?? ""}`.trim()
        : "";
      console.error(
        `Failed to fetch Vercel models${detail ? `: ${detail}` : ""}`,
        error
      );
      vercelModelsCache.set(cacheKey, []);
      return [];
    } finally {
      vercelFetchPromises.delete(cacheKey);
    }
  })();

  vercelFetchPromises.set(cacheKey, fetchPromise);
  return fetchPromise;
}

export function clearVercelModelCache(gatewayUrl?: string) {
  if (gatewayUrl) {
    const key = getVercelCacheKey(gatewayUrl);
    vercelModelsCache.delete(key);
    vercelFetchPromises.delete(key);
    return;
  }

  vercelModelsCache.clear();
  vercelFetchPromises.clear();
}

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

      const sorted = mapped.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );

      openRouterModelsCache = sorted;
      return sorted;
    } catch (error) {
      const detail = axios.isAxiosError(error)
        ? `${error.response?.status ?? ""} ${error.response?.statusText ?? ""}`.trim()
        : "";
      console.error(
        `Failed to fetch OpenRouter models${detail ? `: ${detail}` : ""}`,
        error
      );
      openRouterModelsCache = [];
      return [];
    } finally {
      openRouterFetchPromise = null;
    }
  })();

  return openRouterFetchPromise;
}

export function clearOpenRouterModelCache() {
  openRouterModelsCache = null;
  openRouterFetchPromise = null;
}

export function getIndependentModels(): Model[] {
  return [];
}

export function useVercelModels(
  gatewayUrl?: string
): UseQueryResult<Model[], Error> {
  const cacheKey = getVercelCacheKey(gatewayUrl);

  return useQuery<Model[], Error>({
    queryKey: ["vercelModels", cacheKey],
    queryFn: () => fetchVercelModels(gatewayUrl),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
    refetchIntervalInBackground: true,
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}

export function useOpenRouterModels(
  apiKey?: string
): UseQueryResult<Model[], Error> {
  return useQuery<Model[], Error>({
    queryKey: ["openRouterModels", apiKey ?? null],
    queryFn: () => fetchOpenRouterModels(apiKey),
    staleTime: 60 * 1000, // Data stays fresh for 1 minute
    refetchInterval: 60 * 1000, // Refetch every 1 minute
    refetchIntervalInBackground: true, // Continue refetching even when tab is not focused
    gcTime: 30 * 60 * 1000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}
