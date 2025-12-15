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

// YeuCau (Ticket System) routes
const yeuCauRoutes = require("./yeucau.api");
const danhMucYeuCauRoutes = require("./danhMucYeuCau.api");
const lyDoTuChoiRoutes = require("./lyDoTuChoi.api");
const cauHinhThongBaoKhoaRoutes = require("./cauHinhThongBaoKhoa.api");

// ✅ NEW: Import NhanVien controller cho self-assessment
const NhanVien = require("../../../models/NhanVien");
const authentication = require("../../../middlewares/authentication");
const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");

// ⚠️ CRITICAL: Mount file routes FIRST để tránh conflict với /nhanvien/:id
// Express match routes theo thứ tự từ trên xuống. Nếu /nhanvien/:id đứng trước,
// request /files/abc123/thumb sẽ bị match nhầm với pattern /:id và bị chặn auth
router.use("/", filesRoutes); // Routes cho tệp tin - MUST BE FIRST!
router.use("/", congViecRoutes); // Routes cho công việc
router.use("/admin", fileAdminRoutes); // Admin routes
router.use("/", colorConfigRoutes); // Routes cho cấu hình màu

// ✅ NEW: Route lấy thông tin NhanVien by ID (for self-assessment)
// Đặt sau filesRoutes để tránh conflict
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

// YeuCau (Ticket System) routes
router.use("/yeucau", yeuCauRoutes); // Routes cho yêu cầu hỗ trợ
router.use("/danh-muc-yeu-cau", danhMucYeuCauRoutes); // Routes cho danh mục yêu cầu
router.use("/ly-do-tu-choi", lyDoTuChoiRoutes); // Routes cho lý do từ chối
router.use("/cau-hinh-thong-bao-khoa", cauHinhThongBaoKhoaRoutes); // Routes cho cấu hình thông báo khoa

// ❌ Đã di chuyển 4 dòng này lên trên (trước /nhanvien/:id)
// router.use("/", congViecRoutes);
// router.use("/", filesRoutes);
// router.use("/admin", fileAdminRoutes);
// router.use("/", colorConfigRoutes);

module.exports = router;
