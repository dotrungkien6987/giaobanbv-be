const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const doanvaoSchema = Schema(
  {
    NgayKyVanBan: { type: Date, required: true },

    SoVanBanChoPhep: { type: String, default: "" },
    MucDichXuatCanh: { type: String, default: "" },
    ThoiGianVaoLamViec: { type: Date },
    BaoCao: { type: String },

    GhiChu: { type: String, default: "" },
    // Embedded BCChiTietBenhNhan
    ThanhVien: [
      {
        Ten: { type: String, required: true },
        NgaySinh: { type: Date, required: true },
        GioiTinh: {
          type: Number,
          enum: [0, 1],
        },
        ChucVu: { type: String, default: "" },
        DonViCongTac: { type: String, default: "" },
        QuocTich: { type: String, default: "" },
        DonViGioiThieu: { type: String, default: "" },
      },
      { _id: false },
    ],
    // Embedded ChiTietChiSo
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

// Thêm index cho tìm kiếm
doanvaoSchema.index({ NgayKyVanBan: -1 });

const DoanVao = mongosee.model("DoanVao", doanvaoSchema);
module.exports = DoanVao;
