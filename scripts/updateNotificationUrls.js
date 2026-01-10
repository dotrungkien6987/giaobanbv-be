const mongoose = require("mongoose");
require("dotenv").config();

const mongoURI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";

async function updateNotificationUrls() {
  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    const db = mongoose.connection.db;
    const notificationsCollection = db.collection("notifications");

    // Count total notifications
    const totalCount = await notificationsCollection.countDocuments();
    console.log(`📊 Total notifications: ${totalCount}`);

    // Define URL patterns to update
    const urlPatterns = [
      {
        old: /^\/yeu-cau\//,
        new: "/quanlycongviec/yeucau/",
        description: "/yeu-cau/* → /quanlycongviec/yeucau/*",
      },
      {
        old: /^\/quan-ly-cong-viec\/cong-viec\//,
        new: "/quanlycongviec/congviec/",
        description:
          "/quan-ly-cong-viec/cong-viec/* → /quanlycongviec/congviec/*",
      },
      {
        old: /^\/quan-ly-cong-viec\/kpi\//,
        new: "/quanlycongviec/kpi/",
        description: "/quan-ly-cong-viec/kpi/* → /quanlycongviec/kpi/*",
      },
      {
        old: /^\/quan-ly-cong-viec\/yeu-cau/,
        new: "/quanlycongviec/yeucau",
        description: "/quan-ly-cong-viec/yeu-cau → /quanlycongviec/yeucau",
      },
      {
        old: /^\/congviec\//,
        new: "/quanlycongviec/congviec/",
        description: "/congviec/* → /quanlycongviec/congviec/*",
      },
      {
        old: /^\/kpi\//,
        new: "/quanlycongviec/kpi/",
        description: "/kpi/* → /quanlycongviec/kpi/*",
      },
    ];

    let totalUpdated = 0;

    console.log("\n🔄 Starting URL updates...\n");

    // Process each pattern
    for (const pattern of urlPatterns) {
      // Find notifications matching the old pattern
      const matchingNotifications = await notificationsCollection
        .find({
          actionUrl: { $regex: pattern.old },
        })
        .toArray();

      console.log(
        `🔍 Found ${matchingNotifications.length} notifications matching: ${pattern.description}`
      );

      if (matchingNotifications.length === 0) {
        continue;
      }

      // Update each matching notification
      for (const notification of matchingNotifications) {
        const oldUrl = notification.actionUrl;
        const newUrl = oldUrl.replace(pattern.old, pattern.new);

        await notificationsCollection.updateOne(
          { _id: notification._id },
          { $set: { actionUrl: newUrl } }
        );

        console.log(`  ✅ Updated: ${oldUrl} → ${newUrl}`);
        totalUpdated++;
      }
    }

    console.log(`\n📊 Update Summary:`);
    console.log(`  ✅ Total updated: ${totalUpdated} notifications`);
    console.log(`  📋 Total in database: ${totalCount} notifications`);

    // Show sample of updated URLs
    const sampleUpdated = await notificationsCollection
      .find({
        actionUrl: { $regex: /^\/quanlycongviec\// },
      })
      .limit(5)
      .toArray();

    if (sampleUpdated.length > 0) {
      console.log(`\n📋 Sample updated notifications:`);
      sampleUpdated.forEach((notif, index) => {
        console.log(`  ${index + 1}. ${notif.actionUrl}`);
      });
    }

    console.log("\n🎉 URL update completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

updateNotificationUrls();
