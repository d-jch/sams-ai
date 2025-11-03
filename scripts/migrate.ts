#!/usr/bin/env -S deno run --allow-read --allow-net --allow-env
// Simple Deno migration runner for sql/schema.sql
// Usage:
//   DATABASE_URL='postgresql://user:pass@host:5432/db' deno run --allow-read --allow-net --allow-env scripts/migrate.ts
// Or with flags:
//   deno run --allow-read --allow-net --allow-env scripts/migrate.ts --file=sql/schema.sql --database-url='postgresql://...'

import { Pool } from "@db/postgres";

function parseArgs() {
  const out: Record<string, string> = {};
  for (const arg of Deno.args) {
    if (!arg.startsWith("--")) continue;
    const [k, v = ""] = arg.slice(2).split("=");
    out[k] = v;
  }
  return out;
}

const args = parseArgs();
const filePath = args.file || "sql/schema.sql";
const databaseUrl = args["database-url"] || Deno.env.get("DATABASE_URL");

if (!databaseUrl) {
  console.error("DATABASE_URL not provided. Set env var DATABASE_URL or pass --database-url='");
  Deno.exit(2);
}

try {
  const sql = await Deno.readTextFile(filePath);

  console.log(`Connecting to database and applying schema from ${filePath}...`);
  const pool = new Pool(databaseUrl, 2, true);

  const client = await pool.connect();
  try {
    // Some SQL files contain multiple statements; many drivers accept a single batch execution.
    // If the driver rejects multi-statement execution, you can split on /;\s*$/ and run sequentially.
    await client.queryObject(sql);
    console.log("✅ Migration applied successfully.");
  } finally {
    // Try to release the client if available
    try {
      // @ts-ignore - release may be named release or done depending on client
      await (client.release ? client.release() : (client.done ? client.done() : Promise.resolve()));
    } catch (_e) {
      // ignore
    }
    await pool.end();
  }
} catch (err) {
  console.error("Migration failed:", err);
  Deno.exit(1);
}
