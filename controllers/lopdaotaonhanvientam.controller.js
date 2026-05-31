const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const mongoose = require("mongoose");
const LopDaoTaoNhanVienTam = require("../models/LopDaoTaoNhanVienTam");
const LopDaoTao = require("../models/LopDaoTao");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const lopdaotaonhanvientamController = {};
const LOPDAOTAO_TAM_MANAGE_ROLES = ["admin", "superadmin"];

const getCurrentUserId = (req) => {
  if (req.user?.userId) return req.user.userId;
  if (req.user?._id) return req.user._id.toString();
  if (req.userId) return req.userId;
  return null;
};

const getNormalizedRole = (req) => (req.user?.PhanQuyen || "").toLowerCase();

const isLopDaoTaoTamManageRole = (role) =>
  LOPDAOTAO_TAM_MANAGE_ROLES.includes(role);

async function assertCanManageLopDaoTaoTam(req, lopDaoTaoId) {
  const currentUserId = getCurrentUserId(req);
  if (!currentUserId) {
    throw new AppError(
      401,
      "Khong tim thay thong tin nguoi dung",
      "Authentication Error",
    );
  }

  const lopdaotao = await LopDaoTao.findById(lopDaoTaoId);
  if (!lopdaotao) {
    throw new AppError(404, "lopdaotao not found", "Update lopdaotao Error");
  }

  const role = getNormalizedRole(req);
  if (isLopDaoTaoTamManageRole(role)) {
    return lopdaotao;
  }

  if (lopdaotao.UserIDCreated?.toString() === currentUserId) {
    return lopdaotao;
  }

  throw new AppError(
    403,
    "Ban khong co quyen thao tac voi lop dao tao nay",
    "AUTHORIZATION_ERROR",
  );
}

lopdaotaonhanvientamController.insertOrUpdateLopdaotaoNhanVienTam = catchAsync(
  async (req, res, next) => {
    // Lấy dữ liệu từ request
    console.log("reqbody", req.body);
    const currentUserId = getCurrentUserId(req);
    if (!currentUserId) {
      throw new AppError(
        401,
        "Khong tim thay thong tin nguoi dung",
        "Authentication Error",
      );
    }

    const currentUserName = req.user?.UserName || "";
    const lopdaotaonhanvienData = req.body.lopdaotaonhanvienData.map(
      (item) => ({
        ...item,
        LopDaoTaoID: new mongoose.Types.ObjectId(item.LopDaoTaoID),
        NhanVienID: new mongoose.Types.ObjectId(item.NhanVienID),
        UserID: currentUserId,
        UserName: currentUserName,
      }),
    );

    console.log("lopdaotaonhanvienData", lopdaotaonhanvienData);
    const lopdaotaoID = new mongoose.Types.ObjectId(req.body.lopdaotaoID);
    const userID = currentUserId;

    await assertCanManageLopDaoTaoTam(req, lopdaotaoID);

    // Tìm tất cả các bản ghi trong LopDaoTaoNhanVienTam theo lopdaotaoID,nhanvienID
    const lopdaotaonhanvienOld = await LopDaoTaoNhanVienTam.find({
      LopDaoTaoID: lopdaotaoID,
      UserID: userID,
    });
    console.log("lopdaotaonhanvienOld", lopdaotaonhanvienOld);
    // So sánh dữ liệu
    const toInsert = [];
    const toUpdate = [];
    const toDelete = lopdaotaonhanvienOld.filter(
      (oldItem) =>
        !lopdaotaonhanvienData.some(
          (newItem) =>
            newItem.LopDaoTaoID.toString() === oldItem.LopDaoTaoID.toString() &&
            newItem.NhanVienID.toString() === oldItem.NhanVienID.toString(),
        ),
    );
    console.log("toDelete", toDelete);

    lopdaotaonhanvienData.forEach((newItem) => {
      const matchingOldItem = lopdaotaonhanvienOld.find(
        (oldItem) =>
          newItem.LopDaoTaoID.equals(oldItem.LopDaoTaoID) &&
          newItem.NhanVienID.equals(oldItem.NhanVienID),
      );
      if (matchingOldItem) {
        toUpdate.push(newItem);
        console.log("newItem", newItem);
      } else {
        toInsert.push(newItem);
      }
    });
    console.log("toInsert", toInsert);
    console.log("toUpdate", toUpdate);
    // Thực hiện insert, delete, update trong DB
    await LopDaoTaoNhanVienTam.insertMany(toInsert);
    await LopDaoTaoNhanVienTam.deleteMany({
      _id: { $in: toDelete.map((item) => item._id) },
    });

    for (const newItem of toUpdate) {
      const oldItem = lopdaotaonhanvienOld.find(
        (oldItem) =>
          newItem.LopDaoTaoID.equals(oldItem.LopDaoTaoID) &&
          newItem.NhanVienID.equals(oldItem.NhanVienID),
      );
      const updatedItem = {
        ...oldItem.toObject(),
        VaiTro: newItem.VaiTro,
      };
      await LopDaoTaoNhanVienTam.updateOne({ _id: oldItem._id }, updatedItem);
    }

    // Lấy mảng mới trong DB
    const newLopDaoTaoNhanVien = await LopDaoTaoNhanVienTam.find({
      LopDaoTaoID: lopdaotaoID,
      UserID: userID,
    });

    // Response
    sendResponse(
      res,
      200,
      true,
      newLopDaoTaoNhanVien,
      null,
      "Cập nhật thành công",
    );
  },
);

lopdaotaonhanvientamController.getById = catchAsync(async (req, res, next) => {
  const lopdaotaonhanvienID = req.params.lopdaotaonhanvienID;
  console.log("userID", lopdaotaonhanvienID);
  let lopdaotaonhanvien = await LopDaoTaoNhanVien.findById(lopdaotaonhanvienID);
  if (!lopdaotaonhanvien)
    throw new AppError(
      400,
      "lopdaotaonhanvien not found",
      "Update  lopdaotaonhanvien Error",
    );

  return sendResponse(
    res,
    200,
    true,
    lopdaotaonhanvien,
    null,
    "Get lopdaotaonhanvien successful",
  );
});

lopdaotaonhanvientamController.getAllPhanTrang = catchAsync(
  async (req, res, next) => {
    // const curentUserId = req.userId;

    let { page, limit, ...filter } = { ...req.query };
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 2000;

    const filterConditions = [{ isDeleted: false }];

    const filterCriteria = filterConditions.length
      ? { $and: filterConditions }
      : {};

    const count = await LopDaoTaoNhanVienTam.countDocuments(filterCriteria);
    const totalPages = Math.ceil(count / limit);
    const offset = limit * (page - 1);

    console.log("filter", filterConditions);
    let lopdaotaonhanviens = await LopDaoTaoNhanVienTam.find(filterCriteria)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    return sendResponse(
      res,
      200,
      true,
      { lopdaotaonhanviens, totalPages, count },
      null,
      "",
    );
  },
);

module.exports = lopdaotaonhanvientamController;
