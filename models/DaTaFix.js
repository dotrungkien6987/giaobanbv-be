const mongoose = require("mongoose");
const NhomHinhThucCapNhat = require("./NhomHinhThucCapNhat");
const Schema = mongoose.Schema;
const datafixSchema = Schema({
  NhomHinhThucCapNhat: [
    {
      Ten: { type: String, required: true },
      Loai: { type: String, required: false, default: "" },
      Ma: { type: String, required: true, default: "" },
      
      _id:false
    },
  ],
  VaiTro: [{ VaiTro: { type: String, required: true } ,_id:false} ],
  DonVi: [{ DonVi: { type: String, required: true } ,_id:false} ],
  ChucDanh: [{ ChucDanh: { type: String, required: true } ,_id:false} ],
  ChucVu: [{ ChucVu: { type: String, required: true } ,_id:false} ],
  TrinhDoChuyenMon: [{ TrinhDoChuyenMon: { type: String, required: true } ,_id:false} ],
  NguonKinhPhi: [{ NguonKinhPhi: { type: String, required: true } ,_id:false} ],
  NoiDaoTao: [{ NoiDaoTao: { type: String, required: true } ,_id:false} ],
  HinhThucDaoTao: [{ HinhThucDaoTao: { type: String, required: true } ,_id:false} ],
  DanToc: [{ DanToc: { type: String, required: true } ,_id:false} ],
  PhamViHanhNghe: [{ PhamViHanhNghe: { type: String, required: true } ,_id:false} ],
  
});
const DaTaFix = mongoose.model("DaTaFix", datafixSchema);
module.exports = DaTaFix;
