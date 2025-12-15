/**
 * @fileoverview LyDoTuChoi Routes
 * @description Routes cho quản lý lý do từ chối (Admin only - toàn hệ thống)
 *
 * Base path: /api/workmanagement/ly-do-tu-choi
 */

const express = require("express");
const router = express.Router();

const authentication = require("../../../middlewares/authentication");
const lyDoTuChoiController = require("../controllers/lyDoTuChoi.controller");

// Middleware authentication cho tất cả routes
router.use(authentication.loginRequired);

/**
 * @route   GET /api/workmanagement/ly-do-tu-choi
 * @desc    Lấy tất cả lý do từ chối (active)
 * @access  Private
 * @query   chiLayHoatDong=true/false (default: true)
 */
router.get("/", lyDoTuChoiController.layTatCa);

/**
 * @route   POST /api/workmanagement/ly-do-tu-choi
 * @desc    Tạo lý do từ chối mới
 * @access  Private - Admin only
 * @body    Ten, MoTa?, ThuTu?
 */
router.post("/", lyDoTuChoiController.tao);

/**
 * @route   PUT /api/workmanagement/ly-do-tu-choi/:id
 * @desc    Cập nhật lý do từ chối
 * @access  Private - Admin only
 * @body    Ten?, MoTa?, ThuTu?, IsActive?
 */
router.put("/:id", lyDoTuChoiController.capNhat);

/**
 * @route   DELETE /api/workmanagement/ly-do-tu-choi/:id
 * @desc    Xóa lý do từ chối (soft delete)
 * @access  Private - Admin only
 */
router.delete("/:id", lyDoTuChoiController.xoa);

module.exports = router;
