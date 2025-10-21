/**
 * SLICE 0 - Database Preparation
 * Script to drop old unique index before server restart
 *
 * RUN THIS BEFORE RESTARTING SERVER
 */

// MongoDB Shell command:
// db.nhanviennhiemvu.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1")

// Or use this Node.js script with mongoose:
const mongoose = require("mongoose");
require("dotenv").config();

const dropOldIndex = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const collection = mongoose.connection.db.collection("nhanviennhiemvu");

    // Check existing indexes
    const indexes = await collection.indexes();
    console.log("\n📋 Current indexes:");
    indexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop the old unique index
    try {
      await collection.dropIndex("NhanVienID_1_NhiemVuThuongQuyID_1");
      console.log("\n✅ Dropped old index: NhanVienID_1_NhiemVuThuongQuyID_1");
    } catch (error) {
      if (error.code === 27) {
        console.log("\n⚠️  Index already dropped or doesn't exist");
      } else {
        throw error;
      }
    }

    // Check indexes after drop
    const newIndexes = await collection.indexes();
    console.log("\n📋 Indexes after drop:");
    newIndexes.forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log("\n✅ Index migration complete!");
    console.log(
      "📌 Next step: Restart server to let Mongoose create new indexes"
    );

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

dropOldIndex();
