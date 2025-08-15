const QuanLyNhanVien = require("../models/QuanLyNhanVien");
const NhanVien = require("../../../models/NhanVien");
const { AppError, catchAsync } = require("../../../helpers/utils");
const mongoose = require("mongoose");

const service = {};

/**
 * Lấy danh sách nhân viên được quản lý bởi một nhân viên
 * @param {string} nhanVienQuanLyId - ID của nhân viên quản lý
 * @returns {Array} Danh sách nhân viên được quản lý
 */
service.getNhanVienDuocQuanLy = async (nhanVienQuanLyId, options = {}) => {
  if (!mongoose.Types.ObjectId.isValid(nhanVienQuanLyId)) {
    throw new AppError(400, "ID nhân viên không hợp lệ");
  }

  // Cho phép truyền vào mảng LoaiQuanLy cần lấy; mặc định lấy cả KPI & Giao_Viec
  let { loaiQuanLy } = options; // có thể là string | string[] | undefined
  let loaiArray;
  if (!loaiQuanLy) {
    loaiArray = ["KPI", "Giao_Viec"]; // mặc định cả hai
  } else if (Array.isArray(loaiQuanLy)) {
    loaiArray = loaiQuanLy.filter((l) => ["KPI", "Giao_Viec"].includes(l));
  } else if (typeof loaiQuanLy === "string") {
    // hỗ trợ chuỗi phân tách bởi dấu phẩy
    loaiArray = loaiQuanLy
      .split(",")
      .map((s) => s.trim())
      .filter((l) => ["KPI", "Giao_Viec"].includes(l));
  }
  if (!loaiArray || loaiArray.length === 0) loaiArray = ["KPI", "Giao_Viec"]; // fallback

  const quanLyRecords = await QuanLyNhanVien.find({
    NhanVienQuanLy: nhanVienQuanLyId,
    LoaiQuanLy: { $in: loaiArray },
    isDeleted: false,
  })
    .populate({
      path: "NhanVienDuocQuanLy",
      select: "_id Ten MaNhanVien Email SoDienThoai ChucVu ChucDanh KhoaID",
      populate: {
        path: "KhoaID",
        select: "TenKhoa MaKhoa",
      },
    })
    .lean();

  // Dedupe theo _id vì một nhân viên có thể xuất hiện ở cả hai loại quan hệ
  const map = new Map();
  for (const record of quanLyRecords) {
    const nv = record.NhanVienDuocQuanLy;
    if (nv && !nv.isDeleted) {
      map.set(nv._id.toString(), nv);
    }
  }
  return Array.from(map.values());
};

/**
 * Lấy thông tin nhân viên quản lý và danh sách được quản lý
 * @param {string} nhanVienQuanLyId - ID của nhân viên quản lý
 * @returns {Object} Thông tin nhân viên quản lý và danh sách được quản lý
 */
service.getThongTinQuanLy = async (nhanVienQuanLyId) => {
  if (!mongoose.Types.ObjectId.isValid(nhanVienQuanLyId)) {
    throw new AppError(400, "ID nhân viên không hợp lệ");
  }

  // Lấy thông tin nhân viên quản lý
  const nhanVienQuanLy = await NhanVien.findById(nhanVienQuanLyId)
    .populate("KhoaID", "TenKhoa MaKhoa")
    .select("_id Ten MaNhanVien Email SoDienThoai ChucVu ChucDanh KhoaID")
    .lean();

  if (!nhanVienQuanLy) {
    throw new AppError(404, "Không tìm thấy nhân viên");
  }

  // Lấy danh sách nhân viên được quản lý
  const nhanVienDuocQuanLy = await service.getNhanVienDuocQuanLy(
    nhanVienQuanLyId
  );

  return {
    nhanVienQuanLy,
    nhanVienDuocQuanLy,
    tongSoNhanVienQuanLy: nhanVienDuocQuanLy.length,
  };
};

/**
 * Thêm quan hệ quản lý mới
 * @param {string} nhanVienQuanLyId - ID nhân viên quản lý
 * @param {string} nhanVienDuocQuanLyId - ID nhân viên được quản lý
 * @param {string} loaiQuanLy - Loại quản lý (KPI hoặc Giao_Viec)
 * @returns {Object} Quan hệ quản lý mới được tạo
 */
service.themQuanHe = async (
  nhanVienQuanLyId,
  nhanVienDuocQuanLyId,
  loaiQuanLy = "Giao_Viec"
) => {
  // Kiểm tra tồn tại quan hệ
  const existingRelation = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: nhanVienQuanLyId,
    NhanVienDuocQuanLy: nhanVienDuocQuanLyId,
    LoaiQuanLy: loaiQuanLy,
    isDeleted: false,
  });

  if (existingRelation) {
    throw new AppError(400, "Quan hệ quản lý đã tồn tại");
  }

  const newRelation = new QuanLyNhanVien({
    NhanVienQuanLy: nhanVienQuanLyId,
    NhanVienDuocQuanLy: nhanVienDuocQuanLyId,
    LoaiQuanLy: loaiQuanLy,
  });

  await newRelation.save();
  return newRelation;
};

/**
 * Xóa quan hệ quản lý (soft delete)
 * @param {string} nhanVienQuanLyId - ID nhân viên quản lý
 * @param {string} nhanVienDuocQuanLyId - ID nhân viên được quản lý
 * @returns {Object} Kết quả xóa
 */
service.xoaQuanHe = async (nhanVienQuanLyId, nhanVienDuocQuanLyId) => {
  const result = await QuanLyNhanVien.findOneAndUpdate(
    {
      NhanVienQuanLy: nhanVienQuanLyId,
      NhanVienDuocQuanLy: nhanVienDuocQuanLyId,
      isDeleted: false,
    },
    { isDeleted: true },
    { new: true }
  );

  if (!result) {
    throw new AppError(404, "Không tìm thấy quan hệ quản lý");
  }

  return result;
};

module.exports = service;
