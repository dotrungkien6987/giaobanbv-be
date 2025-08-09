/**
 * Migration script để tạo indexes cho bảng NhomViecUser
 * Chạy script này sau khi deploy model mới
 */

const mongoose = require("mongoose");
const { NhomViecUser } = require("../models");

async function dropObsoleteIndexes() {
  try {
    const indexes = await NhomViecUser.collection.getIndexes();
    const indexNames = Object.keys(indexes);
    for (const name of indexNames) {
      // Drop any index that includes KhoaID (field removed from schema)
      if (name.includes("KhoaID")) {
        try {
          await NhomViecUser.collection.dropIndex(name);
          console.log(`🗑️  Dropped obsolete index: ${name}`);
        } catch (e) {
          console.warn(`⚠️  Could not drop index ${name}:`, e.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ Lỗi khi kiểm tra/xóa indexes cũ:", error);
  }
}

async function createIndexes() {
  try {
    console.log("Bắt đầu tạo indexes cho NhomViecUser...");

    // Tạo indexes
    await dropObsoleteIndexes();
    await NhomViecUser.createIndexes();

    console.log("✅ Tạo indexes thành công cho NhomViecUser");

    // Hiển thị danh sách indexes
    const indexes = await NhomViecUser.collection.getIndexes();
    console.log("📋 Danh sách indexes hiện tại:");
    Object.keys(indexes).forEach((indexName) => {
      console.log(`  - ${indexName}`);
    });
  } catch (error) {
    console.error("❌ Lỗi khi tạo indexes:", error);
    throw error;
  }
}

async function createDefaultGroups() {
  try {
    console.log("Tạo nhóm việc mặc định cho các quản lý...");

    // Lấy danh sách tất cả quản lý
    const { NhanVienQuanLy } = require("../models");
    const quanLyList = await NhanVienQuanLy.find({ TrangThaiHoatDong: true });

    for (const quanLy of quanLyList) {
      // Kiểm tra xem đã có nhóm mặc định chưa
      const nhomMacDinh = await NhomViecUser.findOne({
        NguoiTaoID: quanLy._id,
        TenNhom: "Công việc chung",
      });

      if (!nhomMacDinh) {
        const nhomMoi = new NhomViecUser({
          TenNhom: "Công việc chung",
          MoTa: "Nhóm mặc định cho các công việc chưa được phân loại cụ thể",
          NguoiTaoID: quanLy._id,
          MauSac: "#95a5a6",
          BieuTuong: "fas fa-tasks",
          ThuTu: 0,
        });

        await nhomMoi.save();
        console.log(`✅ Tạo nhóm mặc định cho ${quanLy.TenNhanVien}`);
      }
    }

    console.log("✅ Hoàn thành tạo nhóm mặc định");
  } catch (error) {
    console.error("❌ Lỗi khi tạo nhóm mặc định:", error);
    throw error;
  }
}

async function updateExistingTasks() {
  try {
    console.log("Cập nhật công việc hiện có để gán vào nhóm mặc định...");

    const { CongViecDuocGiao } = require("../models");

    // Lấy các công việc chưa có nhóm
    const congViecChuaCoNhom = await CongViecDuocGiao.find({
      NhomViecID: { $exists: false },
    }).populate("NguoiGiaoViecID");

    let demCapNhat = 0;

    for (const congViec of congViecChuaCoNhom) {
      if (!congViec.NguoiGiaoViecID) continue;

      // Tìm nhóm mặc định của người giao việc
      const nhomMacDinh = await NhomViecUser.findOne({
        NguoiTaoID: congViec.NguoiGiaoViecID._id,
        TenNhom: "Công việc chung",
      });

      if (nhomMacDinh) {
        congViec.NhomViecID = nhomMacDinh._id;
        await congViec.save();
        demCapNhat++;
      }
    }

    console.log(`✅ Đã cập nhật ${demCapNhat} công việc vào nhóm mặc định`);
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật công việc hiện có:", error);
    throw error;
  }
}

async function updateStatistics() {
  try {
    console.log("Cập nhật thống kê cho tất cả nhóm việc...");

    const allGroups = await NhomViecUser.find({ TrangThaiHoatDong: true });

    for (const group of allGroups) {
      await group.capNhatThongKe();
      console.log(`✅ Cập nhật thống kê cho nhóm: ${group.TenNhom}`);
    }

    console.log("✅ Hoàn thành cập nhật thống kê");
  } catch (error) {
    console.error("❌ Lỗi khi cập nhật thống kê:", error);
    throw error;
  }
}

// Main migration function
async function runMigration() {
  try {
    await createIndexes();
    await createDefaultGroups();
    await updateExistingTasks();
    await updateStatistics();

    console.log("🎉 Migration hoàn thành thành công!");
  } catch (error) {
    console.error("💥 Migration thất bại:", error);
    process.exit(1);
  }
}

// Chạy migration nếu file được gọi trực tiếp
if (require.main === module) {
  runMigration()
    .then(() => {
      console.log("Migration completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = {
  createIndexes,
  createDefaultGroups,
  updateExistingTasks,
  updateStatistics,
  runMigration,
};
