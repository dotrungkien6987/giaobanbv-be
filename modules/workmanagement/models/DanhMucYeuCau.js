const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * DanhMucYeuCau - Danh mục loại yêu cầu theo khoa
 * Mỗi khoa tự quản lý danh mục loại yêu cầu mà khoa có thể tiếp nhận
 */
const danhMucYeuCauSchema = new Schema(
  {
    // Khoa sở hữu danh mục này
    KhoaID: {
      type: Schema.ObjectId,
      ref: "Khoa",
      required: [true, "Khoa là bắt buộc"],
      index: true,
    },

    // Tên loại yêu cầu
    TenLoaiYeuCau: {
      type: String,
      required: [true, "Tên loại yêu cầu là bắt buộc"],
      trim: true,
      maxlength: [255, "Tên loại yêu cầu không được vượt quá 255 ký tự"],
    },

    // Mô tả chi tiết (tùy chọn)
    MoTa: {
      type: String,
      maxlength: [1000, "Mô tả không được vượt quá 1000 ký tự"],
    },

    // Thời gian dự kiến xử lý
    ThoiGianDuKien: {
      type: Number,
      required: [true, "Thời gian dự kiến là bắt buộc"],
      min: [1, "Thời gian dự kiến phải lớn hơn 0"],
    },

    DonViThoiGian: {
      type: String,
      enum: {
        values: ["PHUT", "GIO", "NGAY"],
        message: "Đơn vị thời gian phải là PHUT, GIO hoặc NGAY",
      },
      default: "PHUT",
    },

    // Trạng thái
    TrangThai: {
      type: String,
      enum: {
        values: ["HOAT_DONG", "NGUNG_HOAT_DONG"],
        message: "Trạng thái không hợp lệ",
      },
      default: "HOAT_DONG",
    },

    // Thứ tự hiển thị (hỗ trợ drag-drop)
    ThuTu: {
      type: Number,
      default: 0,
    },

    // Soft delete
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "danhmucyeucau",
  }
);

// Indexes
danhMucYeuCauSchema.index({ KhoaID: 1, TrangThai: 1 });
danhMucYeuCauSchema.index({ KhoaID: 1, ThuTu: 1 });
danhMucYeuCauSchema.index({ KhoaID: 1, isDeleted: 1 });

// Virtual for formatted ThoiGianDuKien
danhMucYeuCauSchema.virtual("ThoiGianDuKienFormat").get(function () {
  const donVi = {
    PHUT: "phút",
    GIO: "giờ",
    NGAY: "ngày",
  };
  return `${
    this.ThoiGianDuKien
  } ${donVi[this.DonViThoiGian] || this.DonViThoiGian}`;
});

// Methods
danhMucYeuCauSchema.methods.ngungHoatDong = function () {
  this.TrangThai = "NGUNG_HOAT_DONG";
  return this.save();
};

danhMucYeuCauSchema.methods.kichHoat = function () {
  this.TrangThai = "HOAT_DONG";
  return this.save();
};

// Convert thời gian dự kiến sang phút (để tính toán)
danhMucYeuCauSchema.methods.tinhThoiGianPhut = function () {
  switch (this.DonViThoiGian) {
    case "GIO":
      return this.ThoiGianDuKien * 60;
    case "NGAY":
      return this.ThoiGianDuKien * 60 * 24;
    default:
      return this.ThoiGianDuKien;
  }
};

// Statics
danhMucYeuCauSchema.statics.timTheoKhoa = function (
  khoaId,
  chiLayHoatDong = true
) {
  const filter = {
    KhoaID: khoaId,
    isDeleted: false,
  };
  if (chiLayHoatDong) {
    filter.TrangThai = "HOAT_DONG";
  }
  return this.find(filter).sort({ ThuTu: 1, createdAt: 1 });
};

danhMucYeuCauSchema.statics.kiemTraDangDuocSuDung = async function (danhMucId) {
  const YeuCau = mongoose.model("YeuCau");
  const count = await YeuCau.countDocuments({
    DanhMucYeuCauID: danhMucId,
    isDeleted: false,
  });
  return count > 0;
};

const DanhMucYeuCau = mongoose.model("DanhMucYeuCau", danhMucYeuCauSchema);
module.exports = DanhMucYeuCau;
