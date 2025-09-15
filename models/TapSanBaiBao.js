const mongoose = require("mongoose");

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
    TacGia: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    TomTat: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    NoiDung: {
      type: String,
      trim: true,
    },
    TrangThai: {
      type: String,
      enum: ["Dự thảo", "Đang xem xét", "Được duyệt", "Từ chối", "Đã xuất bản"],
      default: "Dự thảo",
      required: true,
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
tapSanBaiBaoSchema.index({ TapSanId: 1, NgayTao: -1 });
tapSanBaiBaoSchema.index({ TrangThai: 1 });
tapSanBaiBaoSchema.index({ TacGia: 1 });

// Virtual for file count (if needed)
tapSanBaiBaoSchema.virtual("SoTepDinhKem", {
  ref: "Attachment",
  localField: "_id",
  foreignField: "OwnerId",
  count: true,
  match: { OwnerType: "TapSanBaiBao", OwnerField: "file" },
});

// Normalize function for API responses
tapSanBaiBaoSchema.methods.normalize = function () {
  return {
    _id: this._id,
    TapSanId: this.TapSanId,
    TieuDe: this.TieuDe,
    TacGia: this.TacGia,
    TomTat: this.TomTat,
    NoiDung: this.NoiDung,
    TrangThai: this.TrangThai,
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

  const query = { TapSanId: tapSanId, ...filter };
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
  const query = { TapSanId: tapSanId, ...filter };
  return this.countDocuments(query);
};

module.exports = mongoose.model("TapSanBaiBao", tapSanBaiBaoSchema);
