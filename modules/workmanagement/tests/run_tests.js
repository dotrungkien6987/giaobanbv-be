#!/usr/bin/env node

/**
 * Script chạy test cho cấu trúc Work Management mới
 * Usage: node run_tests.js
 */

const path = require("path");
const { testNewStructure } = require("./test_new_structure");

async function runTests() {
  console.log("🚀 Khởi động test suite cho Work Management Module...\n");

  try {
    // Thực hiện các tests
    await testNewStructure();

    console.log("\n" + "=".repeat(60));
    console.log("✅ TẤT CẢ TESTS ĐÃ HOÀN THÀNH THÀNH CÔNG!");
    console.log("📊 Các tính năng đã được test:");
    console.log("   • NhanVienNhiemVu - Gán nhiệm vụ trực tiếp");
    console.log("   • LichSuGanNhiemVu - Tracking lịch sử");
    console.log("   • QuanLyTrangThaiCongViec - State machine");
    console.log("   • QuyTacThongBao - Notification engine");
    console.log("   • Integration tests - Mối quan hệ các models");
    console.log("=".repeat(60));

    process.exit(0);
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ TEST THẤT BẠI!");
    console.error("💥 Lỗi:", error.message);
    console.error("📍 Stack:", error.stack);
    console.error("=".repeat(60));

    process.exit(1);
  }
}

// Chạy tests nếu file này được execute trực tiếp
if (require.main === module) {
  runTests();
}

module.exports = { runTests };
