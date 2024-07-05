const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const NhanVien = require("../models/NhanVien");
const Khoa = require("../models/Khoa");
const nhanvienController = {};

nhanvienController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
  console.log("reqbody", req.body);
  const nhanvienData = {...req.body};

  //Business Logic Validation
 
  let nhanvien = await NhanVien.create(nhanvienData);
  nhanvien = await NhanVien.findById(nhanvien._id).populate('KhoaID');
 
  //Process

  // baocaongay = await BaoCaoNgay.create({Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo });

  //Response
  sendResponse(
    res,
    200,
    true,
    nhanvien,
    null,
    "Cap nhat Nhan vien success"
  );
});


nhanvienController.getById = catchAsync(async (req, res, next) => {
  
  const nhanvienID = req.params.nhanvienID;
console.log("userID",nhanvienID)
  let nhanvien = await NhanVien.findById(nhanvienID);
  if (!nhanvien) throw new AppError(400, "NhanVien not found", "Update  NhanVien Error");

  return sendResponse(res, 200, true, nhanvien, null, "Get NhanVien successful");
});


nhanvienController.getNhanviensPhanTrang = catchAsync(async (req, res, next) => {
  // const curentUserId = req.userId;
  console.log("getNhanViensPhanTrang")
  let { page, limit, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 100;

  const filterConditions = [{ isDeleted: false }];

  if (filter.UserName) {
    // filterConditions.push({ UserName: { $regex: filter.UserName, $options: "i" } });
    filterConditions.push({ $or: [
      { HinhThuc: { $regex: filter.UserName, $options: "i" } },
      { TenBN: { $regex: filter.UserName, $options: "i" } },
      { SoBA: { $regex: filter.UserName, $options: "i" } }
    ] });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await NhanVien.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  console.log("filter",filterConditions)
  let nhanviens = await NhanVien.find(filterCriteria).populate('KhoaID')
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit);

  return sendResponse(
    res,
    200,
    true,
    { nhanviens, totalPages, count },
    null,
    ""
  );
});

nhanvienController.deleteOneNhanVien = catchAsync(async (req, res, next) => {
  
  const nhanvienID = req.params.nhanvienID;
console.log('nhanvienID',req.params)
  const nhanvien = await NhanVien.findOneAndUpdate({
    _id: nhanvienID,
    },{ isDeleted: true },
    { new: true });
 
  return sendResponse(
    res,
    200,
    true,
    nhanvien,
    null,
    "Delete User successful"
  );
});

nhanvienController.updateOneNhanVien = catchAsync(async (req, res, next) => {
 
  let {nhanvien } = req.body;
  console.log("body",nhanvien)
let nhanvienUpdate = await NhanVien.findById(nhanvien._id||0);
if(!nhanvienUpdate) throw new AppError(400,"nhanvienUpdate not found","Update nhanvienUpdate error");
if (nhanvienUpdate) {
  
  const id = nhanvienUpdate._id;
  nhanvienUpdate = await NhanVien.findByIdAndUpdate(id, nhanvien, {
    new: true,
  }).populate('KhoaID');
}
console.log('nhanvienupdate',nhanvienUpdate)
  return sendResponse(
    res,
    200,
    true,
    nhanvienUpdate,
    null,
    "Update Suco successful"
  );
});

module.exports = nhanvienController;
