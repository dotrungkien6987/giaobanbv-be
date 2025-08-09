const mongoose = require("mongoose");
require("../config/dbConfig"); // Kết nối database

const NhanVien = require("../models/NhanVien");
const QuanLyNhanVien = require("../modules/workmanagement/models/QuanLyNhanVien");

async function taoDataMau() {
  try {
    console.log("Đang tạo dữ liệu mẫu cho QuanLyNhanVien...");

    // Lấy một số nhân viên từ database
    const danhSachNhanVien = await NhanVien.find({
      isDeleted: { $ne: true },
    }).limit(10);

    if (danhSachNhanVien.length < 2) {
      console.log(
        "Cần ít nhất 2 nhân viên trong database để tạo quan hệ quản lý"
      );
      return;
    }

    // Tạo một số quan hệ quản lý mẫu
    const quanHeQuanLyMau = [
      {
        NhanVienQuanLy: danhSachNhanVien[0]._id,
        NhanVienDuocQuanLy: danhSachNhanVien[1]._id,
        LoaiQuanLy: "KPI",
      },
      {
        NhanVienQuanLy: danhSachNhanVien[0]._id,
        NhanVienDuocQuanLy: danhSachNhanVien[2]._id,
        LoaiQuanLy: "KPI",
      },
    ];

    // Chỉ tạo nếu chưa có dữ liệu
    for (let quanHe of quanHeQuanLyMau) {
      if (danhSachNhanVien[quanHeQuanLyMau.indexOf(quanHe) + 1]) {
        const daTonTai = await QuanLyNhanVien.findOne({
          NhanVienQuanLy: quanHe.NhanVienQuanLy,
          NhanVienDuocQuanLy: quanHe.NhanVienDuocQuanLy,
          isDeleted: false,
        });

        if (!daTonTai) {
          const quanLyMoi = new QuanLyNhanVien(quanHe);
          await quanLyMoi.save();
          console.log(
            `✅ Đã tạo quan hệ quản lý: ${danhSachNhanVien[0].Ten} quản lý ${
              danhSachNhanVien[quanHeQuanLyMau.indexOf(quanHe) + 1].Ten
            }`
          );
        } else {
          console.log(
            `⚠️ Quan hệ quản lý đã tồn tại: ${danhSachNhanVien[0].Ten} - ${
              danhSachNhanVien[quanHeQuanLyMau.indexOf(quanHe) + 1].Ten
            }`
          );
        }
      }
    }

    console.log("✅ Hoàn thành tạo dữ liệu mẫu!");

    // In ra một số thông tin để kiểm tra
    const tongSoQuanHe = await QuanLyNhanVien.countDocuments({
      isDeleted: false,
    });
    console.log(`📊 Tổng số quan hệ quản lý hiện tại: ${tongSoQuanHe}`);
  } catch (error) {
    console.error("❌ Lỗi khi tạo dữ liệu mẫu:", error);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Đã đóng kết nối database");
  }
}

async function kiemTraAPI() {
  console.log("\n🧪 Hướng dẫn test APIs:");
  console.log("1. Tạo quan hệ quản lý:");
  console.log("   POST /api/workmanagement/quan-ly-nhan-vien");
  console.log(
    "   Body: { NhanVienQuanLy: 'ObjectId', NhanVienDuocQuanLy: 'ObjectId', LoaiQuanLy: 'KPI' }"
  );

  console.log("\n2. Lấy danh sách nhân viên được quản lý:");
  console.log(
    "   GET /api/workmanagement/quan-ly-nhan-vien/quan-ly/{nhanVienQuanLyId}/nhan-vien"
  );

  console.log("\n3. Lấy thông tin người quản lý:");
  console.log(
    "   GET /api/workmanagement/quan-ly-nhan-vien/nhan-vien/{nhanVienId}/quan-ly"
  );

  console.log("\n4. Lấy tất cả quan hệ quản lý:");
  console.log("   GET /api/workmanagement/quan-ly-nhan-vien");

  console.log("\n5. Cập nhật quan hệ quản lý:");
  console.log("   PUT /api/workmanagement/quan-ly-nhan-vien/{id}");

  console.log("\n6. Xóa quan hệ quản lý:");
  console.log("   DELETE /api/workmanagement/quan-ly-nhan-vien/{id}");
}

// Chạy script
if (require.main === module) {
  taoDataMau().then(() => kiemTraAPI());
}

module.exports = { taoDataMau };
