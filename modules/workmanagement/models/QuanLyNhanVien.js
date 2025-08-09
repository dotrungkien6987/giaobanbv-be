const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const quanLyNhanVienSchema = Schema(
  {
    NhanVienQuanLy: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    NhanVienDuocQuanLy: {
      type: Schema.ObjectId,
      required: true,
      ref: "NhanVien",
    },
    LoaiQuanLy: {
      type: String,
      enum: ["KPI","Giao_Viec"], // Nhân viên chấm KPI cũng là người giao việc
      required: true,
      default: "KPI",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Tạo index để tối ưu truy vấn
quanLyNhanVienSchema.index({ NhanVienQuanLy: 1, isDeleted: 1 });
quanLyNhanVienSchema.index({ NhanVienDuocQuanLy: 1, isDeleted: 1 });
quanLyNhanVienSchema.index(
  { NhanVienQuanLy: 1, NhanVienDuocQuanLy: 1 },
  { unique: true }
);

// Middleware kiểm tra không thể tự quản lý bản thân
quanLyNhanVienSchema.pre("save", function (next) {
  if (this.NhanVienQuanLy.toString() === this.NhanVienDuocQuanLy.toString()) {
    return next(new Error("Nhân viên không thể tự quản lý chính mình"));
  }
  next();
});

// Virtual để lấy thông tin nhân viên quản lý
quanLyNhanVienSchema.virtual("ThongTinNhanVienQuanLy", {
  ref: "NhanVien",
  localField: "NhanVienQuanLy",
  foreignField: "_id",
  justOne: true,
});

// Virtual để lấy thông tin nhân viên được quản lý
quanLyNhanVienSchema.virtual("ThongTinNhanVienDuocQuanLy", {
  ref: "NhanVien",
  localField: "NhanVienDuocQuanLy",
  foreignField: "_id",
  justOne: true,
});

const QuanLyNhanVien = mongoose.model("QuanLyNhanVien", quanLyNhanVienSchema);
module.exports = QuanLyNhanVien;
