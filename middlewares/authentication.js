const jwt = require("jsonwebtoken");
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY;
const { AppError, catchAsync } = require("../helpers/utils");

const User = require("../models/User");
// NhanVien references removed from loginRequired per request

const authentication = {};

authentication.loginRequired = async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    if (!tokenString)
      throw new AppError(401, "Login required", "Authentication Error");
    const token = tokenString.replace("Bearer ", "");
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET_KEY);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        throw new AppError(401, "Token expired", "Authenticate Error");
      }
      throw new AppError(401, "Token is invalid", "Authentication Error");
    }
    req.userId = payload._id;

    // ✅ FIX: Populate full user info including NhanVienID and PhanQuyen
    const user = await User.findById(req.userId)
      .select("UserName Email PhanQuyen NhanVienID KhoaID")
      .lean();
    if (!user) {
      throw new AppError(401, "User không tồn tại", "Authentication Error");
    }

    // ✅ Set đầy đủ thông tin vào req.user
    req.user = {
      userId: user._id.toString(),
      UserName: user.UserName,
      Email: user.Email,
      PhanQuyen: user.PhanQuyen,
      NhanVienID: user.NhanVienID ? user.NhanVienID.toString() : null,
      KhoaID: user.KhoaID ? user.KhoaID.toString() : null,
    };

    next();
  } catch (error) {
    next(error);
  }
};

authentication.adminRequired = catchAsync(async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    console.log(req.headers);
    console.log(tokenString);
    if (!tokenString)
      throw new AppError(401, "Login required", "Authentication Error");
    const token = tokenString.replace("Bearer ", "");
    jwt.verify(token, JWT_SECRET_KEY, (err, payload) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          throw new AppError(401, "Token expired", "Authenticate Error");
        } else {
          throw new AppError(401, "Token is invalid", "Authentication Error");
        }
      }
      req.userId = payload._id;
      // resolve nhanVienId lazily for admin guard too
      // (kept for backward compatibility in admin routes)
    });
    const user = await User.findById(req.userId);
    console.log("user", user);
    if (!(user.PhanQuyen === "admin"))
      throw new AppError(401, "Admin required", "Authenticate error");
    next();
  } catch (error) {
    next(error);
  }
});

authentication.adminOrTongtrucRequired = catchAsync(async (req, res, next) => {
  try {
    const tokenString = req.headers.authorization;
    console.log(req.headers);
    console.log(tokenString);
    if (!tokenString)
      throw new AppError(401, "Login required", "Authentication Error");
    const token = tokenString.replace("Bearer ", "");
    jwt.verify(token, JWT_SECRET_KEY, (err, payload) => {
      if (err) {
        if (err.name === "TokenExpiredError") {
          throw new AppError(401, "Token expired", "Authenticate Error");
        } else {
          throw new AppError(401, "Token is invalid", "Authentication Error");
        }
      }
      req.userId = payload._id;
    });
    const user = await User.findById(req.userId);
    console.log("user", user);
    if (!(user.PhanQuyen === "admin" || user.PhanQuyen === "manager"))
      throw new AppError(
        401,
        "Admin or Manager required",
        "Authenticate error"
      );
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = authentication;
