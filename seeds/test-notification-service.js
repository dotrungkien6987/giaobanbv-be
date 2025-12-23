/**
 * Test NotificationService End-to-End
 *
 * Test flow:
 * 1. Mock data như từ yeuCau.service.js
 * 2. Call notificationService.send()
 * 3. Verify output & check DB
 *
 * Run: node seeds/test-notification-service.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const notificationService = require("../modules/workmanagement/services/notificationService");
const Notification = require("../modules/workmanagement/models/Notification");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function testNotificationService() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Mock data - giả lập từ yeuCau.service.js
    const mockData = {
      // IDs (để build recipients)
      _id: new mongoose.Types.ObjectId("673d1234567890abcdef1234"),
      NguoiYeuCauID: new mongoose.Types.ObjectId("66b1dba74f79822a4752d90d"), // Kiên
      arrNguoiDieuPhoiID: [
        new mongoose.Types.ObjectId("66b1dba74f79822a4752d90d"), // Kiên (điều phối viên test)
      ],

      // Display fields (flatten)
      MaYeuCau: "YC-TEST-001",
      TieuDe: "Yêu cầu kiểm tra hệ thống thông báo",
      TenKhoaGui: "Khoa Nội",
      TenKhoaNhan: "Khoa CNTT",
      TenNguoiYeuCau: "Đỗ Trung Kiên",
    };

    console.log("📤 Sending notification...");
    console.log("Type: yeucau-tao-moi");
    console.log("Data:", {
      MaYeuCau: mockData.MaYeuCau,
      TieuDe: mockData.TieuDe,
      recipients: mockData.arrNguoiDieuPhoiID.length,
    });
    console.log();

    // Call NotificationService
    const result = await notificationService.send({
      type: "yeucau-tao-moi",
      data: mockData,
    });

    console.log("\n📊 Result:", result);

    // Verify DB
    if (result.success) {
      const recentNotifications = await Notification.find({
        type: "yeucau-tao-moi",
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("recipientId", "HoTen Email")
        .lean();

      console.log("\n📋 Recent Notifications in DB:");
      recentNotifications.forEach((notif, idx) => {
        console.log(`   ${idx + 1}. ${notif.title}`);
        console.log(
          `      Recipient: ${notif.recipientId?.HoTen || notif.recipientId}`
        );
        console.log(`      Priority: ${notif.priority}`);
        console.log(`      Read: ${notif.isRead}`);
        console.log(`      Created: ${notif.createdAt}`);
      });
    }

    console.log("\n✅ Test Complete!");
  } catch (error) {
    console.error("\n❌ Test Failed:", error);
    console.error(error.stack);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

testNotificationService();
