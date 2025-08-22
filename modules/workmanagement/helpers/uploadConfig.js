const path = require("path");

const MB = 1024 * 1024;

const config = {
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"),
  MAX_FILE_SIZE:
    (parseInt(process.env.MAX_FILE_SIZE_MB || "50", 10) || 50) * MB,
  MAX_TOTAL_UPLOAD:
    (parseInt(process.env.MAX_TOTAL_UPLOAD_MB || "200", 10) || 200) * MB,
  ALLOWED_MIME: (
    process.env.ALLOWED_MIME ||
    "image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,text/plain"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  ENABLE_IMAGE_THUMBNAIL:
    String(process.env.ENABLE_IMAGE_THUMBNAIL || "true").toLowerCase() ===
    "true",
};

module.exports = config;
