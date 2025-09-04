const express = require("express");
const router = express.Router();
const multer = require("multer");
const upload = multer({ dest: "tmp/uploads" });
const backupController = require("../controllers/backup.controller");
const {
  adminRequired,
  loginRequired,
} = require("../middlewares/authentication");

// Tạo & tải xuống ngay 1 bản backup mới
router.get("/download", adminRequired, backupController.createAndDownload);

// Liệt kê các file backup đã tạo trên server
router.get("/list", adminRequired, backupController.listBackups);

// Restore từ file upload (zip)
router.post(
  "/restore",
  adminRequired,
  upload.single("file"),
  backupController.restore
);

module.exports = router;
