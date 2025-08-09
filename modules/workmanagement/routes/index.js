const express = require("express");
const router = express.Router();

// Import các routes
const quanLyNhanVienRoutes = require("./quanlynhanvien.api");
const giaoNhiemVuRoutes = require("./giaoNhiemVu.api");

// Sử dụng các routes
router.use("/quan-ly-nhan-vien", quanLyNhanVienRoutes);
router.use("/giao-nhiem-vu", giaoNhiemVuRoutes);

module.exports = router;
