const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const doanraSchema = Schema(
  {
    NgayKyVanBan: { type: Date, required: true },
    ThanhVien: [{ type: Schema.ObjectId, ref: "NhanVien", required: true }],
    SoVanBanChoPhep: { type: String, default: "" },
    MucDichXuatCanh: { type: String, default: "" },
    ThoiGianXuatCanh: { type: Date },
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
doanraSchema.index({ ThanhVien: 1 });

const DoanRa = mongosee.model("DoanRa", doanraSchema);
module.exports = DoanRa;
