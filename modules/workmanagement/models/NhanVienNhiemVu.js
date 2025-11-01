const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nhanVienNhiemVuSchema = Schema(
  {
    NhanVienID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
      description: "ID của nhân viên được gán nhiệm vụ",
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
      description: "ID của nhiệm vụ thường quy được gán",
    },

    // ✅ NEW: Gán theo chu kỳ (null = vĩnh viễn, backward compatible)
    ChuKyDanhGiaID: {
      type: Schema.Types.ObjectId,
      ref: "ChuKyDanhGia",
      default: null,
      index: true,
      description: "Chu kỳ đánh giá (null = gán vĩnh viễn)",
    },

    // ✅ NEW: Độ khó thực tế (user nhập manually khi gán)
    MucDoKho: {
      type: Number,
      required: false, // Tạm thời optional để không break existing data
      min: 1.0,
      max: 10.0,
      validate: {
        validator: (v) => v === undefined || Math.round(v * 10) === v * 10,
        message:
          "MucDoKho phải là số từ 1.0-10.0 với tối đa 1 chữ số thập phân (VD: 5.5, 7.2)",
      },
      description:
        "Độ khó thực tế cho nhân viên này (user nhập manually khi gán)",
    },

    // ✅ NEW: Điểm nhân viên tự đánh giá
    DiemTuDanhGia: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
      description: "Điểm nhân viên tự đánh giá (0-100%), null = chưa tự chấm",
    },

    // ✅ NEW: Thời gian nhân viên tự chấm
    NgayTuCham: {
      type: Date,
      default: null,
      description: "Thời điểm nhân viên tự chấm điểm",
    },

    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
      description: "Trạng thái hoạt động của assignment này",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      description: "Đánh dấu đã xóa mềm",
    },
    NgayGan: {
      type: Date,
      default: Date.now,
      description: "Ngày gán nhiệm vụ cho nhân viên",
    },
    NguoiGanID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      description: "ID của người thực hiện việc gán nhiệm vụ",
    },
  },
  {
    timestamps: true,
    collection: "nhanviennhiemvu", // Tên bảng tiếng Việt không dấu gạch dưới
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
// ❌ OLD unique index - WILL BE DROPPED MANUALLY
// nhanVienNhiemVuSchema.index(
//   { NhanVienID: 1, NhiemVuThuongQuyID: 1 },
//   { unique: true }
// );

// ✅ NEW: Non-unique for query performance (backward compatible)
nhanVienNhiemVuSchema.index({ NhanVienID: 1, NhiemVuThuongQuyID: 1 });

// ✅ NEW: Unique composite index with cycle
// Một nhiệm vụ chỉ được gán 1 lần cho 1 nhân viên trong 1 chu kỳ
nhanVienNhiemVuSchema.index(
  { NhanVienID: 1, NhiemVuThuongQuyID: 1, ChuKyDanhGiaID: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    name: "unique_assignment_per_cycle",
  }
);

nhanVienNhiemVuSchema.index({ NhanVienID: 1 });
nhanVienNhiemVuSchema.index({ NhiemVuThuongQuyID: 1 });
nhanVienNhiemVuSchema.index({ ChuKyDanhGiaID: 1 }); // ✅ NEW
nhanVienNhiemVuSchema.index({ TrangThaiHoatDong: 1 });
nhanVienNhiemVuSchema.index({ isDeleted: 1 });
nhanVienNhiemVuSchema.index({
  NhanVienID: 1,
  TrangThaiHoatDong: 1,
  isDeleted: 1,
});
nhanVienNhiemVuSchema.index({ NgayGan: -1 });

// Query middleware để tự động filter deleted records
nhanVienNhiemVuSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

// Methods
nhanVienNhiemVuSchema.methods.toJSON = function () {
  const assignment = this._doc;
  delete assignment.__v;
  return assignment;
};

nhanVienNhiemVuSchema.methods.xoaMem = function () {
  this.isDeleted = true;
  this.TrangThaiHoatDong = false;

  return this.save();
};

// ✅ NEW: Nhân viên tự chấm điểm
nhanVienNhiemVuSchema.methods.tuChamDiem = function (diem) {
  if (diem < 0 || diem > 100) {
    throw new Error("Điểm phải từ 0-100");
  }

  this.DiemTuDanhGia = diem;
  this.NgayTuCham = new Date();

  return this.save();
};

// Static methods
nhanVienNhiemVuSchema.statics.timTheoNhanVien = function (nhanVienId) {
  return this.find({
    NhanVienID: nhanVienId,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .populate("NhiemVuThuongQuyID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayGan: -1 });
};

nhanVienNhiemVuSchema.statics.timTheoNhiemVu = function (nhiemVuId) {
  return this.find({
    NhiemVuThuongQuyID: nhiemVuId,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .populate("NhanVienID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayGan: -1 });
};

nhanVienNhiemVuSchema.statics.layDanhSachHoatDong = function () {
  return this.find({ TrangThaiHoatDong: true, isDeleted: false })
    .populate("NhanVienID")
    .populate("NhiemVuThuongQuyID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayGan: -1 });
};

nhanVienNhiemVuSchema.statics.layDanhSachDaXoa = function () {
  return this.find({ isDeleted: true })
    .populate("NhanVienID")
    .populate("NhiemVuThuongQuyID")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ updatedAt: -1 });
};

// Validation

const NhanVienNhiemVu = mongoose.model(
  "NhanVienNhiemVu",
  nhanVienNhiemVuSchema
);
module.exports = NhanVienNhiemVu;
