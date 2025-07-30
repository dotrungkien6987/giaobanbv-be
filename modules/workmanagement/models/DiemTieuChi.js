const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const diemTieuChiSchema = Schema(
  {
    DanhGiaNhiemVuID: {
      type: Schema.ObjectId,
      required: true,
      ref: "DanhGiaNhiemVuThuongQuy",
    },
    TieuChiID: {
      type: Schema.ObjectId,
      required: true,
      ref: "TieuChiTheoViTri",
    },
    Diem: {
      type: Number,
      required: true,
      min: 0,
      max: 10,
    },
    TrongSo: {
      type: Number,
      min: 0.1,
      max: 1,
      default: 1,
    },
    GhiChu: {
      type: String,
      maxlength: 1000,
    },
    NgayDanhGia: {
      type: Date,
      default: Date.now,
    },
    NguoiDanhGiaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
    collection: "diemtieuchi",
  }
);

// Indexes
diemTieuChiSchema.index(
  { DanhGiaNhiemVuID: 1, TieuChiID: 1 },
  { unique: true }
);
diemTieuChiSchema.index({ DanhGiaNhiemVuID: 1 });
diemTieuChiSchema.index({ TieuChiID: 1 });
diemTieuChiSchema.index({ NgayDanhGia: -1 });

// Virtual for weighted score
diemTieuChiSchema.virtual("DiemCoTrongSo").get(function () {
  return this.Diem * this.TrongSo;
});

// Methods
diemTieuChiSchema.methods.coTheCapNhat = function (nguoiDungId) {
  // Chỉ người tạo hoặc admin mới có thể cập nhật
  return this.NguoiDanhGiaID.toString() === nguoiDungId.toString();
};

// Static methods
diemTieuChiSchema.statics.timTheoDanhGiaNhiemVu = function (danhGiaNhiemVuId) {
  return this.find({ DanhGiaNhiemVuID: danhGiaNhiemVuId })
    .populate("TieuChiID", "TenTieuChi LoaiTieuChi TrongSoMacDinh")
    .populate("NguoiDanhGiaID", "HoTen MaNhanVien")
    .sort({ NgayDanhGia: -1 });
};

diemTieuChiSchema.statics.tinhTongDiemTheoLoai = async function (
  danhGiaNhiemVuId,
  loaiTieuChi
) {
  const result = await this.aggregate([
    { $match: { DanhGiaNhiemVuID: mongoose.Types.ObjectId(danhGiaNhiemVuId) } },
    {
      $lookup: {
        from: "tieuchitheovitrI",
        localField: "TieuChiID",
        foreignField: "_id",
        as: "tieuChi",
      },
    },
    { $unwind: "$tieuChi" },
    { $match: { "tieuChi.LoaiTieuChi": loaiTieuChi } },
    {
      $group: {
        _id: null,
        tongDiem: { $sum: { $multiply: ["$Diem", "$TrongSo"] } },
        tongTrongSo: { $sum: "$TrongSo" },
      },
    },
  ]);

  return result.length > 0 ? result[0] : { tongDiem: 0, tongTrongSo: 0 };
};

diemTieuChiSchema.statics.thongKeTheoTieuChi = function (
  tieuChiId,
  tuNgay,
  denNgay
) {
  const match = { TieuChiID: tieuChiId };
  if (tuNgay || denNgay) {
    match.NgayDanhGia = {};
    if (tuNgay) match.NgayDanhGia.$gte = tuNgay;
    if (denNgay) match.NgayDanhGia.$lte = denNgay;
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        diemTrungBinh: { $avg: "$Diem" },
        diemCaoNhat: { $max: "$Diem" },
        diemThapNhat: { $min: "$Diem" },
        soLanDanhGia: { $sum: 1 },
      },
    },
  ]);
};

// Pre-save middleware
diemTieuChiSchema.pre("save", async function (next) {
  // Lấy trọng số mặc định từ tiêu chí nếu chưa có
  if (!this.TrongSo && this.TieuChiID) {
    const TieuChiTheoViTri = mongoose.model("TieuChiTheoViTri");
    const tieuChi = await TieuChiTheoViTri.findById(this.TieuChiID);
    if (tieuChi && tieuChi.TrongSoMacDinh) {
      this.TrongSo = tieuChi.TrongSoMacDinh;
    }
  }

  next();
});

// Post-save middleware
diemTieuChiSchema.post("save", async function () {
  // Cập nhật điểm cuối của đánh giá nhiệm vụ
  const DanhGiaNhiemVuThuongQuy = mongoose.model("DanhGiaNhiemVuThuongQuy");
  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.findById(
    this.DanhGlaNhiemVuID
  );
  if (danhGiaNhiemVu) {
    await danhGiaNhiemVu.tinhDiemCuoi();
  }
});

const DiemTieuChi = mongoose.model("DiemTieuChi", diemTieuChiSchema);
module.exports = DiemTieuChi;
