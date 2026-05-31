const express = require("express");
const router = express.Router();
const authentication = require("../middlewares/authentication");
const fileController = require("../controllers/file.controller");
const { uploadLimiter } = require("../helpers/uploadRateLimit");

router.use(authentication.loginRequired);

// API upload file
router.post("/upload", uploadLimiter, fileController.uploadFile);

// API download file
router.get("/download/:filename", fileController.downloadFile);

// API lấy file để view trên FE
router.get("/view/:filename", fileController.viewFile);

module.exports = router;
