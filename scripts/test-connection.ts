#!/usr/bin/env -S deno run -A

/**
 * Database connection test script
 * Verifies database connectivity and displays connection info
 */

import "@std/dotenv/load";
import { checkDatabaseConnection, checkTablesExist } from "../lib/migrate.ts";
import { createDatabasePool } from "../lib/db.ts";

async function testConnection() {
  console.log("🔌 Testing database connection...\n");

  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is not set");
    console.error("\n💡 Set it in your .env file or environment:");
    console.error(
      '   export DATABASE_URL="postgresql://user:pass@localhost:5432/dbname"',
    );
    Deno.exit(1);
  }

  // Parse connection URL for display (hide password)
  let displayUrl = databaseUrl;
  try {
    const url = new URL(databaseUrl);
    if (url.password) {
      displayUrl = databaseUrl.replace(url.password, "****");
    }
  } catch {
    // If URL parsing fails, just mask the whole thing
    displayUrl = "postgresql://***:***@***/***/***";
  }

  console.log("📊 Connection Details:");
  console.log(`   URL: ${displayUrl}`);
  console.log(
    `   SSL: ${Deno.env.get("DB_SSL") || "not specified (default: false)"}`,
  );
  console.log("");

  // 1. 检查数据库连接
  const ok = await checkDatabaseConnection(databaseUrl);
  if (!ok) {
    console.error("\n❌ Connection failed!");
    Deno.exit(1);
  }

  // 2. 检查表是否存在
  const hasTables = await checkTablesExist(databaseUrl);
  if (!hasTables) {
    console.log("\n📁 Tables in database: (no tables found)");
    console.log("\n💡 Run migrations to create tables:");
    console.log("   deno task db:migrate");
    Deno.exit(0);
  }

  // 3. 展示表和用户数（保留原有逻辑）
  const pool = createDatabasePool(databaseUrl, 1);
  using client = await pool.connect();

  // 展示所有表
  const tablesResult = await client.queryObject<{ table_name: string }>(
    `SELECT table_name 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
     ORDER BY table_name`,
  );
  console.log("\n📁 Tables in database:");
  tablesResult.rows.forEach((row) => {
    console.log(`   - ${row.table_name}`);
  });

  // 展示用户数
  try {
    const userCountResult = await client.queryObject<{ count: number }>(
      "SELECT COUNT(*) as count FROM users",
    );
    const userCount = userCountResult.rows[0]?.count || 0;
    console.log(`\n👥 Users in database: ${userCount}`);
    if (userCount === 0) {
      console.log("\n💡 Seed the database with test users:");
      console.log("   deno task db:seed");
    }
  } catch {
    // Users table doesn't exist yet
  }

  await pool.end();
  console.log("\n✨ Database is ready to use!");
  Deno.exit(0);
}

// Run the test function
if (import.meta.main) {
  await testConnection();
}
