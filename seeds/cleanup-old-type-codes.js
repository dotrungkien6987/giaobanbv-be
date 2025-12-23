/**
 * Script xóa các templates cũ với type codes sai
 * Chạy sau khi seed templates mới với type codes đã sửa
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationTemplate = require("../modules/workmanagement/models/NotificationTemplate");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

const OLD_TYPE_CODES = [
  "congviec-comment",
  "congviec-them-nguoi-tham-gia",
  "congviec-deadline-sap-den",
  "congviec-deadline-qua-han",
  "yeucau-comment",
];

async function cleanupOldTemplates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("🗑️  Deleting old templates with incorrect type codes...\n");

    for (const typeCode of OLD_TYPE_CODES) {
      const result = await NotificationTemplate.deleteMany({ typeCode });
      console.log(
        `   ❌ Deleted ${result.deletedCount} templates: ${typeCode}`
      );
    }

    // Verify final count
    const finalCount = await NotificationTemplate.countDocuments();
    console.log(`\n✅ Cleanup Complete!`);
    console.log(`   Total templates remaining: ${finalCount}`);

    // List all unique type codes
    const uniqueTypes = await NotificationTemplate.distinct("typeCode");
    console.log(`\n📋 Unique type codes (${uniqueTypes.length}):`);
    uniqueTypes.sort().forEach((type) => {
      console.log(`   - ${type}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

cleanupOldTemplates();
