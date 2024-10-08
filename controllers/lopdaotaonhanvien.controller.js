const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const mongoose = require("mongoose");
const LopDaoTaoNhanVien = require("../models/LopDaoTaoNhanVien");
const LopDaoTao = require("../models/LopDaoTao");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const lopdaotaonhanvienController = {};

lopdaotaonhanvienController.insertOrUpdateLopdaotaoNhanVien = catchAsync(
  async (req, res, next) => {
    // Lấy dữ liệu từ request
    console.log("reqbody", req.body);
    const lopdaotaonhanvienData = req.body.lopdaotaonhanvienData.map(
      (item) => ({
        ...item,
        LopDaoTaoID: new mongoose.Types.ObjectId(item.LopDaoTaoID),
        NhanVienID: new mongoose.Types.ObjectId(item.NhanVienID),
      })
    );

    console.log("lopdaotaonhanvienData", lopdaotaonhanvienData);
    const lopdaotaoID = new mongoose.Types.ObjectId(req.body.lopdaotaoID);
    const lopdaotao = await LopDaoTao.findById(lopdaotaoID);
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
            newItem.NhanVienID.toString() === oldItem.NhanVienID.toString()
        )
    );
    console.log("toDelete", toDelete);

    lopdaotaonhanvienData.forEach((newItem) => {
      const matchingOldItem = lopdaotaonhanvienOld.find(
        (oldItem) =>
          newItem.LopDaoTaoID.equals(oldItem.LopDaoTaoID) &&
          newItem.NhanVienID.equals(oldItem.NhanVienID)
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
          newItem.NhanVienID.equals(oldItem.NhanVienID)
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
      "Cập nhật thành công"
    );
  }
);

lopdaotaonhanvienController.getById = catchAsync(async (req, res, next) => {
  const lopdaotaonhanvienID = req.params.lopdaotaonhanvienID;
  console.log("userID", lopdaotaonhanvienID);
  let lopdaotaonhanvien = await LopDaoTaoNhanVien.findById(
    lopdaotaonhanvienID
  ).populate("NhanVienID");
  if (!lopdaotaonhanvien)
    throw new AppError(
      400,
      "lopdaotaonhanvien not found",
      "get  lopdaotaonhanvien Error"
    );
  console.log("lopdaotaonhanvien", lopdaotaonhanvien);
  return sendResponse(
    res,
    200,
    true,
    lopdaotaonhanvien,
    null,
    "Get lopdaotaonhanvien successful"
  );
});

lopdaotaonhanvienController.getAllPhanTrang = catchAsync(
  async (req, res, next) => {
    // const curentUserId = req.userId;

    let { page, limit, ...filter } = { ...req.query };
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 2000;

    const filterConditions = [{ isDeleted: false }];

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
      ""
    );
  }
);

lopdaotaonhanvienController.deleteOneById = catchAsync(
  async (req, res, next) => {
    const lopdaotaonhanvienID = req.params.lopdaotaonhanvienID;
    console.log("lopdaotaonhanvienID", req.params);
    const lopdaotaonhanvien = await LopDaoTaoNhanVien.findOneAndUpdate(
      {
        _id: lopdaotaonhanvienID,
      },
      { isDeleted: true },
      { new: true }
    );

    return sendResponse(
      res,
      200,
      true,
      lopdaotaonhanvien,
      null,
      "Delete User successful"
    );
  }
);

lopdaotaonhanvienController.updateOneLopDaoTaoNhanVien = catchAsync(
  async (req, res, next) => {
    let lopdaotaonhanvien = req.body;
    console.log("body", req.body);
    let lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findById(
      lopdaotaonhanvien._id || 0
    );
    if (!lopdaotaonhanvienUpdate)
      throw new AppError(
        400,
        "lopdaotaonhanvienUpdate not found",
        "Update lopdaotaonhanvienUpdate error"
      );
    if (lopdaotaonhanvienUpdate) {
      const id = lopdaotaonhanvienUpdate._id;
      lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findByIdAndUpdate(
        id,
        lopdaotaonhanvien,
        {
          new: true,
        }
      );
    }

    return sendResponse(
      res,
      200,
      true,
      lopdaotaonhanvienUpdate,
      null,
      "Update Suco successful"
    );
  }
);

lopdaotaonhanvienController.updateDiemDanhForMultiple = catchAsync(
  async (req, res, next) => {
    let lopdaotaonhanvienArray = req.body.lopdaotaonhanvienDiemDanhData; // Giả sử body là một mảng các đối tượng với _id và DiemDanh
    console.log("lopdaotaonhanvienArray", lopdaotaonhanvienArray);

    // Mảng lưu kết quả của các bản ghi đã được cập nhật
    let updatedRecords = [];

    // Sử dụng vòng lặp để duyệt qua từng phần tử của mảng
    for (let lopdaotaonhanvien of lopdaotaonhanvienArray) {
      let lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findById(
        lopdaotaonhanvien._id || 0
      );

      if (!lopdaotaonhanvienUpdate) {
        throw new AppError(
          400,
          "lopdaotaonhanvienUpdate not found",
          "Update lopdaotaonhanvienUpdate error"
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
          }
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
      "Update DiemDanh for multiple LopDaoTaoNhanVien successful"
    );
  }
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
    
    let lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findById(
      lopdaotaonhanvienID
    );
    if (!lopdaotaonhanvienUpdate) {
      throw new AppError(
        400,
        "lopdaotaonhanvienUpdate not found",
        "Update lopdaotaonhanvienUpdate error"
      );
    }

    lopdaotaonhanvienUpdate = await LopDaoTaoNhanVien.findByIdAndUpdate(
      lopdaotaonhanvienID,
      { Images: Images },
      { new: true }
    );

    return sendResponse(
      res,
      200,
      true,
      lopdaotaonhanvienUpdate,
      null,
      "Upload Images LopDaoTaoNhanVien successful"
    );
  }
);

module.exports = lopdaotaonhanvienController;
