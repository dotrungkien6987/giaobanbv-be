const express = require("express");
const router = express.Router();
const kpiController = require("../controllers/kpi.controller");
const authentication = require("../../../middlewares/authentication");

/**
 * @route POST /api/workmanagement/kpi
 * @desc Tạo đánh giá KPI mới
 * @access Private (Manager)
 */
router.post("/", authentication.loginRequired, kpiController.taoDanhGiaKPI);

/**
 * @route GET /api/workmanagement/kpi/:id
 * @desc Lấy chi tiết đánh giá KPI
 * @access Private
 */
router.get(
  "/:id",
  authentication.loginRequired,
  kpiController.layChiTietDanhGiaKPI
);

/**
 * @route GET /api/workmanagement/kpi/chu-ky/:chuKyId
 * @desc Lấy danh sách đánh giá KPI theo chu kỳ
 * @access Private (Manager/Admin)
 */
router.get(
  "/chu-ky/:chuKyId",
  authentication.loginRequired,
  kpiController.layDanhSachKPITheoChuKy
);

/**
 * @route GET /api/workmanagement/kpi/nhan-vien/:nhanVienId
 * @desc Lấy lịch sử đánh giá KPI của nhân viên
 * @access Private
 */
router.get(
  "/nhan-vien/:nhanVienId",
  authentication.loginRequired,
  kpiController.layLichSuKPINhanVien
);

/**
 * @route GET /api/workmanagement/kpi/thong-ke/chu-ky/:chuKyId
 * @desc Lấy thống kê KPI theo chu kỳ
 * @access Private (Admin/Manager)
 */
router.get(
  "/thong-ke/chu-ky/:chuKyId",
  authentication.loginRequired,
  kpiController.thongKeKPITheoChuKy
);

/**
 * @route PUT /api/workmanagement/kpi/nhiem-vu/:nhiemVuId
 * @desc Chấm điểm một nhiệm vụ thường quy
 * @access Private (Manager)
 */
router.put(
  "/nhiem-vu/:nhiemVuId",
  authentication.loginRequired,
  kpiController.chamDiemNhiemVu
);

/**
 * @route PUT /api/workmanagement/kpi/:id/duyet
 * @desc Duyệt đánh giá KPI
 * @access Private (Manager)
 */
router.put(
  "/:id/duyet",
  authentication.loginRequired,
  kpiController.duyetDanhGiaKPI
);

/**
 * @route PUT /api/workmanagement/kpi/:id/huy-duyet
 * @desc Hủy duyệt đánh giá KPI
 * @access Private (Admin)
 */
router.put(
  "/:id/huy-duyet",
  authentication.loginRequired,
  kpiController.huyDuyetDanhGiaKPI
);

/**
 * @route PUT /api/workmanagement/kpi/:id/phan-hoi
 * @desc Nhân viên phản hồi đánh giá KPI
 * @access Private (Employee)
 */
router.put(
  "/:id/phan-hoi",
  authentication.loginRequired,
  kpiController.phanHoiDanhGiaKPI
);

/**
 * @route DELETE /api/workmanagement/kpi/:id
 * @desc Xóa đánh giá KPI (soft delete)
 * @access Private (Manager/Admin)
 */
router.delete(
  "/:id",
  authentication.loginRequired,
  kpiController.xoaDanhGiaKPI
);

module.exports = router;
