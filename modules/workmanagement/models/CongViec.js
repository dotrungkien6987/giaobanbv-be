const mongoose = require("mongoose");
const { Schema } = mongoose;

// Enum values theo phong cách hiện tại
const VAI_TRO = ["CHINH", "PHOI_HOP"];
const TRANG_THAI = [
  "TAO_MOI",
  "DA_GIAO",
  "CHAP_NHAN",
  "TU_CHOI",
  "DANG_THUC_HIEN",
  "CHO_DUYET",
  "HOAN_THANH",
  "QUA_HAN",
  "HUY",
];
const MUC_DO_UU_TIEN = ["THAP", "BINH_THUONG", "CAO", "KHAN_CAP"];

const NguoiThamGiaSchema = new Schema(
  {
    NhanVienID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      required: true,
      index: true,
    },
    VaiTro: { type: String, enum: VAI_TRO, required: true },
    TrangThai: { type: String, enum: TRANG_THAI, default: "TAO_MOI" },
    TienDo: { type: Number, min: 0, max: 100, default: 0 },
    GhiChu: { type: String, maxlength: 2000 },
  },
  { _id: false }
);

const LichSuTrangThaiSchema = new Schema(
  {
    HanhDong: { type: String, required: true },
    NguoiThucHienID: { type: Schema.ObjectId, ref: "NhanVien", required: true },
    TuTrangThai: { type: String, enum: TRANG_THAI },
    DenTrangThai: { type: String, enum: TRANG_THAI },
    ThoiGian: { type: Date, default: Date.now },
    GhiChu: { type: String, maxlength: 2000 },
  },
  { _id: false }
);

const congViecSchema = new Schema(
  {
    MaCongViec: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      description: "Mã công việc dạng CV00001",
    },
    SoThuTu: { type: Number, index: true, description: "Sequence for sorting" },
    TieuDe: {
      type: String,
      required: true,
      trim: true,
      maxlength: 255,
      index: true,
    },
    MoTa: { type: String, maxlength: 5000 },

    NguoiGiaoViecID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      required: true,
      index: true,
    },
    NguoiThamGia: { type: [NguoiThamGiaSchema], required: true, default: [] },
    NguoiChinhID: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      required: true,
      index: true,
    },

    MucDoUuTien: {
      type: String,
      enum: MUC_DO_UU_TIEN,
      default: "BINH_THUONG",
      index: true,
    },
    NgayBatDau: { type: Date },
    NgayHetHan: { type: Date, index: true },

    TrangThai: {
      type: String,
      enum: TRANG_THAI,
      default: "TAO_MOI",
      index: true,
    },
    PhanTramTienDoTong: { type: Number, min: 0, max: 100, default: 0 },

    CongViecChaID: {
      type: Schema.ObjectId,
      ref: "CongViec",
      default: null,
      index: true,
    },

    NhomViecUserID: {
      type: Schema.ObjectId,
      ref: "NhomViecUser",
      default: null,
      index: true,
      description:
        "Nhóm việc do người quản lý tự định nghĩa để phân loại công việc",
    },

    LichSuTrangThai: { type: [LichSuTrangThaiSchema], default: [] },
    // Danh sách bình luận (tham chiếu) – thêm để tránh StrictPopulateError khi populate
    BinhLuans: [{ type: Schema.ObjectId, ref: "BinhLuan", default: [] }],

    isDeleted: { type: Boolean, default: false, index: true },
  },
  {
    timestamps: true,
    collection: "congviec",
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes gợi ý cho truy vấn phổ biến
congViecSchema.index({ TrangThai: 1, NgayHetHan: 1 });
congViecSchema.index({ "NguoiThamGia.NhanVienID": 1 });
congViecSchema.index({ isDeleted: 1 });
congViecSchema.index({ SoThuTu: -1 });
congViecSchema.index({ MaCongViec: 1 }, { unique: true, sparse: true });

// Virtuals để populate thuận tiện (giữ tương thích code cũ dùng NguoiGiaoViec / NguoiChinh)
congViecSchema.virtual("NguoiGiaoViec", {
  ref: "NhanVien",
  localField: "NguoiGiaoViecID",
  foreignField: "_id",
  justOne: true,
});

congViecSchema.virtual("NguoiChinh", {
  ref: "NhanVien",
  localField: "NguoiChinhID",
  foreignField: "_id",
  justOne: true,
});

// Validate nghiệp vụ cơ bản
congViecSchema.pre("validate", function (next) {
  if (this.CongViecChaID && this._id && this.CongViecChaID.equals(this._id)) {
    return next(new Error("CongViecChaID không được trỏ đến chính nó"));
  }
  if (
    this.NgayBatDau &&
    this.NgayHetHan &&
    this.NgayHetHan <= this.NgayBatDau
  ) {
    return next(new Error("NgayHetHan phải sau NgayBatDau"));
  }
  const nhom = this.NguoiThamGia || [];
  if (nhom.length === 0)
    return next(new Error("Phải có ít nhất 1 người tham gia"));
  const mains = nhom.filter((x) => x.VaiTro === "CHINH");
  if (mains.length !== 1)
    return next(new Error('Phải có đúng 1 người vai trò "CHINH"'));
  if (
    !this.NguoiChinhID ||
    String(mains[0].NhanVienID) !== String(this.NguoiChinhID)
  ) {
    return next(
      new Error('NguoiChinhID phải khớp với người có VaiTro="CHINH"')
    );
  }
  const ids = nhom.map((x) => String(x.NhanVienID));
  const hasDup = ids.some((id, idx) => ids.indexOf(id) !== idx);
  if (hasDup)
    return next(new Error("NhanVienID trong NguoiThamGia không được trùng"));
  next();
});

// Helper cập nhật tiến độ tổng theo người chính
congViecSchema.methods.capNhatTienDoTongTheoNguoiChinh = function () {
  const main = (this.NguoiThamGia || []).find((x) => x.VaiTro === "CHINH");
  this.PhanTramTienDoTong = main ? main.TienDo || 0 : 0;
  return this.PhanTramTienDoTong;
};

module.exports = mongoose.model("CongViec", congViecSchema);
