import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { getSettings } from "./settings";

export type VercelCredits = {
  balance: string | number;
  total_used: string | number;
};

export type OpenRouterCredits = {
  data: {
    limit: number;
    usage: number;
  };
};

async function fetchVercelCredits(): Promise<VercelCredits | null> {
  const settings = getSettings();
  if (!settings.vercelAiGateway) return null;

  const response = await axios.get<VercelCredits>(
    "https://ai-gateway.vercel.sh/v1/credits",
    {
      headers: {
        Authorization: `Bearer ${settings.vercelAiGateway}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
}

async function fetchOpenRouterCredits(): Promise<OpenRouterCredits | null> {
  const settings = getSettings();
  if (!settings.openRouterKey) return null;

  const response = await axios.get<OpenRouterCredits>(
    "https://openrouter.ai/api/v1/auth/key",
    {
      headers: {
        Authorization: `Bearer ${settings.openRouterKey}`,
      },
    }
  );
  return response.data;
}

export function useVercelCredits(enabled: boolean) {
  const settings = getSettings();
  return useQuery({
    queryKey: ["vercelCredits", settings.vercelAiGateway, enabled],
    queryFn: fetchVercelCredits,
    enabled: enabled && !!settings.vercelAiGateway,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000,
  });
}

export function useOpenRouterCredits(enabled: boolean) {
  const settings = getSettings();
  return useQuery({
    queryKey: ["openRouterCredits", settings.openRouterKey, enabled],
    queryFn: fetchOpenRouterCredits,
    enabled: enabled && !!settings.openRouterKey,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 25000,
  });
}
