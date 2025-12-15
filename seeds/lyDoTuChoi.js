/**
 * Seed Script: LyDoTuChoi (Lý do từ chối yêu cầu)
 * Chạy: node seeds/lyDoTuChoi.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const LyDoTuChoi = require("../modules/workmanagement/models/LyDoTuChoi");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function seed() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("🌱 Seeding LyDoTuChoi...");
    await LyDoTuChoi.seedDefault();

    // Verify
    const count = await LyDoTuChoi.countDocuments();
    console.log(`📊 Total LyDoTuChoi records: ${count}`);

    const records = await LyDoTuChoi.find().sort({ ThuTu: 1 });
    console.log("\n📋 Current LyDoTuChoi data:");
    records.forEach((r, i) => {
      console.log(
        `   ${i + 1}. ${r.TenLyDo} (ThuTu: ${r.ThuTu}, TrangThai: ${
          r.TrangThai
        })`
      );
    });

    console.log("\n✅ Seed completed successfully!");
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB");
  }
}

// Run if called directly
if (require.main === module) {
  seed();
}

module.exports = seed;
