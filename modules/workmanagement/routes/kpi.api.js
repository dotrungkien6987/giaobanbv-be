const express = require("express");
const router = express.Router();
const kpiController = require("../controllers/kpi.controller");
const authentication = require("../../../middlewares/authentication");
const { validateQuanLy } = require("../middlewares/validateQuanLy");

/**
 * @route GET /api/workmanagement/kpi
 * @desc Lấy danh sách tất cả đánh giá KPI (với filter)
 * @access Private
 * @query ChuKyDanhGiaID, NhanVienID, TrangThai
 */
router.get(
  "/",
  authentication.loginRequired,
  kpiController.layDanhSachDanhGiaKPI
);

/**
 * @route GET /api/workmanagement/kpi/dashboard/:chuKyId
 * @desc Dashboard tổng quan - Danh sách nhân viên + điểm KPI
 * @access Private (Manager)
 */
router.get(
  "/dashboard/:chuKyId",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.getDashboard
);

/**
 * @route GET /api/workmanagement/kpi/cham-diem
 * @desc Lấy hoặc tạo đánh giá KPI (V2 - Auto-create)
 * @access Private (Manager)
 * @query chuKyId, nhanVienId
 */
router.get(
  "/cham-diem",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.getChamDiemDetail
);

/**
 * @route POST /api/workmanagement/kpi
 * @desc Tạo đánh giá KPI mới
 * @access Private (Manager)
 */
router.post(
  "/",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.taoDanhGiaKPI
);

// ============================================================================
// ✅ CRITERIA-BASED KPI EVALUATION ROUTES (for v2 component)
//  Đặt TRƯỚC route động '/:id' để tránh bị match nhầm 'cham-diem-tieu-chi' là :id
// ============================================================================

/**
 * @route GET /api/workmanagement/kpi/cham-diem-tieu-chi
 * @desc Lấy chi tiết đánh giá KPI với tiêu chí (for v2 UI)
 * @access Private (Manager)
 * @query chuKyId (required), nhanVienId (required)
 */
router.get(
  "/cham-diem-tieu-chi",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.getChamDiemTieuChi
);

/**
 * @route POST /api/workmanagement/kpi/duyet-kpi-tieu-chi/:danhGiaKPIId
 * @desc Duyệt KPI với điểm tiêu chí (for v2 UI)
 * @access Private (Manager)
 * @body { nhiemVuList: [{ NhiemVuThuongQuyID, MucDoKho, ChiTietDiem }] }
 */
router.post(
  "/duyet-kpi-tieu-chi/:danhGiaKPIId",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.duyetKPITieuChi
);

/**
 * @route POST /api/workmanagement/kpi/luu-tat-ca/:danhGiaKPIId
 * @desc Lưu tất cả nhiệm vụ (không duyệt) - Batch upsert
 * @access Private (Manager)
 * @body { nhiemVuList: [{ NhiemVuThuongQuyID, MucDoKho, ChiTietDiem }] }
 */
router.post(
  "/luu-tat-ca/:danhGiaKPIId",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.luuTatCaNhiemVu
);

/**
 * ✅ NEW: Hủy duyệt KPI
 * @route POST /api/workmanagement/kpi/huy-duyet-kpi/:danhGiaKPIId
 * @desc Undo KPI approval (Admin hoặc Manager trong 7 ngày)
 * @access Private
 * @body { lyDo: String (required) }
 */
router.post(
  "/huy-duyet-kpi/:danhGiaKPIId",
  authentication.loginRequired,
  kpiController.huyDuyetKPI
);

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
  validateQuanLy("KPI"),
  kpiController.chamDiemNhiemVu
);

/**
 * @route POST /api/workmanagement/kpi/reset-criteria
 * @desc Đồng bộ lại tiêu chí từ ChuKy.TieuChiCauHinh (soft merge - giữ điểm cũ)
 * @access Private (Manager)
 * @body { danhGiaKPIId }
 */
router.post(
  "/reset-criteria",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.resetCriteria
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

// ============================================================================
// ✅ NEW KPI EVALUATION ROUTES - SIMPLIFIED FLOW
// ============================================================================

/**
 * @route GET /api/workmanagement/kpi/nhan-vien/:NhanVienID/nhiem-vu
 * @desc Lấy danh sách nhiệm vụ để đánh giá (theo chu kỳ)
 * @access Private (Manager)
 * @query chuKyId (required)
 */
router.get(
  "/nhan-vien/:NhanVienID/nhiem-vu",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.getTasksForEvaluation
);

/**
 * @route POST /api/workmanagement/kpi/nhan-vien/:NhanVienID/danh-gia
 * @desc Lưu đánh giá nhiệm vụ (batch upsert)
 * @access Private (Manager)
 */
router.post(
  "/nhan-vien/:NhanVienID/danh-gia",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.saveEvaluation
);

/**
 * @route GET /api/workmanagement/kpi/nhan-vien/:NhanVienID/diem-kpi
 * @desc Tính điểm KPI cho nhân viên (theo chu kỳ)
 * @access Private (Manager)
 * @query chuKyId (required)
 */
router.get(
  "/nhan-vien/:NhanVienID/diem-kpi",
  authentication.loginRequired,
  validateQuanLy("KPI"),
  kpiController.calculateKPIForEmployee
);

module.exports = router;
