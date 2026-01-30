const express = require("express");
const khoaController = require("../controllers/khoa.controller");
const router = express.Router();
const { body, param, query } = require("express-validator");
const validators = require("../middlewares/validators");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /khoa
 * @description Tạo mới khoa
 * @body {TenKhoa, LoaiKhoa, STT, MaKhoa, HisDepartmentID, HisDepartmentGroupID}
 * @access Login required
 */
router.post(
  "/",
  authentication.loginRequired,
  validators.validate([
    body("TenKhoa", "Tên khoa không được để trống").exists().notEmpty(),
    body("LoaiKhoa", "Loại khoa không hợp lệ")
      .exists()
      .isIn([
        "kcc",
        "kkb",
        "noi",
        "ngoai",
        "cskh",
        "gmhs",
        "cdha",
        "tdcn",
        "clc",
        "xn",
        "hhtm",
        "pkyc",
        "phong",
        "khac",
      ]),
    body("STT", "STT phải là số").exists().isNumeric(),
    body("MaKhoa", "Mã khoa không được để trống").exists().notEmpty(),
  ]),
  khoaController.insertOne,
);

/**
 * @route GET /khoa
 * @description Lấy danh sách tất cả khoa
 * @access Login required
 */
router.get("/all", authentication.loginRequired, khoaController.getAll);

/**
 * @route GET /khoa/iso
 * @description Lấy danh sách khoa liên quan ISO (IsISORelevant = true)
 * @access Login required
 */
router.get("/iso", authentication.loginRequired, khoaController.getISORelevant);

/**
 * @route GET /khoa
 * @description Lấy danh sách khoa có phân trang
 * @query {page, limit, TenKhoa, LoaiKhoa}
 * @access Login required
 */
router.get("/", authentication.loginRequired, khoaController.getKhoasPhanTrang);

/**
 * @route GET /khoa/:id
 * @description Lấy thông tin khoa theo ID
 * @access Login required
 */
router.get(
  "/:id",
  authentication.loginRequired,
  validators.validate([param("id", "ID không hợp lệ").isMongoId()]),
  khoaController.getById,
);

/**
 * @route PUT /khoa/bulk-update-iso
 * @description Cập nhật hàng loạt IsISORelevant cho nhiều khoa (QLCL only)
 * @body {khoaIds: [id1, id2, ...], isISORelevant: boolean}
 * @access QLCL required
 */
router.put(
  "/bulk-update-iso",
  authentication.loginRequired,
  authentication.qlclRequired,
  validators.validate([
    body("khoaIds", "Danh sách khoa không hợp lệ").isArray({ min: 1 }),
    body("khoaIds.*", "ID khoa không hợp lệ").isMongoId(),
    body("isISORelevant", "isISORelevant phải là boolean").isBoolean(),
  ]),
  khoaController.bulkUpdateISO,
);

/**
 * @route PUT /khoa/:id
 * @description Cập nhật thông tin khoa theo ID
 * @body {TenKhoa, LoaiKhoa, STT, MaKhoa, HisDepartmentID, HisDepartmentGroupID}
 * @access Login required
 */
router.put(
  "/:id",
  authentication.loginRequired,
  validators.validate([
    param("id", "ID không hợp lệ").isMongoId(),
    body("TenKhoa", "Tên khoa không được để trống").optional().notEmpty(),
    body("LoaiKhoa", "Loại khoa không hợp lệ")
      .optional()
      .isIn([
        "kcc",
        "kkb",
        "noi",
        "ngoai",
        "cskh",
        "gmhs",
        "cdha",
        "tdcn",
        "clc",
        "xn",
        "hhtm",
        "pkyc",
        "phong",
        "khac",
      ]),
    body("STT", "STT phải là số").optional().isNumeric(),
    body("MaKhoa", "Mã khoa không được để trống").optional().notEmpty(),
  ]),
  khoaController.updateOne,
);

/**
 * @route DELETE /khoa/:id
 * @description Xóa khoa theo ID
 * @access Login required
 */
router.delete(
  "/:id",
  authentication.loginRequired,
  validators.validate([param("id", "ID không hợp lệ").isMongoId()]),
  khoaController.deleteOne,
);

module.exports = router;
