/**
 * YeuCau Controller
 *
 * Handles:
 * - CRUD operations
 * - State transitions (actions)
 * - Comments and Files
 * - Dashboard
 */

const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const User = require("../../../models/User");
const yeuCauService = require("../services/yeuCau.service");
const yeuCauStateMachine = require("../services/yeuCauStateMachine");

const controller = {};

// ============== HELPERS ==============

/**
 * Lấy NhanVienID từ request user
 */
async function getNhanVienId(req) {
  const user = await User.findById(req.userId).lean();
  if (!user?.NhanVienID) {
    throw new AppError(
      400,
      "Tài khoản chưa liên kết với nhân viên. Vui lòng liên hệ quản trị viên.",
      "USER_NO_NHANVIEN"
    );
  }
  return {
    nhanVienId: user.NhanVienID,
    userRole: user.PhanQuyen,
  };
}

// ============== CRUD ==============

/**
 * Tạo yêu cầu mới
 * POST /api/workmanagement/yeucau
 */
controller.taoYeuCau = catchAsync(async (req, res, next) => {
  const { nhanVienId } = await getNhanVienId(req);

  const yeuCau = await yeuCauService.taoYeuCau(req.body, nhanVienId);

  return sendResponse(res, 201, true, yeuCau, null, "Tạo yêu cầu thành công");
});

/**
 * Sửa yêu cầu (chỉ khi MOI và là NguoiGui)
 * PUT /api/workmanagement/yeucau/:id
 */
controller.suaYeuCau = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { nhanVienId } = await getNhanVienId(req);

  const yeuCau = await yeuCauService.suaYeuCau(id, req.body, nhanVienId);

  return sendResponse(
    res,
    200,
    true,
    yeuCau,
    null,
    "Cập nhật yêu cầu thành công"
  );
});

/**
 * Lấy chi tiết yêu cầu
 * GET /api/workmanagement/yeucau/:id
 */
controller.layChiTiet = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { nhanVienId, userRole } = await getNhanVienId(req);

  const result = await yeuCauService.layChiTiet(id, nhanVienId, userRole);

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy chi tiết yêu cầu thành công"
  );
});

/**
 * Lấy danh sách yêu cầu
 * GET /api/workmanagement/yeucau
 */
controller.layDanhSach = catchAsync(async (req, res, next) => {
  const { nhanVienId, userRole } = await getNhanVienId(req);

  const result = await yeuCauService.layDanhSach(
    req.query,
    nhanVienId,
    userRole
  );

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách yêu cầu thành công"
  );
});

/**
 * Lấy lịch sử yêu cầu
 * GET /api/workmanagement/yeucau/:id/lichsu
 */
controller.layLichSu = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const lichSu = await yeuCauService.layLichSu(id);

  return sendResponse(
    res,
    200,
    true,
    lichSu,
    null,
    "Lấy lịch sử yêu cầu thành công"
  );
});

// ============== STATE TRANSITIONS (Actions) ==============

/**
 * Generic action handler
 */
const executeAction = (action) =>
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const { nhanVienId, userRole } = await getNhanVienId(req);

    // Extract version header for optimistic locking
    const ifUnmodifiedSince = req.headers["if-unmodified-since"];

    const yeuCau = await yeuCauStateMachine.executeTransition(
      id,
      action,
      req.body,
      nhanVienId,
      userRole,
      { ifUnmodifiedSince }
    );

    const messages = {
      TIEP_NHAN: "Tiếp nhận yêu cầu thành công",
      TU_CHOI: "Từ chối yêu cầu thành công",
      XOA: "Xóa yêu cầu thành công",
      DIEU_PHOI: "Điều phối yêu cầu thành công",
      GUI_VE_KHOA: "Gửi về khoa thành công",
      HOAN_THANH: "Báo hoàn thành thành công",
      HUY_TIEP_NHAN: "Hủy tiếp nhận thành công",
      DOI_THOI_GIAN_HEN: "Đổi thời gian hẹn thành công",
      DANH_GIA: "Đánh giá và đóng yêu cầu thành công",
      DONG: "Đóng yêu cầu thành công",
      YEU_CAU_XU_LY_TIEP: "Yêu cầu xử lý tiếp thành công",
      MO_LAI: "Mở lại yêu cầu thành công",
      APPEAL: "Gửi khiếu nại thành công",
      NHAC_LAI: "Nhắc lại thành công",
      BAO_QUAN_LY: "Báo quản lý thành công",
    };

    return sendResponse(
      res,
      200,
      true,
      yeuCau,
      null,
      messages[action] || "Thực hiện thành công"
    );
  });

// Tiếp nhận yêu cầu
// POST /api/workmanagement/yeucau/:id/tiepnhan
controller.tiepNhan = executeAction("TIEP_NHAN");

// Từ chối yêu cầu
// POST /api/workmanagement/yeucau/:id/tuchoi
controller.tuChoi = executeAction("TU_CHOI");

// Xóa yêu cầu
// DELETE /api/workmanagement/yeucau/:id
controller.xoaYeuCau = executeAction("XOA");

// Điều phối yêu cầu
// POST /api/workmanagement/yeucau/:id/dieuphoi
controller.dieuPhoi = executeAction("DIEU_PHOI");

// Gửi về khoa
// POST /api/workmanagement/yeucau/:id/guivekhoa
controller.guiVeKhoa = executeAction("GUI_VE_KHOA");

// Hoàn thành yêu cầu
// POST /api/workmanagement/yeucau/:id/hoanthanh
controller.hoanThanh = executeAction("HOAN_THANH");

// Hủy tiếp nhận
// POST /api/workmanagement/yeucau/:id/huytiepnhan
controller.huyTiepNhan = executeAction("HUY_TIEP_NHAN");

// Đổi thời gian hẹn
// POST /api/workmanagement/yeucau/:id/doithoigianhen
controller.doiThoiGianHen = executeAction("DOI_THOI_GIAN_HEN");

// Đánh giá (+ tự động đóng)
// POST /api/workmanagement/yeucau/:id/danhgia
controller.danhGia = executeAction("DANH_GIA");

// Đóng thủ công
// POST /api/workmanagement/yeucau/:id/dong
controller.dong = executeAction("DONG");

// Yêu cầu xử lý tiếp
// POST /api/workmanagement/yeucau/:id/yeucauxulytiep
controller.yeuCauXuLyTiep = executeAction("YEU_CAU_XU_LY_TIEP");

// Mở lại
// POST /api/workmanagement/yeucau/:id/molai
controller.moLai = executeAction("MO_LAI");

// Khiếu nại
// POST /api/workmanagement/yeucau/:id/appeal
controller.appeal = executeAction("APPEAL");

// Nhắc lại
// POST /api/workmanagement/yeucau/:id/nhaclai
controller.nhacLai = executeAction("NHAC_LAI");

// Báo quản lý
// POST /api/workmanagement/yeucau/:id/baoquanly
controller.baoQuanLy = executeAction("BAO_QUAN_LY");

// ============== COMMENTS & FILES ==============

/**
 * Lấy bình luận của yêu cầu
 * GET /api/workmanagement/yeucau/:id/binhluan
 */
controller.layBinhLuan = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const binhLuan = await yeuCauService.layBinhLuan(id);

  return sendResponse(
    res,
    200,
    true,
    binhLuan,
    null,
    "Lấy bình luận thành công"
  );
});

/**
 * Lấy file đính kèm
 * GET /api/workmanagement/yeucau/:id/teptin
 */
controller.layTepTin = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const tepTin = await yeuCauService.layTepTin(id);

  return sendResponse(
    res,
    200,
    true,
    tepTin,
    null,
    "Lấy file đính kèm thành công"
  );
});

// ============== DASHBOARD ==============

/**
 * Lấy dashboard metrics
 * GET /api/workmanagement/yeucau/dashboard/metrics
 */
controller.layDashboardMetrics = catchAsync(async (req, res, next) => {
  const metrics = await yeuCauService.layDashboardMetrics(req.query);

  return sendResponse(
    res,
    200,
    true,
    metrics,
    null,
    "Lấy dashboard metrics thành công"
  );
});

// ============== ROLE-BASED FEATURES ==============

/**
 * Lấy quyền của user hiện tại trong hệ thống yêu cầu
 * GET /api/workmanagement/yeucau/my-permissions
 */
controller.layQuyenCuaToi = catchAsync(async (req, res, next) => {
  const { nhanVienId } = await getNhanVienId(req);
  const permissions = await yeuCauService.layQuyenCuaToi(nhanVienId);

  return sendResponse(
    res,
    200,
    true,
    permissions,
    null,
    "Lấy quyền thành công"
  );
});

/**
 * Lấy số lượng badge cho menu
 * GET /api/workmanagement/yeucau/badge-counts
 */
controller.layBadgeCounts = catchAsync(async (req, res, next) => {
  const { nhanVienId } = await getNhanVienId(req);
  const badgeCounts = await yeuCauService.layBadgeCounts(nhanVienId);

  return sendResponse(
    res,
    200,
    true,
    badgeCounts,
    null,
    "Lấy badge counts thành công"
  );
});
/**
 * Lấy badge counts cho tabs trong page
 * GET /api/workmanagement/yeucau/badge-counts-page?pageKey=YEU_CAU_TOI_GUI
 */
controller.layBadgeCountsTheoPage = catchAsync(async (req, res, next) => {
  const { pageKey } = req.query;
  const { nhanVienId } = await getNhanVienId(req);

  // Lấy thông tin nhân viên để có KhoaID
  const NhanVien = require("../../../models/NhanVien");
  const nguoiXem = await NhanVien.findById(nhanVienId);

  const badgeCounts = await yeuCauService.layBadgeCountsTheoPage(
    nhanVienId,
    pageKey,
    nguoiXem
  );

  return sendResponse(
    res,
    200,
    true,
    badgeCounts,
    null,
    "Lấy badge counts theo page thành công"
  );
});
/**
 * Lấy dashboard metrics cho người xử lý
 * GET /api/workmanagement/yeucau/dashboard/xu-ly
 */
controller.layDashboardXuLy = catchAsync(async (req, res, next) => {
  const { nhanVienId } = await getNhanVienId(req);
  const dashboard = await yeuCauService.layDashboardXuLy(nhanVienId);

  return sendResponse(
    res,
    200,
    true,
    dashboard,
    null,
    "Lấy dashboard xử lý thành công"
  );
});

/**
 * Lấy dashboard metrics cho người điều phối
 * GET /api/workmanagement/yeucau/dashboard/dieu-phoi
 */
controller.layDashboardDieuPhoi = catchAsync(async (req, res, next) => {
  const { nhanVienId } = await getNhanVienId(req);
  const dashboard = await yeuCauService.layDashboardDieuPhoi(nhanVienId);

  return sendResponse(
    res,
    200,
    true,
    dashboard,
    null,
    "Lấy dashboard điều phối thành công"
  );
});

/**
 * Gán nhiệm vụ thường quy cho yêu cầu
 * POST /api/workmanagement/yeucau/:id/assign-routine-task
 */
controller.ganNhiemVuThuongQuy = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { nhiemVuThuongQuyID, isKhac } = req.body || {};

  const yeuCau = await yeuCauService.ganNhiemVuThuongQuy(
    id,
    { nhiemVuThuongQuyID, isKhac },
    req
  );

  return sendResponse(
    res,
    200,
    true,
    yeuCau,
    null,
    "Gán nhiệm vụ thường quy thành công"
  );
});

/**
 * Upload files cho yêu cầu (không kèm bình luận)
 * POST /api/workmanagement/yeucau/:id/files
 */
controller.uploadFiles = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { moTa } = req.body || {};
  const dtos = await yeuCauService.uploadFilesForYeuCau(
    id,
    req.files || [],
    { moTa },
    req
  );
  return sendResponse(res, 201, true, dtos, null, "Tải tệp thành công");
});

/**
 * Tạo bình luận kèm tệp đính kèm (atomic)
 * POST /api/workmanagement/yeucau/:id/comments
 */
controller.createCommentWithFiles = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { noiDung, parentId } = req.body || {};
  const result = await yeuCauService.createCommentWithFiles(
    id,
    noiDung,
    req.files || [],
    req,
    parentId || null
  );
  return sendResponse(
    res,
    201,
    true,
    result,
    null,
    "Tạo bình luận kèm tệp thành công"
  );
});

/**
 * Lấy danh sách tệp theo yêu cầu
 * GET /api/workmanagement/yeucau/:id/files
 */
controller.listFiles = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, size = 50 } = req.query;
  const result = await yeuCauService.listFilesByYeuCau(id, { page, size }, req);
  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách tệp thành công"
  );
});

/**
 * Đếm số tệp theo yêu cầu
 * GET /api/workmanagement/yeucau/:id/files/count
 */
controller.countFiles = catchAsync(async (req, res) => {
  const { id } = req.params;
  const total = await yeuCauService.countFilesByYeuCau(id, req);
  return sendResponse(res, 200, true, { total }, null, "Đếm tệp thành công");
});

/**
 * Xóa tệp (soft delete)
 * DELETE /api/workmanagement/files/:fileId
 */
controller.deleteFile = catchAsync(async (req, res) => {
  const { fileId } = req.params;
  const dto = await yeuCauService.deleteFile(fileId, req);
  return sendResponse(res, 200, true, dto, null, "Xóa tệp thành công");
});

/**
 * Thu hồi bình luận (xóa cả nội dung và tệp)
 * DELETE /api/workmanagement/yeucau/:yeuCauId/binh-luan/:commentId
 */
controller.recallComment = catchAsync(async (req, res) => {
  const { yeuCauId, commentId } = req.params;
  const result = await yeuCauService.recallComment(yeuCauId, commentId, req);
  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Thu hồi bình luận thành công"
  );
});

/**
 * Thu hồi nội dung bình luận (giữ tệp)
 * PATCH /api/workmanagement/yeucau/:yeuCauId/binh-luan/:commentId/text
 */
controller.recallCommentText = catchAsync(async (req, res) => {
  const { yeuCauId, commentId } = req.params;
  const result = await yeuCauService.recallCommentText(
    yeuCauId,
    commentId,
    req
  );
  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Thu hồi nội dung bình luận thành công"
  );
});

// ============== KPI EVALUATION DASHBOARD ==============

/**
 * Get counts of YeuCau grouped by NhiemVuThuongQuyID
 * GET /api/workmanagement/yeucau/counts-by-nhiemvu
 * Query: nhiemVuThuongQuyIDs (comma-separated), nhanVienID, chuKyDanhGiaID
 */
controller.getCountsByNhiemVu = catchAsync(async (req, res, next) => {
  const { nhiemVuThuongQuyIDs, nhanVienID, chuKyDanhGiaID } = req.query;

  if (!nhiemVuThuongQuyIDs || !nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Thiếu tham số bắt buộc: nhiemVuThuongQuyIDs, nhanVienID, chuKyDanhGiaID",
      "MISSING_PARAMS"
    );
  }

  const nhiemVuIDs = nhiemVuThuongQuyIDs.split(",").map((id) => id.trim());

  const counts = await yeuCauService.layYeuCauCountsByNhiemVu({
    nhiemVuThuongQuyIDs: nhiemVuIDs,
    nhanVienID,
    chuKyDanhGiaID,
  });

  return sendResponse(
    res,
    200,
    true,
    counts,
    null,
    "Lấy số lượng yêu cầu thành công"
  );
});

/**
 * Get dashboard data for YeuCau by NhiemVuThuongQuy
 * GET /api/workmanagement/yeucau/dashboard-by-nhiemvu
 * Query: nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID
 */
controller.getDashboardByNhiemVu = catchAsync(async (req, res, next) => {
  const { nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID } = req.query;

  if (!nhiemVuThuongQuyID || !nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Thiếu tham số bắt buộc: nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID",
      "MISSING_PARAMS"
    );
  }

  const dashboardData = await yeuCauService.layYeuCauDashboardByNhiemVu({
    nhiemVuThuongQuyID,
    nhanVienID,
    chuKyDanhGiaID,
  });

  return sendResponse(
    res,
    200,
    true,
    dashboardData,
    null,
    "Lấy dashboard yêu cầu thành công"
  );
});

/**
 * Get dashboard for "other" YeuCau (not linked to NVTQ)
 * GET /api/workmanagement/yeucau/other-summary
 * Query: nhanVienID, chuKyDanhGiaID
 */
controller.getOtherYeuCauSummary = catchAsync(async (req, res, next) => {
  const { nhanVienID, chuKyDanhGiaID } = req.query;

  if (!nhanVienID || !chuKyDanhGiaID) {
    throw new AppError(
      400,
      "Thiếu tham số bắt buộc: nhanVienID, chuKyDanhGiaID",
      "MISSING_PARAMS"
    );
  }

  const data = await yeuCauService.layYeuCauOtherSummary({
    nhanVienID,
    chuKyDanhGiaID,
  });

  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy tổng hợp yêu cầu khác thành công"
  );
});

module.exports = controller;
