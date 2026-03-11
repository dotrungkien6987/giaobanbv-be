const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * Pipeline công thức mãn tính — gồm nhiều bước (step), mỗi bước chứa 1 cây AND/OR.
 *
 * ─── Cấu trúc pipeline ────────────────────────────────────
 * pipeline: [
 *   {
 *     thuTu: 1,
 *     loaiStep: "loc",       // "loc" = giữ nếu pass | "loaiTru" = bỏ nếu match
 *     tenStep: "Lọc sơ bộ",
 *     dieuKien: { loai: "AND", children: [...] }   // cây AND/OR
 *   },
 *   {
 *     thuTu: 2,
 *     loaiStep: "loaiTru",
 *     tenStep: "Loại mã bệnh chính mới",
 *     dieuKien: { loai: "AND", children: [...] }
 *   },
 *   ...
 * ]
 *
 * ─── Cấu trúc cây điều kiện (trong mỗi step) ─────────────
 * Group node:  { loai: "AND"|"OR", children: [node, ...] }
 * Leaf node:   { loai: "dieu_kien", bienSo: "soLanKham", toanTu: ">=", giaTri: 5 }
 */

const congThucManTinhSchema = new Schema(
  {
    tenCongThuc: { type: String, required: true, trim: true },
    moTa: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    pipeline: { type: [Schema.Types.Mixed], default: undefined },
    // DEPRECATED — giữ cho backward compat, dữ liệu cũ sẽ được auto-wrap thành pipeline
    dieuKien: { type: Schema.Types.Mixed },
    nguoiTao: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

const CongThucManTinh = mongoose.model(
  "CongThucManTinh",
  congThucManTinhSchema,
);
module.exports = CongThucManTinh;
