const express = require("express");
const nhomKhoaSoThuTuController = require("../controllers/nhomkhoasothutu.controller");
const router = express.Router();
const { body, param, query } = require("express-validator");
const validators = require("../middlewares/validators");
const authentication = require("../middlewares/authentication");

/**
 * @route POST /nhomkhoasothutu
 * @description Tạo mới nhóm khoa số thứ tự
 * @body {TenNhom, GhiChu, DanhSachKhoa}
 * @access Login required
 */
router.post(
  "/",
  authentication.loginRequired,
  validators.validate([
    body("TenNhom", "Tên nhóm không được để trống").exists().notEmpty(),
    body("DanhSachKhoa", "Danh sách khoa phải là mảng").isArray(),
    body("DanhSachKhoa.*.KhoaID", "ID khoa không hợp lệ").isMongoId(),
  ]),
  nhomKhoaSoThuTuController.insertOne
);

/**
 * @route GET /nhomkhoasothutu/all
 * @description Lấy danh sách tất cả nhóm khoa số thứ tự
 * @access Login required
 */
router.get("/all", authentication.loginRequired, nhomKhoaSoThuTuController.getAll);

/**
 * @route GET /nhomkhoasothutu/departmentids
 * @description Lấy danh sách Department IDs từ tất cả nhóm khoa
 * @access Login required
 */
router.get("/departmentids", authentication.loginRequired, nhomKhoaSoThuTuController.getDepartmentIds);

/**
 * @route GET /nhomkhoasothutu/:id
 * @description Lấy thông tin nhóm khoa số thứ tự theo ID
 * @access Login required
 */
router.get(
  "/:id",
  authentication.loginRequired,
  validators.validate([param("id", "ID không hợp lệ").isMongoId()]),
  nhomKhoaSoThuTuController.getById
);

/**
 * @route PUT /nhomkhoasothutu/:id
 * @description Cập nhật thông tin nhóm khoa số thứ tự theo ID
 * @body {TenNhom, GhiChu, DanhSachKhoa}
 * @access Login required
 */
router.put(
  "/:id",
  authentication.loginRequired,
  validators.validate([
    param("id", "ID không hợp lệ").isMongoId(),
    body("TenNhom", "Tên nhóm không được để trống").optional().notEmpty(),
    body("DanhSachKhoa", "Danh sách khoa phải là mảng").optional().isArray(),
    body("DanhSachKhoa.*.KhoaID", "ID khoa không hợp lệ").optional().isMongoId(),
  ]),
  nhomKhoaSoThuTuController.updateOne
);

/**
 * @route DELETE /nhomkhoasothutu/:id
 * @description Xóa nhóm khoa số thứ tự theo ID
 * @access Login required
 */
router.delete(
  "/:id",
  authentication.loginRequired,
  validators.validate([param("id", "ID không hợp lệ").isMongoId()]),
  nhomKhoaSoThuTuController.deleteOne
);

module.exports = router;