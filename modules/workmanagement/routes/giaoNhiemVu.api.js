const express = require("express");
const router = express.Router();
const authentication = require("../../../middlewares/authentication");
const ctrl = require("../controllers/giaoNhiemVu.controller");
const assignmentCtrl = require("../controllers/assignment.controller");

// Tất cả endpoint yêu cầu đăng nhập
router.use(authentication.loginRequired);

// ============================================================================
// 🎯 Self-assessment routes (Tự đánh giá KPI)
// ============================================================================

// Get employee assignments by cycle (for self-assessment page)
// GET /api/workmanagement/giao-nhiem-vu?nhanVienId=xxx&chuKyId=xxx
router.get("/", assignmentCtrl.layDanhSachNhiemVu);

// Employee batch self-score assignments
// POST /api/workmanagement/giao-nhiem-vu/tu-cham-diem-batch
// Body: { assignments: [{ assignmentId, DiemTuDanhGia }] }
router.post("/tu-cham-diem-batch", assignmentCtrl.nhanVienTuChamDiemBatch);

// ============================================================================
// 🚀 Cycle-based assignment routes
// ============================================================================

// 🆕 Get employees with cycle stats (for list view)
// GET /api/workmanagement/giao-nhiem-vu/employees-with-cycle-stats?chuKyId=xxx
router.get("/employees-with-cycle-stats", ctrl.getEmployeesWithCycleStats);

// Get assignments by employee and cycle (with available duties)
// GET /api/workmanagement/giao-nhiem-vu/nhan-vien/:employeeId/by-cycle?chuKyId=xxx
router.get("/nhan-vien/:employeeId/by-cycle", ctrl.getAssignmentsByCycle);

// Batch update cycle assignments
// PUT /api/workmanagement/giao-nhiem-vu/nhan-vien/:employeeId/cycle-assignments
// Body: { chuKyId, tasks: [{ NhiemVuThuongQuyID, MucDoKho }] }
router.put(
  "/nhan-vien/:employeeId/cycle-assignments",
  ctrl.batchUpdateCycleAssignments
);

// Copy from previous cycle
// POST /api/workmanagement/giao-nhiem-vu/nhan-vien/:employeeId/copy-cycle
// Body: { fromChuKyId, toChuKyId }
router.post("/nhan-vien/:employeeId/copy-cycle", ctrl.copyFromPreviousCycle);

module.exports = router;
