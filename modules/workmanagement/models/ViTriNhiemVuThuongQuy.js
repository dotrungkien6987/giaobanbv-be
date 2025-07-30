const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const viTriNhiemVuThuongQuySchema = Schema(
  {
    ViTriID: {
      type: Schema.ObjectId,
      required: true,
      ref: "ViTriCongViec",
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
    },
    TyTrongPhanTram: {
      type: Number,
      min: 0,
      max: 100,
      default: 100,
    },
    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
    },
    NgayGan: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "vitrinhiemvuthuongquy",
  }
);

// Indexes
viTriNhiemVuThuongQuySchema.index(
  { ViTriID: 1, NhiemVuThuongQuyID: 1 },
  { unique: true }
);
viTriNhiemVuThuongQuySchema.index({ ViTriID: 1 });
viTriNhiemVuThuongQuySchema.index({ NhiemVuThuongQuyID: 1 });
viTriNhiemVuThuongQuySchema.index({ TrangThaiHoatDong: 1 });

// Static methods
viTriNhiemVuThuongQuySchema.statics.timTheoViTri = function (viTriId) {
  return this.find({ ViTriID: viTriId, TrangThaiHoatDong: true })
    .populate("NhiemVuThuongQuyID")
    .sort({ NgayGan: -1 });
};

viTriNhiemVuThuongQuySchema.statics.timTheoNhiemVu = function (nhiemVuId) {
  return this.find({ NhiemVuThuongQuyID: nhiemVuId, TrangThaiHoatDong: true })
    .populate("ViTriID")
    .sort({ NgayGan: -1 });
};

// Validation
// viTriNhiemVuThuongQuySchema.pre("save", async function (next) {
//   // Kiểm tra tổng tỷ trọng của các nhiệm vụ cho 1 vị trí không vượt quá 100%
//   if (this.isNew || this.isModified("TyTrongPhanTram")) {
//     const tongTyTrong = await this.constructor.aggregate([
//       {
//         $match: {
//           ViTriID: this.ViTriID,
//           TrangThaiHoatDong: true,
//           _id: { $ne: this._id },
//         },
//       },
//       {
//         $group: {
//           _id: null,
//           tong: { $sum: "$TyTrongPhanTram" },
//         },
//       },
//     ]);

//     const tongHienTai = tongTyTrong.length > 0 ? tongTyTrong[0].tong : 0;
//     if (tongHienTai + this.TyTrongPhanTram > 100) {
//       const error = new Error(
//         `Tổng tỷ trọng không được vượt quá 100%. Hiện tại: ${tongHienTai}%, đang thêm: ${this.TyTrongPhanTram}%`
//       );
//       error.name = "ValidationError";
//       return next(error);
//     }
//   }
//   next();
// });

const ViTriNhiemVuThuongQuy = mongoose.model(
  "ViTriNhiemVuThuongQuy",
  viTriNhiemVuThuongQuySchema
);
module.exports = ViTriNhiemVuThuongQuy;
