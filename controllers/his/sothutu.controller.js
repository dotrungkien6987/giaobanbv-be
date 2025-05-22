const { sendResponse, catchAsync, AppError } = require("../../helpers/utils");
const soThuTuService = require("../../models/his/soThuTu");
const helpFunction = require("../../helpers/helpfunction");

const soThuTuController = {};

/**
 * Get statistics by type and departments
 */
soThuTuController.getStatsByTypeAndDepartments = catchAsync(async (req, res, next) => {
  const { date, departmentIds, type } = req.body;
    // Validate input parameters
  if (!date || !departmentIds || !Array.isArray(departmentIds) || !type) {
    throw new AppError(400, "Thiếu thông tin: date, departmentIds (array), hoặc type", "Get SoThuTu Error");
  }

  const validTypes = ['2', '3', '7', '38'];
  if (!validTypes.includes(type.toString())) {
    throw new AppError(400, "Type không hợp lệ, chỉ chấp nhận: 2, 3, 7, 38", "Get SoThuTu Error");
  }

  const stats = await soThuTuService.getStatsByTypeAndDepartments(date, departmentIds, type);
  
  return sendResponse(
    res, 
    200, 
    true, 
    stats, 
    null, 
    `Lấy thông tin số thứ tự theo loại ${type} thành công`
  );
});

/**
 * Get all statistics for all types (2, 7, 38) by departments
 */
soThuTuController.getAllStatsByDepartments = catchAsync(async (req, res, next) => {
  const { date, departmentIds } = req.body;
  
  // Validate input parameters
  if (!date || !departmentIds || !Array.isArray(departmentIds)) {
    throw new AppError(400, "Thiếu thông tin: date hoặc departmentIds (array)", "Get SoThuTu Error");
  }
  // Get data for all types
  const [phongKhamStats, phongDieuTriStats, phongThucHienStats, phongLayMauStats] = await Promise.all([
    soThuTuService.getStatsByTypeAndDepartments(date, departmentIds, '2'),
    soThuTuService.getStatsByTypeAndDepartments(date, departmentIds, '3'),
    soThuTuService.getStatsByTypeAndDepartments(date, departmentIds, '7'),
    soThuTuService.getStatsByTypeAndDepartments(date, departmentIds, '38')
  ]);
  
  return sendResponse(
    res, 
    200, 
    true, 
    {
      phongKham: phongKhamStats,
      phongDieuTri: phongDieuTriStats,
      phongThucHien: phongThucHienStats,
      phongLayMau: phongLayMauStats
    }, 
    null, 
    `Lấy tất cả thông tin số thứ tự thành công`
  );
});

/**
 * Get inpatient statistics by departments
 */
soThuTuController.getNoiTruStatsByDepartments = catchAsync(async (req, res, next) => {
  const { date, departmentIds } = req.body;
  
  // Validate input parameters
  if (!date || !departmentIds || !Array.isArray(departmentIds)) {
    throw new AppError(400, "Thiếu thông tin: date hoặc departmentIds (array)", "Get NoiTru SoThuTu Error");
  }

  const stats = await soThuTuService.getStatsByTypeAndDepartments(date, departmentIds, '3');
  
  return sendResponse(
    res, 
    200, 
    true, 
    stats, 
    null, 
    `Lấy thông tin bệnh nhân nội trú thành công`
  );
});

module.exports = soThuTuController;