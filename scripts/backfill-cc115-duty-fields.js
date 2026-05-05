require("dotenv").config();

const mongoose = require("mongoose");
const Khoa = require("../models/Khoa");

const CC115_CODES = ["CC115", "TT115"];

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function main() {
  const shouldWrite = process.argv.includes("--write");

  await mongoose.connect(process.env.MONGODB_URI);

  const khoas = await Khoa.find({
    MaKhoa: { $in: CC115_CODES },
  })
    .select("_id TenKhoa MaKhoa")
    .lean();

  if (khoas.length === 0) {
    console.log("Khong tim thay khoa CC115/TT115 trong DB.");
    await mongoose.disconnect();
    return;
  }

  const khoaIds = khoas.map((khoa) => khoa._id);
  const collection = mongoose.connection.collection("baocaongays");

  const docs = await collection
    .find(
      {
        KhoaID: { $in: khoaIds },
        $or: [
          { BacSiTrucTrongGio: { $exists: true, $ne: "" } },
          { BacSiTrucNgoaiGio: { $exists: true, $ne: "" } },
        ],
      },
      {
        projection: {
          Ngay: 1,
          KhoaID: 1,
          BSTruc: 1,
          DDTruc: 1,
          BacSiTrucTrongGio: 1,
          BacSiTrucNgoaiGio: 1,
        },
      },
    )
    .toArray();

  const updates = docs
    .map((doc) => {
      const currentBSTruc = normalizeText(doc.BSTruc);
      const currentDDTruc = normalizeText(doc.DDTruc);
      const legacyTrongGio = normalizeText(doc.BacSiTrucTrongGio);
      const legacyNgoaiGio = normalizeText(doc.BacSiTrucNgoaiGio);

      const nextBSTruc = currentBSTruc || legacyTrongGio;
      const nextDDTruc = currentDDTruc || legacyNgoaiGio;

      if (nextBSTruc === currentBSTruc && nextDDTruc === currentDDTruc) {
        return null;
      }

      return {
        _id: doc._id,
        Ngay: doc.Ngay,
        currentBSTruc,
        currentDDTruc,
        legacyTrongGio,
        legacyNgoaiGio,
        nextBSTruc,
        nextDDTruc,
      };
    })
    .filter(Boolean);

  console.log(
    JSON.stringify(
      {
        dryRun: !shouldWrite,
        matchedDepartments: khoas,
        matchedDocuments: docs.length,
        documentsNeedingBackfill: updates.length,
        sample: updates.slice(0, 5),
      },
      null,
      2,
    ),
  );

  if (!shouldWrite || updates.length === 0) {
    await mongoose.disconnect();
    return;
  }

  const bulkOps = updates.map((item) => ({
    updateOne: {
      filter: { _id: item._id },
      update: {
        $set: {
          BSTruc: item.nextBSTruc,
          DDTruc: item.nextDDTruc,
        },
      },
    },
  }));

  const result = await collection.bulkWrite(bulkOps, { ordered: false });

  console.log(
    JSON.stringify(
      {
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
      null,
      2,
    ),
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch (disconnectError) {
    console.error(disconnectError);
  }
  process.exit(1);
});
