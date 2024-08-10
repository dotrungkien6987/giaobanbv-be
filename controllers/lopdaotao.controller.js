const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const LopDaoTao = require("../models/LopDaoTao");
const LopDaoTaoNhanVien = require("../models/LopDaoTaoNhanVien");
const LopDaoTaoNhanVienTam = require("../models/LopDaoTaoNhanVienTam");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const DaTaFix = require("../models/DaTaFix");
const HinhThucCapNhat = require("../models/HinhThucCapNhat");
const lopdaotaoController = {};

lopdaotaoController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
  const lopdaotaoData = { ...req.body.lopdaotaoData };
  console.log("reqbody", lopdaotaoData);

  //Business Logic Validation

  let lopdaotao = await LopDaoTao.create(lopdaotaoData);
  lopdaotao = await LopDaoTao.findById(lopdaotao._id);
  const nhomhinhthuccapnhats = (await DaTaFix.findOne()).NhomHinhThucCapNhat;

  const hinhthuccapnhats = await HinhThucCapNhat.find();

  const hinhthuccapnhat = hinhthuccapnhats.find(
    (hinhthuccapnhat) => hinhthuccapnhat.Ma === lopdaotao.MaHinhThucCapNhat
  );
  const nhomhinhthuccapnhat = nhomhinhthuccapnhats.find(
    (nhom) => nhom.Ma === hinhthuccapnhat.MaNhomHinhThucCapNhat
  );
  lopdaotao = {
    ...lopdaotao.toObject(),
    TenHinhThucCapNhat: hinhthuccapnhat.Ten,
    MaNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ma,
    TenNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ten,
  };

  //Process

  //Response
  sendResponse(res, 200, true, lopdaotao, null, "Cập nhật thành công");
});

lopdaotaoController.getById = catchAsync(async (req, res, next) => {
  const lopdaotaoID = req.query.lopdaotaoID;
  const tam = req.query.tam;
  const userID = req.query.userID;
  let isTam = false;
    if (tam === 'true') {
      isTam = true;
    } else if (tam === 'false') {
      isTam = false;
    } else if (typeof tam === 'boolean') {
      isTam = tam;
    }
  console.log("tam", tam);
  let lopdaotao = await LopDaoTao.findById(lopdaotaoID);
  if (!lopdaotao)
    throw new AppError(400, "lopdaotao not found", "Update  lopdaotao Error");

  const nhomhinhthuccapnhats = (await DaTaFix.findOne()).NhomHinhThucCapNhat;

  const hinhthuccapnhats = await HinhThucCapNhat.find();

  const hinhthuccapnhat = hinhthuccapnhats.find(
    (hinhthuccapnhat) => hinhthuccapnhat.Ma === lopdaotao.MaHinhThucCapNhat
  );
  const nhomhinhthuccapnhat = nhomhinhthuccapnhats.find(
    (nhom) => nhom.Ma === hinhthuccapnhat.MaNhomHinhThucCapNhat
  );
  lopdaotao = {
    ...lopdaotao.toObject(),
    TenHinhThucCapNhat: hinhthuccapnhat.Ten,
    MaNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ma,
    TenNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ten,
  };
let lopdaotaonhanvien =[]
if (!isTam) {
  console.log("tam", tam);
  lopdaotaonhanvien = await LopDaoTaoNhanVien.find({
    LopDaoTaoID: lopdaotaoID,
  })
    .populate("NhanVienID")
    .populate({
      path: "NhanVienID",
      populate: {
        path: "KhoaID",
      },
    });
} else {
  lopdaotaonhanvien = await LopDaoTaoNhanVienTam.find({
    LopDaoTaoID: lopdaotaoID,
    UserID:userID
  })
    .populate("NhanVienID")
    .populate({
      path: "NhanVienID",
      populate: {
        path: "KhoaID",
      },
    });
}
   
console.log("lopdaotaonhanvien", lopdaotaonhanvien);
  return sendResponse(
    res,
    200,
    true,
    { lopdaotao, lopdaotaonhanvien },
    null,
    "Get lopdaotao successful"
  );
});

lopdaotaoController.getlopdaotaosPhanTrang = catchAsync(
  async (req, res, next) => {
    // const curentUserId = req.userId;
    console.log("getlopdaotaosPhanTrang");
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

    console.log("filter", filterConditions);
    let lopdaotaos = await LopDaoTao.find(filterCriteria)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit);

    const nhomhinhthuccapnhats = (await DaTaFix.findOne()).NhomHinhThucCapNhat;

    const hinhthuccapnhats = await HinhThucCapNhat.find();

    lopdaotaos = lopdaotaos.map((lopdaotao) => {
      const hinhthuccapnhat = hinhthuccapnhats.find(
        (hinhthuccapnhat) => hinhthuccapnhat.Ma === lopdaotao.MaHinhThucCapNhat
      );
      const nhomhinhthuccapnhat = nhomhinhthuccapnhats.find(
        (nhom) => nhom.Ma === hinhthuccapnhat.MaNhomHinhThucCapNhat
      );
      return {
        ...lopdaotao.toObject(),
        TenHinhThucCapNhat: hinhthuccapnhat.Ten,
        MaNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ma,
        TenNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ten,
      };
    });
    return sendResponse(
      res,
      200,
      true,
      { lopdaotaos, totalPages, count },
      null,
      ""
    );
  }
);

lopdaotaoController.deleteOneLopDaoTao = catchAsync(async (req, res, next) => {
  const lopdaotaoID = req.params.lopdaotaoID;

  const lopdaotao = await LopDaoTao.findOneAndUpdate(
    {
      _id: lopdaotaoID,
    },
    { isDeleted: true },
    { new: true }
  );
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
  let lopdaotao = req.body;
  console.log("body", req.body);
  let lopdaotaoUpdate = await LopDaoTao.findById(lopdaotao._id || 0);
  if (!lopdaotaoUpdate)
    throw new AppError(
      400,
      "lopdaotaoUpdate not found",
      "Update lopdaotaoUpdate error"
    );
  if (lopdaotaoUpdate) {
    const oldSoLuong = lopdaotaoUpdate.SoLuong;
    const newSoLuong = lopdaotao.SoLuong;

    const id = lopdaotaoUpdate._id;
    lopdaotaoUpdate = await LopDaoTao.findByIdAndUpdate(id, lopdaotao, {
      new: true,
    });

    //Xử lý lấy thông tin hình thức cập nhật, nhóm hình thức cập nhật
    const nhomhinhthuccapnhats = (await DaTaFix.findOne()).NhomHinhThucCapNhat;

    const hinhthuccapnhats = await HinhThucCapNhat.find();

    const hinhthuccapnhat = hinhthuccapnhats.find(
      (hinhthuccapnhat) => hinhthuccapnhat.Ma === lopdaotao.MaHinhThucCapNhat
    );
    const nhomhinhthuccapnhat = nhomhinhthuccapnhats.find(
      (nhom) => nhom.Ma === hinhthuccapnhat.MaNhomHinhThucCapNhat
    );
    lopdaotao = {
      ...lopdaotao,
      TenHinhThucCapNhat: hinhthuccapnhat.Ten,
      MaNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ma,
      TenNhomHinhThucCapNhat: nhomhinhthuccapnhat.Ten,
    };

    // Kiểm tra SoLuong cũ và mới
    if (oldSoLuong !== newSoLuong) {
      const relatedLopDaoTaoNhanViens = await LopDaoTaoNhanVien.find({
        LopDaoTaoID: id,
      });

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

  console.log("lopdaotaoupdate", lopdaotaoUpdate);
  return sendResponse(
    res,
    200,
    true,
    lopdaotaoUpdate,
    null,
    "Update Suco successful"
  );
});
lopdaotaoController.updateTrangThaiLopDaoTao = catchAsync(
  async (req, res, next) => {
    let { TrangThai, lopdaotaoID } = { ...req.body };
    console.log("bodykk", req.body);
    let lopdaotaoUpdate = await LopDaoTao.findById(lopdaotaoID || 0);
    if (!lopdaotaoUpdate)
      throw new AppError(
        400,
        "lopdaotaoUpdate not found",
        "Update lopdaotaoUpdate error"
      );
    if (lopdaotaoUpdate) {
      lopdaotaoUpdate = await LopDaoTao.findByIdAndUpdate(
        lopdaotaoID,
        { TrangThai },
        {
          new: true,
        }
      );
    }
    console.log("lopdaotaoupdate", lopdaotaoUpdate);
    return sendResponse(
      res,
      200,
      true,
      lopdaotaoUpdate,
      null,
      "Update Suco successful"
    );
  }
);


lopdaotaoController.getUniqueNhanVienByLopDaoTaoID = catchAsync(async (req, res, next) => {
  const { lopdaotaoID } = req.params;

  console.log("lopdaotaoID", lopdaotaoID);
 
  // Lấy tất cả các bản ghi của LopDaoTaoNhanVienTam theo LopDaoTaoID
  let nhanVienTamList = await LopDaoTaoNhanVienTam.find({ LopDaoTaoID: lopdaotaoID }).populate("NhanVienID");

  // Loại bỏ các bản ghi trùng NhanVienID, chỉ giữ lại một NhanVienID duy nhất
  const uniqueNhanVienMap = new Map();

  nhanVienTamList.forEach((nhanVienTam) => {
    if (!uniqueNhanVienMap.has(nhanVienTam.NhanVienID._id.toString())) {
      uniqueNhanVienMap.set(nhanVienTam.NhanVienID._id.toString(), nhanVienTam);
    }
  });

  console.log("uniqueNhanVienMap", uniqueNhanVienMap);
  // Chuyển đổi Map thành mảng các bản ghi duy nhất
  const uniqueNhanVienList = Array.from(uniqueNhanVienMap.values());

  console.log("uniqueNhanVienList", uniqueNhanVienList);

  return sendResponse(res, 200, true, uniqueNhanVienList, null, "Get unique NhanVien by LopDaoTaoID successful");
});

module.exports = lopdaotaoController;
