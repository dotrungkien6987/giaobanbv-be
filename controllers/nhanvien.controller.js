const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const NhanVien = require("../models/NhanVien");
const LopDaoTaoNhanVien = require("../models/LopDaoTaoNhanVien");
const HinhThucCapNhat = require("../models/HinhThucCapNhat");
const LopDaoTaoNhanVienDT06 = require("../models/LopDaoTaoNhanVienDT06");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
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

// Hàm hỗ trợ để lấy thông tin `Loai` từ `HinhThucCapNhat`
async function getLoai(maHinhThucCapNhat) {
  const hinhThucCapNhat = await HinhThucCapNhat.findOne({ Ma: maHinhThucCapNhat });
  return hinhThucCapNhat ? hinhThucCapNhat.Loai : null;
}

nhanvienController.getById = catchAsync(async (req, res, next) => {
  
  const nhanvienID = req.params.nhanvienID;
console.log("userID",nhanvienID)
  let nhanvien = await NhanVien.findById(nhanvienID).populate('KhoaID');
  if (!nhanvien) throw new AppError(400, "NhanVien not found", "Error");
  // Lấy danh sách LopDaoTaoNhanVien của nhanvienID
  const daotaos = await LopDaoTaoNhanVien.find({ NhanVienID: nhanvienID }).populate('LopDaoTaoID');

  // Phân loại daotaos thành daotaos và nghiencuukhoahocs dựa trên Loai của HinhThucCapNhat
  const daotaosFiltered = [];
  const nghiencuukhoahocsFiltered = [];
  const tinChiTichLuys = {};

  for (const daoTao of daotaos) {
    const loai = await getLoai(daoTao.LopDaoTaoID.MaHinhThucCapNhat);
    const lopDaoTaoInfo = {
      ...daoTao.LopDaoTaoID.toObject(),
      VaiTro: daoTao.VaiTro,
      SoTinChiTichLuy: daoTao.SoTinChiTichLuy,
      Images:daoTao.Images,
      LopDaoTaoNhanVienID:daoTao._id
    };

    if (loai === 'Đào tạo') {
      daotaosFiltered.push(lopDaoTaoInfo);
    } else if (loai === 'Nghiên cứu khoa học') {
      nghiencuukhoahocsFiltered.push(lopDaoTaoInfo);
    }

     // Tính tổng TinChiTichLuy theo năm nếu TrangThai của LopDaoTao là true
     if (daoTao.LopDaoTaoID.TrangThai) {
      console.log("daoTao",daoTao)
      const year =  new Date(daoTao.LopDaoTaoID.NgayKetThuc).getFullYear();
      if (!tinChiTichLuys[year]) {
        tinChiTichLuys[year] = 0;
      }
      tinChiTichLuys[year] += daoTao.SoTinChiTichLuy;
    }
  }

// Sắp xếp daotaosFiltered và nghiencuukhoahocsFiltered theo NgayBatDau
daotaosFiltered.sort((a, b) => new Date(a.NgayBatDau) - new Date(b.NgayBatDau));
nghiencuukhoahocsFiltered.sort((a, b) => new Date(a.NgayBatDau) - new Date(b.NgayBatDau));

  // Chuyển đổi tinChiTichLuys thành mảng và sắp xếp theo năm
  const tinChiTichLuyArray = Object.keys(tinChiTichLuys).map(year => ({
    Year: year,
    TongTinChi: tinChiTichLuys[year]
  })).sort((a, b) => a.Year - b.Year);

  
  const result = {
    nhanvien,
    daotaos: daotaosFiltered,
    nghiencuukhoahocs: nghiencuukhoahocsFiltered,
    TinChiTichLuys: tinChiTichLuyArray
  };

  return sendResponse(res, 200, true, result, null, "Get NhanVien successful");
});


nhanvienController.getNhanviensPhanTrang = catchAsync(async (req, res, next) => {
  // const curentUserId = req.userId;
  console.log("getNhanViensPhanTrang")
  let { page, limit, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 2000;

  const filterConditions = [{ isDeleted: false }];

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


nhanvienController.importNhanVien = catchAsync(async (req, res, next) => {
  console.log("body",req.body)
  const nhanVienArray = req.body.jsonData; // Mảng đối tượng nhân viên

  if (!Array.isArray(nhanVienArray)) {
    throw new AppError(400, "Dữ liệu nhập vào không hợp lệ", "Import NhanVien Error");
  }

  for (const nhanvien of nhanVienArray) {
    // Chuyển đổi TenKhoa thành KhoaID
    const khoa = await Khoa.findOne({ TenKhoa: nhanvien.TenKhoa });
    if (!khoa) {
      throw new AppError(400, `Không tìm thấy khoa với tên: ${nhanvien.TenKhoa}`, "Import NhanVien Error");
    }
    nhanvien.KhoaID = khoa._id;

     // Chuyển đổi NgaySinh từ text sang Date với múi giờ
     nhanvien.NgaySinh = moment.tz(nhanvien.NgaySinh, "DD/MM/YYYY", "Asia/Ho_Chi_Minh").toDate();
     if (nhanvien.NgayCapCCHN) {
     nhanvien.NgayCapCCHN = moment.tz(nhanvien.NgayCapCCHN, "DD/MM/YYYY", "Asia/Ho_Chi_Minh").toDate();
     }

    // Chuyển đổi GioiTinh từ text sang số
    if (nhanvien.GioiTinh === "Nam") {
      nhanvien.GioiTinh = 0;
    } else if (nhanvien.GioiTinh === "Nữ") {
      nhanvien.GioiTinh = 1;
    } else {
      throw new AppError(400, `Giới tính không hợp lệ: ${nhanvien.GioiTinh}`, "Import NhanVien Error");
    }

    // Tạo một đối tượng mới từ model để validate dữ liệu
    let newNhanVien = new NhanVien(nhanvien);

    // Validate dữ liệu
    const validationError = newNhanVien.validateSync();
    if (validationError) {
      throw new AppError(400, `Dữ liệu không hợp lệ cho nhân viên: ${JSON.stringify(nhanvien)}`, validationError.message);
    }

    // Nếu dữ liệu hợp lệ, thực hiện cập nhật hoặc thêm mới
    await NhanVien.findOneAndUpdate(
      { MaNhanVien: nhanvien.MaNhanVien },
      { $set: nhanvien },
      { upsert: true, new: true }
    );
  }

  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Import NhanVien thành công"
  );
});

nhanvienController.getNhanVienWithTinChiTichLuy = catchAsync(async (req, res, next) => {
  const { FromDate, ToDate } = req.query;

  // Kiểm tra sự hợp lệ của các tham số FromDate và ToDate
  if (!FromDate || !ToDate) {
    throw new AppError(400, "FromDate and ToDate are required", "Get NhanVien Error");
  }

  const fromDate = new Date(FromDate);
  const toDate = new Date(ToDate);
console.log("fromDate",fromDate)
  // Lấy danh sách nhân viên từ LopDaoTaoNhanVien với các điều kiện
  const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({ isDeleted: false })
    .populate({
      path: 'LopDaoTaoID',
      match: {
        isDeleted: false,
        TrangThai: true,
        NgayKetThuc: {
          $gte: fromDate,
          $lte: toDate
        }
      }
    })
    .populate({
      path: 'NhanVienID',
      populate: { path: 'KhoaID' }
    });

    console.log("lopDaoTaoNhanVienList",lopDaoTaoNhanVienList)
  const nhanVienMap = new Map();

  // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên
  for (const lopDaoTaoNhanVien of lopDaoTaoNhanVienList) {
    const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } = lopDaoTaoNhanVien;
    if (LopDaoTaoID && NhanVienID && !NhanVienID.isDeleted) { // Chỉ tính những bản ghi hợp lệ
      if (!nhanVienMap.has(NhanVienID._id.toString())) {
        nhanVienMap.set(NhanVienID._id.toString(), {
          nhanVien: NhanVienID,
          totalSoTinChiTichLuy: 0
        });
      }
      const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
      nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;
    }
  }

  // Chuyển đổi Map thành mảng kết quả
  const result = Array.from(nhanVienMap.values());

  return sendResponse(res, 200, true, result, null, "Get NhanVien with TinChiTichLuy successful");
});

nhanvienController.getAllNhanVienWithTinChiTichLuy = catchAsync(async (req, res, next) => {
  const { FromDate, ToDate } = req.query;

  // Kiểm tra sự hợp lệ của các tham số FromDate và ToDate
  if (!FromDate || !ToDate) {
    throw new AppError(400, "FromDate and ToDate are required", "Get NhanVien Error");
  }

  const fromDate = new Date(FromDate);
  const toDate = new Date(ToDate);
  console.log("fromDate", fromDate);

  // Lấy danh sách nhân viên từ LopDaoTaoNhanVien với các điều kiện
  const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({ isDeleted: false })
    .populate({
      path: 'LopDaoTaoID',
      match: {
        isDeleted: false,
        TrangThai: true,
        NgayKetThuc: {
          $gte: fromDate,
          $lte: toDate
        },
        MaHinhThucCapNhat: { $ne: 'ĐT06' }
      }
    })
    .populate({
      path: 'NhanVienID',
      populate: { path: 'KhoaID' }
    });

  console.log("lopDaoTaoNhanVienList", lopDaoTaoNhanVienList);
  const nhanVienMap = new Map();

  // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVien
  for (const lopDaoTaoNhanVien of lopDaoTaoNhanVienList) {
    const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } = lopDaoTaoNhanVien;
    if (LopDaoTaoID && NhanVienID && !NhanVienID.isDeleted) { // Chỉ tính những bản ghi hợp lệ
      if (!nhanVienMap.has(NhanVienID._id.toString())) {
        nhanVienMap.set(NhanVienID._id.toString(), {
          nhanVien: NhanVienID,
          totalSoTinChiTichLuy: 0
        });
      }
      const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
      nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;
    }
  }

  // Lấy danh sách nhân viên từ bảng LopDaoTaoNhanVienDT06 với các điều kiện
  const lopDaoTaoNhanVienDT06List = await LopDaoTaoNhanVienDT06.find({
    isDeleted: false,
    DenNgay: {
      $gte: fromDate,
      $lte: toDate
    }
  })
  .populate({
    path: 'LopDaoTaoID',
    match: {
      isDeleted: false,
     
      MaHinhThucCapNhat: 'ĐT06'
    }
  })
  .populate({
    path: 'NhanVienID',
    populate: { path: 'KhoaID' }
  });

  console.log("lopDaoTaoNhanVienDT06List", lopDaoTaoNhanVienDT06List);

  // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVienDT06
  for (const lopDaoTaoNhanVienDT06 of lopDaoTaoNhanVienDT06List) {
    console.log("lopDaoTaoNhanVienDT06", lopDaoTaoNhanVienDT06);
    const { NhanVienID, SoTinChiTichLuy } = lopDaoTaoNhanVienDT06;
    if (NhanVienID && !NhanVienID.isDeleted) { // Chỉ tính những bản ghi hợp lệ
      if (!nhanVienMap.has(NhanVienID._id.toString())) {
        nhanVienMap.set(NhanVienID._id.toString(), {
          nhanVien: NhanVienID,
          totalSoTinChiTichLuy: 0
        });
      }
      const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
      nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;
    }
  }

  // Lấy tất cả các nhân viên không bị xóa
  const allNhanVien = await NhanVien.find({ isDeleted: false }).populate('KhoaID');

  // Thêm những nhân viên không có trong lopDaoTaoNhanVienList và lopDaoTaoNhanVienDT06List vào kết quả với totalSoTinChiTichLuy = 0
  for (const nhanVien of allNhanVien) {
    if (!nhanVienMap.has(nhanVien._id.toString())) {
      nhanVienMap.set(nhanVien._id.toString(), {
        nhanVien: nhanVien,
        totalSoTinChiTichLuy: 0
      });
    }
  }

  // Chuyển đổi Map thành mảng kết quả
  const result = Array.from(nhanVienMap.values());

  return sendResponse(res, 200, true, result, null, "Get NhanVien with TinChiTichLuy successful");
});
module.exports = nhanvienController;
