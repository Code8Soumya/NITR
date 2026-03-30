import * as SecureStore from "expo-secure-store";

import type { AuthTokens } from "@/modules/auth/types";

const ACCESS_TOKEN_KEY = "nitr_auth_access_token";
const REFRESH_TOKEN_KEY = "nitr_auth_refresh_token";

export const tokenStorage = {
  async getTokens(): Promise<AuthTokens | null> {
    const [accessToken, refreshToken] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.getItemAsync(REFRESH_TOKEN_KEY)
    ]);

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken
    };
  },

  async setTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken)
    ]);
  },

  async clear(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)
    ]);
  }
};
