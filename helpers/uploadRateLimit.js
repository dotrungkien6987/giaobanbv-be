const rateLimit = require("express-rate-limit");
const { sendResponse } = require("./utils");

const DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_MS = 60 * 1000;
const DEFAULT_UPLOAD_RATE_LIMIT_MAX = 5;

const uploadRateLimitWindowMs = Math.max(
  parseInt(
    process.env.UPLOAD_RATE_LIMIT_WINDOW_MS ||
      process.env.LEGACY_UPLOAD_RATE_LIMIT_WINDOW_MS ||
      "",
    10,
  ) || DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_MS,
  1000,
);

const uploadRateLimitMax = Math.max(
  parseInt(
    process.env.UPLOAD_RATE_LIMIT_MAX ||
      process.env.LEGACY_UPLOAD_RATE_LIMIT_MAX ||
      "",
    10,
  ) || DEFAULT_UPLOAD_RATE_LIMIT_MAX,
  1,
);

function getUploadRateLimitKey(req) {
  const userId = req.user?.userId || req.userId;

  if (userId) {
    return `user:${userId}`;
  }

  return `ip:${rateLimit.ipKeyGenerator(req.ip)}`;
}

const uploadLimiter = rateLimit({
  windowMs: uploadRateLimitWindowMs,
  max: uploadRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getUploadRateLimitKey,
  handler: (req, res) =>
    sendResponse(
      res,
      429,
      false,
      null,
      { message: "Quá nhiều yêu cầu tải tệp, vui lòng thử lại sau" },
      "Rate Limit Error",
    ),
});

uploadLimiter.__uploadRateLimit = {
  windowMs: uploadRateLimitWindowMs,
  max: uploadRateLimitMax,
  keyStrategy: "userId-first-with-ip-fallback",
};

module.exports = {
  DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_MS,
  DEFAULT_UPLOAD_RATE_LIMIT_MAX,
  getUploadRateLimitKey,
  uploadLimiter,
};
