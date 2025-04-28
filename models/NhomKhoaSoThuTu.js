const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nhomKhoaSoThuTuSchema = Schema(
  {
    TenNhom: { type: String, required: true },
    GhiChu: { type: String, required: false },
    DanhSachKhoa: [
      {
        KhoaID: { type: Schema.Types.ObjectId, ref: "Khoa", required: true }
      }
    ]
  },
  { timestamps: true }
);

// Thêm index cho các trường thường được tìm kiếm
nhomKhoaSoThuTuSchema.index({ TenNhom: 1 });

const NhomKhoaSoThuTu = mongoose.model("NhomKhoaSoThuTu", nhomKhoaSoThuTuSchema);
module.exports = NhomKhoaSoThuTu;