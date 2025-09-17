const mongoose = require("mongoose");
const TapSan = require("./TapSan");

const tapSanBaiBaoSchema = new mongoose.Schema(
  {
    TapSanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TapSan",
      required: true,
      index: true,
    },
    TieuDe: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    TomTat: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    LoaiHinh: {
      type: String,
      enum: ["ky-thuat-moi", "nghien-cuu-khoa-hoc", "ca-lam-sang"],
      required: false,
    },
    KhoiChuyenMon: {
      type: String,
      enum: ["noi", "ngoai", "dieu-duong", "phong-ban", "can-lam-sang"],
      required: true,
    },
    SoThuTu: { type: Number, required: true, min: 1, index: true },
    MaBaiBao: { type: String, required: true, index: true },
    TacGiaChinhID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NhanVien",
      required: false,
      index: true,
    },
    NguoiThamDinhID: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "NhanVien",
      required: false,
      index: true,
      default: null,
    },
    DongTacGiaIDs: [{ type: mongoose.Schema.Types.ObjectId, ref: "NhanVien" }],
    // Loại tác giả: noi-vien | ngoai-vien
    TacGiaLoai: {
      type: String,
      enum: ["noi-vien", "ngoai-vien"],
      default: "noi-vien",
      index: true,
    },
    // Khi TacGiaLoai = "ngoai-vien"
    TacGiaNgoaiVien: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    // Dành cho Tập san Thông tin thuốc (TTT)
    NoiDungChuyenDe: {
      type: String,
      enum: ["canh-giac-duoc", "tuong-tac-thuoc", "khuyen-cao-dieu-tri",`su-dung-thuoc-hop-ly`],
      default: null,
      index: true,
    },
    NguonTaiLieuThamKhao: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
    },
    GhiChu: {
      type: String,
      trim: true,
      maxlength: 1000,
    },
    NguoiTao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    NguoiCapNhat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: {
      createdAt: "NgayTao",
      updatedAt: "NgayCapNhat",
    },
    collection: "TapSanBaiBao",
  }
);

// Indexes for performance
tapSanBaiBaoSchema.index(
  { TapSanId: 1, SoThuTu: 1, isDeleted: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $ne: true } } }
);
tapSanBaiBaoSchema.index({ TapSanId: 1, NgayTao: -1 });
tapSanBaiBaoSchema.index({ MaBaiBao: 1 });
tapSanBaiBaoSchema.index({ KhoiChuyenMon: 1 });
tapSanBaiBaoSchema.index({ LoaiHinh: 1 });
tapSanBaiBaoSchema.index({ TacGiaChinhID: 1 });
tapSanBaiBaoSchema.index({ NguoiThamDinhID: 1 });

// Virtual for file count (if needed)
tapSanBaiBaoSchema.virtual("SoTepDinhKem", {
  ref: "Attachment",
  localField: "_id",
  foreignField: "OwnerId",
  count: true,
  match: { OwnerType: "TapSanBaiBao", OwnerField: "file" },
});

// Build MaBaiBao before validation based on TapSan info + SoThuTu
function pad2(n) {
  return String(n).padStart(2, "0");
}
tapSanBaiBaoSchema.pre("validate", async function (next) {
  try {
    const ts = await TapSan.findById(this.TapSanId).lean();
    if (!ts) return next(new Error("Không tìm thấy Tập san để validate"));

    // 1) Conditional validation
    const isTTT = ts.Loai === "TTT";
    const isYHTH = ts.Loai === "YHTH";

    if (isTTT) {
      // For TTT: LoaiHinh not used; NoiDungChuyenDe optional; NguonTaiLieuThamKhao optional
      this.LoaiHinh = undefined;
    } else if (isYHTH) {
      // For YHTH: LoaiHinh optional; clear TTT-only fields
      this.NoiDungChuyenDe = null;
      this.NguonTaiLieuThamKhao = null;
    }

    // Author source validation
    if (this.TacGiaLoai === "noi-vien") {
      if (!this.TacGiaChinhID) {
        return next(new Error("Vui lòng chọn Tác giả chính (nội viện)"));
      }
      this.TacGiaNgoaiVien = null;
    } else if (this.TacGiaLoai === "ngoai-vien") {
      if (!this.TacGiaNgoaiVien) {
        return next(new Error("Vui lòng nhập Tác giả (ngoại viện)"));
      }
      this.TacGiaChinhID = undefined;
      this.DongTacGiaIDs = [];
    }

    // 2) Generate MaBaiBao when creating or order changed or missing
    if (this.isNew || this.isModified("SoThuTu") || !this.MaBaiBao) {
      const so = pad2(ts.SoXuatBan || 0);
      const stt = pad2(this.SoThuTu || 0);
      const loai = ts.Loai || "";
      const nam = ts.NamXuatBan || "";
      this.MaBaiBao = `${loai}-${nam}-${so}-${stt}`;
    }
    next();
  } catch (e) {
    next(e);
  }
});

// Normalize function for API responses
tapSanBaiBaoSchema.methods.normalize = function () {
  return {
    _id: this._id,
    TapSanId: this.TapSanId,
    TieuDe: this.TieuDe,
    TomTat: this.TomTat,
    LoaiHinh: this.LoaiHinh,
    KhoiChuyenMon: this.KhoiChuyenMon,
    SoThuTu: this.SoThuTu,
    MaBaiBao: this.MaBaiBao,
    TacGiaChinhID: this.TacGiaChinhID,
    TacGiaLoai: this.TacGiaLoai,
    TacGiaNgoaiVien: this.TacGiaNgoaiVien,
    NguoiThamDinhID: this.NguoiThamDinhID,
    DongTacGiaIDs: this.DongTacGiaIDs,
    NoiDungChuyenDe: this.NoiDungChuyenDe,
    NguonTaiLieuThamKhao: this.NguonTaiLieuThamKhao,
    GhiChu: this.GhiChu,
    NguoiTao: this.NguoiTao,
    NguoiCapNhat: this.NguoiCapNhat,
    NgayTao: this.NgayTao,
    NgayCapNhat: this.NgayCapNhat,
    SoTepDinhKem: this.SoTepDinhKem,
  };
};

// Static method to get articles by TapSan with pagination
tapSanBaiBaoSchema.statics.getByTapSan = function (tapSanId, options = {}) {
  const {
    page = 1,
    limit = 20,
    sort = { NgayTao: -1 },
    filter = {},
    populate = [],
  } = options;

  const base = { TapSanId: tapSanId, isDeleted: { $ne: true } };
  const query = { ...base, ...filter };
  const skip = (page - 1) * limit;

  let queryBuilder = this.find(query).sort(sort).skip(skip).limit(limit);

  if (populate.length > 0) {
    populate.forEach((field) => {
      queryBuilder = queryBuilder.populate(field);
    });
  }

  return queryBuilder;
};

// Static method to count articles by TapSan
tapSanBaiBaoSchema.statics.countByTapSan = function (tapSanId, filter = {}) {
  const base = { TapSanId: tapSanId, isDeleted: { $ne: true } };
  const query = { ...base, ...filter };
  return this.countDocuments(query);
};

module.exports = mongoose.model("TapSanBaiBao", tapSanBaiBaoSchema);
