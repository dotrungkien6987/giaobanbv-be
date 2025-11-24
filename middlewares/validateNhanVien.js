const { AppError } = require("../helpers/utils");
const User = require("../models/User");

/**
 * Middleware: Kiểm tra user có NhanVienID hay không
 * Sử dụng cho các routes yêu cầu user phải là nhân viên
 */
const requireNhanVien = async (req, res, next) => {
  try {
    if (!req.userId) {
      throw new AppError(401, "Chưa đăng nhập");
    }

    const user = await User.findById(req.userId).lean();

    if (!user) {
      throw new AppError(404, "Không tìm thấy tài khoản");
    }

    if (!user.NhanVienID) {
      throw new AppError(
        400,
        "Tài khoản chưa được liên kết với nhân viên. Vui lòng liên hệ quản trị viên để được hỗ trợ."
      );
    }

    // Cache NhanVienID để dùng lại trong controllers/services
    req.nhanVienId = user.NhanVienID;
    req.userInfo = user; // Cache user info nếu cần

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireNhanVien };
