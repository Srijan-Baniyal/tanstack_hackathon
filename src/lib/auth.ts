import {
  action,
  internalMutation,
  internalQuery,
} from "../../convex/_generated/server";
import { v, ConvexError } from "convex/values";
import { hashPassword, verifyPassword } from "./password";
import {
  createAccessToken,
  createRefreshToken,
  TokenPayload,
  verifyAccessToken,
  verifyRefreshToken,
} from "./token";
import { sendPasswordResetEmail } from "./email";
import { Id } from "../../convex/_generated/dataModel";
import { randomUUID, randomBytes } from "node:crypto";

type SanitizedUser = {
  id: Id<"users">;
  uuid: string;
  email: string;
  fullName: string;
  createdAt: number;
  updatedAt: number;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sanitizeUser = (user: any): SanitizedUser => ({
  id: user._id,
  uuid: user.uuid,
  email: user.email,
  fullName: user.fullName,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const buildTokens = (payload: TokenPayload) => ({
  accessToken: createAccessToken(payload),
  refreshToken: createRefreshToken(payload),
});

const assertPasswordStrength = (password: string) => {
  if (password.length < 8) {
    throw new ConvexError("Password must be at least 8 characters long.");
  }
  const hasNumber = /\d/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  if (!hasNumber || !hasLetter) {
    throw new ConvexError("Password must include letters and numbers.");
  }
};

export const signUp = action({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const email = normalizeEmail(args.email);
    const fullName = args.fullName.trim();
    if (!fullName) {
      throw new ConvexError("Full name is required.");
    }
    assertPasswordStrength(args.password);

    const existing = await ctx.runQuery(internalGetUserByEmail as any, {
      email,
    });
    if (existing) {
      throw new ConvexError("Account already exists for this email.");
    }

    const passwordHash = await hashPassword(args.password);
    const uuid = randomUUID();
    const timestamp = Date.now();

    const userId = await ctx.runMutation(internalCreateUser as any, {
      uuid,
      email,
      fullName,
      passwordHash,
      createdAt: timestamp,
    });

    await ctx.runMutation(internalEnsureUserKeys as any, {
      userId,
      timestamp,
    });

    const user = await ctx.runQuery(internalGetUserById as any, {
      userId,
    });
    if (!user) {
      throw new ConvexError("Failed to create user.");
    }

    const payload: TokenPayload = {
      userId: userId as string,
      uuid,
      email,
    };

    return {
      user: sanitizeUser(user),
      tokens: buildTokens(payload),
    };
  },
});

export const signIn = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const email = normalizeEmail(args.email);
    const user = await ctx.runQuery(internalGetUserByEmail as any, {
      email,
    });
    if (!user) {
      throw new ConvexError("Invalid email or password.");
    }
    const valid = await verifyPassword(args.password, user.passwordHash);
    if (!valid) {
      throw new ConvexError("Invalid email or password.");
    }

    const payload: TokenPayload = {
      userId: user._id as string,
      uuid: user.uuid,
      email: user.email,
    };

    return {
      user: sanitizeUser(user),
      tokens: buildTokens(payload),
    };
  },
});

export const refreshSession = action({
  args: {
    refreshToken: v.string(),
  },
  handler: async (_ctx, args) => {
    "use node";
    const payload = verifyRefreshToken(args.refreshToken);
    return {
      tokens: buildTokens(payload),
    };
  },
});

export const me = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const user = await ctx.runQuery(internalGetUserByIdString as any, {
      userId: payload.userId,
    });
    if (!user) {
      throw new ConvexError("User not found.");
    }
    return sanitizeUser(user);
  },
});

export const requestPasswordReset = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const email = normalizeEmail(args.email);
    const user = await ctx.runQuery(internalGetUserByEmail as any, {
      email,
    });
    if (!user) {
      return;
    }

    const token = randomBytes(48).toString("hex");
    const expiresAt = Date.now() + 1000 * 60 * 30;
    await ctx.runMutation(internalStoreResetToken as any, {
      userId: user._id,
      token,
      expiresAt,
    });

    await sendPasswordResetEmail(email, token);
  },
});

export const resetPassword = action({
  args: {
    token: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    assertPasswordStrength(args.password);
    const record = await ctx.runQuery(internalGetUserByResetToken as any, {
      resetToken: args.token,
    });
    if (!record) {
      throw new ConvexError("Invalid or expired reset token.");
    }

    const passwordHash = await hashPassword(args.password);
    await ctx.runMutation(internalUpdatePassword as any, {
      userId: record._id,
      passwordHash,
    });
  },
});

export const upsertUserKeys = action({
  args: {
    accessToken: v.string(),
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
  },
  handler: async (ctx, args) => {
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const timestamp = Date.now();
    await ctx.runMutation(internalUpdateKeys as any, {
      userId,
      keys: args.keys,
      timestamp,
    });
  },
});

export const getUserKeys = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    "use node";
    const payload = verifyAccessToken(args.accessToken);
    const keys = await ctx.runQuery(internalGetKeysByUserId as any, {
      userId: payload.userId,
    });
    return keys;
  },
});

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
  args: { userId: v.string() },
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
