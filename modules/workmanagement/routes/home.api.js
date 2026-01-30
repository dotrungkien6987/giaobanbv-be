/**
 * Home Routes - API routes cho Trang chủ
 *
 * @module workmanagement/routes/home
 */

const express = require("express");
const router = express.Router();
const authentication = require("../../../middlewares/authentication");
const homeController = require("../controllers/home.controller");

// Tất cả routes đều require authentication
router.use(authentication.loginRequired);

/**
 * @route   GET /api/workmanagement/home/summary/:nhanVienId
 * @desc    Lấy summary tổng hợp cho Trang chủ
 * @access  Private
 */
router.get("/summary/:nhanVienId", homeController.getHomeSummary);

/**
 * @route   GET /api/workmanagement/home/urgent/:nhanVienId
 * @desc    Lấy danh sách items cần xử lý gấp (mixed CongViec + YeuCau)
 * @query   limit - Số lượng items (default: 5)
 * @access  Private
 */
router.get("/urgent/:nhanVienId", homeController.getUrgentItems);

/**
 * @route   GET /api/workmanagement/home/activities/:nhanVienId
 * @desc    Lấy hoạt động gần đây (mixed CongViec + YeuCau)
 * @query   limit - Số lượng items (default: 5)
 * @access  Private
 */
router.get("/activities/:nhanVienId", homeController.getRecentActivities);

module.exports = router;
