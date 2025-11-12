import { create } from "zustand";
import { toast } from "sonner";
import type { UIMessage } from "ai";
import { convexClient } from "@/lib/convexClient";
import { api } from "../../convex/_generated/api";
import {
  mapServerChat,
  truncatePreview,
  formatTimestamp,
  type Chat,
  type Message,
  type ServerChat,
  type StoredAgentConfig,
} from "@/lib/chat-storage";
import type { PreparedAgentConfig } from "@/zustand/AgentStore";
import { useAuthStore } from "@/zustand/AuthStore";

type ActionReference = Parameters<typeof convexClient.action>[0];

type ChatStoreState = {
  conversations: Chat[];
  selectedChatId: string | null;
  isNewChatMode: boolean;
  messages: UIMessage[];
  isStreaming: boolean;
  activeAgents: PreparedAgentConfig[];
  initialize: () => Promise<void>;
  startNewChat: () => void;
  selectChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  sendMessage: (
    message: string,
    agents?: PreparedAgentConfig[]
  ) => Promise<void>;
  saveAgentConfiguration: (
    chatId: string,
    agents: PreparedAgentConfig[]
  ) => Promise<void>;
  reset: () => void;
};

type ServerChatWithAgents = ServerChat & {
  agentConfigs?: StoredAgentConfig[];
};

const getChatsRef = (name: string, fallback: string): ActionReference => {
  const chatsModule = (api as Record<string, unknown> | undefined)?.chats as
    | Record<string, ActionReference>
    | undefined;
  const reference = chatsModule?.[name];
  return reference ?? (fallback as unknown as ActionReference);
};

const toUIMessage = (message: Message): UIMessage => ({
  id: message.id,
  role: message.role,
  parts: [{ type: "text" as const, text: message.content }],
});

const mapToPreparedAgents = (
  agents: StoredAgentConfig[]
): PreparedAgentConfig[] =>
  agents.map((agent) => ({
    provider: agent.provider,
    modelId: agent.modelId,
    systemPrompt: agent.systemPrompt,
    webSearch: agent.webSearch,
  }));

const mapToStoredAgents = (
  agents: PreparedAgentConfig[]
): StoredAgentConfig[] =>
  agents.map((agent) => ({
    provider: agent.provider,
    modelId: agent.modelId,
    systemPrompt: agent.systemPrompt,
    webSearch: agent.webSearch,
  }));

const initialState: Pick<
  ChatStoreState,
  | "conversations"
  | "selectedChatId"
  | "isNewChatMode"
  | "messages"
  | "isStreaming"
  | "activeAgents"
> = {
  conversations: [],
  selectedChatId: null,
  isNewChatMode: false,
  messages: [],
  isStreaming: false,
  activeAgents: [],
};

const AI_RESPONSE_ENDPOINT = "/api/openrouter" as const;

export const useChatStore = create<ChatStoreState>((set, get) => ({
  ...initialState,

  initialize: async () => {
    const auth = useAuthStore.getState();
    await auth.initialize();
    const accessToken = await auth.getValidAccessToken();
    if (!accessToken) {
      set({ ...initialState, isNewChatMode: true });
      return;
    }

    const listRef = getChatsRef("listChats", "chats:listChats");
    try {
      const response =
        await auth.callAuthenticatedAction<ServerChat[]>(listRef);
      const chats = response.map(mapServerChat);
      set({
        conversations: chats,
        selectedChatId: chats.length > 0 ? chats[0].id : null,
        isNewChatMode: chats.length === 0,
        messages: chats.length > 0 ? chats[0].messages.map(toUIMessage) : [],
        isStreaming: false,
        activeAgents:
          chats.length > 0 ? mapToPreparedAgents(chats[0].agentConfigs) : [],
      });
    } catch (error) {
      console.error("Failed to load chats", error);
      toast.error("Could not load chats", {
        description: "Please try again after refreshing.",
      });
      set({ ...initialState, isNewChatMode: true });
    }
  },

  startNewChat: () => {
    set({
      selectedChatId: null,
      isNewChatMode: true,
      messages: [],
      isStreaming: false,
      activeAgents: [],
    });
  },

  selectChat: (chatId: string) => {
    const chats = get().conversations;
    const target = chats.find((chat) => chat.id === chatId);
    if (!target) return;

    const updatedChats = chats.map((chat) =>
      chat.id === chatId
        ? {
            ...chat,
            unread: 0,
          }
        : chat
    );

    set({
      conversations: updatedChats,
      selectedChatId: chatId,
      isNewChatMode: false,
      messages: target.messages.map(toUIMessage),
      isStreaming: false,
      activeAgents: mapToPreparedAgents(target.agentConfigs),
    });
  },

  renameChat: async (chatId, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      toast.error("Enter a chat name first.");
      return;
    }

    const auth = useAuthStore.getState();
    const renameRef = getChatsRef("renameChat", "chats:renameChat");
    try {
      await auth.callAuthenticatedAction(renameRef, {
        chatId,
        title: trimmed,
      });

      const now = Date.now();
      set((state) => ({
        conversations: state.conversations.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                title: trimmed,
                avatar: trimmed.slice(0, 2).toUpperCase(),
                updatedAt: now,
                time: formatTimestamp(now),
              }
            : chat
        ),
      }));

      toast.success("Chat renamed", {
        description: `Chat is now called "${trimmed}".`,
      });
    } catch (error) {
      console.error("Failed to rename chat", error);
      const message =
        error instanceof Error && error.message.includes("signed in")
          ? "You need to be signed in to rename chats."
          : "Please try again.";
      toast.error("Renaming failed", {
        description: message,
      });
    }
  },

  deleteChat: async (chatId) => {
    const auth = useAuthStore.getState();
    const deleteRef = getChatsRef("deleteChat", "chats:deleteChat");
    try {
      await auth.callAuthenticatedAction(deleteRef, { chatId });

      set((state) => {
        const remaining = state.conversations.filter(
          (chat) => chat.id !== chatId
        );
        if (state.selectedChatId !== chatId) {
          return { conversations: remaining };
        }

        if (remaining.length === 0) {
          return {
            conversations: remaining,
            selectedChatId: null,
            isNewChatMode: true,
            messages: [],
            isStreaming: false,
            activeAgents: [],
          };
        }

        const nextChat = remaining[0];
        return {
          conversations: remaining,
          selectedChatId: nextChat.id,
          isNewChatMode: false,
          messages: nextChat.messages.map(toUIMessage),
          isStreaming: false,
          activeAgents: mapToPreparedAgents(nextChat.agentConfigs),
        };
      });

      toast.success("Chat deleted", {
        description: "Your chat has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete chat", error);
      const message =
        error instanceof Error && error.message.includes("signed in")
          ? "You need to be signed in to delete chats."
          : "Please try again.";
      toast.error("Deletion failed", {
        description: message,
      });
    }
  },

  sendMessage: async (rawMessage, agents) => {
    const trimmedMessage = rawMessage.trim();
    if (!trimmedMessage) return;

    const activeAgents = agents ?? [];
    set({ activeAgents });

    const authState = useAuthStore.getState();
    const accessToken = await authState.getValidAccessToken();
    if (!accessToken) {
      toast.error("Sign in to send messages.");
      return;
    }

    const state = get();
    const now = Date.now();

    const userUIMessage: UIMessage = {
      id: crypto.randomUUID(),
      role: "user",
      parts: [{ type: "text" as const, text: trimmedMessage }],
    };

    const userStoredMessage: Message = {
      id: userUIMessage.id,
      role: "user",
      content: trimmedMessage,
      createdAt: now,
    };

    const appendRef = getChatsRef("appendMessage", "chats:appendMessage");
    const createRef = getChatsRef("createChat", "chats:createChat");

    let chatId = state.selectedChatId;
    let conversations = state.conversations;
    let previousMessages = state.messages;
    let assistantMessageId: string | null = null;

    try {
      if (state.isNewChatMode || !chatId) {
        const firstWords = trimmedMessage.split(" ").slice(0, 4).join(" ");
        const tentativeTitle = firstWords || "New Chat";
        const title =
          tentativeTitle.length > 60
            ? `${tentativeTitle.slice(0, 60)}...`
            : tentativeTitle;

        const created =
          await authState.callAuthenticatedAction<ServerChatWithAgents>(
            createRef,
            {
              title,
              firstMessage: {
                role: "user",
                content: trimmedMessage,
              },
              agents: activeAgents,
            }
          );

        const mapped = mapServerChat(created);
        conversations = [mapped, ...conversations];
        chatId = mapped.id;
        previousMessages = [];
        toast.success("Chat created", {
          description: "Your conversation has started.",
        });
      } else {
        await authState.callAuthenticatedAction(appendRef, {
          chatId,
          message: {
            role: "user",
            content: trimmedMessage,
          },
          agents: activeAgents,
        });

        conversations = conversations.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [...chat.messages, userStoredMessage],
                preview: truncatePreview(trimmedMessage),
                time: formatTimestamp(now),
                unread: 0,
                updatedAt: now,
                agentConfigs: mapToStoredAgents(activeAgents),
              }
            : chat
        );
      }

      const assistantUIMessage: UIMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        parts: [{ type: "text" as const, text: "" }],
      };
      assistantMessageId = assistantUIMessage.id;

      const assistantStoredMessage: Message = {
        id: assistantUIMessage.id,
        role: "assistant",
        content: "",
        createdAt: now,
      };

      conversations = conversations.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [...chat.messages, assistantStoredMessage],
            }
          : chat
      );

      set({
        conversations,
        selectedChatId: chatId,
        isNewChatMode: false,
        messages: [...previousMessages, userUIMessage, assistantUIMessage],
        isStreaming: true,
        activeAgents,
      });

      const response = await fetch(AI_RESPONSE_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          chatId,
          agents: activeAgents,
        }),
      });

      if (!response.ok || !response.body) {
        const contentType = response.headers.get("content-type") ?? "";
        let errorMessage: string | null = null;

        if (contentType.includes("application/json")) {
          try {
            const payload = await response.json();
            if (payload && typeof payload.error === "string") {
              errorMessage = payload.error.trim();
            }
          } catch (error) {
            console.warn("Failed to parse JSON error payload", error);
          }
        }

        if (!errorMessage) {
          const errorText = await response.text().catch(() => null);
          if (errorText && errorText.trim().length > 0) {
            errorMessage = errorText.trim();
          }
        }

        throw new Error(
          errorMessage && errorMessage.length > 0
            ? errorMessage
            : `Model request failed (${response.status})`
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          const remaining = decoder.decode();
          if (remaining) {
            assistantText += remaining;
          }
          break;
        }

        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          if (chunk) {
            assistantText += chunk;
            const latestText = assistantText;
            set((current) => ({
              messages: current.messages.map((message) =>
                message.id === assistantMessageId
                  ? {
                      ...message,
                      parts: [{ type: "text" as const, text: latestText }],
                    }
                  : message
              ),
            }));
          }
        }
      }

      if (!assistantText.trim()) {
        throw new Error("Assistant returned an empty response.");
      }

      const finalAssistantText = assistantText;

      await authState.callAuthenticatedAction(appendRef, {
        chatId,
        message: {
          role: "assistant",
          content: finalAssistantText,
        },
      });

      const completedAt = Date.now();

      set((current) => {
        const updatedChats = current.conversations.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((message) =>
                  message.id === assistantMessageId
                    ? {
                        ...message,
                        content: finalAssistantText,
                        createdAt: completedAt,
                      }
                    : message
                ),
                preview: truncatePreview(finalAssistantText),
                time: formatTimestamp(completedAt),
                updatedAt: completedAt,
              }
            : chat
        );

        const updatedMessages = current.messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                parts: [{ type: "text" as const, text: finalAssistantText }],
              }
            : message
        );

        return {
          conversations: updatedChats,
          messages: updatedMessages,
          isStreaming: false,
          activeAgents: current.activeAgents,
        };
      });
    } catch (error) {
      console.error("Failed to send message", error);
      const fallbackText =
        error instanceof Error && error.message
          ? `Error: ${error.message}`
          : "An unexpected error occurred while generating the reply.";

      set((current) => {
        if (!assistantMessageId) {
          return {
            ...current,
            isStreaming: false,
          };
        }

        const updatedConversations = current.conversations.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                messages: chat.messages.map((message) =>
                  message.id === assistantMessageId
                    ? { ...message, content: fallbackText }
                    : message
                ),
              }
            : chat
        );

        const updatedMessages = current.messages.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                parts: [{ type: "text" as const, text: fallbackText }],
              }
            : message
        );

        return {
          conversations: updatedConversations,
          messages: updatedMessages,
          isStreaming: false,
          activeAgents: current.activeAgents,
        };
      });

      toast.error("Message failed", {
        description: fallbackText,
      });
    }
  },

  saveAgentConfiguration: async (chatId, agents) => {
    const auth = useAuthStore.getState();
    const saveAgentsRef = getChatsRef(
      "saveAgentConfigs",
      "chats:saveAgentConfigs"
    );

    try {
      const updated = await auth.callAuthenticatedAction<{ updatedAt: number }>(
        saveAgentsRef,
        {
          chatId,
          agents,
        }
      );

      const updatedTimestamp = updated?.updatedAt ?? Date.now();

      set((state) => ({
        conversations: state.conversations.map((chat) =>
          chat.id === chatId
            ? {
                ...chat,
                agentConfigs: mapToStoredAgents(agents),
                updatedAt: updatedTimestamp,
                time: formatTimestamp(updatedTimestamp),
              }
            : chat
        ),
        activeAgents: agents,
      }));
    } catch (error) {
      console.error("Failed to save agent configuration", error);
      toast.error("Agent settings not saved", {
        description: "Please try again.",
      });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
