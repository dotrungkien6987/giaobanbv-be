const express = require("express");
const router = express.Router();

const authentication = require("../../../middlewares/authentication");
const congViecController = require("../controllers/congViec.controller");
const congViecService = require("../services/congViec.service");

// Middleware authentication cho tất cả routes
router.use(authentication.loginRequired);

/**
 * @route   GET /api/workmanagement/nhanvien/:nhanvienid
 * @desc    Lấy thông tin nhân viên theo ID
 * @access  Private
 */
router.get("/nhanvien/:nhanvienid", congViecController.getNhanVien);

/**
 * @route   GET /api/workmanagement/congviec/:nhanvienid/received
 * @desc    Lấy công việc mà nhân viên là người xử lý chính
 * @access  Private
 * @query   page, limit, search, TrangThai, MucDoUuTien, NgayBatDau, NgayHetHan
 */
router.get(
  "/congviec/:nhanvienid/received",
  congViecController.getReceivedCongViecs
);

/**
 * @route   GET /api/workmanagement/congviec/:nhanvienid/assigned
 * @desc    Lấy công việc mà nhân viên là người giao việc
 * @access  Private
 * @query   page, limit, search, TrangThai, MucDoUuTien, NgayBatDau, NgayHetHan
 */
router.get(
  "/congviec/:nhanvienid/assigned",
  congViecController.getAssignedCongViecs
);

/**
 * @route   DELETE /api/workmanagement/congviec/:id
 * @desc    Xóa công việc (soft delete)
 * @access  Private
 */
router.delete("/congviec/:id", congViecController.deleteCongViec);

/**
 * @route   GET /api/workmanagement/congviec/detail/:id
 * @desc    Lấy chi tiết công việc theo ID
 * @access  Private
 */
router.get("/congviec/detail/:id", congViecController.getCongViecDetail);

// Danh sách nhiệm vụ thường quy của chính nhân viên đăng nhập
router.get("/nhiemvuthuongquy/my", async (req, res, next) => {
  try {
    const nhanVienId = req.nhanVienId; // set by authentication middleware
    const data = await congViecService.getMyRoutineTasks(nhanVienId);
    console.log("Routine tasks:", data);
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   POST /api/workmanagement/congviec
 * @desc    Tạo công việc mới
 * @access  Private
 * @body    TieuDe, MoTa, NgayBatDau, NgayHetHan, MucDoUuTien, NguoiChinh, Tags
 */
router.post("/congviec", congViecController.createCongViec);

/**
 * @route   PUT /api/workmanagement/congviec/:id
 * @desc    Cập nhật công việc
 * @access  Private
 * @body    TieuDe, MoTa, NgayBatDau, NgayHetHan, MucDoUuTien, TrangThai, TienDo, Tags
 */
router.put("/congviec/:id", congViecController.updateCongViec);

// Cập nhật tiến độ (thêm lịch sử)
router.post("/congviec/:id/progress", congViecController.updateProgress);

// Flow actions
router.post("/congviec/:id/giao-viec", congViecController.giaoViec);
router.post("/congviec/:id/tiep-nhan", congViecController.tiepNhan);
router.post("/congviec/:id/hoan-thanh", congViecController.hoanThanh);
router.post(
  "/congviec/:id/duyet-hoan-thanh",
  congViecController.duyetHoanThanh
);
// Unified transition endpoint (new consolidated workflow actions)
router.post("/congviec/:id/transition", congViecController.transition);

/**
 * @route   POST /api/workmanagement/congviec/:id/comment
 * @desc    Thêm bình luận vào công việc
 * @access  Private
 * @body    NoiDung
 */
router.post("/congviec/:id/comment", congViecController.addComment);

// Cập nhật ghi chú lịch sử trạng thái (inline edit)
router.put(
  "/congviec/:id/history/:index/note",
  congViecController.updateHistoryNote
);
// Cập nhật ghi chú lịch sử tiến độ
router.put(
  "/congviec/:id/progress-history/:index/note",
  congViecController.updateProgressHistoryNote
);

/**
 * @route   DELETE /api/workmanagement/binhluan/:id
 * @desc    Thu hồi (xóa mềm) bình luận và các tệp đính kèm của bình luận
 * @access  Private
 */
router.delete("/binhluan/:id", congViecController.deleteComment);
// Thu hồi nội dung (text) của bình luận, giữ lại file đính kèm
router.patch("/binhluan/:id/text", congViecController.recallCommentText);
// Danh sách trả lời của bình luận
router.get("/binhluan/:id/replies", congViecController.listReplies);

module.exports = router;
