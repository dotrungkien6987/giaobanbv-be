const quanLyNhanVienService = require("../services/quanLyNhanVien.service");
const { catchAsync, sendResponse } = require("../../../helpers/utils");

const controller = {};

/**
 * Lấy danh sách nhân viên được quản lý
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
