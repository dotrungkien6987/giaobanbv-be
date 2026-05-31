const NhomViecUser = require("../models/NhomViecUser");
const nhomViecUserService = require("../services/nhomViecUser.service");
const {
  sendResponse,
  catchAsync,
  AppError,
} = require("../../../helpers/utils");

const nhomViecUserController = {};
const WRITE_ROLES = ["admin", "superadmin", "manager"];

const getCurrentUserId = (req) => {
  if (req.user?.userId) return req.user.userId;
  if (req.user?._id) return req.user._id.toString();
  if (req.userId) return req.userId;
  return null;
};

const getNormalizedRole = (req) => (req.user?.PhanQuyen || "").toLowerCase();

const isAdminRole = (role) => role === "admin" || role === "superadmin";

const normalizeId = (value) => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value._id && value._id !== value) return normalizeId(value._id);
  if (typeof value.toString === "function") return value.toString();
  return null;
};

const assertCanWriteNhomViecUser = (req, message) => {
  const role = getNormalizedRole(req);

  if (!WRITE_ROLES.includes(role)) {
    throw new AppError(
      403,
      message || "Bạn không có quyền thao tác với nhóm việc",
    );
  }

  return role;
};

const assertCanManageExistingNhomViecUser = (req, ownerId, message) => {
  const role = assertCanWriteNhomViecUser(req, message);

  if (isAdminRole(role)) {
    return;
  }

  if (normalizeId(ownerId) === normalizeId(getCurrentUserId(req))) {
    return;
  }

  throw new AppError(
    403,
    message || "Bạn chỉ có thể thao tác với nhóm việc do mình tạo",
  );
};

/**
 * Lấy danh sách nhóm việc của người dùng hiện tại
 */
nhomViecUserController.getMyNhomViecs = catchAsync(async (req, res, next) => {
  const userId = getCurrentUserId(req);
  if (!userId)
    return next(new AppError(401, "Không tìm thấy thông tin người dùng"));

  let user = req.user;
  if (!user?.PhanQuyen) {
    const User = require("../../../models/User");
    user = await User.findById(userId).select("_id PhanQuyen");
    if (!user) return next(new AppError(401, "User không tồn tại"));
    req.user = user;
  }

  const role = (user.PhanQuyen || "").toLowerCase();
  const includeAll = req.query.includeAll === "true" && isAdminRole(role);

  const nhomViecs =
    isAdminRole(role) || includeAll
      ? await nhomViecUserService.getAllActive()
      : await nhomViecUserService.getNhomViecByNguoiTao(userId);

  return sendResponse(
    res,
    200,
    true,
    nhomViecs,
    null,
    "Lấy danh sách nhóm việc thành công",
  );
});

// GET /api/nhomviec-user - Lấy tất cả nhóm việc
nhomViecUserController.getAll = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 2000, includeDeleted = false } = req.query;
  const role = getNormalizedRole(req);
  const currentUserId = getCurrentUserId(req);

  if (!currentUserId) {
    throw new AppError(401, "Không tìm thấy thông tin người dùng");
  }

  const filterConditions = [];

  // Mặc định chỉ lấy các bản ghi chưa bị xóa
  if (includeDeleted !== "true") {
    filterConditions.push({ isDeleted: false });
  }

  if (!isAdminRole(role)) {
    filterConditions.push({ NguoiTaoID: currentUserId });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await NhomViecUser.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  let nhomViecUsers = await NhomViecUser.find(filterCriteria)
    .populate("NguoiTaoID", "HoTen Email")
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { nhomViecUsers, totalPages, count },
    null,
    "",
  );
});

// POST /api/nhomviec-user - Tạo mới
nhomViecUserController.insertOne = catchAsync(async (req, res, next) => {
  assertCanWriteNhomViecUser(req, "Bạn không có quyền tạo nhóm việc");

  const currentUserId = getCurrentUserId(req);
  if (!currentUserId) {
    throw new AppError(401, "Không tìm thấy thông tin người dùng");
  }

  const nhomViecUser = {
    TenNhom: req.body.TenNhom,
    MoTa: req.body.MoTa,
    TrangThaiHoatDong: req.body.TrangThaiHoatDong !== false,
    NguoiTaoID: currentUserId,
    isDeleted: false, // Đảm bảo isDeleted được set mặc định
  };

  const created = await NhomViecUser.create(nhomViecUser);
  const populated = await NhomViecUser.findById(created._id).populate(
    "NguoiTaoID",
    "HoTen Email",
  );
  return sendResponse(res, 200, true, populated, null, "Tạo thành công");
});

// PUT /api/nhomviec-user - Cập nhật
nhomViecUserController.updateOne = catchAsync(async (req, res, next) => {
  const { nhomViecUser } = req.body;

  if (!nhomViecUser?._id) {
    throw new AppError(400, "Thiếu thông tin nhóm việc cần cập nhật");
  }

  // Kiểm tra nhóm việc có tồn tại và chưa bị xóa
  let existing = await NhomViecUser.findOne({
    _id: nhomViecUser._id,
    isDeleted: false,
  });

  if (!existing) {
    throw new AppError(
      404,
      "Không tìm thấy nhóm việc hoặc nhóm việc đã bị xóa",
    );
  }

  assertCanManageExistingNhomViecUser(
    req,
    existing.NguoiTaoID,
    "Bạn không có quyền cập nhật nhóm việc này",
  );

  // Đảm bảo không thay đổi trạng thái isDeleted qua update thường
  const updateData = {
    TenNhom: nhomViecUser.TenNhom,
    MoTa: nhomViecUser.MoTa,
  };

  if (nhomViecUser.TrangThaiHoatDong !== undefined) {
    updateData.TrangThaiHoatDong = nhomViecUser.TrangThaiHoatDong;
  }

  const updated = await NhomViecUser.findByIdAndUpdate(
    nhomViecUser._id,
    updateData,
    { new: true },
  ).populate("NguoiTaoID", "HoTen Email");
  return sendResponse(res, 200, true, updated, null, "Cập nhật thành công");
});

// DELETE /api/nhomviec-user/:id - Xóa (soft delete)
nhomViecUserController.deleteOne = catchAsync(async (req, res, next) => {
  const nhomViecUserID = req.params.id;

  // Kiểm tra nhóm việc có tồn tại và chưa bị xóa
  const existing = await NhomViecUser.findOne({
    _id: nhomViecUserID,
    isDeleted: false,
  });

  if (!existing) {
    throw new AppError(
      404,
      "Không tìm thấy nhóm việc hoặc nhóm việc đã bị xóa",
    );
  }

  assertCanManageExistingNhomViecUser(
    req,
    existing.NguoiTaoID,
    "Bạn không có quyền xóa nhóm việc này",
  );

  // Kiểm tra xem có công việc nào đang gán vào nhóm này không
  // (Nếu có model CongViecDuocGiao)
  // const mongoose = require('mongoose');
  // const CongViecDuocGiao = mongoose.model('CongViecDuocGiao');
  // const taskCount = await CongViecDuocGiao.countDocuments({
  //   NhomViecID: nhomViecUserID,
  //   isDeleted: false
  // });
  //
  // if (taskCount > 0) {
  //   throw new Error(
  //     `Không thể xóa nhóm việc vì còn ${taskCount} công việc được gán vào nhóm này`
  //   );
  // }

  // Thực hiện soft delete
  const nhomViecUser = await NhomViecUser.findByIdAndUpdate(
    nhomViecUserID,
    {
      isDeleted: true,
      deletedAt: new Date(), // Có thể thêm timestamp xóa
    },
    { new: true },
  );

  return sendResponse(res, 200, true, nhomViecUserID, null, "Xóa thành công");
});

// Đã loại bỏ API lấy theo KhoaID vì schema không còn KhoaID

module.exports = nhomViecUserController;
