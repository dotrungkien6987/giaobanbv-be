/**
 * Home Controller - API cho Trang chủ
 * Tạo riêng để không ảnh hưởng đến các API hiện có
 *
 * @module workmanagement/controllers/home
 */

const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const CongViec = require("../models/CongViec");
const YeuCau = require("../models/YeuCau");
const mongoose = require("mongoose");

const controller = {};

/**
 * Lấy summary tổng hợp cho Trang chủ
 * GET /api/workmanagement/home/summary/:nhanVienId
 *
 * @returns {Object} Summary gồm:
 *   - congViec: { dangLam, toiGiao, gap, quaHan }
 *   - yeuCau: { toiGui, canXuLy, quaHan }
 *   - alert: { hasUrgent, message, type }
 */
controller.getHomeSummary = catchAsync(async (req, res, next) => {
  const { nhanVienId } = req.params;

  if (!mongoose.Types.ObjectId.isValid(nhanVienId)) {
    throw new AppError(400, "NhanVienId không hợp lệ", "INVALID_ID");
  }

  const nhanVienObjId = new mongoose.Types.ObjectId(nhanVienId);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // ========== CÔNG VIỆC ==========

  // Công việc TÔI đang thực hiện (là người chính hoặc người tham gia)
  const dangLam = await CongViec.countDocuments({
    $or: [
      { NguoiChinhID: nhanVienObjId },
      { "NguoiThamGia.NhanVienID": nhanVienObjId },
    ],
    TrangThai: { $nin: ["TAO_MOI", "HOAN_THANH"] },
    isDeleted: { $ne: true },
  });

  // Công việc TÔI giao (bao gồm cả tự giao cho mình)
  const toiGiao = await CongViec.countDocuments({
    NguoiGiaoViecID: nhanVienObjId,
    TrangThai: { $nin: ["TAO_MOI", "HOAN_THANH"] },
    isDeleted: { $ne: true },
  });

  // Công việc GẤP - deadline trong 24h (liên quan đến tôi)
  const cvGap = await CongViec.countDocuments({
    $or: [
      { NguoiChinhID: nhanVienObjId },
      { NguoiGiaoViecID: nhanVienObjId },
      { "NguoiThamGia.NhanVienID": nhanVienObjId },
    ],
    TrangThai: { $nin: ["TAO_MOI", "HOAN_THANH"] },
    NgayHetHan: { $exists: true, $ne: null, $lte: tomorrow, $gt: now },
    isDeleted: { $ne: true },
  });

  // Công việc QUÁ HẠN (liên quan đến tôi)
  const cvQuaHan = await CongViec.countDocuments({
    $or: [
      { NguoiChinhID: nhanVienObjId },
      { NguoiGiaoViecID: nhanVienObjId },
      { "NguoiThamGia.NhanVienID": nhanVienObjId },
    ],
    TrangThai: { $nin: ["TAO_MOI", "HOAN_THANH"] },
    NgayHetHan: { $exists: true, $ne: null, $lt: now },
    isDeleted: { $ne: true },
  });

  // ========== YÊU CẦU ==========

  // Yêu cầu TÔI gửi (còn active, chưa đóng)
  const toiGui = await YeuCau.countDocuments({
    NguoiYeuCauID: nhanVienObjId,
    TrangThai: { $in: ["MOI", "DANG_XU_LY", "DA_HOAN_THANH"] },
    isDeleted: { $ne: true },
  });

  // Yêu cầu CẦN TÔI xử lý (perspective CÁ NHÂN)
  const canXuLy = await YeuCau.countDocuments({
    $or: [
      { NguoiDuocDieuPhoiID: nhanVienObjId }, // Được điều phối cho tôi
      { NguoiNhanID: nhanVienObjId }, // Gửi trực tiếp cho tôi
      { NguoiXuLyID: nhanVienObjId }, // Tôi đang xử lý
    ],
    TrangThai: { $in: ["MOI", "DANG_XU_LY"] },
    isDeleted: { $ne: true },
  });

  // Yêu cầu QUÁ HẠN mà tôi cần xử lý
  const ycQuaHan = await YeuCau.countDocuments({
    $or: [
      { NguoiDuocDieuPhoiID: nhanVienObjId },
      { NguoiNhanID: nhanVienObjId },
      { NguoiXuLyID: nhanVienObjId },
    ],
    TrangThai: { $in: ["MOI", "DANG_XU_LY"] },
    ThoiGianHen: { $exists: true, $ne: null, $lt: now },
    isDeleted: { $ne: true },
  });

  // ========== ALERT BANNER ==========
  const totalQuaHan = cvQuaHan + ycQuaHan;
  const totalGap = cvGap;

  let alert = null;
  if (totalQuaHan > 0 || totalGap > 0) {
    const parts = [];
    if (cvQuaHan > 0) parts.push(`${cvQuaHan} công việc quá hạn`);
    if (ycQuaHan > 0) parts.push(`${ycQuaHan} yêu cầu quá hạn`);
    if (cvGap > 0) parts.push(`${cvGap} công việc hết hạn trong 24h`);

    alert = {
      hasUrgent: true,
      message: `Bạn có ${parts.join(", ")}`,
      type: totalQuaHan > 0 ? "error" : "warning",
    };
  }

  return sendResponse(
    res,
    200,
    true,
    {
      congViec: {
        dangLam,
        toiGiao,
        gap: cvGap,
        quaHan: cvQuaHan,
      },
      yeuCau: {
        toiGui,
        canXuLy,
        quaHan: ycQuaHan,
      },
      alert,
    },
    null,
    "Lấy summary trang chủ thành công",
  );
});

/**
 * Lấy danh sách items cần xử lý gấp (mixed CongViec + YeuCau)
 * GET /api/workmanagement/home/urgent/:nhanVienId?limit=5
 */
controller.getUrgentItems = catchAsync(async (req, res, next) => {
  const { nhanVienId } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  if (!mongoose.Types.ObjectId.isValid(nhanVienId)) {
    throw new AppError(400, "NhanVienId không hợp lệ", "INVALID_ID");
  }

  const nhanVienObjId = new mongoose.Types.ObjectId(nhanVienId);
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Lấy CongViec gấp (deadline ≤ 24h hoặc quá hạn)
  const urgentCongViec = await CongViec.find({
    $or: [
      { NguoiChinhID: nhanVienObjId },
      { NguoiGiaoViecID: nhanVienObjId },
      { "NguoiThamGia.NhanVienID": nhanVienObjId },
    ],
    TrangThai: { $nin: ["TAO_MOI", "HOAN_THANH"] },
    NgayHetHan: { $exists: true, $ne: null, $lte: tomorrow },
    isDeleted: { $ne: true },
  })
    .sort({ NgayHetHan: 1 })
    .limit(limit * 2) // Lấy nhiều hơn để merge
    .populate("NguoiGiaoViecID", "Ten Images")
    .populate("NguoiChinhID", "Ten Images")
    .lean();

  // Lấy YeuCau gấp
  const urgentYeuCau = await YeuCau.find({
    $or: [
      { NguoiDuocDieuPhoiID: nhanVienObjId },
      { NguoiNhanID: nhanVienObjId },
      { NguoiXuLyID: nhanVienObjId },
    ],
    TrangThai: { $in: ["MOI", "DANG_XU_LY"] },
    ThoiGianHen: { $exists: true, $ne: null, $lte: tomorrow },
    isDeleted: { $ne: true },
  })
    .sort({ ThoiGianHen: 1 })
    .limit(limit * 2)
    .populate("NguoiYeuCauID", "Ten Images")
    .lean();

  // Helper function tính thời gian còn lại
  const getTimeRemaining = (deadline) => {
    const diff = deadline - now;
    if (diff < 0) {
      const hours = Math.abs(Math.floor(diff / (1000 * 60 * 60)));
      if (hours < 24) return `Quá hạn ${hours} giờ`;
      const days = Math.floor(hours / 24);
      return `Quá hạn ${days} ngày`;
    }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 24) return `Còn ${hours} giờ`;
    const days = Math.floor(hours / 24);
    return `Còn ${days} ngày`;
  };

  // Map CongViec
  const cvItems = urgentCongViec.map((cv) => {
    const isOverdue = cv.NgayHetHan < now;
    const isMyTask = cv.NguoiChinhID?._id?.toString() === nhanVienId;

    return {
      type: "CONG_VIEC",
      id: cv._id,
      maCongViec: cv.MaCongViec,
      tieuDe: cv.TieuDe,
      deadline: cv.NgayHetHan,
      status: cv.TrangThai,
      priority: cv.MucDoUuTien,
      isOverdue,
      timeRemaining: getTimeRemaining(cv.NgayHetHan),
      nguoiLienQuan: isMyTask
        ? {
            ten: cv.NguoiGiaoViecID?.Ten || "N/A",
            avatar: cv.NguoiGiaoViecID?.Images?.[0] || null,
            vaiTro: "Người giao",
          }
        : {
            ten: cv.NguoiChinhID?.Ten || "N/A",
            avatar: cv.NguoiChinhID?.Images?.[0] || null,
            vaiTro: "Người thực hiện",
          },
    };
  });

  // Map YeuCau
  const ycItems = urgentYeuCau.map((yc) => {
    const isOverdue = yc.ThoiGianHen < now;
    return {
      type: "YEU_CAU",
      id: yc._id,
      maYeuCau: yc.MaYeuCau,
      tieuDe: yc.TieuDe,
      deadline: yc.ThoiGianHen,
      status: yc.TrangThai,
      isOverdue,
      timeRemaining: getTimeRemaining(yc.ThoiGianHen),
      nguoiLienQuan: {
        ten: yc.NguoiYeuCauID?.Ten || "N/A",
        avatar: yc.NguoiYeuCauID?.Images?.[0] || null,
        vaiTro: "Người gửi",
      },
    };
  });

  // Merge và sort theo deadline (gấp nhất lên đầu)
  const allItems = [...cvItems, ...ycItems]
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, limit);

  return sendResponse(
    res,
    200,
    true,
    {
      items: allItems,
      total: cvItems.length + ycItems.length,
    },
    null,
    "Lấy danh sách urgent thành công",
  );
});

/**
 * Lấy hoạt động gần đây (mixed CongViec + YeuCau)
 * GET /api/workmanagement/home/activities/:nhanVienId?limit=5
 */
controller.getRecentActivities = catchAsync(async (req, res, next) => {
  const { nhanVienId } = req.params;
  const limit = parseInt(req.query.limit) || 5;

  if (!mongoose.Types.ObjectId.isValid(nhanVienId)) {
    throw new AppError(400, "NhanVienId không hợp lệ", "INVALID_ID");
  }

  const nhanVienObjId = new mongoose.Types.ObjectId(nhanVienId);

  // ========== HOẠT ĐỘNG CÔNG VIỆC ==========
  // Lấy từ LichSuTrangThai embedded trong CongViec
  const congViecWithHistory = await CongViec.aggregate([
    // Match công việc liên quan đến user
    {
      $match: {
        $or: [
          { NguoiChinhID: nhanVienObjId },
          { NguoiGiaoViecID: nhanVienObjId },
          { "NguoiThamGia.NhanVienID": nhanVienObjId },
        ],
        isDeleted: { $ne: true },
      },
    },
    // Unwind LichSuTrangThai
    { $unwind: "$LichSuTrangThai" },
    // Sort by ThoiGian desc
    { $sort: { "LichSuTrangThai.ThoiGian": -1 } },
    // Limit
    { $limit: limit * 2 },
    // Lookup NguoiThucHien
    {
      $lookup: {
        from: "nhanviens",
        localField: "LichSuTrangThai.NguoiThucHienID",
        foreignField: "_id",
        as: "nguoiThucHien",
      },
    },
    { $unwind: { path: "$nguoiThucHien", preserveNullAndEmptyArrays: true } },
    // Project needed fields
    {
      $project: {
        congViecId: "$_id",
        tieuDe: "$TieuDe",
        maCongViec: "$MaCongViec",
        hanhDong: "$LichSuTrangThai.HanhDong",
        tuTrangThai: "$LichSuTrangThai.TuTrangThai",
        denTrangThai: "$LichSuTrangThai.DenTrangThai",
        thoiGian: "$LichSuTrangThai.ThoiGian",
        ghiChu: "$LichSuTrangThai.GhiChu",
        nguoiThucHien: {
          _id: "$nguoiThucHien._id",
          ten: "$nguoiThucHien.Ten",
          avatar: { $arrayElemAt: ["$nguoiThucHien.Images", 0] },
        },
      },
    },
  ]);

  // ========== HOẠT ĐỘNG YÊU CẦU ==========
  // Lấy yêu cầu gần đây có thay đổi
  const yeuCauRecent = await YeuCau.find({
    $or: [
      { NguoiYeuCauID: nhanVienObjId },
      { NguoiDuocDieuPhoiID: nhanVienObjId },
      { NguoiNhanID: nhanVienObjId },
      { NguoiXuLyID: nhanVienObjId },
    ],
    isDeleted: { $ne: true },
  })
    .sort({ updatedAt: -1 })
    .limit(limit * 2)
    .populate("NguoiYeuCauID", "Ten Images")
    .populate("NguoiXuLyID", "Ten Images")
    .lean();

  // Map CongViec activities
  const cvActivities = congViecWithHistory.map((item) => ({
    type: "CONG_VIEC",
    loaiHoatDong: item.hanhDong || "TRANG_THAI",
    moTa: buildCongViecDescription(item),
    congViec: {
      id: item.congViecId,
      maCongViec: item.maCongViec,
      tieuDe: item.tieuDe,
    },
    nguoiThucHien: {
      _id: item.nguoiThucHien?._id,
      ten: item.nguoiThucHien?.ten || "Hệ thống",
      avatar: item.nguoiThucHien?.avatar || null,
    },
    thoiGian: item.thoiGian,
  }));

  // Map YeuCau activities (dựa trên updatedAt và TrangThai)
  const ycActivities = yeuCauRecent.map((yc) => ({
    type: "YEU_CAU",
    loaiHoatDong: mapYeuCauTrangThaiToAction(yc.TrangThai),
    moTa: buildYeuCauDescription(yc, nhanVienId),
    yeuCau: {
      id: yc._id,
      maYeuCau: yc.MaYeuCau,
      tieuDe: yc.TieuDe,
    },
    nguoiThucHien: {
      _id: yc.NguoiXuLyID?._id || yc.NguoiYeuCauID?._id,
      ten: yc.NguoiXuLyID?.Ten || yc.NguoiYeuCauID?.Ten || "N/A",
      avatar:
        yc.NguoiXuLyID?.Images?.[0] || yc.NguoiYeuCauID?.Images?.[0] || null,
    },
    thoiGian: yc.updatedAt,
  }));

  // Merge và sort by time desc
  const allActivities = [...cvActivities, ...ycActivities]
    .sort((a, b) => new Date(b.thoiGian) - new Date(a.thoiGian))
    .slice(0, limit);

  return sendResponse(
    res,
    200,
    true,
    { activities: allActivities },
    null,
    "Lấy hoạt động gần đây thành công",
  );
});

// ========== HELPER FUNCTIONS ==========

/**
 * Build mô tả cho hoạt động CongViec
 */
function buildCongViecDescription(item) {
  const nguoi = item.nguoiThucHien?.ten || "Ai đó";
  const action = item.hanhDong || "";

  // Map common actions
  const actionMap = {
    CREATE: `${nguoi} đã tạo công việc`,
    GIAO_VIEC: `${nguoi} đã giao công việc`,
    TIEP_NHAN: `${nguoi} đã tiếp nhận công việc`,
    BAT_DAU: `${nguoi} đã bắt đầu thực hiện`,
    CAP_NHAT_TIEN_DO: `${nguoi} đã cập nhật tiến độ`,
    YEU_CAU_DUYET: `${nguoi} đã yêu cầu duyệt`,
    DUYET: `${nguoi} đã duyệt hoàn thành`,
    TU_CHOI_DUYET: `${nguoi} đã từ chối duyệt`,
    HOAN_THANH: `${nguoi} đã hoàn thành công việc`,
    BINH_LUAN: `${nguoi} đã bình luận`,
  };

  if (actionMap[action]) return actionMap[action];

  // Fallback: mô tả chuyển trạng thái
  if (item.tuTrangThai && item.denTrangThai) {
    return `${nguoi} đã chuyển từ ${item.tuTrangThai} sang ${item.denTrangThai}`;
  }

  return `${nguoi} đã cập nhật công việc`;
}

/**
 * Map TrangThai YeuCau sang loại hoạt động
 */
function mapYeuCauTrangThaiToAction(trangThai) {
  const map = {
    MOI: "TAO_MOI",
    DANG_XU_LY: "TIEP_NHAN",
    DA_HOAN_THANH: "HOAN_THANH",
    DA_DONG: "DONG",
    TU_CHOI: "TU_CHOI",
  };
  return map[trangThai] || "CAP_NHAT";
}

/**
 * Build mô tả cho hoạt động YeuCau
 */
function buildYeuCauDescription(yc, currentNhanVienId) {
  const nguoiGui = yc.NguoiYeuCauID?.Ten || "Ai đó";
  const nguoiXuLy = yc.NguoiXuLyID?.Ten || "Ai đó";

  switch (yc.TrangThai) {
    case "MOI":
      return `${nguoiGui} đã gửi yêu cầu mới`;
    case "DANG_XU_LY":
      return `${nguoiXuLy} đang xử lý yêu cầu`;
    case "DA_HOAN_THANH":
      return `${nguoiXuLy} đã hoàn thành yêu cầu`;
    case "DA_DONG":
      return `Yêu cầu đã được đóng`;
    case "TU_CHOI":
      return `Yêu cầu đã bị từ chối`;
    default:
      return `Yêu cầu được cập nhật`;
  }
}

module.exports = controller;
