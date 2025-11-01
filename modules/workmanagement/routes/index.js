const express = require("express");
const router = express.Router();

// Import các routes
const quanLyNhanVienRoutes = require("./quanlynhanvien.api");
const giaoNhiemVuRoutes = require("./giaoNhiemVu.api");
const congViecRoutes = require("./congViec.api");
const filesRoutes = require("./files.api");
const fileAdminRoutes = require("./fileAdmin.api");
const quanLyNhanVienRelationRoutes = require("./quanLyNhanVien.routes");
const nhomViecUserRoutes = require("./nhomViecUser.routes");
const colorConfigRoutes = require("./colorConfig.api");
const kpiRoutes = require("./kpi.api");
const chuKyDanhGiaRoutes = require("./chuKyDanhGia.api");

// ✅ NEW: Import NhanVien controller cho self-assessment
const NhanVien = require("../../../models/NhanVien");
const authentication = require("../../../middlewares/authentication");
const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");

// ✅ NEW: Route lấy thông tin NhanVien by ID (for self-assessment)
router.get(
  "/nhanvien/:id",
  authentication.loginRequired,
  catchAsync(async (req, res, next) => {
    const nhanVien = await NhanVien.findById(req.params.id)
      .populate("KhoaID", "TenKhoa MaKhoa")
      .populate("LoaiChuyenMonID", "Ten")
      .lean();

    if (!nhanVien) {
      throw new AppError(404, "Không tìm thấy nhân viên", "Not Found");
    }

    return sendResponse(
      res,
      200,
      true,
      nhanVien,
      null,
      "Lấy thông tin nhân viên thành công"
    );
  })
);

// Sử dụng các routes
router.use("/quan-ly-nhan-vien", quanLyNhanVienRoutes);
router.use("/giao-nhiem-vu", giaoNhiemVuRoutes);
router.use("/quanlynhanvien", quanLyNhanVienRelationRoutes); // Routes cho quan hệ quản lý
router.use("/nhom-viec-user", nhomViecUserRoutes); // Routes cho nhóm việc user
router.use("/kpi", kpiRoutes); // Routes cho hệ thống KPI
router.use("/chu-ky-danh-gia", chuKyDanhGiaRoutes); // Routes cho chu kỳ đánh giá
router.use("/", congViecRoutes); // Routes cho công việc
router.use("/", filesRoutes); // Routes cho tệp tin
router.use("/admin", fileAdminRoutes); // Admin routes cho tệp tin
router.use("/", colorConfigRoutes); // Routes cho cấu hình màu

module.exports = router;
