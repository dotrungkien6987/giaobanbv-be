const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lichTrucSchema = Schema(
  {
    Ngay: {
      type: Date,
      required: [true, "Ngày trực là bắt buộc"],
    },
    KhoaID: {
      type: Schema.Types.ObjectId,
      ref: "Khoa",
      required: [true, "Khoa là bắt buộc"],
    },
    DieuDuong: {
      type: String,
      default: "",
    },
    BacSi: {
      type: String,
      default: "",
    },
    GhiChu: {
      type: String,
      default: "",
    },
    UserID: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Index để tối ưu truy vấn theo ngày và khoa
lichTrucSchema.index({ Ngay: 1, KhoaID: 1 }, { unique: true });

const LichTruc = mongoose.model("LichTruc", lichTrucSchema);
module.exports = LichTruc;