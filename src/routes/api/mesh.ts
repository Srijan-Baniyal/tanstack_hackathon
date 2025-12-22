import { createFileRoute } from "@tanstack/react-router";
import { verifyAccessToken } from "../../../convex/token";
import {
  buildChatMessages,
  getChatMessages,
  jsonResponse,
  loadUserKeys,
  RequestPayload,
} from "../../lib/server/chat-route-utils";
import FirecrawlApp from "@mendable/firecrawl-js";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const VERCEL_BASE_URL =
  process.env.VERCEL_AI_GATEWAY_URL ?? "https://ai-gateway.vercel.sh/v1";

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
  const storedKey = keys?.openrouterKey
    ? String(keys.openrouterKey).trim()
    : null;

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

const getFirecrawlKey = () => {
  return process.env.FIRECRAWL_API_KEY ?? null;
};

// Extract URLs from a message using a robust regex
const extractUrls = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;
  const matches = text.match(urlRegex);
  return matches ? [...new Set(matches)] : [];
};

// Clean and format markdown content for better AI consumption
const formatScrapedContent = (markdown: string, metadata?: any): string => {
  let content = markdown.trim();

  // Remove excessive newlines (more than 2 consecutive)
  content = content.replace(/\n{3,}/g, "\n\n");

  // Build a structured header with metadata if available
  const headers: string[] = [];
  if (metadata?.title) {
    headers.push(`# ${metadata.title}`);
  }
  if (metadata?.description) {
    headers.push(`\n**Description:** ${metadata.description}`);
  }
  if (metadata?.author) {
    headers.push(`**Author:** ${metadata.author}`);
  }
  if (metadata?.publishedDate || metadata?.publishDate) {
    const date = metadata.publishedDate || metadata.publishDate;
    headers.push(`**Published:** ${date}`);
  }
  if (
    metadata?.keywords &&
    Array.isArray(metadata.keywords) &&
    metadata.keywords.length > 0
  ) {
    headers.push(`**Keywords:** ${metadata.keywords.join(", ")}`);
  }

  if (headers.length > 0) {
    content = `${headers.join("\n")}\n\n---\n\n${content}`;
  }

  return content;
};

// Scrape URLs using Firecrawl with enhanced data extraction
async function scrapeWithFirecrawl(urls: string[]): Promise<string> {
  const apiKey = getFirecrawlKey();
  if (!apiKey) {
    return "\n⚠️ **Firecrawl API key not configured.** Set FIRECRAWL_API_KEY environment variable to enable web scraping.";
  }

  try {
    const app = new FirecrawlApp({ apiKey });
    const results: string[] = [];

    for (const url of urls) {
      try {
        const scrapeResult = (await app.scrape(url, {
          formats: ["markdown", "html"],
          onlyMainContent: true,
          includeTags: ["article", "main", "content"],
          excludeTags: ["nav", "footer", "header", "aside", "script", "style"],
          waitFor: 2000,
        })) as any;

        if (scrapeResult && scrapeResult.markdown) {
          const formattedContent = formatScrapedContent(
            scrapeResult.markdown,
            scrapeResult.metadata,
          );

          // Add structured header
          results.push(
            `\n## 🌐 Scraped Content: ${url}\n\n${formattedContent}\n`,
          );
        } else if (scrapeResult && scrapeResult.html) {
          // Fallback to HTML if markdown not available
          results.push(
            `\n## 🌐 Content from: ${url}\n\n${scrapeResult.html.substring(0, 5000)}...\n`,
          );
        } else {
          results.push(
            `\n⚠️ **Failed to scrape:** ${url}\nNo content returned from Firecrawl.\n`,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        results.push(
          `\n❌ **Error scraping:** ${url}\n**Error:** ${message}\n`,
        );
      }
    }

    if (results.length === 0) {
      return "";
    }

    // Build a comprehensive header for all scraped content
    const header = [
      "\n" + "=".repeat(80),
      "📚 WEB CONTENT SCRAPED BY FIRECRAWL",
      `📊 Successfully scraped ${results.length} URL(s)`,
      "💡 Use this information to provide accurate, sourced answers",
      "=".repeat(80),
    ].join("\n");

    return `${header}\n${results.join("\n---\n")}`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `\n❌ **Firecrawl Error:** ${message}`;
  }
}

async function callOpenRouter(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const referer =
    process.env.OPENROUTER_REFERRER ??
    process.env.APP_BASE_URL ??
    "https://tanstack.com/start";
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
    return primary.content
      .map((s: any) => s?.text ?? "")
      .filter(Boolean)
      .join("\n");
  }

  return "";
}

async function callVercelGateway(
  apiKey: string,
  modelId: string,
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
) {
  const referer =
    process.env.VERCEL_REFERRER ??
    process.env.APP_BASE_URL ??
    "https://tanstack.com/start";
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
  if (!primary)
    throw new Error("Vercel AI Gateway returned an empty response.");

  if (typeof primary.content === "string") return primary.content;
  if (Array.isArray(primary.content)) {
    return primary.content
      .map((s: any) => s?.text ?? "")
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
          console.warn("Invalid access token presented to /api/mesh", error);
          return jsonResponse(
            { error: "Session expired. Please sign in again." },
            401,
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

        if (!payload.currentMessage || !payload.currentMessage.trim()) {
          return jsonResponse({ error: "currentMessage is required." }, 400);
        }

        const textEncoder = new TextEncoder();

        return new Response(
          new ReadableStream({
            async start(controller) {
              const startTime = Date.now();
              console.log(
                `[MESH] Starting parallel streaming for ${agents.length} agent(s)`,
              );

              // Pre-load chat history once for all agents (optimization)
              const history = await getChatMessages(
                accessToken,
                payload.chatId,
              );

              // Track completed agents to avoid race conditions
              let completedCount = 0;

              // Process all agents concurrently with streaming as they complete
              const agentPromises = agents.map(async (agent, i) => {
                const agentStartTime = Date.now();
                const idx = i + 1;
                const resolvedModelId =
                  agent.modelId ??
                  (agent.provider === "openrouter"
                    ? (process.env.OPENROUTER_DEFAULT_MODEL ?? "gpt-4o-mini")
                    : "gpt-4o");
                const metadata: AgentStreamMetadata = {
                  index: idx,
                  provider: agent.provider,
                  modelId: resolvedModelId,
                };

                let body = "";

                try {
                  // Handle web scraping if enabled (can run in parallel per agent)
                  let scrapedContent = "";
                  if (agent.webSearch === "firecrawl") {
                    const urls = extractUrls(payload.currentMessage!);
                    if (urls.length > 0) {
                      scrapedContent = await scrapeWithFirecrawl(urls);
                    }
                  }

                  // Build messages with scraped content if available
                  let messageContent = payload.currentMessage!;
                  if (scrapedContent) {
                    messageContent = `${payload.currentMessage}\n\n${scrapedContent}\n\n---\n\n**Instructions:**\n- Use the scraped web content above to answer the user's question\n- Cite specific information from the sources when relevant\n- If the content doesn't fully answer the question, acknowledge what's missing\n- Provide accurate, well-sourced information based on the scraped content`;
                  }

                  const messages = buildChatMessages(
                    history,
                    messageContent,
                    agent.systemPrompt,
                  );

                  if (agent.provider === "openrouter") {
                    const apiKey = await getOpenRouterKey(accessToken);
                    if (!apiKey) {
                      body = `Error: No OpenRouter API key configured for agent ${idx}`;
                    } else {
                      body = await callOpenRouter(
                        apiKey,
                        resolvedModelId,
                        messages,
                      );
                    }
                  } else if (agent.provider === "vercel") {
                    const apiKey = await getVercelKey(accessToken);
                    if (!apiKey) {
                      body = `Error: No Vercel API key configured for agent ${idx}`;
                    } else {
                      body = await callVercelGateway(
                        apiKey,
                        resolvedModelId,
                        messages,
                      );
                    }
                  } else {
                    body = `Error: Unsupported provider for agent ${idx}`;
                  }
                } catch (error) {
                  const message =
                    error instanceof Error && error.message
                      ? error.message
                      : String(error);
                  body = `Error: ${message}`;
                }

                const agentEndTime = Date.now();
                const agentDuration = agentEndTime - agentStartTime;
                console.log(
                  `[MESH] Agent ${idx} completed in ${agentDuration}ms (${++completedCount}/${agents.length})`,
                );

                // Stream immediately as this agent completes (true parallel streaming)
                controller.enqueue(
                  textEncoder.encode(encodeAgentStart(metadata)),
                );
                controller.enqueue(
                  textEncoder.encode(`${body}${encodeAgentEnd(idx)}`),
                );

                return { metadata, body, idx };
              });

              // Wait for all agents to complete
              await Promise.allSettled(agentPromises);

              const totalTime = Date.now() - startTime;
              console.log(
                `[MESH] All ${agents.length} agent(s) completed in ${totalTime}ms`,
              );

              controller.close();
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-store",
            },
          },
        );
      },
    },
  },
});
