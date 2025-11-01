const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const chuKyDanhGiaSchema = Schema(
  {
    TenChuKy: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      // Example: "Tháng 1/2025", "Tháng 2/2025"
    },
    Thang: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    Nam: {
      type: Number,
      required: true,
      min: 2020,
    },
    NgayBatDau: {
      type: Date,
      required: true,
    },
    NgayKetThuc: {
      type: Date,
      required: true,
    },
    isDong: {
      type: Boolean,
      default: false, // false = đang mở, true = đã đóng
    },
    MoTa: {
      type: String,
      maxlength: 1000,
    },
    NguoiTaoID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
    },
    // Cấu hình tiêu chí đánh giá cho chu kỳ này
    TieuChiCauHinh: [
      {
        TenTieuChi: {
          type: String,
          required: true,
          trim: true,
        },
        LoaiTieuChi: {
          type: String,
          enum: ["TANG_DIEM", "GIAM_DIEM"],
          required: true,
        },
        GiaTriMin: {
          type: Number,
          default: 0,
        },
        GiaTriMax: {
          type: Number,
          default: 100,
        },
        DonVi: {
          type: String,
          default: "%",
          trim: true,
        },
        ThuTu: {
          type: Number,
          default: 0,
        },
        GhiChu: {
          type: String,
          maxlength: 500,
        },
        // ✅ NEW: Đánh dấu tiêu chí "Mức độ hoàn thành công việc" (FIXED)
        IsMucDoHoanThanh: {
          type: Boolean,
          default: false,
          description:
            "true = Tiêu chí FIXED cho phép tự đánh giá, false = Tiêu chí user-defined",
        },
      },
    ],
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "chukydanhgia",
  }
);

// Indexes đơn giản
chuKyDanhGiaSchema.index({ Thang: 1, Nam: 1 });
chuKyDanhGiaSchema.index({ isDong: 1 });
chuKyDanhGiaSchema.index({ isDeleted: 1 });

// Virtual for evaluations in this cycle
chuKyDanhGiaSchema.virtual("DanhSachDanhGia", {
  ref: "DanhGiaKPI",
  localField: "_id",
  foreignField: "ChuKyDanhGiaID",
});

// Static method đơn giản
chuKyDanhGiaSchema.statics.layChuKyDangMo = function () {
  return this.findOne({ isDong: false, isDeleted: false }).sort({
    NgayBatDau: -1,
  });
};

// Validation
chuKyDanhGiaSchema.pre("save", function (next) {
  if (this.NgayBatDau >= this.NgayKetThuc) {
    const error = new Error("Ngày kết thúc phải lớn hơn ngày bắt đầu");
    error.name = "ValidationError";
    return next(error);
  }

  // Auto-generate TenChuKy nếu chưa có
  if (!this.TenChuKy) {
    this.TenChuKy = `Tháng ${this.Thang}/${this.Nam}`;
  }

  // ✅ VALIDATION: Phải có đúng 1 tiêu chí IsMucDoHoanThanh = true
  const tieuChiMucDoHT = this.TieuChiCauHinh.filter(
    (tc) => tc.IsMucDoHoanThanh === true
  );

  if (tieuChiMucDoHT.length === 0) {
    const error = new Error(
      "Chu kỳ phải có tiêu chí 'Mức độ hoàn thành công việc'"
    );
    error.name = "ValidationError";
    return next(error);
  }

  if (tieuChiMucDoHT.length > 1) {
    const error = new Error(
      "Chỉ được có 1 tiêu chí 'Mức độ hoàn thành công việc'"
    );
    error.name = "ValidationError";
    return next(error);
  }

  // ✅ VALIDATION: Tiêu chí FIXED không được đổi tên
  const tieuChiFixed = tieuChiMucDoHT[0];
  if (tieuChiFixed.TenTieuChi !== "Mức độ hoàn thành công việc") {
    const error = new Error(
      "Tên tiêu chí 'Mức độ hoàn thành công việc' không được thay đổi"
    );
    error.name = "ValidationError";
    return next(error);
  }

  next();
});

const ChuKyDanhGia = mongoose.model("ChuKyDanhGia", chuKyDanhGiaSchema);
module.exports = ChuKyDanhGia;
