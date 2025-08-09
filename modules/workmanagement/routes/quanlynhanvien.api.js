var express = require("express");
var router = express.Router();

const quanLyNhanVienController = require("../controllers/quanLyNhanVienController");

/**
 * @route GET /api/workmanagement/quan-ly-nhan-vien/giaoviec/:nhanVienId
 * @description Lấy danh sách nhân viên được giao việc bởi nhanVienId
 * @access Private
 */
router.get(
  "/giaoviec/:nhanVienId",
  quanLyNhanVienController.getGiaoViecByNhanVienQuanLy
);

/**
 * @route GET /api/workmanagement/quan-ly-nhan-vien/chamkpi/:nhanVienId
 * @description Lấy danh sách nhân viên được chấm KPI bởi nhanVienId
 * @access Private
 */
router.get(
  "/chamkpi/:nhanVienId",
  quanLyNhanVienController.getChamKPIByNhanVienQuanLy
);

/**
 * @route POST /api/workmanagement/quan-ly-nhan-vien/batch
 * @description Tạo nhiều quan hệ quản lý cùng lúc
 * @access Private
 */
router.post("/batch", quanLyNhanVienController.createBatchQuanLyNhanVien);

/**
 * @route DELETE /api/workmanagement/quan-ly-nhan-vien/batch
 * @description Xóa nhiều quan hệ quản lý cùng lúc
 * @access Private
 */
router.delete("/batch", quanLyNhanVienController.deleteBatchQuanLyNhanVien);

/**
 * @route POST /api/workmanagement/quan-ly-nhan-vien/sync
 * @description Sync toàn bộ danh sách quan hệ quản lý
 * @access Private
 */
router.post(
  "/sync",
  (req, res, next) => {
    console.log("=== SYNC REQUEST DEBUG ===");
    console.log("Request body:", JSON.stringify(req.body, null, 2));
    console.log("Request body keys:", Object.keys(req.body));
    console.log("========================");
    next();
  },
  quanLyNhanVienController.syncQuanLyNhanVienList
);

/**
 * @route PUT /api/workmanagement/quan-ly-nhan-vien/:id/loai
 * @description Chuyển đổi loại quản lý (Giao_Viec <-> KPI)
 * @access Private
 */
router.put("/:id/loai", quanLyNhanVienController.updateLoaiQuanLy);

module.exports = router;
