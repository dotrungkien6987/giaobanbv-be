const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const phanPhoiSchema = new Schema(
  {
    QuyTrinhISOID: {
      type: Schema.Types.ObjectId,
      ref: "QuyTrinhISO",
      required: true,
    },
    KhoaID: {
      type: Schema.Types.ObjectId,
      ref: "Khoa",
      required: true,
    },
    // timestamps: true sẽ tự động thêm createdAt, updatedAt
  },
  {
    timestamps: true,
    collection: "quytrinhiso_khoaphanphoi",
  },
);

// === COMPOSITE UNIQUE INDEX ===
phanPhoiSchema.index({ QuyTrinhISOID: 1, KhoaID: 1 }, { unique: true });
phanPhoiSchema.index({ KhoaID: 1 });

// === STATICS ===
phanPhoiSchema.statics.findByQuyTrinh = function (quyTrinhId) {
  return this.find({ QuyTrinhISOID: quyTrinhId }).populate(
    "KhoaID",
    "TenKhoa MaKhoa",
  );
};

phanPhoiSchema.statics.findByKhoa = function (khoaId) {
  return this.find({ KhoaID: khoaId }).populate({
    path: "QuyTrinhISOID",
    match: { TrangThai: "ACTIVE" },
    populate: { path: "KhoaXayDungID", select: "TenKhoa MaKhoa" },
  });
};

// === STATIC: Sync phân phối (delete old + insert new) ===
phanPhoiSchema.statics.syncPhanPhoi = async function (
  quyTrinhId,
  khoaIds = [],
) {
  // Delete all existing
  await this.deleteMany({ QuyTrinhISOID: quyTrinhId });

  // Insert new
  if (khoaIds.length > 0) {
    const docs = khoaIds.map((khoaId) => ({
      QuyTrinhISOID: quyTrinhId,
      KhoaID: khoaId,
    }));
    await this.insertMany(docs, { ordered: false });
  }
};

module.exports = mongoose.model("QuyTrinhISO_KhoaPhanPhoi", phanPhoiSchema);
