const { catchAsync, sendResponse } = require("../../../helpers/utils");
const service = require("../services/giaoNhiemVu.service");

const ctrl = {};

ctrl.getManagedEmployees = catchAsync(async (req, res) => {
  const { NhanVienID } = req.params;
  const { loaiQuanLy } = req.query;
  const data = await service.getManagedEmployees(req, NhanVienID, loaiQuanLy);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy danh sách nhân viên được quản lý thành công"
  );
});

ctrl.getDutiesByEmployee = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const data = await service.getDutiesByEmployee(req, employeeId);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy nhiệm vụ theo khoa thành công"
  );
});

ctrl.getAssignmentsByEmployee = catchAsync(async (req, res) => {
  const { NhanVienID } = req.query;
  const data = await service.getAssignmentsByEmployee(req, NhanVienID);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy nhiệm vụ đã gán thành công"
  );
});

ctrl.getAssignmentTotals = catchAsync(async (req, res) => {
  const { NhanVienIDs } = req.query; // comma-separated or array
  const selectedOnly = req.query.selectedOnly === "true";
  const data = await service.getAssignmentTotals(
    req,
    NhanVienIDs,
    selectedOnly
  );
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Tổng hợp mức độ khó theo nhân viên thành công"
  );
});

ctrl.assignOne = catchAsync(async (req, res) => {
  const { NhanVienID, NhiemVuThuongQuyID, MucDoKho } = req.body;
  const data = await service.assignOne(
    req,
    NhanVienID,
    NhiemVuThuongQuyID,
    MucDoKho
  );
  return sendResponse(res, 201, true, data, null, "Gán nhiệm vụ thành công");
});

ctrl.bulkAssign = catchAsync(async (req, res) => {
  const { NhanVienIDs, NhiemVuThuongQuyIDs } = req.body;
  const data = await service.bulkAssign(req, NhanVienIDs, NhiemVuThuongQuyIDs);
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Gán nhiệm vụ hàng loạt thành công"
  );
});

ctrl.unassignById = catchAsync(async (req, res) => {
  const { assignmentId } = req.params;
  const data = await service.unassignById(req, assignmentId);
  return sendResponse(res, 200, true, data, null, "Gỡ gán nhiệm vụ thành công");
});

ctrl.unassignByPair = catchAsync(async (req, res) => {
  const { NhanVienID, NhiemVuThuongQuyID } = req.query;
  const data = await service.unassignByPair(
    req,
    NhanVienID,
    NhiemVuThuongQuyID
  );
  return sendResponse(res, 200, true, data, null, "Gỡ gán nhiệm vụ thành công");
});

ctrl.batchUpdateEmployeeAssignments = catchAsync(async (req, res) => {
  const { employeeId } = req.params;
  const { dutyIds } = req.body;
  const data = await service.batchUpdateEmployeeAssignments(
    req,
    employeeId,
    dutyIds
  );
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Cập nhật nhiệm vụ thành công"
  );
});

// ============================================================================
// 🚀 NEW: Cycle-based assignment controllers
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
