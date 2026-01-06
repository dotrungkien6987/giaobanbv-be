/**
 * @fileoverview API routes cho Dịch Vụ Trùng (Duplicate Services Detection)
 * @module routes/his/dichvutrung.api
 */

const express = require("express");
const router = express.Router();
const dichVuTrungController = require("../../controllers/his/dichvutrung.controller");
const authentication = require("../../middlewares/authentication");

/**
 * @route POST /api/his/dichvutrung/duplicates
 * @desc Lấy danh sách dịch vụ trùng lặp với phân trang
 * @body {fromDate, toDate, serviceTypes, page, limit}
 * @access Private - Requires DICHVUTRUNG permission
 */
router.post(
  "/duplicates",
  authentication.loginRequired,
  dichVuTrungController.getDuplicates
);

/**
 * @route POST /api/his/dichvutrung/statistics
 * @desc Lấy thống kê tổng quan về dịch vụ trùng lặp
 * @body {fromDate, toDate, serviceTypes}
 * @access Private - Requires DICHVUTRUNG permission
 */
router.post(
  "/statistics",
  authentication.loginRequired,
  dichVuTrungController.getStatistics
);

/**
 * @route POST /api/his/dichvutrung/top-services
 * @desc Lấy danh sách top dịch vụ trùng lặp nhiều nhất
 * @body {fromDate, toDate, serviceTypes, limit}
 * @access Private - Requires DICHVUTRUNG permission
 */
router.post(
  "/top-services",
  authentication.loginRequired,
  dichVuTrungController.getTopServices
);

module.exports = router;
