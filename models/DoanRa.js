const mongosee = require("mongoose");
const Schema = mongosee.Schema;

// Subdocument cho thành viên Đoàn Ra
const ThanhVienSchema = new Schema(
  {
    NhanVienId: { type: Schema.ObjectId, ref: "NhanVien", required: true },
    SoHoChieu: { type: String, default: "" },
  },
  { _id: false }
);

const doanraSchema = Schema(
  {
    NgayKyVanBan: { type: Date, required: true },
    ThanhVien: { type: [ThanhVienSchema], required: true },
    SoVanBanChoPhep: { type: String, default: "" },
    MucDichXuatCanh: { type: String, default: "" },
    // Thời gian xuất cảnh: lưu phẳng 2 trường
    TuNgay: { type: Date },
    DenNgay: { type: Date },
    NguonKinhPhi: { type: String, default: "" },
    QuocGiaDen: { type: String },
    BaoCao: { type: String },
    TaiLieuKemTheo: { type: [String], default: [] },
    GhiChu: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

// Thêm index cho tìm kiếm
doanraSchema.index({ NgayKyVanBan: -1 });
doanraSchema.index({ TuNgay: -1 });
doanraSchema.index({ "ThanhVien.NhanVienId": 1 });

const DoanRa = mongosee.model("DoanRa", doanraSchema);
module.exports = DoanRa;
