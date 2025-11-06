import { create } from "zustand";
import { convexClient } from "@/lib/convexClient";
import { api } from "../../convex/_generated/api";

type AuthUser = {
  id: string;
  uuid: string;
  email: string;
  fullName: string;
  createdAt: number;
  updatedAt: number;
};

type TokenBundle = {
  accessToken: string;
  refreshToken: string;
};

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
  requestPasswordReset: (email: string) => Promise<void>;
  resetPassword: (params: { token: string; password: string }) => Promise<void>;
};

const STORAGE_KEYS = {
  USER: "meshmind.auth.user",
  TOKENS: "meshmind.auth.tokens",
} as const;

const persist = (user: AuthUser, tokens: TokenBundle) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.TOKENS, JSON.stringify(tokens));
};

const hydrate = (): { user: AuthUser | null; tokens: TokenBundle | null } => {
  if (typeof window === "undefined") {
    return { user: null, tokens: null };
  }
  const rawUser = localStorage.getItem(STORAGE_KEYS.USER);
  const rawTokens = localStorage.getItem(STORAGE_KEYS.TOKENS);
  return {
    user: rawUser ? (JSON.parse(rawUser) as AuthUser) : null,
    tokens: rawTokens ? (JSON.parse(rawTokens) as TokenBundle) : null,
  };
};

const clearPersisted = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.TOKENS);
};

const getAuthRef = (name: string, fallback: string) => {
  const authModule = (api as Record<string, any> | undefined)?.auth;
  const reference = authModule?.[name];
  return reference ?? fallback;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  tokens: null,
  isLoading: true,

  initialize: async () => {
    if (get().user || get().tokens) {
      set({ isLoading: false });
      return;
    }

    const { user, tokens } = hydrate();
    if (!user || !tokens) {
      set({ user: null, tokens: null, isLoading: false });
      return;
    }

    const meRef = getAuthRef("me", "auth:me");
    const refreshRef = getAuthRef("refreshSession", "auth:refreshSession");

    try {
      const refreshed = await convexClient.action(meRef, {
        accessToken: tokens.accessToken,
      });
      set({ user: refreshed as AuthUser, tokens, isLoading: false });
    } catch (error) {
      try {
        const refreshed = await convexClient.action(refreshRef, {
          refreshToken: tokens.refreshToken,
        });
        const nextTokens = (refreshed as { tokens: TokenBundle }).tokens;
        const current = await convexClient.action(meRef, {
          accessToken: nextTokens.accessToken,
        });
        persist(current as AuthUser, nextTokens);
        set({
          user: current as AuthUser,
          tokens: nextTokens,
          isLoading: false,
        });
      } catch (refreshError) {
        console.error("Auth refresh failed", refreshError);
        clearPersisted();
        set({ user: null, tokens: null, isLoading: false });
      }
    }
  },

  signIn: async ({ email, password }) => {
    const signInRef = getAuthRef("signIn", "auth:signIn");
    set({ isLoading: true });
    try {
      const response = (await convexClient.action(signInRef, {
        email,
        password,
      })) as { user: AuthUser; tokens: TokenBundle };
      persist(response.user, response.tokens);
      set({ user: response.user, tokens: response.tokens, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signUp: async ({ email, password, fullName }) => {
    const signUpRef = getAuthRef("signUp", "auth:signUp");
    set({ isLoading: true });
    try {
      const response = (await convexClient.action(signUpRef, {
        email,
        password,
        fullName,
      })) as { user: AuthUser; tokens: TokenBundle };
      persist(response.user, response.tokens);
      set({ user: response.user, tokens: response.tokens, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  signOut: () => {
    clearPersisted();
    set({ user: null, tokens: null, isLoading: false });
  },

  refresh: async () => {
    const tokens = get().tokens;
    if (!tokens) return;
    const refreshRef = getAuthRef("refreshSession", "auth:refreshSession");
    const refreshed = (await convexClient.action(refreshRef, {
      refreshToken: tokens.refreshToken,
    })) as { tokens: TokenBundle };
    const nextTokens = refreshed.tokens;
    const user = get().user;
    if (user) {
      persist(user, nextTokens);
    }
    set({ tokens: nextTokens });
  },

  requestPasswordReset: async (email) => {
    const resetRef = getAuthRef(
      "requestPasswordReset",
      "auth:requestPasswordReset"
    );
    await convexClient.action(resetRef, { email });
  },

  resetPassword: async ({ token, password }) => {
    const resetRef = getAuthRef("resetPassword", "auth:resetPassword");
    await convexClient.action(resetRef, { token, password });
  },
}));
