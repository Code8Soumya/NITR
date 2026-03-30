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

const emit = (level: LogLevel, message: string, context: LogContext, error?: unknown) => {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    message,
    file: context.file,
    location: context.location,
    action: context.action,
    details: context.details,
    error: error === undefined ? undefined : serializeError(error)
  };

  if (level === "error") {
    console.error(LOG_PREFIX, payload);
    return;
  }

  if (level === "warn") {
    console.warn(LOG_PREFIX, payload);
    return;
  }

  console.log(LOG_PREFIX, payload);
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
