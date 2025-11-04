#!/usr/bin/env -S deno run --allow-read --allow-net --allow-env
/**
 * 命令行数据库迁移工具
 *
 * 用法:
 *   DATABASE_URL='postgresql://user:pass@host:5432/db' deno task db:migrate
 * 或者:
 *   deno run -A scripts/migrate.ts --database-url='postgresql://...'
 *
 * 功能:
 *   - 检查数据库连接
 *   - 检查表是否存在
 *   - 运行迁移（如果需要）
 *   - 验证迁移结果
 */

import {
  checkDatabaseConnection,
  checkTablesExist,
  runMigrations,
} from "../lib/migrate.ts";

function parseArgs() {
  const out: Record<string, string> = {};
  for (const arg of Deno.args) {
    if (!arg.startsWith("--")) continue;
    const [k, v = ""] = arg.slice(2).split("=");
    out[k] = v;
  }
  return out;
}

async function main() {
  console.log("🗄️ Database Migration Tool");
  console.log("==========================");

  const args = parseArgs();
  const databaseUrl = args["database-url"] || Deno.env.get("DATABASE_URL");
  const force = args["force"] === "true" ||
    Deno.env.get("FORCE_MIGRATE") === "true";

  if (!databaseUrl) {
    console.error("❌ DATABASE_URL not provided.");
    console.error(
      "   Set environment variable DATABASE_URL or use --database-url flag",
    );
    console.error("   Example:");
    console.error(
      '     DATABASE_URL="postgresql://user:pass@host:5432/db" deno task db:migrate',
    );
    Deno.exit(1);
  }

  try {
    // Step 1: 检查数据库连接
    console.log("🔍 Checking database connection...");
    const connectionOk = await checkDatabaseConnection(databaseUrl);
    if (!connectionOk) {
      console.error("❌ Failed to connect to database");
      Deno.exit(1);
    }

    // Step 2: 检查表是否存在
    console.log("📋 Checking if tables exist...");
    const tablesExist = await checkTablesExist(databaseUrl);

    if (tablesExist && !force) {
      console.log("✅ Tables already exist. Migration not needed.");
      console.log("   Use --force=true to run migration anyway");
      return;
    }

    if (tablesExist && force) {
      console.log("⚠️  Tables exist but force migration requested...");
    }

    // Step 3: 运行迁移
    console.log("🚀 Running database migration...");
    await runMigrations(databaseUrl);

    // Step 4: 验证结果
    console.log("🔍 Verifying migration results...");
    const newTablesExist = await checkTablesExist(databaseUrl);
    if (newTablesExist) {
      console.log("✅ Migration completed successfully!");
      console.log("   Tables created: users, sessions");
    } else {
      console.error("❌ Migration may have failed - tables not found");
      Deno.exit(1);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("❌ Migration failed:", errorMessage);
    console.error("\n💡 Troubleshooting tips:");
    console.error("   1. Check DATABASE_URL format");
    console.error("   2. Verify database permissions (CREATE table rights)");
    console.error("   3. Ensure database server is running");
    console.error("   4. Check network connectivity");
    Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
