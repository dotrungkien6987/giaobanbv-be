/**
 * Test E2E Notification Flow
 *
 * Test các scenario:
 * 1. Type + Template tồn tại trong DB
 * 2. NotificationService.send() hoạt động
 * 3. Recipient resolution đúng
 * 4. Template rendering đúng
 *
 * Run: node seeds/test-notification-flow.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationType = require("../modules/workmanagement/models/NotificationType");
const NotificationTemplate = require("../modules/workmanagement/models/NotificationTemplate");
const Notification = require("../modules/workmanagement/models/Notification");
const notificationService = require("../modules/workmanagement/services/notificationService");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function testNotificationFlow() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    console.log("\n" + "=".repeat(80));
    console.log("🧪 NOTIFICATION SYSTEM E2E TEST");
    console.log("=".repeat(80) + "\n");

    // Test 1: Check Types
    console.log("📋 Test 1: Verify Notification Types");
    console.log("-".repeat(80));
    const typeCount = await NotificationType.countDocuments();
    console.log(`✅ Total Types: ${typeCount}`);

    const sampleTypes = await NotificationType.find()
      .select("code name isActive")
      .limit(5)
      .lean();
    console.log("📋 Sample Types:");
    sampleTypes.forEach((t) => console.log(`   - ${t.code} (${t.name})`));

    // Test 2: Check Templates
    console.log("\n📝 Test 2: Verify Notification Templates");
    console.log("-".repeat(80));
    const templateCount = await NotificationTemplate.countDocuments();
    console.log(`✅ Total Templates: ${templateCount}`);

    const sampleTemplates = await NotificationTemplate.find()
      .select("name typeCode isEnabled")
      .limit(5)
      .lean();
    console.log("📝 Sample Templates:");
    sampleTemplates.forEach((t) =>
      console.log(`   - ${t.name} (type: ${t.typeCode})`)
    );

    // Test 3: Test yeucau-tao-moi flow
    console.log("\n🔔 Test 3: Test 'yeucau-tao-moi' Notification");
    console.log("-".repeat(80));

    const testType = await NotificationType.findOne({
      code: "yeucau-tao-moi",
    }).lean();
    if (!testType) {
      throw new Error("Type 'yeucau-tao-moi' not found!");
    }
    console.log(`✅ Found Type: ${testType.name}`);
    console.log(`   Variables: ${testType.variables.length}`);
    console.log(
      `   Recipient Candidates: ${
        testType.variables.filter((v) => v.isRecipientCandidate).length
      }`
    );

    const testTemplates = await NotificationTemplate.find({
      typeCode: "yeucau-tao-moi",
      isEnabled: true,
    }).lean();
    console.log(`✅ Found ${testTemplates.length} enabled template(s)`);
    testTemplates.forEach((t, i) => {
      console.log(`\n   Template ${i + 1}: ${t.name}`);
      console.log(`   - Title: ${t.titleTemplate}`);
      console.log(
        `   - Recipients: ${
          t.recipientConfig?.variables?.join(", ") || "default"
        }`
      );
    });

    // Test 4: Mock Send (without actual user)
    console.log("\n🚀 Test 4: Mock Notification Send");
    console.log("-".repeat(80));

    const mockData = {
      _id: new mongoose.Types.ObjectId(),
      NguoiYeuCauID: new mongoose.Types.ObjectId(),
      arrNguoiDieuPhoiID: [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId(),
      ],
      MaYeuCau: "YC-TEST-001",
      TieuDe: "Yêu cầu test hệ thống",
      MoTa: "Đây là yêu cầu test",
      TenKhoaGui: "Khoa Test",
      TenKhoaNhan: "Khoa IT",
      TenLoaiYeuCau: "Yêu cầu kỹ thuật",
      TenNguoiYeuCau: "Admin Test",
      ThoiGianHen: "25/12/2025 10:00",
    };

    console.log("📦 Mock Data:");
    console.log(`   MaYeuCau: ${mockData.MaYeuCau}`);
    console.log(`   TieuDe: ${mockData.TieuDe}`);
    console.log(`   TenKhoaGui: ${mockData.TenKhoaGui}`);
    console.log(
      `   Recipients: ${mockData.arrNguoiDieuPhoiID.length} điều phối viên`
    );

    console.log("\n⚙️  Calling notificationService.send()...");
    const result = await notificationService.send({
      type: "yeucau-tao-moi",
      data: mockData,
    });

    console.log("\n📊 Result:");
    console.log(`   Success: ${result.success ? "✅" : "❌"}`);
    console.log(`   Sent: ${result.sent || 0}`);
    console.log(`   Failed: ${result.failed || 0}`);
    if (result.reason) {
      console.log(`   Reason: ${result.reason}`);
    }

    // Test 5: Check created notifications
    console.log("\n📬 Test 5: Verify Notifications in DB");
    console.log("-".repeat(80));
    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("type title body createdAt recipientId")
      .lean();

    if (recentNotifications.length === 0) {
      console.log("⚠️  No notifications found in DB");
    } else {
      console.log(
        `✅ Found ${recentNotifications.length} recent notification(s):`
      );
      recentNotifications.forEach((n, i) => {
        console.log(`\n   Notification ${i + 1}:`);
        console.log(`   - Type: ${n.type}`);
        console.log(`   - Title: ${n.title}`);
        console.log(`   - Body: ${n.body.substring(0, 60)}...`);
        console.log(`   - Created: ${n.createdAt}`);
      });
    }

    // Summary
    console.log("\n" + "=".repeat(80));
    console.log("✅ NOTIFICATION SYSTEM TEST COMPLETE");
    console.log("=".repeat(80));
    console.log(`\n📊 Summary:`);
    console.log(`   Types: ${typeCount}`);
    console.log(`   Templates: ${templateCount}`);
    console.log(`   Test Send: ${result.success ? "SUCCESS" : "FAILED"}`);
    console.log(`   Notifications Created: ${recentNotifications.length}\n`);
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error.message);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("👋 Disconnected from MongoDB");
  }
}

// Run test
testNotificationFlow();
