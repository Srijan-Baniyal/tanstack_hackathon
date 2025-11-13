import { createFileRoute } from "@tanstack/react-router";
import { verifyAccessToken } from "../../../convex/token";
import {
  buildChatMessages,
  getChatMessages,
  jsonResponse,
  loadUserKeys,
  RequestPayload,
  streamTextResponse,
} from "@/lib/server/chat-route-utils";

const API_ROUTE_PATH = "/api/vercel" as const;
const DEFAULT_TITLE = "MeshMind Chat";

const getVercelKey = async (accessToken: string) => {
  const keys = await loadUserKeys(accessToken);
  const storedKey = keys?.vercelKey
    ? String(keys.vercelKey).trim()
    : null;

  return (
    (storedKey && storedKey.length > 0 ? storedKey : null) ??
    process.env.VERCEL_AI_GATEWAY_KEY ??
    process.env.VERCEL_KEY ??
    null
  );
};

async function callVercelGateway(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
) {
  const baseURL =
    process.env.VERCEL_AI_GATEWAY_URL ?? "https://ai-gateway.vercel.sh/v1";

  const referer =
    process.env.VERCEL_REFERRER ??
    (typeof process !== "undefined" ? process.env.APP_BASE_URL : undefined) ??
    "https://tanstack.com/start";

  const title = process.env.VERCEL_TITLE ?? DEFAULT_TITLE;

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": title,
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: false,
    }),
  });

  if (!response.ok) {
    let errorDetail: unknown = null;
    try {
      errorDetail = await response.json();
    } catch {
      errorDetail = await response.text();
    }
    console.error("Vercel AI Gateway request failed", errorDetail);
    throw new Error(
      typeof errorDetail === "string"
        ? errorDetail
        : ((errorDetail as { error?: string })?.error ??
          `Vercel AI Gateway responded with ${response.status}`)
    );
  }

  const payload = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string | Array<{ text?: string }> };
    }>;
  };

  const primary = payload.choices?.[0]?.message;
  if (!primary) {
    throw new Error("Vercel AI Gateway returned an empty response.");
  }

  if (typeof primary.content === "string") {
    return primary.content;
  }

  if (Array.isArray(primary.content)) {
    return primary.content
      .map((segment) => segment?.text ?? "")
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

export const Route = createFileRoute(API_ROUTE_PATH as never)({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authHeader = request.headers.get("authorization");
        if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
          return jsonResponse({ error: "Missing authorization token." }, 401);
        }

        const accessToken = authHeader.slice(7).trim();
        if (!accessToken) {
          return jsonResponse({ error: "Invalid authorization token." }, 401);
        }

        try {
          verifyAccessToken(accessToken);
        } catch (error) {
          console.warn("Invalid access token presented to /api/vercel", error);
          return jsonResponse(
            { error: "Session expired. Please sign in again." },
            401
          );
        }

        let payload: RequestPayload;
        try {
          payload = (await request.json()) as RequestPayload;
        } catch {
          return jsonResponse({ error: "Invalid JSON payload." }, 400);
        }

        const agents = Array.isArray(payload.agents) ? payload.agents : [];
        if (agents.length === 0) {
          return jsonResponse({ error: "No agents provided." }, 400);
        }

        const selectedAgent =
          agents.find((agent) => agent.provider === "vercel") ?? agents[0];

        if (!selectedAgent || selectedAgent.provider !== "vercel") {
          return jsonResponse(
            { error: "Please configure at least one Vercel AI Gateway agent." },
            400
          );
        }

        if (!payload.currentMessage || !payload.currentMessage.trim()) {
          return jsonResponse({ error: "currentMessage is required." }, 400);
        }

        const modelId = selectedAgent.modelId ?? null;
        if (!modelId) {
          return jsonResponse(
            { error: "No Vercel model selected for the active agent." },
            400
          );
        }

        const [apiKey, history] = await Promise.all([
          getVercelKey(accessToken),
          getChatMessages(accessToken, payload.chatId),
        ]);

        if (!apiKey) {
          return jsonResponse(
            {
              error:
                "No Vercel AI Gateway API key configured. Add one in settings to continue.",
            },
            400
          );
        }

        const messages = buildChatMessages(
          history,
          payload.currentMessage,
          selectedAgent.systemPrompt
        );

        try {
          const content = await callVercelGateway(
            apiKey,
            modelId,
            messages
          );
          if (!content.trim()) {
            throw new Error("Vercel AI Gateway returned an empty message.");
          }
          return streamTextResponse(content);
        } catch (error) {
          console.error("Vercel AI Gateway request failed", error);
          const message =
            error instanceof Error && error.message
              ? error.message
              : "Vercel AI Gateway request failed.";
          return jsonResponse({ error: message }, 500);
        }
      },
    },
  },
});
