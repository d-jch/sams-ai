#!/usr/bin/env -S deno run --allow-net --allow-env --allow-read
/**
 * Migration: Add core business tables
 *
 * This migration adds:
 * - role column to users table
 * - sequencing_requests table
 * - samples table
 * - request_status_history table
 *
 * Run with: deno task db:migrate:core
 */

import "@std/dotenv/load";
import { Pool } from "@db/postgres";
import { createDatabasePool } from "../../lib/db.ts";

async function migrateUp() {
  console.log("📦 SAMS Core Tables Migration - UP");
  console.log("━".repeat(60));

  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    Deno.exit(1);
  }

  const pool: Pool = createDatabasePool(databaseUrl, 1);

  try {
    const client = await pool.connect();

    console.log("\n1️⃣  Creating ENUM types...");

    // Create user_role ENUM
    await client.queryObject(`
      DO $$ BEGIN
        CREATE TYPE user_role AS ENUM ('researcher', 'technician', 'lab_manager', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("  ✅ user_role ENUM created");

    // Create sequencing_type ENUM
    await client.queryObject(`
      DO $$ BEGIN
        CREATE TYPE sequencing_type AS ENUM ('WGS', 'WES', 'RNA-seq', 'amplicon', 'ChIP-seq');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("  ✅ sequencing_type ENUM created");

    // Create request_status ENUM
    await client.queryObject(`
      DO $$ BEGIN
        CREATE TYPE request_status AS ENUM ('pending', 'approved', 'in_progress', 'completed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("  ✅ request_status ENUM created");

    // Create priority_level ENUM
    await client.queryObject(`
      DO $$ BEGIN
        CREATE TYPE priority_level AS ENUM ('low', 'normal', 'high', 'urgent');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("  ✅ priority_level ENUM created");

    // Create sample_type ENUM
    await client.queryObject(`
      DO $$ BEGIN
        CREATE TYPE sample_type AS ENUM ('DNA', 'RNA', 'Protein', 'Cell');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("  ✅ sample_type ENUM created");

    // Create qc_status ENUM
    await client.queryObject(`
      DO $$ BEGIN
        CREATE TYPE qc_status AS ENUM ('pending', 'passed', 'failed', 'retest');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
    console.log("  ✅ qc_status ENUM created");

    console.log("\n2️⃣  Adding role column to users table...");

    // Check if role column exists
    const roleCheckResult = await client.queryObject<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
      ) as exists;
    `);

    if (!roleCheckResult.rows[0].exists) {
      await client.queryObject(`
        ALTER TABLE users 
        ADD COLUMN role user_role NOT NULL DEFAULT 'researcher';
      `);
      console.log("  ✅ role column added to users table");

      // Create index on role
      await client.queryObject(`
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
      `);
      console.log("  ✅ Index created on users.role");
    } else {
      console.log("  ⏭️  role column already exists");
    }

    console.log("\n3️⃣  Creating sequencing_requests table...");
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS sequencing_requests (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_name VARCHAR(200) NOT NULL,
        sequencing_type sequencing_type NOT NULL,
        status request_status NOT NULL DEFAULT 'pending',
        priority priority_level NOT NULL DEFAULT 'normal',
        estimated_cost DECIMAL(10,2),
        actual_cost DECIMAL(10,2),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("  ✅ sequencing_requests table created");

    // Create indexes
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_requests_user_id ON sequencing_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_requests_status ON sequencing_requests(status);
      CREATE INDEX IF NOT EXISTS idx_requests_created_at ON sequencing_requests(created_at);
      CREATE INDEX IF NOT EXISTS idx_requests_user_status ON sequencing_requests(user_id, status);
      CREATE INDEX IF NOT EXISTS idx_requests_date_range ON sequencing_requests(created_at, status);
    `);
    console.log("  ✅ Indexes created for sequencing_requests");

    console.log("\n4️⃣  Creating samples table...");
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS samples (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        request_id TEXT NOT NULL REFERENCES sequencing_requests(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        type sample_type NOT NULL,
        barcode VARCHAR(50) UNIQUE,
        concentration DECIMAL(8,2),
        volume DECIMAL(8,2),
        qc_status qc_status NOT NULL DEFAULT 'pending',
        storage_location VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("  ✅ samples table created");

    // Create indexes
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_samples_request_id ON samples(request_id);
      CREATE INDEX IF NOT EXISTS idx_samples_barcode ON samples(barcode);
      CREATE INDEX IF NOT EXISTS idx_samples_qc_status ON samples(qc_status);
      CREATE INDEX IF NOT EXISTS idx_samples_request_qc ON samples(request_id, qc_status);
    `);
    console.log("  ✅ Indexes created for samples");

    console.log("\n5️⃣  Creating request_status_history table...");
    await client.queryObject(`
      CREATE TABLE IF NOT EXISTS request_status_history (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        request_id TEXT NOT NULL REFERENCES sequencing_requests(id) ON DELETE CASCADE,
        old_status request_status,
        new_status request_status NOT NULL,
        changed_by TEXT NOT NULL REFERENCES users(id),
        comment TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    console.log("  ✅ request_status_history table created");

    // Create indexes
    await client.queryObject(`
      CREATE INDEX IF NOT EXISTS idx_status_history_request_id ON request_status_history(request_id);
      CREATE INDEX IF NOT EXISTS idx_status_history_created_at ON request_status_history(created_at);
    `);
    console.log("  ✅ Indexes created for request_status_history");

    console.log("\n6️⃣  Creating triggers for updated_at columns...");

    // Trigger for sequencing_requests
    await client.queryObject(`
      CREATE OR REPLACE TRIGGER update_requests_updated_at 
        BEFORE UPDATE ON sequencing_requests 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log("  ✅ Trigger created for sequencing_requests.updated_at");

    // Trigger for samples
    await client.queryObject(`
      CREATE OR REPLACE TRIGGER update_samples_updated_at 
        BEFORE UPDATE ON samples 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    `);
    console.log("  ✅ Trigger created for samples.updated_at");

    console.log("\n✅ Migration completed successfully!");
    console.log("━".repeat(60));

    client.release();
    await pool.end();
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    try {
      await pool.end();
    } catch (_) {
      // Ignore cleanup errors
    }
    Deno.exit(1);
  }
}

async function migrateDown() {
  console.log("📦 SAMS Core Tables Migration - DOWN (Rollback)");
  console.log("━".repeat(60));

  const databaseUrl = Deno.env.get("DATABASE_URL");
  if (!databaseUrl) {
    console.error("❌ DATABASE_URL environment variable is required");
    Deno.exit(1);
  }

  const pool: Pool = createDatabasePool(databaseUrl, 1);

  try {
    const client = await pool.connect();

    console.log("\n⚠️  WARNING: This will drop core business tables!");
    console.log(
      "   All sequencing requests, samples, and history will be lost.",
    );

    console.log("\n1️⃣  Dropping tables...");

    await client.queryObject(
      "DROP TABLE IF EXISTS request_status_history CASCADE;",
    );
    console.log("  ✅ Dropped request_status_history");

    await client.queryObject("DROP TABLE IF EXISTS samples CASCADE;");
    console.log("  ✅ Dropped samples");

    await client.queryObject(
      "DROP TABLE IF EXISTS sequencing_requests CASCADE;",
    );
    console.log("  ✅ Dropped sequencing_requests");

    console.log("\n2️⃣  Removing role column from users...");
    await client.queryObject("ALTER TABLE users DROP COLUMN IF EXISTS role;");
    console.log("  ✅ Removed role column");

    console.log("\n3️⃣  Dropping ENUM types...");
    await client.queryObject("DROP TYPE IF EXISTS qc_status CASCADE;");
    await client.queryObject("DROP TYPE IF EXISTS sample_type CASCADE;");
    await client.queryObject("DROP TYPE IF EXISTS priority_level CASCADE;");
    await client.queryObject("DROP TYPE IF EXISTS request_status CASCADE;");
    await client.queryObject("DROP TYPE IF EXISTS sequencing_type CASCADE;");
    await client.queryObject("DROP TYPE IF EXISTS user_role CASCADE;");
    console.log("  ✅ Dropped all ENUM types");

    console.log("\n✅ Rollback completed successfully!");
    console.log("━".repeat(60));

    client.release();
    await pool.end();
  } catch (error) {
    console.error("\n❌ Rollback failed:", error);
    try {
      await pool.end();
    } catch (_) {
      // Ignore cleanup errors
    }
    Deno.exit(1);
  }
}

// Main execution
if (import.meta.main) {
  const args = Deno.args;
  const command = args[0];

  if (command === "down" || command === "rollback") {
    await migrateDown();
  } else {
    await migrateUp();
  }
}
