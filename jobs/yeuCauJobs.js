/**
 * YeuCau Auto-Close Job Definitions
 *
 * Tự động đóng yêu cầu sau 3 ngày DA_HOAN_THANH nếu không có đánh giá.
 * Được chạy bởi Agenda.js theo lịch hoặc khi yêu cầu hoàn thành.
 */

const { YeuCau } = require("../modules/workmanagement/models");
const yeuCauStateMachine = require("../modules/workmanagement/services/yeuCauStateMachine");

/**
 * Define yeuCau auto-close jobs for Agenda
 * @param {Agenda} agenda - Agenda instance
 */
function defineYeuCauJobs(agenda) {
  /**
   * Job: yeucau-auto-close
   * Chạy hàng ngày lúc 00:05 để tự động đóng yêu cầu đã hoàn thành > 3 ngày
   */
  agenda.define(
    "yeucau-auto-close-batch",
    {
      lockLifetime: 10 * 60 * 1000, // 10 minutes lock
      concurrency: 1, // Only 1 batch at a time
    },
    async (job) => {
      console.log("[YeuCauJob] 🔄 Starting batch auto-close...");

      try {
        const result = await processAutoCloseBatch();
        console.log(
          `[YeuCauJob] ✅ Batch completed: ${result.closed}/${result.total} closed`
        );
      } catch (error) {
        console.error("[YeuCauJob] ❌ Batch error:", error.message);
        throw error;
      }
    }
  );

  /**
   * Job: yeucau-auto-close-single
   * Schedule cho từng yêu cầu cụ thể khi nó được báo hoàn thành
   * Chạy sau 3 ngày + 1 phút từ NgayHoanThanh
   */
  agenda.define(
    "yeucau-auto-close-single",
    {
      lockLifetime: 5 * 60 * 1000,
      concurrency: 5,
    },
    async (job) => {
      const { yeuCauId, maYeuCau } = job.attrs.data;
      console.log(`[YeuCauJob] ⏰ Processing auto-close: ${maYeuCau}`);

      try {
        await processAutoCloseSingle(yeuCauId);
      } catch (error) {
        console.error(
          `[YeuCauJob] ❌ Error auto-close ${maYeuCau}:`,
          error.message
        );
        // Don't throw - this is expected if already closed/rated
      }
    }
  );

  console.log(
    "[YeuCauJobs] ✅ Defined: yeucau-auto-close-batch, yeucau-auto-close-single"
  );
}

/**
 * Process batch auto-close (chạy hàng ngày)
 * @returns {{ total: number, closed: number }}
 */
async function processAutoCloseBatch() {
  // Tìm yêu cầu cần tự động đóng
  const yeuCauList = await YeuCau.timCanAutoClose();

  let closed = 0;

  for (const yeuCau of yeuCauList) {
    try {
      await yeuCauStateMachine.autoClose(yeuCau._id);
      closed++;
      console.log(`[YeuCauJob] ✅ Auto-closed: ${yeuCau.MaYeuCau}`);
    } catch (error) {
      console.error(
        `[YeuCauJob] ⚠️ Failed to close ${yeuCau.MaYeuCau}: ${error.message}`
      );
      // Continue with next
    }
  }

  return {
    total: yeuCauList.length,
    closed,
  };
}

/**
 * Process single auto-close (scheduled job)
 * @param {string} yeuCauId - YeuCau._id
 */
async function processAutoCloseSingle(yeuCauId) {
  // 1. Fetch yêu cầu
  const yeuCau = await YeuCau.findById(yeuCauId);

  if (!yeuCau) {
    console.log(`[YeuCauJob] YeuCau ${yeuCauId} not found, skipping`);
    return;
  }

  // 2. Check nếu đã không còn ở trạng thái DA_HOAN_THANH
  if (yeuCau.TrangThai !== YeuCau.TRANG_THAI.DA_HOAN_THANH) {
    console.log(
      `[YeuCauJob] YeuCau ${yeuCau.MaYeuCau} not in DA_HOAN_THANH (${yeuCau.TrangThai}), skipping`
    );
    return;
  }

  // 3. Check đã quá 3 ngày chưa (phòng trường hợp job chạy sớm)
  const ngayHoanThanh = new Date(yeuCau.NgayHoanThanh);
  const now = new Date();
  const diffDays = (now - ngayHoanThanh) / (1000 * 60 * 60 * 24);

  if (diffDays < 3) {
    console.log(
      `[YeuCauJob] YeuCau ${yeuCau.MaYeuCau} not yet 3 days (${diffDays.toFixed(
        1
      )} days), skipping`
    );
    return;
  }

  // 4. Thực hiện auto-close
  await yeuCauStateMachine.autoClose(yeuCau._id);
  console.log(`[YeuCauJob] ✅ Auto-closed: ${yeuCau.MaYeuCau}`);
}

/**
 * Schedule auto-close job khi yêu cầu được báo hoàn thành
 * Gọi từ controller/service khi transition HOAN_THANH
 * @param {Agenda} agenda - Agenda instance
 * @param {YeuCau} yeuCau - Yêu cầu đã hoàn thành
 */
async function scheduleAutoClose(agenda, yeuCau) {
  const runAt = new Date(yeuCau.NgayHoanThanh);
  runAt.setDate(runAt.getDate() + 3);
  runAt.setMinutes(runAt.getMinutes() + 1); // +1 phút để đảm bảo

  await agenda.schedule(runAt, "yeucau-auto-close-single", {
    yeuCauId: yeuCau._id.toString(),
    maYeuCau: yeuCau.MaYeuCau,
  });

  console.log(
    `[YeuCauJob] 📅 Scheduled auto-close for ${
      yeuCau.MaYeuCau
    } at ${runAt.toISOString()}`
  );
}

/**
 * Cancel scheduled auto-close job
 * Gọi khi yêu cầu được đánh giá hoặc đóng thủ công
 * @param {Agenda} agenda - Agenda instance
 * @param {string} yeuCauId - YeuCau._id
 */
async function cancelAutoClose(agenda, yeuCauId) {
  const numRemoved = await agenda.cancel({
    name: "yeucau-auto-close-single",
    "data.yeuCauId": yeuCauId.toString(),
  });

  if (numRemoved > 0) {
    console.log(
      `[YeuCauJob] 🗑️ Cancelled ${numRemoved} auto-close job(s) for ${yeuCauId}`
    );
  }
}

/**
 * Setup daily batch job
 * Gọi khi khởi động ứng dụng
 * @param {Agenda} agenda - Agenda instance
 */
async function setupDailyAutoClose(agenda) {
  // Chạy hàng ngày lúc 00:05
  await agenda.every("0 5 0 * * *", "yeucau-auto-close-batch", null, {
    timezone: "Asia/Ho_Chi_Minh",
  });

  console.log(
    "[YeuCauJob] 📅 Setup daily auto-close batch at 00:05 (Asia/Ho_Chi_Minh)"
  );
}

module.exports = {
  defineYeuCauJobs,
  scheduleAutoClose,
  cancelAutoClose,
  setupDailyAutoClose,
  processAutoCloseBatch,
  processAutoCloseSingle,
};
