const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const tapsanSchema = Schema(
  {
    Loai: { type: String, enum: ["YHTH", "TTT"], required: true },
    NamXuatBan: { type: String, default: "2025", required: true },
    SoXuatBan: { type: Number, required: true, default: 1 },
    GhiChu: { type: String, default: "" },
    TrangThai: {
      type: String,
      enum: ["chua-hoan-thanh", "da-hoan-thanh"],
      default: "chua-hoan-thanh",
      required: true,
    },

    isDeleted: { type: Boolean, default: false, select: false },
  },
  { timestamps: true }
);

const TapSan = mongoose.model("TapSan", tapsanSchema);
module.exports = TapSan;
