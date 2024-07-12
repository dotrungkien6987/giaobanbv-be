const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const nhanvienSchema = Schema(
  {
    
    KhoaID: { type: Schema.ObjectId, required: false, ref: "Khoa" },
    TinChiBanDau:{type:Number, required:false, default:0},
    MaNhanVien: { type: String, require: true, unique: true },
    Ten: { type: String, required: true,},
    NgaySinh: { type: Date, require: true },
    Loai:  {
      type: Number,
      enum: [0,1,2],
    },
    TrinhDoChuyenMon: { type: String, default: "" },
    ChucDanh: { type: String, default: "" },
    ChucVu: { type: String, default: "" },
    
    CMND: { type: String, default: "" },
    SoDienThoai: { type: String, default: "" },
    Email: { type: String, default: "" },
    GioiTinh: {
      type: Number,
      enum: [0,1],
    },
    Images: { type: [String], default: [] },
    isDeleted: { type: Boolean, default: false, select: false },
   
  },
  { timestamps: true }
);
const NhanVien = mongosee.model("NhanVien", nhanvienSchema);
module.exports = NhanVien;
