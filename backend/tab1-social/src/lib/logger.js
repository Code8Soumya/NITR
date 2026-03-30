const service = "tab1-social-backend";

const toSerializableError = (error) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
      cause: error.cause
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Non-Error value thrown"
  };
};

const emit = ({ level, message, context = {}, error }) => {
  const payload = {
    timestamp: new Date().toISOString(),
    service,
    level,
    message,
    ...context,
    ...(error === undefined ? {} : { error: toSerializableError(error) })
  };

  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
};

export const logInfo = (message, context = {}) => {
  emit({ level: "info", message, context });
};

export const logWarn = (message, context = {}, error) => {
  emit({ level: "warn", message, context, error });
};

export const logError = (message, error, context = {}) => {
  emit({ level: "error", message, context, error });
};
