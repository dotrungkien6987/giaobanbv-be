const mongoose = require("mongoose");
const { Schema } = mongoose;

// Enum values theo phong cách hiện tại
const VAI_TRO = ["CHINH", "PHOI_HOP"];
const TRANG_THAI = [
  "TAO_MOI",
  "DA_GIAO",
  "DANG_THUC_HIEN",
  "CHO_DUYET",
  "HOAN_THANH",
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
    // Step 2 extended fields
    IsRevert: { type: Boolean, default: false },
    ResetFields: { type: [String], default: undefined }, // only store if non-empty
    Snapshot: {
      type: new Schema(
        {
          SoGioTre: { type: Number },
          HoanThanhTreHan: { type: Boolean },
          TrangThaiBefore: { type: String },
          TrangThaiAfter: { type: String },
        },
        { _id: false }
      ),
      default: undefined,
    },
  },
  { _id: false }
);

// Lịch sử cập nhật tiến độ (Method A) – lưu lại mỗi lần người chính thay đổi %
const LichSuTienDoSchema = new Schema(
  {
    Tu: { type: Number, min: 0, max: 100, required: true },
    Den: { type: Number, min: 0, max: 100, required: true },
    ThoiGian: { type: Date, default: Date.now },
    NguoiThucHienID: { type: Schema.ObjectId, ref: "NhanVien", required: true },
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
    // Mốc thời gian theo flow mới
    NgayGiaoViec: { type: Date, index: true },
    NgayCanhBao: { type: Date, index: true },
    NgayHoanThanh: { type: Date },
    // Các mốc & cờ bổ sung theo flow mới
    NgayTiepNhanThucTe: { type: Date },
    NgayHoanThanhTam: { type: Date }, // thời điểm người thực hiện bấm hoàn thành (khi cần duyệt)
    CoDuyetHoanThanh: { type: Boolean, default: false, index: true },
    SoGioTre: { type: Number, min: 0 },
    HoanThanhTreHan: { type: Boolean },
    FirstSapQuaHanAt: { type: Date },
    FirstQuaHanAt: { type: Date },

    // Cấu hình cảnh báo hết hạn
    CanhBaoMode: { type: String, enum: ["FIXED", "PERCENT"], default: null },
    CanhBaoSapHetHanPercent: {
      type: Number,
      min: 0.5,
      max: 1.0,
      default: null,
    },

    TrangThai: {
      type: String,
      enum: TRANG_THAI,
      default: "TAO_MOI",
      index: true,
    },
    PhanTramTienDoTong: { type: Number, min: 0, max: 100, default: 0 },

    // Liên kết 1 Nhiệm Vụ Thường Quy (single-select) + cờ 'Khác'
    NhiemVuThuongQuyID: {
      type: Schema.ObjectId,
      ref: "NhiemVuThuongQuy",
      default: null,
      index: true,
    },
    FlagNVTQKhac: { type: Boolean, default: false, index: true },

    CongViecChaID: {
      type: Schema.ObjectId,
      ref: "CongViec",
      default: null,
      index: true,
    },
    // Cấu trúc cây (subtasks) – GIAI ĐOẠN 1 (Slim Plan)
    // Path: danh sách tổ tiên (ObjectId) theo thứ tự root -> parent gần nhất
    Path: { type: [Schema.ObjectId], default: [], index: false },
    Depth: { type: Number, default: 0, min: 0, index: true },
    ChildrenCount: { type: Number, default: 0, min: 0 },

    NhomViecUserID: {
      type: Schema.ObjectId,
      ref: "NhomViecUser",
      default: null,
      index: true,
      description:
        "Nhóm việc do người quản lý tự định nghĩa để phân loại công việc",
    },

    LichSuTrangThai: { type: [LichSuTrangThaiSchema], default: [] },
    LichSuTienDo: { type: [LichSuTienDoSchema], default: [] },
    // Danh sách bình luận (tham chiếu) – thêm để tránh StrictPopulateError khi populate
    BinhLuans: [{ type: Schema.ObjectId, ref: "BinhLuan", default: [] }],

    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: {
      type: Schema.ObjectId,
      ref: "NhanVien",
      default: null,
      description: "ID nhân viên thực hiện xóa",
    },
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
congViecSchema.index({ NgayGiaoViec: 1 });
congViecSchema.index({ NgayCanhBao: 1 });
congViecSchema.index({ TrangThai: 1, NgayCanhBao: 1 });
congViecSchema.index({ "NguoiThamGia.NhanVienID": 1 });
congViecSchema.index({ isDeleted: 1 });
congViecSchema.index({ SoThuTu: -1 });
congViecSchema.index({ MaCongViec: 1 }, { unique: true, sparse: true });
congViecSchema.index({ CoDuyetHoanThanh: 1, TrangThai: 1 });

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
  // Validate CanhBao theo mode FIXED
  if (this.CanhBaoMode === "FIXED") {
    const base = this.NgayBatDau || this.createdAt;
    if (this.NgayCanhBao && this.NgayHetHan && base) {
      if (!(this.NgayCanhBao >= base && this.NgayCanhBao < this.NgayHetHan)) {
        return next(
          new Error(
            "NgayCanhBao (FIXED) phải nằm trong [NgayBatDau..NgayHetHan) "
          )
        );
      }
    }
  }
  // Validate percent khi chọn PERCENT
  if (this.CanhBaoMode === "PERCENT") {
    if (
      this.CanhBaoSapHetHanPercent != null &&
      (this.CanhBaoSapHetHanPercent < 0.5 || this.CanhBaoSapHetHanPercent > 1.0)
    ) {
      return next(
        new Error("CanhBaoSapHetHanPercent phải trong khoảng [0.5..1.0]")
      );
    }
  }
  // Validate NhiemVuThuongQuy single-select constraint
  if (this.NhiemVuThuongQuyID && this.FlagNVTQKhac) {
    return next(
      new Error(
        "Không thể vừa chọn NhiemVuThuongQuyID vừa bật FlagNVTQKhac=true"
      )
    );
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

// Virtual tình trạng theo thời hạn: SAP_QUA_HAN | QUA_HAN | null
congViecSchema.virtual("TinhTrangThoiHan").get(function () {
  try {
    if (!this) return null;
    const now = new Date();
    const hetHan = this.NgayHetHan ? new Date(this.NgayHetHan) : null;
    const canhBao = this.NgayCanhBao ? new Date(this.NgayCanhBao) : null;
    if (!hetHan) return null;
    if (this.TrangThai === "HOAN_THANH") {
      if (this.NgayHoanThanh && hetHan) {
        return this.NgayHoanThanh > hetHan
          ? "HOAN_THANH_TRE_HAN"
          : "HOAN_THANH_DUNG_HAN";
      }
      return "HOAN_THANH_DUNG_HAN";
    }
    if (now > hetHan) return "QUA_HAN";
    if (canhBao && now >= canhBao && now < hetHan) return "SAP_QUA_HAN";
    return "DUNG_HAN";
  } catch (_) {
    return null;
  }
});

// PRE-SAVE: Thiết lập Path / Depth cho subtask mới
congViecSchema.pre("save", async function (next) {
  try {
    // Ghi lại trạng thái ban đầu để dùng ở post-save (vì doc.isNew sẽ false sau khi save)
    this._wasNew = this.isNew;
    if (!this.isNew || !this.CongViecChaID) return next();
    // Fetch parent tối thiểu các field cần
    const parent = await this.constructor
      .findById(this.CongViecChaID)
      .select("_id TrangThai Path Depth isDeleted");
    if (!parent || parent.isDeleted) {
      return next(new Error("PARENT_NOT_FOUND"));
    }
    if (parent.TrangThai === "HOAN_THANH") {
      return next(new Error("PARENT_ALREADY_COMPLETED"));
    }
    // Thiết lập Path & Depth cho subtask
    this.Path = Array.isArray(parent.Path)
      ? [...parent.Path, parent._id]
      : [parent._id];
    this.Depth = (parent.Depth || 0) + 1;
    return next();
  } catch (err) {
    return next(err);
  }
});

// POST-SAVE: Tăng ChildrenCount của cha (dựa vào _wasNew)
congViecSchema.post("save", async function (doc, next) {
  try {
    if (this._wasNew && doc && doc.CongViecChaID) {
      await doc.constructor.updateOne(
        { _id: doc.CongViecChaID },
        { $inc: { ChildrenCount: 1 } }
      );
    }
  } catch (_) {
    // Nuốt lỗi increment để không ảnh hưởng việc tạo subtask – có thể chạy recount sau
  }
  next();
});

module.exports = mongoose.model("CongViec", congViecSchema);
