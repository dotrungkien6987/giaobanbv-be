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
  congViecController.getReceivedCongViecs,
);

/**
 * @route   GET /api/workmanagement/congviec/:nhanvienid/assigned
 * @desc    Lấy công việc mà nhân viên là người giao việc
 * @access  Private
 * @query   page, limit, search, TrangThai, MucDoUuTien, NgayBatDau, NgayHetHan
 */
router.get(
  "/congviec/:nhanvienid/assigned",
  congViecController.getAssignedCongViecs,
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
// Tree endpoints
router.get("/congviec/:id/tree-root", congViecController.getTreeRoot);
router.get("/congviec/:id/tree-children", congViecController.getTreeChildren);
router.get("/congviec/:id/full-tree", congViecController.getFullTree);
// (Removed) Ancestors endpoint no longer used by FE; controller removed to simplify codebase
// router.get("/congviec/:id/ancestors", congViecController.getAncestors);

// Subtasks (Slim Plan)
router.post(
  "/congviec/:id/subtasks",
  congViecController.createSubtask, // body giống create công việc nhưng bỏ qua CongViecChaID client (server set)
);
router.get(
  "/congviec/:id/children",
  congViecController.listChildrenCongViec, // danh sách con trực tiếp
);

// ========================================
// Danh sách nhiệm vụ thường quy theo chu kỳ
// ========================================
router.get("/nhiemvuthuongquy/my", async (req, res, next) => {
  try {
    // ✅ FIX: Dùng req.user.NhanVienID thay vì req.nhanVienId (legacy)
    let nhanVienId = req.user?.NhanVienID;

    // Fallback: Nếu không có, resolve từ User model
    if (!nhanVienId && req.userId) {
      try {
        const User = require("../../../models/User");
        const user = await User.findById(req.userId)
          .select("NhanVienID")
          .lean();
        nhanVienId = user?.NhanVienID;
      } catch (e) {
        // Ignore resolve errors
      }
    }

    // Nếu không có nhanVienId → Return empty
    if (!nhanVienId) {
      return res.json({ success: true, data: [] });
    }

    // ✅ NEW: Nhận query param chuKyId (optional)
    const { chuKyId } = req.query;

    const data = await congViecService.getMyRoutineTasks(nhanVienId, {
      chuKyId: chuKyId || undefined,
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

// ✅ NEW: Lấy danh sách chu kỳ (cho dropdown)
router.get("/chu-ky-danh-gia/list", async (req, res, next) => {
  try {
    const data = await congViecService.getDanhSachChuKy();
    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
});

/**
 * @route   GET /api/workmanagement/congviec/dashboard-by-nhiemvu
 * @desc    Get dashboard metrics for a NhiemVuThuongQuy during KPI evaluation
 * @access  Private
 * @query   nhiemVuThuongQuyID, nhanVienID, chuKyDanhGiaID
 */
router.get(
  "/congviec/dashboard-by-nhiemvu",
  congViecController.getDashboardByNhiemVu,
);

/**
 * @route   GET /api/workmanagement/congviec/summary-other-tasks
 * @desc    Get summary of "other" tasks (ALL non-NVTQ tasks) for KPI evaluation
 * @access  Private
 * @query   nhanVienID, chuKyDanhGiaID
 */
router.get(
  "/congviec/summary-other-tasks",
  congViecController.getOtherTasksSummary,
);

/**
 * @route   GET /api/workmanagement/congviec/summary-collab-tasks
 * @desc    Get summary of collaboration tasks (VaiTro=PHOI_HOP) for KPI evaluation
 * @access  Private
 * @query   nhanVienID, chuKyDanhGiaID
 */
router.get(
  "/congviec/summary-collab-tasks",
  congViecController.getCollabTasksSummary,
);

/**
 * @route   GET /api/workmanagement/congviec/dashboard/:nhanVienId
 * @desc    Get comprehensive dashboard stats (general, not KPI-specific)
 * @access  Private
 * @param   nhanVienId - Employee ID
 */
router.get(
  "/congviec/dashboard/:nhanVienId",
  congViecController.getCongViecDashboard,
);

/**
 * @route   GET /api/workmanagement/congviec/summary/:nhanVienId
 * @desc    Get lightweight summary for Trang chủ (total, urgent counts)
 * @access  Private
 * @param   nhanVienId - Employee ID
 */
router.get(
  "/congviec/summary/:nhanVienId",
  congViecController.getCongViecSummary,
);

/**
 * @route   GET /api/workmanagement/congviec/urgent/:nhanVienId
 * @desc    Get urgent tasks with upcoming deadlines for Home page
 * @access  Private
 * @param   nhanVienId - Employee ID
 * @query   limit (default 5), daysAhead (default 3)
 */
router.get("/congviec/urgent/:nhanVienId", congViecController.getUrgentTasks);

/**
 * @route   GET /api/workmanagement/congviec/summary-cross-cycle-tasks
 * @desc    Get summary of tasks assigned to NVTQ from previous cycles
 * @access  Private
 * @query   nhanVienID, chuKyDanhGiaID
 */
router.get(
  "/congviec/summary-cross-cycle-tasks",
  congViecController.getCrossCycleTasksSummary,
);

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

// Gán nhiệm vụ thường quy
router.post(
  "/congviec/:id/assign-routine-task",
  congViecController.assignRoutineTask,
);

// Flow actions
router.post("/congviec/:id/giao-viec", congViecController.giaoViec);
router.post("/congviec/:id/tiep-nhan", congViecController.tiepNhan);
router.post("/congviec/:id/hoan-thanh", congViecController.hoanThanh);
router.post(
  "/congviec/:id/duyet-hoan-thanh",
  congViecController.duyetHoanThanh,
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
  congViecController.updateHistoryNote,
);
// Cập nhật ghi chú lịch sử tiến độ
router.put(
  "/congviec/:id/progress-history/:index/note",
  congViecController.updateProgressHistoryNote,
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

/**
 * @route   GET /api/workmanagement/congviec/hoat-dong-gan-day
 * @desc    📊 DASHBOARD: Lấy hoạt động gần đây (LichSuTrangThai, LichSuTienDo, BinhLuan)
 * @access  Private
 * @query   limit (default 20), tuNgay, denNgay
 */
router.get("/congviec/hoat-dong-gan-day", congViecController.layHoatDongGanDay);

module.exports = router;
