const express = require("express");
const router = express.Router();
const fileController = require("../controllers/file.controller");

// API upload file
router.post("/upload", fileController.uploadFile);

// API download file
router.get("/download/:filename", fileController.downloadFile);

// API lấy file để view trên FE
router.get("/view/:filename", fileController.viewFile);

module.exports = router;