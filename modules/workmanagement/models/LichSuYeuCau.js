const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * HANH DONG YEU CAU - Enum đầy đủ theo nghiệp vụ
 */
const HANH_DONG = {
  // === LIFECYCLE ===
  TAO_MOI: "TAO_MOI",
  SUA_YEU_CAU: "SUA_YEU_CAU",
  XOA: "XOA", // Ghi lại trước hard delete

  // === TIẾP NHẬN / TỪ CHỐI ===
  TIEP_NHAN: "TIEP_NHAN",
  TU_CHOI: "TU_CHOI",
  HUY_TIEP_NHAN: "HUY_TIEP_NHAN", // DANG_XU_LY → MOI

  // === ĐIỀU PHỐI ===
  DIEU_PHOI: "DIEU_PHOI",
  GUI_VE_KHOA: "GUI_VE_KHOA", // Từ cá nhân/điều phối → khoa

  // === XỬ LÝ ===
  DOI_THOI_GIAN_HEN: "DOI_THOI_GIAN_HEN",
  HOAN_THANH: "HOAN_THANH",
  YEU_CAU_XU_LY_TIEP: "YEU_CAU_XU_LY_TIEP", // DA_HOAN_THANH → DANG_XU_LY

  // === ĐÁNH GIÁ & ĐÓNG ===
  DANH_GIA: "DANH_GIA", // Đánh giá + tự động đóng
  DONG: "DONG", // Đóng thủ công
  TU_DONG_DONG: "TU_DONG_DONG", // Hệ thống tự đóng sau 3 ngày
  MO_LAI: "MO_LAI", // Mở lại từ DA_DONG (trong 7 ngày)

  // === APPEAL ===
  APPEAL: "APPEAL", // Khiếu nại từ TU_CHOI → MOI

  // === ESCALATE ===
  NHAC_LAI: "NHAC_LAI", // Người gửi nhắc lại (3/ngày)
  BAO_QUAN_LY: "BAO_QUAN_LY", // Người gửi báo quản lý (1/ngày)

  // === COMMENT/FILE ===
  THEM_BINH_LUAN: "THEM_BINH_LUAN",
  THEM_FILE: "THEM_FILE",
};

/**
 * LichSuYeuCau - Ghi lại toàn bộ lịch sử thay đổi của yêu cầu
 */
const lichSuYeuCauSchema = new Schema(
  {
    YeuCauID: {
      type: Schema.ObjectId,
      ref: "YeuCau",
      required: [true, "Yêu cầu ID là bắt buộc"],
      index: true,
    },

    // Hành động
    HanhDong: {
      type: String,
      enum: {
        values: Object.values(HANH_DONG),
        message: "Hành động không hợp lệ",
      },
      required: [true, "Hành động là bắt buộc"],
    },

    // Ai thực hiện
    NguoiThucHienID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      required: [true, "Người thực hiện là bắt buộc"],
    },

    // Chi tiết thay đổi
    TuGiaTri: {
      type: Schema.Types.Mixed,
      // VD: { TrangThai: "MOI" }
    },

    DenGiaTri: {
      type: Schema.Types.Mixed,
      // VD: { TrangThai: "DANG_XU_LY", NguoiXuLyID: "..." }
    },

    // Ghi chú / Lý do
    GhiChu: {
      type: String,
      maxlength: [1000, "Ghi chú không được vượt quá 1000 ký tự"],
    },

    // Thời gian
    ThoiGian: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "lichsuyeucau",
  }
);

// Indexes
lichSuYeuCauSchema.index({ YeuCauID: 1, ThoiGian: -1 });
lichSuYeuCauSchema.index({ NguoiThucHienID: 1, ThoiGian: -1 });
lichSuYeuCauSchema.index({ HanhDong: 1, ThoiGian: -1 });
// Index cho rate limit check
lichSuYeuCauSchema.index({
  YeuCauID: 1,
  NguoiThucHienID: 1,
  HanhDong: 1,
  ThoiGian: -1,
});

// Statics

/**
 * Ghi log lịch sử
 * @param {Object} params
 * @param {ObjectId} params.yeuCauId - ID yêu cầu
 * @param {string} params.hanhDong - Hành động (từ HANH_DONG enum)
 * @param {ObjectId} params.nguoiThucHienId - ID người thực hiện
 * @param {Object} params.tuGiaTri - Giá trị trước khi thay đổi
 * @param {Object} params.denGiaTri - Giá trị sau khi thay đổi
 * @param {string} params.ghiChu - Ghi chú
 */
lichSuYeuCauSchema.statics.ghiLog = async function ({
  yeuCauId,
  hanhDong,
  nguoiThucHienId,
  tuGiaTri = null,
  denGiaTri = null,
  ghiChu = null,
}) {
  return this.create({
    YeuCauID: yeuCauId,
    HanhDong: hanhDong,
    NguoiThucHienID: nguoiThucHienId,
    TuGiaTri: tuGiaTri,
    DenGiaTri: denGiaTri,
    GhiChu: ghiChu,
    ThoiGian: new Date(),
  });
};

/**
 * Lấy lịch sử theo yêu cầu
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @param {Object} options - Các tùy chọn
 */
lichSuYeuCauSchema.statics.layTheoYeuCau = function (yeuCauId, options = {}) {
  let query = this.find({ YeuCauID: yeuCauId })
    // NhanVien model dùng field `Ten` (không phải `HoTen`), giữ thêm HoTen để tương thích dữ liệu cũ (nếu có)
    .populate("NguoiThucHienID", "Ten HoTen MaNhanVien")
    .sort({ ThoiGian: -1 });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  return query;
};

/**
 * Đếm số lần thực hiện hành động trong ngày (cho rate limit)
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @param {ObjectId} nguoiThucHienId - ID người thực hiện
 * @param {string} hanhDong - Hành động cần đếm
 */
lichSuYeuCauSchema.statics.demHanhDongTrongNgay = async function (
  yeuCauId,
  nguoiThucHienId,
  hanhDong
) {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const count = await this.countDocuments({
    YeuCauID: yeuCauId,
    NguoiThucHienID: nguoiThucHienId,
    HanhDong: hanhDong,
    ThoiGian: { $gte: startOfToday },
  });

  return count;
};

/**
 * Kiểm tra rate limit
 * @param {ObjectId} yeuCauId - ID yêu cầu
 * @param {ObjectId} nguoiThucHienId - ID người thực hiện
 * @param {string} hanhDong - Hành động cần kiểm tra
 * @returns {Object} { allowed: boolean, count: number, limit: number }
 */
lichSuYeuCauSchema.statics.kiemTraRateLimit = async function (
  yeuCauId,
  nguoiThucHienId,
  hanhDong
) {
  const limits = {
    [HANH_DONG.NHAC_LAI]: 3,
    [HANH_DONG.BAO_QUAN_LY]: 1,
  };

  const limit = limits[hanhDong];
  if (!limit) {
    return { allowed: true, count: 0, limit: null };
  }

  const count = await this.demHanhDongTrongNgay(
    yeuCauId,
    nguoiThucHienId,
    hanhDong
  );

  return {
    allowed: count < limit,
    count,
    limit,
  };
};

/**
 * Lấy lịch sử gần đây của nhiều yêu cầu (cho dashboard)
 */
lichSuYeuCauSchema.statics.layLichSuGanDay = function (khoaId, limit = 20) {
  return this.aggregate([
    {
      $lookup: {
        from: "yeucau",
        localField: "YeuCauID",
        foreignField: "_id",
        as: "yeuCau",
      },
    },
    { $unwind: "$yeuCau" },
    {
      $match: {
        "yeuCau.KhoaDichID": new mongoose.Types.ObjectId(khoaId),
      },
    },
    { $sort: { ThoiGian: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: "nhanvien",
        localField: "NguoiThucHienID",
        foreignField: "_id",
        as: "nguoiThucHien",
      },
    },
    { $unwind: { path: "$nguoiThucHien", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 1,
        YeuCauID: 1,
        HanhDong: 1,
        GhiChu: 1,
        ThoiGian: 1,
        "yeuCau.MaYeuCau": 1,
        "yeuCau.TieuDe": 1,
        "nguoiThucHien.HoTen": 1,
        "nguoiThucHien.MaNhanVien": 1,
      },
    },
  ]);
};

// Export constants
lichSuYeuCauSchema.statics.HANH_DONG = HANH_DONG;

const LichSuYeuCau = mongoose.model("LichSuYeuCau", lichSuYeuCauSchema);
module.exports = LichSuYeuCau;
