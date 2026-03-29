export class HttpError extends Error {
  constructor(statusCode, message, code = "BAD_REQUEST") {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const isHttpError = (value) =>
  value instanceof HttpError ||
  (typeof value === "object" &&
    value !== null &&
    "statusCode" in value &&
    "message" in value);
