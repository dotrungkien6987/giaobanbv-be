const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nhanVienNhiemVuSchema = Schema(
  {
    NhanVienID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVienQuanLy",
      description: "ID của nhân viên được gán nhiệm vụ",
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
      description: "ID của nhiệm vụ thường quy được gán",
    },
    TyTrongPhanTram: {
      type: Number,
      min: 0,
      default: 100,
      description:
        "Tỷ trọng nhiệm vụ này trong tổng công việc của nhân viên (có thể > 100%)",
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
      ref: "NhanVienQuanLy",
      description: "ID của người thực hiện việc gán nhiệm vụ",
    },
    NgayKetThuc: {
      type: Date,
      default: null,
      description: "Ngày kết thúc assignment (null = vô thời hạn)",
    },
    LyDoGan: {
      type: String,
      maxlength: 500,
      description: "Lý do gán nhiệm vụ này cho nhân viên",
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
nhanVienNhiemVuSchema.index(
  { NhanVienID: 1, NhiemVuThuongQuyID: 1 },
  { unique: true }
);
nhanVienNhiemVuSchema.index({ NhanVienID: 1 });
nhanVienNhiemVuSchema.index({ NhiemVuThuongQuyID: 1 });
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
  this.NgayKetThuc = new Date();
  return this.save();
};

nhanVienNhiemVuSchema.methods.ketThucGan = function (lyDo = "") {
  this.NgayKetThuc = new Date();
  this.TrangThaiHoatDong = false;
  this.LyDoKetThuc = lyDo;
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

// Lấy capacity của nhân viên (tổng tỷ trọng hiện tại)
nhanVienNhiemVuSchema.statics.layThongTinTaiTrong = function (nhanVienId) {
  return this.aggregate([
    {
      $match: {
        NhanVienID: new mongoose.Types.ObjectId(nhanVienId),
        TrangThaiHoatDong: true,
        isDeleted: false,
      },
    },
    {
      $group: {
        _id: null,
        tongTyTrong: { $sum: "$TyTrongPhanTram" },
        soLuongNhiemVu: { $sum: 1 },
      },
    },
    {
      $project: {
        _id: 0,
        tongTyTrong: 1,
        soLuongNhiemVu: 1,
        tinhTrangTaiTrong: {
          $cond: {
            if: { $gt: ["$tongTyTrong", 100] },
            then: "QUA_TAI",
            else: {
              $cond: {
                if: { $gt: ["$tongTyTrong", 80] },
                then: "GAN_FULL",
                else: "BINH_THUONG",
              },
            },
          },
        },
      },
    },
  ]);
};

// Validation
nhanVienNhiemVuSchema.pre("save", async function (next) {
  // Validate rằng nhân viên và nhiệm vụ tồn tại và active
  if (this.isNew) {
    const NhanVienQuanLy = mongoose.model("NhanVienQuanLy");
    const NhiemVuThuongQuy = mongoose.model("NhiemVuThuongQuy");

    const nhanVien = await NhanVienQuanLy.findById(this.NhanVienID);
    if (!nhanVien || nhanVien.isDeleted || nhanVien.TrangThai !== "HOATDONG") {
      const error = new Error("Nhân viên không tồn tại hoặc không hoạt động");
      error.name = "ValidationError";
      return next(error);
    }

    const nhiemVu = await NhiemVuThuongQuy.findById(this.NhiemVuThuongQuyID);
    if (!nhiemVu || nhiemVu.isDeleted || !nhiemVu.TrangThaiHoatDong) {
      const error = new Error(
        "Nhiệm vụ thường quy không tồn tại hoặc không hoạt động"
      );
      error.name = "ValidationError";
      return next(error);
    }
  }
  next();
});

const NhanVienNhiemVu = mongoose.model(
  "NhanVienNhiemVu",
  nhanVienNhiemVuSchema
);
module.exports = NhanVienNhiemVu;
