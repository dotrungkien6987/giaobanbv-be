const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const mongoose = require("mongoose");
const LopDaoTaoNhanVienTam = require("../models/LopDaoTaoNhanVienTam");
const LopDaoTao = require("../models/LopDaoTao");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const lopdaotaonhanvientamController = {};

lopdaotaonhanvientamController.insertOrUpdateLopdaotaoNhanVienTam = catchAsync(
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
    const userID = new mongoose.Types.ObjectId(req.body.userID);

    const lopdaotao = await LopDaoTao.findById(lopdaotaoID);
    
    // Tìm tất cả các bản ghi trong LopDaoTaoNhanVienTam theo lopdaotaoID,nhanvienID
    const lopdaotaonhanvienOld = await LopDaoTaoNhanVienTam.find({
      LopDaoTaoID: lopdaotaoID,
      UserID: userID,
    });
console.log("lopdaotaonhanvienOld",lopdaotaonhanvienOld)
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
       
        toInsert.push(newItem);
      }
    });
console.log("toInsert",toInsert)
console.log("toUpdate",toUpdate)  
    // Thực hiện insert, delete, update trong DB
    await LopDaoTaoNhanVienTam.insertMany(toInsert);
    await LopDaoTaoNhanVienTam.deleteMany({
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
      await LopDaoTaoNhanVienTam.updateOne({ _id: oldItem._id }, updatedItem);
    }

    // Lấy mảng mới trong DB
    const newLopDaoTaoNhanVien = await LopDaoTaoNhanVienTam.find({
      LopDaoTaoID: lopdaotaoID,
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

lopdaotaonhanvientamController.getById = catchAsync(async (req, res, next) => {
  const lopdaotaonhanvienID = req.params.lopdaotaonhanvienID;
  console.log("userID", lopdaotaonhanvienID);
  let lopdaotaonhanvien = await LopDaoTaoNhanVien.findById(lopdaotaonhanvienID);
  if (!lopdaotaonhanvien)
    throw new AppError(
      400,
      "lopdaotaonhanvien not found",
      "Update  lopdaotaonhanvien Error"
    );

  return sendResponse(
    res,
    200,
    true,
    lopdaotaonhanvien,
    null,
    "Get lopdaotaonhanvien successful"
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
      ""
    ); 
  }
);


module.exports = lopdaotaonhanvientamController;
