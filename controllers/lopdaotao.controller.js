const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const LopDaoTao = require("../models/LopDaoTao");
const LopDaoTaoNhanVien = require("../models/LopDaoTaoNhanVien");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const lopdaotaoController = {};

lopdaotaoController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
  const lopdaotaoData = {...req.body.lopdaotaoData};
  console.log("reqbody",lopdaotaoData);

  //Business Logic Validation
 
  let lopdaotao = await LopDaoTao.create(lopdaotaoData);
  lopdaotao = await LopDaoTao.findById(lopdaotao._id);
 
  //Process

  // baocaongay = await BaoCaoNgay.create({Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo });

  //Response
  sendResponse(
    res,
    200,
    true,
    lopdaotao,
    null,
    "Cập nhật thành công"
  );
});


lopdaotaoController.getById = catchAsync(async (req, res, next) => {
  
  const lopdaotaoID = req.params.lopdaotaoID;
console.log("userID",lopdaotaoID)
  let lopdaotao = await LopDaoTao.findById(lopdaotaoID);
  if (!lopdaotao) throw new AppError(400, "lopdaotao not found", "Update  lopdaotao Error");
// const lopdaotaonhanvien = await LopDaoTaoNhanVien.find({LopDaoTaoID:lopdaotaoID}).populate('NhanVienID');
const lopdaotaonhanvien = await LopDaoTaoNhanVien.find({ LopDaoTaoID: lopdaotaoID })
    .populate('NhanVienID')
    .populate({
      path: 'NhanVienID',
      populate: {
        path: 'KhoaID'
      }
    });
console.log("lopdaotaonhanvien",lopdaotaonhanvien)
  return sendResponse(res, 200, true, {lopdaotao,lopdaotaonhanvien}, null, "Get lopdaotao successful");
});


lopdaotaoController.getlopdaotaosPhanTrang = catchAsync(async (req, res, next) => {
  // const curentUserId = req.userId;
  console.log("getlopdaotaosPhanTrang")
  let { page, limit, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 2000;

  const filterConditions = [{ isDeleted: false }];

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await LopDaoTao.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  console.log("filter",filterConditions)
  let lopdaotaos = await LopDaoTao.find(filterCriteria)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { lopdaotaos, totalPages, count },
    null,
    ""
  );
});

lopdaotaoController.deleteOneLopDaoTao = catchAsync(async (req, res, next) => {
  
  const lopdaotaoID = req.params.lopdaotaoID;

  const lopdaotao = await LopDaoTao.findOneAndUpdate({
    _id: lopdaotaoID,
    },{ isDeleted: true },
    { new: true });
    await LopDaoTaoNhanVien.deleteMany({ LopDaoTaoID: lopdaotaoID });

  return sendResponse(
    res,
    200,
    true,
    lopdaotao,
    null,
    "Delete LopDaoTao successful"
  );
});

lopdaotaoController.updateOneLopDaoTao = catchAsync(async (req, res, next) => {
 
  let lopdaotao  = req.body;
  console.log("body",req.body);
let lopdaotaoUpdate = await LopDaoTao.findById(lopdaotao._id||0);
if(!lopdaotaoUpdate) throw new AppError(400,"lopdaotaoUpdate not found","Update lopdaotaoUpdate error");
if (lopdaotaoUpdate) {
  const oldSoLuong = lopdaotaoUpdate.SoLuong;
    const newSoLuong = lopdaotao.SoLuong;

  const id = lopdaotaoUpdate._id;
  lopdaotaoUpdate = await LopDaoTao.findByIdAndUpdate(id, lopdaotao, {
    new: true,
  });

    // Kiểm tra SoLuong cũ và mới
    if (oldSoLuong !== newSoLuong) {
      const relatedLopDaoTaoNhanViens = await LopDaoTaoNhanVien.find({ LopDaoTaoID: id });

      for (const lopDaoTaoNhanVien of relatedLopDaoTaoNhanViens) {
        const oldDiemDanh = lopDaoTaoNhanVien.DiemDanh;

        if (oldSoLuong > newSoLuong) {
          // Cắt mảng DiemDanh cho đủ SoLuong mới
          lopDaoTaoNhanVien.DiemDanh = oldDiemDanh.slice(0, newSoLuong);
        } else if (oldSoLuong < newSoLuong) {
          // Thêm giá trị true vào mảng DiemDanh cho đủ SoLuong mới
          while (lopDaoTaoNhanVien.DiemDanh.length < newSoLuong) {
            lopDaoTaoNhanVien.DiemDanh.push(true);
          }
        }

        await lopDaoTaoNhanVien.save();
      }
    }
}

console.log('lopdaotaoupdate',lopdaotaoUpdate)
  return sendResponse(
    res,
    200,
    true,
    lopdaotaoUpdate,
    null,
    "Update Suco successful"
  );
});
lopdaotaoController.updateTrangThaiLopDaoTao = catchAsync(async (req, res, next) => {
 
  let {TrangThai,lopdaotaoID}  = {...req.body};
  console.log("bodykk",req.body);
let lopdaotaoUpdate = await LopDaoTao.findById(lopdaotaoID||0);
if(!lopdaotaoUpdate) throw new AppError(400,"lopdaotaoUpdate not found","Update lopdaotaoUpdate error");
if (lopdaotaoUpdate) {
  
  lopdaotaoUpdate = await LopDaoTao.findByIdAndUpdate(lopdaotaoID, {TrangThai}, {
    new: true,
  });
}
console.log('lopdaotaoupdate',lopdaotaoUpdate)
  return sendResponse(
    res,
    200,
    true,
    lopdaotaoUpdate,
    null,
    "Update Suco successful"
  );
});


module.exports = lopdaotaoController;
