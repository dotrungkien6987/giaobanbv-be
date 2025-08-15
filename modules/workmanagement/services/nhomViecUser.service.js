const NhomViecUser = require("../models/NhomViecUser");
const { AppError, catchAsync } = require("../../../helpers/utils");
const mongoose = require("mongoose");

const service = {};

/**
 * Lấy danh sách nhóm việc của người dùng
 * @param {string} nguoiTaoId - ID của người tạo nhóm việc
 * @returns {Array} Danh sách nhóm việc
 */
service.getNhomViecByNguoiTao = async (nguoiTaoId) => {
  if (!mongoose.Types.ObjectId.isValid(nguoiTaoId)) {
    throw new AppError(400, "ID người tạo không hợp lệ");
  }

  const nhomViecs = await NhomViecUser.find({
    NguoiTaoID: nguoiTaoId,
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .select("_id TenNhom MoTa TrangThaiHoatDong createdAt")
    .sort({ createdAt: -1 })
    .lean();

  return nhomViecs;
};

// Lấy tất cả nhóm việc active (dành cho admin)
service.getAllActive = async () => {
  const nhomViecs = await NhomViecUser.find({
    TrangThaiHoatDong: true,
    isDeleted: false,
  })
    .select("_id TenNhom MoTa TrangThaiHoatDong createdAt NguoiTaoID")
    .sort({ createdAt: -1 })
    .lean();
  return nhomViecs;
};

/**
 * Tạo nhóm việc mới
 * @param {Object} nhomViecData - Dữ liệu nhóm việc
 * @param {Object} req - Request object chứa thông tin user
 * @returns {Object} Nhóm việc vừa tạo
 */
service.createNhomViec = async (nhomViecData, req) => {
  const newNhomViecData = {
    TenNhom: nhomViecData.TenNhom,
    MoTa: nhomViecData.MoTa || "",
    TrangThaiHoatDong: nhomViecData.TrangThaiHoatDong !== false,
  };

  // Add creator info if available
  if (req?.user?._id) {
    newNhomViecData.NguoiTaoID = req.user._id;
  }

  const nhomViec = new NhomViecUser(newNhomViecData);
  await nhomViec.save();

  return nhomViec;
};

/**
 * Cập nhật nhóm việc
 * @param {string} nhomViecId - ID nhóm việc
 * @param {Object} updateData - Dữ liệu cập nhật
 * @param {Object} req - Request object chứa thông tin user
 * @returns {Object} Nhóm việc đã cập nhật
 */
service.updateNhomViec = async (nhomViecId, updateData, req) => {
  if (!mongoose.Types.ObjectId.isValid(nhomViecId)) {
    throw new AppError(400, "ID nhóm việc không hợp lệ");
  }

  const nhomViec = await NhomViecUser.findOne({
    _id: nhomViecId,
    NguoiTaoID: req?.user?._id, // Chỉ cho phép chủ sở hữu cập nhật
    isDeleted: false,
  });

  if (!nhomViec) {
    throw new AppError(
      404,
      "Không tìm thấy nhóm việc hoặc không có quyền chỉnh sửa"
    );
  }

  // Update fields
  Object.keys(updateData).forEach((key) => {
    if (updateData[key] !== undefined && key !== "NguoiTaoID") {
      nhomViec[key] = updateData[key];
    }
  });

  await nhomViec.save();
  return nhomViec;
};

/**
 * Xóa nhóm việc (soft delete)
 * @param {string} nhomViecId - ID nhóm việc
 * @param {Object} req - Request object chứa thông tin user
 * @returns {Boolean} Kết quả xóa
 */
service.deleteNhomViec = async (nhomViecId, req) => {
  if (!mongoose.Types.ObjectId.isValid(nhomViecId)) {
    throw new AppError(400, "ID nhóm việc không hợp lệ");
  }

  const nhomViec = await NhomViecUser.findOne({
    _id: nhomViecId,
    NguoiTaoID: req?.user?._id, // Chỉ cho phép chủ sở hữu xóa
    isDeleted: false,
  });

  if (!nhomViec) {
    throw new AppError(404, "Không tìm thấy nhóm việc hoặc không có quyền xóa");
  }

  nhomViec.isDeleted = true;
  nhomViec.deletedAt = new Date();
  await nhomViec.save();

  return true;
};

module.exports = service;
