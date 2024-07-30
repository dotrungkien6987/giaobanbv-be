const mongosee = require("mongoose");
const HinhThucCapNhat = require("./HinhThucCapNhat");
const Schema = mongosee.Schema;
const lopdaotaonhanvienSchema = Schema(
  {
   
    LopDaoTaoID: { type: Schema.ObjectId, required: true,  },
    NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
    
    VaiTro: { type: String, required: false,},
    SoTinChiTichLuy: { type: Number, require: true, default: 0 },
    DiemDanh:{type:[Boolean],default:[]}
  },
  { timestamps: true }
);
const LopDaoTaoNhanVien = mongosee.model("LopDaoTaoNhanVien", lopdaotaonhanvienSchema);
module.exports = LopDaoTaoNhanVien;
