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

// === STATIC: Sync phân phối (diff-based: only delete removed + insert added) ===
phanPhoiSchema.statics.syncPhanPhoi = async function (
  quyTrinhId,
  khoaIds = [],
) {
  const existing = await this.find({ QuyTrinhISOID: quyTrinhId })
    .select("KhoaID")
    .lean();
  const existingSet = new Set(existing.map((e) => e.KhoaID.toString()));
  const newSet = new Set(khoaIds.map((id) => id.toString()));

  // Delete only removed khoa
  const toDelete = [...existingSet].filter((id) => !newSet.has(id));
  if (toDelete.length > 0) {
    await this.deleteMany({
      QuyTrinhISOID: quyTrinhId,
      KhoaID: { $in: toDelete },
    });
  }

  // Insert only newly added khoa
  const toInsert = [...newSet].filter((id) => !existingSet.has(id));
  if (toInsert.length > 0) {
    await this.insertMany(
      toInsert.map((khoaId) => ({
        QuyTrinhISOID: quyTrinhId,
        KhoaID: khoaId,
      })),
      { ordered: false },
    );
  }
};

module.exports = mongoose.model("QuyTrinhISO_KhoaPhanPhoi", phanPhoiSchema);
