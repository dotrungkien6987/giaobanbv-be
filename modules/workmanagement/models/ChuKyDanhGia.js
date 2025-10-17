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
  foreignField: "ChuKyID",
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

  next();
});

const ChuKyDanhGia = mongoose.model("ChuKyDanhGia", chuKyDanhGiaSchema);
module.exports = ChuKyDanhGia;
