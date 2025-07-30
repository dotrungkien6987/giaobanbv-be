const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tepTinSchema = Schema(
  {
    TenFile: {
      type: String,
      required: true,
      maxlength: 255,
    },
    TenGoc: {
      type: String,
      required: true,
      maxlength: 255,
    },
    LoaiFile: {
      type: String,
      required: true,
      maxlength: 100,
    },
    KichThuoc: {
      type: Number,
      required: true,
      min: 0,
    },
    DuongDan: {
      type: String,
      required: true,
      maxlength: 500,
    },
    CongViecID: {
      type: Schema.ObjectId,
      ref: "CongViecDuocGiao",
    },
    YeuCauHoTroID: {
      type: Schema.ObjectId,
      ref: "YeuCauHoTro",
    },
    NguoiTaiLenID: {
      type: Schema.ObjectId,
      required: true,
      ref: "User",
    },
    MoTa: {
      type: String,
      maxlength: 1000,
    },
    TrangThai: {
      type: String,
      enum: ["ACTIVE", "DELETED"],
      default: "ACTIVE",
    },
    NgayTaiLen: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "teptin",
  }
);

// Indexes
tepTinSchema.index({ CongViecID: 1 });
tepTinSchema.index({ YeuCauHoTroID: 1 });
tepTinSchema.index({ NguoiTaiLenID: 1 });
tepTinSchema.index({ NgayTaiLen: -1 });
tepTinSchema.index({ TrangThai: 1 });

// Virtual for formatted file size
tepTinSchema.virtual("KichThuocFormat").get(function () {
  const size = this.KichThuoc;
  if (size < 1024) return size + " B";
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + " KB";
  if (size < 1024 * 1024 * 1024)
    return (size / (1024 * 1024)).toFixed(2) + " MB";
  return (size / (1024 * 1024 * 1024)).toFixed(2) + " GB";
});

// Virtual for file extension
tepTinSchema.virtual("DuoiFile").get(function () {
  return this.TenGoc.split(".").pop().toLowerCase();
});

// Methods
tepTinSchema.methods.xoa = function () {
  this.TrangThai = "DELETED";
  return this.save();
};

tepTinSchema.methods.laUrl = function () {
  // Assuming files are served from /uploads endpoint
  return `/uploads/${this.TenFile}`;
};

tepTinSchema.methods.coTheXem = function (nguoiDungId) {
  // User có thể xem file nếu:
  // 1. Là người tải lên
  // 2. Liên quan đến công việc được assign
  // 3. Liên quan đến ticket mà họ tạo hoặc được assign
  return this.NguoiTaiLenID.toString() === nguoiDungId.toString();
};

tepTinSchema.methods.coTheXoa = function (nguoiDungId) {
  // Chỉ người tải lên mới có thể xóa
  return this.NguoiTaiLenID.toString() === nguoiDungId.toString();
};

// Static methods
tepTinSchema.statics.timTheoCongViec = function (congViecId) {
  return this.find({
    CongViecID: congViecId,
    TrangThai: "ACTIVE",
  })
    .populate("NguoiTaiLenID", "HoTen MaNhanVien")
    .sort({ NgayTaiLen: -1 });
};

tepTinSchema.statics.timTheoYeuCauHoTro = function (yeuCauId) {
  return this.find({
    YeuCauHoTroID: yeuCauId,
    TrangThai: "ACTIVE",
  })
    .populate("NguoiTaiLenID", "HoTen MaNhanVien")
    .sort({ NgayTaiLen: -1 });
};

tepTinSchema.statics.timTheoNguoiDung = function (nguoiDungId, limit = 20) {
  return this.find({
    NguoiTaiLenID: nguoiDungId,
    TrangThai: "ACTIVE",
  })
    .populate("CongViecID", "TieuDe")
    .populate("YeuCauHoTroID", "TieuDe")
    .sort({ NgayTaiLen: -1 })
    .limit(limit);
};

tepTinSchema.statics.thongKeTheoLoaiFile = function (tuNgay, denNgay) {
  const match = { TrangThai: "ACTIVE" };
  if (tuNgay || denNgay) {
    match.NgayTaiLen = {};
    if (tuNgay) match.NgayTaiLen.$gte = tuNgay;
    if (denNgay) match.NgayTaiLen.$lte = denNgay;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$LoaiFile",
        soLuong: { $sum: 1 },
        tongKichThuoc: { $sum: "$KichThuoc" },
      },
    },
    { $sort: { soLuong: -1 } },
  ]);
};

tepTinSchema.statics.thongKeKichThuoc = function () {
  return this.aggregate([
    { $match: { TrangThai: "ACTIVE" } },
    {
      $group: {
        _id: null,
        tongKichThuoc: { $sum: "$KichThuoc" },
        soLuongFile: { $sum: 1 },
        kichThuocTrungBinh: { $avg: "$KichThuoc" },
      },
    },
  ]);
};

// Pre-save middleware
tepTinSchema.pre("save", function (next) {
  // Tự động xác định loại file từ extension
  if (!this.LoaiFile && this.TenGoc) {
    const extension = this.TenGoc.split(".").pop().toLowerCase();
    const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "svg"];
    const documentTypes = ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx"];
    const videoTypes = ["mp4", "avi", "mov", "wmv", "flv", "mkv"];
    const audioTypes = ["mp3", "wav", "flac", "aac", "ogg"];

    if (imageTypes.includes(extension)) {
      this.LoaiFile = "image";
    } else if (documentTypes.includes(extension)) {
      this.LoaiFile = "document";
    } else if (videoTypes.includes(extension)) {
      this.LoaiFile = "video";
    } else if (audioTypes.includes(extension)) {
      this.LoaiFile = "audio";
    } else {
      this.LoaiFile = "other";
    }
  }

  next();
});

const TepTin = mongoose.model("TepTin", tepTinSchema);
module.exports = TepTin;
