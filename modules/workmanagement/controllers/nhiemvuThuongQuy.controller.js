const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const { sendResponse, catchAsync } = require("../../../helpers/utils");

const nhiemvuThuongQuyController = {};

// GET /api/nhiemvu-thuongquy - Lấy tất cả
nhiemvuThuongQuyController.getAll = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 2000, includeDeleted = false } = req.query;

  const filterConditions = [];
  if (includeDeleted !== "true") {
    filterConditions.push({ isDeleted: false });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};
  const count = await NhiemVuThuongQuy.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  let nhiemVuThuongQuys = await NhiemVuThuongQuy.find(filterCriteria)
    .populate("KhoaID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen UserName")
    .populate("NhomViecUserID", "TenNhom MoTa")
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { nhiemVuThuongQuys, totalPages, count },
    null,
    ""
  );
});

// POST /api/nhiemvu-thuongquy - Tạo mới
nhiemvuThuongQuyController.insertOne = catchAsync(async (req, res, next) => {
  const nhiemvuThuongQuy = { ...req.body, isDeleted: false };
  const created = await NhiemVuThuongQuy.create(nhiemvuThuongQuy);
  const populated = await NhiemVuThuongQuy.findById(created._id)
    .populate("KhoaID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen UserName")
    .populate("NhomViecUserID", "TenNhom MoTa");

  return sendResponse(res, 200, true, populated, null, "Tạo thành công");
});

// PUT /api/nhiemvu-thuongquy - Cập nhật
nhiemvuThuongQuyController.updateOne = catchAsync(async (req, res, next) => {
  const { nhiemvuThuongQuy } = req.body;

  let existing = await NhiemVuThuongQuy.findOne({
    _id: nhiemvuThuongQuy._id,
    isDeleted: false,
  });
  if (!existing) {
    throw new Error("Không tìm thấy bản ghi hoặc bản ghi đã bị xóa");
  }

  const updateData = { ...nhiemvuThuongQuy };
  delete updateData.isDeleted;

  const updated = await NhiemVuThuongQuy.findByIdAndUpdate(
    nhiemvuThuongQuy._id,
    updateData,
    { new: true }
  )
    .populate("KhoaID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen UserName")
    .populate("NhomViecUserID", "TenNhom MoTa");

  return sendResponse(res, 200, true, updated, null, "Cập nhật thành công");
});

// DELETE /api/nhiemvu-thuongquy/:id - Soft delete
nhiemvuThuongQuyController.deleteOne = catchAsync(async (req, res, next) => {
  const nhiemvuThuongQuyID = req.params.id;

  const existing = await NhiemVuThuongQuy.findOne({
    _id: nhiemvuThuongQuyID,
    isDeleted: false,
  });
  if (!existing) {
    throw new Error("Không tìm thấy bản ghi hoặc bản ghi đã bị xóa");
  }

  await NhiemVuThuongQuy.findByIdAndUpdate(nhiemvuThuongQuyID, {
    isDeleted: true,
    deletedAt: new Date(),
  });

  return sendResponse(
    res,
    200,
    true,
    nhiemvuThuongQuyID,
    null,
    "Xóa thành công"
  );
});

module.exports = nhiemvuThuongQuyController;
