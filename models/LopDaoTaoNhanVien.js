const mongosee = require("mongoose");

const Schema = mongosee.Schema;
const lopdaotaonhanvienSchema = Schema(
  {
   
    LopDaoTaoID: { type: Schema.ObjectId, required: true,ref: "LopDaoTao" },
    NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
    
    VaiTro: { type: String, required: false,},
    SoTinChiTichLuy: { type: Number, require: true, default: 0 },
    DiemDanh:{type:[Boolean],default:[]},
    Images: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);
const LopDaoTaoNhanVien = mongosee.model("LopDaoTaoNhanVien", lopdaotaonhanvienSchema);
module.exports = LopDaoTaoNhanVien;
