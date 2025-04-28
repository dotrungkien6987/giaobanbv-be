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

  const validTypes = ['2', '7', '38'];
  if (!validTypes.includes(type.toString())) {
    throw new AppError(400, "Type không hợp lệ, chỉ chấp nhận: 2, 7, 38", "Get SoThuTu Error");
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

module.exports = soThuTuController;