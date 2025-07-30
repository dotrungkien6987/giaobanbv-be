const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const danhGiaNhiemVuThuongQuySchema = Schema(
  {
    DanhGiaKPIID: {
      type: Schema.ObjectId,
      required: true,
      ref: "DanhGiaKPI",
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhiemVuThuongQuy",
    },
    DiemDoKho: {
      type: Number,
      min: 1,
      max: 10,
    },
    DiemCuoi: {
      type: Number,
      min: 0,
      default: 0,
    },
    GhiChuNguoiDanhGia: {
      type: String,
      maxlength: 2000,
    },
    SoCongViec: {
      type: Number,
      min: 0,
      default: 0,
    },
    SoTicket: {
      type: Number,
      min: 0,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "danhgianhiemvuthuongquy",
  }
);

// Indexes
danhGiaNhiemVuThuongQuySchema.index(
  { DanhGiaKPIID: 1, NhiemVuThuongQuyID: 1 },
  { unique: true }
);
danhGiaNhiemVuThuongQuySchema.index({ DanhGiaKPIID: 1 });
danhGiaNhiemVuThuongQuySchema.index({ NhiemVuThuongQuyID: 1 });

// Virtual for criteria scores
danhGiaNhiemVuThuongQuySchema.virtual("DiemTieuChi", {
  ref: "DiemTieuChi",
  localField: "_id",
  foreignField: "DanhGiaNhiemVuID",
});

// Methods
danhGiaNhiemVuThuongQuySchema.methods.tinhDiemCuoi = async function () {
  const DiemTieuChi = mongoose.model("DiemTieuChi");
  const diemTieuChi = await DiemTieuChi.find({
    DanhGiaNhiemVuID: this._id,
  }).populate("TieuChiID");

  let tongDiemTieuChi = 0;
  let tongTrongSo = 0;

  for (const diem of diemTieuChi) {
    const diemCoTrongSo = diem.Diem * diem.TrongSo;
    if (diem.TieuChiID.LoaiTieuChi === "TANG_DIEM") {
      tongDiemTieuChi += diemCoTrongSo;
    } else {
      tongDiemTieuChi -= diemCoTrongSo;
    }
    tongTrongSo += diem.TrongSo;
  }

  // Tính điểm trung bình theo trọng số
  const diemTrungBinhTieuChi =
    tongTrongSo > 0 ? tongDiemTieuChi / tongTrongSo : 0;

  // Điểm cuối = độ khó × điểm trung bình tiêu chí
  this.DiemCuoi = (this.DiemDoKho || 5) * Math.max(0, diemTrungBinhTieuChi);

  return this.save();
};

danhGiaNhiemVuThuongQuySchema.methods.capNhatSoLuongHoatDong =
  async function () {
    const CongViecDuocGiao = mongoose.model("CongViecDuocGiao");
    const YeuCauHoTro = mongoose.model("YeuCauHoTro");
    const DanhGiaKPI = mongoose.model("DanhGiaKPI");

    // Lấy thông tin chu kỳ đánh giá
    const danhGiaKPI = await DanhGiaKPI.findById(this.DanhGiaKPIID).populate(
      "ChuKyID"
    );

    if (danhGiaKPI && danhGiaKPI.ChuKyID) {
      const { NgayBatDau, NgayKetThuc } = danhGiaKPI.ChuKyID;

      // Đếm số công việc và ticket trong chu kỳ
      this.SoCongViec = await CongViecDuocGiao.countDocuments({
        NhiemVuThuongQuyID: this.NhiemVuThuongQuyID,
        createdAt: { $gte: NgayBatDau, $lte: NgayKetThuc },
      });

      this.SoTicket = await YeuCauHoTro.countDocuments({
        NhiemVuThuongQuyID: this.NhiemVuThuongQuyID,
        createdAt: { $gte: NgayBatDau, $lte: NgayKetThuc },
      });
    }

    return this.save();
  };

// Static methods
danhGiaNhiemVuThuongQuySchema.statics.timTheoDanhGiaKPI = function (
  danhGiaKPIId
) {
  return this.find({ DanhGiaKPIID: danhGiaKPIId })
    .populate("NhiemVuThuongQuyID", "TenNhiemVu MucDoKho")
    .sort({ DiemCuoi: -1 });
};

danhGiaNhiemVuThuongQuySchema.statics.timTheoNhiemVu = function (nhiemVuId) {
  return this.find({ NhiemVuThuongQuyID: nhiemVuId })
    .populate({
      path: "DanhGiaKPIID",
      populate: {
        path: "NhanVienID ChuKyID",
        select: "HoTen MaNhanVien TenChuKy NgayBatDau NgayKetThuc",
      },
    })
    .sort({ createdAt: -1 });
};

// Pre-save middleware
danhGiaNhiemVuThuongQuySchema.pre("save", async function (next) {
  // Lấy độ khó từ nhiệm vụ thường quy nếu chưa có
  if (!this.DiemDoKho && this.NhiemVuThuongQuyID) {
    const NhiemVuThuongQuy = mongoose.model("NhiemVuThuongQuy");
    const nhiemVu = await NhiemVuThuongQuy.findById(this.NhiemVuThuongQuyID);
    if (nhiemVu) {
      this.DiemDoKho = nhiemVu.MucDoKho;
    }
  }

  next();
});

const DanhGiaNhiemVuThuongQuy = mongoose.model(
  "DanhGiaNhiemVuThuongQuy",
  danhGiaNhiemVuThuongQuySchema
);
module.exports = DanhGiaNhiemVuThuongQuy;
