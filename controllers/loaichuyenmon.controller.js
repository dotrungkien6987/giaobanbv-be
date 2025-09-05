const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const LoaiChuyenMon = require("../models/LoaiChuyenMon");

const loaichuyenmonController = {};

// Create
loaichuyenmonController.insertOne = catchAsync(async (req, res, next) => {
  const { LoaiChuyenMon: LoaiChuyenMonValue, TrinhDo = "" } = req.body;
  if (!LoaiChuyenMonValue)
    throw new AppError(
      400,
      "Thiếu trường LoaiChuyenMon",
      "Insert LoaiChuyenMon Error"
    );
  const existed = await LoaiChuyenMon.findOne({
    LoaiChuyenMon: LoaiChuyenMonValue,
    isDeleted: false,
  });
  if (existed)
    throw new AppError(
      400,
      "Đã tồn tại loại chuyên môn",
      "Insert LoaiChuyenMon Error"
    );
  const newLoaiChuyenMon = await LoaiChuyenMon.create({
    LoaiChuyenMon: LoaiChuyenMonValue,
    TrinhDo,
  });
  return sendResponse(
    res,
    201,
    true,
    { newLoaiChuyenMon },
    null,
    "Tạo loại chuyên môn thành công"
  );
});

// Get all (exclude deleted)
loaichuyenmonController.getAll = catchAsync(async (req, res, next) => {
  const { includeDeleted } = req.query;
  const condition = includeDeleted === "1" ? {} : { isDeleted: false };
  const loaichuyenmons = await LoaiChuyenMon.find(condition).sort({
    createdAt: -1,
  });
  return sendResponse(
    res,
    200,
    true,
    { loaichuyenmons },
    null,
    "Lấy danh sách thành công"
  );
});

// Get by id
loaichuyenmonController.getById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const doc = await LoaiChuyenMon.findById(id).select("+");
  if (!doc || doc.isDeleted)
    throw new AppError(404, "Không tìm thấy", "Get LoaiChuyenMon Error");
  return sendResponse(
    res,
    200,
    true,
    { loaichuyenmon: doc },
    null,
    "Lấy dữ liệu thành công"
  );
});

// Update
loaichuyenmonController.updateOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { LoaiChuyenMon: LoaiChuyenMonValue, TrinhDo } = req.body;
  const doc = await LoaiChuyenMon.findById(id);
  if (!doc || doc.isDeleted)
    throw new AppError(404, "Không tìm thấy", "Update LoaiChuyenMon Error");
  if (LoaiChuyenMonValue && LoaiChuyenMonValue !== doc.LoaiChuyenMon) {
    const existed = await LoaiChuyenMon.findOne({
      LoaiChuyenMon: LoaiChuyenMonValue,
      isDeleted: false,
    });
    if (existed)
      throw new AppError(
        400,
        "Đã tồn tại loại chuyên môn",
        "Update LoaiChuyenMon Error"
      );
    doc.LoaiChuyenMon = LoaiChuyenMonValue;
  }
  if (TrinhDo !== undefined) doc.TrinhDo = TrinhDo;
  await doc.save();
  return sendResponse(
    res,
    200,
    true,
    { updatedLoaiChuyenMon: doc },
    null,
    "Cập nhật thành công"
  );
});

// Soft delete
loaichuyenmonController.deleteOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const doc = await LoaiChuyenMon.findById(id);
  if (!doc || doc.isDeleted)
    throw new AppError(404, "Không tìm thấy", "Delete LoaiChuyenMon Error");
  doc.isDeleted = true;
  await doc.save();
  return sendResponse(res, 200, true, { deleted: id }, null, "Xóa thành công");
});

module.exports = loaichuyenmonController;
