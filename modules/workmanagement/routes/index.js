const express = require("express");
const router = express.Router();

// Import các routes
const quanLyNhanVienRoutes = require("./quanlynhanvien.api");
const giaoNhiemVuRoutes = require("./giaoNhiemVu.api");
const congViecRoutes = require("./congViec.api");
const quanLyNhanVienRelationRoutes = require("./quanLyNhanVien.routes");
const nhomViecUserRoutes = require("./nhomViecUser.routes");

// Sử dụng các routes
router.use("/quan-ly-nhan-vien", quanLyNhanVienRoutes);
router.use("/giao-nhiem-vu", giaoNhiemVuRoutes);
router.use("/quanlynhanvien", quanLyNhanVienRelationRoutes); // Routes cho quan hệ quản lý
router.use("/nhom-viec-user", nhomViecUserRoutes); // Routes cho nhóm việc user
router.use("/", congViecRoutes); // Routes cho công việc

module.exports = router;
