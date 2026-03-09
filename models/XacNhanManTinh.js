const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const xacNhanManTinhSchema = new Schema(
  {
    // Key liên kết HIS (PostgreSQL)
    dangkykhamid: { type: Number, required: true, unique: true, index: true },
    patientid_old: { type: Number, required: true, index: true },
    vienphiid: { type: Number },
    nguoigioithieuid: { type: Number, index: true },

    // Ghi chú lý do đánh dấu mãn tính
    ghiChu: { type: String, default: "" },

    // Snapshot context lúc đánh dấu (audit, không phụ thuộc HIS)
    snapshot: {
      patientname: String,
      birthday: String,
      chandoanravien: String,
      chandoanravien_code: String,
      ten_ngt: String,
      dangkykhamdate: String,
    },

    // Người thao tác
    nguoiTao: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const XacNhanManTinh = mongoose.model("XacNhanManTinh", xacNhanManTinhSchema);
module.exports = XacNhanManTinh;
