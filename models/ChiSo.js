const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const chisoSchema = Schema(
  {
    TenChiSo: { type:String, required: true },
    ChiSoCode: { type: String, require: false, default: "" },
    Note: { type: String, require: false, default: "" },
   
  },
 
);
const ChiSo = mongosee.model("ChiSo", chisoSchema);
module.exports = ChiSo;