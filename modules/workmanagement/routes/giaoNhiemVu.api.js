const express = require("express");
const router = express.Router();
const authentication = require("../../../middlewares/authentication");
const ctrl = require("../controllers/giaoNhiemVu.controller");

// Tất cả endpoint yêu cầu đăng nhập
router.use(authentication.loginRequired);

// Danh sách nhân viên thuộc quyền quản lý của một người quản lý
router.get("/:NhanVienID/nhan-vien", ctrl.getManagedEmployees);

// Danh sách nhiệm vụ theo khoa của một nhân viên
router.get("/nhan-vien/:employeeId/nhiem-vu", ctrl.getDutiesByEmployee);

// Danh sách assignment của một nhân viên
router.get("/assignments", ctrl.getAssignmentsByEmployee);

// Gán 1 nhiệm vụ
router.post("/assignments", ctrl.assignOne);

// Gán hàng loạt
router.post("/assignments/bulk", ctrl.bulkAssign);

// Gỡ gán theo id
router.delete("/assignments/:assignmentId", ctrl.unassignById);

// Gỡ gán theo cặp
router.delete("/assignments", ctrl.unassignByPair);

module.exports = router;
