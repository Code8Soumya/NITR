import { HttpError } from "./errors.js";

const readHeader = (headers = {}, key) =>
  headers[key] ?? headers[key.toLowerCase()] ?? headers[key.toUpperCase()];

const clean = (value, fallback) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : fallback;
};

export const getCurrentUser = (event) => {
  const claims =
    event?.requestContext?.authorizer?.jwt?.claims ??
    event?.requestContext?.authorizer?.claims;

  if (claims?.sub) {
    return {
      id: claims.sub,
      name: clean(
        claims.name ?? claims["custom:display_name"] ?? claims.preferred_username,
        "NITR User"
      ),
      branch: clean(claims["custom:branch"], "NITR")
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
    name: clean(
      readHeader(event?.headers, "x-dev-user-name") ?? readHeader(event?.headers, "x-user-name"),
      "NITR User"
    ),
    branch: clean(
      readHeader(event?.headers, "x-dev-user-branch") ??
        readHeader(event?.headers, "x-user-branch"),
      "NITR"
    )
  };
};

export const requireUser = (event) => {
  const user = getCurrentUser(event);
  if (!user) {
    throw new HttpError(401, "Authentication required", "UNAUTHORIZED");
  }

  return user;
};
