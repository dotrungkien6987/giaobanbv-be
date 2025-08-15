const express = require("express");
const router = express.Router();
const authentication = require("../../../middlewares/authentication");
const nhomViecUserController = require("../controllers/nhomViecUser.controller");

// Tất cả routes đều cần authentication
router.use(authentication.loginRequired);

/**
 * @route GET /api/workmanagement/nhom-viec-user/my-groups
 * @desc Lấy danh sách nhóm việc của người dùng hiện tại
 * @access Private
 */
router.get("/my-groups", nhomViecUserController.getMyNhomViecs);

module.exports = router;
