const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const LopDaoTaoNhanVienDT06 = require("../models/LopDaoTaoNhanVienDT06");

const lopdaotaonhanviendt06Controller = {};

lopdaotaonhanviendt06Controller.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  
  console.log("reqbody", req.body);
  const lopdaotaonhanvienDT06Data = {...req.body};

  //Business Logic Validation
 
  let lopdaotaonhanviendt06 = await LopDaoTaoNhanVienDT06.create(lopdaotaonhanvienDT06Data);
  lopdaotaonhanviendt06 = await LopDaoTaoNhanVienDT06.findById(lopdaotaonhanviendt06._id);
 
  //Response
  sendResponse(
    res,
    200,
    true,
    lopdaotaonhanviendt06,
    null,
    "Cập nhật quá trình đào tạo ĐT06 thành công"
  );
});


lopdaotaonhanviendt06Controller.getById = catchAsync(async (req, res, next) => {
  
  const lopdaotaonhanviendt06ID = req.params.lopdaotaonhanviendt06ID;

  let lopdaotaonhanviendt06 = await LopDaoTaoNhanVienDT06.findById(lopdaotaonhanviendt06ID);
  if (!lopdaotaonhanviendt06) throw new AppError(400, "lopdaotaonhanviendt06 not found", "Update  lopdaotaonhanviendt06 Error");

  return sendResponse(res, 200, true, lopdaotaonhanviendt06, null, "Get lopdaotaonhanviendt06 successful");
});


lopdaotaonhanviendt06Controller.deleteOneByID = catchAsync(async (req, res, next) => {
  
  const lopdaotaonhanviendt06ID = req.params.lopdaotaonhanviendt06ID;
console.log('lopdaotaonhanviendt06ID',req.params)
 
  const lopdaotaonhanviendt06 = await LopDaoTaoNhanVienDT06.findOneAndDelete({  _id: lopdaotaonhanviendt06ID });
 
  return sendResponse(
    res,
    200,
    true,
    lopdaotaonhanviendt06,
    null,
    "Delete LopDaoTaoNhanVienDT06 successful"
  );
});

lopdaotaonhanviendt06Controller.getByLopDaoTaoID = catchAsync(async (req, res, next) => {
  
  const lopdaotaoID = req.params.lopdaotaoID;
console.log('lopdaotaoID',req.params)
 
  const lopdaotaonhanviendt06 = await LopDaoTaoNhanVienDT06.find({  _id: lopdaotaoID });
 
  return sendResponse(
    res,
    200,
    true,
    lopdaotaonhanviendt06,
    null,
    "Get LopDaoTaoNhanVienDT06 By LopDaoTaoID successful"
  );
});

lopdaotaonhanviendt06Controller.updateOne = catchAsync(async (req, res, next) => {
 
  let lopdaotaonhanvienDT06Data  = req.body;
  console.log("body",req.body)
let lopdaotaonhanviendt06Update = await LopDaoTaoNhanVienDT06.findById(lopdaotaonhanvienDT06Data._id||0);
if(!lopdaotaonhanviendt06Update) throw new AppError(400,"lopdaotaonhanviendt06Update not found","Update lopdaotaonhanviendt06Update error");
if (lopdaotaonhanviendt06Update) {
  
  const id = lopdaotaonhanviendt06Update._id;
  lopdaotaonhanviendt06Update = await LopDaoTaoNhanVienDT06.findByIdAndUpdate(id, lopdaotaonhanvienDT06Data, {
    new: true,
  });
}
console.log('lopdaotaonhanviendt06update',lopdaotaonhanviendt06Update)
  return sendResponse(
    res,
    200,
    true,
    lopdaotaonhanviendt06Update,
    null,
    "updateOneQuaTrinhDT06 successful"
  );
});



module.exports = lopdaotaonhanviendt06Controller;
