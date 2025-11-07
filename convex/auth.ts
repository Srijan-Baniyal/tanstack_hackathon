import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const internalCreateUser = internalMutation({
  args: {
    uuid: v.string(),
    email: v.string(),
    fullName: v.string(),
    passwordHash: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("users", {
      uuid: args.uuid,
      email: args.email,
      fullName: args.fullName,
      passwordHash: args.passwordHash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
      createdAt: args.createdAt,
      updatedAt: args.createdAt,
    });
  },
});

export const internalEnsureUserKeys = internalMutation({
  args: {
    userId: v.id("users"),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("userKeys");
    const existing = await query
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .unique();
    if (existing) {
      return;
    }
    await ctx.db.insert("userKeys", {
      userId: args.userId,
      vercelKey: undefined,
      openrouterKey: undefined,
      grokKey: undefined,
      anthropicKey: undefined,
      geminiKey: undefined,
      glmKey: undefined,
      openaiKey: undefined,
      perplexityKey: undefined,
      qwenKey: undefined,
      kimiKey: undefined,
      deepseekKey: undefined,
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
  },
});

export const internalGetUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("users");
    return query
      .withIndex("by_email", (q: any) => q.eq("email", args.email))
      .unique();
  },
});

export const internalGetUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return ctx.db.get(args.userId);
  },
});

export const internalGetUserByIdString = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const id = args.userId as Id<"users">;
    return ctx.db.get(id);
  },
});

export const internalStoreResetToken = internalMutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      resetToken: args.token,
      resetTokenExpiresAt: args.expiresAt,
      updatedAt: Date.now(),
    });
  },
});

export const internalGetUserByResetToken = internalQuery({
  args: { resetToken: v.string() },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("users");
    const user = await query
      .filter((q: any) => q.eq(q.field("resetToken"), args.resetToken))
      .first();
    if (!user) {
      return null;
    }
    if (!user.resetTokenExpiresAt || user.resetTokenExpiresAt < Date.now()) {
      return null;
    }
    return user;
  },
});

export const internalUpdatePassword = internalMutation({
  args: {
    userId: v.id("users"),
    passwordHash: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      passwordHash: args.passwordHash,
      resetToken: undefined,
      resetTokenExpiresAt: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const internalUpdateUserProfile = internalMutation({
  args: {
    userId: v.id("users"),
    email: v.string(),
    fullName: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      email: args.email,
      fullName: args.fullName,
      updatedAt: args.timestamp,
    });
  },
});

export const internalUpdateKeys = internalMutation({
  args: {
    userId: v.id("users"),
    keys: v.object({
      vercelKey: v.optional(v.string()),
      openrouterKey: v.optional(v.string()),
      grokKey: v.optional(v.string()),
      anthropicKey: v.optional(v.string()),
      geminiKey: v.optional(v.string()),
      glmKey: v.optional(v.string()),
      openaiKey: v.optional(v.string()),
      perplexityKey: v.optional(v.string()),
      qwenKey: v.optional(v.string()),
      kimiKey: v.optional(v.string()),
      deepseekKey: v.optional(v.string()),
    }),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("userKeys");
    const existing = await query
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args.keys,
        updatedAt: args.timestamp,
      });
      return;
    }
    await ctx.db.insert("userKeys", {
      userId: args.userId,
      ...args.keys,
      createdAt: args.timestamp,
      updatedAt: args.timestamp,
    });
  },
});

export const internalGetKeysByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const query = (ctx.db as any).query("userKeys");
    const keys = await query
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .unique();
    if (!keys) {
      return null;
    }
    return {
      id: keys._id,
      userId: keys.userId,
      vercelKey: keys.vercelKey ?? null,
      openrouterKey: keys.openrouterKey ?? null,
      grokKey: keys.grokKey ?? null,
      anthropicKey: keys.anthropicKey ?? null,
      geminiKey: keys.geminiKey ?? null,
      glmKey: keys.glmKey ?? null,
      openaiKey: keys.openaiKey ?? null,
      perplexityKey: keys.perplexityKey ?? null,
      qwenKey: keys.qwenKey ?? null,
      kimiKey: keys.kimiKey ?? null,
      deepseekKey: keys.deepseekKey ?? null,
      createdAt: keys.createdAt,
      updatedAt: keys.updatedAt,
    };
  },
});

export const internalDeleteUserCascade = internalMutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const chatsQuery = (ctx.db as any).query("chats");
    const chats = await chatsQuery
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    for (const chat of chats) {
      const messagesQuery = (ctx.db as any).query("messages");
      const messages = await messagesQuery
        .withIndex("by_chat", (q: any) => q.eq("chatId", chat._id))
        .collect();

      await Promise.all(
        messages.map((message: any) => ctx.db.delete(message._id))
      );
      await ctx.db.delete(chat._id);
    }

    const keysQuery = (ctx.db as any).query("userKeys");
    const userKeys = await keysQuery
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .unique();

    if (userKeys) {
      await ctx.db.delete(userKeys._id);
    }

    await ctx.db.delete(args.userId);
  },
});
