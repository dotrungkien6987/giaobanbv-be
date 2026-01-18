/**
 * @fileoverview YeuCau (Ticket/Support Request) Routes
 * @description Routes cho hệ thống yêu cầu hỗ trợ giữa các Khoa
 *
 * Base path: /api/workmanagement/yeucau
 */

const express = require("express");
const router = express.Router();

const authentication = require("../../../middlewares/authentication");
const yeuCauController = require("../controllers/yeuCau.controller");

// Middleware authentication cho tất cả routes
router.use(authentication.loginRequired);

// ========================================
// DASHBOARD (phải đặt trước /:id để tránh conflict)
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau/dashboard/metrics
 * @desc    Lấy thống kê dashboard yêu cầu
 * @access  Private
 * @query   KhoaTaoID, KhoaXuLyID, TrangThai[], TuNgay, DenNgay, NhanVienTaoID
 */
router.get("/dashboard/metrics", yeuCauController.layDashboardMetrics);

/**
 * @route   GET /api/workmanagement/yeucau/dashboard/xu-ly
 * @desc    Lấy dashboard metrics cho người xử lý
 * @access  Private
 */
router.get("/dashboard/xu-ly", yeuCauController.layDashboardXuLy);

/**
 * @route   GET /api/workmanagement/yeucau/dashboard/dieu-phoi
 * @desc    Lấy dashboard metrics cho người điều phối
 * @access  Private
 */
router.get("/dashboard/dieu-phoi", yeuCauController.layDashboardDieuPhoi);

// ========================================
// DASHBOARD NATIVE MOBILE (NEW)
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau/hoat-dong-gan-day
 * @desc    Lấy hoạt động gần đây (Recent Activities)
 * @access  Private
 * @query   limit (default 20, max 100), tuNgay, denNgay
 */
router.get("/hoat-dong-gan-day", yeuCauController.layHoatDongGanDay);

/**
 * @route   GET /api/workmanagement/yeucau/phan-bo-trang-thai
 * @desc    Lấy phân bố trạng thái (Status Distribution)
 * @access  Private
 * @query   loai (gui|xu-ly|khoa, default: xu-ly), tuNgay, denNgay
 */
router.get("/phan-bo-trang-thai", yeuCauController.layPhanBoTrangThai);

/**
 * @route   GET /api/workmanagement/yeucau/badge-counts-nang-cao
 * @desc    Badge counts nâng cao với date filtering
 * @access  Private
 * @query   tuNgay, denNgay
 */
router.get("/badge-counts-nang-cao", yeuCauController.layBadgeCountsNangCao);

/**
 * @route   GET /api/workmanagement/yeucau/summary/:nhanVienId
 * @desc    Get lightweight summary for Trang chủ (sent, needAction, inProgress, completed)
 * @access  Private
 * @param   nhanVienId - Employee ID
 */
router.get("/summary/:nhanVienId", yeuCauController.getYeuCauSummary);

// ========================================
// KPI EVALUATION DASHBOARD (NEW)
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau/counts-by-nhiemvu
 * @desc    Lấy số lượng yêu cầu nhóm theo NhiemVuThuongQuy (KPI badges)
 * @access  Private
 * @query   nhiemVuThuongQuyIDs (comma-separated), nhanVienID, chuKyDanhGiaID
 */
router.get("/counts-by-nhiemvu", yeuCauController.getCountsByNhiemVu);

/**
 * @route   GET /api/workmanagement/yeucau/dashboard-by-nhiemvu
 * @desc    Lấy dashboard yêu cầu theo NhiemVuThuongQuy (KPI tab 3)
 * @access  Private
 * @query   nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID
 */
router.get("/dashboard-by-nhiemvu", yeuCauController.getDashboardByNhiemVu);

/**
 * @route   GET /api/workmanagement/yeucau/other-summary
 * @desc    Lấy tổng hợp yêu cầu khác (không thuộc NVTQ)
 * @access  Private
 * @query   nhanVienID, chuKyDanhGiaID
 */
router.get("/other-summary", yeuCauController.getOtherYeuCauSummary);

// ========================================
// ROLE-BASED FEATURES
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau/badge-counts-page
 * @desc    Lấy badge counts cho tabs trong page
 * @access  Private
 * @query   pageKey (YEU_CAU_TOI_GUI, YEU_CAU_TOI_XU_LY, YEU_CAU_DIEU_PHOI, YEU_CAU_QUAN_LY_KHOA)
 */
router.get("/badge-counts-page", yeuCauController.layBadgeCountsTheoPage);

/**
 * @route   GET /api/workmanagement/yeucau/my-permissions
 * @desc    Lấy quyền của user hiện tại (isNguoiDieuPhoi, isQuanLyKhoa)
 * @access  Private
 */
router.get("/my-permissions", yeuCauController.layQuyenCuaToi);

/**
 * @route   GET /api/workmanagement/yeucau/badge-counts
 * @desc    Lấy số lượng badge cho menu (toiGui, xuLy, dieuPhoi, quanLyKhoa)
 * @access  Private
 */
router.get("/badge-counts", yeuCauController.layBadgeCounts);

// ========================================
// YEUCAU CRUD
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau
 * @desc    Lấy danh sách yêu cầu với bộ lọc
 * @access  Private
 * @query   page, limit, search, KhoaTaoID, KhoaXuLyID, DanhMucYeuCauID,
 *          TrangThai[], MucDoUuTien, TuNgay, DenNgay, NhanVienTaoID, NhanVienXuLyID
 */
router.get("/", yeuCauController.layDanhSach);

/**
 * @route   GET /api/workmanagement/yeucau/:id
 * @desc    Lấy chi tiết yêu cầu theo ID
 * @access  Private
 */
router.get("/:id", yeuCauController.layChiTiet);

/**
 * @route   POST /api/workmanagement/yeucau
 * @desc    Tạo yêu cầu mới
 * @access  Private
 * @body    TieuDe, MoTa, DanhMucYeuCauID, KhoaXuLyID, MucDoUuTien?, NgayCanXuLy?
 */
router.post("/", yeuCauController.taoYeuCau);

/**
 * @route   PUT /api/workmanagement/yeucau/:id
 * @desc    Cập nhật yêu cầu (chỉ khi trạng thái MOI)
 * @access  Private - Chỉ người tạo
 * @body    TieuDe?, MoTa?, DanhMucYeuCauID?, KhoaXuLyID?, MucDoUuTien?, NgayCanXuLy?
 */
router.put("/:id", yeuCauController.suaYeuCau);

/**
 * @route   DELETE /api/workmanagement/yeucau/:id
 * @desc    Xóa yêu cầu (chỉ khi trạng thái MOI)
 * @access  Private - Chỉ người tạo hoặc Admin
 */
router.delete("/:id", yeuCauController.xoaYeuCau);

// ========================================
// STATE TRANSITIONS / ACTIONS
// ========================================

/**
 * @route   POST /api/workmanagement/yeucau/:id/tiep-nhan
 * @desc    Tiếp nhận yêu cầu (MOI → DANG_XU_LY)
 * @access  Private - Quản lý/Điều phối của Khoa xử lý
 */
router.post("/:id/tiep-nhan", yeuCauController.tiepNhan);

/**
 * @route   POST /api/workmanagement/yeucau/:id/dieu-phoi
 * @desc    Phân công người xử lý (điều phối)
 * @access  Private - Quản lý/Điều phối của Khoa xử lý
 * @body    NhanVienXuLyID, GhiChu?
 */
router.post("/:id/dieu-phoi", yeuCauController.dieuPhoi);

/**
 * @route   POST /api/workmanagement/yeucau/:id/gui-ve-khoa
 * @desc    Gửi yêu cầu về khoa khác
 * @access  Private - Quản lý/Điều phối của Khoa xử lý
 * @body    KhoaXuLyMoiID, GhiChu?
 */
router.post("/:id/gui-ve-khoa", yeuCauController.guiVeKhoa);

/**
 * @route   POST /api/workmanagement/yeucau/:id/hoan-thanh
 * @desc    Báo hoàn thành yêu cầu (DANG_XU_LY → DA_HOAN_THANH)
 * @access  Private - Người xử lý
 * @body    NoiDungKetQua
 */
router.post("/:id/hoan-thanh", yeuCauController.hoanThanh);

/**
 * @route   POST /api/workmanagement/yeucau/:id/danh-gia
 * @desc    Đánh giá sau khi hoàn thành
 * @access  Private - Người tạo
 * @body    DiemDanhGia (1-5), NhanXetDanhGia?
 */
router.post("/:id/danh-gia", yeuCauController.danhGia);

/**
 * @route   POST /api/workmanagement/yeucau/:id/dong
 * @desc    Đóng yêu cầu sau khi hoàn thành (DA_HOAN_THANH → DA_DONG)
 * @access  Private - Người tạo
 * @body    DiemDanhGia?, NhanXetDanhGia?
 */
router.post("/:id/dong", yeuCauController.dong);

/**
 * @route   POST /api/workmanagement/yeucau/:id/mo-lai
 * @desc    Mở lại yêu cầu đã hoàn thành (DA_HOAN_THANH → DANG_XU_LY)
 * @access  Private - Người tạo
 * @body    LyDoMoLai
 */
router.post("/:id/mo-lai", yeuCauController.moLai);

/**
 * @route   POST /api/workmanagement/yeucau/:id/yeu-cau-xu-ly-tiep
 * @desc    Yêu cầu xử lý tiếp (không chấp nhận kết quả)
 * @access  Private - Người tạo
 * @body    LyDo
 */
router.post("/:id/yeu-cau-xu-ly-tiep", yeuCauController.yeuCauXuLyTiep);

/**
 * @route   POST /api/workmanagement/yeucau/:id/tu-choi
 * @desc    Từ chối yêu cầu (MOI → TU_CHOI)
 * @access  Private - Quản lý/Điều phối của Khoa xử lý
 * @body    LyDoTuChoiID, LyDoTuChoiKhac?
 */
router.post("/:id/tu-choi", yeuCauController.tuChoi);

/**
 * @route   POST /api/workmanagement/yeucau/:id/huy-tiep-nhan
 * @desc    Hủy tiếp nhận, trả về trạng thái MOI
 * @access  Private - Quản lý/Điều phối của Khoa xử lý
 * @body    LyDo?
 */
router.post("/:id/huy-tiep-nhan", yeuCauController.huyTiepNhan);

/**
 * @route   POST /api/workmanagement/yeucau/:id/doi-thoi-gian-hen
 * @desc    Đổi thời gian hẹn xử lý
 * @access  Private - Quản lý/Điều phối của Khoa xử lý
 * @body    ThoiGianHenMoi, LyDo
 */
router.post("/:id/doi-thoi-gian-hen", yeuCauController.doiThoiGianHen);

/**
 * @route   POST /api/workmanagement/yeucau/:id/nhac-lai
 * @desc    Nhắc lại yêu cầu (khi quá hạn)
 * @access  Private - Người tạo
 */
router.post("/:id/nhac-lai", yeuCauController.nhacLai);

/**
 * @route   POST /api/workmanagement/yeucau/:id/bao-quan-ly
 * @desc    Báo cáo lên quản lý (escalation)
 * @access  Private - Người tạo
 * @body    NoiDung
 */
router.post("/:id/bao-quan-ly", yeuCauController.baoQuanLy);

/**
 * @route   POST /api/workmanagement/yeucau/:id/appeal
 * @desc    Khiếu nại kết quả từ chối
 * @access  Private - Người tạo (sau khi bị TU_CHOI)
 * @body    LyDoKhieuNai
 */
router.post("/:id/appeal", yeuCauController.appeal);

// ========================================
// COMMENTS (BÌNH LUẬN)
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau/:id/binh-luan
 * @desc    Lấy danh sách bình luận của yêu cầu
 * @access  Private
 */
router.get("/:id/binh-luan", yeuCauController.layBinhLuan);

// ========================================
// ROUTINE TASK ASSIGNMENT
// ========================================

/**
 * @route   POST /api/workmanagement/yeucau/:id/assign-routine-task
 * @desc    Gán nhiệm vụ thường quy cho yêu cầu
 * @access  Private (Handler or Admin only)
 * @body    nhiemVuThuongQuyID, isKhac
 */
router.post("/:id/assign-routine-task", yeuCauController.ganNhiemVuThuongQuy);

// ========================================
// FILES (TỆP TIN ĐÍNH KÈM)
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau/:id/tep-tin
 * @desc    Lấy danh sách tệp đính kèm của yêu cầu
 * @access  Private
 */
router.get("/:id/tep-tin", yeuCauController.layTepTin);

// ========================================
// FILES & COMMENTS (Bình luận + Tệp đính kèm)
// ========================================

const {
  upload,
  verifyMagicAndTotalSize,
} = require("../middlewares/upload.middleware");

/**
 * @route   POST /api/workmanagement/yeucau/:id/files
 * @desc    Upload files cho yêu cầu (không kèm bình luận)
 * @access  Private
 */
router.post(
  "/:id/files",
  upload.array("files"),
  verifyMagicAndTotalSize,
  yeuCauController.uploadFiles
);

/**
 * @route   POST /api/workmanagement/yeucau/:id/comments
 * @desc    Tạo bình luận kèm tệp đính kèm (atomic)
 * @access  Private
 */
router.post(
  "/:id/comments",
  upload.array("files"),
  verifyMagicAndTotalSize,
  yeuCauController.createCommentWithFiles
);

/**
 * @route   GET /api/workmanagement/yeucau/:id/files
 * @desc    Lấy danh sách tệp theo yêu cầu
 * @access  Private
 */
router.get("/:id/files", yeuCauController.listFiles);

/**
 * @route   GET /api/workmanagement/yeucau/:id/files/count
 * @desc    Đếm số tệp theo yêu cầu
 * @access  Private
 */
router.get("/:id/files/count", yeuCauController.countFiles);

/**
 * @route   DELETE /api/workmanagement/files/:fileId
 * @desc    Xóa tệp (soft delete)
 * @access  Private
 */
router.delete("/files/:fileId", yeuCauController.deleteFile);

/**
 * @route   DELETE /api/workmanagement/yeucau/:yeuCauId/binh-luan/:commentId
 * @desc    Thu hồi bình luận (xóa cả nội dung và tệp)
 * @access  Private
 */
router.delete(
  "/:yeuCauId/binh-luan/:commentId",
  yeuCauController.recallComment
);

/**
 * @route   PATCH /api/workmanagement/yeucau/:yeuCauId/binh-luan/:commentId/text
 * @desc    Thu hồi nội dung bình luận (giữ tệp)
 * @access  Private
 */
router.patch(
  "/:yeuCauId/binh-luan/:commentId/text",
  yeuCauController.recallCommentText
);

// ========================================
// HISTORY (LỊCH SỬ)
// ========================================

/**
 * @route   GET /api/workmanagement/yeucau/:id/lich-su
 * @desc    Lấy lịch sử thay đổi của yêu cầu
 * @access  Private
 */
router.get("/:id/lich-su", yeuCauController.layLichSu);

module.exports = router;
