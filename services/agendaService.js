/**
 * Agenda.js Service - Job Scheduling
 *
 * Sử dụng MongoDB làm job store, đảm bảo jobs persist qua restart.
 * Dùng cho deadline notifications (DEADLINE_APPROACHING, DEADLINE_OVERDUE)
 */
const Agenda = require("agenda");

class AgendaService {
  constructor() {
    this.agenda = null;
    this.isReady = false;
  }

  /**
   * Initialize Agenda with MongoDB connection
   * @param {string} [mongoUri] - MongoDB connection string (optional, defaults to MONGODB_URI env)
   */
  async init(mongoUri) {
    if (this.agenda) {
      console.log("[AgendaService] Already initialized");
      return;
    }

    // Get MongoDB URI from parameter or environment
    const uri = mongoUri || process.env.MONGODB_URI;
    if (!uri) {
      console.error(
        "[AgendaService] ❌ MongoDB URI not provided and MONGODB_URI env not set"
      );
      return;
    }

    try {
      this.agenda = new Agenda({
        db: {
          address: uri,
          collection: "agendaJobs",
          options: { useUnifiedTopology: true },
        },
        processEvery: "30 seconds", // Poll interval
        maxConcurrency: 10, // Max concurrent jobs across all job types
        defaultConcurrency: 5, // Default for each job type
      });

      // Event handlers
      this.agenda.on("ready", () => {
        console.log("[AgendaService] ✅ Connected to MongoDB");
        this.isReady = true;
      });

      this.agenda.on("error", (err) => {
        console.error("[AgendaService] ❌ Error:", err.message);
      });

      this.agenda.on("start", (job) => {
        console.log(`[AgendaService] Job started: ${job.attrs.name}`);
      });

      this.agenda.on("complete", (job) => {
        console.log(`[AgendaService] Job completed: ${job.attrs.name}`);
      });

      this.agenda.on("fail", (err, job) => {
        console.error(
          `[AgendaService] Job failed: ${job.attrs.name}`,
          err.message
        );
      });

      // Define jobs before starting
      this._defineJobs();

      // Start processing
      await this.agenda.start();
      console.log("[AgendaService] ✅ Started processing jobs");

      // Schedule recurring jobs AFTER agenda is started and connected
      await this._scheduleRecurringJobs();
    } catch (error) {
      console.error("[AgendaService] ❌ Initialization failed:", error.message);
    }
  }

  /**
   * Define all job types
   * Called during init, before agenda.start()
   */
  _defineJobs() {
    try {
      const { defineDeadlineJobs } = require("../jobs/deadlineJobs");
      defineDeadlineJobs(this.agenda);

      // Define cleanup job (just define, don't schedule yet)
      this._defineCleanupJob();
    } catch (error) {
      console.error("[AgendaService] Error defining jobs:", error.message);
    }
  }

  /**
   * Define cleanup job to remove completed jobs
   * Only defines the job, scheduling happens in _scheduleRecurringJobs()
   */
  _defineCleanupJob() {
    this.agenda.define(
      "cleanup-completed-jobs",
      { priority: "low", concurrency: 1 },
      async (job) => {
        console.log("[AgendaService] 🧹 Starting cleanup of completed jobs...");
        try {
          const result = await this.agenda.cancel({
            lastFinishedAt: { $exists: true },
            nextRunAt: null,
            name: { $ne: "cleanup-completed-jobs" }, // Don't delete itself
          });
          console.log(
            `[AgendaService] 🧹 Cleanup complete: removed ${result} old job(s)`
          );
        } catch (err) {
          console.error("[AgendaService] 🧹 Cleanup error:", err.message);
        }
      }
    );
    console.log("[AgendaService] 🧹 Cleanup job defined");
  }

  /**
   * Schedule recurring jobs - called AFTER agenda.start()
   */
  async _scheduleRecurringJobs() {
    try {
      // Schedule cleanup to run daily at 3:00 AM
      await this.agenda.every("0 3 * * *", "cleanup-completed-jobs");
      console.log(
        "[AgendaService] 🧹 Cleanup job scheduled (daily at 3:00 AM)"
      );
    } catch (error) {
      console.error(
        "[AgendaService] Error scheduling recurring jobs:",
        error.message
      );
    }
  }

  /**
   * Schedule a job at specific time
   * @param {Date|string} when - When to run the job
   * @param {string} jobName - Name of the job to run
   * @param {Object} data - Data to pass to the job
   * @returns {Promise<Object|null>} - The created job or null
   */
  async schedule(when, jobName, data) {
    if (!this.agenda) {
      console.error("[AgendaService] Not initialized, cannot schedule");
      return null;
    }

    try {
      const job = await this.agenda.schedule(when, jobName, data);
      const scheduledTime =
        when instanceof Date ? when.toISOString() : when.toString();
      console.log(
        `[AgendaService] 📅 Scheduled "${jobName}" for ${scheduledTime}`,
        data.taskCode ? `(${data.taskCode})` : ""
      );
      return job;
    } catch (error) {
      console.error(
        `[AgendaService] Error scheduling ${jobName}:`,
        error.message
      );
      return null;
    }
  }

  /**
   * Cancel jobs matching query
   * @param {Object} query - MongoDB-style query for job data
   * @returns {Promise<number>} - Number of jobs cancelled
   */
  async cancel(query) {
    if (!this.agenda) return 0;

    try {
      const numRemoved = await this.agenda.cancel(query);
      if (numRemoved > 0) {
        console.log(`[AgendaService] 🗑️ Cancelled ${numRemoved} job(s)`);
      }
      return numRemoved;
    } catch (error) {
      console.error("[AgendaService] Error cancelling jobs:", error.message);
      return 0;
    }
  }

  /**
   * Get the Agenda instance
   * @returns {Agenda|null}
   */
  getAgenda() {
    return this.agenda;
  }

  /**
   * Check if service is ready
   * @returns {boolean}
   */
  getIsReady() {
    return this.isReady;
  }

  /**
   * Graceful shutdown
   */
  async stop() {
    if (this.agenda) {
      await this.agenda.stop();
      this.isReady = false;
      console.log("[AgendaService] ⏹️ Stopped");
    }
  }

  /**
   * Get pending jobs count (for monitoring)
   * @param {string} jobName - Optional job name filter
   * @returns {Promise<number>}
   */
  async getPendingJobsCount(jobName = null) {
    if (!this.agenda) return 0;

    const query = { nextRunAt: { $ne: null } };
    if (jobName) query.name = jobName;

    const jobs = await this.agenda.jobs(query);
    return jobs.length;
  }
}

// Export singleton instance
module.exports = new AgendaService();
