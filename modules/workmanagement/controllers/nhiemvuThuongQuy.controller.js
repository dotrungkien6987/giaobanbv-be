const NhiemVuThuongQuy = require("../models/NhiemVuThuongQuy");
const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");
const {
  sendResponse,
  catchAsync,
  AppError,
} = require("../../../helpers/utils");

const nhiemvuThuongQuyController = {};

const getCurrentUserId = (req) => {
  if (req.user?.userId) return req.user.userId;
  if (req.user?._id) return req.user._id.toString();
  if (req.userId) return req.userId;
  return null;
};

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id && value._id !== value) return normalizeId(value._id);
  if (typeof value.toString === "function") return value.toString();
  return null;
};

const isAdminRole = (role) => role === "admin" || role === "superadmin";

const getUserScope = async (req) => {
  const currentUserId = getCurrentUserId(req);
  if (!currentUserId) {
    throw new AppError(401, "Không tìm thấy thông tin người dùng");
  }

  const currentUser =
    req.user?.PhanQuyen && req.user?.NhanVienID !== undefined
      ? req.user
      : await User.findById(currentUserId)
          .select("PhanQuyen NhanVienID")
          .lean();

  if (!currentUser) {
    throw new AppError(401, "Người dùng không tồn tại");
  }

  const role = (currentUser.PhanQuyen || "").toLowerCase();
  if (isAdminRole(role)) {
    return { currentUserId, role, isAdmin: true };
  }

  const nhanVienId = normalizeId(currentUser.NhanVienID);
  if (!nhanVienId) {
    throw new AppError(400, "Tài khoản chưa liên kết với nhân viên");
  }

  const nhanVien = await NhanVien.findById(nhanVienId).select("KhoaID").lean();
  const khoaId = normalizeId(nhanVien?.KhoaID);

  if (!khoaId) {
    throw new AppError(400, "Tài khoản nhân viên chưa được gán khoa");
  }

  return { currentUserId, role, isAdmin: false, khoaId };
};

const getWriteScope = async (req, khoaId) => {
  const userScope = await getUserScope(req);

  if (userScope.isAdmin) {
    return { currentUserId: userScope.currentUserId, isAdmin: true };
  }

  if (userScope.role !== "manager") {
    throw new AppError(
      403,
      "Bạn không có quyền thao tác với nhiệm vụ thường quy",
    );
  }

  if (khoaId && normalizeId(khoaId) !== userScope.khoaId) {
    throw new AppError(
      403,
      "Bạn chỉ có thể thao tác với nhiệm vụ của khoa mình quản lý",
    );
  }

  return {
    currentUserId: userScope.currentUserId,
    isAdmin: false,
    managerKhoaId: userScope.khoaId,
  };
};

// GET /api/nhiemvu-thuongquy - Lấy tất cả
nhiemvuThuongQuyController.getAll = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 2000, includeDeleted = false } = req.query;
  const userScope = await getUserScope(req);

  const filterConditions = [];
  if (includeDeleted !== "true") {
    filterConditions.push({ isDeleted: false });
  }

  if (!userScope.isAdmin) {
    filterConditions.push({ KhoaID: userScope.khoaId });
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
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { nhiemVuThuongQuys, totalPages, count },
    null,
    "",
  );
});

// POST /api/nhiemvu-thuongquy - Tạo mới
nhiemvuThuongQuyController.insertOne = catchAsync(async (req, res, next) => {
  const writeScope = await getWriteScope(req, req.body.KhoaID);

  const nhiemvuThuongQuy = {
    TenNhiemVu: req.body.TenNhiemVu,
    MoTa: req.body.MoTa,
    MucDoKhoDefault: req.body.MucDoKhoDefault,
    TrangThaiHoatDong: req.body.TrangThaiHoatDong !== false,
    KhoaID: writeScope.isAdmin ? req.body.KhoaID : writeScope.managerKhoaId,
    NguoiTaoID: writeScope.currentUserId,
    isDeleted: false,
  };

  if (!nhiemvuThuongQuy.KhoaID) {
    throw new AppError(400, "Thiếu thông tin khoa");
  }

  const created = await NhiemVuThuongQuy.create(nhiemvuThuongQuy);
  const populated = await NhiemVuThuongQuy.findById(created._id)
    .populate("KhoaID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen UserName");
  return sendResponse(res, 200, true, populated, null, "Tạo thành công");
});

// PUT /api/nhiemvu-thuongquy - Cập nhật
nhiemvuThuongQuyController.updateOne = catchAsync(async (req, res, next) => {
  const { nhiemvuThuongQuy } = req.body;

  if (!nhiemvuThuongQuy?._id) {
    throw new AppError(400, "Thiếu thông tin nhiệm vụ cần cập nhật");
  }

  let existing = await NhiemVuThuongQuy.findOne({
    _id: nhiemvuThuongQuy._id,
    isDeleted: false,
  });
  if (!existing) {
    throw new AppError(404, "Không tìm thấy bản ghi hoặc bản ghi đã bị xóa");
  }

  const writeScope = await getWriteScope(req, existing.KhoaID);

  const updateData = {
    TenNhiemVu: nhiemvuThuongQuy.TenNhiemVu,
    MoTa: nhiemvuThuongQuy.MoTa,
    MucDoKhoDefault: nhiemvuThuongQuy.MucDoKhoDefault,
  };

  if (nhiemvuThuongQuy.TrangThaiHoatDong !== undefined) {
    updateData.TrangThaiHoatDong = nhiemvuThuongQuy.TrangThaiHoatDong;
  }

  if (writeScope.isAdmin && nhiemvuThuongQuy.KhoaID) {
    updateData.KhoaID = nhiemvuThuongQuy.KhoaID;
  }

  const updated = await NhiemVuThuongQuy.findByIdAndUpdate(
    nhiemvuThuongQuy._id,
    updateData,
    { new: true },
  )
    .populate("KhoaID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen UserName");
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
    throw new AppError(404, "Không tìm thấy bản ghi hoặc bản ghi đã bị xóa");
  }

  await getWriteScope(req, existing.KhoaID);

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
    "Xóa thành công",
  );
});

module.exports = nhiemvuThuongQuyController;
