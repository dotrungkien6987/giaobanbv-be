const { catchAsync, sendResponse } = require("../../../helpers/utils");
const service = require("../services/giaoNhiemVu.service");

const ctrl = {};

// ============================================================================
// 🚀 Cycle-based assignment controllers
// ============================================================================

ctrl.getAssignmentsByCycle = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { chuKyId } = req.query;
  const data = await service.getAssignmentsByCycle(req, employeeId, chuKyId);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy danh sách nhiệm vụ theo chu kỳ thành công"
  );
});

ctrl.batchUpdateCycleAssignments = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { chuKyId, tasks } = req.body;
  const data = await service.batchUpdateCycleAssignments(
    req,
    employeeId,
    chuKyId,
    tasks
  );
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Cập nhật nhiệm vụ theo chu kỳ thành công"
  );
});

ctrl.copyFromPreviousCycle = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { fromChuKyId, toChuKyId } = req.body;
  const data = await service.copyFromPreviousCycle(
    req,
    employeeId,
    fromChuKyId,
    toChuKyId
  );
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    `Đã copy ${data.copiedCount} nhiệm vụ từ chu kỳ trước`
  );
});

/**
 * 🆕 GET EMPLOYEES WITH CYCLE ASSIGNMENT STATS
 * GET /api/workmanagement/giao-nhiem-vu/employees-with-cycle-stats?chuKyId=xxx
 * Purpose: For CycleAssignmentListPage
 */
ctrl.getEmployeesWithCycleStats = catchAsync(async (req, res) => {
  const { chuKyId } = req.query;
  const data = await service.getEmployeesWithCycleStats(req, chuKyId);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy danh sách nhân viên với thống kê phân công thành công"
  );
});

module.exports = ctrl;
