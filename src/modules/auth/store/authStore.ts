import { create } from "zustand";

import { authApi } from "@/modules/auth/api/authApi";
import { tokenStorage } from "@/modules/auth/storage/tokenStorage";
import type {
  AuthProfileUpdateInput,
  AuthRegisterInput,
  AuthSession,
  AuthTokens,
  AuthUser
} from "@/modules/auth/types";
import { appLogger } from "@/shared/utils/logger";

type AuthStoreState = {
  bootstrapped: boolean;
  busy: boolean;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  error: string | null;
  initialize: () => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: AuthRegisterInput) => Promise<{ otpRequired: boolean; email: string }>;
  updateProfile: (input: AuthProfileUpdateInput) => Promise<void>;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
};

const setSession = async (session: AuthSession) => {
  await tokenStorage.setTokens(session.tokens);
};

const clearSession = async () => {
  await tokenStorage.clear();
};

export const useAuthStore = create<AuthStoreState>((set, get) => ({
  bootstrapped: false,
  busy: false,
  user: null,
  tokens: null,
  error: null,

  initialize: async () => {
    if (get().bootstrapped) {
      return;
    }

    set({ busy: true, error: null });

    try {
      const stored = await tokenStorage.getTokens();
      if (!stored) {
        set({ user: null, tokens: null, bootstrapped: true, busy: false });
        return;
      }

      try {
        const user = await authApi.me(stored.accessToken);
        set({ user, tokens: stored, bootstrapped: true, busy: false });
        return;
      } catch (error) {
        appLogger.warn(
          "Access token validation failed; trying refresh token",
          {
            file: "src/modules/auth/store/authStore.ts",
            location: "useAuthStore.initialize",
            action: "restore existing session"
          },
          error
        );

        const refreshed = await authApi.refresh(stored.refreshToken);
        await setSession(refreshed);
        set({ user: refreshed.user, tokens: refreshed.tokens, bootstrapped: true, busy: false });
      }
    } catch (error) {
      appLogger.error(
        "Auth session bootstrap failed",
        {
          file: "src/modules/auth/store/authStore.ts",
          location: "useAuthStore.initialize",
          action: "restore persisted auth"
        },
        error
      );

      await clearSession();
      set({
        user: null,
        tokens: null,
        bootstrapped: true,
        busy: false,
        error: error instanceof Error ? error.message : "Failed to restore auth session"
      });
    }
  },

  login: async (input) => {
    set({ busy: true, error: null });

    try {
      const session = await authApi.login(input);
      await setSession(session);
      set({ user: session.user, tokens: session.tokens, busy: false });
    } catch (error) {
      appLogger.error(
        "Login failed",
        {
          file: "src/modules/auth/store/authStore.ts",
          location: "useAuthStore.login",
          action: "authenticate user",
          details: {
            email: input.email
          }
        },
        error
      );

      set({
        busy: false,
        error: error instanceof Error ? error.message : "Login failed"
      });
      throw error;
    }
  },

  register: async (input) => {
    set({ busy: true, error: null });

    try {
      const result = await authApi.register(input);

      if (!("tokens" in result)) {
        await clearSession();
        set({ user: null, tokens: null, busy: false });
        return {
          otpRequired: true,
          email: result.email
        };
      }

      await setSession(result);
      set({ user: result.user, tokens: result.tokens, busy: false });
      return {
        otpRequired: false,
        email: result.user.email
      };
    } catch (error) {
      appLogger.error(
        "Registration failed",
        {
          file: "src/modules/auth/store/authStore.ts",
          location: "useAuthStore.register",
          action: "register user",
          details: {
            email: input.email,
            nickname: input.nickname
          }
        },
        error
      );

      set({
        busy: false,
        error: error instanceof Error ? error.message : "Registration failed"
      });
      throw error;
    }
  },

  updateProfile: async (input) => {
    const state = get();
    if (!state.tokens?.accessToken) {
      throw new Error("Not authenticated");
    }

    set({ busy: true, error: null });

    try {
      const updated = await authApi.updateProfile(state.tokens.accessToken, input);
      set({ user: updated, busy: false });
    } catch (error) {
      appLogger.error(
        "Profile update failed",
        {
          file: "src/modules/auth/store/authStore.ts",
          location: "useAuthStore.updateProfile",
          action: "update user profile"
        },
        error
      );

      set({
        busy: false,
        error: error instanceof Error ? error.message : "Profile update failed"
      });
      throw error;
    }
  },

  refreshProfile: async () => {
    const state = get();
    if (!state.tokens?.accessToken) {
      return;
    }

    set({ busy: true, error: null });

    try {
      const user = await authApi.me(state.tokens.accessToken);
      set({ user, busy: false });
    } catch (error) {
      appLogger.warn(
        "Profile fetch failed; attempting token refresh",
        {
          file: "src/modules/auth/store/authStore.ts",
          location: "useAuthStore.refreshProfile",
          action: "refresh current user profile"
        },
        error
      );

      try {
        const refreshed = await authApi.refresh(state.tokens.refreshToken);
        await setSession(refreshed);
        set({ user: refreshed.user, tokens: refreshed.tokens, busy: false });
      } catch (error) {
        appLogger.error(
          "Profile refresh and token refresh both failed",
          {
            file: "src/modules/auth/store/authStore.ts",
            location: "useAuthStore.refreshProfile",
            action: "recover session after profile fetch failure"
          },
          error
        );

        await clearSession();
        set({
          user: null,
          tokens: null,
          busy: false,
          error: error instanceof Error ? error.message : "Session expired"
        });
      }
    }
  },

  logout: async () => {
    const state = get();

    set({ busy: true, error: null });

    try {
      if (state.tokens?.accessToken && state.tokens.refreshToken) {
        await authApi.logout(state.tokens.accessToken, state.tokens.refreshToken);
      }
    } catch (error) {
      appLogger.warn(
        "Logout API call failed; clearing local session anyway",
        {
          file: "src/modules/auth/store/authStore.ts",
          location: "useAuthStore.logout",
          action: "end active session"
        },
        error
      );
    } finally {
      await clearSession();
      set({ user: null, tokens: null, busy: false });
    }
  },

  clearError: () => set({ error: null })
}));
