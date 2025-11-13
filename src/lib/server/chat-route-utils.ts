import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

export type SupportedProvider = "vercel" | "openrouter";

export type PreparedAgentConfig = {
  provider: SupportedProvider;
  modelId?: string;
  systemPrompt?: string;
  webSearch?: "none" | "native" | "firecrawl";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export type RequestPayload = {
  chatId?: string | null;
  agents?: PreparedAgentConfig[];
  currentMessage?: string;
};

export type UserKeys = {
  openrouterKey?: string | null;
  vercelKey?: string | null;
};

export const MAX_MESSAGES_IN_CONTEXT = 30;

const encoder = new TextEncoder();

const resolveConvexUrl = () => {
  try {
    // Server-side: prioritize process.env
    if (typeof process !== 'undefined' && process.env) {
      return process.env.VITE_CONVEX_URL ?? process.env.CONVEX_URL ?? null;
    }
    
    // Client-side: try import.meta.env
    const viteUrl =
      typeof import.meta !== "undefined"
        ? (import.meta as { env?: Record<string, string | undefined> }).env
            ?.VITE_CONVEX_URL
        : undefined;
    return viteUrl ?? null;
  } catch {
    return null;
  }
};

const convexClientSingleton = (() => {
  let client: ConvexHttpClient | null = null;
  return () => {
    if (client) {
      return client;
    }
    const convexUrl = resolveConvexUrl();
    if (!convexUrl) {
      throw new Error(
        "Missing Convex URL. Set VITE_CONVEX_URL or CONVEX_URL in your environment."
      );
    }
    client = new ConvexHttpClient(convexUrl);
    return client;
  };
})();

const sanitizeMessages = (messages: ChatMessage[]) =>
  messages
    .slice()
    .sort((a, b) => a.createdAt - b.createdAt)
    .filter((message) => Boolean(message.content && message.content.trim()))
    .slice(-MAX_MESSAGES_IN_CONTEXT);

const normalizeRole = (role: string): "user" | "assistant" => {
  return role === "assistant" ? "assistant" : "user";
};

export const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });

export const streamTextResponse = (content: string) =>
  new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(content));
        controller.close();
      },
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    }
  );

export const getConvexClient = () => convexClientSingleton();

export const getChatMessages = async (
  accessToken: string,
  chatId?: string | null
): Promise<ChatMessage[]> => {
  if (!chatId) {
    return [];
  }

  const convex = getConvexClient();

  try {
    const chats = (await convex.action(api.chats.listChats, {
      accessToken,
    })) as Array<{
      id: string;
      messages?: Array<{
        id: string;
        role: string;
        content: string;
        createdAt: number;
      }>;
    }>;

    const target = chats.find(
      (chat) => typeof chat?.id === "string" && chat.id === chatId
    );

    if (!target?.messages) {
      return [];
    }

    return target.messages.map((message) => ({
      id: String(message.id),
      role: normalizeRole(message.role),
      content: message.content,
      createdAt: Number(message.createdAt ?? Date.now()),
    }));
  } catch (error) {
    console.error("Failed to load chat history from Convex", error);
    return [];
  }
};

export const buildChatMessages = (
  history: ChatMessage[],
  currentMessage: string,
  systemPrompt: string | undefined
): Array<{ role: "system" | "user" | "assistant"; content: string }> => {
  const trimmedCurrent = currentMessage.trim();
  const base: Array<{ role: "user" | "assistant"; content: string }> =
    sanitizeMessages(history).map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    }));

  const hasCurrent =
    base.length > 0 &&
    base[base.length - 1]?.role === "user" &&
    base[base.length - 1]?.content === trimmedCurrent;

  const prepared = hasCurrent
    ? base
    : [
        ...base,
        {
          role: "user" as const,
          content: trimmedCurrent,
        },
      ];

  if (systemPrompt && systemPrompt.trim().length > 0) {
    return [
      {
        role: "system" as const,
        content: systemPrompt.trim(),
      },
      ...prepared,
    ];
  }

  return prepared;
};

export const loadUserKeys = async (
  accessToken: string
): Promise<UserKeys | null> => {
  const convex = getConvexClient();
  try {
    const keys = (await convex.action(api.authActions.getUserKeys, {
      accessToken,
    })) as UserKeys | null;
    if (!keys || typeof keys !== "object") {
      return null;
    }
    return {
      openrouterKey: keys.openrouterKey ?? null,
      vercelKey: keys.vercelKey ?? null,
    };
  } catch (error) {
    console.error("Failed to load stored user keys", error);
    return null;
  }
};

