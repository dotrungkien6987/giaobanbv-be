const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tieuChiDanhGiaSchema = Schema(
  {
    TenTieuChi: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    MoTa: {
      type: String,
      maxlength: 1000,
    },
    LoaiTieuChi: {
      type: String,
      enum: ["TANG_DIEM", "GIAM_DIEM"],
      default: "TANG_DIEM",
    },
    GiaTriMin: {
      type: Number,
      default: 0,
    },
    GiaTriMax: {
      type: Number,
      default: 10,
    },
    TrongSoMacDinh: {
      type: Number,
      min: 0,
      default: 1.0,
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "tieuchidanhgia",
  }
);

// Indexes
tieuChiDanhGiaSchema.index({ TenTieuChi: 1 });
tieuChiDanhGiaSchema.index({ LoaiTieuChi: 1 });
tieuChiDanhGiaSchema.index({ TrangThaiHoatDong: 1 });
tieuChiDanhGiaSchema.index({ isDeleted: 1 });

// Virtual for positions using this criteria
tieuChiDanhGiaSchema.virtual("ViTriSuDung", {
  ref: "TieuChiTheoViTri",
  localField: "_id",
  foreignField: "TieuChiID",
});

// Methods
tieuChiDanhGiaSchema.methods.kiemTraDiem = function (diem) {
  return diem >= this.GiaTriMin && diem <= this.GiaTriMax;
};

// Static methods
tieuChiDanhGiaSchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true, isDeleted: false }).sort({
    TenTieuChi: 1,
  });
};

tieuChiDanhGiaSchema.statics.timTheoLoai = function (loai) {
  return this.find({
    LoaiTieuChi: loai,
    TrangThaiHoatDong: true,
    isDeleted: false,
  }).sort({
    TenTieuChi: 1,
  });
};

tieuChiDanhGiaSchema.statics.layTieuChiMacDinh = function () {
  return this.find({ TrangThaiHoatDong: true, isDeleted: false }).select(
    "TenTieuChi TrongSoMacDinh LoaiTieuChi GiaTriMin GiaTriMax"
  );
};

const TieuChiDanhGia = mongoose.model("TieuChiDanhGia", tieuChiDanhGiaSchema);
module.exports = TieuChiDanhGia;
