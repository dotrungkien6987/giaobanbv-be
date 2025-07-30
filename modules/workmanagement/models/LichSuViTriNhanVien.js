const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lichSuViTriNhanVienSchema = Schema(
  {
    NhanVienID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVienQuanLy",
    },
    ViTriID: {
      type: Schema.ObjectId,
      required: true,
      ref: "ViTriCongViec",
    },
    NgayBatDau: {
      type: Date,
      required: true,
      default: Date.now,
    },
    NgayKetThuc: {
      type: Date,
      default: null,
    },
    LyDoThayDoi: {
      type: String,
      maxlength: 500,
    },
    NguoiTaoID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
    },
  },
  {
    timestamps: true,
    collection: "lichsuvitrinhanvien",
  }
);

// Indexes
lichSuViTriNhanVienSchema.index({ NhanVienID: 1, NgayBatDau: -1 });
lichSuViTriNhanVienSchema.index({ ViTriID: 1 });
lichSuViTriNhanVienSchema.index({ NgayBatDau: 1, NgayKetThuc: 1 });

// Static methods
lichSuViTriNhanVienSchema.statics.timTheoNhanVien = function (nhanVienId) {
  return this.find({ NhanVienID: nhanVienId })
    .populate("ViTriID")
    .populate("NguoiTaoID", "HoTen MaNhanVien")
    .sort({ NgayBatDau: -1 });
};

lichSuViTriNhanVienSchema.statics.layViTriHienTai = function (nhanVienId) {
  return this.findOne({
    NhanVienID: nhanVienId,
    NgayKetThuc: null,
  }).populate("ViTriID");
};

const LichSuViTriNhanVien = mongoose.model(
  "LichSuViTriNhanVien",
  lichSuViTriNhanVienSchema
);
module.exports = LichSuViTriNhanVien;
