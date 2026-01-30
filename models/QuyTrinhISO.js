const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const quyTrinhISOSchema = new Schema(
  {
    // === THÔNG TIN CƠ BẢN ===
    TenQuyTrinh: {
      type: String,
      required: [true, "Tên quy trình không được để trống"],
      trim: true,
      maxlength: 500,
    },
    MaQuyTrinh: {
      type: String,
      required: [true, "Mã quy trình không được để trống"],
      trim: true,
      uppercase: true,
      maxlength: 50,
    },
    PhienBan: {
      type: String,
      required: [true, "Phiên bản không được để trống"],
      trim: true,
      maxlength: 10,
    },

    // === QUAN HỆ ===
    KhoaXayDungID: {
      type: Schema.Types.ObjectId,
      ref: "Khoa",
      required: [true, "Khoa xây dựng không được để trống"],
    },

    // === THỜI GIAN ===
    NgayHieuLuc: {
      type: Date,
      required: [true, "Ngày hiệu lực không được để trống"],
    },

    // === MÔ TẢ ===
    GhiChu: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    // === AUDIT ===
    NguoiTaoID: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    NguoiCapNhatID: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // === SOFT DELETE ===
    TrangThai: {
      type: String,
      enum: ["ACTIVE", "DELETED"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    collection: "quytrinhiso",
  },
);

// === INDEXES ===
quyTrinhISOSchema.index({ MaQuyTrinh: 1, PhienBan: 1 });
quyTrinhISOSchema.index({ KhoaXayDungID: 1 });
quyTrinhISOSchema.index({ NgayHieuLuc: -1 });
quyTrinhISOSchema.index({ TrangThai: 1 });
quyTrinhISOSchema.index({ MaQuyTrinh: 1, TrangThai: 1 });

// === VIRTUALS ===
quyTrinhISOSchema.virtual("MaPhienBan").get(function () {
  return `${this.MaQuyTrinh}-v${this.PhienBan}`;
});

quyTrinhISOSchema.set("toJSON", { virtuals: true });
quyTrinhISOSchema.set("toObject", { virtuals: true });

// === INSTANCE METHODS ===
// Get all files (or filtered by field)
quyTrinhISOSchema.methods.getFiles = async function (field = null) {
  const TepTin = require("../modules/workmanagement/models/TepTin");

  const query = {
    OwnerType: "quytrinhiso",
    OwnerID: String(this._id),
    TrangThai: "ACTIVE",
  };

  if (field) {
    query.OwnerField = field.toLowerCase();
  }

  return await TepTin.find(query).sort({ createdAt: -1 });
};

// Get files grouped by type (PDF vs Word)
quyTrinhISOSchema.methods.getFilesByType = async function () {
  const TepTin = require("../modules/workmanagement/models/TepTin");

  const [pdfFiles, wordFiles] = await Promise.all([
    TepTin.find({
      OwnerType: "quytrinhiso",
      OwnerID: String(this._id),
      OwnerField: "filepdf",
      TrangThai: "ACTIVE",
    }).lean(),
    TepTin.find({
      OwnerType: "quytrinhiso",
      OwnerID: String(this._id),
      OwnerField: "fileword",
      TrangThai: "ACTIVE",
    }).lean(),
  ]);

  return { pdf: pdfFiles, word: wordFiles };
};

// Get file counts for list display
quyTrinhISOSchema.methods.getFileCounts = async function () {
  const TepTin = require("../modules/workmanagement/models/TepTin");

  const [pdfCount, wordCount] = await Promise.all([
    TepTin.countDocuments({
      OwnerType: "quytrinhiso",
      OwnerID: String(this._id),
      OwnerField: "filepdf",
      TrangThai: "ACTIVE",
    }),
    TepTin.countDocuments({
      OwnerType: "quytrinhiso",
      OwnerID: String(this._id),
      OwnerField: "fileword",
      TrangThai: "ACTIVE",
    }),
  ]);

  return { pdf: pdfCount, word: wordCount };
};

module.exports = mongoose.model("QuyTrinhISO", quyTrinhISOSchema);
