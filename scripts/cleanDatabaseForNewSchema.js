/**
 * Clean Database Script - Reset for New TieuChiCauHinh Schema
 *
 * Purpose: Drop old KPI data and reset cycles for fresh start
 *
 * ⚠️ WARNING: This will DELETE all evaluation data!
 * Only run in DEV environment.
 *
 * Usage: node scripts/cleanDatabaseForNewSchema.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

async function cleanDatabase() {
  try {
    console.log("=".repeat(60));
    console.log("🧹 DATABASE CLEANUP FOR NEW SCHEMA");
    console.log("=".repeat(60));
    console.log("");
    console.log("⚠️  WARNING: This will DELETE all evaluation data!");
    console.log("   Only proceed if you're in DEV environment.\n");

    // Connect to MongoDB
    const MONGODB_URI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/giaobanbv";
    console.log(
      `📡 Connecting to: ${MONGODB_URI.replace(/\/\/.*:.*@/, "//***:***@")}\n`
    );

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;

    // Step 1: Drop KPI evaluation data
    console.log("📦 Step 1: Dropping old evaluation collections...\n");

    const collectionsToDrop = [
      "danhgiakpis",
      "danhgianhiemvuthuongquys",
      "tieuchidanhgias",
      "chukydanhgias",
    ];

    for (const collName of collectionsToDrop) {
      try {
        await db.collection(collName).drop();
        console.log(`   ✅ Dropped: ${collName}`);
      } catch (e) {
        if (e.codeName === "NamespaceNotFound") {
          console.log(`   ⏭️  Not found (skip): ${collName}`);
        } else {
          console.log(`   ⚠️  Error dropping ${collName}:`, e.message);
        }
      }
    }

    console.log("\n");

    // Step 2: Verify what's left
    console.log("📊 Step 2: Verifying remaining collections...\n");

    const collections = await db.listCollections().toArray();
    const preservedCollections = [
      "nhanviens",
      "nhiemvuthuongquys",
      "khoas",
      "users",
      "datafixes",
    ];

    preservedCollections.forEach((name) => {
      const exists = collections.find((c) => c.name === name);
      if (exists) {
        console.log(`   ✅ Preserved: ${name}`);
      } else {
        console.log(`   ⚠️  NOT FOUND: ${name}`);
      }
    });

    console.log("\n");

    // Summary
    console.log("=".repeat(60));
    console.log("🎉 DATABASE CLEANUP COMPLETED!");
    console.log("=".repeat(60));
    console.log("\n📝 NEXT STEPS:\n");
    console.log("   1. Start backend: npm start");
    console.log("   2. Tạo chu kỳ đánh giá mới với TieuChiCauHinh");
    console.log("   3. Config tiêu chí cho chu kỳ");
    console.log("   4. Tạo KPI cho nhân viên");
    console.log("   5. Chấm điểm và test workflow\n");

    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Cleanup failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run cleanup
console.log("\n⏳ Starting in 3 seconds... (Press Ctrl+C to cancel)\n");

setTimeout(() => {
  cleanDatabase();
}, 3000);
