const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const loaiChuyenMonSchema = Schema(
  {
    LoaiChuyenMon: {
      type: String,
      enum: ["BAC_SI", "DUOC_SI", "DIEU_DUONG", "KTV", "KHAC"],
      required: true,
    },
    TrinhDo: { type: String, default: "" },
    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

const LoaiChuyenMon = mongoose.model("LoaiChuyenMon", loaiChuyenMonSchema);
module.exports = LoaiChuyenMon;
