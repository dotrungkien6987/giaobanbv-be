const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * TRANG THAI YEU CAU - 5 States
 * Đã gộp DA_TIEP_NHAN vào DANG_XU_LY, bỏ DA_HUY (dùng hard delete khi MOI)
 */
const TRANG_THAI = {
  MOI: "MOI", // Vừa tạo, chờ tiếp nhận
  DANG_XU_LY: "DANG_XU_LY", // Đã tiếp nhận và đang xử lý
  DA_HOAN_THANH: "DA_HOAN_THANH", // Đã hoàn thành, chờ đánh giá/đóng
  DA_DONG: "DA_DONG", // Đã đóng (hoàn tất flow)
  TU_CHOI: "TU_CHOI", // Bị từ chối
};

const LOAI_NGUOI_NHAN = {
  KHOA: "KHOA", // Gửi chung đến khoa
  CA_NHAN: "CA_NHAN", // Gửi trực tiếp đến cá nhân
};

/**
 * Embedded schema cho DanhGia
 */
const danhGiaSchema = new Schema(
  {
    SoSao: {
      type: Number,
      min: [1, "Số sao tối thiểu là 1"],
      max: [5, "Số sao tối đa là 5"],
    },
    NhanXet: {
      type: String,
      maxlength: [500, "Nhận xét không được vượt quá 500 ký tự"],
      // ⚠️ Bắt buộc khi SoSao < 3 (validate ở service layer)
    },
    NgayDanhGia: Date,
  },
  { _id: false }
);

/**
 * Embedded schema cho Snapshot DanhMuc
 * Đảm bảo không bị ảnh hưởng khi danh mục thay đổi
 */
const snapshotDanhMucSchema = new Schema(
  {
    TenLoaiYeuCau: {
      type: String,
      required: true,
    },
    ThoiGianDuKien: {
      type: Number,
      required: true,
    },
    DonViThoiGian: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

/**
 * YeuCau - Schema chính của yêu cầu hỗ trợ
 */
const yeuCauSchema = new Schema(
  {
    // ========== MÃ YÊU CẦU (Auto-generate) ==========
    MaYeuCau: {
      type: String,
      unique: true,
      required: [true, "Mã yêu cầu là bắt buộc"],
      // Format: YC2025000001
    },

    // ========== NGƯỜI GỬI ==========
    NguoiYeuCauID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      required: [true, "Người yêu cầu là bắt buộc"],
      index: true,
    },

    KhoaNguonID: {
      type: Schema.ObjectId,
      ref: "Khoa",
      required: [true, "Khoa nguồn là bắt buộc"],
      // Khoa của người gửi (tự động lấy từ NguoiYeuCau.KhoaID)
    },

    // ========== NGƯỜI NHẬN ==========
    KhoaDichID: {
      type: Schema.ObjectId,
      ref: "Khoa",
      required: [true, "Khoa đích là bắt buộc"],
      index: true,
    },

    LoaiNguoiNhan: {
      type: String,
      enum: {
        values: Object.values(LOAI_NGUOI_NHAN),
        message: "Loại người nhận phải là KHOA hoặc CA_NHAN",
      },
      required: [true, "Loại người nhận là bắt buộc"],
    },

    NguoiNhanID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      default: null,
      // null nếu LoaiNguoiNhan = "KHOA"
      // có giá trị nếu LoaiNguoiNhan = "CA_NHAN"
    },

    // ========== LOẠI YÊU CẦU ==========
    DanhMucYeuCauID: {
      type: Schema.ObjectId,
      ref: "DanhMucYeuCau",
      required: [true, "Danh mục yêu cầu là bắt buộc"],
    },

    // Snapshot tại thời điểm tạo
    SnapshotDanhMuc: {
      type: snapshotDanhMucSchema,
      required: true,
    },

    // ========== NỘI DUNG ==========
    TieuDe: {
      type: String,
      required: [true, "Tiêu đề là bắt buộc"],
      trim: true,
      maxlength: [255, "Tiêu đề không được vượt quá 255 ký tự"],
    },

    MoTa: {
      type: String,
      maxlength: [5000, "Mô tả không được vượt quá 5000 ký tự"],
      default: "",
    },

    // ========== TRẠNG THÁI (5 States) ==========
    TrangThai: {
      type: String,
      enum: {
        values: Object.values(TRANG_THAI),
        message: "Trạng thái không hợp lệ",
      },
      default: TRANG_THAI.MOI,
      index: true,
    },

    // ========== ĐIỀU PHỐI ==========
    // Người thực hiện điều phối (người giao việc)
    NguoiDieuPhoiID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      default: null,
    },

    // Người được điều phối hiện tại (chờ tiếp nhận)
    NguoiDuocDieuPhoiID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      default: null,
    },

    NgayDieuPhoi: {
      type: Date,
      default: null,
    },

    // ========== NGƯỜI XỬ LÝ (sau khi tiếp nhận) ==========
    NguoiXuLyID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      default: null,
      // Người thực sự xử lý
    },

    NgayTiepNhan: {
      type: Date,
      default: null,
    },

    // ========== THỜI GIAN ==========
    ThoiGianHen: {
      type: Date,
      default: null,
      // Thời gian hẹn hoàn thành
      // Mặc định: NgayTiepNhan + ThoiGianDuKien
    },

    NgayHoanThanh: {
      type: Date,
      default: null,
    },

    NgayDong: {
      type: Date,
      default: null,
      // Dùng để kiểm tra 7 ngày mở lại từ DA_DONG
    },

    // ========== TỪ CHỐI (nếu có) ==========
    LyDoTuChoiID: {
      type: Schema.ObjectId,
      ref: "LyDoTuChoi",
      default: null,
    },

    GhiChuTuChoi: {
      type: String,
      maxlength: [1000, "Ghi chú từ chối không được vượt quá 1000 ký tự"],
    },

    // ========== LIÊN KẾT NHIỆM VỤ THƯỜNG QUY ==========
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      ref: "NhiemVuThuongQuy",
      default: null,
    },

    LaNhiemVuKhac: {
      type: Boolean,
      default: false,
    },

    // ========== ĐÁNH GIÁ ==========
    DanhGia: {
      type: danhGiaSchema,
      default: null,
    },

    // ========== AUDIT ==========
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "yeucau",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
yeuCauSchema.index({ KhoaDichID: 1, TrangThai: 1 });
yeuCauSchema.index({ NguoiYeuCauID: 1, TrangThai: 1 });
yeuCauSchema.index({ NguoiXuLyID: 1, TrangThai: 1 });
yeuCauSchema.index({ NguoiDieuPhoiID: 1, TrangThai: 1 });
yeuCauSchema.index({ NguoiDuocDieuPhoiID: 1, TrangThai: 1 });
yeuCauSchema.index({ createdAt: -1 });
yeuCauSchema.index({ NgayDong: 1 });
yeuCauSchema.index({ TrangThai: 1, NgayHoanThanh: 1 }); // Cho auto-close job
yeuCauSchema.index({ isDeleted: 1, TrangThai: 1 });
// Compound index for KPI evaluation dashboard queries (filter by NgayTiepNhan)
yeuCauSchema.index({
  NhiemVuThuongQuyID: 1,
  NguoiXuLyID: 1,
  NgayTiepNhan: -1,
});

// Virtuals

/**
 * Kiểm tra yêu cầu có quá hạn không
 */
yeuCauSchema.virtual("QuaHan").get(function () {
  if (!this.ThoiGianHen) return false;
  if (
    this.TrangThai === TRANG_THAI.DA_HOAN_THANH ||
    this.TrangThai === TRANG_THAI.DA_DONG
  ) {
    // Đã hoàn thành - so sánh với NgayHoanThanh
    return this.NgayHoanThanh && this.NgayHoanThanh > this.ThoiGianHen;
  }
  // Chưa hoàn thành - so sánh với hiện tại
  return new Date() > this.ThoiGianHen;
});

/**
 * Số ngày còn lại đến hạn (âm nếu quá hạn)
 */
yeuCauSchema.virtual("SoNgayConLai").get(function () {
  if (!this.ThoiGianHen) return null;
  const now = new Date();
  const diffTime = this.ThoiGianHen - now;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

/**
 * Có thể mở lại không (trong 7 ngày từ DA_DONG)
 */
yeuCauSchema.virtual("CoTheMoLai").get(function () {
  if (this.TrangThai !== TRANG_THAI.DA_DONG) return false;
  if (!this.NgayDong) return false;
  const now = new Date();
  const diffDays = (now - this.NgayDong) / (1000 * 60 * 60 * 24);
  return diffDays <= 7;
});

// Methods

/**
 * Kiểm tra người dùng có phải là người gửi không
 */
yeuCauSchema.methods.laNguoiGui = function (nhanVienId) {
  // Handle both populated and non-populated cases
  const nguoiYeuCauId = this.NguoiYeuCauID?._id || this.NguoiYeuCauID;
  return nguoiYeuCauId?.toString() === nhanVienId?.toString();
};

/**
 * Kiểm tra người dùng có phải là người nhận được chỉ định không
 */
yeuCauSchema.methods.laNguoiNhan = function (nhanVienId) {
  // Handle both populated and non-populated cases
  const nguoiNhanId = this.NguoiNhanID?._id || this.NguoiNhanID;
  return nguoiNhanId?.toString() === nhanVienId?.toString();
};

/**
 * Kiểm tra người dùng có phải là người được điều phối không
 */
yeuCauSchema.methods.laNguoiDuocDieuPhoi = function (nhanVienId) {
  // Handle both populated and non-populated cases
  const nguoiDieuPhoiId =
    this.NguoiDuocDieuPhoiID?._id || this.NguoiDuocDieuPhoiID;
  return nguoiDieuPhoiId?.toString() === nhanVienId?.toString();
};

/**
 * Kiểm tra người dùng có phải là người xử lý không
 */
yeuCauSchema.methods.laNguoiXuLy = function (nhanVienId) {
  // Handle both populated and non-populated cases
  const nguoiXuLyId = this.NguoiXuLyID?._id || this.NguoiXuLyID;
  return nguoiXuLyId?.toString() === nhanVienId?.toString();
};

/**
 * Kiểm tra người dùng có liên quan đến yêu cầu không
 * (có quyền comment, xem chi tiết)
 */
yeuCauSchema.methods.nguoiDungLienQuan = function (nhanVienId) {
  return (
    this.laNguoiGui(nhanVienId) ||
    this.laNguoiNhan(nhanVienId) ||
    this.laNguoiDuocDieuPhoi(nhanVienId) ||
    this.laNguoiXuLy(nhanVienId)
  );
};

/**
 * Lấy danh sách tất cả NhanVienID liên quan đến yêu cầu
 * Dùng cho notification recipients resolution
 *
 * @returns {string[]} Array of NhanVienID strings (deduplicated)
 *
 * @example
 * const yeuCau = await YeuCau.findById(id)
 *   .populate('NguoiYeuCauID')
 *   .populate('NguoiXuLyID')
 *   .lean();
 * const recipients = yeuCau.getRelatedNhanVien?.() || [];
 *
 * Performance: O(n) với n = 6 fields max, ~0.008ms
 */
yeuCauSchema.methods.getRelatedNhanVien = function () {
  const nhanVienIds = [];

  // Helper to extract ID (handles both ObjectId and populated objects)
  const extractId = (field) => {
    if (!field) return null;
    if (field._id) return field._id.toString();
    return field.toString();
  };

  // Collect all related NhanVienIDs
  const fields = [
    this.NguoiYeuCauID,
    this.NguoiXuLyID,
    this.NguoiDieuPhoiID,
    this.NguoiDuocDieuPhoiID,
    this.NguoiNhanID,
  ];

  fields.forEach((field) => {
    const id = extractId(field);
    if (id) nhanVienIds.push(id);
  });

  // Deduplicate and return
  return [...new Set(nhanVienIds)];
};

/**
 * Tính thời gian hẹn dựa trên thời gian dự kiến
 * @param {Date} tuNgay - Ngày bắt đầu (mặc định là now)
 */
yeuCauSchema.methods.tinhThoiGianHen = function (tuNgay = new Date()) {
  const { ThoiGianDuKien, DonViThoiGian } = this.SnapshotDanhMuc;
  const result = new Date(tuNgay);

  switch (DonViThoiGian) {
    case "PHUT":
      result.setMinutes(result.getMinutes() + ThoiGianDuKien);
      break;
    case "GIO":
      result.setHours(result.getHours() + ThoiGianDuKien);
      break;
    case "NGAY":
      result.setDate(result.getDate() + ThoiGianDuKien);
      break;
  }

  return result;
};

// Statics

/**
 * Tìm yêu cầu theo khoa đích
 */
yeuCauSchema.statics.timTheoKhoaDich = function (khoaId, options = {}) {
  const filter = {
    KhoaDichID: khoaId,
    isDeleted: false,
  };
  if (options.trangThai) {
    filter.TrangThai = options.trangThai;
  }
  return this.find(filter)
    .populate("NguoiYeuCauID", "Ten MaNhanVien")
    .populate("KhoaNguonID", "TenKhoa")
    .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
    .sort({ createdAt: -1 });
};

/**
 * Tìm yêu cầu theo người gửi
 */
yeuCauSchema.statics.timTheoNguoiGui = function (nhanVienId, options = {}) {
  const filter = {
    NguoiYeuCauID: nhanVienId,
    isDeleted: false,
  };
  if (options.trangThai) {
    filter.TrangThai = options.trangThai;
  }
  return this.find(filter)
    .populate("KhoaDichID", "TenKhoa")
    .populate("NguoiXuLyID", "Ten MaNhanVien")
    .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
    .sort({ createdAt: -1 });
};

/**
 * Tìm yêu cầu theo người xử lý
 */
yeuCauSchema.statics.timTheoNguoiXuLy = function (nhanVienId, options = {}) {
  const filter = {
    NguoiXuLyID: nhanVienId,
    isDeleted: false,
  };
  if (options.trangThai) {
    filter.TrangThai = options.trangThai;
  }
  return this.find(filter)
    .populate("NguoiYeuCauID", "Ten MaNhanVien")
    .populate("KhoaNguonID", "TenKhoa")
    .populate("DanhMucYeuCauID", "TenLoaiYeuCau")
    .sort({ createdAt: -1 });
};

/**
 * Tìm yêu cầu cần auto-close
 * (DA_HOAN_THANH sau 3 ngày)
 */
yeuCauSchema.statics.timCanAutoClose = function () {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  return this.find({
    TrangThai: TRANG_THAI.DA_HOAN_THANH,
    NgayHoanThanh: { $lt: threeDaysAgo },
    isDeleted: false,
  });
};

/**
 * Thống kê yêu cầu theo khoa
 */
yeuCauSchema.statics.thongKeTheoKhoa = function (khoaId, tuNgay, denNgay) {
  const match = {
    KhoaDichID: new mongoose.Types.ObjectId(khoaId),
    isDeleted: false,
  };

  if (tuNgay || denNgay) {
    match.createdAt = {};
    if (tuNgay) match.createdAt.$gte = new Date(tuNgay);
    if (denNgay) match.createdAt.$lte = new Date(denNgay);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$TrangThai",
        soLuong: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);
};

// Export constants
yeuCauSchema.statics.TRANG_THAI = TRANG_THAI;
yeuCauSchema.statics.LOAI_NGUOI_NHAN = LOAI_NGUOI_NHAN;

const YeuCau = mongoose.model("YeuCau", yeuCauSchema);
module.exports = YeuCau;
