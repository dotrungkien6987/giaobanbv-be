const express = require('express');
const router = express.Router();
const soThuTuController = require('../../controllers/his/sothutu.controller');
const authentication = require("../../middlewares/authentication");

/**
 * @route POST /api/his/sothutu/stats
 * @description Lấy thống kê số thứ tự theo loại và phòng ban
 * @body {date, departmentIds, type}
 * @access Login required
 */
router.post(
  "/stats", 
  authentication.loginRequired, 
  soThuTuController.getStatsByTypeAndDepartments
);

/**
 * @route POST /api/his/sothutu/all-stats
 * @description Lấy tất cả thống kê số thứ tự cho tất cả loại và phòng ban
 * @body {date, departmentIds}
 * @access Login required
 */
router.post(
  "/all-stats", 
  authentication.loginRequired, 
  soThuTuController.getAllStatsByDepartments
);

/**
 * @route POST /api/his/sothutu/noi-tru
 * @description Lấy thống kê bệnh nhân nội trú theo phòng ban (type=3)
 * @body {date, departmentIds}
 * @access Login required
 */
router.post(
  "/noi-tru",
  authentication.loginRequired,
  soThuTuController.getNoiTruStatsByDepartments
);

module.exports = router;