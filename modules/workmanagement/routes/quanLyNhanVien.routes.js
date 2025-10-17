const express = require("express");
const router = express.Router();
const quanLyNhanVienController = require("../controllers/quanLyNhanVienController");

// Routes cho quản lý nhân viên
router.get(
  "/:nhanvienid/managed",
  quanLyNhanVienController.getNhanVienDuocQuanLy
);
router.get("/:nhanvienid/info", quanLyNhanVienController.getThongTinQuanLy);
router.post("/:nhanvienid/add-relation", quanLyNhanVienController.themQuanHe);
router.delete("/:nhanvienid/:managedid", quanLyNhanVienController.xoaQuanHe);

module.exports = router;
