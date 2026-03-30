import { Buffer } from "node:buffer";

import { HttpError, isHttpError } from "./errors.js";
import { logError, logWarn } from "./logger.js";

const corsOrigin = process.env.CORS_ALLOW_ORIGIN ?? "*";
const exposeInternalErrors = (process.env.EXPOSE_INTERNAL_ERRORS ?? "false").toLowerCase() === "true";

const buildHeaders = () => ({
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": corsOrigin,
  "Access-Control-Allow-Headers":
    "Content-Type,Authorization,X-Dev-User-Id,X-Dev-User-Name,X-Dev-User-Branch,X-Dev-User-Email",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS"
});

export const jsonResponse = (statusCode, payload) => ({
  statusCode,
  headers: buildHeaders(),
  body: JSON.stringify(payload)
});

export const noContentResponse = () => ({
  statusCode: 204,
  headers: buildHeaders(),
  body: ""
});

export const parseJsonBody = (event) => {
  if (!event.body) {
    return {};
  }

  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, "base64").toString("utf8")
      : event.body;

    return JSON.parse(raw);
  } catch {
    throw new HttpError(400, "Request body must be valid JSON", "INVALID_JSON");
  }
};

export const parsePositiveInt = ({
  value,
  field,
  fallback,
  min = 1,
  max = Number.MAX_SAFE_INTEGER
}) => {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number.parseInt(String(value), 10);

  if (Number.isNaN(parsed) || parsed < min || parsed > max) {
    throw new HttpError(
      400,
      `${field} must be an integer between ${min} and ${max}`,
      "INVALID_QUERY_PARAM"
    );
  }

  return parsed;
};

export const normalizePath = (rawPath) => {
  if (!rawPath) {
    return "/";
  }

  const path = rawPath.replace(/\/+$/, "");
  return path.length ? path : "/";
};

export const errorResponse = (error, context = {}) => {
  const requestId = typeof context?.requestId === "string" ? context.requestId : undefined;

  if (isHttpError(error)) {
    const statusCode = error.statusCode ?? 400;
    const errorCode = error.code ?? "BAD_REQUEST";

    const logContext = {
      ...context,
      file: "backend/tab1-social/src/lib/http.js",
      location: "errorResponse",
      statusCode,
      errorCode
    };

    if (statusCode >= 500) {
      logError("Server-side HttpError response", error, logContext);
    } else {
      logWarn("Client-facing HttpError response", logContext, error);
    }

    const payload = {
      code: error.code ?? "BAD_REQUEST",
      message: error.message,
      ...(requestId ? { requestId } : {})
    };

    return jsonResponse(error.statusCode ?? 400, {
      error: payload
    });
  }

  logError("Unhandled backend error", error, {
    ...context,
    file: "backend/tab1-social/src/lib/http.js",
    location: "errorResponse"
  });

  const debugMessage =
    exposeInternalErrors && error instanceof Error && error.message
      ? error.message
      : "Something went wrong";

  return jsonResponse(500, {
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: debugMessage,
      ...(requestId ? { requestId } : {})
    }
  });
};
