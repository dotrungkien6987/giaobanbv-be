#!/usr/bin/env node

/**
 * Migration Script: Schedule Deadline Jobs for Existing Tasks
 *
 * This script schedules Agenda.js jobs for all existing CongViec records
 * that have NgayCanhBao or NgayHetHan in the future.
 *
 * Usage:
 *   node scripts/migrateDeadlineJobs.js
 *   node scripts/migrateDeadlineJobs.js --dry-run   # Preview without scheduling
 *
 * Prerequisites:
 *   - MongoDB must be running
 *   - .env file must have MONGODB_URI
 */

require("dotenv").config();
const mongoose = require("mongoose");
const CongViec = require("../modules/workmanagement/models/CongViec");
const agendaService = require("../services/agendaService");

// Parse CLI args
const args = process.argv.slice(2);
const isDryRun = args.includes("--dry-run");

// Status codes that indicate task is "closed" (no deadline notification needed)
const CLOSED_STATUSES = ["HOAN_THANH", "HUY_BO", "DA_XOA"];

async function main() {
  const mongoURI = process.env.MONGODB_URI;
  if (!mongoURI) {
    console.error("❌ MONGODB_URI not set in environment");
    process.exit(1);
  }

  console.log("🚀 Starting Deadline Jobs Migration");
  console.log(`   Mode: ${isDryRun ? "DRY RUN (no changes)" : "LIVE"}`);
  console.log(`   MongoDB: ${mongoURI.replace(/\/\/[^@]+@/, "//***@")}`);
  console.log("");

  try {
    // Connect to MongoDB
    await mongoose.connect(mongoURI);
    console.log("✅ Connected to MongoDB");

    // Initialize Agenda
    if (!isDryRun) {
      await agendaService.init();
      console.log("✅ Agenda service initialized");
    }

    const now = new Date();
    console.log(`📅 Current time: ${now.toISOString()}`);
    console.log("");

    // Find all open tasks with future deadlines
    const query = {
      isDeleted: { $ne: true },
      TrangThai: { $nin: CLOSED_STATUSES },
      $or: [
        { NgayCanhBao: { $gt: now }, ApproachingNotifiedAt: null },
        { NgayHetHan: { $gt: now }, OverdueNotifiedAt: null },
      ],
    };

    const tasks = await CongViec.find(query)
      .select(
        "_id MaCongViec TieuDe TrangThai NgayBatDau NgayHetHan NgayCanhBao ApproachingNotifiedAt OverdueNotifiedAt"
      )
      .lean();

    console.log(`📊 Found ${tasks.length} tasks needing deadline jobs`);
    console.log("");

    // Statistics
    let approachingScheduled = 0;
    let overdueScheduled = 0;
    let skipped = 0;

    for (const task of tasks) {
      const taskId = String(task._id);
      console.log(
        `📌 Processing: ${task.MaCongViec} - ${task.TieuDe?.substring(0, 50)}`
      );
      console.log(`   Status: ${task.TrangThai}`);
      console.log(`   NgayCanhBao: ${task.NgayCanhBao || "N/A"}`);
      console.log(`   NgayHetHan: ${task.NgayHetHan || "N/A"}`);

      // Schedule approaching notification
      if (
        task.NgayCanhBao &&
        new Date(task.NgayCanhBao) > now &&
        !task.ApproachingNotifiedAt
      ) {
        if (!isDryRun) {
          await agendaService.schedule(
            new Date(task.NgayCanhBao),
            "deadline-approaching",
            { taskId }
          );
        }
        console.log(
          `   ✅ Scheduled deadline-approaching at ${new Date(
            task.NgayCanhBao
          ).toISOString()}`
        );
        approachingScheduled++;
      }

      // Schedule overdue notification
      if (
        task.NgayHetHan &&
        new Date(task.NgayHetHan) > now &&
        !task.OverdueNotifiedAt
      ) {
        if (!isDryRun) {
          await agendaService.schedule(
            new Date(task.NgayHetHan),
            "deadline-overdue",
            { taskId }
          );
        }
        console.log(
          `   ✅ Scheduled deadline-overdue at ${new Date(
            task.NgayHetHan
          ).toISOString()}`
        );
        overdueScheduled++;
      }

      // Check if nothing scheduled
      if (
        (!task.NgayCanhBao ||
          new Date(task.NgayCanhBao) <= now ||
          task.ApproachingNotifiedAt) &&
        (!task.NgayHetHan ||
          new Date(task.NgayHetHan) <= now ||
          task.OverdueNotifiedAt)
      ) {
        console.log(`   ⏭️ Skipped (no future dates)`);
        skipped++;
      }

      console.log("");
    }

    // Summary
    console.log("═".repeat(50));
    console.log("📊 Migration Summary");
    console.log("═".repeat(50));
    console.log(`   Total tasks processed: ${tasks.length}`);
    console.log(`   Approaching jobs scheduled: ${approachingScheduled}`);
    console.log(`   Overdue jobs scheduled: ${overdueScheduled}`);
    console.log(`   Tasks skipped: ${skipped}`);
    console.log(`   Mode: ${isDryRun ? "DRY RUN (no changes made)" : "LIVE"}`);
    console.log("");

    if (isDryRun) {
      console.log("💡 Tip: Run without --dry-run to actually schedule jobs");
    }
  } catch (err) {
    console.error("❌ Migration error:", err.message);
    console.error(err.stack);
    process.exit(1);
  } finally {
    // Cleanup
    if (!isDryRun && agendaService.stop) {
      await agendaService.stop();
    }
    await mongoose.disconnect();
    console.log("✅ Disconnected from MongoDB");
    process.exit(0);
  }
}

main();
