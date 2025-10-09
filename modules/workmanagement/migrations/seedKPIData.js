/**
 * Migration Script: Seed dữ liệu mẫu cho hệ thống KPI
 *
 * Chạy script này để tạo dữ liệu mẫu cho:
 * - TieuChiDanhGia (Tiêu chí đánh giá)
 * - ChuKyDanhGia (Chu kỳ đánh giá)
 *
 * Usage: node migrations/seedKPIData.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

// Import models
const TieuChiDanhGia = require("../models/TieuChiDanhGia");
const ChuKyDanhGia = require("../models/ChuKyDanhGia");

// Kết nối database
const connectDB = async () => {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/giaobanbv",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );
    console.log("✅ Đã kết nối database");
  } catch (error) {
    console.error("❌ Lỗi kết nối database:", error);
    process.exit(1);
  }
};

// Dữ liệu mẫu tiêu chí đánh giá
const tieuChiMau = [
  // Tiêu chí tăng điểm
  {
    TenTieuChi: "Hoàn thành đúng hạn",
    MoTa: "Phần trăm công việc hoàn thành đúng hoặc trước thời hạn",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    TrongSoMacDinh: 1.0,
    TrangThaiHoatDong: true,
  },
  {
    TenTieuChi: "Chất lượng công việc",
    MoTa: "Đánh giá chất lượng hoàn thành công việc",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    TrongSoMacDinh: 1.2,
    TrangThaiHoatDong: true,
  },
  {
    TenTieuChi: "Sáng kiến cải tiến",
    MoTa: "Số sáng kiến cải tiến quy trình đã đề xuất",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 10,
    TrongSoMacDinh: 0.5,
    TrangThaiHoatDong: true,
  },
  {
    TenTieuChi: "Hỗ trợ đồng nghiệp",
    MoTa: "Mức độ hỗ trợ và chia sẻ kinh nghiệm với đồng nghiệp",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    TrongSoMacDinh: 0.8,
    TrangThaiHoatDong: true,
  },
  {
    TenTieuChi: "Tuân thủ quy trình",
    MoTa: "Mức độ tuân thủ quy trình làm việc của đơn vị",
    LoaiTieuChi: "TANG_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 100,
    TrongSoMacDinh: 1.0,
    TrangThaiHoatDong: true,
  },

  // Tiêu chí giảm điểm
  {
    TenTieuChi: "Trễ deadline",
    MoTa: "Số lần trễ deadline trong kỳ đánh giá",
    LoaiTieuChi: "GIAM_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 10,
    TrongSoMacDinh: 1.0,
    TrangThaiHoatDong: true,
  },
  {
    TenTieuChi: "Sai sót công việc",
    MoTa: "Số lần phát hiện sai sót cần sửa chữa",
    LoaiTieuChi: "GIAM_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 10,
    TrongSoMacDinh: 1.2,
    TrangThaiHoatDong: true,
  },
  {
    TenTieuChi: "Vi phạm nội quy",
    MoTa: "Số lần vi phạm nội quy làm việc",
    LoaiTieuChi: "GIAM_DIEM",
    GiaTriMin: 0,
    GiaTriMax: 5,
    TrongSoMacDinh: 2.0,
    TrangThaiHoatDong: true,
  },
];

// Dữ liệu mẫu chu kỳ đánh giá
const chuKyMau = [
  {
    TenChuKy: "Đánh giá KPI tháng 10/2025",
    LoaiChuKy: "HANG_THANG",
    NgayBatDau: new Date("2025-10-01"),
    NgayKetThuc: new Date("2025-10-31"),
    TrangThai: "DANG_HOAT_DONG",
    MoTa: "Chu kỳ đánh giá KPI tháng 10 năm 2025",
  },
  {
    TenChuKy: "Đánh giá KPI Quý 3/2025",
    LoaiChuKy: "QUY",
    NgayBatDau: new Date("2025-07-01"),
    NgayKetThuc: new Date("2025-09-30"),
    TrangThai: "HOAN_THANH",
    MoTa: "Chu kỳ đánh giá KPI quý 3 năm 2025",
  },
  {
    TenChuKy: "Đánh giá KPI tháng 11/2025",
    LoaiChuKy: "HANG_THANG",
    NgayBatDau: new Date("2025-11-01"),
    NgayKetThuc: new Date("2025-11-30"),
    TrangThai: "CHUAN_BI",
    MoTa: "Chu kỳ đánh giá KPI tháng 11 năm 2025",
  },
];

// Hàm seed dữ liệu
const seedData = async () => {
  try {
    console.log("🚀 Bắt đầu seed dữ liệu KPI...\n");

    // 1. Xóa dữ liệu cũ (nếu có)
    console.log("🗑️  Xóa dữ liệu cũ...");
    await TieuChiDanhGia.deleteMany({});
    await ChuKyDanhGia.deleteMany({});
    console.log("✅ Đã xóa dữ liệu cũ\n");

    // 2. Seed tiêu chí đánh giá
    console.log("📝 Seed tiêu chí đánh giá...");
    const tieuChiCreated = await TieuChiDanhGia.insertMany(tieuChiMau);
    console.log(`✅ Đã tạo ${tieuChiCreated.length} tiêu chí đánh giá:`);
    tieuChiCreated.forEach((tc, index) => {
      console.log(
        `   ${index + 1}. [${tc.LoaiTieuChi}] ${tc.TenTieuChi} (${
          tc.GiaTriMin
        }-${tc.GiaTriMax})`
      );
    });
    console.log();

    // 3. Seed chu kỳ đánh giá
    console.log("📅 Seed chu kỳ đánh giá...");
    const chuKyCreated = await ChuKyDanhGia.insertMany(chuKyMau);
    console.log(`✅ Đã tạo ${chuKyCreated.length} chu kỳ đánh giá:`);
    chuKyCreated.forEach((ck, index) => {
      const from = ck.NgayBatDau.toLocaleDateString("vi-VN");
      const to = ck.NgayKetThuc.toLocaleDateString("vi-VN");
      console.log(
        `   ${index + 1}. ${ck.TenChuKy} (${from} - ${to}) - ${ck.TrangThai}`
      );
    });
    console.log();

    // 4. Thống kê
    console.log("📊 Thống kê dữ liệu:");
    console.log(
      `   - Tiêu chí TĂNG ĐIỂM: ${
        tieuChiCreated.filter((tc) => tc.LoaiTieuChi === "TANG_DIEM").length
      }`
    );
    console.log(
      `   - Tiêu chí GIẢM ĐIỂM: ${
        tieuChiCreated.filter((tc) => tc.LoaiTieuChi === "GIAM_DIEM").length
      }`
    );
    console.log(
      `   - Chu kỳ ĐANG HOẠT ĐỘNG: ${
        chuKyCreated.filter((ck) => ck.TrangThai === "DANG_HOAT_DONG").length
      }`
    );
    console.log(
      `   - Chu kỳ CHUẨN BỊ: ${
        chuKyCreated.filter((ck) => ck.TrangThai === "CHUAN_BI").length
      }`
    );
    console.log(
      `   - Chu kỳ HOÀN THÀNH: ${
        chuKyCreated.filter((ck) => ck.TrangThai === "HOAN_THANH").length
      }`
    );
    console.log();

    console.log("✅ Seed dữ liệu KPI thành công!");
    console.log("\n💡 Bước tiếp theo:");
    console.log(
      "   1. Sử dụng API /api/workmanagement/tieu-chi-danh-gia để xem tiêu chí"
    );
    console.log(
      "   2. Sử dụng API /api/workmanagement/chu-ky-danh-gia để xem chu kỳ"
    );
    console.log("   3. Tạo đánh giá KPI: POST /api/workmanagement/kpi");
    console.log();
  } catch (error) {
    console.error("❌ Lỗi seed dữ liệu:", error);
    throw error;
  }
};

// Main execution
const main = async () => {
  try {
    await connectDB();
    await seedData();

    console.log("🎉 Hoàn tất!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Lỗi:", error);
    process.exit(1);
  }
};

// Chạy script
if (require.main === module) {
  main();
}

module.exports = { seedData };
