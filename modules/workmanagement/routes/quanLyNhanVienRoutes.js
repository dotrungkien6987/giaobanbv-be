const express = require("express");
const router = express.Router();
const quanLyNhanVienController = require("../controllers/quanLyNhanVienController");

router.get(
  "/giaoviec/:nhanVienId",
  quanLyNhanVienController.getGiaoViecByNhanVienQuanLy
);
router.get(
  "/chamkpi/:nhanVienId",
  quanLyNhanVienController.getChamKPIByNhanVienQuanLy
);
router.post("/batch", quanLyNhanVienController.createBatchQuanLyNhanVien);
router.delete("/batch", quanLyNhanVienController.deleteBatchQuanLyNhanVien);
router.post("/sync", quanLyNhanVienController.syncQuanLyNhanVienList);
router.put("/:id/loai", quanLyNhanVienController.updateLoaiQuanLy);

module.exports = router;
