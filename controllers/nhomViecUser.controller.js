const NhomViecUser = require("../modules/workmanagement/models/NhomViecUser");
const { sendResponse, catchAsync } = require("../helpers/utils");

const nhomViecUserController = {};

// GET /api/nhomviec-user - Lấy tất cả nhóm việc
nhomViecUserController.getAll = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 2000 } = req.query;
  const filterConditions = [{ isDeleted: false }];

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
  const nhomViecUser = req.body;
  const created = await NhomViecUser.create(nhomViecUser);
  const populated = await NhomViecUser.findById(created._id)
    .populate("NguoiTaoID", "HoTen Email")
    .populate("KhoaID", "TenKhoa MaKhoa");

  return sendResponse(res, 200, true, populated, null, "Tạo thành công");
});

// PUT /api/nhomviec-user - Cập nhật
nhomViecUserController.updateOne = catchAsync(async (req, res, next) => {
  const { nhomViecUser } = req.body;
  let updated = await NhomViecUser.findById(nhomViecUser._id);

  if (!updated) throw new Error("Không tìm thấy nhóm việc");

  updated = await NhomViecUser.findByIdAndUpdate(
    nhomViecUser._id,
    nhomViecUser,
    { new: true }
  )
    .populate("NguoiTaoID", "HoTen Email")
    .populate("KhoaID", "TenKhoa MaKhoa");

  return sendResponse(res, 200, true, updated, null, "Cập nhật thành công");
});

// DELETE /api/nhomviec-user/:id - Xóa (soft delete)
nhomViecUserController.deleteOne = catchAsync(async (req, res, next) => {
  const nhomViecUserID = req.params.id;

  const nhomViecUser = await NhomViecUser.findOneAndUpdate(
    { _id: nhomViecUserID },
    { isDeleted: true },
    { new: true }
  );

  return sendResponse(res, 200, true, nhomViecUser, null, "Xóa thành công");
});

module.exports = nhomViecUserController;
