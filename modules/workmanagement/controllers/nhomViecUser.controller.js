const NhomViecUser = require("../models/NhomViecUser");
const nhomViecUserService = require("../services/nhomViecUser.service");
const {
  sendResponse,
  catchAsync,
  AppError,
} = require("../../../helpers/utils");

const nhomViecUserController = {};

/**
 * Lấy danh sách nhóm việc của người dùng hiện tại
 */
nhomViecUserController.getMyNhomViecs = catchAsync(async (req, res, next) => {
  // authentication.loginRequired chỉ set req.userId, cần lấy user đầy đủ
  const userId = req.user?._id || req.userId;
  if (!userId)
    return next(new AppError(401, "Không tìm thấy thông tin người dùng"));

  // Lấy user đầy đủ nếu chưa có
  let user = req.user;
  if (!user) {
    const User = require("../../../models/User");
    user = await User.findById(userId).select("_id PhanQuyen");
    if (!user) return next(new AppError(401, "User không tồn tại"));
    req.user = user; // cache lại
  }

  const includeAll = req.query.includeAll === "true";
  const isAdmin = user.PhanQuyen === "admin";

  const nhomViecs =
    isAdmin || includeAll
      ? await nhomViecUserService.getAllActive()
      : await nhomViecUserService.getNhomViecByNguoiTao(user._id);

  return sendResponse(
    res,
    200,
    true,
    nhomViecs,
    null,
    "Lấy danh sách nhóm việc thành công"
  );
});

// GET /api/nhomviec-user - Lấy tất cả nhóm việc
nhomViecUserController.getAll = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 2000, includeDeleted = false } = req.query;

  const filterConditions = [];

  // Mặc định chỉ lấy các bản ghi chưa bị xóa
  if (includeDeleted !== "true") {
    filterConditions.push({ isDeleted: false });
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
    ""
  );
});

// POST /api/nhomviec-user - Tạo mới
nhomViecUserController.insertOne = catchAsync(async (req, res, next) => {
  const nhomViecUser = {
    ...req.body,
    isDeleted: false, // Đảm bảo isDeleted được set mặc định
  };

  const created = await NhomViecUser.create(nhomViecUser);
  const populated = await NhomViecUser.findById(created._id).populate(
    "NguoiTaoID",
    "HoTen Email"
  );
  return sendResponse(res, 200, true, populated, null, "Tạo thành công");
});

// PUT /api/nhomviec-user - Cập nhật
nhomViecUserController.updateOne = catchAsync(async (req, res, next) => {
  const { nhomViecUser } = req.body;

  // Kiểm tra nhóm việc có tồn tại và chưa bị xóa
  let existing = await NhomViecUser.findOne({
    _id: nhomViecUser._id,
    isDeleted: false,
  });

  if (!existing) {
    throw new Error("Không tìm thấy nhóm việc hoặc nhóm việc đã bị xóa");
  }

  // Đảm bảo không thay đổi trạng thái isDeleted qua update thường
  const updateData = { ...nhomViecUser };
  delete updateData.isDeleted;

  const updated = await NhomViecUser.findByIdAndUpdate(
    nhomViecUser._id,
    updateData,
    { new: true }
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
    throw new Error("Không tìm thấy nhóm việc hoặc nhóm việc đã bị xóa");
  }

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
    { new: true }
  );

  return sendResponse(res, 200, true, nhomViecUserID, null, "Xóa thành công");
});

// Đã loại bỏ API lấy theo KhoaID vì schema không còn KhoaID

module.exports = nhomViecUserController;
