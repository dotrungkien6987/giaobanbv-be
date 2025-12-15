const { body } = require("express-validator");
const { sendResponse, catchAsync, AppError } = require("../helpers/utils");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const Khoa = require("../models/Khoa");
const userController = {};

userController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  console.log(req.body);
  let {
    UserName,
    Email,
    PassWord,
    KhoaID,
    NhanVienID,
    HoTen,
    PhanQuyen,
    KhoaTaiChinh,
    UserHis,
    DashBoard,
    KhoaLichTruc,
  } = req.body;

  //Business Logic Validation
  let user = await User.findOne({ UserName });
  if (user)
    throw new AppError(400, "User already exists", "Registration Error");
  // const user = await User.findOne({ UserName }, "+PassWord");
  //Process
  const salt = await bcrypt.genSalt(10);
  PassWord = await bcrypt.hash(PassWord, salt);
  user = await User.create({
    UserName,
    Email,
    PassWord,
    KhoaID,
    NhanVienID,
    HoTen,
    PhanQuyen,
    KhoaTaiChinh,
    UserHis,
    DashBoard,
    KhoaLichTruc,
  });

  user = await User.findById(user._id).populate("KhoaID");
  const userWithTenKhoa = {
    ...user.toObject(),
  };
  const accessToken = await user.generateToken();
  //Response
  sendResponse(
    res,
    200,
    true,
    { user: userWithTenKhoa, accessToken },
    null,
    "Created User success"
  );
});

userController.getCurrentUser = catchAsync(async (req, res, next) => {
  const curentUserId = req.userId;

  const user = await User.findById(curentUserId).populate("KhoaID");
  if (!user)
    throw new AppError(400, "User not found", "Get current User Error");
  return sendResponse(
    res,
    200,
    true,
    user,
    null,
    "Get current User successful"
  );
});

/**
 * Get current user with full NhanVien info (including NhanVien.KhoaID)
 * Used for Work Management module that needs NhanVien.KhoaID instead of User.KhoaID
 */
userController.getCurrentUserFull = catchAsync(async (req, res, next) => {
  const curentUserId = req.userId;

  const user = await User.findById(curentUserId).populate("KhoaID");
  if (!user)
    throw new AppError(400, "User not found", "Get current User Error");

  let nhanVien = null;
  let nhanVienKhoaId = null;

  // Populate NhanVien with KhoaID if user has NhanVienID
  if (user.NhanVienID) {
    const NhanVien = require("../models/NhanVien");
    nhanVien = await NhanVien.findById(user.NhanVienID).populate("KhoaID");

    if (nhanVien && nhanVien.KhoaID) {
      // Extract KhoaID as string or object ID
      nhanVienKhoaId = nhanVien.KhoaID._id
        ? nhanVien.KhoaID._id.toString()
        : nhanVien.KhoaID.toString();
    }
  }

  return sendResponse(
    res,
    200,
    true,
    {
      user,
      nhanVien,
      nhanVienKhoaId,
    },
    null,
    "Get current User with full info successful"
  );
});

userController.getAllUsers = catchAsync(async (req, res, next) => {
  let users = await User.find({ isDeleted: false })
    .populate("KhoaID")
    .populate("NhanVienID");

  return sendResponse(res, 200, true, { users }, null, "");
});

userController.getUsers = catchAsync(async (req, res, next) => {
  const curentUserId = req.userId;
  let { page, limit, ...filter } = { ...req.query };

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const filterConditions = [{ isDeleted: false }];

  if (filter.UserName) {
    // filterConditions.push({ UserName: { $regex: filter.UserName, $options: "i" } });
    filterConditions.push({
      $or: [
        { UserName: { $regex: filter.UserName, $options: "i" } },
        { HoTen: { $regex: filter.UserName, $options: "i" } },
        { PhanQuyen: { $regex: filter.UserName, $options: "i" } },
      ],
    });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await User.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  console.log("filter", filterConditions);
  let users = await User.find(filterCriteria)
    .select("+PassWord")
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(res, 200, true, { users, totalPages, count }, null, "");
});

userController.updateUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  console.log("userID", userId);
  let user = await User.findById(userId);
  if (!user) throw new AppError(400, "User not found", "Update  User Error");

  const allows = [
    "Email",
    "HoTen",
    "KhoaID",
    "NhanVienID",
    "PhanQuyen",
    "UserName",
    "KhoaTaiChinh",
    "UserHis",
    "DashBoard",
    "KhoaLichTruc",
  ];
  // const salt = await bcrypt.genSalt(10);
  // let PassWord = req.body["PassWord"]

  // PassWord = await bcrypt.hash(PassWord, salt);
  allows.forEach((field) => {
    if (req.body[field] !== undefined) {
      user[field] = req.body[field];
    }
  });
  // user["PassWord"] =PassWord;
  await user.save();
  user = await User.findById(userId).populate("KhoaID");
  return sendResponse(res, 200, true, user, null, "Update User successful");
});

userController.resetPass = catchAsync(async (req, res, next) => {
  const userId = req.params.id;
  console.log("userID", userId);
  let user = await User.findById(userId);
  if (!user) throw new AppError(400, "User not found", "Update  User Error");

  const salt = await bcrypt.genSalt(10);
  let PassWord = req.body["PassWord"];

  PassWord = await bcrypt.hash(PassWord, salt);

  user["PassWord"] = PassWord;
  await user.save();
  return sendResponse(res, 200, true, user, null, "Update User successful");
});

userController.resetPassMe = catchAsync(async (req, res, next) => {
  //get data from request
  console.log("body", req.body);
  let { UserName, PassWordOld, PassWordNew } = req.body;

  //Business Logic Validation
  let user = await User.findOne({ UserName }, "+PassWord");

  if (!user) throw new AppError(400, "Không tồn tại user", "Reset pass error");
  //Process
  let isMatch = await bcrypt.compare(PassWordOld, user.PassWord);
  if (!isMatch)
    throw new AppError(400, "Mật khẩu cũ không đúng", "Reset pass error");

  const salt = await bcrypt.genSalt(10);
  PassWordNew = await bcrypt.hash(PassWordNew, salt);
  user.PassWord = PassWordNew;
  await user.save();
  //Response
  sendResponse(res, 200, true, { user }, null, "Reset Pass success");
});

userController.deleteUser = catchAsync(async (req, res, next) => {
  const userId = req.params.id;

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
    },
    { isDeleted: true },
    { new: true }
  );

  return sendResponse(res, 200, true, user, null, "Delete User successful");
});

module.exports = userController;
