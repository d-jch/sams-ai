import { Pool } from "@db/postgres";
import type {
  CreateUserData,
  Session,
  SessionRow,
  User,
  UserRow,
} from "./types.ts";

// 创建带有正确 TLS 配置的数据库连接池
export function createDatabasePool(
  databaseUrl: string,
  maxConnections = 10,
): Pool {
  // Support optional TLS/SSL configuration for databases that require encrypted connections
  // (e.g. AWS RDS). We accept DATABASE_URL as a connection string, and additional
  // TLS options can be supplied via environment variables:
  // - DB_SSL=true|false (enable TLS)
  // - DB_SSL_REJECT_UNAUTHORIZED=true|false (whether to verify server cert)
  // - DB_SSL_CA_PATH=/path/to/ca.pem (optional path to CA cert file)

  const useTlsEnv = (Deno.env.get("DB_SSL") || Deno.env.get("PGSSLMODE") || "")
    .toLowerCase();
  const useTls = useTlsEnv === "true" || useTlsEnv === "require" ||
    databaseUrl.includes("rds.amazonaws.com");

  if (!useTls) {
    // No TLS requested — pass connection string directly
    return new Pool(databaseUrl, maxConnections, true); // lazy connect
  }

  // Parse connection string and build config object with TLS options
  const url = new URL(databaseUrl);
  const user = decodeURIComponent(url.username || "");
  const password = decodeURIComponent(url.password || "");
  const hostname = url.hostname;
  const port = url.port ? Number(url.port) : 5432;
  const database = url.pathname && url.pathname !== "/"
    ? url.pathname.slice(1)
    : undefined;

  // TLS options
  const rejectUnauthorizedEnv =
    (Deno.env.get("DB_SSL_REJECT_UNAUTHORIZED") || "true").toLowerCase();
  const rejectUnauthorized = rejectUnauthorizedEnv !== "false";

  // Optional CA certificate (path)
  let caCert: string | undefined = undefined;
  const caPath = Deno.env.get("DB_SSL_CA_PATH");
  if (caPath) {
    try {
      caCert = Deno.readTextFileSync(caPath);
    } catch (e) {
      console.warn("Could not read DB SSL CA file at", caPath, e);
    }
  }

  // Build connection config object compatible with @db/postgres Pool
  const config: Record<string, unknown> = {
    user: user || undefined,
    password: password || undefined,
    hostname,
    port,
    database,
  };

  // Attach TLS configuration
  const tlsObj: Record<string, unknown> = {
    enabled: true,
    rejectUnauthorized,
  };
  if (caCert) {
    tlsObj.caCertificates = [caCert];
  }
  config.tls = tlsObj;

  return new Pool(
    config as unknown as Record<string, unknown>,
    maxConnections,
    true,
  );
}

class Database {
  private pool: Pool;

  constructor(databaseUrl: string) {
    this.pool = createDatabasePool(databaseUrl, 10);
  }

  async connect() {
    // Test the connection
    using client = await this.pool.connect();
    await client.queryObject("SELECT NOW()");
    console.log("✅ Database connected successfully");
  }

  async close() {
    await this.pool.end();
  }

  // User operations
  async createUser(
    userData: CreateUserData & { passwordHash: string },
  ): Promise<User> {
    using client = await this.pool.connect();

    const result = await client.queryObject<UserRow>(
      `
      INSERT INTO users (email, password_hash, name)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [userData.email, userData.passwordHash, userData.name],
    );

    const userRow = result.rows[0];
    return this.mapUserRowToUser(userRow);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<UserRow>(
      `
      SELECT * FROM users WHERE email = $1
    `,
      [email],
    );

    if (result.rows.length === 0) return null;
    return this.mapUserRowToUser(result.rows[0]);
  }

  async getUserById(id: string): Promise<User | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<UserRow>(
      `
      SELECT * FROM users WHERE id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) return null;
    return this.mapUserRowToUser(result.rows[0]);
  }

  async getUserByEmailWithPassword(
    email: string,
  ): Promise<(User & { passwordHash: string }) | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<UserRow>(
      `
      SELECT * FROM users WHERE email = $1
    `,
      [email],
    );

    if (result.rows.length === 0) return null;

    const userRow = result.rows[0];
    return {
      ...this.mapUserRowToUser(userRow),
      passwordHash: userRow.password_hash,
    };
  }

  // Session operations
  async createSession(
    sessionId: string,
    userId: string,
    lastVerifiedAt: Date,
    secretHash: Uint8Array,
  ): Promise<Session> {
    using client = await this.pool.connect();

    await client.queryObject(
      `
      INSERT INTO sessions (id, user_id, last_verified_at, secret_hash)
      VALUES ($1, $2, $3, $4)
    `,
      [sessionId, userId, lastVerifiedAt, secretHash],
    );

    return {
      id: sessionId,
      userId,
      lastVerifiedAt,
      fresh: true,
      secretHash,
    };
  }

  async getSessionById(sessionId: string): Promise<Session | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SessionRow>(
      `
      SELECT * FROM sessions WHERE id = $1
    `,
      [sessionId],
    );

    if (result.rows.length === 0) return null;

    const sessionRow = result.rows[0];
    return {
      id: sessionRow.id,
      userId: sessionRow.user_id,
      lastVerifiedAt: sessionRow.last_verified_at,
      fresh: false, // Existing session is not fresh
      secretHash: sessionRow.secret_hash,
    };
  }

  async updateSessionLastVerified(
    sessionId: string,
    lastVerifiedAt: Date,
  ): Promise<void> {
    using client = await this.pool.connect();

    await client.queryObject(
      `
      UPDATE sessions SET last_verified_at = $1 WHERE id = $2
    `,
      [lastVerifiedAt, sessionId],
    );
  }

  async deleteSession(sessionId: string): Promise<void> {
    using client = await this.pool.connect();

    await client.queryObject(
      `
      DELETE FROM sessions WHERE id = $1
    `,
      [sessionId],
    );
  }

  async deleteUserSessions(userId: string): Promise<void> {
    using client = await this.pool.connect();

    await client.queryObject(
      `
      DELETE FROM sessions WHERE user_id = $1
    `,
      [userId],
    );
  }

  async cleanupInactiveSessions(cutoffTime: Date): Promise<number> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `
      DELETE FROM sessions WHERE last_verified_at < $1
    `,
      [cutoffTime],
    );

    return result.rowCount || 0;
  }

  // Helper methods
  private mapUserRowToUser(row: UserRow): User {
    return {
      id: row.id,
      email: row.email,
      name: row.name,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Database health check
  async healthCheck(): Promise<boolean> {
    try {
      using client = await this.pool.connect();
      await client.queryObject("SELECT 1");
      return true;
    } catch (error) {
      console.error("Database health check failed:", error);
      return false;
    }
  }
}

// Singleton database instance
let db: Database | null = null;

export function getDatabase(): Database {
  if (!db) {
    const databaseUrl = Deno.env.get("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is required");
    }
    db = new Database(databaseUrl);
  }
  return db;
}

export async function initializeDatabase(): Promise<void> {
  const database = getDatabase();
  await database.connect();

  // 自动运行数据库迁移
  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (databaseUrl) {
    const autoMigrateEnv = Deno.env.get("AUTO_MIGRATE");
    const forceMode = Deno.env.get("AUTO_MIGRATE_FORCE") === "true";

    // 详细的环境变量调试日志
    console.log(`🔍 Migration check - AUTO_MIGRATE: ${autoMigrateEnv}`);

    // 只根据 AUTO_MIGRATE 环境变量决定是否迁移
    const autoMigrate = autoMigrateEnv === "true";

    console.log(
      `🤖 Auto-migration ${autoMigrate ? "ENABLED" : "DISABLED"} (explicit: ${
        autoMigrateEnv === "true"
      }, force: ${forceMode})`,
    );

    if (autoMigrate) {
      try {
        console.log("🔄 Running automatic database migration...");

        // 动态导入迁移工具
        const { runMigrations, checkTablesExist } = await import(
          "./migrate.ts"
        );

        // 检查表是否已存在
        console.log("📋 Checking if database tables exist...");
        const tablesExist = await checkTablesExist(databaseUrl);

        if (!tablesExist || forceMode) {
          if (!tablesExist) {
            console.log("🏗️ Tables not found, running initial migration...");
          } else if (forceMode) {
            console.log("🔄 Force mode enabled, running migration anyway...");
          }
          await runMigrations(databaseUrl);
          console.log("✅ Database migration completed successfully");
        } else {
          console.log("✅ Database tables already exist, skipping migration");
          console.log(
            "💡 If you need to update schema, run: deno task db:migrate --force",
          );
          console.log(
            "💡 Or set AUTO_MIGRATE_FORCE=true to force migration on deploy",
          );
        }
      } catch (migrationError) {
        console.error("❌ Auto-migration failed:", migrationError);
        console.warn(
          "💡 You can disable auto-migration by setting AUTO_MIGRATE=false",
        );
        console.warn("💡 Or run migration manually: deno task db:migrate");

        // 迁移失败时抛出错误（无论什么环境）
        throw migrationError;
      }
    }
  }

  // Clean up inactive sessions on startup (older than 10 days)
  const cutoffTime = new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)); // 10 days
  try {
    const cleanedSessions = await database.cleanupInactiveSessions(cutoffTime);
    if (cleanedSessions > 0) {
      console.log(`🧹 Cleaned up ${cleanedSessions} inactive sessions`);
    }
  } catch (err) {
    // If sessions table doesn't exist, log actionable guidance instead of crashing the dev server.
    // Postgres 'relation does not exist' error code is 42P01.
    const e = err as unknown as {
      fields?: Record<string, unknown>;
      code?: string;
      message?: unknown;
    };
    const code = (e.fields && (e.fields["code"] as string | undefined)) ||
      e.code;
    const message = typeof e.message === "string" ? e.message : String(err);
    if (
      code === "42P01" ||
      /relation\s+"sessions"\s+does not exist/i.test(message)
    ) {
      console.warn(
        "❌ Database cleanup skipped: the 'sessions' table does not exist.",
      );
      console.warn(
        "   Tables should have been created by auto-migration. If disabled:",
      );
      console.warn("   Run: deno task db:migrate");
      console.warn("   Or manually apply: sql/schema.sql");
    } else {
      // Unknown error — rethrow so it surfaces during initialization
      console.error("Failed to initialize database:", err);
      throw err;
    }
  }
}
