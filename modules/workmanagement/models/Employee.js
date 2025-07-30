const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nhanVienQuanLySchema = Schema(
  {
    MaNhanVien: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    HoTen: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    Email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    SoDienThoai: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    ViTriHienTaiID: {
      type: Schema.ObjectId,
      ref: "ViTriCongViec",
      default: null,
    },
    QuanLyTrucTiepID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
      default: null,
    },
    NgayVaoLam: {
      type: Date,
      default: Date.now,
    },
    TrangThai: {
      type: String,
      enum: ["HOATDONG", "NGHINGHI", "THOIVIEC"],
      default: "HOATDONG",
    },
    AnhDaiDien: {
      type: String,
      maxlength: 500,
    },
    // Kết nối với hệ thống cũ
    NhanVienID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      default: null,
    },
    UserID: {
      type: Schema.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "nhanvienquanly",
  }
);

// Indexes
nhanVienQuanLySchema.index({ MaNhanVien: 1 }, { unique: true });
nhanVienQuanLySchema.index({ Email: 1 }, { unique: true });
nhanVienQuanLySchema.index({ HoTen: 1 });
nhanVienQuanLySchema.index({ ViTriHienTaiID: 1 });
nhanVienQuanLySchema.index({ QuanLyTrucTiepID: 1 });
nhanVienQuanLySchema.index({ TrangThai: 1 });
nhanVienQuanLySchema.index({ TrangThai: 1, ViTriHienTaiID: 1 });

// Virtual for position history
nhanVienQuanLySchema.virtual("LichSuViTri", {
  ref: "LichSuViTriNhanVien",
  localField: "_id",
  foreignField: "NhanVienID",
  options: { sort: { NgayBatDau: -1 } },
});

// Virtual for subordinates
nhanVienQuanLySchema.virtual("NhanVienDuoi", {
  ref: "NhanVienQuanLy",
  localField: "_id",
  foreignField: "QuanLyTrucTiepID",
});

// Virtual for current department
nhanVienQuanLySchema.virtual("PhongBan", {
  ref: "PhongBan",
  localField: "ViTriHienTaiID",
  foreignField: "_id",
  justOne: true,
  populate: {
    path: "PhongBanID",
  },
});

// Methods
nhanVienQuanLySchema.methods.toJSON = function () {
  const nhanVien = this._doc;
  delete nhanVien.__v;
  return nhanVien;
};

nhanVienQuanLySchema.methods.laQuanLy = function () {
  return (
    this.ViTriHienTaiID &&
    ["GIAMSAT", "QUANLY", "GIAMDOC"].includes(this.ViTriHienTaiID.CapBac)
  );
};

// Static methods
nhanVienQuanLySchema.statics.timTheoMa = function (maNhanVien) {
  return this.findOne({
    MaNhanVien: maNhanVien.toUpperCase(),
    TrangThai: "HOATDONG",
  });
};

nhanVienQuanLySchema.statics.timTheoEmail = function (email) {
  return this.findOne({ Email: email.toLowerCase(), TrangThai: "HOATDONG" });
};

nhanVienQuanLySchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThai: "HOATDONG" })
    .populate("ViTriHienTaiID")
    .populate("QuanLyTrucTiepID", "HoTen MaNhanVien")
    .sort({ HoTen: 1 });
};

nhanVienQuanLySchema.statics.timTheoPhongBan = function (phongBanId) {
  return this.find({ TrangThai: "HOATDONG" })
    .populate({
      path: "ViTriHienTaiID",
      match: { PhongBanID: phongBanId },
    })
    .then((nhanViens) => nhanViens.filter((nv) => nv.ViTriHienTaiID));
};

const NhanVienQuanLy = mongoose.model("NhanVienQuanLy", nhanVienQuanLySchema);
module.exports = NhanVienQuanLy;
