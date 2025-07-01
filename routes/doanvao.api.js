const express = require("express");
const router = express.Router();
const doanVaoController = require("../controllers/doanvao.controller");
const authentication = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const { body } = require("express-validator");

/**
 * @route POST /api/doanvao
 * @description Tạo mới thông tin đoàn vào
 * @body {NgayKyVanBan, NhanVienID, SoVanBanChoPhep, MucDichXuatCanh, ThoiGianVaoLamViec, BaoCao, TaiLieuKemTheo, GhiChu, ThanhVien}
 * @access Login required
 */
router.post(
  "/",
  authentication.loginRequired,
  validators.validate([
    body("NgayKyVanBan", "Ngày ký văn bản là bắt buộc")
      .exists()
      .notEmpty()
      .isISO8601(),
    body("NhanVienID", "Nhân viên ID là bắt buộc")
      .exists()
      .notEmpty()
      .isMongoId(),
    body("ThanhVien", "Danh sách thành viên phải là mảng").optional().isArray(),
    body("ThanhVien.*.Ten", "Tên thành viên là bắt buộc")
      .if(body("ThanhVien").exists())
      .notEmpty(),
    body("ThanhVien.*.NgaySinh", "Ngày sinh thành viên là bắt buộc")
      .if(body("ThanhVien").exists())
      .isISO8601(),
  ]),
  doanVaoController.createDoanVao
);

/**
 * @route GET /api/doanvao
 * @description Lấy danh sách đoàn vào với phân trang và tìm kiếm
 * @query {page, limit, search, fromDate, toDate}
 * @access Login required
 */
router.get("/", authentication.loginRequired, doanVaoController.getDoanVaos);

/**
 * @route GET /api/doanvao/stats
 * @description Lấy thống kê đoàn vào theo tháng
 * @query {year}
 * @access Login required
 */
router.get(
  "/stats",
  authentication.loginRequired,
  doanVaoController.getDoanVaoStats
);

/**
 * @route GET /api/doanvao/:id
 * @description Lấy chi tiết đoàn vào theo ID
 * @params {id}
 * @access Login required
 */
router.get(
  "/:id",
  authentication.loginRequired,
  doanVaoController.getDoanVaoById
);

/**
 * @route PUT /api/doanvao/:id
 * @description Cập nhật thông tin đoàn vào
 * @params {id}
 * @body {NgayKyVanBan, NhanVienID, SoVanBanChoPhep, MucDichXuatCanh, ThoiGianVaoLamViec, BaoCao, TaiLieuKemTheo, GhiChu, ThanhVien}
 * @access Login required
 */
router.put(
  "/:id",
  authentication.loginRequired,
  validators.validate([
    body("NgayKyVanBan", "Ngày ký văn bản phải là ngày hợp lệ")
      .optional()
      .isISO8601(),
    body("NhanVienID", "Nhân viên ID phải là MongoDB ID hợp lệ")
      .optional()
      .isMongoId(),
    body("ThanhVien", "Danh sách thành viên phải là mảng").optional().isArray(),
  ]),
  doanVaoController.updateDoanVao
);

/**
 * @route DELETE /api/doanvao/:id
 * @description Xóa đoàn vào (soft delete)
 * @params {id}
 * @access Login required
 */
router.delete(
  "/:id",
  authentication.loginRequired,
  doanVaoController.deleteDoanVao
);

module.exports = router;
