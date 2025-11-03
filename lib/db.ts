import { Pool } from "@db/postgres";
import type {
  CreateUserData,
  Session,
  SessionRow,
  User,
  UserRow,
} from "./types.ts";

class Database {
  private pool: Pool;

  constructor(databaseUrl: string) {
    // Support optional TLS/SSL configuration for databases that require encrypted connections
    // (e.g. AWS RDS). We accept DATABASE_URL as a connection string, and additional
    // TLS options can be supplied via environment variables:
    // - DB_SSL=true|false (enable TLS)
    // - DB_SSL_REJECT_UNAUTHORIZED=true|false (whether to verify server cert)
    // - DB_SSL_CA_PATH=/path/to/ca.pem (optional path to CA cert file)

    const useTlsEnv =
      (Deno.env.get("DB_SSL") || Deno.env.get("PGSSLMODE") || "").toLowerCase();
    const useTls = useTlsEnv === "true" || useTlsEnv === "require" ||
      databaseUrl.includes("rds.amazonaws.com");

    if (!useTls) {
      // No TLS requested — pass connection string directly
      this.pool = new Pool(databaseUrl, 10, true); // 10 connections, lazy connect
      return;
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
    // Many Postgres clients accept an object { user, password, hostname, port, database, tls }
    const config: Record<string, unknown> = {
      user: user || undefined,
      password: password || undefined,
      hostname,
      port,
      database,
    };

    // Attach TLS configuration in a conservative, widely compatible shape.
    // Drivers may accept `tls: { caCertificates: [...], rejectUnauthorized: boolean }` or
    // `tls: true`. We provide both to maximize compatibility.
    const tlsObj: Record<string, unknown> = {
      enabled: true,
      rejectUnauthorized,
    };
    if (caCert) {
      // Provide CA as text; drivers that accept CA arrays may handle this.
      tlsObj.caCertificates = [caCert];
    }
    config.tls = tlsObj;

    // Pass config object to Pool. Cast to unknown to satisfy the imported Pool type
    this.pool = new Pool(
      config as unknown as Record<string, unknown>,
      10,
      true,
    );
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
        "   To create required tables, apply the SQL schema located at: sql/schema.sql",
      );
      console.warn("   Example (psql):");
      console.warn('     psql "$DATABASE_URL" -f sql/schema.sql');
      console.warn(
        "   Or connect with your usual Postgres client and run the file contents.",
      );
      console.warn(
        "   If you're using TLS/CA for the DB, ensure DB_SSL and DB_SSL_CA_PATH are set when running the command.",
      );
    } else {
      // Unknown error — rethrow so it surfaces during initialization
      console.error("Failed to initialize database:", err);
      throw err;
    }
  }
}
