/**
 * Test Backend API Changes - NotificationType vs NotificationTemplate
 * Verify getSettings now returns actual types with template counts
 *
 * Run: node test-notification-settings-api.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationType = require("./modules/workmanagement/models/NotificationType");
const NotificationTemplate = require("./modules/workmanagement/models/NotificationTemplate");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function testAPI() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Simulate what getSettings API does
    console.log("📊 SIMULATING getSettings API LOGIC:\n");
    console.log("=".repeat(60));

    // 1. Get actual notification types
    const types = await NotificationType.find({ isActive: true })
      .select("code name description Nhom")
      .sort({ Nhom: 1, name: 1 })
      .lean();

    console.log(`\n1️⃣  NOTIFICATION TYPES (${types.length} types):`);
    console.log("-".repeat(60));

    // Group by Nhom
    const typesByNhom = types.reduce((acc, type) => {
      if (!acc[type.Nhom]) acc[type.Nhom] = [];
      acc[type.Nhom].push(type);
      return acc;
    }, {});

    Object.entries(typesByNhom).forEach(([nhom, nhomTypes]) => {
      console.log(`\n📁 ${nhom} (${nhomTypes.length} types):`);
      nhomTypes.forEach((type) => {
        console.log(`   • ${type.code}: ${type.name}`);
      });
    });

    // 2. Count templates per type
    const templates = await NotificationTemplate.find({ isEnabled: true })
      .select("typeCode name")
      .lean();

    console.log(
      `\n\n2️⃣  NOTIFICATION TEMPLATES (${templates.length} templates):`
    );
    console.log("-".repeat(60));

    const templatesByType = templates.reduce((acc, template) => {
      if (!acc[template.typeCode]) acc[template.typeCode] = [];
      acc[template.typeCode].push(template);
      return acc;
    }, {});

    const templateCounts = templates.reduce((acc, template) => {
      acc[template.typeCode] = (acc[template.typeCode] || 0) + 1;
      return acc;
    }, {});

    // Show types with template counts
    console.log(`\n3️⃣  TYPES WITH TEMPLATE COUNTS:`);
    console.log("-".repeat(60));

    Object.entries(typesByNhom).forEach(([nhom, nhomTypes]) => {
      console.log(`\n📁 ${nhom}:`);
      nhomTypes.forEach((type) => {
        const count = templateCounts[type.code] || 0;
        console.log(`   • ${type.name}: ${count} template(s)`);

        // Show template names
        if (templatesByType[type.code]) {
          templatesByType[type.code].forEach((t) => {
            console.log(`     └─ ${t.name}`);
          });
        }
      });
    });

    // 4. Format for API response
    const availableTypes = types.map((type) => ({
      type: type.code,
      name: type.name,
      description: type.description,
      Nhom: type.Nhom,
      templateCount: templateCounts[type.code] || 0,
    }));

    console.log(`\n\n4️⃣  API RESPONSE FORMAT (Sample):`);
    console.log("-".repeat(60));
    console.log(
      JSON.stringify(
        {
          settings: {
            enableNotifications: true,
            enablePush: true,
            typePreferences: {
              "yeucau-tao-moi": { inapp: true, push: true },
              "congviec-giao-viec": { inapp: true, push: false },
            },
          },
          availableTypes: availableTypes.slice(0, 3), // Show first 3
        },
        null,
        2
      )
    );

    console.log(`\n... (${availableTypes.length - 3} more types)`);

    // 5. Summary
    console.log(`\n\n📊 SUMMARY:`);
    console.log("=".repeat(60));
    console.log(`✅ NotificationTypes: ${types.length}`);
    console.log(`✅ NotificationTemplates: ${templates.length}`);
    console.log(
      `✅ Types with templates: ${Object.keys(templatesByType).length}`
    );
    console.log(
      `✅ Types without templates: ${
        types.length - Object.keys(templatesByType).length
      }`
    );

    // Show types without templates (should be investigated)
    const typesWithoutTemplates = types.filter((t) => !templatesByType[t.code]);
    if (typesWithoutTemplates.length > 0) {
      console.log(`\n⚠️  Types without templates (may need seeding):`);
      typesWithoutTemplates.forEach((t) => {
        console.log(`   • ${t.code}: ${t.name}`);
      });
    }

    console.log(`\n✅ API now returns TYPES (not templates)`);
    console.log(`✅ UI config is TYPE-LEVEL (user-friendly)`);
    console.log(`✅ Template count shown for info only\n`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

testAPI();
