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
  updateProfile: (params: { fullName: string; email: string }) => Promise<void>;
  changePassword: (params: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  deleteAccount: () => Promise<void>;
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
  const authModule = (api as Record<string, any> | undefined)?.authActions;
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

    const meRef = getAuthRef("me", "authActions:me");
    const refreshRef = getAuthRef(
      "refreshSession",
      "authActions:refreshSession"
    );

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
    const signInRef = getAuthRef("signIn", "authActions:signIn");
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
    const signUpRef = getAuthRef("signUp", "authActions:signUp");
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
    const refreshRef = getAuthRef(
      "refreshSession",
      "authActions:refreshSession"
    );
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
      "authActions:requestPasswordReset"
    );
    await convexClient.action(resetRef, { email });
  },

  resetPassword: async ({ token, password }) => {
    const resetRef = getAuthRef("resetPassword", "authActions:resetPassword");
    await convexClient.action(resetRef, { token, password });
  },

  updateProfile: async ({ fullName, email }) => {
    const tokens = get().tokens;
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

    const updateRef = getAuthRef("updateProfile", "authActions:updateProfile");
    const response = (await convexClient.action(updateRef, {
      accessToken: tokens.accessToken,
      fullName: trimmedName,
      email: normalizedEmail,
    })) as { user: AuthUser; tokens: TokenBundle };

    persist(response.user, response.tokens);
    set({ user: response.user, tokens: response.tokens });
  },

  changePassword: async ({ currentPassword, newPassword }) => {
    const tokens = get().tokens;
    if (!tokens) {
      throw new Error("You need to be signed in to change your password.");
    }

    const changeRef = getAuthRef(
      "changePassword",
      "authActions:changePassword"
    );
    await convexClient.action(changeRef, {
      accessToken: tokens.accessToken,
      currentPassword,
      newPassword,
    });
  },

  deleteAccount: async () => {
    const tokens = get().tokens;
    if (!tokens) {
      return;
    }

    const deleteRef = getAuthRef("deleteAccount", "authActions:deleteAccount");
    await convexClient.action(deleteRef, {
      accessToken: tokens.accessToken,
    });

    clearPersisted();
    set({ user: null, tokens: null, isLoading: false });
  },
}));
