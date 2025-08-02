const mongoose = require("mongoose");
const NhomViecUser = require("./NhomViecUser");
const Schema = mongoose.Schema;

const nhiemVuThuongQuySchema = Schema(
  {
    TenNhiemVu: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      description: "Tên nhiệm vụ thường quy",
    },
    MoTa: {
      type: String,
      maxlength: 2000,
      description: "Mô tả chi tiết về nhiệm vụ",
    },
    KhoaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "Khoa",
      description: "Khoa chịu trách nhiệm chính cho nhiệm vụ này",
    },
    MucDoKho: {
      type: Number,
      min: 1.0,
      max: 10.0,
      default: 5.0,
      description:
        "Mức độ khó của nhiệm vụ (1.0-10.0), cho phép 1 chữ số thập phân",
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
      description: "Trạng thái hoạt động của nhiệm vụ",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      description: "Đánh dấu đã xóa mềm",
    },
    NguoiTaoID: {
      type: Schema.ObjectId,
      ref: "User",
      description: "Người tạo nhiệm vụ này",
    },
    NhomViecUserID: {
      type: Schema.ObjectId,
      ref: "NhomViecUser",
      description: "Nhóm việc của nhiệm vụ này",
    },
  },
  {
    timestamps: true,
    collection: "nhiemvuthuongquy", // Tên bảng tiếng Việt
  }
);

// Indexes
nhiemVuThuongQuySchema.index({ TenNhiemVu: 1 });
nhiemVuThuongQuySchema.index({ KhoaID: 1 });
nhiemVuThuongQuySchema.index({ TrangThaiHoatDong: 1 });
nhiemVuThuongQuySchema.index({ isDeleted: 1 });
nhiemVuThuongQuySchema.index({
  KhoaID: 1,
  TrangThaiHoatDong: 1,
  isDeleted: 1,
});
nhiemVuThuongQuySchema.index({ MucDoKho: 1 });

// Virtual for employees assigned to this duty
nhiemVuThuongQuySchema.virtual("DanhSachNhanVien", {
  ref: "NhanVienNhiemVu",
  localField: "_id",
  foreignField: "NhiemVuThuongQuyID",
});

// Virtual for tasks related to this duty
nhiemVuThuongQuySchema.virtual("CacCongViecLienQuan", {
  ref: "AssignedTask",
  localField: "_id",
  foreignField: "NhiemVuThuongQuyID",
});

// Virtual for tickets related to this duty
nhiemVuThuongQuySchema.virtual("CacTicketLienQuan", {
  ref: "Ticket",
  localField: "_id",
  foreignField: "NhiemVuThuongQuyID",
});

// Methods
nhiemVuThuongQuySchema.methods.toJSON = function () {
  const duty = this._doc;
  delete duty.__v;
  return duty;
};

nhiemVuThuongQuySchema.methods.xoaMem = function () {
  this.isDeleted = true;
  this.TrangThaiHoatDong = false;
  return this.save();
};

// Static methods
nhiemVuThuongQuySchema.statics.layTheoKhoa = function (khoaId) {
  return this.find({
    KhoaID: khoaId,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .populate("KhoaID", "TenKhoa MaKhoa")
    .sort({ TenNhiemVu: 1 });
};

nhiemVuThuongQuySchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true, isDeleted: false })
    .populate("KhoaID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen UserName")
    .sort({ KhoaID: 1, TenNhiemVu: 1 });
};

nhiemVuThuongQuySchema.statics.layTheoMucDoKho = function (minLevel, maxLevel) {
  return this.find({
    TrangThaiHoatDong: true,
    isDeleted: false,
    MucDoKho: { $gte: minLevel, $lte: maxLevel },
  }).sort({ MucDoKho: 1, TenNhiemVu: 1 });
};

nhiemVuThuongQuySchema.statics.layDanhSachDaXoa = function () {
  return this.find({ isDeleted: true })
    .populate("KhoaID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen UserName")
    .sort({ updatedAt: -1 });
};

const NhiemVuThuongQuy = mongoose.model(
  "NhiemVuThuongQuy",
  nhiemVuThuongQuySchema
);
module.exports = NhiemVuThuongQuy;
