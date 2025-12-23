/**
 * Test 5 Different Notification Actions
 * Validates the complete notification system
 *
 * Test Actions:
 * 1. congviec-giao-viec (multiple recipients: NguoiChinh + NguoiThamGia)
 * 2. yeucau-dieu-phoi (multiple recipients: NguoiXuLy + NguoiYeuCau)
 * 3. kpi-duyet-danh-gia (single recipient: NhanVienID)
 * 4. congviec-deadline-qua-han (urgent priority)
 * 5. yeucau-comment (low priority)
 *
 * Run: node seeds/test-5-actions.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const NotificationService = require("../modules/workmanagement/services/notificationService");
const Notification = require("../modules/workmanagement/models/Notification");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

// Mock data using real NhanVienIDs from DB
const mockData = {
  // Action 1: Giao việc (2 templates: người chính + người tham gia)
  congviecGiaoViec: {
    _id: new mongoose.Types.ObjectId(),
    MaCongViec: "TEST-CV-001",
    TieuDe: "Triển khai hệ thống thông báo mới",
    MoTa: "Refactor notification system",
    NguoiChinhID: "66b1dba74f79822a4752d90d", // Đỗ Trung Kiên
    NguoiGiaoViecID: "66b1dba74f79822a4752d907", // Nguyễn Văn A (mock)
    NguoiThamGia: [
      "66b1dba74f79822a4752d908", // Trần Thị B
      "66b1dba74f79822a4752d909", // Lê Văn C
    ],
    TenNguoiChinh: "Đỗ Trung Kiên",
    TenNguoiGiao: "Nguyễn Văn A",
    DoUuTien: "cao",
    Deadline: "2025-12-25",
  },

  // Action 2: Điều phối yêu cầu (2 templates: người xử lý + người yêu cầu)
  yeuCauDieuPhoi: {
    _id: new mongoose.Types.ObjectId(),
    MaYeuCau: "TEST-YC-002",
    TieuDe: "Yêu cầu sửa máy tính",
    MoTa: "Máy tính phòng A101 hỏng",
    NguoiYeuCauID: "66b1dba74f79822a4752d90a",
    NguoiXuLyID: "66b1dba74f79822a4752d90d",
    TenNguoiYeuCau: "Phạm Thị D",
    TenNguoiXuLy: "Đỗ Trung Kiên",
    TenKhoaGui: "Khoa Nội",
    TenKhoaNhan: "Khoa CNTT",
  },

  // Action 3: Duyệt KPI (1 template: nhân viên)
  kpiDuyetDanhGia: {
    _id: new mongoose.Types.ObjectId(),
    NhanVienID: "66b1dba74f79822a4752d90d",
    NguoiDanhGiaID: "66b1dba74f79822a4752d90b",
    TenNhanVien: "Đỗ Trung Kiên",
    TenNguoiDanhGia: "Hoàng Văn E",
    TenChuKy: "Q4/2024",
    TongDiemKPI: 8.5,
  },

  // Action 4: Deadline quá hạn - URGENT (2 templates: người chính + người giao)
  congviecDeadlineQuaHan: {
    _id: new mongoose.Types.ObjectId(),
    MaCongViec: "TEST-CV-003",
    TieuDe: "Báo cáo tháng 12",
    NguoiChinhID: "66b1dba74f79822a4752d90d",
    NguoiGiaoViecID: "66b1dba74f79822a4752d90b",
    TenNguoiChinh: "Đỗ Trung Kiên",
    TenNguoiGiao: "Hoàng Văn E",
    Deadline: "2024-12-15",
  },

  // Action 5: Comment - LOW priority (2 templates: người yêu cầu + người xử lý)
  yeuCauComment: {
    _id: new mongoose.Types.ObjectId(),
    MaYeuCau: "TEST-YC-004",
    NguoiYeuCauID: "66b1dba74f79822a4752d90a",
    NguoiXuLyID: "66b1dba74f79822a4752d90d",
    NoiDungComment: "Đã xử lý xong phần 1, đang chờ feedback",
    TenNguoiComment: "Đỗ Trung Kiên",
  },
};

async function testFiveActions() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const notificationService = NotificationService; // Already a singleton
    const results = [];

    // Test 1: Giao việc (multiple templates)
    console.log("=".repeat(60));
    console.log("TEST 1: congviec-giao-viec (Multiple Templates)");
    console.log("=".repeat(60));
    const result1 = await notificationService.send({
      type: "congviec-giao-viec",
      data: mockData.congviecGiaoViec,
    });
    results.push({ action: "congviec-giao-viec", result: result1 });
    console.log(`✅ Result:`, result1);

    // Test 2: Điều phối yêu cầu
    console.log("\n" + "=".repeat(60));
    console.log("TEST 2: yeucau-dieu-phoi (Multiple Templates)");
    console.log("=".repeat(60));
    const result2 = await notificationService.send({
      type: "yeucau-dieu-phoi",
      data: mockData.yeuCauDieuPhoi,
    });
    results.push({ action: "yeucau-dieu-phoi", result: result2 });
    console.log(`✅ Result:`, result2);

    // Test 3: Duyệt KPI
    console.log("\n" + "=".repeat(60));
    console.log("TEST 3: kpi-duyet-danh-gia (Single Template)");
    console.log("=".repeat(60));
    const result3 = await notificationService.send({
      type: "kpi-duyet-danh-gia",
      data: mockData.kpiDuyetDanhGia,
    });
    results.push({ action: "kpi-duyet-danh-gia", result: result3 });
    console.log(`✅ Result:`, result3);

    // Test 4: Deadline quá hạn - URGENT
    console.log("\n" + "=".repeat(60));
    console.log("TEST 4: congviec-deadline-qua-han (URGENT Priority)");
    console.log("=".repeat(60));
    const result4 = await notificationService.send({
      type: "congviec-deadline-qua-han",
      data: mockData.congviecDeadlineQuaHan,
    });
    results.push({ action: "congviec-deadline-qua-han", result: result4 });
    console.log(`✅ Result:`, result4);

    // Test 5: Comment - LOW priority
    console.log("\n" + "=".repeat(60));
    console.log("TEST 5: yeucau-comment (LOW Priority)");
    console.log("=".repeat(60));
    const result5 = await notificationService.send({
      type: "yeucau-comment",
      data: mockData.yeuCauComment,
    });
    results.push({ action: "yeucau-comment", result: result5 });
    console.log(`✅ Result:`, result5);

    // Summary
    console.log("\n" + "=".repeat(60));
    console.log("📊 TEST SUMMARY");
    console.log("=".repeat(60));
    const totalSent = results.reduce((sum, r) => sum + r.result.sent, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.result.failed, 0);

    console.log(`\n📈 Statistics:`);
    console.log(`   Total Tests: ${results.length}`);
    console.log(`   Total Sent: ${totalSent}`);
    console.log(`   Total Failed: ${totalFailed}`);
    console.log(
      `   Success Rate: ${(
        (totalSent / (totalSent + totalFailed)) *
        100
      ).toFixed(1)}%`
    );

    console.log(`\n📋 Details:`);
    results.forEach((r) => {
      console.log(
        `   ${r.action}: ${r.result.sent} sent, ${r.result.failed} failed`
      );
    });

    // Check recent notifications in DB
    console.log(`\n📨 Recent Notifications (Last 10):`);
    const recentNotifications = await Notification.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("recipientId", "HoTen");

    recentNotifications.forEach((notif, idx) => {
      console.log(`   ${idx + 1}. [${notif.priority}] ${notif.title}`);
      console.log(
        `      → ${notif.recipientId?.HoTen || "Unknown"} (${
          notif.isRead ? "Read" : "Unread"
        })`
      );
    });

    console.log(`\n✅ All 5 tests completed!`);
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

testFiveActions();
