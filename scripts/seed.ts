#!/usr/bin/env -S deno run -A

/**
 * Database seeding script
 * Populates the database with initial test data including:
 * - Test users with different roles
 * - Sample sequencing requests
 * - Sample data with QC status
 */
import "@std/dotenv/load";
import { getDatabase, initializeDatabase } from "../lib/db.ts";
import { getAuth } from "../lib/auth.ts";
import { createDatabasePool } from "../lib/db.ts";

const seedUsers = [
  {
    email: "admin@sams.ai",
    password: "Admin123!@#",
    name: "管理员",
    role: "admin" as const,
  },
  {
    email: "manager@sams.ai",
    password: "Manager123!@#",
    name: "Lab Manager",
    role: "lab_manager" as const,
  },
  {
    email: "researcher@sams.ai",
    password: "Research123!@#",
    name: "科研人员",
    role: "researcher" as const,
  },
  {
    email: "technician@sams.ai",
    password: "Tech123!@#",
    name: "实验技术员",
    role: "technician" as const,
  },
];

async function seed() {
  console.log("🌱 Starting database seeding...\n");

  try {
    // Initialize database connection
    await initializeDatabase();
    const auth = getAuth();
    const db = getDatabase();

    console.log("📊 Checking existing users...");

    // Check if users already exist
    const existingUser = await db.getUserByEmail(seedUsers[0].email);
    if (existingUser) {
      console.log("⚠️  Database already seeded. Skipping...");
      console.log("\nTo re-seed, run: deno task db:reset && deno task db:seed");
      Deno.exit(0);
    }

    // Create seed users
    console.log("\n👥 Creating seed users...");
    const createdUsers: Record<string, string> = {}; // email -> userId mapping
    
    for (const userData of seedUsers) {
      try {
        const user = await auth.createUser(userData);
        createdUsers[userData.email] = user.id;
        console.log(`  ✅ Created user: ${user.email} (${user.name}) [${user.role}]`);
      } catch (error) {
        console.error(`  ❌ Failed to create user ${userData.email}:`, error);
      }
    }

    // Create sample sequencing requests
    console.log("\n📋 Creating sample sequencing requests...");
    
    const databaseUrl = Deno.env.get("DATABASE_URL");
    if (!databaseUrl) {
      throw new Error("DATABASE_URL not found");
    }

    const pool = createDatabasePool(databaseUrl, 2);
    
    try {
      using client = await pool.connect();

      // Request 1: WGS project by researcher (pending)
      const req1Result = await client.queryObject<{ id: string }>(`
        INSERT INTO sequencing_requests 
          (user_id, project_name, sequencing_type, status, priority, estimated_cost, notes)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        createdUsers["researcher@sams.ai"],
        "人类基因组重测序项目",
        "WGS",
        "pending",
        "high",
        5000.00,
        "需要高深度测序，覆盖度要求30X以上"
      ]);
      const req1Id = req1Result.rows[0].id;
      console.log(`  ✅ Created request: 人类基因组重测序项目 (WGS, pending)`);

      // Add samples for request 1
      await client.queryObject(`
        INSERT INTO samples 
          (request_id, name, type, concentration, volume, qc_status, storage_location, notes)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8),
          ($1, $9, $10, $11, $12, $13, $14, $15)
      `, [
        req1Id, "Sample-001", "DNA", 50.5, 200.0, "passed", "冰箱A-01", "DNA质量良好",
        "Sample-002", "DNA", 45.2, 180.0, "passed", "冰箱A-02", "DNA质量良好"
      ]);
      console.log(`     ├─ Added 2 samples`);

      // Request 2: RNA-seq project by researcher (approved)
      const req2Result = await client.queryObject<{ id: string }>(`
        INSERT INTO sequencing_requests 
          (user_id, project_name, sequencing_type, status, priority, estimated_cost, notes)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `, [
        createdUsers["researcher@sams.ai"],
        "肿瘤转录组测序",
        "RNA-seq",
        "approved",
        "urgent",
        3500.00,
        "肿瘤样本，需要尽快处理"
      ]);
      const req2Id = req2Result.rows[0].id;
      console.log(`  ✅ Created request: 肿瘤转录组测序 (RNA-seq, approved)`);

      // Add samples for request 2
      await client.queryObject(`
        INSERT INTO samples 
          (request_id, name, type, concentration, volume, qc_status, storage_location, notes)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8),
          ($1, $9, $10, $11, $12, $13, $14, $15),
          ($1, $16, $17, $18, $19, $20, $21, $22)
      `, [
        req2Id, "RNA-T001", "RNA", 120.0, 100.0, "passed", "冰箱B-01", "肿瘤组织RNA",
        "RNA-N001", "RNA", 115.5, 100.0, "passed", "冰箱B-02", "正常组织RNA",
        "RNA-T002", "RNA", 85.3, 90.0, "retest", "冰箱B-03", "需要重新质检"
      ]);
      console.log(`     ├─ Added 3 samples`);

      // Request 3: Amplicon project (in_progress)
      const req3Result = await client.queryObject<{ id: string }>(`
        INSERT INTO sequencing_requests 
          (user_id, project_name, sequencing_type, status, priority, estimated_cost, actual_cost, notes)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `, [
        createdUsers["researcher@sams.ai"],
        "16S rRNA微生物多样性",
        "amplicon",
        "in_progress",
        "normal",
        1200.00,
        1150.00,
        "肠道微生物群落分析"
      ]);
      const req3Id = req3Result.rows[0].id;
      console.log(`  ✅ Created request: 16S rRNA微生物多样性 (amplicon, in_progress)`);

      // Add samples for request 3
      await client.queryObject(`
        INSERT INTO samples 
          (request_id, name, type, barcode, concentration, volume, qc_status, storage_location)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8),
          ($1, $9, $10, $11, $12, $13, $14, $15),
          ($1, $16, $17, $18, $19, $20, $21, $22),
          ($1, $23, $24, $25, $26, $27, $28, $29)
      `, [
        req3Id, "Gut-001", "DNA", "BC001", 25.0, 50.0, "passed", "冰箱C-01",
        "Gut-002", "DNA", "BC002", 28.5, 50.0, "passed", "冰箱C-02",
        "Gut-003", "DNA", "BC003", 22.3, 50.0, "passed", "冰箱C-03",
        "Gut-004", "DNA", "BC004", 30.1, 50.0, "passed", "冰箱C-04"
      ]);
      console.log(`     ├─ Added 4 samples`);

      // Add status history for approved and in_progress requests
      await client.queryObject(`
        INSERT INTO request_status_history 
          (request_id, old_status, new_status, changed_by, comment)
        VALUES 
          ($1, $2, $3, $4, $5),
          ($6, $7, $8, $9, $10),
          ($11, $12, $13, $14, $15)
      `, [
        req2Id, "pending", "approved", createdUsers["manager@sams.ai"], "样本质量符合要求，批准测序",
        req3Id, "pending", "approved", createdUsers["manager@sams.ai"], "批准测序",
        req3Id, "approved", "in_progress", createdUsers["technician@sams.ai"], "样本已上机测序"
      ]);
      console.log(`     ├─ Added status change history`);

    } finally {
      await pool.end();
    }

    console.log("\n✨ Database seeding completed successfully!");
    console.log("\n📝 Test accounts:");
    console.log("   Admin:       admin@sams.ai / Admin123!@# (admin)");
    console.log("   Manager:     manager@sams.ai / Manager123!@# (lab_manager)");
    console.log("   Researcher:  researcher@sams.ai / Research123!@# (researcher)");
    console.log("   Technician:  technician@sams.ai / Tech123!@# (technician)");
    console.log("\n📊 Sample data:");
    console.log("   - 3 sequencing requests (pending, approved, in_progress)");
    console.log("   - 9 samples with various QC statuses");
    console.log("   - 3 status history records");
    console.log("\n🚀 You can now start the application: deno task dev");
  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    Deno.exit(1);
  }

  Deno.exit(0);
}

// Run the seed function
if (import.meta.main) {
  await seed();
}
