const express = require("express");
const router = express.Router();
const lichTrucController = require("../controllers/lichtruc.controller");
const { loginRequired } = require("../middlewares/authentication");

// Tất cả các route đều yêu cầu đăng nhập
router.use(loginRequired);

// Lấy tất cả lịch trực
router.get("/", lichTrucController.getAllLichTruc);

/**
 * @route GET /lichtruc/by-date-range
 * @description lấy lịch trực theo khoảng thời gian và khoa
 * @params {fromDate, toDate, khoaId}
 * @access login required
 */
router.get("/by-date-range", lichTrucController.getLichTrucByDateRange);

/**
 * @route GET /lichtruc/by-ngay-khoa
 * @description lấy lịch trực theo khoảng thời gian và khoa (có điền ngày trống)
 * @params {fromDate, toDate, khoaId}
 * @access login required
 */
router.get("/by-ngay-khoa", lichTrucController.getByNgayKhoa);

/**
 * @route POST /lichtruc/update-or-insert
 * @description cập nhật hoặc thêm nhiều lịch trực cùng lúc
 * @body [lichTrucs]
 * @access login required
 */
router.post("/update-or-insert", lichTrucController.updateOrInsert);

// Lấy lịch trực theo khoa
router.get("/khoa/:khoaId", lichTrucController.getLichTrucByKhoa);

// Lấy lịch trực theo ngày
router.get("/ngay/:date", lichTrucController.getLichTrucByDate);

// Thêm lịch trực mới
router.post("/", lichTrucController.createLichTruc);

// Route thêm nhiều lịch trực cùng lúc
router.post("/multiple", lichTrucController.createMultipleLichTruc);

// Route cập nhật lịch trực
router.put("/:id", lichTrucController.updateLichTruc);

// Route xóa lịch trực
router.delete("/:id", lichTrucController.deleteLichTruc);

module.exports = router;