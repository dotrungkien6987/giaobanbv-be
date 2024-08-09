const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const HinhThucCapNhat = require("../models/HinhThucCapNhat");
// const Khoa = require("../models/Khoa");
// const moment = require("moment-timezone");
const hinhthuccapnhatController = {};

hinhthuccapnhatController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  
  console.log("reqbody", req.body);
  const hinhthuccapnhatData = {...req.body};

  //Business Logic Validation
 
  let hinhthuccapnhat = await HinhThucCapNhat.create(hinhthuccapnhatData);
  hinhthuccapnhat = await HinhThucCapNhat.findById(hinhthuccapnhat._id);
 
  //Process

  // baocaongay = await BaoCaoNgay.create({Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo });

  //Response
  sendResponse(
    res,
    200,
    true,
    hinhthuccapnhat,
    null,
    "Cap nhat Nhan vien success"
  );
});


hinhthuccapnhatController.getById = catchAsync(async (req, res, next) => {
  
  const hinhthuccapnhatID = req.params.hinhthuccapnhatID;
console.log("userID",hinhthuccapnhatID)
  let hinhthuccapnhat = await HinhThucCapNhat.findById(hinhthuccapnhatID);
  if (!hinhthuccapnhat) throw new AppError(400, "hinhthuccapnhat not found", "Update  hinhthuccapnhat Error");

  return sendResponse(res, 200, true, hinhthuccapnhat, null, "Get NhanVien successful");
});


hinhthuccapnhatController.getHinhThucCapNhatsPhanTrang = catchAsync(async (req, res, next) => {
  
  let { page, limit, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 50;

  const filterConditions = [];

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await HinhThucCapNhat.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  console.log("filter",filterConditions)
  let hinhthuccapnhat = await HinhThucCapNhat.find(filterCriteria)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { hinhthuccapnhat, totalPages, count },
    null,
    ""
  );
});

hinhthuccapnhatController.deleteOneHinhThucCapNhat = catchAsync(async (req, res, next) => {
  
  const hinhthuccapnhatID = req.params.hinhthuccapnhatID;
console.log('hinhthuccapnhatID',req.params)
  // const hinhthuccapnhat = await HinhThucCapNhat.findOneAndUpdate({
  //   _id: hinhthuccapnhatID,
  //   },{ isDeleted: true },
  //   { new: true });

  const hinhthuccapnhat = await HinhThucCapNhat.findOneAndDelete({  _id: hinhthuccapnhatID });
 
  return sendResponse(
    res,
    200,
    true,
    hinhthuccapnhat,
    null,
    "Delete HinhThucCapNhat successful"
  );
});

hinhthuccapnhatController.updateOneHinhThucCapNhat = catchAsync(async (req, res, next) => {
 
  let {hinhthuccapnhat } = req.body;
  console.log("body",hinhthuccapnhat)
let hinhthuccapnhatUpdate = await HinhThucCapNhat.findById(hinhthuccapnhat._id||0);
if(!hinhthuccapnhatUpdate) throw new AppError(400,"hinhthuccapnhatUpdate not found","Update hinhthuccapnhatUpdate error");
if (hinhthuccapnhatUpdate) {
  
  const id = hinhthuccapnhatUpdate._id;
  hinhthuccapnhatUpdate = await HinhThucCapNhat.findByIdAndUpdate(id, hinhthuccapnhat, {
    new: true,
  });
}
console.log('hinhthuccapnhatupdate',hinhthuccapnhatUpdate)
  return sendResponse(
    res,
    200,
    true,
    hinhthuccapnhatUpdate,
    null,
    "Update Suco successful"
  );
});



module.exports = hinhthuccapnhatController;
