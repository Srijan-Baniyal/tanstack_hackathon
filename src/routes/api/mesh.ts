import { createFileRoute } from "@tanstack/react-router";
import { verifyAccessToken } from "../../../convex/token";
import {
  buildChatMessages,
  getChatMessages,
  jsonResponse,
  loadUserKeys,
  RequestPayload,
} from "@/lib/server/chat-route-utils";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const VERCEL_BASE_URL = process.env.VERCEL_AI_GATEWAY_URL ??
  "https://ai-gateway.vercel.sh/v1";

const API_ROUTE_PATH = "/api/mesh" as const;

type AgentStreamMetadata = {
  index: number;
  provider: string;
  modelId?: string | null;
};

const encodeAgentStart = (metadata: AgentStreamMetadata) =>
  `[[mesh-agent:${JSON.stringify(metadata)}]]\n`;

const encodeAgentEnd = (index: number) => `[[mesh-agent-end:${index}]]\n`;

const getOpenRouterKey = async (accessToken: string) => {
  const keys = await loadUserKeys(accessToken);
  const storedKey = keys?.openrouterKey ? String(keys.openrouterKey).trim() : null;

  return (
    (storedKey && storedKey.length > 0 ? storedKey : null) ??
    process.env.OPENROUTER_API_KEY ??
    process.env.OPENROUTER_KEY ??
    null
  );
};

const getVercelKey = async (accessToken: string) => {
  const keys = await loadUserKeys(accessToken);
  const storedKey = keys?.vercelKey ? String(keys.vercelKey).trim() : null;

  return (
    (storedKey && storedKey.length > 0 ? storedKey : null) ??
    process.env.VERCEL_AI_GATEWAY_KEY ??
    process.env.VERCEL_KEY ??
    null
  );
};

async function callOpenRouter(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
) {
  const referer = process.env.OPENROUTER_REFERRER ?? process.env.APP_BASE_URL ?? "https://tanstack.com/start";
  const title = process.env.OPENROUTER_TITLE ?? "MeshMind Chat";

  const response = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": title,
    },
    body: JSON.stringify({ model: modelId, messages, stream: false }),
  });

  if (!response.ok) {
    let err: unknown = null;
    try {
      err = await response.json();
    } catch {
      err = await response.text();
    }
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }

  const payload = await response.json();
  const primary = payload.choices?.[0]?.message;
  if (!primary) throw new Error("OpenRouter returned an empty response.");

  if (typeof primary.content === "string") return primary.content;
  if (Array.isArray(primary.content)) {
    return primary.content.map((s: any) => s?.text ?? "").filter(Boolean).join("\n");
  }

  return "";
}

async function callVercelGateway(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
) {
  const referer = process.env.VERCEL_REFERRER ?? process.env.APP_BASE_URL ?? "https://tanstack.com/start";
  const title = process.env.VERCEL_TITLE ?? "MeshMind Chat";

  const response = await fetch(`${VERCEL_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": referer,
      "X-Title": title,
    },
    body: JSON.stringify({ model: modelId, messages, stream: false }),
  });

  if (!response.ok) {
    let err: unknown = null;
    try {
      err = await response.json();
    } catch {
      err = await response.text();
    }
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }

  const payload = await response.json();
  const primary = payload.choices?.[0]?.message;
  if (!primary) throw new Error("Vercel AI Gateway returned an empty response.");

  if (typeof primary.content === "string") return primary.content;
  if (Array.isArray(primary.content)) {
    return primary.content.map((s: any) => s?.text ?? "").filter(Boolean).join("\n");
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
          console.warn("Invalid access token presented to /api/mesh", error);
          return jsonResponse({ error: "Session expired. Please sign in again." }, 401);
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

        if (!payload.currentMessage || !payload.currentMessage.trim()) {
          return jsonResponse({ error: "currentMessage is required." }, 400);
        }

        const textEncoder = new TextEncoder();

        return new Response(
          new ReadableStream({
            async start(controller) {
              // Process agents sequentially to ensure proper ordering
              for (let i = 0; i < agents.length; i++) {
                const agent = agents[i];
                const idx = i + 1;
                const resolvedModelId =
                  agent.modelId ??
                  (agent.provider === "openrouter"
                    ? process.env.OPENROUTER_DEFAULT_MODEL ?? "gpt-4o-mini"
                    : "gpt-4o");
                const metadata: AgentStreamMetadata = {
                  index: idx,
                  provider: agent.provider,
                  modelId: resolvedModelId,
                };

                // Send start marker
                controller.enqueue(
                  textEncoder.encode(encodeAgentStart(metadata))
                );

                let body = "";

                try {
                  if (agent.provider === "openrouter") {
                    const apiKey = await getOpenRouterKey(accessToken);
                    if (!apiKey) {
                      body = `Error: No OpenRouter API key configured for agent ${idx}`;
                    } else {
                      const history = await getChatMessages(
                        accessToken,
                        payload.chatId
                      );
                      const messages = buildChatMessages(
                        history,
                        payload.currentMessage!,
                        agent.systemPrompt
                      );
                      body = await callOpenRouter(
                        apiKey,
                        resolvedModelId,
                        messages
                      );
                    }
                  } else if (agent.provider === "vercel") {
                    const apiKey = await getVercelKey(accessToken);
                    if (!apiKey) {
                      body = `Error: No Vercel API key configured for agent ${idx}`;
                    } else {
                      const history = await getChatMessages(
                        accessToken,
                        payload.chatId
                      );
                      const messages = buildChatMessages(
                        history,
                        payload.currentMessage!,
                        agent.systemPrompt
                      );
                      body = await callVercelGateway(
                        apiKey,
                        resolvedModelId,
                        messages
                      );
                    }
                  } else {
                    body = `Error: Unsupported provider for agent ${idx}`;
                  }
                } catch (error) {
                  const message = error instanceof Error && error.message ? error.message : String(error);
                  body = `Error: ${message}`;
                }

                // Send content and end marker
                controller.enqueue(
                  textEncoder.encode(`${body}${encodeAgentEnd(idx)}`)
                );
              }

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
      },
    },
  },
});
