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
  const { NhanVienID, NhiemVuThuongQuyID } = req.body;
  const data = await service.assignOne(req, NhanVienID, NhiemVuThuongQuyID);
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

module.exports = ctrl;
