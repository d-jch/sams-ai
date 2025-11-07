#!/usr/bin/env -S deno run -A

/**
 * Database reset script
 * Drops all tables and recreates the schema
 * USE WITH CAUTION: This will delete all data!
 */
import "@std/dotenv/load";
import { Pool } from "@db/postgres";
import { createDatabasePool } from "../lib/db.ts";

async function reset() {
  console.log("⚠️  DATABASE RESET - THIS WILL DELETE ALL DATA!");
  console.log("━".repeat(50));

  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    Deno.exit(1);
  }

  console.log("\n🗑️  Dropping all tables...");

  const pool: Pool = createDatabasePool(databaseUrl, 1);

  try {
    using client = await pool.connect();

    // Drop tables in reverse order of dependencies
    await client.queryObject("DROP TABLE IF EXISTS sessions CASCADE;");
    console.log("  ✅ Dropped table: sessions");

    await client.queryObject("DROP TABLE IF EXISTS users CASCADE;");
    console.log("  ✅ Dropped table: users");

    await client.queryObject(
      "DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;",
    );
    console.log("  ✅ Dropped function: update_updated_at_column");

    console.log("\n📋 Recreating schema...");

    // Read and execute schema file
    const schemaPath = new URL("../sql/schema.sql", import.meta.url).pathname;
    const schema = await Deno.readTextFile(schemaPath);

    // Execute schema (note: multi-statement execution)
    await client.queryObject(schema);
    console.log("  ✅ Schema recreated successfully");

    console.log("\n✨ Database reset completed!");
    console.log("\n💡 Next steps:");
    console.log("   1. Seed the database: deno task db:seed");
    console.log("   2. Start the app: deno task dev");
  } catch (error) {
    console.error("\n❌ Database reset failed:", error);
    Deno.exit(1);
  } finally {
    await pool.end();
  }

  Deno.exit(0);
}

// Run the reset function
if (import.meta.main) {
  await reset();
}
