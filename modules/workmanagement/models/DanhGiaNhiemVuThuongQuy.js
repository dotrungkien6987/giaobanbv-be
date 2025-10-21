const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * ✅ RESTORED ORIGINAL MODEL + ChuKyDanhGiaID
 *
 * Purpose: Đánh giá nhiệm vụ thường quy theo tiêu chí và chu kỳ
 *
 * Key Features:
 * - ChiTietDiem: Embedded array lưu điểm từng tiêu chí (TANG_DIEM/GIAM_DIEM)
 * - TongDiemTieuChi: Auto-calculated từ ChiTietDiem
 * - DiemNhiemVu: Auto-calculated = MucDoKho × TongDiemTieuChi
 * - DanhGiaKPIID: Link to parent KPI evaluation
 * - ChuKyDanhGiaID: Link to cycle (NEW - for filtering)
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
    DiemDat: {
      type: Number,
      default: 0,
      min: 0,
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

    // Tổng điểm tiêu chí (auto-calculated)
    TongDiemTieuChi: {
      type: Number,
      default: 0,
    },

    // Điểm nhiệm vụ (auto-calculated = MucDoKho × TongDiemTieuChi)
    DiemNhiemVu: {
      type: Number,
      default: 0,
    },

    // Trạng thái phê duyệt
    TrangThai: {
      type: String,
      enum: ["Chua_Duyet", "Da_Duyet"],
      default: "Chua_Duyet",
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

// ✅ PRE-SAVE HOOK: Auto-calculate scores
danhGiaNhiemVuThuongQuySchema.pre("save", function (next) {
  try {
    // Calculate TongDiemTieuChi from ChiTietDiem
    if (this.ChiTietDiem && this.ChiTietDiem.length > 0) {
      const diemTang = this.ChiTietDiem.filter(
        (item) => item.LoaiTieuChi === "TANG_DIEM"
      ).reduce((sum, item) => sum + (item.DiemDat || 0) / 100, 0);

      const diemGiam = this.ChiTietDiem.filter(
        (item) => item.LoaiTieuChi === "GIAM_DIEM"
      ).reduce((sum, item) => sum + (item.DiemDat || 0) / 100, 0);

      this.TongDiemTieuChi = diemTang - diemGiam;
    } else {
      this.TongDiemTieuChi = 0;
    }

    // Calculate DiemNhiemVu = MucDoKho × TongDiemTieuChi
    this.DiemNhiemVu = this.MucDoKho * this.TongDiemTieuChi;

    next();
  } catch (error) {
    next(error);
  }
});

// ✅ POST-SAVE HOOK: Update parent DanhGiaKPI.TongDiemKPI
danhGiaNhiemVuThuongQuySchema.post("save", async function (doc) {
  try {
    const DanhGiaKPI = mongoose.model("DanhGiaKPI");

    // Recalculate total KPI score from all related task evaluations
    const allEvaluations = await mongoose
      .model("DanhGiaNhiemVuThuongQuy")
      .find({
        DanhGiaKPIID: doc.DanhGiaKPIID,
        isDeleted: { $ne: true },
      });

    const tongDiemKPI = allEvaluations.reduce(
      (sum, item) => sum + (item.DiemNhiemVu || 0),
      0
    );

    // Update parent DanhGiaKPI
    await DanhGiaKPI.findByIdAndUpdate(doc.DanhGiaKPIID, {
      TongDiemKPI: tongDiemKPI,
    });
  } catch (error) {
    console.error("Error updating parent DanhGiaKPI:", error);
  }
});

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

// ✅ METHODS: Kiểm tra có thể sửa
danhGiaNhiemVuThuongQuySchema.methods.coTheSua = function () {
  return this.TrangThai === "Chua_Duyet";
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
