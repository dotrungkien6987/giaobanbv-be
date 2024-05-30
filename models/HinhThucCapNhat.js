const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const hinhthuccapnhatSchema = Schema(
  {
    MaNhomHinhThucCapNhat: { type:String, required: true },
    Ten: { type: String, require: false, default: "" },
    Ma: { type: String, require: true, default: "" },
   VaiTroQuyDoi:[
    {
      VaiTro: { type: String, required: true },
      DonVi: { type: String, required: true },
      QuyDoi: { type: Number, required: true },
  },
  {_id:false}
   ]
  },
 
);
const HinhThucCapNhat = mongosee.model("HinhThucCapNhat", hinhthuccapnhatSchema);
module.exports = HinhThucCapNhat;
