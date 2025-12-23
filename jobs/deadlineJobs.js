/**
 * Deadline Job Definitions
 *
 * Job handlers cho DEADLINE_APPROACHING và DEADLINE_OVERDUE.
 * Được gọi bởi Agenda.js khi đến thời điểm scheduled.
 */
const { CongViec } = require("../modules/workmanagement/models");
const notificationService = require("../modules/workmanagement/services/notificationService");

/**
 * Define deadline-related jobs for Agenda
 * @param {Agenda} agenda - Agenda instance
 */
function defineDeadlineJobs(agenda) {
  // Job: deadline-approaching
  // Triggered at NgayCanhBao time
  agenda.define(
    "deadline-approaching",
    {
      lockLifetime: 5 * 60 * 1000, // 5 minutes lock to prevent duplicate processing
      concurrency: 5, // Max 5 concurrent executions
    },
    async (job) => {
      const { taskId, taskCode } = job.attrs.data;
      console.log(`[DeadlineJob] ⏰ Processing APPROACHING: ${taskCode}`);

      try {
        await processDeadlineApproaching(taskId);
      } catch (error) {
        console.error(
          `[DeadlineJob] ❌ Error APPROACHING ${taskCode}:`,
          error.message
        );
        throw error; // Let Agenda handle retry
      }
    }
  );

  // Job: deadline-overdue
  // Triggered at NgayHetHan time
  agenda.define(
    "deadline-overdue",
    {
      lockLifetime: 5 * 60 * 1000,
      concurrency: 5,
    },
    async (job) => {
      const { taskId, taskCode } = job.attrs.data;
      console.log(`[DeadlineJob] ⚠️ Processing OVERDUE: ${taskCode}`);

      try {
        await processDeadlineOverdue(taskId);
      } catch (error) {
        console.error(
          `[DeadlineJob] ❌ Error OVERDUE ${taskCode}:`,
          error.message
        );
        throw error;
      }
    }
  );

  console.log(
    "[DeadlineJobs] ✅ Defined: deadline-approaching, deadline-overdue"
  );
}

/**
 * Process deadline approaching notification
 * @param {string} taskId - CongViec._id
 */
async function processDeadlineApproaching(taskId) {
  // 1. Fetch task with populated fields for recipients
  const task = await CongViec.findById(taskId)
    .populate("NguoiChinhID", "_id HoTen")
    .populate("NguoiGiaoViecID", "_id HoTen")
    .populate("NguoiThamGia.NhanVienID", "_id HoTen");

  if (!task) {
    console.log(`[DeadlineJob] Task ${taskId} not found, skipping`);
    return;
  }

  // 2. Check if task is already completed
  if (task.TrangThai === "HOAN_THANH") {
    console.log(`[DeadlineJob] Task ${task.MaCongViec} completed, skipping`);
    return;
  }

  // 3. Check if already notified (prevent duplicate)
  if (task.ApproachingNotifiedAt) {
    console.log(
      `[DeadlineJob] Task ${task.MaCongViec} already notified APPROACHING, skipping`
    );
    return;
  }

  // 4. Calculate days left
  const now = new Date();
  const deadline = new Date(task.NgayHetHan);
  const msLeft = deadline - now;
  const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));

  // 5. Fire notification via notificationService
  // Lấy danh sách người liên quan
  const arrNguoiLienQuanID = [
    task.NguoiChinhID?._id?.toString(),
    task.NguoiGiaoViecID?._id?.toString(),
    ...(task.NguoiThamGia || []).map((p) => p.NhanVienID?._id?.toString()),
  ].filter((id) => id);

  await notificationService.send({
    type: "congviec-deadline-approaching",
    data: {
      _id: task._id.toString(),
      arrNguoiLienQuanID: [...new Set(arrNguoiLienQuanID)],
      MaCongViec: task.MaCongViec,
      TieuDe: task.TieuDe,
      NgayHetHan: task.NgayHetHan,
      SoNgayConLai: Math.max(0, daysLeft),
    },
  });

  // 6. Mark as notified to prevent duplicates
  await CongViec.findByIdAndUpdate(taskId, {
    ApproachingNotifiedAt: new Date(),
  });

  console.log(
    `[DeadlineJob] ✅ APPROACHING notification sent for ${task.MaCongViec} (${daysLeft} days left)`
  );
}

/**
 * Process deadline overdue notification
 * @param {string} taskId - CongViec._id
 */
async function processDeadlineOverdue(taskId) {
  // 1. Fetch task
  const task = await CongViec.findById(taskId)
    .populate("NguoiChinhID", "_id HoTen")
    .populate("NguoiGiaoViecID", "_id HoTen")
    .populate("NguoiThamGia.NhanVienID", "_id HoTen");

  if (!task) {
    console.log(`[DeadlineJob] Task ${taskId} not found, skipping`);
    return;
  }

  // 2. Check if task is already completed
  if (task.TrangThai === "HOAN_THANH") {
    console.log(`[DeadlineJob] Task ${task.MaCongViec} completed, skipping`);
    return;
  }

  // 3. Check if already notified
  if (task.OverdueNotifiedAt) {
    console.log(
      `[DeadlineJob] Task ${task.MaCongViec} already notified OVERDUE, skipping`
    );
    return;
  }

  // 4. Calculate days overdue
  const now = new Date();
  const deadline = new Date(task.NgayHetHan);
  const msOverdue = now - deadline;
  const daysOverdue = Math.floor(msOverdue / (1000 * 60 * 60 * 24));

  // 5. Fire notification via notificationService
  const arrNguoiLienQuanID = [
    task.NguoiChinhID?._id?.toString(),
    task.NguoiGiaoViecID?._id?.toString(),
    ...(task.NguoiThamGia || []).map((p) => p.NhanVienID?._id?.toString()),
  ].filter((id) => id);

  await notificationService.send({
    type: "congviec-deadline-overdue",
    data: {
      _id: task._id.toString(),
      arrNguoiLienQuanID: [...new Set(arrNguoiLienQuanID)],
      MaCongViec: task.MaCongViec,
      TieuDe: task.TieuDe,
      NgayHetHan: task.NgayHetHan,
      SoNgayQuaHan: Math.max(0, daysOverdue),
    },
  });

  // 6. Mark as notified
  await CongViec.findByIdAndUpdate(taskId, {
    OverdueNotifiedAt: new Date(),
  });

  console.log(
    `[DeadlineJob] ✅ OVERDUE notification sent for ${task.MaCongViec} (${daysOverdue} days overdue)`
  );
}

module.exports = { defineDeadlineJobs };
