const { catchAsync, sendResponse } = require("../../../helpers/utils");
const svc = require("../services/attachments.service");

const ctrl = {};

ctrl.upload = catchAsync(async (req, res) => {
  const { ownerType, ownerId } = req.params;
  const field =
    req.params.field || req.query.field || req.body.field || "default";
  const { moTa } = req.body || {};
  const items = await svc.upload(
    ownerType,
    ownerId,
    field,
    req.files || [],
    { moTa },
    req
  );
  return sendResponse(res, 201, true, items, null, "Tải tệp thành công");
});

ctrl.list = catchAsync(async (req, res) => {
  const { ownerType, ownerId } = req.params;
  const field = req.params.field || req.query.field || "default";
  const { page = 1, size = 50 } = req.query;
  const result = await svc.list(ownerType, ownerId, field, { page, size }, req);
  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách tệp thành công"
  );
});

ctrl.count = catchAsync(async (req, res) => {
  const { ownerType, ownerId } = req.params;
  const field = req.params.field || req.query.field || "default";
  const total = await svc.count(ownerType, ownerId, field, req);
  return sendResponse(res, 200, true, { total }, null, "Đếm tệp thành công");
});

// Batch count: body { ownerType, field, ids: [] }
ctrl.batchCount = catchAsync(async (req, res) => {
  const { ownerType, field, ids } = req.body || {};
  if (!Array.isArray(ids) || !ids.length)
    return sendResponse(res, 200, true, {}, null, "Không có id");
  const result = await svc.batchCount(
    ownerType,
    field || "default",
    ids.map(String),
    req
  );
  return sendResponse(res, 200, true, result, null, "Batch đếm tệp thành công");
});

// Batch preview: body { ownerType, field, ids: [], limit }
ctrl.batchPreview = catchAsync(async (req, res) => {
  const { ownerType, field, ids, limit = 3 } = req.body || {};
  if (!Array.isArray(ids) || !ids.length)
    return sendResponse(res, 200, true, {}, null, "Không có id");
  const result = await svc.batchPreview(
    ownerType,
    field || "default",
    ids.map(String),
    Math.max(1, +limit) || 3,
    req
  );
  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Batch preview tệp thành công"
  );
});

ctrl.deleteFile = catchAsync(async (req, res) => {
  const dto = await svc.softDelete(req.params.id, req);
  return sendResponse(res, 200, true, dto, null, "Xóa tệp thành công");
});

ctrl.renameOrUpdateDesc = catchAsync(async (req, res) => {
  const dto = await svc.renameOrUpdateDesc(req.params.id, req.body || {}, req);
  return sendResponse(res, 200, true, dto, null, "Cập nhật tệp thành công");
});

ctrl.streamInline = catchAsync(async (req, res) => {
  const stream = await svc.streamInline(req.params.id, req, res);
  stream.pipe(res);
});

ctrl.streamDownload = catchAsync(async (req, res) => {
  const stream = await svc.streamDownload(req.params.id, req, res);
  stream.pipe(res);
});

module.exports = ctrl;
