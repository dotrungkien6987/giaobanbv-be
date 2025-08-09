const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nhanVienNhiemVuSchema = Schema(
  {
    NhanVienID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
      description: "ID của nhân viên được gán nhiệm vụ",
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
      description: "ID của nhiệm vụ thường quy được gán",
    },
    
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
      description: "Trạng thái hoạt động của assignment này",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      description: "Đánh dấu đã xóa mềm",
    },
    NgayGan: {
      type: Date,
      default: Date.now,
      description: "Ngày gán nhiệm vụ cho nhân viên",
    },
    NguoiGanID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      description: "ID của người thực hiện việc gán nhiệm vụ",
    },
  
  },
  {
    timestamps: true,
    collection: "nhanviennhiemvu", // Tên bảng tiếng Việt không dấu gạch dưới
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
nhanVienNhiemVuSchema.index(
  { NhanVienID: 1, NhiemVuThuongQuyID: 1 },
  { unique: true }
);
nhanVienNhiemVuSchema.index({ NhanVienID: 1 });
nhanVienNhiemVuSchema.index({ NhiemVuThuongQuyID: 1 });
nhanVienNhiemVuSchema.index({ TrangThaiHoatDong: 1 });
nhanVienNhiemVuSchema.index({ isDeleted: 1 });
nhanVienNhiemVuSchema.index({
  NhanVienID: 1,
  TrangThaiHoatDong: 1,
  isDeleted: 1,
});
nhanVienNhiemVuSchema.index({ NgayGan: -1 });

// Query middleware để tự động filter deleted records
nhanVienNhiemVuSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

// Methods
nhanVienNhiemVuSchema.methods.toJSON = function () {
  const assignment = this._doc;
  delete assignment.__v;
  return assignment;
};

nhanVienNhiemVuSchema.methods.xoaMem = function () {
  this.isDeleted = true;
  this.TrangThaiHoatDong = false;
  
  return this.save();
};

// Static methods
nhanVienNhiemVuSchema.statics.timTheoNhanVien = function (nhanVienId) {
  return this.find({
    NhanVienID: nhanVienId,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .populate("NhiemVuThuongQuyID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayGan: -1 });
};

nhanVienNhiemVuSchema.statics.timTheoNhiemVu = function (nhiemVuId) {
  return this.find({
    NhiemVuThuongQuyID: nhiemVuId,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .populate("NhanVienID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayGan: -1 });
};

nhanVienNhiemVuSchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true, isDeleted: false })
    .populate("NhanVienID")
    .populate("NhiemVuThuongQuyID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayGan: -1 });
};

nhanVienNhiemVuSchema.statics.layDanhSachDaXoa = function () {
  return this.find({ isDeleted: true })
    .populate("NhanVienID")
    .populate("NhiemVuThuongQuyID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ updatedAt: -1 });
};

// Validation

const NhanVienNhiemVu = mongoose.model(
  "NhanVienNhiemVu",
  nhanVienNhiemVuSchema
);
module.exports = NhanVienNhiemVu;
