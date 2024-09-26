const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const HoiDong = require("../models/HoiDong");

const hoidongController = {};

hoidongController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request

  console.log("reqbody", req.body);
  const hoidongData = { ...req.body };

  //Business Logic Validation

  let hoidong = await HoiDong.create(hoidongData);
  hoidong = await HoiDong.findById(hoidong._id)
  .populate({
    path: "ThanhVien.NhanVienID",
    populate: { path: "KhoaID" },
  });
  //Process

  //Response
  sendResponse(res, 200, true, hoidong, null, "Cap nhat hoi dong success");
});

hoidongController.getById = catchAsync(async (req, res, next) => {
  const hoidongID = req.params.hoidongID;
  console.log("userID", hoidongID);
  let hoidong = await HoiDong.findById(hoidongID);
  if (!hoidong)
    throw new AppError(400, "hoidong not found", "Update  hoidong Error");

  return sendResponse(res, 200, true, hoidong, null, "Get NhanVien successful");
});

hoidongController.gethoidongsPhanTrang = catchAsync(async (req, res, next) => {
  let { page, limit, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 50;

  const filterConditions = [];

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await HoiDong.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  console.log("filter", filterConditions);
  let hoidong = await HoiDong.find(filterCriteria)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .populate({
      path: "ThanhVien.NhanVienID",
      populate: { path: "KhoaID" },
    });

  hoidong = hoidong.map((item) => {
    return {
      ...item._doc,
      ThanhVien: item.ThanhVien.map((item) => {
        return {
          ...item._doc,
          NhanVienID: {
            ...item.NhanVienID._doc,
            KhoaID: item.NhanVienID.KhoaID
              ? item.NhanVienID.KhoaID
              : { TenKhoa: "" },
          },
        };
      }),
    };
  });
  return sendResponse(res, 200, true, { hoidong, totalPages, count }, null, "");
});

hoidongController.deleteOneHoiDong = catchAsync(async (req, res, next) => {
  const hoidongID = req.params.hoidongID;
  console.log("hoidongID", req.params);
  // const hoidong = await HoiDong.findOneAndUpdate({
  //   _id: hoidongID,
  //   },{ isDeleted: true },
  //   { new: true });

  const hoidong = await HoiDong.findOneAndDelete({ _id: hoidongID });

  return sendResponse(
    res,
    200,
    true,
    hoidong,
    null,
    "Delete HoiDong successful"
  );
});

hoidongController.updateOneHoiDong = catchAsync(async (req, res, next) => {
  let { hoidong } = req.body;
  console.log("body", hoidong);
  let hoidongUpdate = await HoiDong.findById(hoidong._id || 0);
  if (!hoidongUpdate)
    throw new AppError(
      400,
      "hoidongUpdate not found",
      "Update hoidongUpdate error"
    );
  if (hoidongUpdate) {
    const id = hoidongUpdate._id;
    hoidongUpdate = await HoiDong.findByIdAndUpdate(id, hoidong, {
      new: true,
    }) 
    .populate({
      path: "ThanhVien.NhanVienID",
      populate: { path: "KhoaID" }
    });;
  }
  console.log("hoidongupdate", hoidongUpdate);
  return sendResponse(
    res,
    200,
    true,
    hoidongUpdate,
    null,
    "Update Suco successful"
  );
});

module.exports = hoidongController;
