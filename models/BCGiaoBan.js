const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const bcgiaobanSchema = Schema(
  {
    Ngay: { type: Date, require: true },
    // KhoaID: { type: Schema.ObjectId, required: true, ref: "Khoa" },
    
    TrucLanhDao: { type: String, default: "" },
    TTHeNoi: { type: String, default: "" },
    TTHeNgoai: { type: String, default: "" },
    TrangThai: { type: Boolean, default: false},
    DienNuoc: { type: String, default: "" },
    LaiXe: { type: String, default: "" },
  },
  { timestamps: true }
);
const BCGiaoBan = mongosee.model("BCGiaoBan", bcgiaobanSchema);
module.exports = BCGiaoBan;
