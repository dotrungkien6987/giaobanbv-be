const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const doanvaoSchema = Schema(
  {
    NgayKyVanBan: { type: Date, required: true },

    SoVanBanChoPhep: { type: String, default: "" },
    MucDichXuatCanh: { type: String, default: "" },
    // DonViGioiThieu thuộc về Đoàn vào (root level)
    DonViGioiThieu: { type: String, default: "" },
    // Thời gian vào làm việc: lưu phẳng 2 trường
    TuNgay: { type: Date },
    DenNgay: { type: Date },
    // Đã nộp báo cáo? (thuộc về Đoàn vào, áp dụng cho toàn bộ thành viên)
    CoBaoCao: { type: Boolean, default: false },

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
        SoHoChieu: { type: String, default: "" },
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
doanvaoSchema.index({ TuNgay: -1 });
doanvaoSchema.index({ DonViGioiThieu: 1 });

const DoanVao = mongosee.model("DoanVao", doanvaoSchema);
module.exports = DoanVao;
