/**
 * Cleanup Deprecated Templates Script
 *
 * Xóa các templates cũ không còn được sử dụng trong Phase 3
 * Run: node seeds/cleanupDeprecatedTemplates.js
 */

const mongoose = require("mongoose");
require("dotenv").config();
const { NotificationTemplate } = require("../modules/workmanagement/models");

async function cleanup() {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/giaoban_bvt";
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB\n");

    // Get all templates
    const allTemplates = await NotificationTemplate.find(
      {},
      "type category"
    ).sort("type");
    console.log(`📋 Total templates in database: ${allTemplates.length}\n`);

    // Templates from standardized file (43 templates)
    const standardTypes = [
      // YeuCau (15)
      "YEUCAU_CREATED",
      "YEUCAU_ACCEPTED",
      "YEUCAU_REJECTED",
      "YEUCAU_DISPATCHED",
      "YEUCAU_RETURNED_TO_DEPT",
      "YEUCAU_COMPLETED",
      "YEUCAU_CANCELLED",
      "YEUCAU_DEADLINE_CHANGED",
      "YEUCAU_RATED",
      "YEUCAU_CLOSED",
      "YEUCAU_REOPENED",
      "YEUCAU_REMINDER",
      "YEUCAU_ESCALATED",
      "YEUCAU_DELETED",
      "YEUCAU_UPDATED",
      // Task (21)
      "TASK_ASSIGNED",
      "TASK_STATUS_CHANGED",
      "TASK_APPROVED",
      "TASK_REJECTED",
      "TASK_CANCELLED",
      "TASK_ACCEPTED",
      "TASK_COMPLETED",
      "TASK_PENDING_APPROVAL",
      "TASK_REVISION_REQUESTED",
      "TASK_REOPENED",
      "TASK_DEADLINE_UPDATED",
      "TASK_PARTICIPANT_ADDED",
      "TASK_PARTICIPANT_REMOVED",
      "TASK_ASSIGNEE_CHANGED",
      "TASK_PRIORITY_CHANGED",
      "TASK_PROGRESS_UPDATED",
      "TASK_FILE_UPLOADED",
      "TASK_FILE_DELETED",
      "DEADLINE_APPROACHING",
      "DEADLINE_OVERDUE",
      "COMMENT_ADDED",
      // KPI (6)
      "KPI_CYCLE_STARTED",
      "KPI_EVALUATED",
      "KPI_APPROVAL_REVOKED",
      "KPI_SCORE_UPDATED",
      "KPI_SELF_EVALUATED",
      "KPI_FEEDBACK_ADDED",
      // System (1)
      "SYSTEM_ANNOUNCEMENT",
    ];

    // Find deprecated templates
    const deprecatedTemplates = allTemplates.filter(
      (t) => !standardTypes.includes(t.type)
    );

    if (deprecatedTemplates.length === 0) {
      console.log("✅ No deprecated templates found. Database is clean!");
      process.exit(0);
    }

    console.log(
      `🗑️  Found ${deprecatedTemplates.length} deprecated templates:\n`
    );
    deprecatedTemplates.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.type.padEnd(30)} (${t.category})`);
    });

    // Delete deprecated templates
    const deprecatedTypes = deprecatedTemplates.map((t) => t.type);
    const result = await NotificationTemplate.deleteMany({
      type: { $in: deprecatedTypes },
    });

    console.log(`\n✅ Deleted ${result.deletedCount} deprecated templates`);

    // Final count
    const finalCount = await NotificationTemplate.countDocuments();
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`  Before: ${allTemplates.length} templates`);
    console.log(`  Deleted: ${result.deletedCount} templates`);
    console.log(`  After: ${finalCount} templates`);
    console.log(`\n🎉 Cleanup completed successfully!`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during cleanup:", error);
    process.exit(1);
  }
}

cleanup();
