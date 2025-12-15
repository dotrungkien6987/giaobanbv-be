/**
 * CauHinhThongBaoKhoa Controller
 *
 * Quản lý cấu hình người điều phối + quản lý khoa
 */

const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const CauHinhThongBaoKhoa = require("../models/CauHinhThongBaoKhoa");
const User = require("../../../models/User");
const NhanVien = require("../../../models/NhanVien");

const controller = {};

/**
 * Kiểm tra quyền - Admin hoặc Quản lý khoa
 */
async function checkPermission(req, khoaId) {
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
  if (config && config.laQuanLyKhoa(user.NhanVienID)) {
    return { nhanVienId: user.NhanVienID, isAdmin: false };
  }

  throw new AppError(
    403,
    "Bạn không có quyền quản lý cấu hình khoa này",
    "PERMISSION_DENIED"
  );
}

/**
 * Lấy cấu hình theo khoa
 * GET /api/workmanagement/yeucau/cauhinhthongbao/:khoaId
 */
controller.layTheoKhoa = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;

  const config = await CauHinhThongBaoKhoa.layTheoKhoa(khoaId);

  if (!config) {
    return sendResponse(res, 200, true, null, null, "Khoa chưa được cấu hình");
  }

  return sendResponse(res, 200, true, config, null, "Lấy cấu hình thành công");
});

/**
 * Kiểm tra khoa đã cấu hình chưa
 * GET /api/workmanagement/yeucau/cauhinhthongbao/:khoaId/check
 */
controller.kiemTraCauHinh = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;

  const daCauHinh = await CauHinhThongBaoKhoa.khoaDaCauHinh(khoaId);
  const coNguoiDieuPhoi = await CauHinhThongBaoKhoa.khoaCoNguoiDieuPhoi(khoaId);

  return sendResponse(
    res,
    200,
    true,
    { daCauHinh, coNguoiDieuPhoi },
    null,
    "Kiểm tra cấu hình thành công"
  );
});

/**
 * Tạo cấu hình mới cho khoa (Admin only)
 * POST /api/workmanagement/yeucau/cauhinhthongbao
 */
controller.tao = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.userId).lean();
  const isAdmin = ["admin", "superadmin"].includes(
    (user?.PhanQuyen || "").toLowerCase()
  );

  if (!isAdmin) {
    throw new AppError(
      403,
      "Chỉ Admin mới có quyền tạo cấu hình khoa",
      "PERMISSION_DENIED"
    );
  }

  const { KhoaID, DanhSachQuanLyKhoa, DanhSachNguoiDieuPhoi } = req.body;

  if (!KhoaID) {
    throw new AppError(400, "Thiếu thông tin khoa", "MISSING_KHOA_ID");
  }

  // Kiểm tra khoa đã có cấu hình chưa
  const existing = await CauHinhThongBaoKhoa.findOne({ KhoaID });
  if (existing) {
    throw new AppError(400, "Khoa đã có cấu hình", "KHOA_DA_CAU_HINH");
  }

  const config = await CauHinhThongBaoKhoa.taoCauHinh(
    KhoaID,
    DanhSachQuanLyKhoa || [],
    DanhSachNguoiDieuPhoi || []
  );

  return sendResponse(
    res,
    201,
    true,
    config,
    null,
    "Tạo cấu hình khoa thành công"
  );
});

/**
 * Cập nhật cấu hình khoa
 * PUT /api/workmanagement/yeucau/cauhinhthongbao/:khoaId
 */
controller.capNhat = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;

  await checkPermission(req, khoaId);

  const config = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaId });
  if (!config) {
    throw new AppError(404, "Khoa chưa được cấu hình", "CAUHINH_NOT_FOUND");
  }

  const { DanhSachQuanLyKhoa, DanhSachNguoiDieuPhoi } = req.body;

  // Cập nhật danh sách
  if (DanhSachQuanLyKhoa !== undefined) {
    config.DanhSachQuanLyKhoa = DanhSachQuanLyKhoa.map((id) => ({
      NhanVienID: id,
    }));
  }

  if (DanhSachNguoiDieuPhoi !== undefined) {
    config.DanhSachNguoiDieuPhoi = DanhSachNguoiDieuPhoi.map((id) => ({
      NhanVienID: id,
    }));
  }

  await config.save();

  // Populate và trả về
  const updated = await CauHinhThongBaoKhoa.layTheoKhoa(khoaId);

  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Cập nhật cấu hình thành công"
  );
});

/**
 * Lấy danh sách nhân viên của khoa (để chọn)
 * GET /api/workmanagement/cau-hinh-thong-bao-khoa/nhanvien/:khoaId
 */
controller.layNhanVienTheoKhoa = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;

  const nhanVien = await NhanVien.find({
    KhoaID: khoaId,
    isDeleted: false, // Không bị xóa
    DaNghi: false, // Chỉ lấy nhân viên đang làm việc
  })
    .select("Ten MaNhanVien Email ChucDanh ChucVu")
    .sort({ Ten: 1 });

  // Map lại field name để frontend sử dụng HoTen (chuẩn convention)
  const result = nhanVien.map((nv) => ({
    _id: nv._id,
    HoTen: nv.Ten, // Map Ten -> HoTen
    MaNhanVien: nv.MaNhanVien,
    Email: nv.Email,
    ChucDanh: nv.ChucDanh,
    ChucVu: nv.ChucVu,
  }));

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách nhân viên thành công"
  );
});

// ============== QUẢN LÝ KHOA ==============

/**
 * Thêm quản lý khoa
 * POST /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/quan-ly
 */
controller.themQuanLyKhoa = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;
  const { NhanVienID } = req.body;

  // Kiểm tra quyền Admin
  const user = await User.findById(req.userId).lean();
  const isAdmin = ["admin", "superadmin"].includes(
    (user?.PhanQuyen || "").toLowerCase()
  );
  if (!isAdmin) {
    throw new AppError(
      403,
      "Chỉ Admin mới có quyền thêm quản lý khoa",
      "PERMISSION_DENIED"
    );
  }

  if (!NhanVienID) {
    throw new AppError(400, "Thiếu thông tin nhân viên", "MISSING_NHANVIEN_ID");
  }

  // Tìm hoặc tạo cấu hình
  let config = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaId });
  if (!config) {
    config = new CauHinhThongBaoKhoa({
      KhoaID: khoaId,
      DanhSachQuanLyKhoa: [],
      DanhSachNguoiDieuPhoi: [],
    });
  }

  // Kiểm tra đã có chưa
  const daCoTrong = config.DanhSachQuanLyKhoa.some(
    (item) => item.NhanVienID?.toString() === NhanVienID.toString()
  );
  if (daCoTrong) {
    throw new AppError(
      400,
      "Nhân viên này đã là quản lý khoa",
      "ALREADY_QUAN_LY"
    );
  }

  config.DanhSachQuanLyKhoa.push({ NhanVienID });
  await config.save();

  const updated = await CauHinhThongBaoKhoa.layTheoKhoa(khoaId);

  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Thêm quản lý khoa thành công"
  );
});

/**
 * Xóa quản lý khoa
 * DELETE /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/quan-ly/:nhanVienId
 */
controller.xoaQuanLyKhoa = catchAsync(async (req, res, next) => {
  const { khoaId, nhanVienId } = req.params;

  // Kiểm tra quyền Admin
  const user = await User.findById(req.userId).lean();
  const isAdmin = ["admin", "superadmin"].includes(
    (user?.PhanQuyen || "").toLowerCase()
  );
  if (!isAdmin) {
    throw new AppError(
      403,
      "Chỉ Admin mới có quyền xóa quản lý khoa",
      "PERMISSION_DENIED"
    );
  }

  const config = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaId });
  if (!config) {
    throw new AppError(404, "Khoa chưa được cấu hình", "CAUHINH_NOT_FOUND");
  }

  config.DanhSachQuanLyKhoa = config.DanhSachQuanLyKhoa.filter(
    (item) => item.NhanVienID?.toString() !== nhanVienId.toString()
  );
  await config.save();

  const updated = await CauHinhThongBaoKhoa.layTheoKhoa(khoaId);

  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Xóa quản lý khoa thành công"
  );
});

// ============== NGƯỜI ĐIỀU PHỐI ==============

/**
 * Thêm người điều phối
 * POST /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/dieu-phoi
 */
controller.themNguoiDieuPhoi = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;
  const { NhanVienID } = req.body;

  // Kiểm tra quyền Admin hoặc Quản lý khoa
  await checkPermission(req, khoaId);

  if (!NhanVienID) {
    throw new AppError(400, "Thiếu thông tin nhân viên", "MISSING_NHANVIEN_ID");
  }

  // Tìm hoặc tạo cấu hình
  let config = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaId });
  if (!config) {
    config = new CauHinhThongBaoKhoa({
      KhoaID: khoaId,
      DanhSachQuanLyKhoa: [],
      DanhSachNguoiDieuPhoi: [],
    });
  }

  // Kiểm tra đã có chưa
  const daCoTrong = config.DanhSachNguoiDieuPhoi.some(
    (item) => item.NhanVienID?.toString() === NhanVienID.toString()
  );
  if (daCoTrong) {
    throw new AppError(
      400,
      "Nhân viên này đã là người điều phối",
      "ALREADY_DIEU_PHOI"
    );
  }

  config.DanhSachNguoiDieuPhoi.push({ NhanVienID });
  await config.save();

  const updated = await CauHinhThongBaoKhoa.layTheoKhoa(khoaId);

  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Thêm người điều phối thành công"
  );
});

/**
 * Xóa người điều phối
 * DELETE /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/dieu-phoi/:nhanVienId
 */
controller.xoaNguoiDieuPhoi = catchAsync(async (req, res, next) => {
  const { khoaId, nhanVienId } = req.params;

  // Kiểm tra quyền Admin hoặc Quản lý khoa
  await checkPermission(req, khoaId);

  const config = await CauHinhThongBaoKhoa.findOne({ KhoaID: khoaId });
  if (!config) {
    throw new AppError(404, "Khoa chưa được cấu hình", "CAUHINH_NOT_FOUND");
  }

  config.DanhSachNguoiDieuPhoi = config.DanhSachNguoiDieuPhoi.filter(
    (item) => item.NhanVienID?.toString() !== nhanVienId.toString()
  );
  await config.save();

  const updated = await CauHinhThongBaoKhoa.layTheoKhoa(khoaId);

  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Xóa người điều phối thành công"
  );
});

/**
 * Lấy quyền của user hiện tại
 * GET /api/workmanagement/cau-hinh-thong-bao-khoa/my-permissions
 *
 * Trả về: { isAdmin, quanLyKhoaList: [{ _id, TenKhoa }] }
 */
controller.layQuyenCuaToi = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.userId).lean();

  if (!user) {
    throw new AppError(401, "Không tìm thấy người dùng", "USER_NOT_FOUND");
  }

  const isAdmin = ["admin", "superadmin"].includes(
    (user.PhanQuyen || "").toLowerCase()
  );

  // Nếu là Admin, trả về tất cả
  if (isAdmin) {
    return sendResponse(
      res,
      200,
      true,
      { isAdmin: true, quanLyKhoaList: [] },
      null,
      "Lấy quyền thành công"
    );
  }

  // Không phải Admin - tìm các khoa mà user là Quản lý Khoa
  if (!user.NhanVienID) {
    return sendResponse(
      res,
      200,
      true,
      { isAdmin: false, quanLyKhoaList: [] },
      null,
      "Tài khoản chưa liên kết nhân viên"
    );
  }

  // Tìm tất cả cấu hình có user trong DanhSachQuanLyKhoa
  const configs = await CauHinhThongBaoKhoa.find({
    "DanhSachQuanLyKhoa.NhanVienID": user.NhanVienID,
  }).populate("KhoaID", "TenKhoa MaKhoa");

  const quanLyKhoaList = configs
    .filter((c) => c.KhoaID) // Chỉ lấy những config có KhoaID hợp lệ
    .map((c) => ({
      _id: c.KhoaID._id,
      TenKhoa: c.KhoaID.TenKhoa,
      MaKhoa: c.KhoaID.MaKhoa,
    }));

  return sendResponse(
    res,
    200,
    true,
    { isAdmin: false, quanLyKhoaList },
    null,
    "Lấy quyền thành công"
  );
});

module.exports = controller;
