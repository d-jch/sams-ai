#!/usr/bin/env -S deno run -A

/**
 * Database seeding script
 * Populates the database with initial test data
 */
import "@std/dotenv/load";
import { getDatabase, initializeDatabase } from "../lib/db.ts";
import { getAuth } from "../lib/auth.ts";

const seedUsers = [
  {
    email: "admin@sams.ai",
    password: "Admin123!@#",
    name: "System Administrator",
  },
  {
    email: "researcher@sams.ai",
    password: "Research123!@#",
    name: "Lab Researcher",
  },
  {
    email: "technician@sams.ai",
    password: "Tech123!@#",
    name: "Lab Technician",
  },
  {
    email: "test@example.com",
    password: "Test123!@#",
    name: "Test User",
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
    for (const userData of seedUsers) {
      try {
        const user = await auth.createUser(userData);
        console.log(`  ✅ Created user: ${user.email} (${user.name})`);
      } catch (error) {
        console.error(`  ❌ Failed to create user ${userData.email}:`, error);
      }
    }

    console.log("\n✨ Database seeding completed successfully!");
    console.log("\n📝 Test accounts:");
    console.log("   Admin:       admin@sams.ai / Admin123!@#");
    console.log("   Researcher:  researcher@sams.ai / Research123!@#");
    console.log("   Technician:  technician@sams.ai / Tech123!@#");
    console.log("   Test User:   test@example.com / Test123!@#");
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
