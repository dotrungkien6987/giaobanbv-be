/**
 * @fileoverview CauHinhThongBaoKhoa Routes
 * @description Routes cho cấu hình thông báo + quản lý điều phối viên theo Khoa
 *
 * Base path: /api/workmanagement/cau-hinh-thong-bao-khoa
 */

const express = require("express");
const router = express.Router();

const authentication = require("../../../middlewares/authentication");
const cauHinhThongBaoKhoaController = require("../controllers/cauHinhThongBaoKhoa.controller");

// Middleware authentication cho tất cả routes
router.use(authentication.loginRequired);

/**
 * @route   GET /api/workmanagement/cau-hinh-thong-bao-khoa/my-permissions
 * @desc    Lấy quyền của user hiện tại (Admin hoặc Quản lý Khoa)
 * @access  Private
 * @returns { isAdmin: boolean, quanLyKhoaList: [{ _id, TenKhoa, MaKhoa }] }
 */
router.get("/my-permissions", cauHinhThongBaoKhoaController.layQuyenCuaToi);

/**
 * @route   GET /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId
 * @desc    Lấy cấu hình theo KhoaID
 * @access  Private
 */
router.get("/by-khoa/:khoaId", cauHinhThongBaoKhoaController.layTheoKhoa);

/**
 * @route   GET /api/workmanagement/cau-hinh-thong-bao-khoa/check/:khoaId
 * @desc    Kiểm tra quyền tiếp nhận của khoa (trả về role của user đang đăng nhập)
 * @access  Private
 */
router.get("/check/:khoaId", cauHinhThongBaoKhoaController.kiemTraCauHinh);

/**
 * @route   GET /api/workmanagement/cau-hinh-thong-bao-khoa/nhanvien/:khoaId
 * @desc    Lấy danh sách nhân viên theo khoa (cho dropdown phân công)
 * @access  Private
 */
router.get(
  "/nhanvien/:khoaId",
  cauHinhThongBaoKhoaController.layNhanVienTheoKhoa
);

/**
 * @route   POST /api/workmanagement/cau-hinh-thong-bao-khoa
 * @desc    Tạo cấu hình mới cho Khoa
 * @access  Private - Admin only
 * @body    KhoaID, DanhSachQuanLyKhoa[], DanhSachNguoiDieuPhoi[], ThongBaoKhiTaoYeuCau?, ThongBaoKhiCapNhat?
 */
router.post("/", cauHinhThongBaoKhoaController.tao);

/**
 * @route   PUT /api/workmanagement/cau-hinh-thong-bao-khoa/:id
 * @desc    Cập nhật cấu hình
 * @access  Private - Admin hoặc Quản lý Khoa
 * @body    DanhSachQuanLyKhoa[]?, DanhSachNguoiDieuPhoi[]?, ThongBaoKhiTaoYeuCau?, ThongBaoKhiCapNhat?
 */
router.put("/:id", cauHinhThongBaoKhoaController.capNhat);

// ============== QUẢN LÝ KHOA ==============

/**
 * @route   POST /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/quan-ly
 * @desc    Thêm quản lý khoa
 * @access  Private - Admin
 * @body    { NhanVienID }
 */
router.post(
  "/by-khoa/:khoaId/quan-ly",
  cauHinhThongBaoKhoaController.themQuanLyKhoa
);

/**
 * @route   DELETE /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/quan-ly/:nhanVienId
 * @desc    Xóa quản lý khoa
 * @access  Private - Admin
 */
router.delete(
  "/by-khoa/:khoaId/quan-ly/:nhanVienId",
  cauHinhThongBaoKhoaController.xoaQuanLyKhoa
);

// ============== NGƯỜI ĐIỀU PHỐI ==============

/**
 * @route   POST /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/dieu-phoi
 * @desc    Thêm người điều phối
 * @access  Private - Admin hoặc Quản lý Khoa
 * @body    { NhanVienID }
 */
router.post(
  "/by-khoa/:khoaId/dieu-phoi",
  cauHinhThongBaoKhoaController.themNguoiDieuPhoi
);

/**
 * @route   DELETE /api/workmanagement/cau-hinh-thong-bao-khoa/by-khoa/:khoaId/dieu-phoi/:nhanVienId
 * @desc    Xóa người điều phối
 * @access  Private - Admin hoặc Quản lý Khoa
 */
router.delete(
  "/by-khoa/:khoaId/dieu-phoi/:nhanVienId",
  cauHinhThongBaoKhoaController.xoaNguoiDieuPhoi
);

module.exports = router;
