const express = require("express");
const router = express.Router();
const authentication = require("../../../middlewares/authentication");
const fileController = require("../controllers/file.controller");
const rateLimit = require("express-rate-limit");
const {
  upload,
  verifyMagicAndTotalSize,
} = require("../middlewares/upload.middleware");

// Rate limiter cho thumbnail endpoint (public)
const thumbLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 100, // 100 requests/IP/phút
  message: {
    success: false,
    message: "Quá nhiều yêu cầu, vui lòng thử lại sau",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ═══════════════════════════════════════════════════════════════
// 🔓 PUBLIC ENDPOINT - Thumbnail (không cần auth)
// ═══════════════════════════════════════════════════════════════
router.get("/files/:id/thumb", thumbLimiter, fileController.streamThumbnail);

// ═══════════════════════════════════════════════════════════════
// 🔒 PROTECTED ENDPOINTS - Cần authentication
// ═══════════════════════════════════════════════════════════════
router.use(authentication.loginRequired);

// Upload files for a task (no comment)
router.post(
  "/congviec/:congViecId/files",
  upload.array("files"),
  verifyMagicAndTotalSize,
  fileController.uploadForTask
);

// Create comment + files in one request
router.post(
  "/congviec/:congViecId/comments",
  upload.array("files"),
  verifyMagicAndTotalSize,
  fileController.createCommentWithFiles
);

// List by task
router.get("/congviec/:congViecId/files", fileController.listByTask);

// Count by task
router.get("/congviec/:congViecId/files/count", fileController.countByTask);

// List by comment
router.get("/binhluan/:binhLuanId/files", fileController.listByComment);

// Stream inline & download
router.get("/files/:id/inline", fileController.streamInline);
router.get("/files/:id/download", fileController.streamDownload);

// Delete & update meta
router.delete("/files/:id", fileController.deleteFile);
router.patch("/files/:id", fileController.renameOrUpdateDesc);

module.exports = router;
