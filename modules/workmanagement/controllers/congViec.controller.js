const { catchAsync, sendResponse } = require("../../../helpers/utils");
const congViecService = require("../services/congViec.service");
const { catchAsync: _catchAsync } = require("../../../helpers/utils");

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

  const congViec = await congViecService.getCongViecDetail(id, req);

  return sendResponse(
    res,
    200,
    true,
    congViec,
    null,
    "Lấy chi tiết công việc thành công"
  );
});

// Tạo subtask: POST /congviec/:id/subtasks
controller.createSubtask = catchAsync(async (req, res) => {
  const { id } = req.params; // parent id
  const data = { ...req.body };
  // Force parent binding server-side
  const dto = await congViecService.createSubtask(id, data, req);
  return sendResponse(
    res,
    201,
    true,
    dto,
    null,
    "Tạo công việc con thành công"
  );
});

// List children: GET /congviec/:id/children
controller.listChildrenCongViec = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const p = Math.max(1, parseInt(page) || 1);
  const l = Math.min(100, Math.max(1, parseInt(limit) || 50));
  const items = await congViecService.listChildren(id, p, l, req);
  return sendResponse(
    res,
    200,
    true,
    items,
    null,
    "Lấy danh sách công việc con thành công"
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
    { ...newCongViec, updatedAt: newCongViec.updatedAt },
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
    { ...updatedCongViec, updatedAt: updatedCongViec.updatedAt },
    null,
    "Cập nhật công việc thành công"
  );
});

/**
 * Cập nhật tiến độ & ghi lịch sử
 * POST /api/workmanagement/congviec/:id/progress
 */
controller.updateProgress = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { value, ghiChu, expectedVersion } = req.body || {};
  const dto = await congViecService.updateProgress(
    id,
    { value, ghiChu, expectedVersion },
    req
  );
  const wantFull = String(req.query.full || "") === "1";
  if (wantFull) {
    return sendResponse(
      res,
      200,
      true,
      dto,
      null,
      "Cập nhật tiến độ thành công"
    );
  }
  // Build minimal patch + last progress entry append
  const patch = {
    _id: dto._id,
    PhanTramTienDoTong: dto.PhanTramTienDoTong,
    updatedAt: dto.updatedAt,
  };
  if (dto.TrangThai === "HOAN_THANH") {
    patch.TrangThai = dto.TrangThai;
    if (dto.NgayHoanThanh) patch.NgayHoanThanh = dto.NgayHoanThanh;
  }
  const lastEntry = Array.isArray(dto.LichSuTienDo)
    ? dto.LichSuTienDo[dto.LichSuTienDo.length - 1]
    : null;
  const payload = {
    patch,
    lastProgressEntry: lastEntry,
    autoCompleted: !!dto._progressAutoCompleted,
  };
  return sendResponse(
    res,
    200,
    true,
    payload,
    null,
    "Cập nhật tiến độ thành công"
  );
});

/**
 * Thêm bình luận vào công việc
 * POST /api/workmanagement/congviec/:id/comment
 */
controller.addComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { NoiDung, parentId } = req.body;

  const comment = await congViecService.addComment(
    id,
    NoiDung,
    req,
    parentId || null
  );

  return sendResponse(
    res,
    201,
    true,
    comment,
    null,
    "Thêm bình luận thành công"
  );
});

/**
 * Thu hồi bình luận (soft delete + thu hồi file đính kèm)
 * DELETE /api/workmanagement/binhluan/:id
 */
controller.deleteComment = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const result = await congViecService.deleteComment(id, req);
  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Thu hồi bình luận thành công"
  );
});

/**
 * Thu hồi nội dung (text) của bình luận, không đụng tới file
 * PATCH /api/workmanagement/binhluan/:id/text
 */
controller.recallCommentText = catchAsync(async (req, res) => {
  const { id } = req.params;
  const dto = await congViecService.recallCommentText(id, req);
  return sendResponse(
    res,
    200,
    true,
    dto,
    null,
    "Thu hồi nội dung bình luận thành công"
  );
});

/**
 * Lấy danh sách trả lời của bình luận
 * GET /api/workmanagement/binhluan/:id/replies
 */
controller.listReplies = catchAsync(async (req, res) => {
  const { id } = req.params;
  const items = await congViecService.listReplies(id, req);
  return sendResponse(
    res,
    200,
    true,
    items,
    null,
    "Lấy danh sách trả lời thành công"
  );
});

/**
 * Cập nhật ghi chú của một dòng lịch sử trạng thái
 * PUT /api/workmanagement/congviec/:id/history/:index/note
 */
controller.updateHistoryNote = catchAsync(async (req, res) => {
  const { id, index } = req.params;
  const { note } = req.body || {};
  const idx = parseInt(index, 10);
  if (Number.isNaN(idx)) {
    return sendResponse(
      res,
      400,
      false,
      null,
      "INVALID_INDEX",
      "Index không hợp lệ"
    );
  }
  const updated = await congViecService.updateLichSuTrangThaiNote(
    id,
    idx,
    note || "",
    req.nhanVienId || req.userId
  );
  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Cập nhật ghi chú lịch sử thành công"
  );
});

// Cập nhật ghi chú lịch sử tiến độ
controller.updateProgressHistoryNote = catchAsync(async (req, res) => {
  const { id, index } = req.params;
  const { note } = req.body || {};
  const idx = parseInt(index, 10);
  if (Number.isNaN(idx)) {
    return sendResponse(
      res,
      400,
      false,
      null,
      "INVALID_INDEX",
      "Index không hợp lệ"
    );
  }
  const updated = await congViecService.updateLichSuTienDoNote(
    id,
    idx,
    note || "",
    req.nhanVienId || req.userId
  );
  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Cập nhật ghi chú lịch sử tiến độ thành công"
  );
});

// Tree root: GET /api/workmanagement/congviec/:id/tree-root
controller.getTreeRoot = catchAsync(async (req, res) => {
  const { id } = req.params;
  const root = await congViecService.getTreeRoot(id);
  const children = await congViecService.getTreeChildren(id, req);
  return sendResponse(
    res,
    200,
    true,
    { root, children },
    null,
    "Lấy cây công việc gốc thành công"
  );
});

// Full tree from any node: GET /api/workmanagement/congviec/:id/full-tree
controller.getFullTree = catchAsync(async (req, res) => {
  const { id } = req.params;
  // Find ancestor root
  const ancestorRoot = await congViecService.findRootNode(id);
  const children = await congViecService.getTreeChildren(ancestorRoot._id, req);
  return sendResponse(
    res,
    200,
    true,
    { root: ancestorRoot, children },
    null,
    "Lấy cây đầy đủ từ root tổ tiên thành công"
  );
});

// Ancestors chain: GET /api/workmanagement/congviec/:id/ancestors
// (ĐÃ BỎ) getAncestors endpoint không còn được FE sử dụng – giữ comment để tránh gọi nhầm
// controller.getAncestors = catchAsync(async (req, res) => { ... });

// Tree children: GET /api/workmanagement/congviec/:id/tree-children
controller.getTreeChildren = catchAsync(async (req, res) => {
  const { id } = req.params;
  const children = await congViecService.getTreeChildren(id, req);
  return sendResponse(
    res,
    200,
    true,
    { parentId: id, children },
    null,
    "Lấy danh sách con thành công"
  );
});

/**
 * Get dashboard metrics for a NhiemVuThuongQuy during KPI evaluation
 * GET /api/workmanagement/congviec/dashboard-by-nhiemvu
 * Query: nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID
 */
controller.getDashboardByNhiemVu = catchAsync(async (req, res, next) => {
  const { nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID } = req.query;

  const dashboardData = await congViecService.getDashboardByNhiemVu({
    nhiemVuThuongQuyID,
    nhanVienID,
    chuKyDanhGiaID,
  });

  return sendResponse(
    res,
    200,
    true,
    dashboardData,
    null,
    "Lấy dashboard công việc thành công"
  );
});

/**
 * Get summary of "other" tasks (FlagNVTQKhac=true)
 * @route GET /api/workmanagement/congviec/summary-other-tasks
 * @query {String} nhanVienID - Employee ID (required)
 * @query {String} chuKyDanhGiaID - Evaluation cycle ID (required)
 * @access Private
 */
controller.getOtherTasksSummary = catchAsync(async (req, res) => {
  const { nhanVienID, chuKyDanhGiaID } = req.query;

  // Validate query params
  if (!nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Thiếu nhanVienID hoặc chuKyDanhGiaID trong query",
      "MISSING_PARAMS"
    );
  }

  // Call service method
  const data = await congViecService.getOtherTasksSummary(
    nhanVienID,
    chuKyDanhGiaID
  );

  // Send response
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy tóm tắt công việc khác thành công"
  );
});

/**
 * Get summary of collaboration tasks (VaiTro=PHOI_HOP)
 * @route GET /api/workmanagement/congviec/summary-collab-tasks
 * @query {String} nhanVienID - Employee ID (required)
 * @query {String} chuKyDanhGiaID - Evaluation cycle ID (required)
 * @access Private
 */
controller.getCollabTasksSummary = catchAsync(async (req, res) => {
  const { nhanVienID, chuKyDanhGiaID } = req.query;

  // Validate query params
  if (!nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Thiếu nhanVienID hoặc chuKyDanhGiaID trong query",
      "MISSING_PARAMS"
    );
  }

  // Call service method
  const data = await congViecService.getCollabTasksSummary(
    nhanVienID,
    chuKyDanhGiaID
  );

  // Send response
  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy tóm tắt công việc phối hợp thành công"
  );
});

module.exports = controller;
/** Flow actions (LEGACY – will be deprecated after unified transition completes) **/
// @deprecated Use POST /congviec/:id/transition instead. Retained temporarily for backward compatibility.
// Giao việc
controller.giaoViec = catchAsync(async (req, res) => {
  const { id } = req.params;
  console.warn(
    "[DEPRECATED] POST /congviec/:id/giao-viec – use /congviec/:id/transition {action:GIAO_VIEC}"
  );
  const dto = await congViecService.giaoViec(id, req.body || {}, req);
  return sendResponse(res, 200, true, dto, null, "Đã giao việc");
});
// Tiếp nhận
controller.tiepNhan = catchAsync(async (req, res) => {
  const { id } = req.params;
  console.warn(
    "[DEPRECATED] POST /congviec/:id/tiep-nhan – use /congviec/:id/transition {action:TIEP_NHAN}"
  );
  const dto = await congViecService.tiepNhan(id, req);
  return sendResponse(res, 200, true, dto, null, "Đã tiếp nhận công việc");
});
// Hoàn thành (chuyển CHO_DUYET)
controller.hoanThanh = catchAsync(async (req, res) => {
  const { id } = req.params;
  console.warn(
    "[DEPRECATED] POST /congviec/:id/hoan-thanh – use /congviec/:id/transition {action:HOAN_THANH(_TAM)}"
  );
  const dto = await congViecService.hoanThanh(id, req);
  return sendResponse(res, 200, true, dto, null, "Đã chuyển chờ duyệt");
});
// Duyệt hoàn thành
controller.duyetHoanThanh = catchAsync(async (req, res) => {
  const { id } = req.params;
  console.warn(
    "[DEPRECATED] POST /congviec/:id/duyet-hoan-thanh – use /congviec/:id/transition {action:DUYET_HOAN_THANH}"
  );
  const dto = await congViecService.duyetHoanThanh(id, req);
  return sendResponse(res, 200, true, dto, null, "Đã duyệt hoàn thành");
});

// Unified transition (new flow)
controller.transition = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { action, lyDo, ghiChu } = req.body || {};
  const dto = await congViecService.transition(
    id,
    { action, lyDo, ghiChu },
    req
  );
  // Build patch response (Step 4 optimization). If ?full=1 present -> include full object.
  const wantFull = String(req.query.full || "") === "1";
  const full = dto?.congViec;
  let patch = null;
  if (full) {
    patch = {
      _id: full._id,
      TrangThai: full.TrangThai,
    };
    const candidateFields = [
      "NgayHoanThanh",
      "NgayHoanThanhTam",
      "NgayGiaoViec",
      "NgayCanhBao",
      "SoGioTre",
      "HoanThanhTreHan",
    ];
    candidateFields.forEach((f) => {
      if (Object.prototype.hasOwnProperty.call(full, f) && full[f] != null)
        patch[f] = full[f];
    });
  }
  const payload = wantFull
    ? { action: dto.action, patch, congViec: full }
    : { action: dto.action, patch };
  if (full && !patch.updatedAt && full.updatedAt) {
    patch.updatedAt = full.updatedAt;
  }
  return sendResponse(
    res,
    200,
    true,
    payload,
    null,
    "Thao tác trạng thái thành công"
  );
});
