const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const viTriCongViecSchema = Schema(
  {
    TenViTri: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    MaViTri: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    PhongBanID: {
      type: Schema.ObjectId,
      required: true,
      ref: "PhongBan",
    },
    MoTaCongViec: {
      type: String,
      default: "",
      maxlength: 1000,
    },
    CapBac: {
      type: String,
      enum: ["NHANVIEN", "GIAMSAT", "QUANLY", "GIAMDOC"],
      default: "NHANVIEN",
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "vitricongviec",
  }
);

// Indexes
viTriCongViecSchema.index({ TenViTri: 1 });
viTriCongViecSchema.index({ MaViTri: 1 }, { unique: true });
viTriCongViecSchema.index({ PhongBanID: 1 });
viTriCongViecSchema.index({ CapBac: 1 });
viTriCongViecSchema.index({ TrangThaiHoatDong: 1 });
viTriCongViecSchema.index({ PhongBanID: 1, TrangThaiHoatDong: 1 });

// Virtual for employees in this position
viTriCongViecSchema.virtual("DanhSachNhanVien", {
  ref: "NhanVienQuanLy",
  localField: "_id",
  foreignField: "ViTriHienTaiID",
});

// Virtual for routine duties
viTriCongViecSchema.virtual("NhiemVuThuongQuy", {
  ref: "ViTriNhiemVuThuongQuy",
  localField: "_id",
  foreignField: "ViTriID",
});

// Methods
viTriCongViecSchema.methods.toJSON = function () {
  const viTri = this._doc;
  delete viTri.__v;
  return viTri;
};

// Static methods
viTriCongViecSchema.statics.timTheoMa = function (maViTri) {
  return this.findOne({
    MaViTri: maViTri.toUpperCase(),
    TrangThaiHoatDong: true,
  });
};

viTriCongViecSchema.statics.timTheoPhongBan = function (phongBanId) {
  return this.find({ PhongBanID: phongBanId, TrangThaiHoatDong: true }).sort({
    TenViTri: 1,
  });
};

viTriCongViecSchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true })
    .populate("PhongBanID")
    .sort({ TenViTri: 1 });
};

const ViTriCongViec = mongoose.model("ViTriCongViec", viTriCongViecSchema);
module.exports = ViTriCongViec;
