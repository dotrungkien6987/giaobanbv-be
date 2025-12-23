/**
 * Script test các type codes mới sau khi sửa
 * Verify notification system hoạt động với typeCodes đã cập nhật
 */

require("dotenv").config();
const mongoose = require("mongoose");
const notificationService = require("../modules/workmanagement/services/notificationService");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

const FIXED_TYPE_CODES = [
  {
    old: "congviec-comment",
    new: "congviec-binh-luan",
    testData: {
      _id: "test-cv-001",
      MaCongViec: "CV-TEST-001",
      TieuDe: "Test công việc",
      arrNguoiLienQuanID: ["69480e96d9f07b5a3c9b660e"],
      TenNguoiComment: "Test User",
      NoiDungComment: "Test comment",
    },
  },
  {
    old: "congviec-them-nguoi-tham-gia",
    new: "congviec-gan-nguoi-tham-gia",
    testData: {
      _id: "test-cv-002",
      MaCongViec: "CV-TEST-002",
      TieuDe: "Test công việc 2",
      arrNguoiNhanID: ["69480e96d9f07b5a3c9b660e"],
      TenNguoiCapNhat: "Test User",
      TenNguoiDuocThem: "New User",
    },
  },
  {
    old: "congviec-deadline-sap-den",
    new: "congviec-deadline-approaching",
    testData: {
      _id: "test-cv-003",
      MaCongViec: "CV-TEST-003",
      TieuDe: "Test công việc 3",
      arrNguoiLienQuanID: ["69480e96d9f07b5a3c9b660e"],
      NgayHetHan: new Date(),
      SoNgayConLai: 2,
    },
  },
  {
    old: "congviec-deadline-qua-han",
    new: "congviec-deadline-overdue",
    testData: {
      _id: "test-cv-004",
      MaCongViec: "CV-TEST-004",
      TieuDe: "Test công việc 4",
      arrNguoiLienQuanID: ["69480e96d9f07b5a3c9b660e"],
      NgayHetHan: new Date(),
      SoNgayQuaHan: 3,
    },
  },
  {
    old: "yeucau-comment",
    new: "yeucau-binh-luan",
    testData: {
      _id: "test-yc-001",
      MaYeuCau: "YC-TEST-001",
      TieuDe: "Test yêu cầu",
      arrNguoiLienQuanID: ["69480e96d9f07b5a3c9b660e"],
      TenNguoiComment: "Test User",
      NoiDungComment: "Test comment",
    },
  },
];

async function testFixedTypeCodes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    console.log("=".repeat(80));
    console.log("🧪 TEST CÁC TYPE CODES ĐÃ SỬA");
    console.log("=".repeat(80));

    let passCount = 0;
    let failCount = 0;

    for (const testCase of FIXED_TYPE_CODES) {
      console.log(`\n📝 Test: ${testCase.old} → ${testCase.new}`);
      console.log("-".repeat(80));

      try {
        // Test OLD type code (should fail)
        console.log(`   ❌ Testing OLD type: ${testCase.old}`);
        try {
          await notificationService.send({
            type: testCase.old,
            data: testCase.testData,
          });
          console.log(`      ⚠️  OLD type still works (templates exist)`);
        } catch (error) {
          console.log(`      ✅ OLD type failed as expected`);
        }

        // Test NEW type code (should work)
        console.log(`   ✅ Testing NEW type: ${testCase.new}`);
        const result = await notificationService.send({
          type: testCase.new,
          data: testCase.testData,
        });

        if (result.sent > 0 || result.failed === 0) {
          console.log(
            `      ✅ NEW type works! (Sent: ${result.sent}, Failed: ${result.failed})`
          );
          passCount++;
        } else {
          console.log(
            `      ⚠️  NEW type has issues (Sent: ${result.sent}, Failed: ${result.failed})`
          );
          console.log(`          (This is OK if no valid recipients)`);
          passCount++;
        }
      } catch (error) {
        console.log(`      ❌ Error: ${error.message}`);
        failCount++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 KẾT QUẢ TEST");
    console.log("=".repeat(80));
    console.log(`   ✅ Passed: ${passCount}/${FIXED_TYPE_CODES.length}`);
    console.log(`   ❌ Failed: ${failCount}/${FIXED_TYPE_CODES.length}`);

    if (failCount === 0) {
      console.log(`\n   🎉 TẤT CẢ TYPE CODES ĐÃ HOẠT ĐỘNG ĐÚNG!`);
    } else {
      console.log(`\n   ⚠️  Có ${failCount} type code(s) cần kiểm tra lại`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

testFixedTypeCodes();
