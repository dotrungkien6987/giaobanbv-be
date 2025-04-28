const { sendResponse, catchAsync, AppError } = require("../helpers/utils");
const NhomKhoaSoThuTu = require("../models/NhomKhoaSoThuTu");
const Khoa = require("../models/Khoa");
const mongoose = require("mongoose");

const nhomKhoaSoThuTuController = {};

/**
 * Tạo mới nhóm khoa số thứ tự
 */
nhomKhoaSoThuTuController.insertOne = catchAsync(async (req, res, next) => {
  const { TenNhom, GhiChu, DanhSachKhoa } = req.body;
  
  // Kiểm tra tính hợp lệ của danh sách khoa
  if (DanhSachKhoa && DanhSachKhoa.length > 0) {
    for (const khoa of DanhSachKhoa) {
      if (!mongoose.Types.ObjectId.isValid(khoa.KhoaID)) {
        throw new AppError(400, "ID khoa không hợp lệ", "Create NhomKhoaSoThuTu Error");
      }
      
      // Kiểm tra xem khoa có tồn tại không
      const khoaExists = await Khoa.findById(khoa.KhoaID);
      if (!khoaExists) {
        throw new AppError(404, `Không tìm thấy khoa với ID: ${khoa.KhoaID}`, "Create NhomKhoaSoThuTu Error");
      }
    }
  }
  
  const nhomKhoa = await NhomKhoaSoThuTu.create({
    TenNhom,
    GhiChu,
    DanhSachKhoa
  });
  
  return sendResponse(
    res,
    200,
    true,
    nhomKhoa,
    null,
    "Tạo nhóm khoa số thứ tự thành công"
  );
});

/**
 * Lấy tất cả các nhóm khoa
 */
nhomKhoaSoThuTuController.getAll = catchAsync(async (req, res, next) => {
  const nhomKhoas = await NhomKhoaSoThuTu.find({})
    .populate({
      path: "DanhSachKhoa.KhoaID",
      select: "TenKhoa MaKhoa LoaiKhoa HisDepartmentID"
    })
    .sort({ createdAt: -1 });
    
  return sendResponse(
    res,
    200,
    true,
    nhomKhoas,
    null,
    "Lấy danh sách nhóm khoa số thứ tự thành công"
  );
});

/**
 * Lấy thông tin nhóm khoa theo ID
 */
nhomKhoaSoThuTuController.getById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const nhomKhoa = await NhomKhoaSoThuTu.findById(id)
    .populate({
      path: "DanhSachKhoa.KhoaID",
      select: "TenKhoa MaKhoa LoaiKhoa HisDepartmentID"
    });
    
  if (!nhomKhoa) {
    throw new AppError(404, "Không tìm thấy nhóm khoa số thứ tự", "Get NhomKhoaSoThuTu Error");
  }
  
  return sendResponse(
    res,
    200,
    true,
    nhomKhoa,
    null,
    "Lấy thông tin nhóm khoa số thứ tự thành công"
  );
});

/**
 * Cập nhật thông tin nhóm khoa
 */
nhomKhoaSoThuTuController.updateOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { TenNhom, GhiChu, DanhSachKhoa } = req.body;
  
  // Kiểm tra tính hợp lệ của danh sách khoa nếu được cung cấp
  if (DanhSachKhoa && DanhSachKhoa.length > 0) {
    for (const khoa of DanhSachKhoa) {
      if (!mongoose.Types.ObjectId.isValid(khoa.KhoaID)) {
        throw new AppError(400, "ID khoa không hợp lệ", "Update NhomKhoaSoThuTu Error");
      }
      
      // Kiểm tra xem khoa có tồn tại không
      const khoaExists = await Khoa.findById(khoa.KhoaID);
      if (!khoaExists) {
        throw new AppError(404, `Không tìm thấy khoa với ID: ${khoa.KhoaID}`, "Update NhomKhoaSoThuTu Error");
      }
    }
  }
  
  const nhomKhoa = await NhomKhoaSoThuTu.findByIdAndUpdate(
    id,
    {
      TenNhom,
      GhiChu,
      DanhSachKhoa
    },
    { new: true, runValidators: true }
  ).populate({
    path: "DanhSachKhoa.KhoaID",
    select: "TenKhoa MaKhoa LoaiKhoa HisDepartmentID"
  });
  
  if (!nhomKhoa) {
    throw new AppError(404, "Không tìm thấy nhóm khoa số thứ tự", "Update NhomKhoaSoThuTu Error");
  }
  
  return sendResponse(
    res,
    200,
    true,
    nhomKhoa,
    null,
    "Cập nhật nhóm khoa số thứ tự thành công"
  );
});

/**
 * Xóa nhóm khoa
 */
nhomKhoaSoThuTuController.deleteOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  const nhomKhoa = await NhomKhoaSoThuTu.findByIdAndDelete(id);
  
  if (!nhomKhoa) {
    throw new AppError(404, "Không tìm thấy nhóm khoa số thứ tự", "Delete NhomKhoaSoThuTu Error");
  }
  
  return sendResponse(
    res,
    200,
    true,
    nhomKhoa,
    null,
    "Xóa nhóm khoa số thứ tự thành công"
  );
});

/**
 * Lấy danh sách Department IDs từ các nhóm khoa
 */
nhomKhoaSoThuTuController.getDepartmentIds = catchAsync(async (req, res, next) => {
  const nhomKhoas = await NhomKhoaSoThuTu.find({})
    .populate({
      path: "DanhSachKhoa.KhoaID",
      select: "TenKhoa MaKhoa LoaiKhoa HisDepartmentID"
    });
  
  // Trích xuất danh sách departmentIds
  let departmentIds = [];
  nhomKhoas.forEach(nhom => {
    nhom.DanhSachKhoa.forEach(khoa => {
      if (khoa.KhoaID && khoa.KhoaID.HisDepartmentID) {
        departmentIds.push(khoa.KhoaID.HisDepartmentID);
      }
    });
  });
  
  // Lọc các giá trị trùng lặp
  departmentIds = [...new Set(departmentIds)];
  
  return sendResponse(
    res,
    200,
    true,
    { departmentIds },
    null,
    "Lấy danh sách Department IDs thành công"
  );
});

module.exports = nhomKhoaSoThuTuController;