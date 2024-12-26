const mongosee = require("mongoose");
const HinhThucCapNhat = require("./HinhThucCapNhat");
const Schema = mongosee.Schema;
const lopdaotaoSchema = Schema(
  {
   
    // HinhThucCapNhatID: { type: Schema.ObjectId, required: true, ref: "HinhThucCapNhat" },
    
    MaHinhThucCapNhat: { type: String, required: true,},
    Ten: { type: String, required: true,},
    TrangThai: { type: Boolean, required: true, default: false },
    Dat: { type: Boolean, required: false, default: null },
    XepLoai: { type: String, required: false, default: "" },
   
    QuyetDinh: { type: String, require: true, default: "" },
    NoiDaoTao: { type: String, default: "" },
    NguonKinhPhi: { type: String, default: "" },
    HinhThucDaoTao: { type: String, default: "" },
    TenTapChi: { type: String, default: "" },
    GhiChu: { type: String, default: "" },
    SoLuong: { type: Number, default: 1 },
    SoThanhVien: { type: Number, default: 0 },
    Images: { type: [String], default: [] },
    NgayBatDau: { type: Date, require: false },
    NgayKetThuc: { type: Date, require: false },
    isDeleted: { type: Boolean, default: false, select: false },
    UserIDCreated: {type: Schema.ObjectId,required:false,ref:"User"},
    HoiDongID: {type: Schema.ObjectId,required:false,ref:"HoiDong"},
    KhoaID: {type: Schema.ObjectId,required:false,ref:"Khoa"},
  },
  { timestamps: true }
);
const LopDaoTao = mongosee.model("LopDaoTao", lopdaotaoSchema);
module.exports = LopDaoTao;
