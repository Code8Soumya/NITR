import { HttpError } from "./errors.js";
import { logWarn } from "./logger.js";
import { verifyAccessToken } from "./tokenService.js";

const readHeader = (headers = {}, key) =>
  headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];

const clean = (value, fallback) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

const parseAuthorizationToken = (headers = {}) => {
  const authHeader = readHeader(headers, "authorization");
  if (typeof authHeader !== "string") {
    return null;
  }

  const [scheme, token] = authHeader.trim().split(/\s+/);
  if (!scheme || !token || scheme.toLowerCase() !== "bearer") {
    return null;
  }

  return token;
};

export const getRequestContext = (event) => {
  const userAgent =
    clean(readHeader(event?.headers, "user-agent"), "unknown") ?? "unknown";

  const forwardedFor = clean(readHeader(event?.headers, "x-forwarded-for"), "");
  const ipAddress = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";

  return {
    userAgent,
    ipAddress
  };
};

const getAppUserFromBearerToken = (event) => {
  const token = parseAuthorizationToken(event?.headers);
  if (!token) {
    return null;
  }

  try {
    return verifyAccessToken(token);
  } catch (error) {
    logWarn(
      "Bearer token could not be parsed in getCurrentUser fallback",
      {
        file: "backend/tab1-social/src/lib/auth.js",
        location: "getAppUserFromBearerToken",
        action: "verify bearer token for optional current user"
      },
      error
    );

    return null;
  }
};

export const getCurrentUser = (event) => {
  const appUser = getAppUserFromBearerToken(event);
  if (appUser) {
    return {
      id: appUser.id,
      email: appUser.email,
      name: clean(appUser.nickname ?? appUser.name, "NITR User"),
      branch: clean(appUser.branch, "NITR"),
      approvalStatus: appUser.approvalStatus ?? "pending",
      isAdmin: Boolean(appUser.isAdmin)
    };
  }

  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ??
    event?.requestContext?.authorizer?.claims;

  if (claims?.sub) {
    return {
      id: claims.sub,
      email: clean(claims.email, undefined),
      name: clean(
        claims.name ?? claims["custom:display_name"] ?? claims.preferred_username,
        "NITR User"
      ),
      branch: clean(claims["custom:branch"], "NITR"),
      approvalStatus: "approved",
      isAdmin: false
    };
  }

  const allowDevHeaders = (process.env.ENABLE_DEV_HEADERS ?? "false").toLowerCase() === "true";
  if (!allowDevHeaders) {
    return null;
  }

  const id = clean(
    readHeader(event?.headers, "x-dev-user-id") ?? readHeader(event?.headers, "x-user-id"),
    undefined
  );

  if (!id) {
    return null;
  }

  return {
    id,
    email: clean(readHeader(event?.headers, "x-dev-user-email"), undefined),
    name: clean(
      readHeader(event?.headers, "x-dev-user-name") ?? readHeader(event?.headers, "x-user-name"),
      "NITR User"
    ),
    branch: clean(
      readHeader(event?.headers, "x-dev-user-branch") ??
        readHeader(event?.headers, "x-user-branch"),
      "NITR"
    ),
    approvalStatus: "approved",
    isAdmin: false
  };
};

export const requireUser = (event) => {
  const user = getCurrentUser(event);
  if (!user) {
    throw new HttpError(401, "Authentication required", "UNAUTHORIZED");
  }

  return user;
};

export const requireAppUser = (event) => {
  const token = parseAuthorizationToken(event?.headers);
  if (!token) {
    throw new HttpError(401, "Bearer token required", "UNAUTHORIZED");
  }

  const payload = verifyAccessToken(token);
  return {
    id: payload.id,
    email: payload.email,
    name: clean(payload.nickname ?? payload.name, "NITR User"),
    branch: clean(payload.branch, "NITR"),
    approvalStatus: payload.approvalStatus ?? "pending",
    isAdmin: Boolean(payload.isAdmin)
  };
};

export const requireApprovedUser = (event) => {
  const user = requireUser(event);
  if (!user.isAdmin && user.approvalStatus !== "approved") {
    throw new HttpError(
      403,
      "Account pending admin approval",
      "ACCOUNT_PENDING_APPROVAL"
    );
  }

  return user;
};

export const requireAdminUser = (event) => {
  const user = requireAppUser(event);
  if (!user.isAdmin) {
    throw new HttpError(403, "Admin access required", "FORBIDDEN");
  }

  return user;
};
