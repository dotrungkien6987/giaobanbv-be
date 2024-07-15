const mongosee = require("mongoose");
const NhomHinhThucCapNhat = require("./NhomHinhThucCapNhat");
const Schema = mongosee.Schema;
const datafixSchema = Schema(
  {
  
        NhomHinhThucCapNhat:[
          {
            Ten: { type:String, required: true },
            Loai: { type: String, require: false, default: "" },
            Ma: { type: String, require: true, default: "" },
           
          }
         
        ],
        VaiTro:[{type: String,required:true}],
        DonVi:[{type: String,required:true}],
        ChucDanh:[{type: String,required:true}],
        ChucVu:[{type: String,required:true}],
        TrinhDoChuyenMon:[{type: String,required:true}],
        NguonKinhPhi:[{type: String,required:true}],
        NoiDaoTao:[{type: String,required:true}],
        _id:false
   
  }, 
 
);
const DaTaFix = mongosee.model("DaTaFix", datafixSchema);
module.exports = DaTaFix;
