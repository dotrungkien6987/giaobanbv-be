const express = require("express");
const router = express.Router();
const tieuChiDanhGiaController = require("../controllers/tieuChiDanhGia.controller");
const authentication = require("../../../middlewares/authentication");

/**
 * @route GET /api/workmanagement/tieu-chi-danh-gia
 * @desc Lấy danh sách tiêu chí đánh giá
 * @access Private
 */
router.get(
  "/",
  authentication.loginRequired,
  tieuChiDanhGiaController.layDanhSach
);

/**
 * @route GET /api/workmanagement/tieu-chi-danh-gia/:id
 * @desc Lấy chi tiết tiêu chí đánh giá
 * @access Private
 */
router.get(
  "/:id",
  authentication.loginRequired,
  tieuChiDanhGiaController.layChiTiet
);

/**
 * @route POST /api/workmanagement/tieu-chi-danh-gia
 * @desc Tạo tiêu chí đánh giá mới
 * @access Private (Admin)
 */
router.post("/", authentication.adminRequired, tieuChiDanhGiaController.taoMoi);

/**
 * @route PUT /api/workmanagement/tieu-chi-danh-gia/:id
 * @desc Cập nhật tiêu chí đánh giá
 * @access Private (Admin)
 */
router.put(
  "/:id",
  authentication.adminRequired,
  tieuChiDanhGiaController.capNhat
);

/**
 * @route DELETE /api/workmanagement/tieu-chi-danh-gia/:id
 * @desc Xóa tiêu chí đánh giá (vô hiệu hóa)
 * @access Private (Admin)
 */
router.delete(
  "/:id",
  authentication.adminRequired,
  tieuChiDanhGiaController.xoa
);

module.exports = router;
