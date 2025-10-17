const { AppError } = require("../../../helpers/utils");
const User = require("../../../models/User");
const QuanLyNhanVien = require("../models/QuanLyNhanVien");

/**
 * Middleware kiểm tra và lấy thông tin nhân viên từ User
 * Gắn NhanVienID vào req.currentNhanVienID để controller sử dụng
 *
 * @param {String} loaiQuanLy - Loại quan hệ quản lý: "KPI" hoặc "Giao_Viec"
 * @returns {Function} Express middleware
 */
const validateQuanLy = (loaiQuanLy = "KPI") => {
  return async (req, res, next) => {
    try {
      const currentUserId = req.userId; // Từ authentication middleware

      if (!currentUserId) {
        throw new AppError(401, "Vui lòng đăng nhập");
      }

      // Lấy thông tin User kèm NhanVienID
      const currentUser = await User.findById(currentUserId).select(
        "NhanVienID PhanQuyen username"
      );

      if (!currentUser) {
        throw new AppError(404, "Không tìm thấy thông tin người dùng");
      }

      if (!currentUser.NhanVienID) {
        throw new AppError(
          400,
          "Tài khoản chưa được liên kết với nhân viên. Vui lòng liên hệ Admin"
        );
      }

      // Gắn thông tin vào request để controller sử dụng
      req.currentNhanVienID = currentUser.NhanVienID;
      req.currentUserPhanQuyen = currentUser.PhanQuyen;
      req.currentUsername = currentUser.username;

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware kiểm tra quyền quản lý nhân viên cụ thể
 * Sử dụng cho các route có :nhanVienId hoặc body.NhanVienID
 *
 * @param {String} loaiQuanLy - Loại quan hệ quản lý
 * @param {String} paramName - Tên param hoặc body field chứa NhanVienID
 * @returns {Function} Express middleware
 */
const checkQuanLyPermission = (
  loaiQuanLy = "KPI",
  paramName = "nhanVienId"
) => {
  return async (req, res, next) => {
    try {
      // Lấy NhanVienID cần kiểm tra từ params hoặc body
      const nhanVienId = req.params[paramName] || req.body.NhanVienID;
      const currentNhanVienID = req.currentNhanVienID;

      if (!currentNhanVienID) {
        throw new AppError(
          400,
          "Thiếu thông tin nhân viên. Vui lòng kiểm tra lại middleware validateQuanLy"
        );
      }

      if (!nhanVienId) {
        throw new AppError(
          400,
          `Thiếu thông tin nhân viên cần kiểm tra (${paramName})`
        );
      }

      // Admin có quyền bypass
      if (req.currentUserPhanQuyen >= 3) {
        return next();
      }

      // Kiểm tra quan hệ quản lý trong database
      const quanHe = await QuanLyNhanVien.findOne({
        NhanVienQuanLy: currentNhanVienID,
        NhanVienDuocQuanLy: nhanVienId,
        LoaiQuanLy: loaiQuanLy,
        isDeleted: { $ne: true },
      });

      if (!quanHe) {
        throw new AppError(
          403,
          `Bạn không có quyền ${
            loaiQuanLy === "KPI" ? "chấm KPI" : "giao việc"
          } cho nhân viên này`
        );
      }

      // Gắn thông tin quan hệ quản lý vào request (optional)
      req.quanHeQuanLy = quanHe;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  validateQuanLy,
  checkQuanLyPermission,
};
