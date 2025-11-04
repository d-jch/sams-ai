// 数据库迁移工具 - 用于应用启动时自动迁移
import { Pool } from "@db/postgres";

export async function runMigrations(databaseUrl: string): Promise<void> {
  console.log("🔄 Starting database migration...");

  const pool = new Pool(databaseUrl, 2, true);
  const client = await pool.connect();

  try {
    // 读取schema文件
    const schemaPath = new URL("../sql/schema.sql", import.meta.url).pathname;
    const sql = await Deno.readTextFile(schemaPath);

    // 执行迁移
    await client.queryObject(sql);

    console.log("✅ Database migration completed successfully");
  } catch (error) {
    console.error("❌ Database migration failed:", error);
    throw error;
  } finally {
    try {
      client.release();
      await pool.end();
    } catch (_e) {
      // 忽略释放连接的错误
    }
  }
}

export async function checkDatabaseConnection(
  databaseUrl: string,
): Promise<boolean> {
  try {
    const pool = new Pool(databaseUrl, 1, true);
    const client = await pool.connect();

    // 简单的连接测试
    await client.queryObject("SELECT 1");

    client.release();
    await pool.end();

    console.log("✅ Database connection verified");
    return true;
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    return false;
  }
}

// 检查表是否存在
export async function checkTablesExist(databaseUrl: string): Promise<boolean> {
  try {
    const pool = new Pool(databaseUrl, 1, true);
    const client = await pool.connect();

    const result = await client.queryObject<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      ) as exists`,
    );

    client.release();
    await pool.end();

    return result.rows[0]?.exists ?? false;
  } catch (error) {
    console.error("❌ Failed to check table existence:", error);
    return false;
  }
}
