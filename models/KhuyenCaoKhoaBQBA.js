const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const khuyenCaoKhoaBQBASchema = Schema(
  {
    KhoaID: {
      type: Number,
      required: true,
    },
    TenKhoa: {
      type: String,
      required: true,
    },
    LoaiKhoa: {
      type: String,
      required: true,
      enum: ["noitru", "ngoaitru"],
    },
    Nam: {
      type: Number,
      required: true,
      default: () => new Date().getFullYear(),
    },
    KhuyenCaoBinhQuanHSBA: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    KhuyenCaoTyLeThuocVatTu: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    GhiChu: {
      type: String,
      required: false,
      default: "",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Composite unique index: Mỗi khoa chỉ có 1 khuyến cáo cho 1 năm
khuyenCaoKhoaBQBASchema.index(
  { KhoaID: 1, LoaiKhoa: 1, Nam: 1 },
  {
    unique: true,
    partialFilterExpression: { isDeleted: false },
  }
);

// Index để query nhanh theo năm
khuyenCaoKhoaBQBASchema.index({ Nam: 1 });

// Virtual để format số tiền
khuyenCaoKhoaBQBASchema
  .virtual("KhuyenCaoBinhQuanHSBA_Formatted")
  .get(function () {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(this.KhuyenCaoBinhQuanHSBA);
  });

// Virtual để format tỷ lệ
khuyenCaoKhoaBQBASchema
  .virtual("KhuyenCaoTyLeThuocVatTu_Formatted")
  .get(function () {
    return `${this.KhuyenCaoTyLeThuocVatTu}%`;
  });

const KhuyenCaoKhoaBQBA = mongoose.model(
  "KhuyenCaoKhoaBQBA",
  khuyenCaoKhoaBQBASchema
);

module.exports = KhuyenCaoKhoaBQBA;
