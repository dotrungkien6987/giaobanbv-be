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
    PhongBanID: {
      type: Schema.ObjectId,
      ref: "Department",
      required: true,
    },
    QuanLyTrucTiepID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
      default: null,
    },
    CapBac: {
      type: String,
      enum: ["NHANVIEN", "GIAMSAT", "QUANLY", "GIAMDOC"],
      default: "NHANVIEN",
    },
    isDeleted: {
      type: Boolean,
      default: false,
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
nhanVienQuanLySchema.index({ PhongBanID: 1 });
nhanVienQuanLySchema.index({ QuanLyTrucTiepID: 1 });
nhanVienQuanLySchema.index({ TrangThai: 1 });
nhanVienQuanLySchema.index({ CapBac: 1 });
nhanVienQuanLySchema.index({ isDeleted: 1 });
nhanVienQuanLySchema.index({ TrangThai: 1, isDeleted: 1 });
nhanVienQuanLySchema.index({ PhongBanID: 1, isDeleted: 1 });

// Virtual for routine duties
nhanVienQuanLySchema.virtual("DanhSachNhiemVu", {
  ref: "NhanVienNhiemVu",
  localField: "_id",
  foreignField: "NhanVienID",
});

// Virtual for subordinates
nhanVienQuanLySchema.virtual("NhanVienDuoi", {
  ref: "NhanVienQuanLy",
  localField: "_id",
  foreignField: "QuanLyTrucTiepID",
});

// Virtual for department
nhanVienQuanLySchema.virtual("ThongTinPhongBan", {
  ref: "PhongBan",
  localField: "PhongBanID",
  foreignField: "_id",
  justOne: true,
});

// Methods
nhanVienQuanLySchema.methods.toJSON = function () {
  const nhanVien = this._doc;
  delete nhanVien.__v;
  return nhanVien;
};

nhanVienQuanLySchema.methods.laQuanLy = function () {
  return ["GIAMSAT", "QUANLY", "GIAMDOC"].includes(this.CapBac);
};

nhanVienQuanLySchema.methods.softDelete = function () {
  this.isDeleted = true;
  this.TrangThai = "THOIVIEC";
  return this.save();
};

// Static methods
nhanVienQuanLySchema.statics.timTheoMa = function (maNhanVien) {
  return this.findOne({
    MaNhanVien: maNhanVien.toUpperCase(),
    TrangThai: "HOATDONG",
    isDeleted: false,
  });
};

nhanVienQuanLySchema.statics.timTheoEmail = function (email) {
  return this.findOne({
    Email: email.toLowerCase(),
    TrangThai: "HOATDONG",
    isDeleted: false,
  });
};

nhanVienQuanLySchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThai: "HOATDONG", isDeleted: false })
    .populate("PhongBanID")
    .populate("QuanLyTrucTiepID", "HoTen MaNhanVien")
    .sort({ HoTen: 1 });
};

nhanVienQuanLySchema.statics.timTheoPhongBan = function (phongBanId) {
  return this.find({
    PhongBanID: phongBanId,
    TrangThai: "HOATDONG",
    isDeleted: false,
  })
    .populate("PhongBanID")
    .sort({ HoTen: 1 });
};

nhanVienQuanLySchema.statics.layDanhSachDaXoa = function () {
  return this.find({ isDeleted: true })
    .populate("PhongBanID")
    .populate("QuanLyTrucTiepID", "HoTen MaNhanVien")
    .sort({ updatedAt: -1 });
};

const NhanVienQuanLy = mongoose.model("NhanVienQuanLy", nhanVienQuanLySchema);
module.exports = NhanVienQuanLy;
