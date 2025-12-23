/**
 * Script xóa các NotificationTypes cũ với type codes sai
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationType = require("../modules/workmanagement/models/NotificationType");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

const OLD_TYPE_CODES = [
  "congviec-comment",
  "congviec-them-nguoi-tham-gia",
  "congviec-deadline-sap-den",
  "congviec-deadline-qua-han",
  "yeucau-comment",
];

async function cleanupOldTypes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("🗑️  Deleting old NotificationTypes with incorrect codes...\n");

    for (const code of OLD_TYPE_CODES) {
      const result = await NotificationType.deleteMany({ code });
      console.log(`   ❌ Deleted ${result.deletedCount} types: ${code}`);
    }

    // Verify final count
    const finalCount = await NotificationType.countDocuments();
    console.log(`\n✅ Cleanup Complete!`);
    console.log(`   Total types remaining: ${finalCount}`);

    // List all unique type codes
    const allTypes = await NotificationType.find({}, "code name").sort({
      code: 1,
    });
    console.log(`\n📋 All notification types (${allTypes.length}):`);
    allTypes.forEach((type) => {
      console.log(`   - ${type.code}: ${type.name}`);
    });
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

cleanupOldTypes();
