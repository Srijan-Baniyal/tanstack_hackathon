"use node";
import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { verifyAccessToken } from "./token";
import { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";

const truncate = (value: string, length = 120) =>
  value.length <= length ? value : `${value.slice(0, length)}...`;

const formatChat = (chat: any, messages: any[]) => ({
  id: chat._id,
  title: chat.title,
  preview: chat.preview,
  createdAt: chat.createdAt,
  updatedAt: chat.updatedAt,
  messages: messages.map(formatMessage),
});

const formatMessage = (message: any) => ({
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
) => {
  const chat = await ctx.runQuery(internal.chatsInternal.internalGetChatById, { chatId });
  if (!chat || chat.userId !== userId) {
    throw new ConvexError("Chat not found");
  }
  return chat;
};

export const listChats = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;

    const chats = await ctx.runQuery(internal.chatsInternal.internalListChatsByUser, {
      userId,
    });

    const results = await Promise.all(
      chats.map(async (chat: any) => {
        const messages = await ctx.runQuery(
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
  },
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const title = args.title.trim() || "New chat";
    const now = Date.now();

    const chatId = await ctx.runMutation(internal.chatsInternal.internalInsertChat, {
      userId,
      title,
      preview: truncate(args.firstMessage.content),
      timestamp: now,
    });

    const messageDoc = await ctx.runMutation(
      internal.chatsInternal.internalInsertMessage,
      {
        chatId,
        userId,
        role: args.firstMessage.role,
        content: args.firstMessage.content,
        timestamp: now,
      }
    );

    const chat = await ctx.runQuery(internal.chatsInternal.internalGetChatById, {
      chatId,
    });

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
  },
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const chat = await ensureOwnership(ctx, userId, args.chatId);
    const now = Date.now();

    const messageDoc = await ctx.runMutation(
      internal.chatsInternal.internalInsertMessage,
      {
        chatId: args.chatId,
        userId,
        role: args.message.role,
        content: args.message.content,
        timestamp: now,
      }
    );

    await ctx.runMutation(internal.chatsInternal.internalUpdateChatPreview, {
      chatId: args.chatId,
      preview: truncate(args.message.content),
      timestamp: now,
    });

    return {
      chat: {
        ...formatChat(
          { ...chat, preview: truncate(args.message.content), updatedAt: now },
          []
        ),
      },
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
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const chat = await ensureOwnership(ctx, userId, args.chatId);
    const trimmed = args.title.trim();
    if (!trimmed) {
      throw new ConvexError("Title cannot be empty.");
    }

    const updated = await ctx.runMutation(internal.chatsInternal.internalRenameChat, {
      chatId: args.chatId,
      title: trimmed,
    });

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
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    await ensureOwnership(ctx, userId, args.chatId);
    await ctx.runMutation(internal.chatsInternal.internalDeleteChat, {
      chatId: args.chatId,
    });
  },
});

