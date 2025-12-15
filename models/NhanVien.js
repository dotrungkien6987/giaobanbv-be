const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const nhanvienSchema = Schema(
  {
    KhoaID: { type: Schema.ObjectId, required: false, ref: "Khoa" },
    LoaiChuyenMonID: {
      type: Schema.ObjectId,
      required: false,
      ref: "LoaiChuyenMon",
    },
    // Cờ đánh dấu nhân viên đã nghỉ (không còn tính vào số liệu thống kê hoạt động)
    DaNghi: { type: Boolean, default: false },
    // Cờ đánh dấu là Đảng viên
    isDangVien: { type: Boolean, default: false },
    LyDoNghi: { type: String, default: "" },
    TinChiBanDau: { type: Number, required: false, default: 0 },
    MaNhanVien: { type: String, require: true, unique: true },

    Ten: { type: String, required: true },
    NgaySinh: { type: Date, require: true },
    Loai: {
      type: Number,
      enum: [0, 1, 2],
    },
    TrinhDoChuyenMon: { type: String, default: "" },
    DanToc: { type: String, default: "" },
    SoCCHN: { type: String, default: "" },
    NgayCapCCHN: { type: Date, require: false },
    PhamViHanhNghe: { type: String, default: "" },
    PhamViHanhNgheBoSung: { type: String, default: "" },
    ChucDanh: { type: String, default: "" },
    ChucVu: { type: String, default: "" },

    CMND: { type: String, default: "" },
    SoHoChieu: { type: String, default: "" },
    SoDienThoai: { type: String, default: "" },
    Email: { type: String, default: "" },
    GioiTinh: {
      type: Number,
      enum: [0, 1],
    },
    // Ảnh đại diện (1 ảnh) - lưu đường dẫn tương đối dưới thư mục uploads (vd: avatars/<nhanVienId>/<fileName>)
    Avatar: { type: String, default: "" },
    Images: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

// Indexes hỗ trợ các truy vấn thống kê / lọc thường xuyên
nhanvienSchema.index({ LoaiChuyenMonID: 1 });
nhanvienSchema.index({ KhoaID: 1, DaNghi: 1 });
nhanvienSchema.index({ DaNghi: 1, isDeleted: 1 });
nhanvienSchema.index({ SoHoChieu: 1 }, { sparse: true });

// Helper truy vấn nhân viên đang làm việc (active)
nhanvienSchema.statics.findDangLamViec = function (filter = {}) {
  return this.find({ isDeleted: false, DaNghi: false, ...filter });
};
const NhanVien = mongosee.model("NhanVien", nhanvienSchema);
module.exports = NhanVien;
