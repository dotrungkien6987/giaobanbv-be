const mongosee = require("mongoose");
const HinhThucCapNhat = require("./HinhThucCapNhat");
const Schema = mongosee.Schema;
const lopdaotaonhanvientamSchema = Schema(
  {
   
    LopDaoTaoID: { type: Schema.ObjectId, required: true,ref: "LopDaoTao" },
    NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
    UserID: { type: Schema.ObjectId, required: true, ref: "User" },
    VaiTro: { type: String, required: false,},
    UserName : { type: String, required: false,},
    
  },
  { timestamps: true }
);
const LopDaoTaoNhanVienTam = mongosee.model("LopDaoTaoNhanVienTam", lopdaotaonhanvientamSchema);
module.exports = LopDaoTaoNhanVienTam;
