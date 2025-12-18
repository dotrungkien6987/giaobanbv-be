/**
 * YeuCau State Machine Service
 *
 * Quản lý:
 * - Transitions giữa các trạng thái
 * - Validation permissions và required fields
 * - Side effects (cập nhật fields liên quan)
 * - Ghi lịch sử
 * - Trigger notifications
 */

const mongoose = require("mongoose");
const dayjs = require("dayjs");
const { AppError } = require("../../../helpers/utils");
const YeuCau = require("../models/YeuCau");
const LichSuYeuCau = require("../models/LichSuYeuCau");
const LyDoTuChoi = require("../models/LyDoTuChoi");
const CauHinhThongBaoKhoa = require("../models/CauHinhThongBaoKhoa");
const notificationService = require("./notificationService");
const triggerService = require("../../../services/triggerService");
const NhanVien = require("../../../models/NhanVien");

const { TRANG_THAI } = YeuCau;
const { HANH_DONG } = LichSuYeuCau;

/**
 * TRANSITION CONFIGURATION
 * Định nghĩa các transitions hợp lệ và rules
 */
const TRANSITIONS = {
  [TRANG_THAI.MOI]: {
    TIEP_NHAN: {
      nextState: TRANG_THAI.DANG_XU_LY,
      hanhDong: HANH_DONG.TIEP_NHAN,
      requiredFields: ["ThoiGianHen"],
      notificationType: "YEUCAU_DA_TIEP_NHAN",
    },
    TU_CHOI: {
      nextState: TRANG_THAI.TU_CHOI,
      hanhDong: HANH_DONG.TU_CHOI,
      requiredFields: ["LyDoTuChoiID"],
      notificationType: "YEUCAU_BI_TU_CHOI",
    },
    XOA: {
      nextState: null, // Hard delete
      hanhDong: HANH_DONG.XOA,
      notificationType: "YEUCAU_DA_XOA",
    },
    DIEU_PHOI: {
      nextState: TRANG_THAI.MOI,
      hanhDong: HANH_DONG.DIEU_PHOI,
      requiredFields: ["NhanVienXuLyID"],
      notificationType: "YEUCAU_DUOC_DIEU_PHOI",
    },
    GUI_VE_KHOA: {
      nextState: TRANG_THAI.MOI,
      hanhDong: HANH_DONG.GUI_VE_KHOA,
      notificationType: "YEUCAU_GUI_VE_KHOA",
      requiredFields: ["GhiChu"],
    },
    NHAC_LAI: {
      nextState: TRANG_THAI.MOI,
      hanhDong: HANH_DONG.NHAC_LAI,
      rateLimit: { max: 3, per: "day" },
      notificationType: "YEUCAU_NHAC_LAI",
    },
    BAO_QUAN_LY: {
      nextState: TRANG_THAI.MOI,
      hanhDong: HANH_DONG.BAO_QUAN_LY,
      rateLimit: { max: 1, per: "day" },
      notificationType: "YEUCAU_BAO_QUAN_LY",
    },
  },

  [TRANG_THAI.DANG_XU_LY]: {
    HOAN_THANH: {
      nextState: TRANG_THAI.DA_HOAN_THANH,
      hanhDong: HANH_DONG.HOAN_THANH,
      notificationType: "YEUCAU_DA_HOAN_THANH",
    },
    HUY_TIEP_NHAN: {
      nextState: TRANG_THAI.MOI,
      hanhDong: HANH_DONG.HUY_TIEP_NHAN,
      notificationType: "YEUCAU_HUY_TIEP_NHAN",
    },
    DOI_THOI_GIAN_HEN: {
      nextState: TRANG_THAI.DANG_XU_LY,
      hanhDong: HANH_DONG.DOI_THOI_GIAN_HEN,
      requiredFields: ["ThoiGianHen"],
      notificationType: "YEUCAU_DOI_THOI_GIAN_HEN",
    },
  },

  [TRANG_THAI.DA_HOAN_THANH]: {
    DANH_GIA: {
      nextState: TRANG_THAI.DA_DONG,
      hanhDong: HANH_DONG.DANH_GIA,
      requiredFields: ["DanhGia.SoSao"],
      notificationType: "YEUCAU_DUOC_DANH_GIA",
    },
    DONG: {
      nextState: TRANG_THAI.DA_DONG,
      hanhDong: HANH_DONG.DONG,
    },
    TU_DONG_DONG: {
      nextState: TRANG_THAI.DA_DONG,
      hanhDong: HANH_DONG.TU_DONG_DONG,
      notificationType: "YEUCAU_TU_DONG_DONG",
    },
    YEU_CAU_XU_LY_TIEP: {
      nextState: TRANG_THAI.DANG_XU_LY,
      hanhDong: HANH_DONG.YEU_CAU_XU_LY_TIEP,
      notificationType: "YEUCAU_YEU_CAU_XU_LY_TIEP",
    },
  },

  [TRANG_THAI.DA_DONG]: {
    MO_LAI: {
      nextState: TRANG_THAI.DA_HOAN_THANH,
      hanhDong: HANH_DONG.MO_LAI,
      requiredFields: ["LyDoMoLai"],
      timeLimit: { days: 7, from: "NgayDong" },
      notificationType: "YEUCAU_MO_LAI",
    },
  },

  [TRANG_THAI.TU_CHOI]: {
    APPEAL: {
      nextState: TRANG_THAI.MOI,
      hanhDong: HANH_DONG.APPEAL,
      requiredFields: ["LyDoAppeal"],
      notificationType: "YEUCAU_APPEAL",
    },
  },
};

/**
 * Kiểm tra quyền thực hiện action
 */
async function checkPermission(yeuCau, action, nguoiThucHienId, userRole) {
  const nguoiThucHienIdStr = nguoiThucHienId.toString();
  const isAdmin = ["admin", "superadmin"].includes(
    (userRole || "").toLowerCase()
  );

  // Admin có thể XOA bất kỳ yêu cầu nào
  if (action === "XOA" && isAdmin) {
    return true;
  }

  const isNguoiGui = yeuCau.laNguoiGui(nguoiThucHienId);
  const isNguoiNhan = yeuCau.laNguoiNhan(nguoiThucHienId);
  const isNguoiDuocDieuPhoi = yeuCau.laNguoiDuocDieuPhoi(nguoiThucHienId);
  const isNguoiXuLy = yeuCau.laNguoiXuLy(nguoiThucHienId);

  // Kiểm tra có phải người điều phối của khoa đích không
  let isDieuPhoi = false;
  if (yeuCau.LoaiNguoiNhan === "KHOA") {
    const config = await CauHinhThongBaoKhoa.findOne({
      KhoaID: yeuCau.KhoaDichID,
    });
    isDieuPhoi = config?.laNguoiDieuPhoi(nguoiThucHienId) || false;
  }

  // Permission matrix theo action
  const permissionMap = {
    // MOI state
    TIEP_NHAN: isDieuPhoi || isNguoiNhan || isNguoiDuocDieuPhoi,
    TU_CHOI: isDieuPhoi || isNguoiNhan || isNguoiDuocDieuPhoi,
    XOA: isNguoiGui, // Chỉ người tạo mới được xóa
    DIEU_PHOI: isDieuPhoi,
    GUI_VE_KHOA: isNguoiNhan || isNguoiDuocDieuPhoi,
    NHAC_LAI: isNguoiGui,
    BAO_QUAN_LY: isNguoiGui,

    // DANG_XU_LY state
    HOAN_THANH: isNguoiXuLy,
    HUY_TIEP_NHAN: isNguoiXuLy,
    DOI_THOI_GIAN_HEN: isNguoiXuLy,

    // DA_HOAN_THANH state
    DANH_GIA: isNguoiGui,
    DONG: isNguoiGui || isNguoiXuLy || isAdmin,
    TU_DONG_DONG: false, // Chỉ SYSTEM
    YEU_CAU_XU_LY_TIEP: isNguoiXuLy,

    // DA_DONG state
    MO_LAI: isNguoiGui || isNguoiXuLy,

    // TU_CHOI state
    APPEAL: isNguoiGui,
  };

  return permissionMap[action] || false;
}

/**
 * Validate required fields cho action
 */
function validateRequiredFields(action, data, transitionConfig) {
  const missing = [];

  if (transitionConfig.requiredFields) {
    for (const field of transitionConfig.requiredFields) {
      // Handle nested fields like "DanhGia.SoSao"
      const parts = field.split(".");
      let value = data;
      for (const part of parts) {
        value = value?.[part];
      }
      if (value === undefined || value === null || value === "") {
        missing.push(field);
      }
    }
  }

  // Special validation: DanhGia.NhanXet bắt buộc khi SoSao < 3
  if (action === "DANH_GIA" && data.DanhGia?.SoSao < 3) {
    if (!data.DanhGia?.NhanXet?.trim()) {
      missing.push("DanhGia.NhanXet (bắt buộc khi đánh giá < 3 sao)");
    }
  }

  if (missing.length > 0) {
    throw new AppError(
      400,
      `Thiếu thông tin bắt buộc: ${missing.join(", ")}`,
      "MISSING_REQUIRED_FIELDS"
    );
  }
}

/**
 * Validate time limit (cho MO_LAI)
 */
function validateTimeLimit(yeuCau, transitionConfig) {
  if (!transitionConfig.timeLimit) return;

  const { days, from } = transitionConfig.timeLimit;
  const fromDate = yeuCau[from];

  if (!fromDate) {
    throw new AppError(400, "Không thể xác định thời gian gốc", "INVALID_DATE");
  }

  const now = new Date();
  const diffDays = (now - fromDate) / (1000 * 60 * 60 * 24);

  if (diffDays > days) {
    throw new AppError(
      400,
      `Đã quá thời hạn ${days} ngày để thực hiện hành động này`,
      "TIME_LIMIT_EXCEEDED"
    );
  }
}

/**
 * Validate rate limit
 */
async function validateRateLimit(
  yeuCauId,
  nguoiThucHienId,
  action,
  transitionConfig
) {
  if (!transitionConfig.rateLimit) return;

  const result = await LichSuYeuCau.kiemTraRateLimit(
    yeuCauId,
    nguoiThucHienId,
    transitionConfig.hanhDong
  );

  if (!result.allowed) {
    throw new AppError(
      429,
      `Bạn đã đạt giới hạn ${result.limit} lần/ngày cho hành động này`,
      "RATE_LIMIT_EXCEEDED"
    );
  }
}

/**
 * Apply side effects khi transition
 */
function applySideEffects(yeuCau, action, data, nguoiThucHienId) {
  const now = new Date();

  switch (action) {
    case "TIEP_NHAN":
      yeuCau.NguoiXuLyID = nguoiThucHienId;
      yeuCau.NgayTiepNhan = now;
      yeuCau.ThoiGianHen = data.ThoiGianHen || yeuCau.tinhThoiGianHen(now);
      break;

    case "TU_CHOI":
      yeuCau.LyDoTuChoiID = data.LyDoTuChoiID;
      yeuCau.GhiChuTuChoi = data.GhiChuTuChoi || null;
      break;

    case "DIEU_PHOI":
      yeuCau.NguoiDieuPhoiID = nguoiThucHienId;
      yeuCau.NguoiDuocDieuPhoiID = data.NhanVienXuLyID;
      yeuCau.NgayDieuPhoi = now;
      break;

    case "GUI_VE_KHOA":
      yeuCau.LoaiNguoiNhan = "KHOA";
      yeuCau.NguoiNhanID = null;
      yeuCau.NguoiDuocDieuPhoiID = null;
      break;

    case "HUY_TIEP_NHAN":
      yeuCau.NguoiXuLyID = null;
      yeuCau.NgayTiepNhan = null;
      yeuCau.ThoiGianHen = null;
      break;

    case "DOI_THOI_GIAN_HEN":
      yeuCau.ThoiGianHen = data.ThoiGianHen;
      break;

    case "HOAN_THANH":
      yeuCau.NgayHoanThanh = now;
      break;

    case "DANH_GIA":
      yeuCau.DanhGia = {
        SoSao: data.DanhGia.SoSao,
        NhanXet: data.DanhGia.NhanXet || null,
        NgayDanhGia: now,
      };
      yeuCau.NgayDong = now;
      break;

    case "DONG":
      yeuCau.NgayDong = now;
      break;

    case "TU_DONG_DONG":
      yeuCau.DanhGia = {
        SoSao: 5,
        NhanXet: "Tự động đánh giá 5 sao do không phản hồi trong 3 ngày",
        NgayDanhGia: now,
      };
      yeuCau.NgayDong = now;
      break;

    case "YEU_CAU_XU_LY_TIEP":
      yeuCau.NgayHoanThanh = null;
      break;

    case "MO_LAI":
      yeuCau.NgayDong = null;
      // Giữ DanhGia cũ
      break;

    case "APPEAL":
      yeuCau.LyDoTuChoiID = null;
      yeuCau.GhiChuTuChoi = null;
      break;
  }
}

/**
 * Trigger notifications
 */
/**
 * Fire notification trigger using new trigger service
 * @private
 */
async function fireNotificationTrigger(
  yeuCau,
  action,
  transitionConfig,
  nguoiThucHienId,
  data
) {
  try {
    // Map action to trigger key
    const triggerKeyMap = {
      TIEP_NHAN: "YeuCau.TIEP_NHAN",
      TU_CHOI: "YeuCau.TU_CHOI",
      DIEU_PHOI: "YeuCau.DIEU_PHOI",
      GUI_VE_KHOA: "YeuCau.GUI_VE_KHOA",
      HOAN_THANH: "YeuCau.HOAN_THANH",
      HUY_TIEP_NHAN: "YeuCau.HUY_TIEP_NHAN",
      DOI_THOI_GIAN_HEN: "YeuCau.DOI_THOI_GIAN_HEN",
      DANH_GIA: "YeuCau.DANH_GIA",
      TU_DONG_DONG: "YeuCau.DONG",
      DONG: "YeuCau.DONG",
      MO_LAI: "YeuCau.MO_LAI",
      YEU_CAU_XU_LY_TIEP: "YeuCau.YEU_CAU_XU_LY_TIEP",
      NHAC_LAI: "YeuCau.NHAC_LAI",
      BAO_QUAN_LY: "YeuCau.BAO_QUAN_LY",
      XOA: "YeuCau.XOA",
    };

    const triggerKey = triggerKeyMap[action];
    if (!triggerKey) {
      console.log(
        `[YeuCauStateMachine] No trigger mapping for action: ${action}`
      );
      return;
    }

    // Populate yêu cầu để lấy đủ data
    const populated = await YeuCau.findById(yeuCau._id)
      .populate("NguoiYeuCauID", "Ten")
      .populate("NguoiXuLyID", "Ten")
      .populate("NguoiDieuPhoiID", "Ten")
      .populate("NguoiDuocDieuPhoiID", "Ten")
      .populate("KhoaNguonID", "TenKhoa")
      .populate("KhoaDichID", "TenKhoa")
      .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
      .lean();

    if (!populated) return;

    // Get performer name
    const performer = await NhanVien.findById(nguoiThucHienId)
      .select("Ten")
      .lean();

    // Prepare context based on action
    const context = {
      yeuCau: populated,
      performerId: nguoiThucHienId,

      // Common variables
      requestCode: populated.MaYeuCau || "",
      requestTitle: populated.TieuDe || "Yêu cầu",
      requestId: populated._id.toString(),
      requesterName: populated.NguoiYeuCauID?.Ten || "Người yêu cầu",
      sourceDept: populated.KhoaNguonID?.TenKhoa || "Khoa",
      targetDept: populated.KhoaDichID?.TenKhoa || "Khoa",
      requestType: populated.DanhMucYeuCauID?.TenLoaiYeuCau || "Yêu cầu",
      deadline: populated.ThoiGianHen
        ? dayjs(populated.ThoiGianHen).format("DD/MM/YYYY HH:mm")
        : "Chưa có",
    };

    // Action-specific variables
    switch (action) {
      case "TIEP_NHAN":
        context.accepterName = performer?.Ten || "Người tiếp nhận";
        context.note = data.GhiChu || "Không có ghi chú";
        break;

      case "TU_CHOI":
        context.rejectorName = performer?.Ten || "Người từ chối";
        context.reason = data.GhiChuTuChoi || data.GhiChu || "Không có lý do";
        break;

      case "DIEU_PHOI":
        context.dispatcherName = performer?.Ten || "Người điều phối";
        context.assigneeName =
          populated.NguoiDuocDieuPhoiID?.Ten || "Người được phân công";
        context.content = populated.MoTa || "Không có nội dung";
        break;

      case "GUI_VE_KHOA":
        context.performerName = populated.NguoiXuLyID?.Ten || "Người xử lý";
        context.result = data.GhiChu || "Đã xử lý";
        break;

      case "HOAN_THANH":
        context.completerName = performer?.Ten || "Người hoàn thành";
        context.completedTime = dayjs().format("DD/MM/YYYY HH:mm");
        context.result = data.KetQua || data.GhiChu || "Hoàn thành";
        break;

      case "HUY_TIEP_NHAN":
        context.cancellerName = performer?.Ten || "Người hủy";
        context.reason = data.GhiChu || "Không có lý do";
        break;

      case "DOI_THOI_GIAN_HEN":
        context.updaterName = performer?.Ten || "Người cập nhật";
        context.oldDeadline = data.oldDeadline
          ? dayjs(data.oldDeadline).format("DD/MM/YYYY HH:mm")
          : "Chưa có";
        context.newDeadline = dayjs(populated.ThoiGianHen).format(
          "DD/MM/YYYY HH:mm"
        );
        context.reason = data.GhiChu || "Không có lý do";
        break;

      case "DANH_GIA":
        context.raterName = performer?.Ten || "Người đánh giá";
        context.rating = data?.DanhGia?.SoSao || 0;
        context.feedback = data?.DanhGia?.NhanXet || "Không có nhận xét";
        break;

      case "DONG":
      case "TU_DONG_DONG":
        context.closerName = performer?.Ten || "Hệ thống";
        context.finalStatus = populated.TrangThai;
        context.note = data.GhiChu || "Đã đóng";
        break;

      case "MO_LAI":
      case "YEU_CAU_XU_LY_TIEP":
        context.reopenerName = performer?.Ten || "Người mở lại";
        context.reason = data.LyDoMoLai || data.GhiChu || "Không có lý do";
        break;

      case "NHAC_LAI":
        context.reminderNote = data.GhiChu || "Nhắc lại yêu cầu";
        break;

      case "BAO_QUAN_LY":
        context.escalationReason = data.GhiChu || "Cần xử lý khẩn cấp";
        break;

      case "XOA":
        context.deleterName = performer?.Ten || "Người xóa";
        context.reason = data.GhiChu || "Không có lý do";
        break;
    }

    // Fire trigger
    console.log(`[YeuCauStateMachine] 🔥 About to fire trigger: ${triggerKey}`);
    console.log(`[YeuCauStateMachine] 📦 Context:`, {
      requestId: context.requestId,
      requestCode: context.requestCode,
      requesterName: context.requesterName,
      assigneeName: context.assigneeName,
      dispatcherName: context.dispatcherName,
      performerId: context.performerId,
      hasYeuCau: !!context.yeuCau,
      yeuCauNguoiYeuCauID: context.yeuCau?.NguoiYeuCauID,
      yeuCauNguoiDuocDieuPhoiID: context.yeuCau?.NguoiDuocDieuPhoiID,
    });

    await triggerService.fire(triggerKey, context);

    console.log(`[YeuCauStateMachine] ✅ Fired trigger: ${triggerKey}`);
  } catch (error) {
    // Log but don't throw - notification failure shouldn't block workflow
    console.error(
      `[YeuCauStateMachine] ❌ Notification trigger failed for ${action}:`,
      error.message
    );
  }
}

/**
 * MAIN: Execute Transition
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @param {string} action - Tên action
 * @param {Object} data - Dữ liệu cho action
 * @param {ObjectId} nguoiThucHienId - ID người thực hiện (NhanVienID)
 * @param {string} userRole - Vai trò user (từ User.PhanQuyen)
 * @returns {Promise<YeuCau>} Yêu cầu sau khi transition
 */
async function executeTransition(
  yeuCauId,
  action,
  data = {},
  nguoiThucHienId,
  userRole
) {
  // 1. Load yêu cầu
  const yeuCau = await YeuCau.findById(yeuCauId);
  if (!yeuCau) {
    throw new AppError(404, "Không tìm thấy yêu cầu", "YEUCAU_NOT_FOUND");
  }

  if (yeuCau.isDeleted) {
    throw new AppError(400, "Yêu cầu đã bị xóa", "YEUCAU_DELETED");
  }

  // 2. Check transition exists
  const stateTransitions = TRANSITIONS[yeuCau.TrangThai];
  if (!stateTransitions || !stateTransitions[action]) {
    throw new AppError(
      400,
      `Hành động "${action}" không hợp lệ cho trạng thái "${yeuCau.TrangThai}"`,
      "INVALID_TRANSITION"
    );
  }

  const transitionConfig = stateTransitions[action];

  // 3. Check permission
  const hasPermission = await checkPermission(
    yeuCau,
    action,
    nguoiThucHienId,
    userRole
  );
  if (!hasPermission) {
    throw new AppError(
      403,
      "Bạn không có quyền thực hiện hành động này",
      "PERMISSION_DENIED"
    );
  }

  // 4. Validate required fields
  validateRequiredFields(action, data, transitionConfig);

  // 5. Validate time limit (cho MO_LAI)
  validateTimeLimit(yeuCau, transitionConfig);

  // 6. Validate rate limit
  await validateRateLimit(yeuCauId, nguoiThucHienId, action, transitionConfig);

  // 7. Capture old state for history
  const tuGiaTri = {
    TrangThai: yeuCau.TrangThai,
    NguoiXuLyID: yeuCau.NguoiXuLyID,
    NguoiDuocDieuPhoiID: yeuCau.NguoiDuocDieuPhoiID,
    ThoiGianHen: yeuCau.ThoiGianHen,
  };

  // 8. Handle XOA (hard delete)
  if (action === "XOA") {
    // Gửi notification TRƯỚC KHI XÓA
    if (transitionConfig.notificationType) {
      try {
        // Xác định người nhận notification
        const recipientIds = [];

        // 1. Thêm NguoiDuocDieuPhoiID (nếu có - người đã được phân công cụ thể)
        if (yeuCau.NguoiDuocDieuPhoiID) {
          recipientIds.push(yeuCau.NguoiDuocDieuPhoiID);
        }

        // 2. Thêm NguoiXuLyID (nếu có - người đang xử lý)
        if (yeuCau.NguoiXuLyID) {
          recipientIds.push(yeuCau.NguoiXuLyID);
        }

        // 3. LUÔN lấy danh sách người điều phối từ cấu hình khoa đích
        const config = await CauHinhThongBaoKhoa.findOne({
          KhoaID: yeuCau.KhoaDichID,
        });
        if (config) {
          const dieuPhoiIds = config.layDanhSachNguoiDieuPhoiIDs?.() || [];
          recipientIds.push(...dieuPhoiIds);
        }

        // Lấy thông tin người gửi để hiển thị trong notification
        const NhanVien = mongoose.model("NhanVien");
        const nguoiGui = await NhanVien.findById(yeuCau.NguoiYeuCauID);

        // Loại bỏ trùng lặp và loại bỏ người thực hiện (không gửi cho chính mình)
        const uniqueRecipients = [
          ...new Set(recipientIds.map((id) => id?.toString())),
        ].filter((id) => id && id !== nguoiThucHienId.toString());

        if (uniqueRecipients.length > 0) {
          await notificationService.sendToMany({
            type: transitionConfig.notificationType,
            recipientIds: uniqueRecipients,
            data: {
              MaYeuCau: yeuCau.MaYeuCau,
              TieuDe: yeuCau.TieuDe,
              NguoiGui: nguoiGui?.Ten || "Không xác định",
            },
            priority: "normal",
          });
          console.log(
            `[YeuCauStateMachine] Delete notification sent to ${uniqueRecipients.length} recipients:`,
            uniqueRecipients
          );
        } else {
          console.log(
            `[YeuCauStateMachine] No recipients for delete notification (KhoaDichID: ${yeuCau.KhoaDichID})`
          );
        }
      } catch (error) {
        console.error(
          `[YeuCauStateMachine] Delete notification failed:`,
          error.message
        );
        // Không throw lỗi, tiếp tục xóa
      }
    }

    // Ghi log trước khi xóa
    await LichSuYeuCau.ghiLog({
      yeuCauId: yeuCau._id,
      hanhDong: HANH_DONG.XOA,
      nguoiThucHienId,
      tuGiaTri: yeuCau.toObject(),
      ghiChu: data.GhiChu || "Xóa yêu cầu",
    });

    await YeuCau.deleteOne({ _id: yeuCau._id });
    return null;
  }

  // 9. Apply transition
  if (transitionConfig.nextState) {
    yeuCau.TrangThai = transitionConfig.nextState;
  }

  // 10. Apply side effects
  applySideEffects(yeuCau, action, data, nguoiThucHienId);

  // 11. Save
  await yeuCau.save();

  // 12. Log history
  const denGiaTri = {
    TrangThai: yeuCau.TrangThai,
    NguoiXuLyID: yeuCau.NguoiXuLyID,
    NguoiDuocDieuPhoiID: yeuCau.NguoiDuocDieuPhoiID,
    ThoiGianHen: yeuCau.ThoiGianHen,
  };

  // NOTE: LichSuYeuCau.GhiChu cần phản ánh đúng dữ liệu action.
  // - TU_CHOI: hiển thị "<Tên lý do> - <Ghi chú>" (Option B)
  // - DANH_GIA: hiển thị "<SoSao> sao - <Nhận xét>" (nếu có)
  let ghiChu =
    data.GhiChu ||
    data.LyDoMoLai ||
    data.LyDoAppeal ||
    data.GhiChuTuChoi ||
    null;

  if (action === "TU_CHOI") {
    const ghiChuTuChoi = (data.GhiChuTuChoi || "").trim();
    let tenLyDo = null;
    if (data.LyDoTuChoiID) {
      try {
        const lyDo = await LyDoTuChoi.findById(data.LyDoTuChoiID)
          .select("TenLyDo")
          .lean();
        tenLyDo = lyDo?.TenLyDo || null;
      } catch (e) {
        tenLyDo = null;
      }
    }
    if (tenLyDo && ghiChuTuChoi) ghiChu = `${tenLyDo} - ${ghiChuTuChoi}`;
    else if (tenLyDo) ghiChu = tenLyDo;
    else if (ghiChuTuChoi) ghiChu = ghiChuTuChoi;
    else ghiChu = null;
  }

  if (action === "DANH_GIA") {
    const soSao = data?.DanhGia?.SoSao;
    const nhanXet = (data?.DanhGia?.NhanXet || "").trim();
    if (soSao !== undefined && soSao !== null) {
      ghiChu = nhanXet ? `${soSao} sao - ${nhanXet}` : `${soSao} sao`;
    } else {
      ghiChu = nhanXet || null;
    }
  }

  await LichSuYeuCau.ghiLog({
    yeuCauId: yeuCau._id,
    hanhDong: transitionConfig.hanhDong,
    nguoiThucHienId,
    tuGiaTri,
    denGiaTri,
    ghiChu,
  });

  // 13. Trigger notifications (async, non-blocking)
  fireNotificationTrigger(
    yeuCau,
    action,
    transitionConfig,
    nguoiThucHienId,
    data
  );

  return yeuCau;
}

/**
 * Get available actions for user
 * @param {YeuCau} yeuCau - Yêu cầu
 * @param {ObjectId} nguoiThucHienId - ID người dùng (NhanVienID)
 * @param {string} userRole - Vai trò user
 * @returns {Promise<string[]>} Danh sách actions khả dụng
 */
async function getAvailableActions(yeuCau, nguoiThucHienId, userRole) {
  const stateTransitions = TRANSITIONS[yeuCau.TrangThai];
  if (!stateTransitions) return [];

  const availableActions = [];

  for (const action of Object.keys(stateTransitions)) {
    // Skip SYSTEM-only actions
    if (action === "TU_DONG_DONG") continue;

    const hasPermission = await checkPermission(
      yeuCau,
      action,
      nguoiThucHienId,
      userRole
    );

    if (hasPermission) {
      // Check time limit for MO_LAI
      if (action === "MO_LAI") {
        try {
          validateTimeLimit(yeuCau, stateTransitions[action]);
          availableActions.push(action);
        } catch {
          // Time limit exceeded, don't add action
        }
      } else {
        availableActions.push(action);
      }
    }
  }

  return availableActions;
}

/**
 * Execute system auto-close (for Agenda job)
 */
async function autoClose(yeuCauId) {
  return executeTransition(
    yeuCauId,
    "TU_DONG_DONG",
    {},
    null, // System
    "SYSTEM"
  );
}

module.exports = {
  TRANSITIONS,
  executeTransition,
  getAvailableActions,
  autoClose,
  checkPermission,
};
