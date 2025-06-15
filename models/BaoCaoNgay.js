const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const baocaongaySchema = Schema(
  {
    Ngay: { type: Date, require: true },
    KhoaID: { type: Schema.ObjectId, required: true, ref: "Khoa" },
    UserID: { type: Schema.ObjectId, required: true, ref: "User" },
    BSTruc: { type: String, default: "" },
    DDTruc: { type: String, default: "" },
    GhiChu: { type: String, default: "" },
    CBThemGio: { type: String, default: "" },
    IsForKhoa: { type: Boolean, default: false },
    // Embedded BCChiTietBenhNhan
    ChiTietBenhNhan: [
      {
        TenBenhNhan: { type: String, required: true },
        LoaiBN: { type: Number, required: true },
        Stt: { type: Number, required: true },
        GioiTinh: { type: String, default: "" },
        Tuoi: { type: String, default: "" },
        DiaChi: { type: String, default: "" },
        VaoVien: { type: String, default: "" },
        LyDoVV: { type: String, default: "" },
        DienBien: { type: String, default: "" },
        ChanDoan: { type: String, default: "" },
        XuTri: { type: String, default: "" },
        HienTai: { type: String, default: "" },
        Images: { type: [String], default: [] },
        GhiChu: { type: String, default: "" },
      },
      { _id: false },
    ],
    // Embedded ChiTietChiSo

    ChiTietChiSo: [
      {
        ChiSoCode: { type: String, required: true },
        SoLuong: { type: Number, required: true },
      },
      { _id: false },
    ],
  },
  { timestamps: true }
);
const BaoCaoNgay = mongosee.model("BaoCaoNgay", baocaongaySchema);
module.exports = BaoCaoNgay;
