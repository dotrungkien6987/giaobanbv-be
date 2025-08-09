const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const congViecDuocGiaoSchema = Schema(
  {
    TieuDe: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
    },
    MoTa: {
      type: String,
      maxlength: 5000,
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
    },
    NguoiGiaoViecID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    NhomViecID: {
      type: Schema.ObjectId,
      ref: "NhomViecUser",
      description:
        "ID của nhóm việc do người dùng tự định nghĩa để phân loại công việc",
    },
    LoaiCongViec: {
      type: String,
      enum: ["CANHAN", "NHOM"],
      default: "CANHAN",
    },
    MucDoUuTien: {
      type: String,
      enum: ["THAP", "BINH_THUONG", "CAO", "KHAN_CAP"],
      default: "BINH_THUONG",
    },
    TrangThai: {
      type: String,
      enum: [
        "TAO_MOI",
        "DA_GIAO",
        "CHAP_NHAN",
        "TU_CHOI",
        "DANG_THUC_HIEN",
        "CHO_DUYET",
        "HOAN_THANH",
        "QUA_HAN",
      ],
      default: "TAO_MOI",
    },
    NgayBatDau: {
      type: Date,
      default: Date.now,
    },
    NgayHetHan: {
      type: Date,
    },
    SoGioUocTinh: {
      type: Number,
      min: 0,
    },
    SoGioThucTe: {
      type: Number,
      min: 0,
    },
    PhanTramTienDo: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    GhiChuHoanThanh: {
      type: String,
      maxlength: 2000,
    },
    DiemDanhGia: {
      type: Number,
      min: 0,
      max: 10,
    },
    GhiChuDanhGia: {
      type: String,
      maxlength: 2000,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "congviecduocgiao",
  }
);

// Indexes
congViecDuocGiaoSchema.index({ TieuDe: 1 });
congViecDuocGiaoSchema.index({ NhiemVuThuongQuyID: 1 });
congViecDuocGiaoSchema.index({ NguoiGiaoViecID: 1 });
congViecDuocGiaoSchema.index({ NhomViecID: 1 });
congViecDuocGiaoSchema.index({ TrangThai: 1 });
congViecDuocGiaoSchema.index({ NgayHetHan: 1 });
congViecDuocGiaoSchema.index({ MucDoUuTien: 1 });
congViecDuocGiaoSchema.index({ isDeleted: 1 });
congViecDuocGiaoSchema.index({ TrangThai: 1, NgayHetHan: 1 });
congViecDuocGiaoSchema.index({ NhomViecID: 1, TrangThai: 1 });
congViecDuocGiaoSchema.index({ TrangThai: 1, isDeleted: 1 });

// Virtual for assignees
congViecDuocGiaoSchema.virtual("NguoiThucHien", {
  ref: "NguoiThucHienCongViec",
  localField: "_id",
  foreignField: "CongViecID",
});

// Virtual for comments
congViecDuocGiaoSchema.virtual("BinhLuan", {
  ref: "BinhLuan",
  localField: "_id",
  foreignField: "DoiTuongID",
  match: { LoaiDoiTuong: "CONGVIEC" },
});

// Virtual for files
congViecDuocGiaoSchema.virtual("TepDinhKem", {
  ref: "TepDinhKem",
  localField: "_id",
  foreignField: "DoiTuongID",
  match: { LoaiDoiTuong: "CONGVIEC" },
});

// Methods
congViecDuocGiaoSchema.methods.toJSON = function () {
  const congViec = this._doc;
  delete congViec.__v;
  return congViec;
};

congViecDuocGiaoSchema.methods.kiemTraQuaHan = function () {
  return (
    this.NgayHetHan &&
    new Date() > this.NgayHetHan &&
    !["HOAN_THANH", "TU_CHOI"].includes(this.TrangThai)
  );
};

congViecDuocGiaoSchema.methods.coTheSua = function () {
  return !["HOAN_THANH", "TU_CHOI"].includes(this.TrangThai);
};

congViecDuocGiaoSchema.methods.coTheHoanThanh = function () {
  return ["CHO_DUYET", "DANG_THUC_HIEN"].includes(this.TrangThai);
};

congViecDuocGiaoSchema.methods.coTheHoanThanh = function () {
  return ["DANG_THUC_HIEN", "CHO_DUYET"].includes(this.TrangThai);
};

congViecDuocGiaoSchema.methods.softDelete = function () {
  this.isDeleted = true;
  return this.save();
};

// Static methods
congViecDuocGiaoSchema.statics.timTheoNhiemVu = function (nhiemVuId) {
  return this.find({ NhiemVuThuongQuyID: nhiemVuId, isDeleted: false })
    .populate("NguoiGiaoViecID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu PhongBanID")
    .sort({ createdAt: -1 });
};

congViecDuocGiaoSchema.statics.timTheoNguoiGiao = function (nguoiGiaoId) {
  return this.find({ NguoiGiaoViecID: nguoiGiaoId, isDeleted: false })
    .populate("NhiemVuThuongQuyID", "TenNhiemVu PhongBanID")
    .sort({ createdAt: -1 });
};

congViecDuocGiaoSchema.statics.timTheoTrangThai = function (trangThai) {
  return this.find({ TrangThai: trangThai, isDeleted: false })
    .populate("NguoiGiaoViecID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu PhongBanID")
    .sort({ NgayHetHan: 1 });
};

congViecDuocGiaoSchema.statics.timQuaHan = function () {
  return this.find({
    NgayHetHan: { $lt: new Date() },
    TrangThai: { $nin: ["HOAN_THANH", "TU_CHOI"] },
    isDeleted: false,
  })
    .populate("NguoiGiaoViecID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu PhongBanID")
    .sort({ NgayHetHan: 1 });
};

congViecDuocGiaoSchema.statics.timTheoKhoangThoiGian = function (
  tuNgay,
  denNgay
) {
  return this.find({
    createdAt: { $gte: tuNgay, $lte: denNgay },
    isDeleted: false,
  })
    .populate("NguoiGiaoViecID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu PhongBanID")
    .sort({ createdAt: -1 });
};

congViecDuocGiaoSchema.statics.timDaXoa = function () {
  return this.find({ isDeleted: true })
    .populate("NguoiGiaoViecID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu PhongBanID")
    .sort({ updatedAt: -1 });
};

// Pre-save middleware để cập nhật status overdue
congViecDuocGiaoSchema.pre("save", function (next) {
  if (this.kiemTraQuaHan() && this.TrangThai !== "QUA_HAN") {
    this.TrangThai = "QUA_HAN";
  }
  next();
});

const CongViecDuocGiao = mongoose.model(
  "CongViecDuocGiao",
  congViecDuocGiaoSchema
);
module.exports = CongViecDuocGiao;
