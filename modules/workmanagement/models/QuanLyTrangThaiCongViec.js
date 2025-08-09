const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Định nghĩa các trạng thái công việc
const TRANG_THAI_CONG_VIEC = {
  MOI_TAO: "MOI_TAO",
  DA_GIAO: "DA_GIAO",
  DA_NHAN: "DA_NHAN",
  TU_CHOI: "TU_CHOI",
  DANG_THUC_HIEN: "DANG_THUC_HIEN",
  CHO_DUYET: "CHO_DUYET",
  HOAN_THANH: "HOAN_THANH",
  QUA_HAN: "QUA_HAN",
  TAM_DUNG: "TAM_DUNG",
};

// Định nghĩa các chuyển đổi trạng thái hợp lệ
const CHUYEN_DOI_TRANG_THAI = {
  [TRANG_THAI_CONG_VIEC.MOI_TAO]: [TRANG_THAI_CONG_VIEC.DA_GIAO],
  [TRANG_THAI_CONG_VIEC.DA_GIAO]: [
    TRANG_THAI_CONG_VIEC.DA_NHAN,
    TRANG_THAI_CONG_VIEC.TU_CHOI,
  ],
  [TRANG_THAI_CONG_VIEC.DA_NHAN]: [
    TRANG_THAI_CONG_VIEC.DANG_THUC_HIEN,
    TRANG_THAI_CONG_VIEC.TAM_DUNG,
  ],
  [TRANG_THAI_CONG_VIEC.DANG_THUC_HIEN]: [
    TRANG_THAI_CONG_VIEC.CHO_DUYET,
    TRANG_THAI_CONG_VIEC.TAM_DUNG,
  ],
  [TRANG_THAI_CONG_VIEC.CHO_DUYET]: [
    TRANG_THAI_CONG_VIEC.HOAN_THANH,
    TRANG_THAI_CONG_VIEC.DANG_THUC_HIEN,
  ],
  [TRANG_THAI_CONG_VIEC.TAM_DUNG]: [TRANG_THAI_CONG_VIEC.DANG_THUC_HIEN],
  [TRANG_THAI_CONG_VIEC.TU_CHOI]: [], // Trạng thái cuối
  [TRANG_THAI_CONG_VIEC.HOAN_THANH]: [], // Trạng thái cuối
  // QUA_HAN có thể chuyển về bất kỳ trạng thái nào (trừ trạng thái cuối)
  [TRANG_THAI_CONG_VIEC.QUA_HAN]: [
    TRANG_THAI_CONG_VIEC.DANG_THUC_HIEN,
    TRANG_THAI_CONG_VIEC.CHO_DUYET,
    TRANG_THAI_CONG_VIEC.TAM_DUNG,
  ],
};

const lichSuTrangThaiSchema = new Schema(
  {
    TrangThaiCu: {
      type: String,
      enum: Object.values(TRANG_THAI_CONG_VIEC),
      description: "Trạng thái trước khi thay đổi",
    },
    TrangThaiMoi: {
      type: String,
      enum: Object.values(TRANG_THAI_CONG_VIEC),
      required: true,
      description: "Trạng thái sau khi thay đổi",
    },
    NguoiThayDoiID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      required: true,
      description: "Người thực hiện thay đổi trạng thái",
    },
    ThoiGianThayDoi: {
      type: Date,
      default: Date.now,
      description: "Thời gian thay đổi trạng thái",
    },
    LyDoThayDoi: {
      type: String,
      maxlength: 1000,
      description: "Lý do thay đổi trạng thái",
    },
    GhiChu: {
      type: String,
      maxlength: 2000,
      description: "Ghi chú thêm về việc thay đổi trạng thái",
    },
  },
  { _id: false }
);

// Schema chính cho quản lý trạng thái công việc
const quanLyTrangThaiCongViecSchema = new Schema(
  {
    CongViecID: {
      type: Schema.ObjectId,
      ref: "CongViecDuocGiao",
      required: true,
      description: "ID của công việc được theo dõi trạng thái",
    },
    TrangThaiHienTai: {
      type: String,
      enum: Object.values(TRANG_THAI_CONG_VIEC),
      default: TRANG_THAI_CONG_VIEC.MOI_TAO,
      description: "Trạng thái hiện tại của công việc",
    },
    LichSuTrangThai: [lichSuTrangThaiSchema],
    isDeleted: {
      type: Boolean,
      default: false,
      description: "Đánh dấu đã xóa mềm",
    },
  },
  {
    timestamps: true,
    collection: "quanlytranghaicongviec", // Tên bảng tiếng Việt không dấu gạch dưới
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
quanLyTrangThaiCongViecSchema.index({ CongViecID: 1 }, { unique: true });
quanLyTrangThaiCongViecSchema.index({ TrangThaiHienTai: 1 });
quanLyTrangThaiCongViecSchema.index({ "LichSuTrangThai.ThoiGianThayDoi": -1 });
quanLyTrangThaiCongViecSchema.index({ isDeleted: 1 });

// Query middleware
quanLyTrangThaiCongViecSchema.pre(/^find/, function (next) {
  if (!this.getQuery().hasOwnProperty("isDeleted")) {
    this.find({ isDeleted: { $ne: true } });
  }
  next();
});

// Methods
quanLyTrangThaiCongViecSchema.methods.chuyenTrangThai = function (
  trangThaiMoi,
  nguoiThayDoiId,
  lyDo = "",
  ghiChu = ""
) {
  const trangThaiHienTai = this.TrangThaiHienTai;

  // Kiểm tra chuyển đổi hợp lệ
  const coDuocChuyen =
    CHUYEN_DOI_TRANG_THAI[trangThaiHienTai]?.includes(trangThaiMoi);
  if (!coDuocChuyen) {
    throw new Error(
      `Không thể chuyển từ trạng thái ${trangThaiHienTai} sang ${trangThaiMoi}`
    );
  }

  // Thêm vào lịch sử
  this.LichSuTrangThai.push({
    TrangThaiCu: trangThaiHienTai,
    TrangThaiMoi: trangThaiMoi,
    NguoiThayDoiID: nguoiThayDoiId,
    ThoiGianThayDoi: new Date(),
    LyDoThayDoi: lyDo,
    GhiChu: ghiChu,
  });

  // Cập nhật trạng thái hiện tại
  this.TrangThaiHienTai = trangThaiMoi;

  return this.save();
};

quanLyTrangThaiCongViecSchema.methods.kiemTraCoDuocChuyen = function (
  trangThaiMoi
) {
  return (
    CHUYEN_DOI_TRANG_THAI[this.TrangThaiHienTai]?.includes(trangThaiMoi) ||
    false
  );
};

quanLyTrangThaiCongViecSchema.methods.layTrangThaiCoTheChuyen = function () {
  return CHUYEN_DOI_TRANG_THAI[this.TrangThaiHienTai] || [];
};

quanLyTrangThaiCongViecSchema.methods.xoaMem = function () {
  this.isDeleted = true;
  return this.save();
};

// Static methods
quanLyTrangThaiCongViecSchema.statics.taoBanGhi = async function (
  congViecId,
  nguoiTaoId
) {
  const existing = await this.findOne({ CongViecID: congViecId });
  if (existing) {
    throw new Error("Công việc này đã có bản ghi quản lý trạng thái");
  }

  const banGhi = new this({
    CongViecID: congViecId,
    TrangThaiHienTai: TRANG_THAI_CONG_VIEC.MOI_TAO,
    LichSuTrangThai: [
      {
        TrangThaiMoi: TRANG_THAI_CONG_VIEC.MOI_TAO,
        NguoiThayDoiID: nguoiTaoId,
        ThoiGianThayDoi: new Date(),
        LyDoThayDoi: "Tạo công việc mới",
      },
    ],
  });

  return banGhi.save();
};

quanLyTrangThaiCongViecSchema.statics.timTheoCongViec = function (congViecId) {
  return this.findOne({ CongViecID: congViecId }).populate(
    "LichSuTrangThai.NguoiThayDoiID",
    "HoTen MaNhanVien"
  );
};

quanLyTrangThaiCongViecSchema.statics.thongKeTheoTrangThai = function () {
  return this.aggregate([
    {
      $match: { isDeleted: false },
    },
    {
      $group: {
        _id: "$TrangThaiHienTai",
        soLuong: { $sum: 1 },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);
};

// Virtual cho trạng thái mô tả
quanLyTrangThaiCongViecSchema.virtual("TrangThaiMoTa").get(function () {
  const moTa = {
    [TRANG_THAI_CONG_VIEC.MOI_TAO]: "Mới tạo",
    [TRANG_THAI_CONG_VIEC.DA_GIAO]: "Đã giao",
    [TRANG_THAI_CONG_VIEC.DA_NHAN]: "Đã nhận",
    [TRANG_THAI_CONG_VIEC.TU_CHOI]: "Từ chối",
    [TRANG_THAI_CONG_VIEC.DANG_THUC_HIEN]: "Đang thực hiện",
    [TRANG_THAI_CONG_VIEC.CHO_DUYET]: "Chờ duyệt",
    [TRANG_THAI_CONG_VIEC.HOAN_THANH]: "Hoàn thành",
    [TRANG_THAI_CONG_VIEC.QUA_HAN]: "Quá hạn",
    [TRANG_THAI_CONG_VIEC.TAM_DUNG]: "Tạm dừng",
  };
  return moTa[this.TrangThaiHienTai] || "Không xác định";
});

module.exports = {
  QuanLyTrangThaiCongViec: mongoose.model(
    "QuanLyTrangThaiCongViec",
    quanLyTrangThaiCongViecSchema
  ),
  TRANG_THAI_CONG_VIEC,
  CHUYEN_DOI_TRANG_THAI,
};
