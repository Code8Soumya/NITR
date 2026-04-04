import { Pool } from "pg";

import { HttpError, isHttpError } from "./errors.js";
import { logError } from "./logger.js";

let pool;

const buildPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new HttpError(500, "DATABASE_URL is required", "MISSING_DATABASE_URL");
  }

  const sslEnabled = (process.env.PG_SSL ?? "true").toLowerCase() === "true";
  const parsedConnectTimeoutMs = Number.parseInt(process.env.PG_CONNECT_TIMEOUT_MS ?? "5000", 10);
  const connectTimeoutMs =
    Number.isFinite(parsedConnectTimeoutMs) && parsedConnectTimeoutMs > 0
      ? parsedConnectTimeoutMs
      : 5000;

  return new Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: connectTimeoutMs,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });
};

export const getPool = () => {
  if (!pool) {
    pool = buildPool();
  }

  return pool;
};

export const withTransaction = async (callback) => {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      logError("Database rollback failed", rollbackError, {
        file: "backend/tab1-social/src/lib/db.js",
        location: "withTransaction",
        action: "rollback transaction after failure"
      });
    }

    const shouldLog = !isHttpError(error) || (error.statusCode ?? 500) >= 500;
    if (shouldLog) {
      logError("Database transaction failed", error, {
        file: "backend/tab1-social/src/lib/db.js",
        location: "withTransaction",
        action: "run transactional callback"
      });
    }

    throw error;
  } finally {
    client.release();
  }
};
