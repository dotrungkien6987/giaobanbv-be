const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const maBenhManTinhSchema = new Schema(
  {
    maBenh: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    tenBenh: { type: String, required: true, trim: true },
    nhomBenh: { type: String, trim: true, default: "" },
    ghiChu: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    nguoiTao: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const MaBenhManTinh = mongoose.model("MaBenhManTinh", maBenhManTinhSchema);
module.exports = MaBenhManTinh;
