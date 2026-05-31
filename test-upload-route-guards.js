require("dotenv").config();
const assert = require("assert/strict");

const authentication = require("./middlewares/authentication");
const fileRouter = require("./routes/file.api");
const attachmentsRouter = require("./routes/attachments.api");
const fileController = require("./controllers/file.controller");
const attachmentsController = require("./modules/workmanagement/controllers/attachments.controller");
const {
  upload,
  verifyMagicAndTotalSize,
} = require("./modules/workmanagement/middlewares/upload.middleware");
const {
  DEFAULT_MAX_FILE_SIZE_MB,
  MAX_FILE_SIZE,
} = require("./modules/workmanagement/helpers/uploadConfig");
const {
  DEFAULT_UPLOAD_RATE_LIMIT_MAX,
  DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_MS,
  getUploadRateLimitKey,
  uploadLimiter,
} = require("./helpers/uploadRateLimit");

function hasGlobalLoginRequired(router) {
  return router.stack.some(
    (layer) => !layer.route && layer.handle === authentication.loginRequired,
  );
}

function getRouteLayer(router, path, method) {
  return router.stack.find(
    (layer) =>
      layer.route &&
      layer.route.path === path &&
      Boolean(layer.route.methods?.[method]),
  );
}

function getRouteHandles(layer, method) {
  return layer.route.stack
    .filter((stackLayer) => stackLayer.method === method)
    .map((stackLayer) => stackLayer.handle);
}

function main() {
  const expectedMaxFileSizeMb =
    parseInt(
      process.env.MAX_FILE_SIZE_MB || String(DEFAULT_MAX_FILE_SIZE_MB),
      10,
    ) || DEFAULT_MAX_FILE_SIZE_MB;
  const expectedUploadRateLimitWindowMs =
    parseInt(
      process.env.UPLOAD_RATE_LIMIT_WINDOW_MS ||
        process.env.LEGACY_UPLOAD_RATE_LIMIT_WINDOW_MS ||
        String(DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_MS),
      10,
    ) || DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_MS;
  const expectedUploadRateLimitMax =
    parseInt(
      process.env.UPLOAD_RATE_LIMIT_MAX ||
        process.env.LEGACY_UPLOAD_RATE_LIMIT_MAX ||
        String(DEFAULT_UPLOAD_RATE_LIMIT_MAX),
      10,
    ) || DEFAULT_UPLOAD_RATE_LIMIT_MAX;

  assert.equal(
    DEFAULT_MAX_FILE_SIZE_MB,
    20,
    "Default upload file size must stay at 20MB",
  );
  assert.equal(
    MAX_FILE_SIZE,
    expectedMaxFileSizeMb * 1024 * 1024,
    "Resolved upload max file size must honor env override or default 20MB contract",
  );
  assert.equal(
    DEFAULT_UPLOAD_RATE_LIMIT_WINDOW_MS,
    60 * 1000,
    "Default upload rate-limit window must stay at 1 minute",
  );
  assert.equal(
    DEFAULT_UPLOAD_RATE_LIMIT_MAX,
    5,
    "Default upload rate-limit max must stay at 5 requests",
  );
  assert.equal(
    getUploadRateLimitKey({
      user: { userId: "user-1" },
      userId: "legacy-user-id",
      ip: "203.0.113.10",
    }),
    "user:user-1",
    "Upload rate-limit key must prefer req.user.userId when authentication has populated req.user",
  );
  assert.equal(
    getUploadRateLimitKey({
      userId: "legacy-user-id",
      ip: "203.0.113.10",
    }),
    "user:legacy-user-id",
    "Upload rate-limit key must fall back to req.userId when req.user is unavailable",
  );
  assert.match(
    getUploadRateLimitKey({ ip: "203.0.113.10" }),
    /^ip:/,
    "Upload rate-limit key must fall back to IP only when no authenticated user context exists",
  );
  assert.deepEqual(uploadLimiter.__uploadRateLimit, {
    windowMs: expectedUploadRateLimitWindowMs,
    max: expectedUploadRateLimitMax,
    keyStrategy: "userId-first-with-ip-fallback",
  });

  assert.ok(
    hasGlobalLoginRequired(fileRouter),
    "Legacy file routes must stay behind global loginRequired",
  );
  const legacyUploadRoute = getRouteLayer(fileRouter, "/upload", "post");
  assert.ok(legacyUploadRoute, "POST /file/upload route must exist");
  const legacyHandles = getRouteHandles(legacyUploadRoute, "post");
  assert.equal(
    legacyHandles[0],
    uploadLimiter,
    "POST /file/upload must rate-limit before upload handler",
  );
  assert.equal(
    legacyHandles[1],
    fileController.uploadFile,
    "POST /file/upload must end at uploadFile controller",
  );

  assert.ok(
    hasGlobalLoginRequired(attachmentsRouter),
    "Attachment routes must stay behind global loginRequired",
  );
  const attachmentsUploadRoute = getRouteLayer(
    attachmentsRouter,
    "/:ownerType/:ownerId/:field?/files",
    "post",
  );
  assert.ok(
    attachmentsUploadRoute,
    "POST /attachments/:ownerType/:ownerId/:field?/files route must exist",
  );
  const attachmentHandles = getRouteHandles(attachmentsUploadRoute, "post");
  assert.equal(
    attachmentHandles[0],
    uploadLimiter,
    "Attachment upload must rate-limit before multer parsing",
  );
  assert.equal(
    attachmentHandles[2],
    verifyMagicAndTotalSize,
    "Attachment upload must keep magic-byte verification after multer",
  );
  assert.equal(
    attachmentHandles[3],
    attachmentsController.upload,
    "Attachment upload must end at upload controller",
  );
  assert.equal(
    typeof attachmentHandles[1],
    typeof upload.array("files"),
    "Attachment upload must keep multer array middleware in the chain",
  );

  console.log("Upload route guard and config smoke test passed.");
}

main();
