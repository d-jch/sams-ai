import { Pool } from "@db/postgres";
import type {
  BarcodeAssignment,
  BarcodeAssignmentRow,
  BarcodeKit,
  BarcodeKitRow,
  BarcodeSequence,
  BarcodeSequenceRow,
  CreateUserData,
  PlateLayout,
  PlateLayoutRow,
  Primer,
  PrimerRow,
  Sample,
  SampleRow,
  SequencingRequest,
  SequencingRequestRow,
  Session,
  SessionRow,
  User,
  UserRow,
  WellAssignment,
  WellAssignmentRow,
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

    const role = userData.role || "researcher"; // Default role

    const result = await client.queryObject<UserRow>(
      `
      INSERT INTO users (email, password_hash, name, role)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [userData.email, userData.passwordHash, userData.name, role],
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
      role: row.role,
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRequestRowToRequest(row: SequencingRequestRow): SequencingRequest {
    return {
      id: row.id,
      userId: row.user_id,
      projectName: row.project_name,
      sequencingType: row.sequencing_type,
      status: row.status,
      priority: row.priority,
      estimatedCost: row.estimated_cost,
      actualCost: row.actual_cost,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapSampleRowToSample(row: SampleRow): Sample {
    return {
      id: row.id,
      requestId: row.request_id,
      name: row.name,
      type: row.type,
      barcode: row.barcode,
      concentration: row.concentration,
      volume: row.volume,
      qcStatus: row.qc_status,
      storageLocation: row.storage_location,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // Sequencing Request operations
  async createRequest(data: {
    userId: string;
    projectName: string;
    sequencingType: string;
    priority?: string;
    estimatedCost?: number;
    notes?: string;
  }): Promise<SequencingRequest> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SequencingRequestRow>(
      `
      INSERT INTO sequencing_requests (user_id, project_name, sequencing_type, priority, estimated_cost, notes)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [
        data.userId,
        data.projectName,
        data.sequencingType,
        data.priority || "normal",
        data.estimatedCost || null,
        data.notes || null,
      ],
    );

    return this.mapRequestRowToRequest(result.rows[0]);
  }

  async getRequestById(id: string): Promise<SequencingRequest | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SequencingRequestRow>(
      `
      SELECT * FROM sequencing_requests WHERE id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) return null;
    return this.mapRequestRowToRequest(result.rows[0]);
  }

  async getRequestsByUserId(userId: string): Promise<SequencingRequest[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SequencingRequestRow>(
      `
      SELECT * FROM sequencing_requests 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `,
      [userId],
    );

    return result.rows.map((row) => this.mapRequestRowToRequest(row));
  }

  async getAllRequests(): Promise<SequencingRequest[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SequencingRequestRow>(
      `
      SELECT * FROM sequencing_requests 
      ORDER BY created_at DESC
    `,
    );

    return result.rows.map((row) => this.mapRequestRowToRequest(row));
  }

  async getRequestsWithPagination(
    userId: string | null,
    filters: {
      status?: string;
      sequencingType?: string;
      priority?: string;
      dateFrom?: Date;
      dateTo?: Date;
    },
    pagination: { page: number; limit: number },
  ): Promise<{
    requests: SequencingRequest[];
    total: number;
  }> {
    using client = await this.pool.connect();

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // 如果提供了 userId，则只查询该用户的申请
    if (userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(userId);
    }

    // 状态过滤
    if (filters.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(filters.status);
    }

    // 测序类型过滤
    if (filters.sequencingType) {
      conditions.push(`sequencing_type = $${paramIndex++}`);
      values.push(filters.sequencingType);
    }

    // 优先级过滤
    if (filters.priority) {
      conditions.push(`priority = $${paramIndex++}`);
      values.push(filters.priority);
    }

    // 日期范围过滤
    if (filters.dateFrom) {
      conditions.push(`created_at >= $${paramIndex++}`);
      values.push(filters.dateFrom);
    }

    if (filters.dateTo) {
      conditions.push(`created_at <= $${paramIndex++}`);
      values.push(filters.dateTo);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 获取总数
    const countResult = await client.queryObject<{ count: number }>(
      `SELECT COUNT(*) as count FROM sequencing_requests ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.count || 0);

    // 获取分页数据（包含样品数和申请人姓名）
    const offset = (pagination.page - 1) * pagination.limit;
    values.push(pagination.limit, offset);

    const result = await client.queryObject<
      SequencingRequestRow & { sample_count: string; user_name: string }
    >(
      `
      SELECT r.*, 
             COALESCE(COUNT(s.id), 0)::text as sample_count,
             u.name as user_name
      FROM sequencing_requests r
      LEFT JOIN samples s ON r.id = s.request_id
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      GROUP BY r.id, u.name
      ORDER BY r.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `,
      values,
    );

    return {
      requests: result.rows.map((row) => ({
        ...this.mapRequestRowToRequest(row),
        sampleCount: parseInt(row.sample_count) || 0,
        userName: row.user_name,
      })),
      total,
    };
  }

  async updateRequest(
    id: string,
    data: {
      projectName?: string;
      sequencingType?: string;
      priority?: string;
      estimatedCost?: number;
      actualCost?: number;
      notes?: string;
    },
  ): Promise<SequencingRequest | null> {
    using client = await this.pool.connect();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.projectName !== undefined) {
      updates.push(`project_name = $${paramIndex++}`);
      values.push(data.projectName);
    }
    if (data.sequencingType !== undefined) {
      updates.push(`sequencing_type = $${paramIndex++}`);
      values.push(data.sequencingType);
    }
    if (data.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(data.priority);
    }
    if (data.estimatedCost !== undefined) {
      updates.push(`estimated_cost = $${paramIndex++}`);
      values.push(data.estimatedCost);
    }
    if (data.actualCost !== undefined) {
      updates.push(`actual_cost = $${paramIndex++}`);
      values.push(data.actualCost);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      return await this.getRequestById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.queryObject<SequencingRequestRow>(
      `
      UPDATE sequencing_requests 
      SET ${updates.join(", ")} 
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values,
    );

    if (result.rows.length === 0) return null;
    return this.mapRequestRowToRequest(result.rows[0]);
  }

  async updateRequestStatus(
    id: string,
    newStatus: string,
    changedBy: string,
    comment?: string,
  ): Promise<SequencingRequest | null> {
    using client = await this.pool.connect();

    // Start a transaction
    await client.queryArray("BEGIN");

    try {
      // Get current status
      const currentResult = await client.queryObject<SequencingRequestRow>(
        `SELECT * FROM sequencing_requests WHERE id = $1`,
        [id],
      );

      if (currentResult.rows.length === 0) {
        await client.queryArray("ROLLBACK");
        return null;
      }

      const oldStatus = currentResult.rows[0].status;

      // Update request status
      const updateResult = await client.queryObject<SequencingRequestRow>(
        `
        UPDATE sequencing_requests 
        SET status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
        RETURNING *
      `,
        [newStatus, id],
      );

      // Record status change history
      await client.queryObject(
        `
        INSERT INTO request_status_history (request_id, old_status, new_status, changed_by, comment)
        VALUES ($1, $2, $3, $4, $5)
      `,
        [id, oldStatus, newStatus, changedBy, comment || null],
      );

      await client.queryArray("COMMIT");
      return this.mapRequestRowToRequest(updateResult.rows[0]);
    } catch (error) {
      await client.queryArray("ROLLBACK");
      throw error;
    }
  }

  async deleteRequest(id: string): Promise<boolean> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `
      DELETE FROM sequencing_requests WHERE id = $1
    `,
      [id],
    );

    return (result.rowCount || 0) > 0;
  }

  // Sample operations
  async createSample(data: {
    requestId: string;
    name: string;
    type: string;
    barcode?: string;
    concentration?: number;
    volume?: number;
    storageLocation?: string;
    notes?: string;
  }): Promise<Sample> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SampleRow>(
      `
      INSERT INTO samples (request_id, name, type, barcode, concentration, volume, storage_location, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `,
      [
        data.requestId,
        data.name,
        data.type,
        data.barcode || null,
        data.concentration || null,
        data.volume || null,
        data.storageLocation || null,
        data.notes || null,
      ],
    );

    return this.mapSampleRowToSample(result.rows[0]);
  }

  async getSampleById(id: string): Promise<Sample | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SampleRow>(
      `
      SELECT * FROM samples WHERE id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) return null;
    return this.mapSampleRowToSample(result.rows[0]);
  }

  async getSampleByBarcode(barcode: string): Promise<Sample | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SampleRow>(
      `
      SELECT * FROM samples WHERE barcode = $1
    `,
      [barcode],
    );

    if (result.rows.length === 0) return null;
    return this.mapSampleRowToSample(result.rows[0]);
  }

  async getSamplesByRequestId(requestId: string): Promise<Sample[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<SampleRow>(
      `
      SELECT * FROM samples 
      WHERE request_id = $1 
      ORDER BY created_at ASC
    `,
      [requestId],
    );

    return result.rows.map((row) => this.mapSampleRowToSample(row));
  }

  async getSamplesWithPagination(
    filters: {
      type?: string;
      qcStatus?: string;
      requestId?: string;
    },
    pagination: { page: number; limit: number },
    sort?: { column: string; direction: "ASC" | "DESC" },
  ): Promise<{
    samples: Sample[];
    total: number;
  }> {
    using client = await this.pool.connect();

    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // 申请 ID 过滤
    if (filters.requestId) {
      conditions.push(`s.request_id = $${paramIndex++}`);
      values.push(filters.requestId);
    }

    // 样品类型过滤
    if (filters.type) {
      conditions.push(`s.type = $${paramIndex++}`);
      values.push(filters.type);
    }

    // QC 状态过滤
    if (filters.qcStatus) {
      conditions.push(`s.qc_status = $${paramIndex++}`);
      values.push(filters.qcStatus);
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    // 获取总数
    const countResult = await client.queryObject<{ count: number }>(
      `SELECT COUNT(*) as count FROM samples s ${whereClause}`,
      values,
    );
    const total = Number(countResult.rows[0]?.count || 0);

    // 构建排序子句
    const validColumns: Record<string, string> = {
      name: "s.name",
      type: "s.type",
      qcStatus: "s.qc_status",
      createdAt: "s.created_at",
      userName: "u.name",
    };
    const sortColumn = sort?.column && validColumns[sort.column]
      ? validColumns[sort.column]
      : "s.created_at";
    const sortDirection = sort?.direction === "ASC" ? "ASC" : "DESC";
    const orderByClause = `ORDER BY ${sortColumn} ${sortDirection}`;

    // 获取分页数据（包含提交人姓名）
    const offset = (pagination.page - 1) * pagination.limit;
    values.push(pagination.limit, offset);

    const result = await client.queryObject<
      SampleRow & { user_name: string }
    >(
      `
      SELECT s.*, u.name as user_name
      FROM samples s
      LEFT JOIN sequencing_requests r ON s.request_id = r.id
      LEFT JOIN users u ON r.user_id = u.id
      ${whereClause}
      ${orderByClause}
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `,
      values,
    );

    // 为每个样品加载关联的引物
    const samplesWithPrimers = await Promise.all(
      result.rows.map(async (row) => {
        const sample = this.mapSampleRowToSample(row);
        sample.primerIds = await this.getSamplePrimers(sample.id);
        sample.userName = row.user_name;
        return sample;
      }),
    );

    return {
      samples: samplesWithPrimers,
      total,
    };
  }

  async updateSample(
    id: string,
    data: {
      name?: string;
      type?: string;
      barcode?: string;
      concentration?: number;
      volume?: number;
      qcStatus?: string;
      storageLocation?: string;
      notes?: string;
    },
  ): Promise<Sample | null> {
    using client = await this.pool.connect();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      values.push(data.type);
    }
    if (data.barcode !== undefined) {
      updates.push(`barcode = $${paramIndex++}`);
      values.push(data.barcode);
    }
    if (data.concentration !== undefined) {
      updates.push(`concentration = $${paramIndex++}`);
      values.push(data.concentration);
    }
    if (data.volume !== undefined) {
      updates.push(`volume = $${paramIndex++}`);
      values.push(data.volume);
    }
    if (data.qcStatus !== undefined) {
      updates.push(`qc_status = $${paramIndex++}`);
      values.push(data.qcStatus);
    }
    if (data.storageLocation !== undefined) {
      updates.push(`storage_location = $${paramIndex++}`);
      values.push(data.storageLocation);
    }
    if (data.notes !== undefined) {
      updates.push(`notes = $${paramIndex++}`);
      values.push(data.notes);
    }

    if (updates.length === 0) {
      return await this.getSampleById(id);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await client.queryObject<SampleRow>(
      `
      UPDATE samples 
      SET ${updates.join(", ")} 
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values,
    );

    if (result.rows.length === 0) return null;
    return this.mapSampleRowToSample(result.rows[0]);
  }

  async deleteSample(id: string): Promise<boolean> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `
      DELETE FROM samples WHERE id = $1
    `,
      [id],
    );

    return (result.rowCount || 0) > 0;
  }

  // Sample-Primer association methods
  async assignPrimerToSample(
    sampleId: string,
    primerId: string,
  ): Promise<boolean> {
    using client = await this.pool.connect();

    try {
      // 插入新的引物关联（支持多个引物）
      await client.queryObject(
        `
        INSERT INTO sample_primers (sample_id, primer_id)
        VALUES ($1, $2)
        ON CONFLICT (sample_id, primer_id) DO NOTHING
      `,
        [sampleId, primerId],
      );

      return true;
    } catch (error) {
      console.error("分配引物失败:", error);
      return false;
    }
  }

  async clearSamplePrimers(sampleId: string): Promise<boolean> {
    using client = await this.pool.connect();

    try {
      await client.queryObject(
        `DELETE FROM sample_primers WHERE sample_id = $1`,
        [sampleId],
      );

      return true;
    } catch (error) {
      console.error("清除引物关联失败:", error);
      return false;
    }
  }

  async getSamplePrimers(sampleId: string): Promise<string[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<{ primer_id: string }>(
      `
      SELECT primer_id FROM sample_primers WHERE sample_id = $1
    `,
      [sampleId],
    );

    return result.rows.map((row) => row.primer_id);
  }

  async removePrimerFromSample(
    sampleId: string,
    primerId: string,
  ): Promise<boolean> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `
      DELETE FROM sample_primers 
      WHERE sample_id = $1 AND primer_id = $2
    `,
      [sampleId, primerId],
    );

    return (result.rowCount || 0) > 0;
  }

  // ============================================================================
  // Primer methods
  // ============================================================================

  private mapPrimerRowToPrimer(row: PrimerRow): Primer {
    return {
      id: row.id,
      name: row.name,
      sequence: row.sequence,
      description: row.description ?? undefined,
      tm: row.tm ?? undefined,
      gcContent: row.gc_content ?? undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createPrimer(data: {
    name: string;
    sequence: string;
    description?: string;
    tm?: number;
    gcContent?: number;
  }): Promise<Primer> {
    using client = await this.pool.connect();

    const result = await client.queryObject<PrimerRow>(
      `
      INSERT INTO primers (name, sequence, description, tm, gc_content)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [
        data.name,
        data.sequence,
        data.description ?? null,
        data.tm ?? null,
        data.gcContent ?? null,
      ],
    );

    return this.mapPrimerRowToPrimer(result.rows[0]);
  }

  async getPrimers(): Promise<Primer[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<PrimerRow>(
      `
      SELECT * FROM primers 
      ORDER BY name ASC
    `,
    );

    return result.rows.map((row) => this.mapPrimerRowToPrimer(row));
  }

  async getPrimerById(id: string): Promise<Primer | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<PrimerRow>(
      `
      SELECT * FROM primers WHERE id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) return null;
    return this.mapPrimerRowToPrimer(result.rows[0]);
  }

  async getPrimerByName(name: string): Promise<Primer | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<PrimerRow>(
      `
      SELECT * FROM primers WHERE name = $1
    `,
      [name],
    );

    if (result.rows.length === 0) return null;
    return this.mapPrimerRowToPrimer(result.rows[0]);
  }

  async updatePrimer(
    id: string,
    data: {
      name?: string;
      sequence?: string;
      description?: string;
      tm?: number;
      gcContent?: number;
    },
  ): Promise<Primer> {
    using client = await this.pool.connect();

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (data.name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    if (data.sequence !== undefined) {
      updates.push(`sequence = $${paramIndex++}`);
      values.push(data.sequence);
    }
    if (data.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    if (data.tm !== undefined) {
      updates.push(`tm = $${paramIndex++}`);
      values.push(data.tm);
    }
    if (data.gcContent !== undefined) {
      updates.push(`gc_content = $${paramIndex++}`);
      values.push(data.gcContent);
    }

    if (updates.length === 0) {
      // No updates, just return current primer
      const current = await this.getPrimerById(id);
      if (!current) throw new Error("Primer not found");
      return current;
    }

    values.push(id);

    const result = await client.queryObject<PrimerRow>(
      `
      UPDATE primers 
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = $${paramIndex}
      RETURNING *
    `,
      values,
    );

    if (result.rows.length === 0) {
      throw new Error("Primer not found");
    }

    return this.mapPrimerRowToPrimer(result.rows[0]);
  }

  async deletePrimer(id: string): Promise<boolean> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `
      DELETE FROM primers WHERE id = $1
    `,
      [id],
    );

    return (result.rowCount || 0) > 0;
  }

  // ============================================================================
  // Plate Layout methods
  // ============================================================================

  private mapPlateLayoutRowToPlateLayout(row: PlateLayoutRow): PlateLayout {
    return {
      id: row.id,
      requestId: row.request_id,
      plateName: row.plate_name,
      plateType: row.plate_type,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapWellAssignmentRowToWellAssignment(
    row: WellAssignmentRow,
  ): WellAssignment {
    return {
      id: row.id,
      plateLayoutId: row.plate_layout_id,
      sampleId: row.sample_id,
      wellPosition: row.well_position,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async createPlateLayout(data: {
    requestId: string;
    plateName: string;
    plateType: string;
    createdBy: string;
  }): Promise<PlateLayout> {
    using client = await this.pool.connect();

    const result = await client.queryObject<PlateLayoutRow>(
      `
      INSERT INTO plate_layouts (request_id, plate_name, plate_type, created_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `,
      [data.requestId, data.plateName, data.plateType, data.createdBy],
    );

    return this.mapPlateLayoutRowToPlateLayout(result.rows[0]);
  }

  async getPlateLayoutsByRequestId(
    requestId: string,
  ): Promise<PlateLayout[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<PlateLayoutRow>(
      `
      SELECT * FROM plate_layouts 
      WHERE request_id = $1 
      ORDER BY created_at DESC
    `,
      [requestId],
    );

    return result.rows.map((row) => this.mapPlateLayoutRowToPlateLayout(row));
  }

  async getPlateLayoutById(id: string): Promise<PlateLayout | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<PlateLayoutRow>(
      `
      SELECT * FROM plate_layouts WHERE id = $1
    `,
      [id],
    );

    if (result.rows.length === 0) return null;
    return this.mapPlateLayoutRowToPlateLayout(result.rows[0]);
  }

  async deletePlateLayout(id: string): Promise<boolean> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `
      DELETE FROM plate_layouts WHERE id = $1
    `,
      [id],
    );

    return (result.rowCount || 0) > 0;
  }

  // Well Assignment methods

  async createWellAssignment(data: {
    plateLayoutId: string;
    sampleId: string;
    wellPosition: string;
  }): Promise<WellAssignment> {
    using client = await this.pool.connect();

    const result = await client.queryObject<WellAssignmentRow>(
      `
      INSERT INTO well_assignments (plate_layout_id, sample_id, well_position)
      VALUES ($1, $2, $3)
      RETURNING *
    `,
      [data.plateLayoutId, data.sampleId, data.wellPosition],
    );

    return this.mapWellAssignmentRowToWellAssignment(result.rows[0]);
  }

  async getWellAssignmentsByPlateId(
    plateLayoutId: string,
  ): Promise<WellAssignment[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<WellAssignmentRow>(
      `
      SELECT * FROM well_assignments 
      WHERE plate_layout_id = $1 
      ORDER BY well_position ASC
    `,
      [plateLayoutId],
    );

    return result.rows.map((row) =>
      this.mapWellAssignmentRowToWellAssignment(row)
    );
  }

  async updateWellAssignmentStatus(
    id: string,
    status: "pending" | "loaded" | "sequenced" | "failed",
  ): Promise<WellAssignment> {
    using client = await this.pool.connect();

    const result = await client.queryObject<WellAssignmentRow>(
      `
      UPDATE well_assignments 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
      [status, id],
    );

    if (result.rows.length === 0) {
      throw new Error("Well assignment not found");
    }

    return this.mapWellAssignmentRowToWellAssignment(result.rows[0]);
  }

  async deleteWellAssignment(id: string): Promise<boolean> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `
      DELETE FROM well_assignments WHERE id = $1
    `,
      [id],
    );

    return (result.rowCount || 0) > 0;
  }

  // ============================================================================
  // Barcode methods
  // ============================================================================

  private mapBarcodeKitRowToBarcodeKit(row: BarcodeKitRow): BarcodeKit {
    return {
      id: row.id,
      name: row.name,
      manufacturer: row.manufacturer,
      platform: row.platform,
      indexType: row.index_type,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapBarcodeSequenceRowToBarcodeSequence(
    row: BarcodeSequenceRow,
  ): BarcodeSequence {
    return {
      id: row.id,
      kitId: row.kit_id,
      indexName: row.index_name,
      sequence: row.sequence,
      position: row.position,
      createdAt: row.created_at,
    };
  }

  private mapBarcodeAssignmentRowToBarcodeAssignment(
    row: BarcodeAssignmentRow,
  ): BarcodeAssignment {
    return {
      id: row.id,
      sampleId: row.sample_id,
      kitId: row.kit_id,
      i7IndexId: row.i7_index_id,
      i5IndexId: row.i5_index_id,
      assignedBy: row.assigned_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async getBarcodeKits(): Promise<BarcodeKit[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<BarcodeKitRow>(
      `SELECT * FROM barcode_kits ORDER BY name ASC`,
    );

    return result.rows.map((row) => this.mapBarcodeKitRowToBarcodeKit(row));
  }

  async getBarcodeKitById(id: string): Promise<BarcodeKit | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<BarcodeKitRow>(
      `SELECT * FROM barcode_kits WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) return null;
    return this.mapBarcodeKitRowToBarcodeKit(result.rows[0]);
  }

  async getBarcodeSequencesByKitId(kitId: string): Promise<BarcodeSequence[]> {
    using client = await this.pool.connect();

    const result = await client.queryObject<BarcodeSequenceRow>(
      `SELECT * FROM barcode_sequences WHERE kit_id = $1 ORDER BY position ASC`,
      [kitId],
    );

    return result.rows.map((row) =>
      this.mapBarcodeSequenceRowToBarcodeSequence(row)
    );
  }

  async createBarcodeAssignment(data: {
    sampleId: string;
    kitId: string;
    i7IndexId?: string;
    i5IndexId?: string;
    assignedBy: string;
  }): Promise<BarcodeAssignment> {
    using client = await this.pool.connect();

    const result = await client.queryObject<BarcodeAssignmentRow>(
      `
      INSERT INTO barcode_assignments 
        (sample_id, kit_id, i7_index_id, i5_index_id, assigned_by)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
      [
        data.sampleId,
        data.kitId,
        data.i7IndexId ?? null,
        data.i5IndexId ?? null,
        data.assignedBy,
      ],
    );

    return this.mapBarcodeAssignmentRowToBarcodeAssignment(result.rows[0]);
  }

  async getBarcodeAssignmentBySampleId(
    sampleId: string,
  ): Promise<BarcodeAssignment | null> {
    using client = await this.pool.connect();

    const result = await client.queryObject<BarcodeAssignmentRow>(
      `SELECT * FROM barcode_assignments WHERE sample_id = $1`,
      [sampleId],
    );

    if (result.rows.length === 0) return null;
    return this.mapBarcodeAssignmentRowToBarcodeAssignment(result.rows[0]);
  }

  async deleteBarcodeAssignment(id: string): Promise<boolean> {
    using client = await this.pool.connect();

    const result = await client.queryObject(
      `DELETE FROM barcode_assignments WHERE id = $1`,
      [id],
    );

    return (result.rowCount || 0) > 0;
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
    // If sessions table doesn't exist, provide clear guidance
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
        "⚠️ Database tables not found. Please run database migration:",
      );
      console.warn("   deno task db:migrate");
    } else {
      // Unknown error — rethrow so it surfaces during initialization
      console.error("Failed to initialize database:", err);
      throw err;
    }
  }
}
