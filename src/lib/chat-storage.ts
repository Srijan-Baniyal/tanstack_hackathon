export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface Chat {
  id: string;
  title: string;
  preview: string;
  time: string;
  unread: number;
  avatar: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  agentConfigs: StoredAgentConfig[];
}

export interface ServerMessage {
  id: string;
  chatId: string;
  authorId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
}

export interface ServerChat {
  id: string;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messages: ServerMessage[];
  agentConfigs?: StoredAgentConfig[];
}

export interface StoredAgentConfig {
  provider: "vercel" | "openrouter";
  modelId?: string;
  systemPrompt: string;
  webSearch?: "none" | "native" | "firecrawl";
}

export const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();

  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000);
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }
  return date.toLocaleDateString();
};

export const mapServerChat = (chat: ServerChat): Chat => {
  const avatarSeed = chat.title.trim() || "AI";
  return {
    id: chat.id,
    title: chat.title,
    preview: chat.preview,
    time: formatTimestamp(chat.updatedAt),
    unread: 0,
    avatar: avatarSeed.slice(0, 2).toUpperCase(),
    messages: chat.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    agentConfigs: Array.isArray(chat.agentConfigs)
      ? chat.agentConfigs.map((config) => ({
          provider: config.provider,
          modelId: config.modelId ?? undefined,
          systemPrompt: config.systemPrompt,
          webSearch: config.webSearch ?? undefined,
        }))
      : [],
  };
};

export const truncatePreview = (value: string, length = 50) =>
  value.length <= length ? value : `${value.slice(0, length)}...`;
