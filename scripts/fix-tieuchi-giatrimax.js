/**
 * Migration Script: Fix GiaTriMax in TieuChiDanhGia collection
 *
 * Problem: Old records have GiaTriMax = 10 (wrong default)
 * Solution: Update all records with GiaTriMax = 10 to 100
 *
 * Run: node scripts/fix-tieuchi-giatrimax.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const TieuChiDanhGia = require("../modules/workmanagement/models/TieuChiDanhGia");

async function fixGiaTriMax() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all records with GiaTriMax = 10
    const wrongRecords = await TieuChiDanhGia.find({
      GiaTriMax: 10,
      isDeleted: false,
    });

    console.log(
      `\n📊 Found ${wrongRecords.length} records with GiaTriMax = 10`
    );

    if (wrongRecords.length === 0) {
      console.log("✅ No records to fix. All good!");
      process.exit(0);
    }

    // Display records
    console.log("\n🔍 Records to update:");
    wrongRecords.forEach((record, index) => {
      console.log(
        `  ${index + 1}. ${record.TenTieuChi} (${
          record.LoaiTieuChi
        }) - Current: ${record.GiaTriMin}-${record.GiaTriMax}${record.DonVi}`
      );
    });

    // Confirm before update
    const readline = require("readline").createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    readline.question(
      "\n⚠️  Update all to GiaTriMax = 100? (y/n): ",
      async (answer) => {
        if (answer.toLowerCase() !== "y") {
          console.log("❌ Update cancelled");
          process.exit(0);
        }

        // Update all records
        const result = await TieuChiDanhGia.updateMany(
          { GiaTriMax: 10, isDeleted: false },
          { $set: { GiaTriMax: 100 } }
        );

        console.log(`\n✅ Updated ${result.modifiedCount} records`);
        console.log("✅ Migration complete!");

        // Show updated records
        const updatedRecords = await TieuChiDanhGia.find({
          _id: { $in: wrongRecords.map((r) => r._id) },
        });

        console.log("\n✅ Updated records:");
        updatedRecords.forEach((record, index) => {
          console.log(
            `  ${index + 1}. ${record.TenTieuChi} - New: ${record.GiaTriMin}-${
              record.GiaTriMax
            }${record.DonVi}`
          );
        });

        mongoose.connection.close();
        process.exit(0);
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

fixGiaTriMax();
