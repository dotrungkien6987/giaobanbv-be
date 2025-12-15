/**
 * Add Database Indexes for YeuCau System
 *
 * Run this script to add performance indexes for role-based queries
 * Usage: node scripts/addYeuCauIndexes.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const YeuCau = require("../modules/workmanagement/models/YeuCau");
const CauHinhThongBaoKhoa = require("../modules/workmanagement/models/CauHinhThongBaoKhoa");

async function addIndexes() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");
    console.log(`Database: ${mongoose.connection.name}\n`);

    // ============== YeuCau Indexes ==============
    console.log("📊 Creating YeuCau indexes...");

    // 1. Người được điều phối
    await YeuCau.collection.createIndex(
      { NguoiDuocDieuPhoiID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_nguoiduocdieuphoi_trangthai_deleted", background: true }
    );
    console.log("  ✓ idx_nguoiduocdieuphoi_trangthai_deleted");

    // 2. Người xử lý
    await YeuCau.collection.createIndex(
      { NguoiXuLyID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_nguoixuly_trangthai_deleted", background: true }
    );
    console.log("  ✓ idx_nguoixuly_trangthai_deleted");

    // 3. Khoa đích
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_khoadich_trangthai_deleted", background: true }
    );
    console.log("  ✓ idx_khoadich_trangthai_deleted");

    // 4. Người yêu cầu (tôi gửi)
    await YeuCau.collection.createIndex(
      { NguoiYeuCauID: 1, TrangThai: 1, isDeleted: 1 },
      { name: "idx_nguoiyeucau_trangthai_deleted", background: true }
    );
    console.log("  ✓ idx_nguoiyeucau_trangthai_deleted");

    // 5. Chưa điều phối
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, NguoiDuocDieuPhoiID: 1, isDeleted: 1 },
      { name: "idx_chuadieuphoi", background: true }
    );
    console.log("  ✓ idx_chuadieuphoi");

    // 6. Quá hạn
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, NgayDuKien: 1, isDeleted: 1 },
      { name: "idx_quahan", background: true }
    );
    console.log("  ✓ idx_quahan");

    // 7. Hoàn thành metrics
    await YeuCau.collection.createIndex(
      { NguoiXuLyID: 1, TrangThai: 1, NgayHoanThanh: 1, isDeleted: 1 },
      { name: "idx_hoanthanh_metrics", background: true }
    );
    console.log("  ✓ idx_hoanthanh_metrics");

    // 8. Đánh giá rating
    await YeuCau.collection.createIndex(
      { NguoiXuLyID: 1, TrangThai: 1, SoSaoDanhGia: 1, isDeleted: 1 },
      { name: "idx_danhgia_rating", background: true }
    );
    console.log("  ✓ idx_danhgia_rating");

    // 9. Mới hôm nay
    await YeuCau.collection.createIndex(
      { KhoaDichID: 1, TrangThai: 1, createdAt: -1, isDeleted: 1 },
      { name: "idx_moihomnay", background: true }
    );
    console.log("  ✓ idx_moihomnay");

    // ============== CauHinhThongBaoKhoa Indexes ==============
    console.log("\n📊 Creating CauHinhThongBaoKhoa indexes...");

    // 1. Người điều phối
    await CauHinhThongBaoKhoa.collection.createIndex(
      { "DanhSachNguoiDieuPhoi.NhanVienID": 1 },
      { name: "idx_nguoidieuphoi", background: true }
    );
    console.log("  ✓ idx_nguoidieuphoi");

    // 2. Quản lý khoa
    await CauHinhThongBaoKhoa.collection.createIndex(
      { "DanhSachQuanLyKhoa.NhanVienID": 1 },
      { name: "idx_quanlykhoa", background: true }
    );
    console.log("  ✓ idx_quanlykhoa");

    // ============== Verification ==============
    console.log("\n📋 Verifying indexes...");

    const yeuCauIndexes = await YeuCau.collection.indexes();
    console.log(`\nYeuCau collection has ${yeuCauIndexes.length} indexes:`);
    yeuCauIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}`);
    });

    const cauHinhIndexes = await CauHinhThongBaoKhoa.collection.indexes();
    console.log(
      `\nCauHinhThongBaoKhoa collection has ${cauHinhIndexes.length} indexes:`
    );
    cauHinhIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}`);
    });

    console.log("\n✅ All indexes created successfully!");
    console.log("\n💡 Performance Tips:");
    console.log(
      "  - Monitor index usage: db.yeucau.aggregate([{ $indexStats: {} }])"
    );
    console.log(
      '  - Check query performance: db.yeucau.explain("executionStats").find(...)'
    );
    console.log("  - Indexes use ~1-5MB disk space per index");
  } catch (error) {
    console.error("\n❌ Error creating indexes:", error.message);
    if (error.code === 11000) {
      console.error("  Index already exists. This is safe to ignore.");
    }
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n🔌 Disconnected from MongoDB");
  }
}

// Run the script
addIndexes();
