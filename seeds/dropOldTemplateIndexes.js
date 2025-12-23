/**
 * Drop old indexes from NotificationTemplate collection
 * Run before seeding templates
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function dropOldIndexes() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    const db = mongoose.connection.db;
    const collection = db.collection("notificationtemplates");

    // Get current indexes
    const indexes = await collection.indexes();
    console.log("📋 Current indexes:");
    indexes.forEach((idx) => {
      console.log(`   - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    // Drop all indexes except _id
    const indexesToDrop = indexes
      .filter((idx) => idx.name !== "_id_")
      .map((idx) => idx.name);

    if (indexesToDrop.length > 0) {
      console.log(`\n🗑️  Dropping ${indexesToDrop.length} indexes...`);
      for (const indexName of indexesToDrop) {
        await collection.dropIndex(indexName);
        console.log(`   ✅ Dropped: ${indexName}`);
      }
    } else {
      console.log("\n✅ No indexes to drop (only _id exists)");
    }

    console.log("\n✅ Done! Now run: node seeds/notificationTemplates.seed.js");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await mongoose.disconnect();
  }
}

dropOldIndexes();
