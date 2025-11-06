import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    uuid: v.string(),
    email: v.string(),
    fullName: v.string(),
    passwordHash: v.string(),
    resetToken: v.optional(v.string()),
    resetTokenExpiresAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"]),

  userKeys: defineTable({
    userId: v.id("users"),
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
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    preview: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId", "updatedAt"]),

  messages: defineTable({
    chatId: v.id("chats"),
    authorId: v.id("users"),
    role: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_chat", ["chatId", "createdAt"]),
});
