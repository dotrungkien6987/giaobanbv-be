

const mongosee = require("mongoose");

const Schema = mongosee.Schema;
const lopdaotaonhanviendt06Schema = Schema(
  {
   
    LopDaoTaoID: { type: Schema.ObjectId, required: true,ref: "LopDaoTao" },
    NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
   
    SoTinChiTichLuy: { type: Number, require: true, default: 0 },
    
    Images: { type: [String], default: [] },
    TuNgay: { type: Date, require: false },
    DenNgay: { type: Date, require: false },
    GhiChu: { type: String, required: false,},

    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);
const LopDaoTaoNhanVienDT06 = mongosee.model("LopDaoTaoNhanVienDT06", lopdaotaonhanviendt06Schema);
module.exports = LopDaoTaoNhanVienDT06;
