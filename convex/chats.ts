"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { verifyAccessToken } from "./token";
import { Id, Doc } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const truncate = (value: string, length = 120): string =>
  value.length <= length ? value : `${value.slice(0, length)}...`;

const webSearchEnum = v.union(
  v.literal("none"),
  v.literal("firecrawl")
);

const agentConfigValidator = v.object({
  provider: v.string(),
  modelId: v.optional(v.string()),
  systemPrompt: v.string(),
  webSearch: v.optional(webSearchEnum),
});

interface FormattedAgentConfig {
  provider: string;
  modelId?: string;
  systemPrompt: string;
  webSearch?: "none" | "firecrawl";
}

interface FormattedChat {
  id: Id<"chats">;
  title: string;
  preview: string;
  createdAt: number;
  updatedAt: number;
  messages: FormattedMessage[];
  agentConfigs: FormattedAgentConfig[];
}

interface FormattedMessage {
  id: Id<"messages">;
  chatId: Id<"chats">;
  authorId: Id<"users">;
  role: string;
  content: string;
  createdAt: number;
}

const formatChat = (
  chat: Doc<"chats">,
  messages: Doc<"messages">[]
): FormattedChat => ({
  id: chat._id,
  title: chat.title,
  preview: chat.preview,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
  messages: messages.map(formatMessage),
  agentConfigs: Array.isArray(chat.agentConfigs)
    ? chat.agentConfigs.map((config) => ({
        provider: config.provider,
        modelId: config.modelId ?? undefined,
        systemPrompt: config.systemPrompt,
        webSearch: config.webSearch ?? undefined,
      }))
    : [],
});

const formatMessage = (message: Doc<"messages">): FormattedMessage => ({
  id: message._id,
  chatId: message.chatId,
  authorId: message.authorId,
  role: message.role,
  content: message.content,
  createdAt: message.createdAt,
});

const ensureOwnership = async (
  ctx: any,
  userId: Id<"users">,
  chatId: Id<"chats">
): Promise<Doc<"chats">> => {
  const chat = await ctx.runQuery(internal.chatsInternal.internalGetChatById, {
    chatId,
  });
  if (!chat || chat.userId !== userId) {
    throw new ConvexError("Chat not found");
  }
  return chat;
};

export const listChats = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args): Promise<FormattedChat[]> => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;

    const chats: Doc<"chats">[] = await ctx.runQuery(
      internal.chatsInternal.internalListChatsByUser,
      {
        userId,
      }
    );

    const results: FormattedChat[] = await Promise.all(
      chats.map(async (chat: Doc<"chats">) => {
        const messages: Doc<"messages">[] = await ctx.runQuery(
          internal.chatsInternal.internalListMessagesByChat,
          {
            chatId: chat._id,
          }
        );
        return formatChat(chat, messages);
      })
    );

    return results;
  },
});

export const createChat = action({
  args: {
    accessToken: v.string(),
    title: v.string(),
    firstMessage: v.object({
      role: v.string(),
      content: v.string(),
    }),
    agents: v.optional(v.array(agentConfigValidator)),
  },
  handler: async (ctx, args): Promise<FormattedChat> => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const title = args.title.trim() || "New chat";
    const now = Date.now();

    const chatId: Id<"chats"> = await ctx.runMutation(
      internal.chatsInternal.internalInsertChat,
      {
        userId,
        title,
        preview: truncate(args.firstMessage.content),
        timestamp: now,
        agentConfigs: args.agents ?? [],
      }
    );

    const messageDoc: Doc<"messages"> | null = await ctx.runMutation(
      internal.chatsInternal.internalInsertMessage,
      {
        chatId,
        userId,
        role: args.firstMessage.role,
        content: args.firstMessage.content,
        timestamp: now,
      }
    );

    const chat: Doc<"chats"> | null = await ctx.runQuery(
      internal.chatsInternal.internalGetChatById,
      {
        chatId,
      }
    );

    if (!chat || !messageDoc) {
      throw new ConvexError("Failed to create chat");
    }

    return formatChat(chat, [messageDoc]);
  },
});

export const appendMessage = action({
  args: {
    accessToken: v.string(),
    chatId: v.id("chats"),
    message: v.object({
      role: v.string(),
      content: v.string(),
    }),
    agents: v.optional(v.array(agentConfigValidator)),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ chat: FormattedChat; message: FormattedMessage }> => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const chatDoc = await ensureOwnership(ctx, userId, args.chatId);
    const now = Date.now();

    const messageDoc: Doc<"messages"> | null = await ctx.runMutation(
      internal.chatsInternal.internalInsertMessage,
      {
        chatId: args.chatId,
        userId,
        role: args.message.role,
        content: args.message.content,
        timestamp: now,
      }
    );

    if (!messageDoc) {
      throw new ConvexError("Failed to create message");
    }

    await ctx.runMutation(internal.chatsInternal.internalUpdateChatPreview, {
      chatId: args.chatId,
      preview: truncate(args.message.content),
      timestamp: now,
    });

    if (Array.isArray(args.agents)) {
      await ctx.runMutation(internal.chatsInternal.internalUpdateAgentConfigs, {
        chatId: args.chatId,
        agentConfigs: args.agents,
        timestamp: now,
      });
    }
    const updatedChat = await ctx.runQuery(
      internal.chatsInternal.internalGetChatById,
      { chatId: args.chatId }
    );

    return {
      chat: formatChat(
        {
          ...(updatedChat ?? chatDoc),
          preview: truncate(args.message.content),
          updatedAt: now,
        },
        []
      ),
      message: formatMessage(messageDoc),
    };
  },
});

export const renameChat = action({
  args: {
    accessToken: v.string(),
    chatId: v.id("chats"),
    title: v.string(),
  },
  handler: async (ctx, args): Promise<FormattedChat> => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const chat = await ensureOwnership(ctx, userId, args.chatId);
    const trimmed = args.title.trim();
    if (!trimmed) {
      throw new ConvexError("Title cannot be empty.");
    }

    const updated: Doc<"chats"> | null = await ctx.runMutation(
      internal.chatsInternal.internalRenameChat,
      {
        chatId: args.chatId,
        title: trimmed,
      }
    );

    if (!updated) {
      throw new ConvexError("Failed to rename chat");
    }

    return formatChat(
      { ...chat, title: trimmed, updatedAt: updated.updatedAt },
      []
    );
  },
});

export const deleteChat = action({
  args: {
    accessToken: v.string(),
    chatId: v.id("chats"),
  },
  handler: async (ctx, args): Promise<void> => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    await ensureOwnership(ctx, userId, args.chatId);
    await ctx.runMutation(internal.chatsInternal.internalDeleteChat, {
      chatId: args.chatId,
    });
  },
});

export const saveAgentConfigs = action({
  args: {
    accessToken: v.string(),
    chatId: v.id("chats"),
    agents: v.array(agentConfigValidator),
  },
  handler: async (ctx, args): Promise<FormattedChat> => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const chat = await ensureOwnership(ctx, userId, args.chatId);
    const now = Date.now();

    await ctx.runMutation(internal.chatsInternal.internalUpdateAgentConfigs, {
      chatId: args.chatId,
      agentConfigs: args.agents,
      timestamp: now,
    });

    const refreshed = await ctx.runQuery(
      internal.chatsInternal.internalGetChatById,
      {
        chatId: args.chatId,
      }
    );

    if (!refreshed) {
      throw new ConvexError("Chat not found");
    }

    return formatChat(refreshed, []);
  },
});
