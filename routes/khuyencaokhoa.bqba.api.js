const express = require("express");
const router = express.Router();
const khuyenCaoKhoaBQBAController = require("../controllers/khuyencaokhoa.bqba.controller");
const { loginRequired } = require("../middlewares/authentication");

/**
 * @route GET /api/khuyen-cao-khoa-bqba?nam=2025
 * @description Lấy tất cả khuyến cáo theo năm
 * @access Private (Admin, Manager)
 */
router.get("/", loginRequired, khuyenCaoKhoaBQBAController.getAll);

/**
 * @route GET /api/khuyen-cao-khoa-bqba/by-khoa/:khoaId/:loaiKhoa?nam=2025
 * @description Lấy khuyến cáo của 1 khoa cụ thể
 * @access Private
 */
router.get(
  "/by-khoa/:khoaId/:loaiKhoa",
  loginRequired,
  khuyenCaoKhoaBQBAController.getByKhoa
);

/**
 * @route POST /api/khuyen-cao-khoa-bqba
 * @description Tạo mới khuyến cáo
 * @access Private (Admin, Manager)
 */
router.post("/", loginRequired, khuyenCaoKhoaBQBAController.create);

/**
 * @route PUT /api/khuyen-cao-khoa-bqba/:id
 * @description Cập nhật khuyến cáo
 * @access Private (Admin, Manager)
 */
router.put("/:id", loginRequired, khuyenCaoKhoaBQBAController.update);

/**
 * @route DELETE /api/khuyen-cao-khoa-bqba/:id
 * @description Xóa mềm khuyến cáo
 * @access Private (Admin)
 */
router.delete("/:id", loginRequired, khuyenCaoKhoaBQBAController.delete);

/**
 * @route POST /api/khuyen-cao-khoa-bqba/bulk-create
 * @description Tạo nhiều khuyến cáo (copy từ năm trước)
 * @access Private (Admin)
 */
router.post(
  "/bulk-create",
  loginRequired,
  khuyenCaoKhoaBQBAController.bulkCreate
);

module.exports = router;
