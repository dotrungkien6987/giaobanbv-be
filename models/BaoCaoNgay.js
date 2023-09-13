const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const baocaongaySchema = Schema(
  {
    Ngay: { type: Date, require: true },
    KhoaID: { type: Schema.ObjectId, required: true, ref: "Khoa" },
    BSTruc: { type: String, default: "" },
    DDTruc: { type: String, default: "" },
    GhiChu: { type: String, default: "" },
    CBThemGio: { type: String, default: "" },
    UserID: { type: Schema.ObjectId, required: true, ref: "User" },
    // Embedded BCChiTietBenhNhan
    ChiTietBenhNhan: [
      {
        TenBenhNhan: { type: String, required: true },
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
        LoaiBN: { type: Number, required: true },
        Stt: { type: Number, required: true },
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
