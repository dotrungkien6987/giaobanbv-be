const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const yeuCauHoTroSchema = Schema(
  {
    SoTicket: {
      type: String,
      unique: true,
      trim: true,
      maxlength: 50,
    },
    TieuDe: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    MoTa: {
      type: String,
      maxlength: 5000,
    },
    LoaiYeuCauID: {
      type: Schema.ObjectId,
      required: true,
      ref: "LoaiYeuCauHoTro",
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      ref: "NhiemVuThuongQuy",
    },
    NguoiYeuCauID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    NguoiXuLyID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
    },
    MucDoUuTien: {
      type: String,
      enum: ["THAP", "BINH_THUONG", "CAO", "KHAN_CAP"],
      default: "BINH_THUONG",
    },
    TrangThai: {
      type: String,
      enum: [
        "MOI",
        "DA_GIAO",
        "CHAP_NHAN",
        "TU_CHOI",
        "DANG_XU_LY",
        "CHO_PHAN_HOI",
        "DA_GIAI_QUYET",
        "DA_DONG",
        "MO_LAI",
      ],
      default: "MOI",
    },
    DiaDiem: {
      type: String,
      maxlength: 255,
    },
    ThoiGianMongMuon: {
      type: Date,
    },
    ThoiGianGiaiQuyet: {
      type: Date,
    },
    SoGioSLA: {
      type: Number,
      min: 1,
    },
    QuaHan: {
      type: Boolean,
      default: false,
    },
    DiemHaiLong: {
      type: Number,
      min: 1,
      max: 5,
    },
    NhanXetHaiLong: {
      type: String,
      maxlength: 1000,
    },
    GhiChuGiaiQuyet: {
      type: String,
      maxlength: 2000,
    },
  },
  {
    timestamps: true,
    collection: "yeucauhotro",
  }
);

// Indexes
yeuCauHoTroSchema.index({ SoTicket: 1 }, { unique: true });
yeuCauHoTroSchema.index({ TieuDe: 1 });
yeuCauHoTroSchema.index({ LoaiYeuCauID: 1 });
yeuCauHoTroSchema.index({ NhiemVuThuongQuyID: 1 });
yeuCauHoTroSchema.index({ NguoiYeuCauID: 1 });
yeuCauHoTroSchema.index({ NguoiXuLyID: 1 });
yeuCauHoTroSchema.index({ TrangThai: 1 });
yeuCauHoTroSchema.index({ MucDoUuTien: 1 });
yeuCauHoTroSchema.index({ QuaHan: 1 });
yeuCauHoTroSchema.index({ TrangThai: 1, MucDoUuTien: 1 });
yeuCauHoTroSchema.index({ NguoiXuLyID: 1, TrangThai: 1 });

// Methods
yeuCauHoTroSchema.methods.taoSoTicket = function () {
  const nam = new Date().getFullYear();
  const tieuTo = `TK${nam}`;
  return this.constructor
    .countDocuments({
      SoTicket: { $regex: `^${tieuTo}` },
    })
    .then((soLuong) => {
      this.SoTicket = `${tieuTo}${String(soLuong + 1).padStart(6, "0")}`;
      return this;
    });
};

yeuCauHoTroSchema.methods.tinhSLA = function () {
  if (this.LoaiYeuCauID && this.LoaiYeuCauID.SLAMacDinhGio) {
    this.SoGioSLA = this.LoaiYeuCauID.SLAMacDinhGio;
    this.ThoiGianMongMuon = new Date(
      this.createdAt.getTime() + this.SoGioSLA * 60 * 60 * 1000
    );
  }
};

yeuCauHoTroSchema.methods.kiemTraQuaHan = function () {
  if (
    this.ThoiGianMongMuon &&
    new Date() > this.ThoiGianMongMuon &&
    !["DA_GIAI_QUYET", "DA_DONG"].includes(this.TrangThai)
  ) {
    this.QuaHan = true;
  }
  return this.QuaHan;
};

yeuCauHoTroSchema.methods.coTheSua = function () {
  return !["DA_GIAI_QUYET", "DA_DONG"].includes(this.TrangThai);
};

yeuCauHoTroSchema.methods.coTheMoLai = function () {
  return ["DA_GIAI_QUYET", "DA_DONG"].includes(this.TrangThai);
};

// Static methods
yeuCauHoTroSchema.statics.timTheoLoai = function (loaiId) {
  return this.find({ LoaiYeuCauID: loaiId })
    .populate("NguoiYeuCauID", "HoTen MaNhanVien")
    .populate("NguoiXuLyID", "HoTen MaNhanVien")
    .populate("LoaiYeuCauID", "TenLoai")
    .sort({ createdAt: -1 });
};

yeuCauHoTroSchema.statics.timTheoNguoiYeuCau = function (nguoiYeuCauId) {
  return this.find({ NguoiYeuCauID: nguoiYeuCauId })
    .populate("NguoiXuLyID", "HoTen MaNhanVien")
    .populate("LoaiYeuCauID", "TenLoai")
    .sort({ createdAt: -1 });
};

yeuCauHoTroSchema.statics.timTheoNguoiXuLy = function (nguoiXuLyId) {
  return this.find({ NguoiXuLyID: nguoiXuLyId })
    .populate("NguoiYeuCauID", "HoTen MaNhanVien")
    .populate("LoaiYeuCauID", "TenLoai")
    .sort({ createdAt: -1 });
};

yeuCauHoTroSchema.statics.timQuaHan = function () {
  return this.find({ QuaHan: true })
    .populate("NguoiYeuCauID", "HoTen MaNhanVien")
    .populate("NguoiXuLyID", "HoTen MaNhanVien")
    .populate("LoaiYeuCauID", "TenLoai")
    .sort({ ThoiGianMongMuon: 1 });
};

// Pre-save middleware
yeuCauHoTroSchema.pre("save", async function (next) {
  // Tạo số ticket nếu mới
  if (this.isNew && !this.SoTicket) {
    await this.taoSoTicket();
  }

  // Tính SLA nếu chưa có
  if (this.isNew && !this.SoGioSLA) {
    await this.populate("LoaiYeuCauID");
    this.tinhSLA();
  }

  // Kiểm tra quá hạn
  this.kiemTraQuaHan();

  // Đặt thời gian giải quyết khi chuyển trạng thái DA_GIAI_QUYET
  if (
    this.isModified("TrangThai") &&
    this.TrangThai === "DA_GIAI_QUYET" &&
    !this.ThoiGianGiaiQuyet
  ) {
    this.ThoiGianGiaiQuyet = new Date();
  }

  next();
});

const YeuCauHoTro = mongoose.model("YeuCauHoTro", yeuCauHoTroSchema);
module.exports = YeuCauHoTro;
