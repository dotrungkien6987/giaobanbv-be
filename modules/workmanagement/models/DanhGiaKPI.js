const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const danhGiaKPISchema = Schema(
  {
    ChuKyDanhGiaID: {
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
danhGiaKPISchema.index({ ChuKyDanhGiaID: 1, NhanVienID: 1 }, { unique: true });
danhGiaKPISchema.index({ ChuKyDanhGiaID: 1 });
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

/**
 * ✅ V2: Duyệt KPI - Tự động tính TongDiemKPI theo công thức chuẩn
 * @param {String} nhanXet - Nhận xét của người duyệt
 * @param {ObjectId} nguoiDuyetId - ID người duyệt
 */
danhGiaKPISchema.methods.duyet = async function (nhanXet, nguoiDuyetId) {
  const NhanVienNhiemVu = mongoose.model("NhanVienNhiemVu");
  const DanhGiaNhiemVuThuongQuy = mongoose.model("DanhGiaNhiemVuThuongQuy");

  // 1. Validate trạng thái
  if (this.TrangThai === "DA_DUYET") {
    throw new Error("Đánh giá KPI đã được duyệt");
  }

  // 2. Load DiemTuDanhGia từ NhanVienNhiemVu
  const assignments = await NhanVienNhiemVu.find({
    NhanVienID: this.NhanVienID,
    ChuKyDanhGiaID: this.ChuKyDanhGiaID,
    isDeleted: false,
  });

  // Build map: NhiemVuThuongQuyID → DiemTuDanhGia
  const diemTuDanhGiaMap = {};
  assignments.forEach((a) => {
    const nvIdStr = a.NhiemVuThuongQuyID.toString();
    diemTuDanhGiaMap[nvIdStr] = a.DiemTuDanhGia || 0;
  });

  // 3. Load evaluations
  const evaluations = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: this._id,
    isDeleted: false,
  });

  if (evaluations.length === 0) {
    throw new Error("Không có nhiệm vụ nào để đánh giá");
  }

  // 4. Tính TongDiemKPI theo công thức chuẩn V2
  let tongDiemKPI = 0;

  evaluations.forEach((nv) => {
    const nvIdStr = nv.NhiemVuThuongQuyID.toString();
    const diemTuDanhGia = diemTuDanhGiaMap[nvIdStr] || 0;

    let diemTang = 0; // Tổng điểm tăng (0-N, không giới hạn)
    let diemGiam = 0; // Tổng điểm giảm (0-N)

    // Tính điểm từng tiêu chí
    nv.ChiTietDiem.forEach((tc) => {
      let diemCuoiCung = 0;

      // ✅ CÔNG THỨC DUY NHẤT
      if (tc.IsMucDoHoanThanh) {
        // Tiêu chí "Mức độ hoàn thành" - Kết hợp 2 điểm
        const diemQuanLy = tc.DiemDat || 0;
        diemCuoiCung = (diemQuanLy * 2 + diemTuDanhGia) / 3;
      } else {
        // Tiêu chí khác - Lấy trực tiếp điểm Manager
        diemCuoiCung = tc.DiemDat || 0;
      }

      // Scale về 0-1
      const diemScaled = diemCuoiCung / 100;

      // Phân loại tăng/giảm
      if (tc.LoaiTieuChi === "TANG_DIEM") {
        diemTang += diemScaled;
      } else {
        diemGiam += diemScaled;
      }
    });

    // TongDiemTieuChi = DiemTang - DiemGiam (có thể > 1.0)
    const tongDiemTieuChi = diemTang - diemGiam;

    // DiemNhiemVu = MucDoKho × TongDiemTieuChi
    const diemNhiemVu = nv.MucDoKho * tongDiemTieuChi;

    // Cộng dồn
    tongDiemKPI += diemNhiemVu;
  });

  // 5. Snapshot TongDiemKPI
  this.TongDiemKPI = tongDiemKPI;
  this.TrangThai = "DA_DUYET";
  this.NgayDuyet = new Date();

  if (nguoiDuyetId) {
    this.NguoiDuyet = nguoiDuyetId;
  }

  if (nhanXet) {
    this.NhanXetNguoiDanhGia = nhanXet;
  }

  // 6. Ghi lịch sử duyệt
  this.LichSuDuyet = this.LichSuDuyet || [];
  this.LichSuDuyet.push({
    NguoiDuyet: nguoiDuyetId || this.NguoiDuyet || undefined,
    NgayDuyet: this.NgayDuyet,
    TongDiemLucDuyet: this.TongDiemKPI, // ← Snapshot chính thức
    GhiChu: nhanXet || undefined,
  });

  await this.save();
  return this;
};

/**
 * ✅ V2: Hủy duyệt KPI với audit trail đầy đủ
 * @param {ObjectId} nguoiHuyId - ID người hủy duyệt
 * @param {String} lyDo - Lý do hủy duyệt (required)
 */
danhGiaKPISchema.methods.huyDuyet = async function (nguoiHuyId, lyDo) {
  // Validate trạng thái
  if (this.TrangThai !== "DA_DUYET") {
    throw new Error("KPI chưa được duyệt, không thể hủy duyệt");
  }

  // Validate lý do
  if (!lyDo || lyDo.trim().length === 0) {
    throw new Error("Vui lòng nhập lý do hủy duyệt");
  }

  // Lưu lịch sử hủy duyệt với đầy đủ snapshot
  this.LichSuHuyDuyet = this.LichSuHuyDuyet || [];
  this.LichSuHuyDuyet.push({
    NguoiHuyDuyet: nguoiHuyId,
    NgayHuyDuyet: new Date(),
    LyDoHuyDuyet: lyDo.trim(),
    DiemTruocKhiHuy: this.TongDiemKPI || 0, // ← Snapshot điểm cũ
    NgayDuyetTruocDo: this.NgayDuyet, // ← Snapshot ngày duyệt cũ
  });

  // Reset về trạng thái CHUA_DUYET
  this.TrangThai = "CHUA_DUYET";
  this.TongDiemKPI = 0; // ← Reset về 0 (quan trọng!)
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
    ChuKyDanhGiaID: chuKyId,
    isDeleted: false,
  };

  if (trangThai) {
    query.TrangThai = trangThai;
  }

  return this.find(query)
    .populate("NhanVienID", "HoTen MaNhanVien")
    .populate("NguoiDanhGiaID", "HoTen UserName")
    .populate("ChuKyDanhGiaID", "TenChuKy NgayBatDau NgayKetThuc")
    .sort({ TongDiemKPI: -1, createdAt: -1 })
    .limit(limit)
    .skip((page - 1) * limit);
};

danhGiaKPISchema.statics.timTheoNhanVien = function (nhanVienId) {
  return this.find({
    NhanVienID: nhanVienId,
    isDeleted: false,
  })
    .populate("ChuKyDanhGiaID", "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy")
    .populate("NguoiDanhGiaID", "HoTen")
    .sort({ createdAt: -1 });
};

danhGiaKPISchema.statics.layTopNhanVien = function (chuKyId, soLuong = 10) {
  return this.find({
    ChuKyDanhGiaID: chuKyId,
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
