/**
 * @fileoverview DanhMucYeuCau Routes
 * @description Routes cho quản lý danh mục loại yêu cầu theo Khoa
 *
 * Base path: /api/workmanagement/danh-muc-yeu-cau
 */

const express = require("express");
const router = express.Router();

const authentication = require("../../../middlewares/authentication");
const danhMucYeuCauController = require("../controllers/danhMucYeuCau.controller");

// Middleware authentication cho tất cả routes
router.use(authentication.loginRequired);

/**
 * @route   GET /api/workmanagement/danh-muc-yeu-cau/khoa-co-danh-muc
 * @desc    Lấy danh sách khoa có danh mục yêu cầu (để tạo yêu cầu)
 * @access  Private
 */
router.get("/khoa-co-danh-muc", danhMucYeuCauController.layKhoaCoDanhMuc);

/**
 * @route   GET /api/workmanagement/danh-muc-yeu-cau
 * @desc    Lấy danh mục yêu cầu theo Khoa
 * @access  Private
 * @query   khoaId (required), chiLayHoatDong=true/false
 */
router.get("/", danhMucYeuCauController.layTheoKhoa);

/**
 * @route   PUT /api/workmanagement/danh-muc-yeu-cau/sap-xep
 * @desc    Sắp xếp lại thứ tự danh mục
 * @access  Private - Quản lý Khoa hoặc Admin
 * @body    khoaId, items: [{ id, thuTu }, ...]
 */
router.put("/sap-xep", danhMucYeuCauController.sapXep);

/**
 * @route   POST /api/workmanagement/danh-muc-yeu-cau
 * @desc    Tạo danh mục mới
 * @access  Private - Quản lý Khoa hoặc Admin
 * @body    KhoaID, TenLoaiYeuCau, MoTa?, ThoiGianDuKien?, DonViThoiGian?
 */
router.post("/", danhMucYeuCauController.tao);

/**
 * @route   PUT /api/workmanagement/danh-muc-yeu-cau/:id
 * @desc    Cập nhật danh mục
 * @access  Private - Quản lý Khoa hoặc Admin
 * @body    TenLoaiYeuCau?, MoTa?, ThoiGianDuKien?, DonViThoiGian?, TrangThai?, ThuTu?
 */
router.put("/:id", danhMucYeuCauController.capNhat);

/**
 * @route   DELETE /api/workmanagement/danh-muc-yeu-cau/:id
 * @desc    Xóa danh mục (soft delete)
 * @access  Private - Quản lý Khoa hoặc Admin
 */
router.delete("/:id", danhMucYeuCauController.xoa);

module.exports = router;
