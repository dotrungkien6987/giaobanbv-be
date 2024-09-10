const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const hoidongSchema = Schema(
  {
    
    Ten: { type: String, require: false, default: "" },
    
   ThanhVien:[
    {
      VaiTro: { type: String, required: true },
      NhanVienID: { type: Schema.ObjectId, required: true, ref: "NhanVien" },
     
      _id:false,
  },
  
   ]
  },
 
);
const HoiDong = mongosee.model("HoiDong", hoidongSchema);
module.exports = HoiDong;
