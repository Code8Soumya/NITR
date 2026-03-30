import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Pool } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const migrationDir = path.resolve(__dirname, "../sql");

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run migrations");
  }

  const sslEnabled = (process.env.PG_SSL ?? "true").toLowerCase() === "true";
  const pool = new Pool({
    connectionString,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined
  });

  try {
    const files = await fs.readdir(migrationDir);
    const migrationFiles = files
      .filter((fileName) => fileName.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const fileName of migrationFiles) {
      const migrationPath = path.resolve(migrationDir, fileName);
      const sql = await fs.readFile(migrationPath, "utf8");
      await pool.query(sql);
      console.log(`Applied migration: ${fileName}`);
    }

    console.log("All migrations applied successfully.");
  } finally {
    await pool.end();
  }
};

run().catch((error) => {
  console.error("Migration failed", error);
  process.exitCode = 1;
});
