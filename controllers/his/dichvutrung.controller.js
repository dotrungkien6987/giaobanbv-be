/**
 * @fileoverview Controller cho Dịch Vụ Trùng (Duplicate Services Detection)
 * @module controllers/his/dichvutrung.controller
 */

const { catchAsync, sendResponse, AppError } = require("../../helpers/utils");
const DichVuTrungService = require("../../models/his/dichvutrung");
const dayjs = require("dayjs");

const dichVuTrungController = {};

/**
 * @route POST /api/his/dichvutrung/export-all
 * @desc Lấy TOÀN BỘ dữ liệu dịch vụ trùng lặp (không phân trang) để export
 * @access Private (DICHVUTRUNG permission)
 */
dichVuTrungController.exportAllDuplicates = catchAsync(
  async (req, res, next) => {
    const {
      fromDate,
      toDate,
      serviceTypes,
      filterByService,
      filterByDepartment,
      searchText,
    } = req.body;

    // Validate required fields
    if (!fromDate || !toDate) {
      throw new AppError(
        400,
        "fromDate và toDate là bắt buộc",
        "MISSING_REQUIRED_FIELDS"
      );
    }

    // Validate date format (YYYY-MM-DD)
    const fromDateObj = dayjs(fromDate, "YYYY-MM-DD", true);
    const toDateObj = dayjs(toDate, "YYYY-MM-DD", true);

    if (!fromDateObj.isValid() || !toDateObj.isValid()) {
      throw new AppError(
        400,
        "Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD",
        "INVALID_DATE_FORMAT"
      );
    }

    if (toDateObj.isBefore(fromDateObj)) {
      throw new AppError(
        400,
        "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
        "INVALID_DATE_RANGE"
      );
    }

    // Validate date range (<= 60 days)
    const daysDiff = toDateObj.diff(fromDateObj, "day");
    if (daysDiff > 60) {
      throw new AppError(
        400,
        "Khoảng thời gian tìm kiếm không được vượt quá 60 ngày",
        "DATE_RANGE_TOO_LARGE"
      );
    }

    // Validate & sanitize serviceTypes array
    const validServiceTypes = ["04CDHA", "03XN", "05TDCN"];
    let typesToQuery = serviceTypes || validServiceTypes;

    if (!Array.isArray(typesToQuery)) {
      throw new AppError(
        400,
        "serviceTypes phải là một mảng",
        "INVALID_SERVICE_TYPES_FORMAT"
      );
    }

    // Filter invalid service types
    typesToQuery = typesToQuery.filter((type) =>
      validServiceTypes.includes(type)
    );

    if (typesToQuery.length === 0) {
      throw new AppError(
        400,
        "serviceTypes phải chứa ít nhất một loại hợp lệ: 04CDHA, 03XN, 05TDCN",
        "EMPTY_SERVICE_TYPES"
      );
    }

    // Fetch ALL data (no pagination) - Giới hạn tối đa 10000 để tránh quá tải
    const duplicates = await DichVuTrungService.findDuplicateServices(
      fromDate,
      toDate,
      typesToQuery,
      10000, // Limit cao để lấy hầu hết data
      0,
      filterByService || null,
      filterByDepartment || null,
      searchText || null
    );

    return sendResponse(
      res,
      200,
      true,
      {
        duplicates,
        total: duplicates.length,
      },
      null,
      `Đã lấy ${duplicates.length} bản ghi để export`
    );
  }
);

/**
 * @route POST /api/his/dichvutrung/duplicates
 * @desc Lấy danh sách dịch vụ trùng lặp với phân trang
 * @access Private (DICHVUTRUNG permission)
 */
dichVuTrungController.getDuplicates = catchAsync(async (req, res, next) => {
  // 1. Validate & sanitize inputs
  const {
    fromDate,
    toDate,
    serviceTypes,
    page = 1,
    limit = 50,
    filterByService,
    filterByDepartment,
    searchText,
  } = req.body;

  // Validate required fields
  if (!fromDate || !toDate) {
    throw new AppError(
      400,
      "fromDate và toDate là bắt buộc",
      "MISSING_REQUIRED_FIELDS"
    );
  }

  // Validate date format (YYYY-MM-DD)
  const fromDateObj = dayjs(fromDate, "YYYY-MM-DD", true);
  const toDateObj = dayjs(toDate, "YYYY-MM-DD", true);

  if (!fromDateObj.isValid() || !toDateObj.isValid()) {
    throw new AppError(
      400,
      "Định dạng ngày không hợp lệ. Vui lòng sử dụng YYYY-MM-DD",
      "INVALID_DATE_FORMAT"
    );
  }

  if (toDateObj.isBefore(fromDateObj)) {
    throw new AppError(
      400,
      "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
      "INVALID_DATE_RANGE"
    );
  }

  // Validate date range (<= 60 days)
  const daysDiff = toDateObj.diff(fromDateObj, "day");
  if (daysDiff > 60) {
    throw new AppError(
      400,
      "Khoảng thời gian tìm kiếm không được vượt quá 60 ngày",
      "DATE_RANGE_TOO_LARGE"
    );
  }

  // Validate & sanitize serviceTypes array
  const validServiceTypes = ["04CDHA", "03XN", "05TDCN"];
  let typesToQuery = serviceTypes || validServiceTypes;

  if (!Array.isArray(typesToQuery)) {
    throw new AppError(
      400,
      "serviceTypes phải là một mảng",
      "INVALID_SERVICE_TYPES_FORMAT"
    );
  }

  // Filter invalid service types
  typesToQuery = typesToQuery.filter((type) =>
    validServiceTypes.includes(type)
  );

  if (typesToQuery.length === 0) {
    throw new AppError(
      400,
      "serviceTypes phải chứa ít nhất một loại hợp lệ: 04CDHA, 03XN, 05TDCN",
      "EMPTY_SERVICE_TYPES"
    );
  }

  // Validate pagination
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    throw new AppError(400, "page phải là số nguyên dương", "INVALID_PAGE");
  }

  if (isNaN(limitNum) || limitNum < 1 || limitNum > 200) {
    throw new AppError(
      400,
      "limit phải là số nguyên từ 1-200",
      "INVALID_LIMIT"
    );
  }

  // 2. Calculate offset
  const offset = (pageNum - 1) * limitNum;

  // 3. Fetch data from model
  const [duplicates, total] = await Promise.all([
    DichVuTrungService.findDuplicateServices(
      fromDate,
      toDate,
      typesToQuery,
      limitNum,
      offset,
      filterByService || null,
      filterByDepartment || null,
      searchText || null
    ),
    DichVuTrungService.countDuplicates(
      fromDate,
      toDate,
      typesToQuery,
      filterByService || null,
      filterByDepartment || null,
      searchText || null
    ),
  ]);

  // 4. Calculate metadata
  const totalPages = Math.ceil(total / limitNum);

  // 5. Send response
  return sendResponse(
    res,
    200,
    true,
    {
      duplicates,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages,
        hasMore: pageNum < totalPages,
      },
    },
    null,
    "Lấy danh sách dịch vụ trùng lặp thành công"
  );
});

/**
 * @route POST /api/his/dichvutrung/statistics
 * @desc Tính toán thống kê dịch vụ trùng lặp
 * @access Private (DICHVUTRUNG permission)
 */
dichVuTrungController.getStatistics = catchAsync(async (req, res, next) => {
  // 1. Validate inputs (reuse same logic as getDuplicates)
  const { fromDate, toDate, serviceTypes } = req.body;

  if (!fromDate || !toDate) {
    throw new AppError(
      400,
      "fromDate và toDate là bắt buộc",
      "MISSING_REQUIRED_FIELDS"
    );
  }

  const fromDateObj = dayjs(fromDate, "YYYY-MM-DD", true);
  const toDateObj = dayjs(toDate, "YYYY-MM-DD", true);

  if (!fromDateObj.isValid() || !toDateObj.isValid()) {
    throw new AppError(
      400,
      "Định dạng ngày không hợp lệ",
      "INVALID_DATE_FORMAT"
    );
  }

  if (toDateObj.isBefore(fromDateObj)) {
    throw new AppError(
      400,
      "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu",
      "INVALID_DATE_RANGE"
    );
  }

  const daysDiff = toDateObj.diff(fromDateObj, "day");
  if (daysDiff > 60) {
    throw new AppError(
      400,
      "Khoảng thời gian không được vượt quá 60 ngày",
      "DATE_RANGE_TOO_LARGE"
    );
  }

  const validServiceTypes = ["04CDHA", "03XN", "05TDCN"];
  let typesToQuery = serviceTypes || validServiceTypes;

  if (!Array.isArray(typesToQuery)) {
    throw new AppError(
      400,
      "serviceTypes phải là một mảng",
      "INVALID_SERVICE_TYPES_FORMAT"
    );
  }

  typesToQuery = typesToQuery.filter((type) =>
    validServiceTypes.includes(type)
  );

  if (typesToQuery.length === 0) {
    throw new AppError(
      400,
      "serviceTypes phải chứa ít nhất một loại hợp lệ",
      "EMPTY_SERVICE_TYPES"
    );
  }

  // 2. Fetch aggregated data
  const [total, topServices, topDepartments] = await Promise.all([
    DichVuTrungService.countDuplicates(fromDate, toDate, typesToQuery),
    DichVuTrungService.getTopServices(fromDate, toDate, typesToQuery, 5),
    DichVuTrungService.getTopDepartments(fromDate, toDate, typesToQuery, 5),
  ]);

  // 3. Calculate affected patients (from topServices or separate query)
  // Vì topServices đã có affected_patients, ta tính tổng
  const affectedPatients = topServices.reduce(
    (sum, service) => sum + parseInt(service.affected_patients || 0, 10),
    0
  );

  // 4. Calculate total cost
  const totalCost = topServices.reduce(
    (sum, service) => sum + parseFloat(service.total_cost || 0),
    0
  );

  // 5. Send response
  return sendResponse(
    res,
    200,
    true,
    {
      totalDuplicates: total,
      affectedPatients,
      totalCost,
      topServices,
      topDepartments,
    },
    null,
    "Tính toán thống kê thành công"
  );
});

/**
 * @route POST /api/his/dichvutrung/top-services
 * @desc Lấy danh sách top dịch vụ trùng lặp nhiều nhất
 * @access Private (DICHVUTRUNG permission)
 */
dichVuTrungController.getTopServices = catchAsync(async (req, res, next) => {
  const { fromDate, toDate, serviceTypes, limit = 5 } = req.body;

  // Validate inputs
  if (!fromDate || !toDate) {
    throw new AppError(
      400,
      "fromDate và toDate là bắt buộc",
      "MISSING_REQUIRED_FIELDS"
    );
  }

  const fromDateObj = dayjs(fromDate, "YYYY-MM-DD", true);
  const toDateObj = dayjs(toDate, "YYYY-MM-DD", true);

  if (!fromDateObj.isValid() || !toDateObj.isValid()) {
    throw new AppError(
      400,
      "Định dạng ngày không hợp lệ",
      "INVALID_DATE_FORMAT"
    );
  }

  const validServiceTypes = ["04CDHA", "03XN", "05TDCN"];
  let typesToQuery = serviceTypes || validServiceTypes;

  if (!Array.isArray(typesToQuery)) {
    throw new AppError(
      400,
      "serviceTypes phải là một mảng",
      "INVALID_SERVICE_TYPES_FORMAT"
    );
  }

  typesToQuery = typesToQuery.filter((type) =>
    validServiceTypes.includes(type)
  );

  if (typesToQuery.length === 0) {
    throw new AppError(
      400,
      "serviceTypes phải chứa ít nhất một loại hợp lệ",
      "EMPTY_SERVICE_TYPES"
    );
  }

  const limitNum = parseInt(limit, 10);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 20) {
    throw new AppError(400, "limit phải là số nguyên từ 1-20", "INVALID_LIMIT");
  }

  // Fetch top services
  const topServices = await DichVuTrungService.getTopServices(
    fromDate,
    toDate,
    typesToQuery,
    limitNum
  );

  return sendResponse(
    res,
    200,
    true,
    { topServices },
    null,
    "Lấy danh sách top dịch vụ thành công"
  );
});

module.exports = dichVuTrungController;
