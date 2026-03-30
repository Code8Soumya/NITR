import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import { HttpError } from "./errors.js";
import { logWarn } from "./logger.js";

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;
const refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET;

const accessTokenTtl = process.env.ACCESS_TOKEN_TTL ?? "15m";
const refreshTokenTtl = process.env.REFRESH_TOKEN_TTL ?? "30d";

const ensureSecrets = () => {
  if (!accessTokenSecret || !refreshTokenSecret) {
    throw new HttpError(
      500,
      "ACCESS_TOKEN_SECRET and REFRESH_TOKEN_SECRET must be configured",
      "MISSING_AUTH_SECRETS"
    );
  }
};

const asDate = (value) => {
  if (!value) {
    return null;
  }

  if (typeof value === "number") {
    return new Date(value * 1000);
  }

  return null;
};

export const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const issueAccessToken = (user) => {
  ensureSecrets();

  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      nickname: user.nickname,
      branch: user.branch,
      approvalStatus: user.approvalStatus,
      isAdmin: Boolean(user.isAdmin)
    },
    accessTokenSecret,
    {
      algorithm: "HS256",
      expiresIn: accessTokenTtl,
      issuer: "nitr-hub",
      audience: "nitr-mobile"
    }
  );
};

export const issueRefreshToken = (user) => {
  ensureSecrets();

  const jti = crypto.randomUUID();
  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      tokenType: "refresh"
    },
    refreshTokenSecret,
    {
      algorithm: "HS256",
      expiresIn: refreshTokenTtl,
      jwtid: jti,
      issuer: "nitr-hub",
      audience: "nitr-mobile"
    }
  );

  const decoded = jwt.decode(token, { complete: true });
  const expiresAt = asDate(decoded?.payload?.exp);

  return {
    token,
    jti,
    expiresAt
  };
};

export const verifyAccessToken = (token) => {
  ensureSecrets();

  try {
    const payload = jwt.verify(token, accessTokenSecret, {
      algorithms: ["HS256"],
      issuer: "nitr-hub",
      audience: "nitr-mobile"
    });

    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      nickname: payload.nickname,
      branch: payload.branch,
      approvalStatus: payload.approvalStatus,
      isAdmin: Boolean(payload.isAdmin)
    };
  } catch (error) {
    logWarn(
      "Access token verification failed",
      {
        file: "backend/tab1-social/src/lib/tokenService.js",
        location: "verifyAccessToken",
        action: "verify access token"
      },
      error
    );

    throw new HttpError(401, "Invalid access token", "INVALID_TOKEN");
  }
};

export const verifyRefreshToken = (token) => {
  ensureSecrets();

  try {
    const payload = jwt.verify(token, refreshTokenSecret, {
      algorithms: ["HS256"],
      issuer: "nitr-hub",
      audience: "nitr-mobile"
    });

    if (payload.tokenType !== "refresh" || !payload.jti) {
      throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }

    return {
      userId: payload.sub,
      email: payload.email,
      jti: payload.jti,
      expiresAt: asDate(payload.exp)
    };
  } catch (error) {
    if (error instanceof HttpError) {
      logWarn(
        "Refresh token verification failed with HttpError",
        {
          file: "backend/tab1-social/src/lib/tokenService.js",
          location: "verifyRefreshToken",
          action: "verify refresh token"
        },
        error
      );

      throw error;
    }

    logWarn(
      "Refresh token verification failed",
      {
        file: "backend/tab1-social/src/lib/tokenService.js",
        location: "verifyRefreshToken",
        action: "verify refresh token"
      },
      error
    );

    throw new HttpError(401, "Invalid refresh token", "INVALID_REFRESH_TOKEN");
  }
};
