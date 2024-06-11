const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const NhanVien = require("../models/NhanVien");
const Khoa = require("../models/Khoa");
const nhanvienController = {};

nhanvienController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
  console.log("reqbody", req.body);
  let nhanvien = {...req.body};

  //Business Logic Validation
  
  console.log(nhanvien);

  nhanvien = await NhanVien.create(nhanvien)
 
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


nhanvienController.getNhanviens = catchAsync(async (req, res, next) => {
  // const curentUserId = req.userId;
  let { page, limit, ...filter } = { ...req.query };

  page = parseInt(page) || 1;
  limit = parseInt(limit) || 10;

  const filterConditions = [];

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
  let nhanviens = await NhanVien.find(filterCriteria).populate('KhoaSuCo')
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
  
  const sucoId = req.params.sucoId;

  const suco = await NhanVien.findOneAndUpdate({
    _id: sucoId,
    },{ isDeleted: true },
    { new: true });
 
  return sendResponse(
    res,
    200,
    true,
    suco,
    null,
    "Delete User successful"
  );
});

nhanvienController.updateOneNhanVien = catchAsync(async (req, res, next) => {
 
  let {nhanvien } = req.body;
  console.log("bcsuco",nhanvien)
let suco = await NhanVien.findById(nhanvien._id||0);
if(!suco) throw new AppError(400,"SuCo not found","Update Suco error");
if (suco) {
  
  const id = suco._id;
  suco = await NhanVien.findByIdAndUpdate(id, nhanvien, {
    new: true,
  });
}

  return sendResponse(
    res,
    200,
    true,
    suco,
    null,
    "Update Suco successful"
  );
});

module.exports = nhanvienController;
