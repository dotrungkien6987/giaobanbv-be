/**
 * Deadline Scheduler Helper
 *
 * Helper functions to schedule/cancel Agenda jobs for CongViec deadlines.
 * Called from congViec.service.js during CRUD operations.
 */

const agendaService = require("../../../services/agendaService");

// Statuses that are considered "closed" (no deadline notifications needed)
const CLOSED_STATUSES = ["HOAN_THANH", "HUY_BO", "DA_XOA"];

/**
 * Schedule deadline jobs for a CongViec
 * - Schedules deadline-approaching job at NgayCanhBao (if set)
 * - Schedules deadline-overdue job at NgayHetHan (if set)
 *
 * @param {Object} congViec - CongViec document
 * @param {Object} options - Options
 * @param {boolean} options.cancelExisting - Cancel existing jobs first (default: true)
 */
async function scheduleDeadlineJobs(congViec, options = {}) {
  const { cancelExisting = true } = options;

  if (!congViec || !congViec._id) {
    console.log(`[DeadlineScheduler] ⚠️ Invalid congViec provided`);
    return;
  }

  const taskId = String(congViec._id);
  const now = new Date();

  console.log(`[DeadlineScheduler] 📅 Scheduling jobs for task ${taskId}`);
  console.log(
    `[DeadlineScheduler] - TrangThai: ${congViec.TrangThai}, NgayHetHan: ${congViec.NgayHetHan}, NgayCanhBao: ${congViec.NgayCanhBao}`
  );

  // Cancel existing jobs if requested
  if (cancelExisting) {
    await cancelDeadlineJobs(taskId);
  }

  // Don't schedule for closed tasks
  if (CLOSED_STATUSES.includes(congViec.TrangThai)) {
    console.log(
      `[DeadlineScheduler] ⏭️ Task ${taskId} is closed (${congViec.TrangThai}), skipping scheduling`
    );
    return;
  }

  // Schedule deadline-approaching job
  if (congViec.NgayCanhBao && !congViec.ApproachingNotifiedAt) {
    const canhBaoDate = new Date(congViec.NgayCanhBao);

    if (canhBaoDate > now) {
      await agendaService.schedule(canhBaoDate, "deadline-approaching", {
        taskId,
      });
      console.log(
        `[DeadlineScheduler] ✅ Scheduled deadline-approaching for ${taskId} at ${canhBaoDate.toISOString()}`
      );
    } else {
      console.log(
        `[DeadlineScheduler] ⏭️ NgayCanhBao already passed for ${taskId}, skipping approaching job`
      );
    }
  } else if (congViec.ApproachingNotifiedAt) {
    console.log(
      `[DeadlineScheduler] ⏭️ Task ${taskId} already notified (approaching), skipping`
    );
  }

  // Schedule deadline-overdue job
  if (congViec.NgayHetHan && !congViec.OverdueNotifiedAt) {
    const hetHanDate = new Date(congViec.NgayHetHan);

    if (hetHanDate > now) {
      await agendaService.schedule(hetHanDate, "deadline-overdue", {
        taskId,
      });
      console.log(
        `[DeadlineScheduler] ✅ Scheduled deadline-overdue for ${taskId} at ${hetHanDate.toISOString()}`
      );
    } else {
      console.log(
        `[DeadlineScheduler] ⏭️ NgayHetHan already passed for ${taskId}, skipping overdue job`
      );
    }
  } else if (congViec.OverdueNotifiedAt) {
    console.log(
      `[DeadlineScheduler] ⏭️ Task ${taskId} already notified (overdue), skipping`
    );
  }
}

/**
 * Cancel all deadline jobs for a CongViec
 * Call this when:
 * - Task is completed/cancelled
 * - Task deadline is changed (before re-scheduling)
 * - Task is deleted
 *
 * @param {string} taskId - CongViec._id as string
 */
async function cancelDeadlineJobs(taskId) {
  if (!taskId) return;

  console.log(`[DeadlineScheduler] 🗑️ Cancelling jobs for task ${taskId}`);

  await agendaService.cancel({ "data.taskId": taskId });

  console.log(`[DeadlineScheduler] ✅ Cancelled all jobs for ${taskId}`);
}

/**
 * Check if a task needs deadline job rescheduling
 * Called when task is updated to determine if jobs need adjustment
 *
 * @param {Object} oldTask - Previous state of CongViec
 * @param {Object} newTask - New state of CongViec
 * @returns {boolean} - Whether rescheduling is needed
 */
function needsRescheduling(oldTask, newTask) {
  // Reschedule if NgayHetHan changed
  if (String(oldTask.NgayHetHan) !== String(newTask.NgayHetHan)) {
    return true;
  }

  // Reschedule if NgayCanhBao changed
  if (String(oldTask.NgayCanhBao) !== String(newTask.NgayCanhBao)) {
    return true;
  }

  // Reschedule if task status changed to open (was closed, now open)
  if (
    CLOSED_STATUSES.includes(oldTask.TrangThai) &&
    !CLOSED_STATUSES.includes(newTask.TrangThai)
  ) {
    return true;
  }

  return false;
}

/**
 * Handle task status change
 * - Cancel jobs if task is completed/cancelled
 * - Keep jobs if task is still open
 *
 * @param {Object} congViec - CongViec document
 */
async function handleStatusChange(congViec) {
  const taskId = String(congViec._id);

  if (CLOSED_STATUSES.includes(congViec.TrangThai)) {
    console.log(
      `[DeadlineScheduler] 🏁 Task ${taskId} closed with status ${congViec.TrangThai}, cancelling jobs`
    );
    await cancelDeadlineJobs(taskId);
  }
}

module.exports = {
  scheduleDeadlineJobs,
  cancelDeadlineJobs,
  needsRescheduling,
  handleStatusChange,
  CLOSED_STATUSES,
};
