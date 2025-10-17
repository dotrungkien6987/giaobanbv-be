const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const danhGiaNhiemVuThuongQuySchema = Schema(
  {
    DanhGiaKPIID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "DanhGiaKPI",
      index: true,
    },

    NhiemVuThuongQuyID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
    },

    NhanVienID: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: "NhanVien",
    },

    // Mức độ khó (lấy từ NhiemVuThuongQuy, có thể điều chỉnh)
    MucDoKho: {
      type: Number,
      required: true,
      min: 1,
      max: 10,
    },

    // Chi tiết điểm từng tiêu chí
    ChiTietDiem: [
      {
        // Không còn reference TieuChiID - self-contained
        TenTieuChi: {
          type: String,
          required: true,
        },
        LoaiTieuChi: {
          type: String,
          enum: ["TANG_DIEM", "GIAM_DIEM"],
          required: true,
        },
        // ✅ Giá trị user nhập (0 - GiaTriMax)
        DiemDat: {
          type: Number,
          required: true,
          default: 0,
        },
        // ✅ Giá trị min/max (copy từ ChuKy.TieuChiCauHinh)
        GiaTriMin: {
          type: Number,
          required: true,
          default: 0,
        },
        GiaTriMax: {
          type: Number,
          required: true,
          default: 100,
        },
        DonVi: {
          type: String,
          default: "%",
        },
        ThuTu: {
          type: Number,
          default: 0,
        },
        GhiChu: {
          type: String,
          default: "",
        },
        _id: false,
      },
    ],

    // Tổng điểm tiêu chí (tự động tính)
    // = Σ(TANG_DIEM) - Σ(GIAM_DIEM)
    TongDiemTieuChi: {
      type: Number,
      default: 0,
    },

    // Điểm nhiệm vụ cuối cùng (tự động tính)
    // = MucDoKho × TongDiemTieuChi / 100
    DiemNhiemVu: {
      type: Number,
      default: 0,
    },

    // Số công việc liên quan (tham khảo)
    SoCongViecLienQuan: {
      type: Number,
      default: 0,
    },

    // Ghi chú của người đánh giá
    GhiChu: {
      type: String,
      maxlength: 1000,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "danhgianhiemvuthuongquy",
  }
);

// Indexes
danhGiaNhiemVuThuongQuySchema.index({ DanhGiaKPIID: 1 });
danhGiaNhiemVuThuongQuySchema.index({ NhiemVuThuongQuyID: 1 });
danhGiaNhiemVuThuongQuySchema.index({ NhanVienID: 1 });
danhGiaNhiemVuThuongQuySchema.index({ isDeleted: 1 });

// Pre-save: Tính toán tự động
danhGiaNhiemVuThuongQuySchema.pre("save", function (next) {
  if (this.isModified("ChiTietDiem") || this.isModified("MucDoKho")) {
    // Tính tổng điểm tiêu chí (DiemDat / 100, không dùng TrongSo)
    const diemTang = this.ChiTietDiem.filter(
      (item) => item.LoaiTieuChi === "TANG_DIEM"
    ).reduce((sum, item) => sum + (item.DiemDat || 0) / 100, 0);

    const diemGiam = this.ChiTietDiem.filter(
      (item) => item.LoaiTieuChi === "GIAM_DIEM"
    ).reduce((sum, item) => sum + (item.DiemDat || 0) / 100, 0);

    this.TongDiemTieuChi = diemTang - diemGiam;

    // Tính điểm nhiệm vụ = MucDoKho × TongDiemTieuChi
    this.DiemNhiemVu = this.MucDoKho * this.TongDiemTieuChi;
  }

  next();
});

// Post-save: Cập nhật tổng điểm KPI
danhGiaNhiemVuThuongQuySchema.post("save", async function (doc) {
  try {
    const DanhGiaKPI = mongoose.model("DanhGiaKPI");
    const danhGiaKPI = await DanhGiaKPI.findById(doc.DanhGiaKPIID);

    if (danhGiaKPI) {
      await danhGiaKPI.tinhTongDiemKPI();
    }
  } catch (error) {
    console.error("Error updating TongDiemKPI:", error);
  }
});

// Post-remove: Cập nhật tổng điểm KPI khi xóa
danhGiaNhiemVuThuongQuySchema.post("remove", async function (doc) {
  try {
    const DanhGiaKPI = mongoose.model("DanhGiaKPI");
    const danhGiaKPI = await DanhGiaKPI.findById(doc.DanhGiaKPIID);

    if (danhGiaKPI) {
      await danhGiaKPI.tinhTongDiemKPI();
    }
  } catch (error) {
    console.error("Error updating TongDiemKPI after remove:", error);
  }
});

// Methods
danhGiaNhiemVuThuongQuySchema.methods.chamDiem = async function (
  chiTietDiem,
  mucDoKho,
  ghiChu
) {
  // Validate điểm (self-contained, no need to query TieuChiDanhGia)
  for (const item of chiTietDiem) {
    if (item.DiemDat < item.GiaTriMin || item.DiemDat > item.GiaTriMax) {
      throw new Error(
        `Điểm "${item.TenTieuChi}" phải từ ${item.GiaTriMin} đến ${item.GiaTriMax}`
      );
    }
  }

  this.ChiTietDiem = chiTietDiem;

  if (mucDoKho !== undefined) {
    if (mucDoKho < 1 || mucDoKho > 10) {
      throw new Error("Mức độ khó phải từ 1-10");
    }
    this.MucDoKho = mucDoKho;
  }

  if (ghiChu !== undefined) {
    this.GhiChu = ghiChu;
  }

  await this.save();
  return this;
};

danhGiaNhiemVuThuongQuySchema.methods.coTheSua = function () {
  // Chỉ sửa được khi DanhGiaKPI chưa duyệt
  return this.populated("DanhGiaKPIID")
    ? this.DanhGiaKPIID.TrangThai === "CHUA_DUYET"
    : true;
};

// Static methods
danhGiaNhiemVuThuongQuySchema.statics.layDanhSachTheoDanhGiaKPI = function (
  danhGiaKPIId
) {
  return (
    this.find({
      DanhGiaKPIID: danhGiaKPIId,
      isDeleted: false,
    })
      .populate("NhiemVuThuongQuyID", "TenNhiemVu MoTa MucDoKho")
      // No longer populate TieuChiID - ChiTietDiem is self-contained
      .sort({ createdAt: 1 })
  );
};

danhGiaNhiemVuThuongQuySchema.statics.tinhSoCongViecLienQuan = async function (
  nhanVienNhiemVuId,
  tuNgay,
  denNgay
) {
  const CongViec = mongoose.model("CongViec");

  const count = await CongViec.countDocuments({
    NhanVienNhiemVuID: nhanVienNhiemVuId,
    createdAt: { $gte: tuNgay, $lte: denNgay },
    isDeleted: false,
  });

  return count;
};

const DanhGiaNhiemVuThuongQuy = mongoose.model(
  "DanhGiaNhiemVuThuongQuy",
  danhGiaNhiemVuThuongQuySchema
);

module.exports = DanhGiaNhiemVuThuongQuy;
