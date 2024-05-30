const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const nhomhinhthuccapnhatSchema = Schema(
  {
    Ten: { type:String, required: true },
    Loai: { type: String, require: false, default: "" },
    Ma: { type: String, require: true, default: "" },
   
  },
 
);
const NhomHinhThucCapNhat = mongosee.model("NhomHinhThucCapNhat", nhomhinhthuccapnhatSchema);
module.exports = NhomHinhThucCapNhat;
