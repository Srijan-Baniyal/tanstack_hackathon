import { internalMutation, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";

const webSearchEnum = v.union(
  v.literal("none"),
  v.literal("native"),
  v.literal("firecrawl")
);

const agentConfigValidator = v.object({
  provider: v.string(),
  modelId: v.optional(v.string()),
  systemPrompt: v.string(),
  webSearch: v.optional(webSearchEnum),
});

export const internalListChatsByUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("chats");
    return query
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const internalListMessagesByChat = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("messages");
    return query
      .withIndex("by_chat", (q: any) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();
  },
});

export const internalGetChatById = internalQuery({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.chatId);
  },
});

export const internalInsertChat = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    preview: v.string(),
    timestamp: v.number(),
    agentConfigs: v.optional(v.array(agentConfigValidator)),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("chats", {
      userId: args.userId,
      title: args.title,
      preview: args.preview,
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
      agentConfigs: args.agentConfigs ?? [],
    });
  },
});

export const internalInsertMessage = internalMutation({
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

export const internalUpdateChatPreview = internalMutation({
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

export const internalUpdateAgentConfigs = internalMutation({
  args: {
    chatId: v.id("chats"),
    agentConfigs: v.array(agentConfigValidator),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, {
      agentConfigs: args.agentConfigs,
      updatedAt: args.timestamp,
    });
  },
});

export const internalRenameChat = internalMutation({
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

export const internalDeleteChat = internalMutation({
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
