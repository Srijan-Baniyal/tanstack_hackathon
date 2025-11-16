import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

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

export default defineSchema({
  users: defineTable({
    uuid: v.string(),
    email: v.string(),
    fullName: v.string(),
    passwordHash: v.optional(v.string()),
    providerType: v.optional(v.string()),
    providerId: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
    lastSignInAt: v.optional(v.number()),
    resetToken: v.optional(v.string()),
    resetTokenExpiresAt: v.optional(v.number()),
    systemPrompts: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_provider", ["providerType", "providerId"]),

  userKeys: defineTable({
    userId: v.id("users"),
    vercelKey: v.optional(v.string()),
    openrouterKey: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  chats: defineTable({
    userId: v.id("users"),
    title: v.string(),
    preview: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    agentConfigs: v.optional(v.array(agentConfigValidator)),
  }).index("by_user", ["userId", "updatedAt"]),

  messages: defineTable({
    chatId: v.id("chats"),
    authorId: v.id("users"),
    role: v.string(),
    content: v.string(),
    createdAt: v.number(),
  }).index("by_chat", ["chatId", "createdAt"]),

  oauthStates: defineTable({
    state: v.string(),
    codeVerifier: v.string(),
    provider: v.string(),
    redirectUri: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
  }).index("by_state", ["state"]),
});
