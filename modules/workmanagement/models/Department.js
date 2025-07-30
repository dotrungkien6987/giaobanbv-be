const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const phongBanSchema = Schema(
  {
    TenPhongBan: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    MaPhongBan: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    MoTa: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    PhongBanChaID: {
      type: Schema.ObjectId,
      ref: "PhongBan",
      default: null,
    },
    TruongPhongID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
      default: null,
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
    // Kết nối với hệ thống cũ nếu cần
    KhoaID: {
      type: Schema.ObjectId,
      ref: "Khoa",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "phongban",
  }
);

// Indexes
phongBanSchema.index({ TenPhongBan: 1 });
phongBanSchema.index({ MaPhongBan: 1 }, { unique: true });
phongBanSchema.index({ PhongBanChaID: 1 });
phongBanSchema.index({ TruongPhongID: 1 });
phongBanSchema.index({ TrangThaiHoatDong: 1 });

// Virtual for child departments
phongBanSchema.virtual("PhongBanCon", {
  ref: "PhongBan",
  localField: "_id",
  foreignField: "PhongBanChaID",
});

// Virtual for employees in this department
phongBanSchema.virtual("DanhSachNhanVien", {
  ref: "NhanVienQuanLy",
  localField: "_id",
  foreignField: "PhongBanID",
});

// Methods
phongBanSchema.methods.toJSON = function () {
  const phongBan = this._doc;
  delete phongBan.__v;
  return phongBan;
};

// Static methods
phongBanSchema.statics.timTheoMa = function (maPhongBan) {
  return this.findOne({
    MaPhongBan: maPhongBan.toUpperCase(),
    TrangThaiHoatDong: true,
  });
};

phongBanSchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true }).sort({ TenPhongBan: 1 });
};

const PhongBan = mongoose.model("PhongBan", phongBanSchema);
module.exports = PhongBan;
