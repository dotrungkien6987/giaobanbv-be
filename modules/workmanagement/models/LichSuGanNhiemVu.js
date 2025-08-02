const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const lichSuGanNhiemVuSchema = new Schema(
  {
    NhanVienID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
      required: true,
      description: "ID của nhân viên được gán nhiệm vụ",
    },
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      ref: "NhiemVuThuongQuy",
      required: true,
      description: "ID của nhiệm vụ thường quy",
    },
    TyTrongPhanTram: {
      type: Number,
      required: true,
      min: 0,
      description: "Tỷ trọng phần trăm của nhiệm vụ",
    },
    NgayHieuLuc: {
      type: Date,
      required: true,
      default: Date.now,
      description: "Ngày bắt đầu hiệu lực của assignment",
    },
    NgayKetThuc: {
      type: Date,
      default: null,
      description: "Ngày kết thúc assignment (null = vẫn đang active)",
    },
    NguoiGanID: {
      type: Schema.ObjectId,
      ref: "NhanVienQuanLy",
      required: true,
      description: "Người thực hiện việc gán nhiệm vụ",
    },
    LyDoThayDoi: {
      type: String,
      required: true,
      maxlength: 1000,
      description: "Lý do thực hiện thay đổi assignment",
    },
    LoaiThayDoi: {
      type: String,
      enum: ["GAN_MOI", "CHINH_SUA", "XOA", "CHUYEN_DOI"],
      required: true,
      description: "Loại thay đổi: Gán mới, Chỉnh sửa, Xóa, Chuyển đổi",
    },
    TyTrongCu: {
      type: Number,
      min: 0,
      description: "Tỷ trọng cũ (nếu là chỉnh sửa)",
    },
    GhiChu: {
      type: String,
      maxlength: 2000,
      description: "Ghi chú thêm về việc thay đổi",
    },
    ThongTinBoSung: {
      type: Schema.Types.Mixed,
      description: "Thông tin bổ sung (JSON object) về việc thay đổi",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      description: "Đánh dấu đã xóa mềm",
    },
  },
  {
    timestamps: true,
    collection: "lichsugannhiemvu", // Tên bảng tiếng Việt không dấu gạch dưới
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
lichSuGanNhiemVuSchema.index({ NhanVienID: 1, NgayHieuLuc: -1 });
lichSuGanNhiemVuSchema.index({ NhiemVuThuongQuyID: 1, NgayHieuLuc: -1 });
lichSuGanNhiemVuSchema.index({ NgayHieuLuc: 1, NgayKetThuc: 1 });
lichSuGanNhiemVuSchema.index({ LoaiThayDoi: 1 });
lichSuGanNhiemVuSchema.index({ NguoiGanID: 1 });
lichSuGanNhiemVuSchema.index({ isDeleted: 1 });

// Query middleware
lichSuGanNhiemVuSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

// Methods
lichSuGanNhiemVuSchema.methods.ketThuc = function (nguoiKetThucId, lyDo) {
  this.NgayKetThuc = new Date();
  this.ThongTinBoSung = {
    ...this.ThongTinBoSung,
    nguoiKetThuc: nguoiKetThucId,
    lyDoKetThuc: lyDo,
    thoiGianKetThuc: new Date(),
  };
  return this.save();
};

lichSuGanNhiemVuSchema.methods.xoaMem = function () {
  this.isDeleted = true;
  return this.save();
};

// Static methods
lichSuGanNhiemVuSchema.statics.taoGhiNhan = async function (data) {
  const ghiNhan = new this({
    NhanVienID: data.nhanVienId,
    NhiemVuThuongQuyID: data.nhiemVuId,
    TyTrongPhanTram: data.tyTrong,
    NgayHieuLuc: data.ngayHieuLuc || new Date(),
    NgayKetThuc: data.ngayKetThuc || null,
    NguoiGanID: data.nguoiGanId,
    LyDoThayDoi: data.lyDo,
    LoaiThayDoi: data.loaiThayDoi,
    TyTrongCu: data.tyTrongCu || null,
    GhiChu: data.ghiChu || "",
    ThongTinBoSung: data.thongTinBoSung || {},
  });

  return ghiNhan.save();
};

lichSuGanNhiemVuSchema.statics.timTheoNhanVien = function (
  nhanVienId,
  tuNgay = null,
  denNgay = null
) {
  const query = { NhanVienID: nhanVienId };

  if (tuNgay || denNgay) {
    query.NgayHieuLuc = {};
    if (tuNgay) query.NgayHieuLuc.$gte = new Date(tuNgay);
    if (denNgay) query.NgayHieuLuc.$lte = new Date(denNgay);
  }

  return this.find(query)
    .populate("NhanVienID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayHieuLuc: -1 });
};

lichSuGanNhiemVuSchema.statics.timTheoNhiemVu = function (
  nhiemVuId,
  tuNgay = null,
  denNgay = null
) {
  const query = { NhiemVuThuongQuyID: nhiemVuId };

  if (tuNgay || denNgay) {
    query.NgayHieuLuc = {};
    if (tuNgay) query.NgayHieuLuc.$gte = new Date(tuNgay);
    if (denNgay) query.NgayHieuLuc.$lte = new Date(denNgay);
  }

  return this.find(query)
    .populate("NhanVienID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu")
    .populate("NguoiGanID", "HoTen MaNhanVien")
    .sort({ NgayHieuLuc: -1 });
};

lichSuGanNhiemVuSchema.statics.layAssignmentHienTai = function (
  nhanVienId,
  nhiemVuId
) {
  return this.findOne({
    NhanVienID: nhanVienId,
    NhiemVuThuongQuyID: nhiemVuId,
    NgayKetThuc: null, // Vẫn đang active
  })
    .populate("NhanVienID", "HoTen MaNhanVien")
    .populate("NhiemVuThuongQuyID", "TenNhiemVu")
    .populate("NguoiGanID", "HoTen MaNhanVien");
};

lichSuGanNhiemVuSchema.statics.thongKe = function (tuNgay, denNgay) {
  const matchStage = {
    NgayHieuLuc: {
      $gte: new Date(tuNgay),
      $lte: new Date(denNgay),
    },
  };

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$LoaiThayDoi",
        soLuong: { $sum: 1 },
        theoNgay: {
          $push: {
            ngay: {
              $dateToString: { format: "%Y-%m-%d", date: "$NgayHieuLuc" },
            },
            nhanVien: "$NhanVienID",
            nhiemVu: "$NhiemVuThuongQuyID",
          },
        },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Virtual fields
lichSuGanNhiemVuSchema.virtual("ThoiGianHieuLuc").get(function () {
  if (!this.NgayKetThuc) return null;

  const start = this.NgayHieuLuc;
  const end = this.NgayKetThuc;
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    soNgay: diffDays,
    tuNgay: start,
    denNgay: end,
  };
});

lichSuGanNhiemVuSchema.virtual("CoSanHoatDong").get(function () {
  return this.NgayKetThuc === null;
});

module.exports = mongoose.model("LichSuGanNhiemVu", lichSuGanNhiemVuSchema);
