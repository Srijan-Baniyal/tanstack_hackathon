import { create } from "zustand";
import { convexClient } from "../lib/convexClient";
import { api } from "../../convex/_generated/api";
import { secureStorage } from "../lib/secureStorage";

type AuthUser = {
  id: string;
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

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
};

type ActionReference = Parameters<typeof convexClient.action>[0];

type AuthState = {
  user: AuthUser | null;
  tokens: TokenBundle | null;
  isLoading: boolean;
  initialize: () => Promise<void>;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
  }) => Promise<void>;
  signOut: () => void;
  refresh: () => Promise<void>;
  getValidTokens: () => Promise<TokenBundle | null>;
  getValidAccessToken: () => Promise<string | null>;
  callAuthenticatedAction: <T>(
    ref: ActionReference,
    args?: Record<string, unknown>
  ) => Promise<T>;
  startOAuth: (
    provider: "google" | "github"
  ) => Promise<{ authorizationUrl: string; state: string }>;
  completeOAuth: (params: {
    provider: "google" | "github";
    code: string;
    state: string;
  }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (params: { token: string; password: string }) => Promise<void>;
  updateProfile: (params: { fullName: string; email: string }) => Promise<void>;
  changePassword: (params: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  deleteAccount: () => Promise<void>;
};

const ENCRYPTED_STORAGE_KEY = "meshmind.auth.state.v1";
const LEGACY_STORAGE_KEYS = [
  "meshmind.auth.user",
  "meshmind.auth.tokens",
] as const;
const REFRESH_THRESHOLD_MS = 60_000;

type PersistedAuthPayload = {
  user: AuthUser;
  tokens: TokenBundle;
  storedAt: number;
};

const decodeBase64 = (value: string) => {
  if (typeof window !== "undefined" && typeof window.atob === "function") {
    return window.atob(value);
  }
  const globalAtob = (globalThis as unknown as { atob?: typeof atob }).atob;
  if (typeof globalAtob === "function") {
    return globalAtob(value);
  }
  return "";
};

const decodeJwtExpiry = (token: string): number | null => {
  try {
    const segments = token.split(".");
    if (segments.length < 2) return null;
    const normalized = segments[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(decodeBase64(padded));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

const isTokenExpiredError = (error: unknown) => {
  if (!error) return false;
  const message =
    error instanceof Error
      ? error.message
      : typeof (error as { message?: string }).message === "string"
        ? (error as { message: string }).message
        : "";
  if (!message) return false;
  const normalized = message.toLowerCase();
  return (
    normalized.includes("access token expired") ||
    normalized.includes("jwt expired") ||
    normalized.includes("tokenexpirederror") ||
    normalized.includes("token expired")
  );
};

const getAuthRef = (name: string, fallback: string): ActionReference => {
  const authModule = (api as Record<string, unknown> | undefined)
    ?.authActions as Record<string, ActionReference> | undefined;
  const reference = authModule?.[name];
  return reference ?? (fallback as unknown as ActionReference);
};

const persistAuthState = async (user: AuthUser, tokens: TokenBundle) => {
  if (typeof window === "undefined") return;
  try {
    const payload: PersistedAuthPayload = {
      user,
      tokens,
      storedAt: Date.now(),
    };
    await secureStorage.setItem(ENCRYPTED_STORAGE_KEY, payload);
  } catch (error) {
    console.warn("AuthStore: failed to persist auth state", error);
  }
};

const clearPersistedState = () => {
  if (typeof window === "undefined") return;
  secureStorage.removeItem(ENCRYPTED_STORAGE_KEY);
  for (const key of LEGACY_STORAGE_KEYS) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // Ignore storage access issues
    }
  }
};

const hydrateAuthState = async () => {
  if (typeof window === "undefined") {
    return {
      user: null as AuthUser | null,
      tokens: null as TokenBundle | null,
    };
  }

  const stored = await secureStorage.getItem<PersistedAuthPayload>(
    ENCRYPTED_STORAGE_KEY
  );
  if (stored?.user && stored?.tokens) {
    return { user: stored.user, tokens: stored.tokens };
  }

  const legacyUserRaw = window.localStorage.getItem(LEGACY_STORAGE_KEYS[0]);
  const legacyTokensRaw = window.localStorage.getItem(LEGACY_STORAGE_KEYS[1]);

  if (legacyUserRaw && legacyTokensRaw) {
    try {
      const user = JSON.parse(legacyUserRaw) as AuthUser;
      const tokens = JSON.parse(legacyTokensRaw) as TokenBundle;
      await persistAuthState(user, tokens);
      for (const key of LEGACY_STORAGE_KEYS) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore cleanup errors
        }
      }
      return { user, tokens };
    } catch (error) {
      console.error("AuthStore: failed to migrate legacy auth state", error);
      for (const key of LEGACY_STORAGE_KEYS) {
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  return { user: null, tokens: null };
};

export const useAuthStore = create<AuthState>()((set, get) => {
  let refreshPromise: Promise<TokenBundle | null> | null = null;

  const runRefresh = async (): Promise<TokenBundle | null> => {
    const currentTokens = get().tokens;
    if (!currentTokens) {
      return null;
    }

    if (refreshPromise) {
      return refreshPromise;
    }

    const refreshRef = getAuthRef(
      "refreshSession",
      "authActions:refreshSession"
    );
    const promise = (async () => {
      const refreshed = (await convexClient.action(refreshRef, {
        refreshToken: currentTokens.refreshToken,
      })) as { tokens: TokenBundle };
      const nextTokens = refreshed.tokens;
      const currentUser = get().user;
      if (currentUser) {
        await persistAuthState(currentUser, nextTokens);
      }
      set({ tokens: nextTokens });
      return nextTokens;
    })().catch((error) => {
      console.error("AuthStore: refresh failed", error);
      clearPersistedState();
      set({ user: null, tokens: null });
      throw error;
    });

    refreshPromise = promise;
    promise.finally(() => {
      if (refreshPromise === promise) {
        refreshPromise = null;
      }
    });

    return promise;
  };

  const ensureValidTokens = async (): Promise<TokenBundle | null> => {
    let tokens = get().tokens;
    if (!tokens) return null;

    const expiry = decodeJwtExpiry(tokens.accessToken);
    if (!expiry) {
      return tokens;
    }

    const timeRemaining = expiry - Date.now();
    if (timeRemaining <= REFRESH_THRESHOLD_MS) {
      try {
        tokens = await runRefresh();
      } catch {
        return null;
      }
    }

    return tokens ?? get().tokens;
  };

  const callWithAccessToken = async <T>(
    ref: ActionReference,
    args: Record<string, unknown> = {}
  ): Promise<T> => {
    let tokens = await ensureValidTokens();
    if (!tokens) {
      throw new Error("You need to be signed in to perform this action.");
    }

    try {
      return (await convexClient.action(ref, {
        ...args,
        accessToken: tokens.accessToken,
      })) as T;
    } catch (error) {
      if (!isTokenExpiredError(error)) {
        throw error;
      }

      try {
        tokens = await runRefresh();
      } catch (refreshError) {
        throw refreshError;
      }

      if (!tokens) {
        throw error instanceof Error
          ? error
          : new Error("Session expired. Please sign in again.");
      }

      return (await convexClient.action(ref, {
        ...args,
        accessToken: tokens.accessToken,
      })) as T;
    }
  };

  return {
    user: null,
    tokens: null,
    isLoading: true,

    initialize: async () => {
      if (get().user || get().tokens) {
        set({ isLoading: false });
        return;
      }

      set({ isLoading: true });
      const hydrated = await hydrateAuthState();
      const hydratedUser = hydrated.user;
      const hydratedTokens = hydrated.tokens;

      if (!hydratedUser || !hydratedTokens) {
        set({ user: null, tokens: null, isLoading: false });
        return;
      }

      set({ user: hydratedUser, tokens: hydratedTokens });

      const meRef = getAuthRef("me", "authActions:me");

      try {
        const currentUser = (await convexClient.action(meRef, {
          accessToken: hydratedTokens.accessToken,
        })) as AuthUser;

        set({ user: currentUser, tokens: hydratedTokens, isLoading: false });
        await persistAuthState(currentUser, hydratedTokens);
        await ensureValidTokens();
      } catch (error) {
        if (isTokenExpiredError(error)) {
          try {
            const refreshedTokens = await runRefresh();
            if (!refreshedTokens) {
              throw error;
            }
            const refreshedUser = (await convexClient.action(meRef, {
              accessToken: refreshedTokens.accessToken,
            })) as AuthUser;
            set({
              user: refreshedUser,
              tokens: refreshedTokens,
              isLoading: false,
            });
            await persistAuthState(refreshedUser, refreshedTokens);
            await ensureValidTokens();
            return;
          } catch (refreshError) {
            console.error(
              "AuthStore: failed to refresh session during initialization",
              refreshError
            );
          }
        } else {
          console.error("AuthStore: failed to validate session", error);
        }

        clearPersistedState();
        set({ user: null, tokens: null, isLoading: false });
      }
    },

    signIn: async ({ email, password }) => {
      const signInRef = getAuthRef("signIn", "authActions:signIn");
      set({ isLoading: true });
      try {
        const response = (await convexClient.action(signInRef, {
          email,
          password,
        })) as { user: AuthUser; tokens: TokenBundle };
        await persistAuthState(response.user, response.tokens);
        set({
          user: response.user,
          tokens: response.tokens,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    signUp: async ({ email, password, fullName }) => {
      const signUpRef = getAuthRef("signUp", "authActions:signUp");
      set({ isLoading: true });
      try {
        const response = (await convexClient.action(signUpRef, {
          email,
          password,
          fullName,
        })) as { user: AuthUser; tokens: TokenBundle };
        await persistAuthState(response.user, response.tokens);
        set({
          user: response.user,
          tokens: response.tokens,
          isLoading: false,
        });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    signOut: () => {
      clearPersistedState();
      set({ user: null, tokens: null, isLoading: false });
    },

    refresh: async () => {
      await runRefresh();
    },

    getValidTokens: async () => {
      const tokens = await ensureValidTokens();
      return tokens ?? get().tokens;
    },

    getValidAccessToken: async () => {
      const tokens = await ensureValidTokens();
      return tokens?.accessToken ?? null;
    },

    callAuthenticatedAction: async <T>(
      ref: ActionReference,
      args: Record<string, unknown> = {}
    ) => callWithAccessToken<T>(ref, args),

    startOAuth: async (provider) => {
      const startRef = getAuthRef("startOAuth", "authActions:startOAuth");
      return (await convexClient.action(startRef, {
        provider,
      })) as { authorizationUrl: string; state: string };
    },

    completeOAuth: async ({ provider, code, state }) => {
      const completeRef = getAuthRef(
        "completeOAuth",
        "authActions:completeOAuth"
      );
      set({ isLoading: true });
      try {
        const response = (await convexClient.action(completeRef, {
          provider,
          code,
          state,
        })) as { user: AuthUser; tokens: TokenBundle };

        await persistAuthState(response.user, response.tokens);
        set({ user: response.user, tokens: response.tokens, isLoading: false });
      } catch (error) {
        set({ isLoading: false });
        throw error;
      }
    },

    requestPasswordReset: async (email) => {
      const resetRef = getAuthRef(
        "requestPasswordReset",
        "authActions:requestPasswordReset"
      );
      await convexClient.action(resetRef, { email });
    },

    resetPassword: async ({ token, password }) => {
      const resetRef = getAuthRef("resetPassword", "authActions:resetPassword");
      await convexClient.action(resetRef, { token, password });
    },

    updateProfile: async ({ fullName, email }) => {
      const tokens = await ensureValidTokens();
      if (!tokens) {
        throw new Error("You need to be signed in to update your profile.");
      }

      const trimmedName = fullName.trim();
      const normalizedEmail = email.trim().toLowerCase();
      if (!trimmedName) {
        throw new Error("Full name is required.");
      }
      if (!normalizedEmail) {
        throw new Error("Email is required.");
      }

      const updateRef = getAuthRef(
        "updateProfile",
        "authActions:updateProfile"
      );
      const response = await callWithAccessToken<{
        user: AuthUser;
        tokens: TokenBundle;
      }>(updateRef, {
        fullName: trimmedName,
        email: normalizedEmail,
      });

      await persistAuthState(response.user, response.tokens);
      set({ user: response.user, tokens: response.tokens });
    },

    changePassword: async ({ currentPassword, newPassword }) => {
      const changeRef = getAuthRef(
        "changePassword",
        "authActions:changePassword"
      );
      await callWithAccessToken(changeRef, {
        currentPassword,
        newPassword,
      });
    },

    deleteAccount: async () => {
      const deleteRef = getAuthRef(
        "deleteAccount",
        "authActions:deleteAccount"
      );
      await callWithAccessToken(deleteRef);
      clearPersistedState();
      
      // Clear all cached data including OAuth sessions and any stored keys
      if (typeof window !== "undefined") {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch {
          // Ignore storage errors
        }
      }
      
      set({ user: null, tokens: null, isLoading: false });
    },
  };
});
