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
} from "@/lib/chat-storage";
import { useAuthStore } from "@/zustand/AuthStore";

type ChatStoreState = {
  conversations: Chat[];
  selectedChatId: string | null;
  isNewChatMode: boolean;
  messages: UIMessage[];
  isStreaming: boolean;
  initialize: () => Promise<void>;
  startNewChat: () => void;
  selectChat: (chatId: string) => void;
  renameChat: (chatId: string, newTitle: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  reset: () => void;
};

const AI_RESPONSES = [
  "That's a great question! Let me help you with that. 🚀",
  "I understand what you're asking. Here's my take on it...",
  "Interesting! I'd be happy to assist you with that.",
  "Sure thing! Let me explain that for you.",
  "Absolutely! Here's what I think about that...",
  "Great minds think alike! Let me share some insights.",
  "Brilliant! That's exactly the right approach, innit!",
  "Cheers! I've got just the solution for you, mate.",
];

const getChatsRef = (name: string, fallback: string) => {
  const chatsModule = (api as Record<string, any> | undefined)?.chats;
  const reference = chatsModule?.[name];
  return reference ?? fallback;
};

const toUIMessage = (message: Message): UIMessage => ({
  id: message.id,
  role: message.role,
  parts: [{ type: "text" as const, text: message.content }],
});

const initialState: Pick<
  ChatStoreState,
  | "conversations"
  | "selectedChatId"
  | "isNewChatMode"
  | "messages"
  | "isStreaming"
> = {
  conversations: [],
  selectedChatId: null,
  isNewChatMode: false,
  messages: [],
  isStreaming: false,
};

export const useChatStore = create<ChatStoreState>((set, get) => ({
  ...initialState,

  initialize: async () => {
    const auth = useAuthStore.getState();
    await auth.initialize();
    const token = useAuthStore.getState().tokens?.accessToken;
    if (!token) {
      set({ ...initialState, isNewChatMode: true });
      return;
    }

    const listRef = getChatsRef("listChats", "chats:listChats");
    try {
      const response = (await convexClient.action(listRef, {
        accessToken: token,
      })) as ServerChat[];
      const chats = response.map(mapServerChat);
      set({
        conversations: chats,
        selectedChatId: chats.length > 0 ? chats[0].id : null,
        isNewChatMode: chats.length === 0,
        messages: chats.length > 0 ? chats[0].messages.map(toUIMessage) : [],
        isStreaming: false,
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
    });
  },

  renameChat: async (chatId, newTitle) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      toast.error("Enter a chat name first.");
      return;
    }

    const token = useAuthStore.getState().tokens?.accessToken;
    if (!token) {
      toast.error("You need to be signed in to rename chats.");
      return;
    }

    const renameRef = getChatsRef("renameChat", "chats:renameChat");
    try {
      await convexClient.action(renameRef, {
        accessToken: token,
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
      toast.error("Renaming failed", {
        description: "Please try again.",
      });
    }
  },

  deleteChat: async (chatId) => {
    const token = useAuthStore.getState().tokens?.accessToken;
    if (!token) {
      toast.error("You need to be signed in to delete chats.");
      return;
    }

    const deleteRef = getChatsRef("deleteChat", "chats:deleteChat");
    try {
      await convexClient.action(deleteRef, { accessToken: token, chatId });

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
          };
        }

        const nextChat = remaining[0];
        return {
          conversations: remaining,
          selectedChatId: nextChat.id,
          isNewChatMode: false,
          messages: nextChat.messages.map(toUIMessage),
          isStreaming: false,
        };
      });

      toast.success("Chat deleted", {
        description: "Your chat has been removed.",
      });
    } catch (error) {
      console.error("Failed to delete chat", error);
      toast.error("Deletion failed", {
        description: "Please try again.",
      });
    }
  },

  sendMessage: async (rawMessage) => {
    const trimmedMessage = rawMessage.trim();
    if (!trimmedMessage) return;

    const authState = useAuthStore.getState();
    const token = authState.tokens?.accessToken;
    if (!token) {
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

    try {
      if (state.isNewChatMode || !chatId) {
        const firstWords = trimmedMessage.split(" ").slice(0, 4).join(" ");
        const tentativeTitle = firstWords || "New Chat";
        const title =
          tentativeTitle.length > 60
            ? `${tentativeTitle.slice(0, 60)}...`
            : tentativeTitle;

        const created = (await convexClient.action(createRef, {
          accessToken: token,
          title,
          firstMessage: {
            role: "user",
            content: trimmedMessage,
          },
        })) as ServerChat;

        const mapped = mapServerChat(created);
        conversations = [mapped, ...conversations];
        chatId = mapped.id;
        previousMessages = [];
        toast.success("Chat created", {
          description: "Your conversation has started.",
        });
      } else {
        await convexClient.action(appendRef, {
          accessToken: token,
          chatId,
          message: {
            role: "user",
            content: trimmedMessage,
          },
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
              }
            : chat
        );
      }

      set({
        conversations,
        selectedChatId: chatId,
        isNewChatMode: false,
        messages: [...previousMessages, userUIMessage],
        isStreaming: true,
      });

      const responseDelay = 1500;

      setTimeout(async () => {
        const aiResponse =
          AI_RESPONSES[Math.floor(Math.random() * AI_RESPONSES.length)];
        const aiUIMessage: UIMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          parts: [{ type: "text" as const, text: aiResponse }],
        };

        const aiStoredMessage: Message = {
          id: aiUIMessage.id,
          role: "assistant",
          content: aiResponse,
          createdAt: Date.now(),
        };

        try {
          if (chatId) {
            await convexClient.action(appendRef, {
              accessToken: token,
              chatId,
              message: {
                role: "assistant",
                content: aiResponse,
              },
            });
          }
        } catch (error) {
          console.error("Failed to store assistant response", error);
        }

        set((current) => {
          const updatedChats = current.conversations.map((chat) =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [...chat.messages, aiStoredMessage],
                  preview: truncatePreview(aiResponse),
                  time: formatTimestamp(Date.now()),
                  updatedAt: Date.now(),
                }
              : chat
          );

          return {
            conversations: updatedChats,
            messages: [...current.messages, aiUIMessage],
            isStreaming: false,
          };
        });
      }, responseDelay);
    } catch (error) {
      console.error("Failed to send message", error);
      toast.error("Message failed", {
        description: "Please try again.",
      });
      set({ isStreaming: false });
    }
  },

  reset: () => {
    set(initialState);
  },
}));
