const NhomViecUser = require("../models/NhomViecUser");
const { sendResponse, catchAsync } = require("../../../helpers/utils");

const nhomViecUserController = {};

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
    .populate("KhoaID", "TenKhoa MaKhoa")
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
  const populated = await NhomViecUser.findById(created._id)
    .populate("NguoiTaoID", "HoTen Email")
    .populate("KhoaID", "TenKhoa MaKhoa");

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
  )
    .populate("NguoiTaoID", "HoTen Email")
    .populate("KhoaID", "TenKhoa MaKhoa");

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

// GET /api/nhomviec-user/khoa/:khoaId - Lấy nhóm việc theo KhoaID
nhomViecUserController.getByKhoaId = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;

  const nhomViecUsers = await NhomViecUser.find({
    KhoaID: khoaId,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .select("_id TenNhom MoTa")
    .sort({ TenNhom: 1 });

  return sendResponse(res, 200, true, nhomViecUsers, null, "");
});

module.exports = nhomViecUserController;
