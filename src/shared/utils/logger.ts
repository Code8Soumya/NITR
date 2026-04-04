type LogLevel = "info" | "warn" | "error";

type LogContext = {
  file: string;
  location: string;
  action?: string;
  details?: Record<string, unknown>;
};

type SerializedError = {
  name: string;
  message: string;
  stack?: string;
  code?: unknown;
  cause?: unknown;
};

type LogPayload = {
  timestamp: string;
  level: LogLevel;
  message: string;
  file: string;
  location: string;
  action?: string;
  details?: Record<string, unknown>;
  error?: SerializedError;
};

const LOG_PREFIX = "[NITR-HUB]";

const serializeError = (error: unknown): SerializedError => {
  if (error instanceof Error) {
    const errorWithExtras = error as Error & {
      code?: unknown;
      cause?: unknown;
    };

    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: errorWithExtras.code,
      cause: errorWithExtras.cause
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Non-Error value thrown"
  };
};

const buildPrimaryLine = (payload: LogPayload) => {
  const parts = [
    LOG_PREFIX,
    payload.level.toUpperCase(),
    payload.message,
    `${payload.file}:${payload.location}`
  ];

  if (payload.action) {
    parts.push(payload.action);
  }

  if (payload.error?.code !== undefined && payload.error?.code !== null) {
    parts.push(`code=${String(payload.error.code)}`);
  }

  if (payload.error?.message) {
    parts.push(payload.error.message);
  }

  return parts.join(" | ");
};

const emit = (level: LogLevel, message: string, context: LogContext, error?: unknown) => {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    file: context.file,
    location: context.location,
    action: context.action,
    details: context.details,
    error: error === undefined ? undefined : serializeError(error)
  };
  const primaryLine = buildPrimaryLine(payload);

  if (level === "error") {
    console.error(primaryLine, payload);
    return;
  }

  if (level === "warn") {
    console.warn(primaryLine, payload);
    return;
  }

  console.log(primaryLine, payload);
};

export const appLogger = {
  info(message: string, context: LogContext) {
    emit("info", message, context);
  },

  warn(message: string, context: LogContext, error?: unknown) {
    emit("warn", message, context, error);
  },

  error(message: string, context: LogContext, error?: unknown) {
    emit("error", message, context, error);
  }
};
