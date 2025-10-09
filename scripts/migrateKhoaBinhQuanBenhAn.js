/**
 * Script migration: Thêm field LoaiKhoa vào KhoaBinhQuanBenhAn
 *
 * Chạy script này để cập nhật dữ liệu cũ trong database
 *
 * Usage:
 * cd giaobanbv-be
 * node scripts/migrateKhoaBinhQuanBenhAn.js
 */

const mongoose = require("mongoose");
const DaTaFix = require("../models/DaTaFix");

// MongoDB connection string
const mongoURI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaobanbv";

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Find the datafix document
    const datafix = await DaTaFix.findOne();

    if (!datafix) {
      console.log("⚠️  No datafix document found. Creating new one...");
      const newDatafix = new DaTaFix({
        KhoaBinhQuanBenhAn: [],
      });
      await newDatafix.save();
      console.log("✅ Created new datafix document");
      return;
    }

    // Check if migration is needed
    if (
      !datafix.KhoaBinhQuanBenhAn ||
      datafix.KhoaBinhQuanBenhAn.length === 0
    ) {
      console.log("ℹ️  KhoaBinhQuanBenhAn is empty. No migration needed.");
      return;
    }

    // Count records needing migration
    const needsMigration = datafix.KhoaBinhQuanBenhAn.filter(
      (khoa) => !khoa.LoaiKhoa || khoa.LoaiKhoa === ""
    );

    if (needsMigration.length === 0) {
      console.log("✅ All records already have LoaiKhoa. No migration needed.");
      return;
    }

    console.log(`🔄 Migrating ${needsMigration.length} records...`);

    // Update records with default LoaiKhoa
    datafix.KhoaBinhQuanBenhAn = datafix.KhoaBinhQuanBenhAn.map((khoa) => {
      if (!khoa.LoaiKhoa || khoa.LoaiKhoa === "") {
        console.log(
          `   - Updating "${khoa.TenKhoa}" (ID: ${khoa.KhoaID}) → LoaiKhoa: "noitru"`
        );
        return {
          ...khoa,
          LoaiKhoa: "noitru", // Default to nội trú
        };
      }
      return khoa;
    });

    // Save updated datafix
    await datafix.save();

    console.log(`✅ Migration completed successfully!`);
    console.log(`   Total records: ${datafix.KhoaBinhQuanBenhAn.length}`);
    console.log(`   Updated records: ${needsMigration.length}`);
  } catch (error) {
    console.error("❌ Migration failed:", error);
    throw error;
  } finally {
    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run migration
migrate()
  .then(() => {
    console.log("\n✨ Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  });
