import type {
  AuthProfileUpdateInput,
  AuthRegisterInput,
  AuthRegisterResponse,
  AuthSession,
  AuthTokens,
  AuthUser,
  OtpDeliveryDetails
} from "@/modules/auth/types";
import { appLogger } from "@/shared/utils/logger";

const apiBaseUrl = process.env.EXPO_PUBLIC_SOCIAL_API_BASE_URL?.replace(/\/$/, "");

type ApiError = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

const previewText = (value: string, limit = 220) => {
  const compact = value.replace(/\s+/g, " ").trim();
  if (compact.length <= limit) {
    return compact;
  }

  return `${compact.slice(0, limit)}...`;
};

const safeParseJson = <T>(raw: string): ({ data?: T } & ApiError) | null => {
  if (!raw.trim()) {
    return {};
  }

  try {
    return JSON.parse(raw) as { data?: T } & ApiError;
  } catch {
    return null;
  }
};

const requireApiBaseUrl = () => {
  if (!apiBaseUrl) {
    throw new Error("EXPO_PUBLIC_SOCIAL_API_BASE_URL is not configured");
  }

  return apiBaseUrl;
};

async function request<T>(
  path: string,
  init?: RequestInit,
  token?: string
): Promise<T> {
  const method = init?.method ?? "GET";
  let responseStatus: number | null = null;
  let responsePreview: string | null = null;
  let responseErrorCode: string | null = null;
  let responseRequestId: string | null = null;

  try {
    const baseUrl = requireApiBaseUrl();

    const response = await fetch(`${baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {})
      }
    });

    const raw = await response.text();
    responseStatus = response.status;
    responsePreview = raw ? previewText(raw) : null;
    const parsed = safeParseJson<T>(raw);
    responseErrorCode = parsed?.error?.code ?? null;
    responseRequestId = parsed?.error?.requestId ?? null;

    if (!response.ok) {
      const isGatewayGeneric500 =
        response.status >= 500 &&
        !parsed?.error?.message &&
        /"message"\s*:\s*"Internal Server Error"/i.test(raw);

      const baseMessage =
        parsed?.error?.message ??
        (isGatewayGeneric500
            ? `Request failed (${response.status}): upstream Lambda timeout/unhandled error.`
            : null) ??
          (raw
            ? `Request failed (${response.status}): ${previewText(raw)}`
            : `Request failed (${response.status})`);

        // Removed prefixing responseErrorCode and requestId to message to keep UI errors clean.
        // They are still logged in appLogger below in catch block.
        throw Object.assign(new Error(baseMessage), { code: responseErrorCode, requestId: responseRequestId });
      }

    if (!parsed || parsed.data === undefined) {
      throw new Error(`Request failed (${response.status}): invalid JSON envelope`);
    }

    return parsed.data;
  } catch (error) {
    const logContext = {
      file: "src/modules/auth/api/authApi.ts",
      location: "request",
      action: `${method} ${path}`,
      details: {
        method,
        path,
        hasBearerToken: Boolean(token),
        responseStatus,
        responsePreview,
        responseErrorCode,
        responseRequestId
      }
    };

    if (responseStatus !== null && responseStatus >= 400 && responseStatus < 500) {
      appLogger.warn("Auth API request failed", logContext, error);
    } else {
      appLogger.error("Auth API request failed", logContext, error);
    }

    throw error;
  }
}

export const authApi = {
  register(input: AuthRegisterInput): Promise<AuthRegisterResponse> {
    return request<AuthRegisterResponse>("/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  login(input: { email: string; password: string }): Promise<AuthSession> {
    return request<AuthSession>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  verifyOtp(input: { email: string; code: string }): Promise<{ verified: boolean; user: AuthUser }> {
    return request<{ verified: boolean; user: AuthUser }>("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  resendOtp(input: { email: string }): Promise<{
    sent: boolean;
    email: string;
    delivery: OtpDeliveryDetails | null;
  }> {
    return request<{
      sent: boolean;
      email: string;
      delivery: OtpDeliveryDetails | null;
    }>("/api/v1/auth/resend-otp", {
      method: "POST",
      body: JSON.stringify(input)
    });
  },

  refresh(refreshToken: string): Promise<AuthSession> {
    return request<AuthSession>("/api/v1/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken })
    });
  },

  me(accessToken: string): Promise<AuthUser> {
    return request<AuthUser>("/api/v1/auth/me", undefined, accessToken);
  },

  updateProfile(accessToken: string, input: AuthProfileUpdateInput): Promise<AuthUser> {
    return request<AuthUser>(
      "/api/v1/auth/profile",
      {
        method: "PUT",
        body: JSON.stringify(input)
      },
      accessToken
    );
  },

  logout(accessToken: string, refreshToken: string): Promise<{ success: boolean }> {
    return request<{ success: boolean }>(
      "/api/v1/auth/logout",
      {
        method: "POST",
        body: JSON.stringify({ refreshToken })
      },
      accessToken
    );
  },

  getPendingApprovals(accessToken: string): Promise<AuthUser[]> {
    return request<AuthUser[]>("/api/v1/admin/approvals/pending", undefined, accessToken);
  },

  approveUser(accessToken: string, userId: string): Promise<AuthUser> {
    return request<AuthUser>(`/api/v1/admin/approvals/${encodeURIComponent(userId)}/approve`, {
      method: "POST"
    }, accessToken);
  },

  rejectUser(accessToken: string, userId: string, reason: string): Promise<AuthUser> {
    return request<AuthUser>(`/api/v1/admin/approvals/${encodeURIComponent(userId)}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason })
    }, accessToken);
  }
};

export const readStoredAccessToken = async (): Promise<string | null> => {
  const { tokenStorage } = await import("@/modules/auth/storage/tokenStorage");
  const tokens = await tokenStorage.getTokens();
  return tokens?.accessToken ?? null;
};

export const parseAuthTokens = (session: AuthSession): AuthTokens => session.tokens;
