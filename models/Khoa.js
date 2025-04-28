const mongosee = require("mongoose");
const Schema = mongosee.Schema;
const khoaSchema = Schema(
  {
    TenKhoa: { type: String, required: true },
    STT: { type: Number, required: true },
    LoaiKhoa: {
      type: String,
      enum: ["kcc", "kkb", "noi", "ngoai", "cskh", "gmhs", "cdha", "tdcn", "clc", "xn", "hhtm", "pkyc", "khac"],
      required: true
    },
    MaKhoa: { type: String, required: true, unique: true },
    HisDepartmentID: { type: Number, required: false },
    HisDepartmentGroupID: { type: Number, required: false },
    HisDepartmentType: { type: Number, required: false },
  },
  { timestamps: true }
);

// Thêm index cho các trường thường được tìm kiếm
khoaSchema.index({ TenKhoa: 1 });
khoaSchema.index({ LoaiKhoa: 1 });
khoaSchema.index({ MaKhoa: 1 }, { unique: true });

const Khoa = mongosee.model("Khoa", khoaSchema);
module.exports = Khoa;
