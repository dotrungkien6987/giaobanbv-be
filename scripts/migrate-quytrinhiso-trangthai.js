/**
 * Migration: QuyTrinhISO — TrangThai lifecycle refactor
 *
 * Changes:
 *   - Old schema: TrangThai enum ["ACTIVE", "DELETED"]
 *   - New schema: IsDeleted Boolean + TrangThai enum ["DRAFT", "ACTIVE", "INACTIVE"]
 *
 * This script:
 *   1. Adds IsDeleted = false for docs with old TrangThai: "ACTIVE"
 *   2. Adds IsDeleted = true for docs with old TrangThai: "DELETED"
 *   3. Sets TrangThai = "ACTIVE" for all existing docs (preserving active status)
 *
 * Run: node scripts/migrate-quytrinhiso-trangthai.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/giaobanbv";

async function runMigration() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected.");

  const db = mongoose.connection.db;
  const col = db.collection("quytrinhiso");

  // Count existing documents
  const total = await col.countDocuments();
  const activeCount = await col.countDocuments({ TrangThai: "ACTIVE" });
  const deletedCount = await col.countDocuments({ TrangThai: "DELETED" });
  const unknownCount = total - activeCount - deletedCount;

  console.log(`\nPre-migration counts:`);
  console.log(`  Total:   ${total}`);
  console.log(`  ACTIVE:  ${activeCount}`);
  console.log(`  DELETED: ${deletedCount}`);
  console.log(`  Other:   ${unknownCount}\n`);

  // Step 1: Old ACTIVE → IsDeleted=false, TrangThai="ACTIVE"
  const r1 = await col.updateMany(
    { TrangThai: "ACTIVE" },
    { $set: { IsDeleted: false } },
    // TrangThai stays "ACTIVE" — value is still valid in new enum
  );
  console.log(
    `Step 1 — old ACTIVE docs: ${r1.modifiedCount} docs set IsDeleted=false`,
  );

  // Step 2: Old DELETED → IsDeleted=true, TrangThai="INACTIVE"
  // (They were soft-deleted, so mark as INACTIVE in the new lifecycle)
  const r2 = await col.updateMany(
    { TrangThai: "DELETED" },
    { $set: { IsDeleted: true, TrangThai: "INACTIVE" } },
  );
  console.log(
    `Step 2 — old DELETED docs: ${r2.modifiedCount} docs set IsDeleted=true + TrangThai=INACTIVE`,
  );

  // Step 3: Ensure all docs without IsDeleted field get it set
  const r3 = await col.updateMany(
    { IsDeleted: { $exists: false } },
    { $set: { IsDeleted: false } },
  );
  console.log(
    `Step 3 — docs missing IsDeleted: ${r3.modifiedCount} docs patched`,
  );

  // Post-migration verification
  const post_total = await col.countDocuments();
  const post_noIsDeleted = await col.countDocuments({
    IsDeleted: { $exists: false },
  });
  const post_invalidTrangThai = await col.countDocuments({
    TrangThai: { $nin: ["DRAFT", "ACTIVE", "INACTIVE"] },
  });

  console.log(`\nPost-migration verification:`);
  console.log(`  Total docs:             ${post_total}`);
  console.log(`  Missing IsDeleted:      ${post_noIsDeleted} (should be 0)`);
  console.log(
    `  Invalid TrangThai:      ${post_invalidTrangThai} (should be 0)`,
  );

  if (post_noIsDeleted === 0 && post_invalidTrangThai === 0) {
    console.log("\n✓ Migration completed successfully.");
  } else {
    console.log("\n✗ Migration completed with issues. Please review the data.");
    process.exit(1);
  }

  await mongoose.disconnect();
  console.log("Disconnected.");
}

runMigration().catch((err) => {
  console.error("Migration failed:", err);
  mongoose.disconnect();
  process.exit(1);
});
