import {
  action,
  internalMutation,
  internalQuery,
} from "../../convex/_generated/server";
import { v, ConvexError } from "convex/values";
import { verifyAccessToken } from "./token";
import { Id } from "../../convex/_generated/dataModel";

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
  const chat = await ctx.runQuery(internalGetChatById as any, { chatId });
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
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;

    const chats = await ctx.runQuery(internalListChatsByUser as any, {
      userId,
    });

    const results = await Promise.all(
      chats.map(async (chat: any) => {
        const messages = await ctx.runQuery(internalListMessagesByChat as any, {
          chatId: chat._id,
        });
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
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const title = args.title.trim() || "New chat";
    const now = Date.now();

    const chatId = await ctx.runMutation(internalInsertChat as any, {
      userId,
      title,
      preview: truncate(args.firstMessage.content),
      timestamp: now,
    });

    const messageDoc = await ctx.runMutation(internalInsertMessage as any, {
      chatId,
      userId,
      role: args.firstMessage.role,
      content: args.firstMessage.content,
      timestamp: now,
    });

    const chat = await ctx.runQuery(internalGetChatById as any, {
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
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const chat = await ensureOwnership(ctx, userId, args.chatId);
    const now = Date.now();

    const messageDoc = await ctx.runMutation(internalInsertMessage as any, {
      chatId: args.chatId,
      userId,
      role: args.message.role,
      content: args.message.content,
      timestamp: now,
    });

    await ctx.runMutation(internalUpdateChatPreview as any, {
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
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const chat = await ensureOwnership(ctx, userId, args.chatId);
    const trimmed = args.title.trim();
    if (!trimmed) {
      throw new ConvexError("Title cannot be empty.");
    }

    const updated = await ctx.runMutation(internalRenameChat as any, {
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
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    await ensureOwnership(ctx, userId, args.chatId);
    await ctx.runMutation(internalDeleteChat as any, {
      chatId: args.chatId,
    });
  },
});

const internalListChatsByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("chats");
    return query
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

const internalListMessagesByChat = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("messages");
    return query
      .withIndex("by_chat", (q: any) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

const internalGetChatById = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.chatId);
  },
});

const internalInsertChat = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    preview: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("chats", {
      userId: args.userId,
      title: args.title,
      preview: args.preview,
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
  },
});

const internalInsertMessage = internalMutation({
  args: {
    chatId: v.id("chats"),
    userId: v.id("users"),
    role: v.string(),
    content: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("messages", {
      chatId: args.chatId,
      authorId: args.userId,
      role: args.role,
      content: args.content,
      createdAt: args.timestamp,
    });
    return ctx.db.get(id);
  },
});

const internalUpdateChatPreview = internalMutation({
  args: {
    chatId: v.id("chats"),
    preview: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      preview: args.preview,
      updatedAt: args.timestamp,
    });
  },
});

const internalRenameChat = internalMutation({
  args: {
    chatId: v.id("chats"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.chatId);
    if (!current) {
      throw new ConvexError("Chat not found");
    }
    await ctx.db.patch(args.chatId, {
      title: args.title,
      updatedAt: Date.now(),
    });
    return ctx.db.get(args.chatId);
  },
});

const internalDeleteChat = internalMutation({
  args: {
    chatId: v.id("chats"),
  },
  handler: async (ctx, args) => {
    const messagesQuery = (ctx.db as any).query("messages");
    const messages = await messagesQuery
      .withIndex("by_chat", (q: any) => q.eq("chatId", args.chatId))
      .collect();

    await Promise.all(
      messages.map((message: any) => ctx.db.delete(message._id))
    );
    await ctx.db.delete(args.chatId);
  },
});
