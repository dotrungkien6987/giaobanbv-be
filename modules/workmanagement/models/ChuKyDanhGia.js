const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chuKyDanhGiaSchema = Schema(
  {
    TenChuKy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    LoaiChuKy: {
      type: String,
      enum: ["HANG_THANG", "QUY", "NAM", "TUY_CHINH"],
      default: "HANG_THANG",
    },
    NgayBatDau: {
      type: Date,
      required: true,
    },
    NgayKetThuc: {
      type: Date,
      required: true,
    },
    TrangThai: {
      type: String,
      enum: ["CHUAN_BI", "DANG_HOAT_DONG", "DANH_GIA", "HOAN_THANH"],
      default: "CHUAN_BI",
    },
    MoTa: {
      type: String,
      maxlength: 1000,
    },
    NguoiTaoID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
    },
  },
  {
    timestamps: true,
    collection: "chukydanhgia",
  }
);

// Indexes
chuKyDanhGiaSchema.index({ NgayBatDau: 1, NgayKetThuc: 1 });
chuKyDanhGiaSchema.index({ TrangThai: 1 });
chuKyDanhGiaSchema.index({ LoaiChuKy: 1 });
chuKyDanhGiaSchema.index({ TenChuKy: 1 });

// Virtual for evaluations in this cycle
chuKyDanhGiaSchema.virtual("DanhSachDanhGia", {
  ref: "DanhGiaKPI",
  localField: "_id",
  foreignField: "ChuKyID",
});

// Methods
chuKyDanhGiaSchema.methods.dangHoatDong = function () {
  const hienTai = new Date();
  return (
    this.TrangThai === "DANG_HOAT_DONG" &&
    this.NgayBatDau <= hienTai &&
    this.NgayKetThuc >= hienTai
  );
};

chuKyDanhGiaSchema.methods.daHoanThanh = function () {
  return this.TrangThai === "HOAN_THANH";
};

chuKyDanhGiaSchema.methods.coTheSua = function () {
  return ["CHUAN_BI", "DANG_HOAT_DONG"].includes(this.TrangThai);
};

// Static methods
chuKyDanhGiaSchema.statics.layChuKyHoatDong = function () {
  return this.findOne({
    TrangThai: "DANG_HOAT_DONG",
    NgayBatDau: { $lte: new Date() },
    NgayKetThuc: { $gte: new Date() },
  });
};

chuKyDanhGiaSchema.statics.timTheoTrangThai = function (trangThai) {
  return this.find({ TrangThai: trangThai })
    .populate("NguoiTaoID", "HoTen MaNhanVien")
    .sort({ NgayBatDau: -1 });
};

chuKyDanhGiaSchema.statics.timTheoKhoangThoiGian = function (tuNgay, denNgay) {
  return this.find({
    $or: [
      { NgayBatDau: { $gte: tuNgay, $lte: denNgay } },
      { NgayKetThuc: { $gte: tuNgay, $lte: denNgay } },
      { NgayBatDau: { $lte: tuNgay }, NgayKetThuc: { $gte: denNgay } },
    ],
  }).sort({ NgayBatDau: -1 });
};

chuKyDanhGiaSchema.statics.layChuKyHienTai = function () {
  const hienTai = new Date();
  return this.findOne({
    NgayBatDau: { $lte: hienTai },
    NgayKetThuc: { $gte: hienTai },
  }).sort({ NgayBatDau: -1 });
};

// Validation
chuKyDanhGiaSchema.pre("save", function (next) {
  if (this.NgayBatDau >= this.NgayKetThuc) {
    const error = new Error("Ngày kết thúc phải lớn hơn ngày bắt đầu");
    error.name = "ValidationError";
    return next(error);
  }
  next();
});

const ChuKyDanhGia = mongoose.model("ChuKyDanhGia", chuKyDanhGiaSchema);
module.exports = ChuKyDanhGia;
