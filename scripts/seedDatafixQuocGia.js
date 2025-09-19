/*
  Usage:
    Set MONGO_URI env var or edit default below, then run:
      node scripts/seedDatafixQuocGia.js

  This script will upsert a single DaTaFix document (filter: { }) and set its QuocGia field
  to the contents of data/countries.json. It will create the collection/document if missing.
*/
const path = require("path");
const mongoose = require("mongoose");

const DaTaFix = require(path.join(__dirname, "..", "models", "DaTaFix"));
const countries = require(path.join(__dirname, "..", "data", "countries.json"));

const MONGO_URI =
  process.env.MONGO_URI || "mongodb://localhost:27017/giaobanbv";

async function main() {
  console.log("Connecting to", MONGO_URI);
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    // Upsert: if there's an existing document keep other fields, only set QuocGia
    const filter = {}; // adjust if you have a specific identifying filter
    const update = { $set: { QuocGia: countries } };
    const options = { upsert: true, new: true };

    const result = await DaTaFix.findOneAndUpdate(
      filter,
      update,
      options
    ).lean();
    if (result) {
      console.log("Upsert succeeded. Document _id =", result._id);
    } else {
      console.log(
        "Upsert completed but no document returned (older mongoose)."
      );
    }
  } catch (err) {
    console.error("Error during upsert:", err);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected");
  }
}

main();
