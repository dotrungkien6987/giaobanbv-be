/**
 * LyDoTuChoi Controller
 *
 * Quản lý lý do từ chối (global, chỉ Admin)
 */

const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const LyDoTuChoi = require("../models/LyDoTuChoi");
const User = require("../../../models/User");

const controller = {};

/**
 * Kiểm tra quyền Admin
 */
async function checkAdminPermission(req) {
  const user = await User.findById(req.userId).lean();
  const isAdmin = ["admin", "superadmin"].includes(
    (user?.PhanQuyen || "").toLowerCase()
  );
  if (!isAdmin) {
    throw new AppError(
      403,
      "Chỉ Admin mới có quyền quản lý lý do từ chối",
      "PERMISSION_DENIED"
    );
  }
  return user;
}

/**
 * Lấy tất cả lý do từ chối (hoạt động)
 * GET /api/workmanagement/yeucau/lydotuchoi
 */
controller.layTatCa = catchAsync(async (req, res, next) => {
  const { chiLayHoatDong = "true" } = req.query;

  let data;
  if (chiLayHoatDong === "true") {
    data = await LyDoTuChoi.layTatCaHoatDong();
  } else {
    data = await LyDoTuChoi.find({ isDeleted: false }).sort({ ThuTu: 1 });
  }

  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy lý do từ chối thành công"
  );
});

/**
 * Tạo lý do từ chối mới
 * POST /api/workmanagement/yeucau/lydotuchoi
 */
controller.tao = catchAsync(async (req, res, next) => {
  await checkAdminPermission(req);

  const lyDo = new LyDoTuChoi(req.body);
  await lyDo.save();

  return sendResponse(
    res,
    201,
    true,
    lyDo,
    null,
    "Tạo lý do từ chối thành công"
  );
});

/**
 * Cập nhật lý do từ chối
 * PUT /api/workmanagement/yeucau/lydotuchoi/:id
 */
controller.capNhat = catchAsync(async (req, res, next) => {
  await checkAdminPermission(req);

  const { id } = req.params;

  const lyDo = await LyDoTuChoi.findById(id);
  if (!lyDo || lyDo.isDeleted) {
    throw new AppError(404, "Không tìm thấy lý do từ chối", "LYDO_NOT_FOUND");
  }

  const allowedFields = ["TenLyDo", "MoTa", "TrangThai", "ThuTu"];
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      lyDo[field] = req.body[field];
    }
  }

  await lyDo.save();

  return sendResponse(
    res,
    200,
    true,
    lyDo,
    null,
    "Cập nhật lý do từ chối thành công"
  );
});

/**
 * Xóa lý do từ chối (soft delete)
 * DELETE /api/workmanagement/yeucau/lydotuchoi/:id
 */
controller.xoa = catchAsync(async (req, res, next) => {
  await checkAdminPermission(req);

  const { id } = req.params;

  const lyDo = await LyDoTuChoi.findById(id);
  if (!lyDo || lyDo.isDeleted) {
    throw new AppError(404, "Không tìm thấy lý do từ chối", "LYDO_NOT_FOUND");
  }

  // Kiểm tra đang được sử dụng không
  const dangSuDung = await LyDoTuChoi.kiemTraDangDuocSuDung(id);
  if (dangSuDung) {
    throw new AppError(
      400,
      "Không thể xóa lý do đang được sử dụng. Vui lòng chuyển sang trạng thái Ngừng hoạt động.",
      "LYDO_IN_USE"
    );
  }

  lyDo.isDeleted = true;
  await lyDo.save();

  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Xóa lý do từ chối thành công"
  );
});

module.exports = controller;
