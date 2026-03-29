import { Pool } from "pg";

import { HttpError } from "./errors.js";

let pool;

const buildPool = () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new HttpError(500, "DATABASE_URL is required", "MISSING_DATABASE_URL");
  }

  const sslEnabled = (process.env.PG_SSL ?? "true").toLowerCase() === "true";

  return new Pool({
    connectionString,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
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
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
