const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nhiemVuThuongQuySchema = Schema(
  {
    TenNhiemVu: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    MoTa: {
      type: String,
      maxlength: 2000,
    },
    KhoaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "Khoa",
    },
    MucDoKho: {
      type: Number,
      min: 1,
      max: 10,
      default: 1,
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
    NguoiTaoID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
    },
  },
  {
    timestamps: true,
    collection: "nhiemvuthuongquy",
  }
);

// Indexes
nhiemVuThuongQuySchema.index({ TenNhiemVu: 1 });
nhiemVuThuongQuySchema.index({ KhoaID: 1 });
nhiemVuThuongQuySchema.index({ TrangThaiHoatDong: 1 });
nhiemVuThuongQuySchema.index({ KhoaID: 1, TrangThaiHoatDong: 1 });
nhiemVuThuongQuySchema.index({ MucDoKho: 1 });

// Virtual for positions assigned to this duty
nhiemVuThuongQuySchema.virtual("ViTriDuocGan", {
  ref: "ViTriNhiemVuThuongQuy",
  localField: "_id",
  foreignField: "NhiemVuThuongQuyID",
});

// Virtual for tasks related to this duty
nhiemVuThuongQuySchema.virtual("CongViecLienQuan", {
  ref: "CongViecDuocGiao",
  localField: "_id",
  foreignField: "NhiemVuThuongQuyID",
});

// Virtual for tickets related to this duty
nhiemVuThuongQuySchema.virtual("TicketLienQuan", {
  ref: "YeuCauHoTro",
  localField: "_id",
  foreignField: "NhiemVuThuongQuyID",
});

// Static methods
nhiemVuThuongQuySchema.statics.timTheoPhongBan = function (phongBanId) {
  return this.find({ PhongBanID: phongBanId, TrangThaiHoatDong: true })
    .populate("PhongBanID", "TenPhongBan MaPhongBan")
    .sort({ TenNhiemVu: 1 });
};

nhiemVuThuongQuySchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true })
    .populate("PhongBanID", "TenPhongBan MaPhongBan")
    .populate("NguoiTaoID", "HoTen MaNhanVien")
    .sort({ PhongBanID: 1, TenNhiemVu: 1 });
};

nhiemVuThuongQuySchema.statics.timTheoMucDoKho = function (mucDoMin, mucDoMax) {
  return this.find({
    TrangThaiHoatDong: true,
    MucDoKho: { $gte: mucDoMin, $lte: mucDoMax },
  }).sort({ MucDoKho: 1, TenNhiemVu: 1 });
};

const NhiemVuThuongQuy = mongoose.model(
  "NhiemVuThuongQuy",
  nhiemVuThuongQuySchema
);
module.exports = NhiemVuThuongQuy;
