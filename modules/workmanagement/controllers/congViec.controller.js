const { catchAsync, sendResponse } = require("../../../helpers/utils");
const congViecService = require("../services/congViec.service");

const controller = {};

/**
 * Lấy thông tin nhân viên theo ID
 * GET /api/workmanagement/nhanvien/:nhanvienid
 */
controller.getNhanVien = catchAsync(async (req, res, next) => {
  const { nhanvienid } = req.params;

  const nhanvien = await congViecService.getNhanVienById(nhanvienid);

  return sendResponse(
    res,
    200,
    true,
    nhanvien,
    null,
    "Lấy thông tin nhân viên thành công"
  );
});

/**
 * Lấy công việc mà nhân viên là người xử lý chính
 * GET /api/workmanagement/congviec/:nhanvienid/received
 */
controller.getReceivedCongViecs = catchAsync(async (req, res, next) => {
  const { nhanvienid } = req.params;
  const {
    page = 1,
    limit = 10,
    search,
    TrangThai,
    MucDoUuTien,
    NgayBatDau,
    NgayHetHan,
    MaCongViec,
    NguoiChinhID,
  } = req.query;

  // Validate pagination with proper NaN handling
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 items per page

  // Debug log to check values
  console.log("Pagination values:", {
    originalPage: page,
    originalLimit: limit,
    pageNum,
    limitNum,
    skipValue: (pageNum - 1) * limitNum,
  });

  const filters = {
    search,
    TrangThai,
    MucDoUuTien,
    NgayBatDau,
    NgayHetHan,
    MaCongViec,
    NguoiChinhID,
  };

  // Remove undefined/empty filters
  Object.keys(filters).forEach((key) => {
    if (!filters[key]) {
      delete filters[key];
    }
  });

  const result = await congViecService.getReceivedCongViecs(
    nhanvienid,
    filters,
    pageNum,
    limitNum
  );

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách công việc được giao thành công"
  );
});

/**
 * Lấy công việc mà nhân viên là người giao việc
 * GET /api/workmanagement/congviec/:nhanvienid/assigned
 */
controller.getAssignedCongViecs = catchAsync(async (req, res, next) => {
  const { nhanvienid } = req.params;
  const {
    page = 1,
    limit = 10,
    search,
    TrangThai,
    MucDoUuTien,
    NgayBatDau,
    NgayHetHan,
    MaCongViec,
    NguoiChinhID,
  } = req.query;

  // Validate pagination with proper NaN handling
  const pageNum = Math.max(1, parseInt(page) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 10)); // Max 100 items per page

  // Debug log to check values
  console.log("Assigned Pagination values:", {
    originalPage: page,
    originalLimit: limit,
    pageNum,
    limitNum,
    skipValue: (pageNum - 1) * limitNum,
  });

  const filters = {
    search,
    TrangThai,
    MucDoUuTien,
    NgayBatDau,
    NgayHetHan,
    MaCongViec,
    NguoiChinhID,
  };

  // Remove undefined/empty filters
  Object.keys(filters).forEach((key) => {
    if (!filters[key]) {
      delete filters[key];
    }
  });

  const result = await congViecService.getAssignedCongViecs(
    nhanvienid,
    filters,
    pageNum,
    limitNum
  );

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách công việc đã giao thành công"
  );
});

/**
 * Xóa công việc (soft delete)
 * DELETE /api/workmanagement/congviec/:id
 */
controller.deleteCongViec = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const result = await congViecService.deleteCongViec(id, req);

  return sendResponse(
    res,
    200,
    true,
    result.meta || null,
    null,
    result.message
  );
});

/**
 * Lấy chi tiết công việc theo ID
 * GET /api/workmanagement/congviec/detail/:id
 */
controller.getCongViecDetail = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const congViec = await congViecService.getCongViecDetail(id);

  return sendResponse(
    res,
    200,
    true,
    congViec,
    null,
    "Lấy chi tiết công việc thành công"
  );
});

/**
 * Tạo công việc mới
 * POST /api/workmanagement/congviec
 */
controller.createCongViec = catchAsync(async (req, res, next) => {
  const congViecData = req.body;

  const newCongViec = await congViecService.createCongViec(congViecData, req);

  return sendResponse(
    res,
    201,
    true,
    newCongViec,
    null,
    "Tạo công việc thành công"
  );
});

/**
 * Cập nhật công việc
 * PUT /api/workmanagement/congviec/:id
 */
controller.updateCongViec = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  const updatedCongViec = await congViecService.updateCongViec(
    id,
    updateData,
    req
  );

  return sendResponse(
    res,
    200,
    true,
    updatedCongViec,
    null,
    "Cập nhật công việc thành công"
  );
});

/**
 * Thêm bình luận vào công việc
 * POST /api/workmanagement/congviec/:id/comment
 */
controller.addComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { NoiDung } = req.body;

  const comment = await congViecService.addComment(id, NoiDung, req);

  return sendResponse(
    res,
    201,
    true,
    comment,
    null,
    "Thêm bình luận thành công"
  );
});

module.exports = controller;
