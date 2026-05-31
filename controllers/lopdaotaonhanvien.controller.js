const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const mongoose = require("mongoose");
const LopDaoTaoNhanVien = require("../models/LopDaoTaoNhanVien");
const LopDaoTao = require("../models/LopDaoTao");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const lopdaotaonhanvienController = {};
const LOPDAOTAO_WRITE_ROLES = ["admin", "superadmin"];
const LOPDAOTAO_ROSTER_READ_ROLES = ["admin", "superadmin", "daotao"];

const getCurrentUserId = (req) => {
  if (req.user?.userId) return req.user.userId;
  if (req.user?._id) return req.user._id.toString();
  if (req.userId) return req.userId;
  return null;
};

const getNormalizedRole = (req) => (req.user?.PhanQuyen || "").toLowerCase();

const isLopDaoTaoWriteRole = (role) => LOPDAOTAO_WRITE_ROLES.includes(role);
const isLopDaoTaoRosterReadRole = (role) =>
  LOPDAOTAO_ROSTER_READ_ROLES.includes(role);

async function getReadableLopDaoTaoIds(req) {
  const currentUserId = getCurrentUserId(req);
  if (!currentUserId) {
    throw new AppError(
      401,
      "Khong tim thay thong tin nguoi dung",
      "Authentication Error",
    );
  }

  const role = getNormalizedRole(req);
  if (isLopDaoTaoRosterReadRole(role)) {
    return null;
  }

  const ownedLopDaoTaos = await LopDaoTao.find(
    { UserIDCreated: currentUserId, isDeleted: false },
    "_id",
  );

  return ownedLopDaoTaos.map((item) => item._id);
}

async function assertCanManageLopDaoTao(req, lopDaoTaoId) {
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
    throw new AppError(404, "lopdaotao not found", "get lopdaotao Error");
  }

  const role = getNormalizedRole(req);
  if (isLopDaoTaoWriteRole(role)) {
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

async function assertCanManageLopDaoTaoNhanVien(req, lopdaotaonhanvienId) {
  const lopdaotaonhanvien =
    await LopDaoTaoNhanVien.findById(lopdaotaonhanvienId);
  if (!lopdaotaonhanvien) {
    throw new AppError(
      404,
      "lopdaotaonhanvien not found",
      "get lopdaotaonhanvien Error",
    );
  }

  await assertCanManageLopDaoTao(req, lopdaotaonhanvien.LopDaoTaoID);
  return lopdaotaonhanvien;
}

lopdaotaonhanvienController.insertOrUpdateLopdaotaoNhanVien = catchAsync(
  async (req, res, next) => {
    // Lấy dữ liệu từ request
    console.log("reqbody", req.body);
    const lopdaotaonhanvienData = req.body.lopdaotaonhanvienData.map(
      (item) => ({
        ...item,
        LopDaoTaoID: new mongoose.Types.ObjectId(item.LopDaoTaoID),
        NhanVienID: new mongoose.Types.ObjectId(item.NhanVienID),
      }),
    );

    console.log("lopdaotaonhanvienData", lopdaotaonhanvienData);
    const lopdaotaoID = new mongoose.Types.ObjectId(req.body.lopdaotaoID);
    const lopdaotao = await assertCanManageLopDaoTao(req, lopdaotaoID);
    const soluong = lopdaotao.SoLuong;

    // Tìm tất cả các bản ghi trong LopDaoTaoNhanVien có LopDaoTaoID bằng với lopdaotaoID
    const lopdaotaonhanvienOld = await LopDaoTaoNhanVien.find({
      LopDaoTaoID: lopdaotaoID,
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
        let diemdanh = [];
        for (let i = 0; i < soluong; i++) {
          diemdanh.push(true);
        }
        newItem.DiemDanh = diemdanh;
        toInsert.push(newItem);
      }
    });
    console.log("toInsert", toInsert);
    console.log("toUpdate", toUpdate);
    // Thực hiện insert, delete, update trong DB
    await LopDaoTaoNhanVien.insertMany(toInsert);
    await LopDaoTaoNhanVien.deleteMany({
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
      await LopDaoTaoNhanVien.updateOne({ _id: oldItem._id }, updatedItem);
    }

    // Lấy mảng mới trong DB
    const newLopDaoTaoNhanVien = await LopDaoTaoNhanVien.find({
      LopDaoTaoID: lopdaotaoID,
    });

    await LopDaoTao.findByIdAndUpdate(lopdaotaoID, {
      SoThanhVien: newLopDaoTaoNhanVien.length,
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

lopdaotaonhanvienController.getById = catchAsync(async (req, res, next) => {
  const lopdaotaonhanvienID = req.params.lopdaotaonhanvienID;
  console.log("userID", lopdaotaonhanvienID);
  const authorizedLopDaoTaoNhanVien = await assertCanManageLopDaoTaoNhanVien(
    req,
    lopdaotaonhanvienID,
  );
  let lopdaotaonhanvien = await LopDaoTaoNhanVien.findById(
    authorizedLopDaoTaoNhanVien._id,
  ).populate("NhanVienID");
  if (!lopdaotaonhanvien)
    throw new AppError(
      400,
      "lopdaotaonhanvien not found",
      "get  lopdaotaonhanvien Error",
    );
  console.log("lopdaotaonhanvien", lopdaotaonhanvien);
  return sendResponse(
    res,
    200,
    true,
    lopdaotaonhanvien,
    null,
    "Get lopdaotaonhanvien successful",
  );
});

lopdaotaonhanvienController.getAllPhanTrang = catchAsync(
  async (req, res, next) => {
    // const curentUserId = req.userId;

    let { page, limit, ...filter } = { ...req.query };
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 2000;

    const filterConditions = [{ isDeleted: false }];
    const readableLopDaoTaoIds = await getReadableLopDaoTaoIds(req);

    if (readableLopDaoTaoIds && readableLopDaoTaoIds.length === 0) {
      return sendResponse(
        res,
        200,
        true,
        { lopdaotaonhanviens: [], totalPages: 0, count: 0 },
        null,
        "",
      );
    }

    if (readableLopDaoTaoIds) {
      filterConditions.push({ LopDaoTaoID: { $in: readableLopDaoTaoIds } });
    }

    const filterCriteria = filterConditions.length
      ? { $and: filterConditions }
      : {};

    const count = await LopDaoTaoNhanVien.countDocuments(filterCriteria);
    const totalPages = Math.ceil(count / limit);
    const offset = limit * (page - 1);

    console.log("filter", filterConditions);
    let lopdaotaonhanviens = await LopDaoTaoNhanVien.find(filterCriteria)
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

lopdaotaonhanvienController.deleteOneById = catchAsync(
  async (req, res, next) => {
    const lopdaotaonhanvienID = req.params.lopdaotaonhanvienID;
    console.log("lopdaotaonhanvienID", req.params);
    await assertCanManageLopDaoTaoNhanVien(req, lopdaotaonhanvienID);
    const lopdaotaonhanvien = await LopDaoTaoNhanVien.findOneAndUpdate(
      {
        _id: lopdaotaonhanvienID,
      },
      { isDeleted: true },
      { new: true },
    );

    return sendResponse(
      res,
      200,
      true,
      lopdaotaonhanvien,
      null,
      "Delete User successful",
    );
  },
);

lopdaotaonhanvienController.updateOneLopDaoTaoNhanVien = catchAsync(
  async (req, res, next) => {
    let lopdaotaonhanvien = req.body;
    console.log("body", req.body);
    let lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findById(
      lopdaotaonhanvien._id || 0,
    );
    if (!lopdaotaonhanvienUpdate)
      throw new AppError(
        400,
        "lopdaotaonhanvienUpdate not found",
        "Update lopdaotaonhanvienUpdate error",
      );
    if (lopdaotaonhanvienUpdate) {
      const id = lopdaotaonhanvienUpdate._id;
      lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findByIdAndUpdate(
        id,
        lopdaotaonhanvien,
        {
          new: true,
        },
      );
    }

    return sendResponse(
      res,
      200,
      true,
      lopdaotaonhanvienUpdate,
      null,
      "Update Suco successful",
    );
  },
);

lopdaotaonhanvienController.updateDiemDanhForMultiple = catchAsync(
  async (req, res, next) => {
    let lopdaotaonhanvienArray = req.body.lopdaotaonhanvienDiemDanhData; // Giả sử body là một mảng các đối tượng với _id và DiemDanh
    console.log("lopdaotaonhanvienArray", lopdaotaonhanvienArray);

    if (
      !Array.isArray(lopdaotaonhanvienArray) ||
      lopdaotaonhanvienArray.length === 0
    ) {
      throw new AppError(
        400,
        "Invalid input data",
        "Update lopdaotaonhanvien error",
      );
    }

    // Mảng lưu kết quả của các bản ghi đã được cập nhật
    let updatedRecords = [];

    // Sử dụng vòng lặp để duyệt qua từng phần tử của mảng
    for (let lopdaotaonhanvien of lopdaotaonhanvienArray) {
      let lopdaotaonhanvienUpdate = await assertCanManageLopDaoTaoNhanVien(
        req,
        lopdaotaonhanvien._id || 0,
      );

      if (!lopdaotaonhanvienUpdate) {
        throw new AppError(
          400,
          "lopdaotaonhanvienUpdate not found",
          "Update lopdaotaonhanvienUpdate error",
        );
      }

      if (lopdaotaonhanvienUpdate) {
        const id = lopdaotaonhanvienUpdate._id;
        lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findByIdAndUpdate(
          id,
          {
            DiemDanh: lopdaotaonhanvien.DiemDanh,
            SoTinChiTichLuy: lopdaotaonhanvien.SoTinChiTichLuy,
          }, // Chỉ cập nhật trường DiemDanh
          {
            new: true,
          },
        );

        // Thêm bản ghi đã được cập nhật vào mảng kết quả
        updatedRecords.push(lopdaotaonhanvienUpdate);
      }
    }

    return sendResponse(
      res,
      200,
      true,
      updatedRecords,
      null,
      "Update DiemDanh for multiple LopDaoTaoNhanVien successful",
    );
  },
);
lopdaotaonhanvienController.uploadImagesForOneLopDaoTaoNhanVien = catchAsync(
  async (req, res, next) => {
    const { lopdaotaonhanvienID, Images } = req.body;
    console.log("Images", Images);
    console.log("lopdaotaonhanvienID", lopdaotaonhanvienID);

    // Kiểm tra dữ liệu đầu vào
    if (!lopdaotaonhanvienID || !Images) {
      throw new AppError(400, "Invalid input data", "Upload Images error");
    }

    let lopdaotaonhanvienUpdate = await assertCanManageLopDaoTaoNhanVien(
      req,
      lopdaotaonhanvienID,
    );
    if (!lopdaotaonhanvienUpdate) {
      throw new AppError(
        400,
        "lopdaotaonhanvienUpdate not found",
        "Update lopdaotaonhanvienUpdate error",
      );
    }

    lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findByIdAndUpdate(
      lopdaotaonhanvienID,
      { Images: Images },
      { new: true },
    );

    return sendResponse(
      res,
      200,
      true,
      lopdaotaonhanvienUpdate,
      null,
      "Upload Images LopDaoTaoNhanVien successful",
    );
  },
);

module.exports = lopdaotaonhanvienController;
