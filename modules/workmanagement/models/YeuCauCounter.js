const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * YeuCauCounter - Auto-generate MaYeuCau theo format YC{YYYY}{NNNNNN}
 * VD: YC2025000001, YC2025000002, ...
 */
const yeuCauCounterSchema = new Schema(
  {
    // Năm
    Nam: {
      type: Number,
      required: true,
      unique: true,
    },

    // Số thứ tự hiện tại
    SoThuTu: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    collection: "yeucaucounter",
  }
);

// Index đã có unique trên Nam

/**
 * Tạo mã yêu cầu mới
 * Format: YC2025000001, YC2025000002, ...
 * @returns {Promise<string>} Mã yêu cầu mới
 */
yeuCauCounterSchema.statics.generateMaYeuCau = async function () {
  const nam = new Date().getFullYear();

  // Atomic increment
  const counter = await this.findOneAndUpdate(
    { Nam: nam },
    { $inc: { SoThuTu: 1 } },
    { upsert: true, new: true }
  );

  // Pad to 6 digits
  const soThuTu = String(counter.SoThuTu).padStart(6, "0");

  return `YC${nam}${soThuTu}`;
};

/**
 * Lấy số thứ tự hiện tại của năm
 * @param {number} nam - Năm cần lấy
 * @returns {Promise<number>} Số thứ tự hiện tại
 */
yeuCauCounterSchema.statics.getSoThuTuHienTai = async function (nam) {
  const counter = await this.findOne({ Nam: nam });
  return counter ? counter.SoThuTu : 0;
};

const YeuCauCounter = mongoose.model("YeuCauCounter", yeuCauCounterSchema);
module.exports = YeuCauCounter;
