const express = require("express");
const router = express.Router();
const chuKyDanhGiaController = require("../controllers/chuKyDanhGia.controller");
const authentication = require("../../../middlewares/authentication");

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia
 * @desc Lấy danh sách chu kỳ đánh giá
 * @access Private
 */
router.get(
  "/",
  authentication.loginRequired,
  chuKyDanhGiaController.layDanhSach
);

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/list
 * @desc Lấy danh sách chu kỳ đơn giản (cho dropdown)
 * @access Private
 */
router.get(
  "/list",
  authentication.loginRequired,
  chuKyDanhGiaController.layDanhSachChuKy
);

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/auto-select
 * @desc Tự động chọn chu kỳ phù hợp (ngày hiện tại + 5 ngày)
 * @access Private
 */
router.get(
  "/auto-select",
  authentication.loginRequired,
  chuKyDanhGiaController.autoSelect
);

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/previous-criteria
 * @desc Lấy tiêu chí từ chu kỳ trước gần nhất
 * @access Private/Admin
 */
router.get(
  "/previous-criteria",
  authentication.adminRequired,
  chuKyDanhGiaController.getPreviousCriteria
);

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/dang-mo
 * @desc Lấy chu kỳ đánh giá đang mở
 * @access Private
 */
router.get(
  "/dang-mo",
  authentication.loginRequired,
  chuKyDanhGiaController.layChuKyDangMo
);

/**
 * @route PUT /api/workmanagement/chu-ky-danh-gia/:id/dong
 * @desc Đóng chu kỳ đánh giá
 * @access Private/Admin
 */
router.put(
  "/:id/dong",
  authentication.adminRequired,
  chuKyDanhGiaController.dongChuKy
);

/**
 * @route PUT /api/workmanagement/chu-ky-danh-gia/:id/mo
 * @desc Mở lại chu kỳ đánh giá
 * @access Private/Admin
 */
router.put(
  "/:id/mo",
  authentication.adminRequired,
  chuKyDanhGiaController.moChuKy
);

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/:id
 * @desc Lấy chi tiết chu kỳ đánh giá
 * @access Private
 */
router.get(
  "/:id",
  authentication.loginRequired,
  chuKyDanhGiaController.layChiTiet
);

/**
 * @route POST /api/workmanagement/chu-ky-danh-gia
 * @desc Tạo chu kỳ đánh giá mới
 * @access Private/Admin
 */
router.post("/", authentication.adminRequired, chuKyDanhGiaController.taoChuKy);

/**
 * @route PUT /api/workmanagement/chu-ky-danh-gia/:id
 * @desc Cập nhật chu kỳ đánh giá
 * @access Private/Admin
 */
router.put(
  "/:id",
  authentication.adminRequired,
  chuKyDanhGiaController.capNhat
);

/**
 * @route DELETE /api/workmanagement/chu-ky-danh-gia/:id
 * @desc Xóa chu kỳ đánh giá (soft delete)
 * @access Private/Admin
 */
router.delete("/:id", authentication.adminRequired, chuKyDanhGiaController.xoa);

module.exports = router;
