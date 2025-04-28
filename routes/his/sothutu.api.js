const express = require('express');
const router = express.Router();
const soThuTuController = require('../../controllers/his/soThuTu.controller');
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

module.exports = router;