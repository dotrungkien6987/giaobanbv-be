const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const loaiYeuCauHoTroSchema = Schema(
  {
    TenLoai: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    MoTa: {
      type: String,
      maxlength: 1000,
    },
    KhoaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "Khoa",
    },
    SLAMacDinhGio: {
      type: Number,
      default: 24,
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "loaiyeucauhotro",
  }
);

// Indexes
loaiYeuCauHoTroSchema.index({ TenLoai: 1 });
loaiYeuCauHoTroSchema.index({ PhongBanXuLyID: 1 });
loaiYeuCauHoTroSchema.index({ TrangThaiHoatDong: 1 });

// Static methods
loaiYeuCauHoTroSchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true })
    .populate("PhongBanXuLyID", "TenPhongBan MaPhongBan")
    .sort({ TenLoai: 1 });
};

loaiYeuCauHoTroSchema.statics.timTheoPhongBanXuLy = function (phongBanId) {
  return this.find({
    PhongBanXuLyID: phongBanId,
    TrangThaiHoatDong: true,
  }).sort({ TenLoai: 1 });
};

const LoaiYeuCauHoTro = mongoose.model(
  "LoaiYeuCauHoTro",
  loaiYeuCauHoTroSchema
);
module.exports = LoaiYeuCauHoTro;
