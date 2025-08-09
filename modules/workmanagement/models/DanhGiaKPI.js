const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const danhGiaKPISchema = Schema(
  {
    ChuKyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "ChuKyDanhGia",
    },
    NhanVienID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    NguoiDanhGiaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    TongDiem: {
      type: Number,
      min: 0,
      default: 0,
    },
    DiemChuanHoa: {
      type: Number,
      min: 0,
      max: 10,
      default: 0,
    },
    TrangThai: {
      type: String,
      enum: ["NHAP", "DA_NOP", "DUYET", "TU_CHOI"],
      default: "NHAP",
    },
    NhanXetNguoiDanhGia: {
      type: String,
      maxlength: 2000,
    },
    PhanHoiNhanVien: {
      type: String,
      maxlength: 2000,
    },
    ThoiGianDuyet: {
      type: Date,
    },
  },
  {
    timestamps: true,
    collection: "danhgiakpi",
  }
);

// Indexes
danhGiaKPISchema.index({ ChuKyID: 1, NhanVienID: 1 }, { unique: true });
danhGiaKPISchema.index({ ChuKyID: 1 });
danhGiaKPISchema.index({ NhanVienID: 1 });
danhGiaKPISchema.index({ NguoiDanhGiaID: 1 });
danhGiaKPISchema.index({ TrangThai: 1 });
danhGiaKPISchema.index({ DiemChuanHoa: -1 });

// Virtual for routine duty evaluations
danhGiaKPISchema.virtual("DanhSachDanhGiaNhiemVu", {
  ref: "DanhGiaNhiemVuThuongQuy",
  localField: "_id",
  foreignField: "DanhGiaKPIID",
});

// Methods
danhGiaKPISchema.methods.tinhTongDiem = async function () {
  const DanhGiaNhiemVuThuongQuy = mongoose.model("DanhGiaNhiemVuThuongQuy");
  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: this._id,
  });

  this.TongDiem = danhGiaNhiemVu.reduce(
    (tong, nhiemVu) => tong + (nhiemVu.DiemCuoi || 0),
    0
  );
  this.DiemChuanHoa = Math.min(this.TongDiem / 10, 10);

  return this.save();
};

danhGiaKPISchema.methods.nopBai = function () {
  this.TrangThai = "DA_NOP";
  return this.save();
};

danhGiaKPISchema.methods.duyet = function () {
  this.TrangThai = "DUYET";
  this.ThoiGianDuyet = new Date();
  return this.save();
};

danhGiaKPISchema.methods.tuChoi = function () {
  this.TrangThai = "TU_CHOI";
  this.ThoiGianDuyet = null;
  return this.save();
};

danhGiaKPISchema.methods.coTheSua = function () {
  return ["NHAP", "TU_CHOI"].includes(this.TrangThai);
};

// Static methods
danhGiaKPISchema.statics.timTheoChuKy = function (chuKyId) {
  return this.find({ ChuKyID: chuKyId })
    .populate("NhanVienID", "HoTen MaNhanVien")
    .populate("NguoiDanhGiaID", "HoTen MaNhanVien")
    .sort({ DiemChuanHoa: -1 });
};

danhGiaKPISchema.statics.timTheoNhanVien = function (nhanVienId) {
  return this.find({ NhanVienID: nhanVienId })
    .populate("ChuKyID", "TenChuKy NgayBatDau NgayKetThuc")
    .populate("NguoiDanhGiaID", "HoTen MaNhanVien")
    .sort({ createdAt: -1 });
};

danhGiaKPISchema.statics.layTopNhanVien = function (chuKyId, soLuong = 10) {
  return this.find({
    ChuKyID: chuKyId,
    TrangThai: "DUYET",
  })
    .populate("NhanVienID", "HoTen MaNhanVien")
    .sort({ DiemChuanHoa: -1 })
    .limit(soLuong);
};

const DanhGiaKPI = mongoose.model("DanhGiaKPI", danhGiaKPISchema);
module.exports = DanhGiaKPI;
