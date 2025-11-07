"use node";

import { action } from "./_generated/server";
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
import { Id } from "./_generated/dataModel";
import { randomUUID, randomBytes } from "node:crypto";
import { internal } from "./_generated/api";

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

type PublicAction = ReturnType<typeof action>;

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

export const signUp: PublicAction = action({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const fullName = args.fullName.trim();
    if (!fullName) {
      throw new ConvexError("Full name is required.");
    }
    assertPasswordStrength(args.password);

    const existing = await ctx.runQuery(internal.auth.internalGetUserByEmail, {
      email,
    });
    if (existing) {
      throw new ConvexError("Account already exists for this email.");
    }

    const passwordHash = await hashPassword(args.password);
    const uuid = randomUUID();
    const timestamp = Date.now();

    const userId = await ctx.runMutation(internal.auth.internalCreateUser, {
      uuid,
      email,
      fullName,
      passwordHash,
      createdAt: timestamp,
    });

    await ctx.runMutation(internal.auth.internalEnsureUserKeys, {
      userId,
      timestamp,
    });

    const user = await ctx.runQuery(internal.auth.internalGetUserById, {
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

export const signIn: PublicAction = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.runQuery(internal.auth.internalGetUserByEmail, {
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

export const refreshSession: PublicAction = action({
  args: {
    refreshToken: v.string(),
  },
  handler: async (_ctx, args) => {
    try {
      const payload = verifyRefreshToken(args.refreshToken);
      // Remove JWT metadata fields before creating new tokens
      const cleanPayload: TokenPayload = {
        userId: payload.userId,
        uuid: payload.uuid,
        email: payload.email,
      };
      return {
        tokens: buildTokens(cleanPayload),
      };
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ConvexError("Refresh token expired. Please sign in again.");
      }
      throw new ConvexError("Invalid refresh token.");
    }
  },
});

export const me: PublicAction = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const payload = verifyAccessToken(args.accessToken);
      const user = await ctx.runQuery(internal.auth.internalGetUserByIdString, {
        userId: payload.userId,
      });
      if (!user) {
        throw new ConvexError("User not found.");
      }
      return sanitizeUser(user);
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ConvexError(
          "Access token expired. Please refresh your session."
        );
      }
      if (error.name === "JsonWebTokenError") {
        throw new ConvexError("Invalid access token.");
      }
      throw error;
    }
  },
});

export const requestPasswordReset: PublicAction = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const user = await ctx.runQuery(internal.auth.internalGetUserByEmail, {
      email,
    });
    if (!user) {
      return;
    }

    const token = randomBytes(48).toString("hex");
    const expiresAt = Date.now() + 1000 * 60 * 30;
    await ctx.runMutation(internal.auth.internalStoreResetToken, {
      userId: user._id,
      token,
      expiresAt,
    });

    await sendPasswordResetEmail(email, token);
  },
});

export const resetPassword: PublicAction = action({
  args: {
    token: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    assertPasswordStrength(args.password);
    const record = await ctx.runQuery(
      internal.auth.internalGetUserByResetToken,
      {
        resetToken: args.token,
      }
    );
    if (!record) {
      throw new ConvexError("Invalid or expired reset token.");
    }

    const passwordHash = await hashPassword(args.password);
    await ctx.runMutation(internal.auth.internalUpdatePassword, {
      userId: record._id,
      passwordHash,
    });
  },
});

export const updateProfile: PublicAction = action({
  args: {
    accessToken: v.string(),
    fullName: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;
    const fullName = args.fullName.trim();
    if (!fullName) {
      throw new ConvexError("Full name is required.");
    }

    const email = normalizeEmail(args.email);
    const existing = await ctx.runQuery(internal.auth.internalGetUserByEmail, {
      email,
    });
    if (existing && existing._id !== userId) {
      throw new ConvexError("Another account already uses this email.");
    }

    await ctx.runMutation(internal.auth.internalUpdateUserProfile, {
      userId,
      email,
      fullName,
      timestamp: Date.now(),
    });

    const user = await ctx.runQuery(internal.auth.internalGetUserById, {
      userId,
    });
    if (!user) {
      throw new ConvexError("User not found.");
    }

    const tokens = buildTokens({
      userId: userId as string,
      uuid: user.uuid,
      email: user.email,
    });

    return {
      user: sanitizeUser(user),
      tokens,
    };
  },
});

export const changePassword: PublicAction = action({
  args: {
    accessToken: v.string(),
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;

    const user = await ctx.runQuery(internal.auth.internalGetUserById, {
      userId,
    });
    if (!user) {
      throw new ConvexError("User not found.");
    }

    const valid = await verifyPassword(args.currentPassword, user.passwordHash);
    if (!valid) {
      throw new ConvexError("Current password is incorrect.");
    }

    if (args.currentPassword === args.newPassword) {
      throw new ConvexError("New password must be different.");
    }

    assertPasswordStrength(args.newPassword);
    const passwordHash = await hashPassword(args.newPassword);

    await ctx.runMutation(internal.auth.internalUpdatePassword, {
      userId,
      passwordHash,
    });
  },
});

export const deleteAccount: PublicAction = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    const payload = verifyAccessToken(args.accessToken);
    const userId = payload.userId as Id<"users">;

    await ctx.runMutation(internal.auth.internalDeleteUserCascade, {
      userId,
    });
  },
});

export const upsertUserKeys: PublicAction = action({
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
    try {
      const payload = verifyAccessToken(args.accessToken);
      const userId = payload.userId as Id<"users">;
      const timestamp = Date.now();
      await ctx.runMutation(internal.auth.internalUpdateKeys, {
        userId,
        keys: args.keys,
        timestamp,
      });
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ConvexError(
          "Access token expired. Please refresh your session."
        );
      }
      throw error;
    }
  },
});

export const getUserKeys: PublicAction = action({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const payload = verifyAccessToken(args.accessToken);
      const keys = await ctx.runQuery(internal.auth.internalGetKeysByUserId, {
        userId: payload.userId as Id<"users">,
      });
      return keys;
    } catch (error: any) {
      if (error.name === "TokenExpiredError") {
        throw new ConvexError(
          "Access token expired. Please refresh your session."
        );
      }
      throw error;
    }
  },
});
