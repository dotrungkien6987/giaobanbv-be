const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * ✅ V2: SIMPLIFIED MODEL - NO CALCULATED FIELDS
 *
 * Purpose: Đánh giá nhiệm vụ thường quy theo tiêu chí và chu kỳ
 *
 * Key Features:
 * - ChiTietDiem: Embedded array lưu điểm từng tiêu chí (TANG_DIEM/GIAM_DIEM)
 * - DanhGiaKPIID: Link to parent KPI evaluation
 * - ChuKyDanhGiaID: Link to cycle (for filtering)
 *
 * V2 Changes:
 * - ❌ REMOVED: TongDiemTieuChi (calculated field)
 * - ❌ REMOVED: DiemNhiemVu (calculated field)
 * - ❌ REMOVED: Pre-save hook (auto-calculate)
 * - ❌ REMOVED: Post-save hook (update parent)
 * - ✅ NEW: Tính điểm real-time ở frontend, snapshot khi duyệt
 */

const chiTietDiemSchema = new Schema(
  {
    TenTieuChi: {
      type: String,
      required: true,
    },
    LoaiTieuChi: {
      type: String,
      enum: ["TANG_DIEM", "GIAM_DIEM"],
      required: true,
    },

    // Điểm quản lý chấm (existing field - giữ nguyên ý nghĩa)
    DiemDat: {
      type: Number,
      default: null,
      min: 0,
      max: 100,
      description: "Điểm quản lý chấm cho tiêu chí này",
    },

    // ✅ NEW: Đánh dấu tiêu chí "Mức độ hoàn thành" (copy từ ChuKyDanhGia)
    IsMucDoHoanThanh: {
      type: Boolean,
      default: false,
      description: "true = Tiêu chí cho phép tự đánh giá",
    },

    GiaTriMin: {
      type: Number,
      default: 0,
    },
    GiaTriMax: {
      type: Number,
      required: true,
    },
    DonVi: {
      type: String,
      default: "",
    },
    MoTa: {
      type: String,
      default: "",
    },
    ThuTu: {
      type: Number,
      default: 0,
    },
    GhiChu: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const danhGiaNhiemVuThuongQuySchema = Schema(
  {
    // Link to parent KPI evaluation
    DanhGiaKPIID: {
      type: Schema.Types.ObjectId,
      ref: "DanhGiaKPI",
      required: true,
      index: true,
    },

    // Nhiệm vụ thường quy
    NhiemVuThuongQuyID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
      index: true,
    },

    // Nhân viên được đánh giá
    NhanVienID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "NhanVien",
      index: true,
    },

    // ✅ NEW: Chu kỳ đánh giá (for cycle-based filtering)
    ChuKyDanhGiaID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "ChuKyDanhGia",
      index: true,
    },

    // Độ khó nhiệm vụ (1-10, from assignment or template)
    MucDoKho: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
      default: 5,
    },

    // Chi tiết điểm từng tiêu chí
    ChiTietDiem: [chiTietDiemSchema],

    // ❌ REMOVED: TongDiemTieuChi (calculated field - V2 không cần)
    // ❌ REMOVED: DiemNhiemVu (calculated field - V2 không cần)
    // → Tính real-time ở frontend, snapshot khi duyệt ở backend

    // Trạng thái phê duyệt
    TrangThai: {
      type: String,
      enum: ["CHUA_DUYET", "DA_DUYET"], // ✅ SIMPLIFIED: Chỉ 2 trạng thái
      default: "CHUA_DUYET",
    },

    // Ghi chú
    GhiChu: {
      type: String,
      default: "",
    },

    // Ngày phê duyệt
    NgayDuyet: {
      type: Date,
    },

    // Người phê duyệt
    NguoiDuyetID: {
      type: Schema.Types.ObjectId,
      ref: "NhanVien",
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "danhgianhiemvuthuongquy",
  }
);

// ❌ REMOVED: PRE-SAVE HOOK (tính TongDiemTieuChi, DiemNhiemVu)
// → V2: Không cần calculated fields, tính khi duyệt

// ❌ REMOVED: POST-SAVE HOOK (update parent DanhGiaKPI.TongDiemKPI)
// → V2: TongDiemKPI chỉ tính khi duyệt (method duyet())

// ✅ UNIQUE INDEX: 1 đánh giá cho 1 nhiệm vụ/nhân viên/chu kỳ
danhGiaNhiemVuThuongQuySchema.index(
  {
    NhanVienID: 1,
    NhiemVuThuongQuyID: 1,
    ChuKyDanhGiaID: 1,
  },
  {
    unique: true,
    partialFilterExpression: { isDeleted: { $ne: true } },
    name: "unique_evaluation_per_cycle",
  }
);

// ✅ QUERY PERFORMANCE INDEXES
danhGiaNhiemVuThuongQuySchema.index({
  DanhGiaKPIID: 1,
});
danhGiaNhiemVuThuongQuySchema.index({
  NhanVienID: 1,
  ChuKyDanhGiaID: 1,
});
danhGiaNhiemVuThuongQuySchema.index({
  ChuKyDanhGiaID: 1,
});

// ✅ METHODS: Chấm điểm
danhGiaNhiemVuThuongQuySchema.methods.chamDiem = function (chiTietDiem) {
  this.ChiTietDiem = chiTietDiem;
  return this.save();
};

// ✅ METHODS: Kiểm tra có thể chấm điểm
danhGiaNhiemVuThuongQuySchema.methods.coTheChamDiem = function () {
  return this.TrangThai === "CHUA_DUYET";
};

// ✅ METHODS: Kiểm tra có thể sửa (alias)
danhGiaNhiemVuThuongQuySchema.methods.coTheSua = function () {
  return this.TrangThai === "CHUA_DUYET";
};

// ✅ METHODS: Duyệt nhiệm vụ (tính điểm cuối cùng)
danhGiaNhiemVuThuongQuySchema.methods.duyet = async function (nguoiDuyetId) {
  if (this.TrangThai === "DA_DUYET") {
    throw new Error("Nhiệm vụ đã được duyệt");
  }

  // ✅ LẤY DiemTuDanhGia từ NhanVienNhiemVu
  const NhanVienNhiemVu = mongoose.model("NhanVienNhiemVu");
  const assignment = await NhanVienNhiemVu.findOne({
    NhanVienID: this.NhanVienID,
    NhiemVuThuongQuyID: this.NhiemVuThuongQuyID,
    ChuKyDanhGiaID: this.ChuKyDanhGiaID,
    isDeleted: { $ne: true },
  });

  const diemTuDanhGia = assignment?.DiemTuDanhGia ?? 0;

  // ✅ TÍNH ĐIỂM CUỐI CÙNG CHO TỪNG TIÊU CHÍ
  let diemTangCong = 0;
  let diemGiamTru = 0;

  this.ChiTietDiem.forEach((tc) => {
    let diemCuoiCung = 0;

    if (tc.IsMucDoHoanThanh) {
      // ✅ Tiêu chí "Mức độ hoàn thành" - Tính theo công thức
      const diemQL = tc.DiemDat ?? 0; // DiemDat = điểm quản lý chấm

      // Công thức: (DiemDat × 2 + DiemTuDanhGia) / 3
      diemCuoiCung = (diemQL * 2 + diemTuDanhGia) / 3;
    } else {
      // ✅ Tiêu chí thường - Lấy trực tiếp DiemDat
      diemCuoiCung = tc.DiemDat ?? 0;
    }

    // Cộng/trừ vào tổng điểm
    if (tc.LoaiTieuChi === "TANG_DIEM") {
      diemTangCong += diemCuoiCung / 100;
    } else {
      diemGiamTru += diemCuoiCung / 100;
    }
  });

  // ✅ LƯU TỔNG ĐIỂM
  this.TongDiemTieuChi = diemTangCong - diemGiamTru;
  this.DiemNhiemVu = this.MucDoKho * this.TongDiemTieuChi;

  // ✅ CHỐT TRẠNG THÁI
  this.TrangThai = "DA_DUYET";
  this.NgayDuyet = new Date();
  this.NguoiDuyetID = nguoiDuyetId;

  return this.save();
};

// ✅ METHODS: Hủy duyệt
danhGiaNhiemVuThuongQuySchema.methods.huyDuyet = function (lyDo) {
  if (this.TrangThai !== "DA_DUYET") {
    throw new Error("Chỉ có thể hủy duyệt nhiệm vụ đã duyệt");
  }

  this.TrangThai = "CHUA_DUYET";
  this.NgayDuyet = null;
  this.NguoiDuyetID = null;
  this.GhiChu = `${this.GhiChu}\n[Hủy duyệt: ${lyDo}]`;

  return this.save();
};

// ✅ STATICS: Lấy danh sách theo DanhGiaKPIID
danhGiaNhiemVuThuongQuySchema.statics.layDanhSachTheoDanhGiaKPI = function (
  danhGiaKPIId
) {
  return this.find({
    DanhGiaKPIID: danhGiaKPIId,
    isDeleted: { $ne: true },
  })
    .populate("NhiemVuThuongQuyID")
    .populate("NhanVienID")
    .populate("ChuKyDanhGiaID");
};

// ✅ STATICS: Tính số công việc liên quan
danhGiaNhiemVuThuongQuySchema.statics.tinhSoCongViecLienQuan = async function (
  danhGiaKPIId
) {
  const count = await this.countDocuments({
    DanhGiaKPIID: danhGiaKPIId,
    isDeleted: { $ne: true },
  });
  return count;
};

module.exports = mongoose.model(
  "DanhGiaNhiemVuThuongQuy",
  danhGiaNhiemVuThuongQuySchema
);
