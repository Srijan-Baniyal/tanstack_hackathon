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
import { randomUUID, randomBytes, createHash } from "node:crypto";
import { internal } from "./_generated/api";

type SanitizedUser = {
  id: Id<"users">;
  uuid: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  providerType: string | null;
  emailVerified: boolean;
  lastSignInAt: number | null;
  createdAt: number;
  updatedAt: number;
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const trimName = (name: string) => name.trim();

const sanitizeUser = (user: any): SanitizedUser => ({
  id: user._id,
  uuid: user.uuid,
  email: user.email,
  fullName: user.fullName,
  avatarUrl: user.avatarUrl ?? null,
  providerType: user.providerType ?? null,
  emailVerified: user.emailVerified ?? false,
  lastSignInAt: user.lastSignInAt ?? null,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

type OAuthProvider = "google" | "github";

type OAuthProfile = {
  externalId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  emailVerified: boolean;
};

const base64UrlEncode = (buffer: Buffer) =>
  buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

const generateCodeVerifier = () => base64UrlEncode(randomBytes(64));
const generateCodeChallenge = (verifier: string) =>
  base64UrlEncode(createHash("sha256").update(verifier).digest());

const generateState = () => base64UrlEncode(randomBytes(32));

const requireEnv = (name: string) => {
  const value = process.env[name as keyof typeof process.env] as
    | string
    | undefined;
  if (!value) {
    throw new ConvexError(
      `Missing required environment variable: ${name}. Please set it in your Convex deployment settings.`
    );
  }
  return value;
};

const optionalEnv = (name: string) =>
  (process.env[name as keyof typeof process.env] as string | undefined) ??
  null;

const getRedirectUri = (provider: OAuthProvider) => {
  const specificKey =
    provider === "google" ? "GOOGLE_REDIRECT_URI" : "GITHUB_REDIRECT_URI";
  const configured = optionalEnv(specificKey);
  if (configured) {
    return configured;
  }
  const baseUrl = optionalEnv("APP_BASE_URL");
  if (!baseUrl) {
    throw new ConvexError(
      `Missing redirect URI configuration. Set ${specificKey} or APP_BASE_URL.`
    );
  }
  return `${baseUrl.replace(/\/$/, "")}/oauth/callback/${provider}`;
};

const getProviderSecrets = (provider: OAuthProvider) => {
  if (provider === "google") {
    return {
      clientId: requireEnv("GOOGLE_CLIENT_ID"),
      clientSecret: requireEnv("GOOGLE_CLIENT_SECRET"),
      redirectUri: getRedirectUri("google"),
    };
  }
  return {
    clientId: requireEnv("GITHUB_CLIENT_ID"),
    clientSecret: requireEnv("GITHUB_CLIENT_SECRET"),
    redirectUri: getRedirectUri("github"),
  };
};

const upsertOAuthUser = async (
  ctx: {
    runQuery: (internalRef: any, args: any) => Promise<any>;
    runMutation: (internalRef: any, args: any) => Promise<any>;
  },
  provider: OAuthProvider,
  profile: OAuthProfile
) => {
  const normalizedEmail = normalizeEmail(profile.email);
  if (!normalizedEmail) {
    throw new ConvexError("Unable to determine email address from provider.");
  }

  const safeName = trimName(profile.fullName) || normalizedEmail.split("@")[0] || "MeshMind User";
  const timestamp = Date.now();
  const providerType = provider;
  const authInternals = internal.auth as any;

  const existingByProvider = await ctx.runQuery(
    authInternals.internalGetUserByProvider,
    {
      providerType,
      providerId: profile.externalId,
    }
  );

  if (existingByProvider) {
    await ctx.runMutation(authInternals.internalUpdateUserOAuthProfile, {
      userId: existingByProvider._id,
      email: normalizedEmail,
      fullName: safeName,
      avatarUrl: profile.avatarUrl ?? undefined,
      providerType,
      providerId: profile.externalId,
      emailVerified: profile.emailVerified,
      lastSignInAt: timestamp,
    });

    await ctx.runMutation(authInternals.internalEnsureUserKeys, {
      userId: existingByProvider._id,
      timestamp,
    });

    return await ctx.runQuery(authInternals.internalGetUserById, {
      userId: existingByProvider._id,
    });
  }

  const existingByEmail = await ctx.runQuery(
    authInternals.internalGetUserByEmail,
    {
      email: normalizedEmail,
    }
  );

  if (existingByEmail) {
    await ctx.runMutation(authInternals.internalUpdateUserOAuthProfile, {
      userId: existingByEmail._id,
      email: normalizedEmail,
      fullName: safeName,
      avatarUrl: profile.avatarUrl ?? undefined,
      providerType,
      providerId: profile.externalId,
      emailVerified: profile.emailVerified,
      lastSignInAt: timestamp,
    });

    await ctx.runMutation(authInternals.internalEnsureUserKeys, {
      userId: existingByEmail._id,
      timestamp,
    });

    return await ctx.runQuery(authInternals.internalGetUserById, {
      userId: existingByEmail._id,
    });
  }

  const uuid = randomUUID();
  const userId = await ctx.runMutation(authInternals.internalCreateUser, {
    uuid,
    email: normalizedEmail,
    fullName: safeName,
    passwordHash: undefined,
    providerType,
    providerId: profile.externalId,
    avatarUrl: profile.avatarUrl ?? undefined,
    emailVerified: profile.emailVerified,
    lastSignInAt: timestamp,
    createdAt: timestamp,
  });

  await ctx.runMutation(authInternals.internalEnsureUserKeys, {
    userId,
    timestamp,
  });

  return await ctx.runQuery(authInternals.internalGetUserById, {
    userId,
  });
};

const completeGoogleOAuth = async (params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<OAuthProfile> => {
  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    code: params.code,
    redirect_uri: params.redirectUri,
    grant_type: "authorization_code",
    code_verifier: params.codeVerifier,
  });

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenJson.access_token) {
    const message =
      tokenJson.error_description || tokenJson.error || "Failed to exchange Google authorization code.";
    throw new ConvexError(`Google OAuth failed: ${message}`);
  }

  const userInfoResponse = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
      },
    }
  );
  const userInfo = await userInfoResponse.json();
  if (!userInfoResponse.ok) {
    const message =
      userInfo.error_description || userInfo.error || "Failed to load Google profile.";
    throw new ConvexError(`Google OAuth failed: ${message}`);
  }

  const email = userInfo.email ? normalizeEmail(userInfo.email) : "";
  if (!email) {
    throw new ConvexError(
      "Google did not provide an email address. Ensure the email scope is enabled in your Google OAuth app."
    );
  }

  const fullNameRaw =
    userInfo.name ||
    `${userInfo.given_name ?? ""} ${userInfo.family_name ?? ""}`.trim() ||
    email;

  return {
    externalId: userInfo.sub,
    email,
    fullName: fullNameRaw,
    avatarUrl: (userInfo.picture as string | undefined) ?? null,
    emailVerified: Boolean(userInfo.email_verified),
  };
};

const completeGithubOAuth = async (params: {
  code: string;
  codeVerifier: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  state: string;
}): Promise<OAuthProfile> => {
  const tokenResponse = await fetch(
    "https://github.com/login/oauth/access_token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: params.clientId,
        client_secret: params.clientSecret,
        code: params.code,
        redirect_uri: params.redirectUri,
        code_verifier: params.codeVerifier,
        state: params.state,
      }),
    }
  );

  const tokenJson = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenJson.access_token) {
    const message =
      tokenJson.error_description || tokenJson.error || "Failed to exchange GitHub authorization code.";
    throw new ConvexError(`GitHub OAuth failed: ${message}`);
  }

  const userResponse = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      "User-Agent": "meshmind-app",
      Accept: "application/vnd.github+json",
    },
  });
  const userInfo = await userResponse.json();
  if (!userResponse.ok) {
    const message =
      userInfo.message || "Failed to load GitHub profile.";
    throw new ConvexError(`GitHub OAuth failed: ${message}`);
  }

  let email = userInfo.email ? normalizeEmail(userInfo.email) : "";
  let emailVerified = Boolean(userInfo.verified);

  if (!email) {
    const emailsResponse = await fetch("https://api.github.com/user/emails", {
      headers: {
        Authorization: `Bearer ${tokenJson.access_token}`,
        "User-Agent": "meshmind-app",
        Accept: "application/vnd.github+json",
      },
    });
    if (emailsResponse.ok) {
      const emails = (await emailsResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primary =
        emails.find((entry) => entry.primary && entry.verified) ??
        emails.find((entry) => entry.primary) ??
        emails.find((entry) => entry.verified);
      if (primary) {
        email = normalizeEmail(primary.email);
        emailVerified = Boolean(primary.verified);
      }
    }
  }

  if (!email) {
    throw new ConvexError(
      "GitHub did not provide an email address. Ensure the user has a public or primary email or request user:email scope."
    );
  }

  const fullNameRaw = (userInfo.name as string | undefined) || userInfo.login || email;

  return {
    externalId: String(userInfo.id),
    email,
    fullName: fullNameRaw,
    avatarUrl: (userInfo.avatar_url as string | undefined) ?? null,
    emailVerified,
  };
};

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
    const fullName = trimName(args.fullName);
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
      providerType: "credentials",
      providerId: uuid,
      avatarUrl: undefined,
      emailVerified: false,
      lastSignInAt: timestamp,
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
    if (!user.passwordHash) {
      throw new ConvexError(
        "This account was created with social sign-in. Continue with Google or GitHub instead."
      );
    }
    const valid = await verifyPassword(args.password, user.passwordHash);
    if (!valid) {
      throw new ConvexError("Invalid email or password.");
    }

    const timestamp = Date.now();
    await ctx.runMutation(internal.auth.internalTouchUserSignIn, {
      userId: user._id,
      timestamp,
    });

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

export const startOAuth: PublicAction = action({
  args: {
    provider: v.union(v.literal("google"), v.literal("github")),
  },
  handler: async (ctx, args) => {
    const provider = args.provider as OAuthProvider;
    const { clientId, redirectUri } = getProviderSecrets(provider);
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const timestamp = Date.now();
    const expiresAt = timestamp + 10 * 60 * 1000;

    const authInternals = internal.auth as any;

    await ctx.runMutation(authInternals.internalCreateOAuthState, {
      state,
      codeVerifier,
      provider,
      redirectUri,
      createdAt: timestamp,
      expiresAt,
    });

    await ctx
      .runMutation(authInternals.internalPruneOAuthStates, {
        cutoff: timestamp - 60 * 60 * 1000,
      })
      .catch(() => undefined);

    let authorizationUrl: string;

    if (provider === "google") {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", "openid email profile");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
      url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "select_account");
      authorizationUrl = url.toString();
    } else {
      const url = new URL("https://github.com/login/oauth/authorize");
      url.searchParams.set("client_id", clientId);
      url.searchParams.set("redirect_uri", redirectUri);
      url.searchParams.set("scope", "read:user user:email");
      url.searchParams.set("state", state);
      url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
      url.searchParams.set("allow_signup", "true");
      authorizationUrl = url.toString();
    }

    return {
      authorizationUrl,
      state,
    };
  },
});

export const completeOAuth: PublicAction = action({
  args: {
    provider: v.union(v.literal("google"), v.literal("github")),
    code: v.string(),
    state: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      const provider = args.provider as OAuthProvider;
      const authInternals = internal.auth as any;

      const stateRecord = await ctx.runQuery(
        authInternals.internalGetOAuthState,
        {
          state: args.state,
        }
      );

      if (!stateRecord) {
        throw new ConvexError(
          "OAuth session expired or invalid. Please start the sign-in flow again."
        );
      }

      if (stateRecord.provider !== provider) {
        await ctx.runMutation(authInternals.internalDeleteOAuthState, {
          stateId: stateRecord._id,
        });
        throw new ConvexError(
          "OAuth provider mismatch. Please restart the sign-in flow."
        );
      }

      if (stateRecord.expiresAt < Date.now()) {
        await ctx.runMutation(authInternals.internalDeleteOAuthState, {
          stateId: stateRecord._id,
        });
        throw new ConvexError("OAuth session expired. Please try again.");
      }

      await ctx.runMutation(authInternals.internalDeleteOAuthState, {
        stateId: stateRecord._id,
      });

      const { clientId, clientSecret, redirectUri } =
        getProviderSecrets(provider);

      const profile =
        provider === "google"
          ? await completeGoogleOAuth({
              code: args.code,
              codeVerifier: stateRecord.codeVerifier,
              clientId,
              clientSecret,
              redirectUri,
            })
          : await completeGithubOAuth({
              code: args.code,
              codeVerifier: stateRecord.codeVerifier,
              clientId,
              clientSecret,
              redirectUri,
              state: args.state,
            });

      const user = await upsertOAuthUser(ctx, provider, profile);
      if (!user) {
        throw new ConvexError("Unable to create or update user account.");
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
    } catch (error) {
      if (error instanceof ConvexError) {
        throw error;
      }
      console.error("completeOAuth failed", error);
      throw new ConvexError(
        "Could not complete social sign-in. Please try again."
      );
    }
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

    if (!user.passwordHash) {
      throw new ConvexError(
        "This account was created with social sign-in. Use the reset password flow to set a password first."
      );
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
