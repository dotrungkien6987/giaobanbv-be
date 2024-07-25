const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const LopDaoTao = require("../models/LopDaoTao");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const lopdaotaoController = {};

lopdaotaoController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
  console.log("reqbody", req.body);
  const lopdaotaoData = {...req.body};

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

  return sendResponse(res, 200, true, lopdaotao, null, "Get lopdaotao successful");
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
console.log('lopdaotaoID',req.params)
  const lopdaotao = await LopDaoTao.findOneAndUpdate({
    _id: lopdaotaoID,
    },{ isDeleted: true },
    { new: true });
 
  return sendResponse(
    res,
    200,
    true,
    lopdaotao,
    null,
    "Delete User successful"
  );
});

lopdaotaoController.updateOneLopDaoTao = catchAsync(async (req, res, next) => {
 
  let {lopdaotao } = req.body;
  console.log("body",lopdaotao)
let lopdaotaoUpdate = await LopDaoTao.findById(lopdaotao._id||0);
if(!lopdaotaoUpdate) throw new AppError(400,"lopdaotaoUpdate not found","Update lopdaotaoUpdate error");
if (lopdaotaoUpdate) {
  
  const id = lopdaotaoUpdate._id;
  lopdaotaoUpdate = await LopDaoTao.findByIdAndUpdate(id, lopdaotao, {
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
