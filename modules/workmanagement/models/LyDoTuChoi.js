const mongoose = require("mongoose");
const Schema = mongoose.Schema;

/**
 * LyDoTuChoi - Danh mục lý do từ chối (chung toàn hệ thống)
 * Quyền truy cập: Chỉ Admin/SuperAdmin
 */
const lyDoTuChoiSchema = new Schema(
  {
    // Tên lý do
    TenLyDo: {
      type: String,
      required: [true, "Tên lý do là bắt buộc"],
      trim: true,
      maxlength: [255, "Tên lý do không được vượt quá 255 ký tự"],
    },

    // Mô tả (tùy chọn)
    MoTa: {
      type: String,
      maxlength: [500, "Mô tả không được vượt quá 500 ký tự"],
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

    // Thứ tự hiển thị
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
    collection: "lydotuchoi",
  }
);

// Indexes
lyDoTuChoiSchema.index({ TrangThai: 1, ThuTu: 1 });
lyDoTuChoiSchema.index({ isDeleted: 1 });

// Methods
lyDoTuChoiSchema.methods.ngungHoatDong = function () {
  this.TrangThai = "NGUNG_HOAT_DONG";
  return this.save();
};

lyDoTuChoiSchema.methods.kichHoat = function () {
  this.TrangThai = "HOAT_DONG";
  return this.save();
};

// Statics
lyDoTuChoiSchema.statics.layTatCaHoatDong = function () {
  return this.find({
    TrangThai: "HOAT_DONG",
    isDeleted: false,
  }).sort({ ThuTu: 1 });
};

lyDoTuChoiSchema.statics.kiemTraDangDuocSuDung = async function (lyDoId) {
  const YeuCau = mongoose.model("YeuCau");
  const count = await YeuCau.countDocuments({
    LyDoTuChoiID: lyDoId,
  });
  return count > 0;
};

/**
 * Seed data mặc định
 * Gọi khi khởi tạo DB hoặc qua seed script
 */
lyDoTuChoiSchema.statics.seedDefault = async function () {
  const defaultData = [
    { TenLyDo: "Không đủ thông tin", ThuTu: 1 },
    { TenLyDo: "Không thuộc phạm vi xử lý", ThuTu: 2 },
    { TenLyDo: "Yêu cầu trùng lặp", ThuTu: 3 },
    { TenLyDo: "Thiếu tài nguyên/thiết bị", ThuTu: 4 },
    { TenLyDo: "Lý do khác", ThuTu: 5 },
  ];

  for (const data of defaultData) {
    await this.findOneAndUpdate(
      { TenLyDo: data.TenLyDo },
      { $setOnInsert: data },
      { upsert: true, new: true }
    );
  }

  console.log("✅ Seeded LyDoTuChoi default data");
};

const LyDoTuChoi = mongoose.model("LyDoTuChoi", lyDoTuChoiSchema);
module.exports = LyDoTuChoi;
