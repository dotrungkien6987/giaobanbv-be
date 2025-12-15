const { catchAsync, sendResponse } = require("../../../helpers/utils");
const fileService = require("../services/file.service");

const controller = {};

controller.uploadForTask = catchAsync(async (req, res) => {
  const { congViecId } = req.params;
  const { moTa } = req.body || {};
  const dtos = await fileService.uploadForTask(
    congViecId,
    req.files || [],
    { moTa },
    req
  );
  return sendResponse(res, 201, true, dtos, null, "Tải tệp thành công");
});

controller.createCommentWithFiles = catchAsync(async (req, res) => {
  const { congViecId } = req.params;
  const { noiDung, parentId } = req.body || {};
  const result = await fileService.createCommentWithFiles(
    congViecId,
    noiDung,
    req.files || [],
    req,
    parentId || null
  );
  return sendResponse(
    res,
    201,
    true,
    result,
    null,
    "Tạo bình luận kèm tệp thành công"
  );
});

controller.listByTask = catchAsync(async (req, res) => {
  const { congViecId } = req.params;
  const { page = 1, size = 50 } = req.query;
  const result = await fileService.listByTask(congViecId, { page, size }, req);
  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách tệp thành công"
  );
});

controller.listByComment = catchAsync(async (req, res) => {
  const { binhLuanId } = req.params;
  const items = await fileService.listByComment(binhLuanId, req);
  return sendResponse(
    res,
    200,
    true,
    items,
    null,
    "Lấy danh sách tệp theo bình luận thành công"
  );
});

controller.countByTask = catchAsync(async (req, res) => {
  const { congViecId } = req.params;
  const total = await fileService.countByTask(congViecId, req);
  return sendResponse(res, 200, true, { total }, null, "Đếm tệp thành công");
});

controller.deleteFile = catchAsync(async (req, res) => {
  const { id } = req.params;
  const dto = await fileService.softDelete(id, req);
  return sendResponse(res, 200, true, dto, null, "Xóa tệp thành công");
});

controller.renameOrUpdateDesc = catchAsync(async (req, res) => {
  const { id } = req.params;
  const dto = await fileService.renameOrUpdateDesc(id, req.body || {}, req);
  return sendResponse(res, 200, true, dto, null, "Cập nhật tệp thành công");
});

controller.streamInline = catchAsync(async (req, res) => {
  const { id } = req.params;
  const stream = await fileService.streamInline(id, req, res);
  stream.pipe(res);
});

controller.streamDownload = catchAsync(async (req, res) => {
  const { id } = req.params;
  const stream = await fileService.streamDownload(id, req, res);
  stream.pipe(res);
});

// ═══════════════════════════════════════════════════════════════
// 🔓 THUMBNAIL - Public endpoint (không cần auth)
// ═══════════════════════════════════════════════════════════════
controller.streamThumbnail = catchAsync(async (req, res) => {
  const { id } = req.params;
  // Không có req.userId vì không qua authentication middleware
  await fileService.streamThumbnail(id, res);
});

module.exports = controller;
