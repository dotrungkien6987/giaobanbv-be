const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const tieuChiTheoViTriSchema = Schema(
  {
    ViTriID: {
      type: Schema.ObjectId,
      required: true,
      ref: "ViTriCongViec",
    },
    TieuChiID: {
      type: Schema.ObjectId,
      required: true,
      ref: "TieuChiDanhGia",
    },
    TrongSo: {
      type: Number,
      min: 0,
      default: 1.0,
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "tieuchitheovitr",
  }
);

// Indexes
tieuChiTheoViTriSchema.index({ ViTriID: 1, TieuChiID: 1 }, { unique: true });
tieuChiTheoViTriSchema.index({ ViTriID: 1 });
tieuChiTheoViTriSchema.index({ TieuChiID: 1 });
tieuChiTheoViTriSchema.index({ TrangThaiHoatDong: 1 });

// Static methods
tieuChiTheoViTriSchema.statics.timTheoViTri = function (viTriId) {
  return this.find({ ViTriID: viTriId, TrangThaiHoatDong: true })
    .populate("TieuChiID")
    .sort({ "TieuChiID.TenTieuChi": 1 });
};

tieuChiTheoViTriSchema.statics.timTheoTieuChi = function (tieuChiId) {
  return this.find({ TieuChiID: tieuChiId, TrangThaiHoatDong: true })
    .populate("ViTriID")
    .sort({ "ViTriID.TenViTri": 1 });
};

tieuChiTheoViTriSchema.statics.layTrongSoTheoViTri = function (viTriId) {
  return this.find({ ViTriID: viTriId, TrangThaiHoatDong: true })
    .populate("TieuChiID", "TenTieuChi LoaiTieuChi GiaTriMin GiaTriMax")
    .select("TieuChiID TrongSo")
    .sort({ TrongSo: -1 });
};

const TieuChiTheoViTri = mongoose.model(
  "TieuChiTheoViTri",
  tieuChiTheoViTriSchema
);
module.exports = TieuChiTheoViTri;
