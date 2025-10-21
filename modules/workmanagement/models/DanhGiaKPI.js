const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const danhGiaKPISchema = Schema(
  {
    ChuKyID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ChuKyDanhGia",
    },
    NhanVienID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    NguoiDanhGiaID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "NhanVien",
    },

    // Tổng điểm KPI (tự động tính từ DanhGiaNhiemVuThuongQuy)
    TongDiemKPI: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Trạng thái chỉ có 2: CHUA_DUYET | DA_DUYET
    TrangThai: {
      type: String,
      enum: ["CHUA_DUYET", "DA_DUYET"],
      default: "CHUA_DUYET",
    },

    // Nhận xét của người đánh giá
    NhanXetNguoiDanhGia: {
      type: String,
      maxlength: 2000,
    },

    // Phản hồi từ nhân viên (optional)
    PhanHoiNhanVien: {
      type: String,
      maxlength: 2000,
    },

    // Thời gian duyệt
    NgayDuyet: {
      type: Date,
    },

    // ✅ NEW: Người duyệt hiện tại (nếu đang ở trạng thái đã duyệt)
    NguoiDuyet: {
      type: Schema.Types.ObjectId,
      ref: "NhanVien",
      default: null,
    },

    // ✅ NEW: Lịch sử duyệt
    LichSuDuyet: [
      {
        NguoiDuyet: {
          type: Schema.Types.ObjectId,
          ref: "NhanVien",
        },
        NgayDuyet: {
          type: Date,
          default: Date.now,
        },
        TongDiemLucDuyet: {
          type: Number,
          default: 0,
        },
        GhiChu: {
          type: String,
          maxlength: 1000,
        },
        _id: false,
      },
    ],

    // ✅ NEW: Lịch sử hủy duyệt
    LichSuHuyDuyet: [
      {
        NguoiHuyDuyet: {
          type: Schema.Types.ObjectId,
          ref: "NhanVien",
        },
        NgayHuyDuyet: {
          type: Date,
          default: Date.now,
        },
        LyDoHuyDuyet: {
          type: String,
          required: true,
          maxlength: 500,
        },
        DiemTruocKhiHuy: {
          type: Number,
          default: 0,
        },
        NgayDuyetTruocDo: {
          type: Date,
        },
        _id: false,
      },
    ],

    isDeleted: {
      type: Boolean,
      default: false,
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
danhGiaKPISchema.index({ NguoiDuyet: 1 });
danhGiaKPISchema.index({ TrangThai: 1 });
danhGiaKPISchema.index({ TongDiemKPI: -1 });
danhGiaKPISchema.index({ isDeleted: 1 });

// Virtual: Danh sách đánh giá nhiệm vụ con
danhGiaKPISchema.virtual("DanhSachDanhGiaNhiemVu", {
  ref: "DanhGiaNhiemVuThuongQuy",
  localField: "_id",
  foreignField: "DanhGiaKPIID",
});

// Methods
danhGiaKPISchema.methods.tinhTongDiemKPI = async function () {
  const DanhGiaNhiemVuThuongQuy = mongoose.model("DanhGiaNhiemVuThuongQuy");

  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: this._id,
    isDeleted: false,
  });

  this.TongDiemKPI = danhGiaNhiemVu.reduce(
    (sum, item) => sum + (item.DiemNhiemVu || 0),
    0
  );

  await this.save();
  return this.TongDiemKPI;
};

danhGiaKPISchema.methods.duyet = async function (nhanXet, nguoiDuyetId) {
  if (this.TrangThai === "DA_DUYET") {
    throw new Error("Đánh giá KPI đã được duyệt");
  }

  this.TrangThai = "DA_DUYET";
  this.NgayDuyet = new Date();
  if (nguoiDuyetId) {
    this.NguoiDuyet = nguoiDuyetId;
  }
  if (nhanXet) {
    this.NhanXetNguoiDanhGia = nhanXet;
  }

  // Ghi lịch sử duyệt
  this.LichSuDuyet = this.LichSuDuyet || [];
  this.LichSuDuyet.push({
    NguoiDuyet: nguoiDuyetId || this.NguoiDuyet || undefined,
    NgayDuyet: this.NgayDuyet,
    TongDiemLucDuyet: this.TongDiemKPI || 0,
    GhiChu: nhanXet || undefined,
  });

  await this.save();
  return this;
};

danhGiaKPISchema.methods.huyDuyet = async function () {
  this.TrangThai = "CHUA_DUYET";
  this.NgayDuyet = null;
  this.NguoiDuyet = null;

  await this.save();
  return this;
};

danhGiaKPISchema.methods.coTheSua = function () {
  return this.TrangThai === "CHUA_DUYET" && !this.isDeleted;
};

// Static methods
danhGiaKPISchema.statics.timTheoChuKy = function (chuKyId, options = {}) {
  const { page = 1, limit = 20, trangThai } = options;

  const query = {
    ChuKyID: chuKyId,
    isDeleted: false,
  };

  if (trangThai) {
    query.TrangThai = trangThai;
  }

  return this.find(query)
    .populate("NhanVienID", "HoTen MaNhanVien")
    .populate("NguoiDanhGiaID", "HoTen UserName")
    .populate("ChuKyID", "TenChuKy NgayBatDau NgayKetThuc")
    .sort({ TongDiemKPI: -1, createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

danhGiaKPISchema.statics.timTheoNhanVien = function (nhanVienId) {
  return this.find({
    NhanVienID: nhanVienId,
    isDeleted: false,
  })
    .populate("ChuKyID", "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy")
    .populate("NguoiDanhGiaID", "HoTen")
    .sort({ createdAt: -1 });
};

danhGiaKPISchema.statics.layTopNhanVien = function (chuKyId, soLuong = 10) {
  return this.find({
    ChuKyID: chuKyId,
    TrangThai: "DA_DUYET",
    isDeleted: false,
  })
    .populate("NhanVienID", "HoTen MaNhanVien")
    .sort({ TongDiemKPI: -1 })
    .limit(soLuong);
};

// Pre-save validation
danhGiaKPISchema.pre("save", function (next) {
  // Validation: Ngày duyệt chỉ có khi trạng thái DA_DUYET
  if (this.TrangThai !== "DA_DUYET") {
    this.NgayDuyet = null;
  }

  next();
});

const DanhGiaKPI = mongoose.model("DanhGiaKPI", danhGiaKPISchema);
module.exports = DanhGiaKPI;
