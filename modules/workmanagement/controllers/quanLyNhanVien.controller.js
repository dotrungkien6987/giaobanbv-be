const quanLyNhanVienService = require("../services/quanLyNhanVien.service");
const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const QuanLyNhanVien = require("../models/QuanLyNhanVien");

const controller = {};

/**
 * Lấy danh sách nhân viên mà current user được phép quản lý (cho KPI/Giao việc)
 * GET /api/workmanagement/quan-ly-nhan-vien/nhan-vien-duoc-quan-ly
 * Middleware: validateQuanLy đã gắn req.currentNhanVienID
 */
controller.getNhanVienDuocQuanLyByCurrentUser = catchAsync(
  async (req, res, next) => {
    const currentNhanVienID = req.currentNhanVienID; // Từ validateQuanLy middleware
    const { LoaiQuanLy = "KPI" } = req.query;

    if (!currentNhanVienID) {
      throw new AppError(400, "Thiếu thông tin nhân viên");
    }

    // Query quan hệ quản lý và populate thông tin nhân viên được quản lý
    const quanHeQuanLy = await QuanLyNhanVien.find({
      NhanVienQuanLy: currentNhanVienID,
      LoaiQuanLy,
      isDeleted: { $ne: true },
    })
      .populate({
        path: "NhanVienDuocQuanLy",
        select: "HoTen MaNhanVien Email KhoaID ChucDanhID Avatar isDeleted",
        populate: [
          { path: "KhoaID", select: "TenKhoa MaKhoa" },
          { path: "ChucDanhID", select: "TenChucDanh" },
        ],
      })
      .sort({ createdAt: -1 });

    // Extract danh sách nhân viên và lọc những nhân viên đã bị xóa
    const nhanviens = quanHeQuanLy
      .map((qh) => qh.NhanVienDuocQuanLy)
      .filter((nv) => nv && nv.isDeleted !== true);

    return sendResponse(
      res,
      200,
      true,
      {
        nhanviens,
        total: nhanviens.length,
        loaiQuanLy: LoaiQuanLy,
      },
      null,
      "Lấy danh sách nhân viên được quản lý thành công"
    );
  }
);

/**
 * Lấy danh sách nhân viên được quản lý theo NhanVienID cụ thể
 * GET /api/workmanagement/quanlynhanvien/:nhanvienid/managed
 */
controller.getNhanVienDuocQuanLy = catchAsync(async (req, res, next) => {
  const { nhanvienid } = req.params;

  const nhanVienDuocQuanLy = await quanLyNhanVienService.getNhanVienDuocQuanLy(
    nhanvienid
  );

  return sendResponse(
    res,
    200,
    true,
    nhanVienDuocQuanLy,
    null,
    "Lấy danh sách nhân viên được quản lý thành công"
  );
});

/**
 * Lấy thông tin quản lý (nhân viên quản lý + danh sách được quản lý)
 * GET /api/workmanagement/quanlynhanvien/:nhanvienid/info
 */
controller.getThongTinQuanLy = catchAsync(async (req, res, next) => {
  const { nhanvienid } = req.params;

  const thongTinQuanLy = await quanLyNhanVienService.getThongTinQuanLy(
    nhanvienid
  );

  return sendResponse(
    res,
    200,
    true,
    thongTinQuanLy,
    null,
    "Lấy thông tin quản lý thành công"
  );
});

/**
 * Thêm quan hệ quản lý mới
 * POST /api/workmanagement/quanlynhanvien/:nhanvienid/add-relation
 */
controller.themQuanHe = catchAsync(async (req, res, next) => {
  const { nhanvienid } = req.params;
  const { nhanVienDuocQuanLyId, loaiQuanLy } = req.body;

  const newRelation = await quanLyNhanVienService.themQuanHe(
    nhanvienid,
    nhanVienDuocQuanLyId,
    loaiQuanLy
  );

  return sendResponse(
    res,
    201,
    true,
    newRelation,
    null,
    "Thêm quan hệ quản lý thành công"
  );
});

/**
 * Xóa quan hệ quản lý
 * DELETE /api/workmanagement/quanlynhanvien/:nhanvienid/:managedid
 */
controller.xoaQuanHe = catchAsync(async (req, res, next) => {
  const { nhanvienid, managedid } = req.params;

  const result = await quanLyNhanVienService.xoaQuanHe(nhanvienid, managedid);

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Xóa quan hệ quản lý thành công"
  );
});

module.exports = controller;
