const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nguoiThucHienCongViecSchema = Schema(
  {
    CongViecID: {
      type: Schema.ObjectId,
      required: true,
      ref: "CongViecDuocGiao",
    },
    NhanVienID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVienQuanLy",
    },
    VaiTro: {
      type: String,
      enum: ["CHINH", "PHU_TRACH"],
      default: "CHINH",
    },
    TrangThai: {
      type: String,
      enum: ["CHO_PHE_DUYET", "CHAP_NHAN", "TU_CHOI"],
      default: "CHO_PHE_DUYET",
    },
    LyDoTuChoi: {
      type: String,
      maxlength: 1000,
    },
    ThoiGianNhan: {
      type: Date,
      default: Date.now,
    },
    ThoiGianPhanHoi: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "nguoithuchienconviec",
  }
);

// Indexes
nguoiThucHienCongViecSchema.index(
  { CongViecID: 1, NhanVienID: 1 },
  { unique: true }
);
nguoiThucHienCongViecSchema.index({ CongViecID: 1 });
nguoiThucHienCongViecSchema.index({ NhanVienID: 1 });
nguoiThucHienCongViecSchema.index({ TrangThai: 1 });
nguoiThucHienCongViecSchema.index({ NhanVienID: 1, TrangThai: 1 });

// Methods
nguoiThucHienCongViecSchema.methods.chapNhan = function () {
  this.TrangThai = "CHAP_NHAN";
  this.ThoiGianPhanHoi = new Date();
  this.LyDoTuChoi = undefined;
  return this.save();
};

nguoiThucHienCongViecSchema.methods.tuChoi = function (lyDo) {
  this.TrangThai = "TU_CHOI";
  this.ThoiGianPhanHoi = new Date();
  this.LyDoTuChoi = lyDo;
  return this.save();
};

// Static methods
nguoiThucHienCongViecSchema.statics.timTheoCongViec = function (congViecId) {
  return this.find({ CongViecID: congViecId })
    .populate("NhanVienID", "HoTen MaNhanVien Email")
    .sort({ ThoiGianNhan: 1 });
};

nguoiThucHienCongViecSchema.statics.timTheoNhanVien = function (nhanVienId) {
  return this.find({ NhanVienID: nhanVienId })
    .populate("CongViecID")
    .sort({ ThoiGianNhan: -1 });
};

nguoiThucHienCongViecSchema.statics.timChoPheDuyetTheoNhanVien = function (
  nhanVienId
) {
  return this.find({ NhanVienID: nhanVienId, TrangThai: "CHO_PHE_DUYET" })
    .populate("CongViecID")
    .sort({ ThoiGianNhan: -1 });
};

nguoiThucHienCongViecSchema.statics.timDaChapNhanTheoNhanVien = function (
  nhanVienId
) {
  return this.find({ NhanVienID: nhanVienId, TrangThai: "CHAP_NHAN" })
    .populate("CongViecID")
    .sort({ ThoiGianNhan: -1 });
};

const NguoiThucHienCongViec = mongoose.model(
  "NguoiThucHienCongViec",
  nguoiThucHienCongViecSchema
);
module.exports = NguoiThucHienCongViec;
