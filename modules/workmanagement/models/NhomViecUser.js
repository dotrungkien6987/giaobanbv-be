const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const nhomViecUserSchema = Schema(
  {
    TenNhom: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      description: "Tên nhóm việc do người dùng tự định nghĩa",
    },
    MoTa: {
      type: String,
      maxlength: 1000,
      description: "Mô tả chi tiết về nhóm việc này",
    },
    NguoiTaoID: {
      type: Schema.ObjectId,
      required: true,
      ref: "User",
      description: "ID của quản lý tạo nhóm việc này",
    },
    KhoaID: {
      type: Schema.ObjectId,
      required: true,
      ref: "Khoa",
      description: "Khoa/Phòng ban mà nhóm việc này thuộc về",
    },

    TrangThaiHoatDong: {
      type: Boolean,
      default: true,
      description: "Trạng thái hoạt động của nhóm việc",
    },

    isDeleted: {
      type: Boolean,
      default: false,
      description: "Đánh dấu nhóm việc đã bị xóa (soft delete)",
    },

    deletedAt: {
      type: Date,
      description: "Thời gian nhóm việc bị xóa",
    },
  },
  {
    timestamps: true,
    collection: "nhomviecuser",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
nhomViecUserSchema.index({ NguoiTaoID: 1, TrangThaiHoatDong: 1 });
nhomViecUserSchema.index({ KhoaID: 1, TrangThaiHoatDong: 1 });
nhomViecUserSchema.index({ NguoiTaoID: 1, KhoaID: 1 });
nhomViecUserSchema.index({ isDeleted: 1 });
nhomViecUserSchema.index({ isDeleted: 1, TrangThaiHoatDong: 1 });

// Pre-save middleware để đảm bảo logic soft delete
nhomViecUserSchema.pre("save", function (next) {
  // Nếu đang soft delete, kiểm tra các ràng buộc
  if (this.isModified("isDeleted") && this.isDeleted) {
    // Có thể thêm logic kiểm tra ràng buộc ở đây nếu cần
    // Ví dụ: kiểm tra công việc đang active trong nhóm này
  }
  next();
});

// Query middleware để tự động filter các bản ghi đã xóa
nhomViecUserSchema.pre(/^find/, function (next) {
  // Chỉ áp dụng filter khi không có điều kiện isDeleted trong query
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

module.exports = mongoose.model("NhomViecUser", nhomViecUserSchema);
