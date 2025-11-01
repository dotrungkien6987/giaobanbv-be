const express = require("express");
const router = express.Router();
const assignmentController = require("../controllers/assignment.controller");
const { loginRequired } = require("../../auth/authMiddleware");

/**
 * @route   GET /api/workmanagement/giao-nhiem-vu
 * @desc    Lấy danh sách nhiệm vụ của nhân viên theo chu kỳ
 * @access  Private
 * @query   { nhanVienId, chuKyId }
 */
router.get("/", loginRequired, assignmentController.layDanhSachNhiemVu);

/**
 * @route   POST /api/workmanagement/giao-nhiem-vu/tu-cham-diem-batch
 * @desc    Nhân viên tự chấm điểm nhiều nhiệm vụ (Batch)
 * @access  Private
 * @body    { assignments: [{ assignmentId, DiemTuDanhGia }] }
 */
router.post(
  "/tu-cham-diem-batch",
  loginRequired,
  assignmentController.nhanVienTuChamDiemBatch
);

module.exports = router;
