/**
 * Clean Up Old Templates
 *
 * Xóa các templates cũ không khớp với NotificationType codes mới
 * Giữ lại các templates từ notificationTemplates.seed.js
 *
 * Run: node seeds/cleanup-old-templates.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationTemplate = require("../modules/workmanagement/models/NotificationTemplate");
const NotificationType = require("../modules/workmanagement/models/NotificationType");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function cleanupOldTemplates() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all valid type codes
    const types = await NotificationType.find().select("code").lean();
    const validCodes = new Set(types.map((t) => t.code));

    console.log(`📋 Found ${validCodes.size} valid type codes\n`);

    // Find templates with invalid typeCode
    const allTemplates = await NotificationTemplate.find();

    let deleted = 0;
    let kept = 0;

    for (const template of allTemplates) {
      if (!validCodes.has(template.typeCode)) {
        console.log(
          `🗑️  DELETE: ${template.name} (typeCode: ${template.typeCode})`
        );
        await NotificationTemplate.deleteOne({ _id: template._id });
        deleted++;
      } else {
        kept++;
      }
    }

    console.log(`\n✅ Cleanup Complete:`);
    console.log(`   Deleted: ${deleted} old templates`);
    console.log(`   Kept: ${kept} valid templates`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

cleanupOldTemplates();
