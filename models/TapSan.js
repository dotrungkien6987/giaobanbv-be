const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const tapsanSchema = Schema(
  {
    
    Loai: { type: String, enum: ["YHTH", "TTT"], required: true },
    NamXuatBan: { type: String, default: "2025",require: true },
    SoXuatBan: { type: Number, required: true, default: 1 },
    
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

const TapSan = mongosee.model("TapSan", tapsanSchema);
module.exports = TapSan;
