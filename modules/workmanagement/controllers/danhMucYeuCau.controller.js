/**
 * DanhMucYeuCau Controller
 *
 * Quản lý danh mục loại yêu cầu theo khoa
 */

const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const DanhMucYeuCau = require("../models/DanhMucYeuCau");
const CauHinhThongBaoKhoa = require("../models/CauHinhThongBaoKhoa");
const User = require("../../../models/User");

const controller = {};

/**
 * Lấy danh sách khoa có danh mục yêu cầu (để user có thể tạo yêu cầu)
 * GET /api/workmanagement/danh-muc-yeu-cau/khoa-co-danh-muc
 */
controller.layKhoaCoDanhMuc = catchAsync(async (req, res, next) => {
  // Tìm các khoa có ít nhất 1 danh mục đang hoạt động
  const khoaIds = await DanhMucYeuCau.distinct("KhoaID", {
    TrangThai: "HOAT_DONG",
    isDeleted: false,
  });

  // Populate thông tin khoa
  const Khoa = require("../../../models/Khoa");
  const khoaList = await Khoa.find({
    _id: { $in: khoaIds },
    isDeleted: { $ne: true },
  })
    .select("_id TenKhoa MaKhoa")
    .sort({ TenKhoa: 1 });

  return sendResponse(
    res,
    200,
    true,
    khoaList,
    null,
    "Lấy danh sách khoa có danh mục thành công"
  );
});

/**
 * Kiểm tra quyền quản lý danh mục của khoa
 */
async function checkQuanLyPermission(req, khoaId) {
  const user = await User.findById(req.userId).lean();
  if (!user?.NhanVienID) {
    throw new AppError(
      400,
      "Tài khoản chưa liên kết với nhân viên",
      "USER_NO_NHANVIEN"
    );
  }

  const isAdmin = ["admin", "superadmin"].includes(
    (user.PhanQuyen || "").toLowerCase()
  );
  if (isAdmin) {
    return { nhanVienId: user.NhanVienID, isAdmin: true };
  }

  // Kiểm tra có phải quản lý khoa không
  const config = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaId });
  if (!config || !config.laQuanLyKhoa(user.NhanVienID)) {
    throw new AppError(
      403,
      "Bạn không có quyền quản lý danh mục của khoa này",
      "PERMISSION_DENIED"
    );
  }

  return { nhanVienId: user.NhanVienID, isAdmin: false };
}

/**
 * Lấy danh mục theo khoa
 * GET /api/workmanagement/yeucau/danhmuc?khoaId=xxx
 */
controller.layTheoKhoa = catchAsync(async (req, res, next) => {
  const { khoaId, chiLayHoatDong = "true" } = req.query;

  if (!khoaId) {
    throw new AppError(400, "Thiếu tham số khoaId", "MISSING_KHOA_ID");
  }

  const danhMuc = await DanhMucYeuCau.timTheoKhoa(
    khoaId,
    chiLayHoatDong === "true"
  );

  return sendResponse(
    res,
    200,
    true,
    danhMuc,
    null,
    "Lấy danh mục yêu cầu thành công"
  );
});

/**
 * Tạo danh mục mới
 * POST /api/workmanagement/yeucau/danhmuc
 */
controller.tao = catchAsync(async (req, res, next) => {
  const { KhoaID } = req.body;

  if (!KhoaID) {
    throw new AppError(400, "Thiếu thông tin khoa", "MISSING_KHOA_ID");
  }

  await checkQuanLyPermission(req, KhoaID);

  const danhMuc = new DanhMucYeuCau(req.body);
  await danhMuc.save();

  return sendResponse(
    res,
    201,
    true,
    danhMuc,
    null,
    "Tạo danh mục yêu cầu thành công"
  );
});

/**
 * Cập nhật danh mục
 * PUT /api/workmanagement/yeucau/danhmuc/:id
 */
controller.capNhat = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const danhMuc = await DanhMucYeuCau.findById(id);
  if (!danhMuc || danhMuc.isDeleted) {
    throw new AppError(404, "Không tìm thấy danh mục", "DANHMUC_NOT_FOUND");
  }

  await checkQuanLyPermission(req, danhMuc.KhoaID);

  // Cập nhật các trường được phép
  const allowedFields = [
    "TenLoaiYeuCau",
    "MoTa",
    "ThoiGianDuKien",
    "DonViThoiGian",
    "TrangThai",
    "ThuTu",
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      danhMuc[field] = req.body[field];
    }
  }

  await danhMuc.save();

  return sendResponse(
    res,
    200,
    true,
    danhMuc,
    null,
    "Cập nhật danh mục thành công"
  );
});

/**
 * Xóa danh mục (soft delete)
 * DELETE /api/workmanagement/yeucau/danhmuc/:id
 */
controller.xoa = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const danhMuc = await DanhMucYeuCau.findById(id);
  if (!danhMuc || danhMuc.isDeleted) {
    throw new AppError(404, "Không tìm thấy danh mục", "DANHMUC_NOT_FOUND");
  }

  await checkQuanLyPermission(req, danhMuc.KhoaID);

  // Kiểm tra đang được sử dụng không
  const dangSuDung = await DanhMucYeuCau.kiemTraDangDuocSuDung(id);
  if (dangSuDung) {
    throw new AppError(
      400,
      "Không thể xóa danh mục đang được sử dụng. Vui lòng chuyển sang trạng thái Ngừng hoạt động.",
      "DANHMUC_IN_USE"
    );
  }

  danhMuc.isDeleted = true;
  await danhMuc.save();

  return sendResponse(res, 200, true, null, null, "Xóa danh mục thành công");
});

/**
 * Sắp xếp lại thứ tự
 * PUT /api/workmanagement/yeucau/danhmuc/sapxep
 */
controller.sapXep = catchAsync(async (req, res, next) => {
  const { khoaId, items } = req.body;
  // items: [{ id: xxx, thuTu: 1 }, { id: yyy, thuTu: 2 }, ...]

  if (!khoaId || !items || !Array.isArray(items)) {
    throw new AppError(400, "Dữ liệu không hợp lệ", "INVALID_DATA");
  }

  await checkQuanLyPermission(req, khoaId);

  // Cập nhật thứ tự
  const bulkOps = items.map((item) => ({
    updateOne: {
      filter: { _id: item.id, KhoaID: khoaId },
      update: { $set: { ThuTu: item.thuTu } },
    },
  }));

  await DanhMucYeuCau.bulkWrite(bulkOps);

  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Sắp xếp danh mục thành công"
  );
});

module.exports = controller;
