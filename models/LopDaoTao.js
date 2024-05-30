const mongosee = require("mongoose");
const HinhThucCapNhat = require("./HinhThucCapNhat");
const Schema = mongosee.Schema;
const lopdaotaoSchema = Schema(
  {
   
    HinhThucCapNhatID: { type: Schema.ObjectId, required: true, ref: "HinhThucCapNhat" },
    
    Ten: { type: String, required: true,},
    QuyetDinh: { type: String, require: true, unique: true },
    
    NoiDaoTao: { type: String, default: "" },
    NguonKinhPhi: { type: String, default: "" },
    HinhThucDaoTao: { type: String, default: "" },
    SoLuong: { type: Number, default: 1 },
    Images: { type: [String], default: [] },
    NgayBatDau: { type: Date, require: false },
    NgayKetThuc: { type: Date, require: false },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);
const LopDaoTao = mongosee.model("LopDaoTao", lopdaotaoSchema);
module.exports = LopDaoTao;
