const express = require("express");
const router = express.Router();
const authentication = require("../middlewares/authentication");
const ctrl = require("../modules/workmanagement/controllers/attachments.controller");
const {
  upload,
  verifyMagicAndTotalSize,
} = require("../modules/workmanagement/middlewares/upload.middleware");

router.use(authentication.loginRequired);

// Upload: /api/attachments/:ownerType/:ownerId/:field?/files
router.post(
  "/:ownerType/:ownerId/:field?/files",
  upload.array("files"),
  verifyMagicAndTotalSize,
  ctrl.upload
);

// List files
router.get("/:ownerType/:ownerId/:field?/files", ctrl.list);

// Count files
router.get("/:ownerType/:ownerId/:field?/files/count", ctrl.count);

// Batch endpoints
// POST /api/attachments/batch-count { ownerType, field, ids: [] }
router.post("/batch-count", ctrl.batchCount);
// POST /api/attachments/batch-preview { ownerType, field, ids: [], limit? }
router.post("/batch-preview", ctrl.batchPreview);

// Stream by file id
router.get("/files/:id/inline", ctrl.streamInline);
router.get("/files/:id/download", ctrl.streamDownload);

// Delete & update file meta
router.delete("/files/:id", ctrl.deleteFile);
router.patch("/files/:id", ctrl.renameOrUpdateDesc);

module.exports = router;
