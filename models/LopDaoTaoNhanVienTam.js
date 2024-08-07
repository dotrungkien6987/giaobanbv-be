const mongosee = require("mongoose");
const HinhThucCapNhat = require("./HinhThucCapNhat");
const Schema = mongosee.Schema;
const lopdaotaonhanvientamSchema = Schema(
  {
   
    LopDaoTaoID: { type: Schema.ObjectId, required: true,ref: "LopDaoTao" },
    NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
    UserID: { type: Schema.ObjectId, required: true, ref: "User" },
    VaiTro: { type: String, required: false,},
    
  },
  { timestamps: true }
);
const LopDaoTaoNhanVien = mongosee.model("LopDaoTaoNhanVien", lopdaotaonhanvientamSchema);
module.exports = LopDaoTaoNhanVien;
