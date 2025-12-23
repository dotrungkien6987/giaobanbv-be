/**
 * Fix Templates Missing typeCode
 *
 * Một số templates cũ có field `type` thay vì `typeCode`
 * Script này sẽ migrate field `type` → `typeCode`
 *
 * Run: node seeds/fix-template-typecode.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationTemplate = require("../modules/workmanagement/models/NotificationTemplate");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function fixTemplateTypeCode() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Find templates with undefined typeCode
    const brokenTemplates = await NotificationTemplate.find({
      typeCode: { $in: [null, undefined, ""] },
    });

    console.log(
      `Found ${brokenTemplates.length} templates with missing typeCode\n`
    );

    if (brokenTemplates.length === 0) {
      console.log("✅ All templates have valid typeCode!");
      return;
    }

    // Try to fix if they have `type` field (old schema)
    let fixed = 0;
    let deleted = 0;

    for (const template of brokenTemplates) {
      const doc = template.toObject();

      // Check if old `type` field exists
      if (doc.type && typeof doc.type === "string") {
        console.log(`🔧 Fixing: ${template.name}`);
        console.log(`   Old type: ${doc.type}`);

        // Convert UPPERCASE → kebab-case
        const typeCode = doc.type.toLowerCase().replace(/_/g, "-");

        console.log(`   New typeCode: ${typeCode}`);

        template.typeCode = typeCode;
        await template.save();
        fixed++;
      } else {
        // No way to fix - delete orphaned template
        console.log(`🗑️  Deleting orphaned: ${template.name} (no type field)`);
        await NotificationTemplate.deleteOne({ _id: template._id });
        deleted++;
      }
    }

    console.log(`\n✅ Fix Complete:`);
    console.log(`   Fixed: ${fixed}`);
    console.log(`   Deleted: ${deleted}`);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n👋 Disconnected from MongoDB");
  }
}

fixTemplateTypeCode();
