const express = require("express");
const router = express.Router();
const doanRaController = require("../controllers/doanra.controller");
const authentication = require("../middlewares/authentication");
const validators = require("../middlewares/validators");
const { body } = require("express-validator");

/**
 * @route POST /api/doanra
 * @description Tạo mới thông tin đoàn ra
 * @body {NgayKyVanBan, ThanhVien, SoVanBanChoPhep, MucDichXuatCanh, TuNgay, DenNgay, NguonKinhPhi, QuocGiaDen, BaoCao, TaiLieuKemTheo, GhiChu}
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
    // body("ThanhVien", "Danh sách thành viên là bắt buộc và phải là mảng")
    //   .exists()
    //   .isArray({ min: 1 }),
    // body("ThanhVien.*", "Mỗi thành viên phải là MongoDB ID hợp lệ").isMongoId(),
    body("QuocGiaDen", "Quốc gia đến là bắt buộc").exists().notEmpty(),
    body("TuNgay", "Từ ngày phải là ngày hợp lệ").optional().isISO8601(),
    body("DenNgay", "Đến ngày phải là ngày hợp lệ").optional().isISO8601(),
  ]),
  doanRaController.createDoanRa
);

/**
 * @route GET /api/doanra
 * @description Lấy danh sách đoàn ra với phân trang và tìm kiếm
 * @query {page, limit, search, fromDate, toDate, quocGia}
 * @access Login required
 */
router.get("/", authentication.loginRequired, doanRaController.getAllDoanRas);

/**
 * @route GET /api/doanra/stats/country
 * @description Lấy thống kê đoàn ra theo quốc gia
 * @query {year}
 * @access Login required
 */

/**
 * @route GET /api/doanra/:id
 * @description Lấy chi tiết đoàn ra theo ID
 * @params {id}
 * @access Login required
 */
/**
 * @route GET /api/doanra/members
 * @description Danh sách thành viên Đoàn ra (server-side)
 * @query {page, limit, search, fromDate, toDate, hasPassport}
 * @access Login required
 */
router.get(
  "/members",
  authentication.loginRequired,
  doanRaController.getMembers
);

router.get(
  "/:id",
  authentication.loginRequired,
  doanRaController.getDoanRaById
);

/**
 * @route PUT /api/doanra/:id
 * @description Cập nhật thông tin đoàn ra
 * @params {id}
 * @body {NgayKyVanBan, ThanhVien, SoVanBanChoPhep, MucDichXuatCanh, TuNgay, DenNgay, NguonKinhPhi, QuocGiaDen, BaoCao, TaiLieuKemTheo, GhiChu}
 * @access Login required
 */
router.put(
  "/:id",
  authentication.loginRequired,
  validators.validate([
    body("NgayKyVanBan", "Ngày ký văn bản phải là ngày hợp lệ")
      .optional()
      .isISO8601(),
    body("ThanhVien", "Danh sách thành viên phải là mảng")
      .optional()
      .isArray({ min: 1 }),

    body("TuNgay", "Từ ngày phải là ngày hợp lệ").optional().isISO8601(),
    body("DenNgay", "Đến ngày phải là ngày hợp lệ").optional().isISO8601(),
  ]),
  doanRaController.updateDoanRa
);

/**
 * @route DELETE /api/doanra/:id
 * @description Xóa đoàn ra (soft delete)
 * @params {id}
 * @access Login required
 */
router.delete(
  "/:id",
  authentication.loginRequired,
  doanRaController.deleteDoanRa
);

module.exports = router;
