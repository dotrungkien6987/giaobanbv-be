const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const { convertToVietnamDate } = require("../helpers/helpfunction");
const NhanVien = require("../models/NhanVien");
const LopDaoTaoNhanVien = require("../models/LopDaoTaoNhanVien");
const LopDaoTao = require("../models/LopDaoTao");
const DaTaFix = require("../models/DaTaFix");
const HinhThucCapNhat = require("../models/HinhThucCapNhat");
const LopDaoTaoNhanVienDT06 = require("../models/LopDaoTaoNhanVienDT06");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const nhanvienController = {};

nhanvienController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
  console.log("reqbody", req.body);
  const nhanvienData = { ...req.body };

  //Business Logic Validation

  let nhanvien = await NhanVien.create(nhanvienData);
  nhanvien = await NhanVien.findById(nhanvien._id).populate("KhoaID");

  //Process

  // baocaongay = await BaoCaoNgay.create({Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo });

  //Response
  sendResponse(res, 200, true, nhanvien, null, "Cap nhat Nhan vien success");
});

// Hàm hỗ trợ để lấy thông tin `Loai` từ `HinhThucCapNhat`
async function getLoai(maHinhThucCapNhat) {
  const hinhThucCapNhat = await HinhThucCapNhat.findOne({
    Ma: maHinhThucCapNhat,
  });
  return hinhThucCapNhat ? hinhThucCapNhat : null;
}

nhanvienController.getById = catchAsync(async (req, res, next) => {
  const nhanvienID = req.params.nhanvienID;
  console.log("userID", nhanvienID);

  let nhanvien = await NhanVien.findById(nhanvienID).populate("KhoaID");
  if (!nhanvien) throw new AppError(400, "NhanVien not found", "Error");

  // Lấy danh sách LopDaoTaoNhanVien của nhanvienID với các điều kiện
  const daotaos = await LopDaoTaoNhanVien.find({
    NhanVienID: nhanvienID,
    isDeleted: false,
  }).populate({
    path: "LopDaoTaoID",
    match: {
      isDeleted: false,
      TrangThai: true,
      MaHinhThucCapNhat: { $not: { $regex: "^ĐT06" } }, // Điều kiện không bắt đầu bằng 'ĐT06'
    },
  });

  // Lấy danh sách LopDaoTaoNhanVienDT06 của nhanvienID với các điều kiện
  const daotaosDT06 = await LopDaoTaoNhanVienDT06.find({
    NhanVienID: nhanvienID,
    isDeleted: false,
  }).populate({
    path: "LopDaoTaoID",
    match: {
      isDeleted: false,
      MaHinhThucCapNhat: { $regex: "^ĐT06" }, // Điều kiện bắt đầu bằng 'ĐT06'
    },
  });

  const daotaosFiltered = [];
  const nghiencuukhoahocsFiltered = [];
  const tinChiTichLuys = {};
  const hinhThuCapNhatMap = new Map(); // Map để lưu trữ thông tin HinhThucCapNhat

  // Tính tổng số tín chỉ tích lũy cho mỗi năm
  const calculateTinChiTichLuy = async (daotaosList) => {
    for (const daoTao of daotaosList) {
      if (daoTao.LopDaoTaoID && daoTao.LopDaoTaoID.MaHinhThucCapNhat) {
        const loai = await getLoai(daoTao.LopDaoTaoID.MaHinhThucCapNhat);
        const lopDaoTaoInfo = {
          ...daoTao.LopDaoTaoID.toObject(),
          VaiTro: daoTao.VaiTro,
          SoTinChiTichLuy: daoTao.SoTinChiTichLuy,
          Images: daoTao.Images,
          LopDaoTaoNhanVienID: daoTao._id,
          TenHinhThucCapNhat: loai.TenBenhVien,
        };

        if (loai.Loai === "Đào tạo") {
          daotaosFiltered.push(lopDaoTaoInfo);
        } else if (loai.Loai === "Nghiên cứu khoa học") {
          nghiencuukhoahocsFiltered.push(lopDaoTaoInfo);
        }
        // Trường hợp lop dao tao là ĐT06
        if (daoTao.LopDaoTaoID.MaHinhThucCapNhat.startsWith("ĐT06")) {
          const year = new Date(daoTao.DenNgay).getFullYear();

          if (!tinChiTichLuys[year]) {
            tinChiTichLuys[year] = 0;
          }
          tinChiTichLuys[year] += daoTao.SoTinChiTichLuy;
        }
        // Trường hợp không là ĐT06
        else if (daoTao.LopDaoTaoID.TrangThai) {
          const year = new Date(daoTao.LopDaoTaoID.NgayKetThuc).getFullYear();
          if (!tinChiTichLuys[year]) {
            tinChiTichLuys[year] = 0;
          }
          tinChiTichLuys[year] += daoTao.SoTinChiTichLuy;
        }

        // Tính toán thông tin HinhThucCapNhat
        if (!hinhThuCapNhatMap.has(daoTao.LopDaoTaoID.MaHinhThucCapNhat)) {
          const hinhThucCapNhatInfo = await HinhThucCapNhat.findOne({
            Ma: daoTao.LopDaoTaoID.MaHinhThucCapNhat,
          });
          if (hinhThucCapNhatInfo) {
            hinhThuCapNhatMap.set(daoTao.LopDaoTaoID.MaHinhThucCapNhat, {
              ma: hinhThucCapNhatInfo.Ma,
              label: hinhThucCapNhatInfo.TenBenhVien,
              value: 0,
            });
          }
        }
        if (hinhThuCapNhatMap.has(daoTao.LopDaoTaoID.MaHinhThucCapNhat)) {
          const hinhThucCapNhatData = hinhThuCapNhatMap.get(
            daoTao.LopDaoTaoID.MaHinhThucCapNhat
          );
          hinhThucCapNhatData.value += 1;
        }
      }
    }
  };

  // Tính tổng số tín chỉ tích lũy từ hai danh sách
  await calculateTinChiTichLuy(daotaos);
  await calculateTinChiTichLuy(daotaosDT06);

  // Sắp xếp daotaosFiltered và nghiencuukhoahocsFiltered theo NgayBatDau
  daotaosFiltered.sort(
    (a, b) => new Date(a.NgayBatDau) - new Date(b.NgayBatDau)
  );
  nghiencuukhoahocsFiltered.sort(
    (a, b) => new Date(a.NgayBatDau) - new Date(b.NgayBatDau)
  );

  // Chuyển đổi tinChiTichLuys thành mảng và sắp xếp theo năm
  const tinChiTichLuyArray = Object.keys(tinChiTichLuys)
    .map((year) => ({
      Year: year,
      TongTinChi: tinChiTichLuys[year],
    }))
    .sort((a, b) => a.Year - b.Year);

  // Chuyển đổi hinhThuCapNhatMap thành mảng
  const hinhThuCapNhatArray = Array.from(hinhThuCapNhatMap.values());

  const result = {
    nhanvien,
    daotaos: daotaosFiltered,
    nghiencuukhoahocs: nghiencuukhoahocsFiltered,
    TinChiTichLuys: tinChiTichLuyArray,
    hinhthuccapnhats: hinhThuCapNhatArray,
  };

  return sendResponse(res, 200, true, result, null, "Get NhanVien successful");
});

nhanvienController.getNhanviensPhanTrang = catchAsync(
  async (req, res, next) => {
    // const curentUserId = req.userId;

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

    console.log("filter", filterConditions);
    let nhanviens = await NhanVien.find(filterCriteria)
      .populate("KhoaID")
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
  }
);

nhanvienController.deleteOneNhanVien = catchAsync(async (req, res, next) => {
  const nhanvienID = req.params.nhanvienID;
  console.log("nhanvienID", req.params);
  const nhanvien = await NhanVien.findOneAndUpdate(
    {
      _id: nhanvienID,
    },
    { isDeleted: true },
    { new: true }
  );

  return sendResponse(res, 200, true, nhanvien, null, "Delete User successful");
});

nhanvienController.updateOneNhanVien = catchAsync(async (req, res, next) => {
  let { nhanvien } = req.body;
  console.log("body", nhanvien);
  let nhanvienUpdate = await NhanVien.findById(nhanvien._id || 0);
  if (!nhanvienUpdate)
    throw new AppError(
      400,
      "nhanvienUpdate not found",
      "Update nhanvienUpdate error"
    );
  if (nhanvienUpdate) {
    const id = nhanvienUpdate._id;
    nhanvienUpdate = await NhanVien.findByIdAndUpdate(id, nhanvien, {
      new: true,
    }).populate("KhoaID");
  }
  console.log("nhanvienupdate", nhanvienUpdate);
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
  console.log("body", req.body);
  const nhanVienArray = req.body.jsonData; // Mảng đối tượng nhân viên

  if (!Array.isArray(nhanVienArray)) {
    throw new AppError(
      400,
      "Dữ liệu nhập vào không hợp lệ",
      "Import NhanVien Error"
    );
  }

  for (const nhanvien of nhanVienArray) {
    // Chuyển đổi TenKhoa thành KhoaID
    const khoa = await Khoa.findOne({ TenKhoa: nhanvien.TenKhoa });
    if (!khoa) {
      throw new AppError(
        400,
        `Không tìm thấy khoa với tên: ${nhanvien.TenKhoa}`,
        "Import NhanVien Error"
      );
    }
    nhanvien.KhoaID = khoa._id;

    // Chuyển đổi NgaySinh từ text sang Date với múi giờ
    nhanvien.NgaySinh = moment
      .tz(nhanvien.NgaySinh, "DD/MM/YYYY", "Asia/Ho_Chi_Minh")
      .toDate();
    if (nhanvien.NgayCapCCHN) {
      nhanvien.NgayCapCCHN = moment
        .tz(nhanvien.NgayCapCCHN, "DD/MM/YYYY", "Asia/Ho_Chi_Minh")
        .toDate();
    }

    // Chuyển đổi GioiTinh từ text sang số
    if (nhanvien.GioiTinh === "Nam") {
      nhanvien.GioiTinh = 0;
    } else if (nhanvien.GioiTinh === "Nữ") {
      nhanvien.GioiTinh = 1;
    } else {
      throw new AppError(
        400,
        `Giới tính không hợp lệ: ${nhanvien.GioiTinh}`,
        "Import NhanVien Error"
      );
    }

    // Tạo một đối tượng mới từ model để validate dữ liệu
    let newNhanVien = new NhanVien(nhanvien);

    // Validate dữ liệu
    const validationError = newNhanVien.validateSync();
    if (validationError) {
      throw new AppError(
        400,
        `Dữ liệu không hợp lệ cho nhân viên: ${JSON.stringify(nhanvien)}`,
        validationError.message
      );
    }

    // Nếu dữ liệu hợp lệ, thực hiện cập nhật hoặc thêm mới
    await NhanVien.findOneAndUpdate(
      { MaNhanVien: nhanvien.MaNhanVien },
      { $set: nhanvien },
      { upsert: true, new: true }
    );
  }

  return sendResponse(res, 200, true, null, null, "Import NhanVien thành công");
});

nhanvienController.getNhanVienWithTinChiTichLuy = catchAsync(
  async (req, res, next) => {
    const { FromDate, ToDate } = req.query;

    // Kiểm tra sự hợp lệ của các tham số FromDate và ToDate
    if (!FromDate || !ToDate) {
      throw new AppError(
        400,
        "FromDate and ToDate are required",
        "Get NhanVien Error"
      );
    }

    const fromDate = new Date(FromDate);
    const toDate = new Date(ToDate);
    console.log("fromDate", fromDate);
    // Lấy danh sách nhân viên từ LopDaoTaoNhanVien với các điều kiện
    const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({
      isDeleted: false,
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          TrangThai: true,
          NgayKetThuc: {
            $gte: fromDate,
            $lte: toDate,
          },
          MaHinhThucCapNhat: { $not: { $regex: "^ĐT06" } }, // Điều kiện không bắt đầu bằng 'ĐT06'
        },
      })
      .populate({
        path: "NhanVienID",
        populate: { path: "KhoaID" },
      });

    const nhanVienMap = new Map();

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên
    for (const lopDaoTaoNhanVien of lopDaoTaoNhanVienList) {
      const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } = lopDaoTaoNhanVien;
      if (LopDaoTaoID && NhanVienID && !NhanVienID.isDeleted) {
        // Chỉ tính những bản ghi hợp lệ
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
          });
        }
        const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
        nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;
      }
    }

    // Chuyển đổi Map thành mảng kết quả
    const result = Array.from(nhanVienMap.values());

    return sendResponse(
      res,
      200,
      true,
      result,
      null,
      "Get NhanVien with TinChiTichLuy successful"
    );
  }
);

//Tinh tin chi tich luy cho tung nhan vien
nhanvienController.getAllNhanVienWithTinChiTichLuyCu = catchAsync(
  async (req, res, next) => {
    const { FromDate, ToDate, KhuyenCao, MaHinhThucCapNhatList } = req.query;

    // Kiểm tra sự hợp lệ của các tham số FromDate và ToDate
    if (!FromDate || !ToDate) {
      throw new AppError(
        400,
        "FromDate and ToDate are required",
        "Get NhanVien Error"
      );
    }

    const fromDate = convertToVietnamDate(FromDate);
    const toDate = convertToVietnamDate(ToDate, true);
    console.log("fromDate", fromDate);

    // Lấy danh sách nhân viên từ LopDaoTaoNhanVien với các điều kiện
    const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({
      isDeleted: false,
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          TrangThai: true,
          NgayKetThuc: {
            $gte: fromDate,
            $lte: toDate,
          },
          MaHinhThucCapNhat: { $not: { $regex: "^ĐT06" } }, // Điều kiện không bắt đầu bằng 'ĐT06'
        },
      })
      .populate({
        path: "NhanVienID",
        populate: { path: "KhoaID" },
      });

    const nhanVienMap = new Map();

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVien
    for (const lopDaoTaoNhanVien of lopDaoTaoNhanVienList) {
      const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } = lopDaoTaoNhanVien;
      if (LopDaoTaoID && NhanVienID && !NhanVienID.isDeleted) {
        // Chỉ tính những bản ghi hợp lệ
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
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
        $lte: toDate,
      },
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,

          MaHinhThucCapNhat: { $regex: "^ĐT06" }, // Điều kiện bắt đầu bằng 'ĐT06'
        },
      })
      .populate({
        path: "NhanVienID",
        populate: { path: "KhoaID" },
      });

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVienDT06
    for (const lopDaoTaoNhanVienDT06 of lopDaoTaoNhanVienDT06List) {
      const { NhanVienID, SoTinChiTichLuy } = lopDaoTaoNhanVienDT06;
      if (NhanVienID && !NhanVienID.isDeleted) {
        // Chỉ tính những bản ghi hợp lệ
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
          });
        }
        const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
        nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;
      }
    }

    // Lấy tất cả các nhân viên không bị xóa
    const allNhanVien = await NhanVien.find({ isDeleted: false }).populate(
      "KhoaID"
    );

    // Thêm những nhân viên không có trong lopDaoTaoNhanVienList và lopDaoTaoNhanVienDT06List vào kết quả với totalSoTinChiTichLuy = 0
    for (const nhanVien of allNhanVien) {
      if (!nhanVienMap.has(nhanVien._id.toString())) {
        nhanVienMap.set(nhanVien._id.toString(), {
          nhanVien: nhanVien,
          totalSoTinChiTichLuy: 0,
        });
      }
    }

    // Chuyển đổi Map thành mảng kết quả
    // const result = Array.from(nhanVienMap.values());
    // Chuyển đổi Map thành mảng kết quả
    const result = Array.from(nhanVienMap.values()).map((nhanVienData) => {
      return {
        ...nhanVienData,
        Dat: KhuyenCao
          ? nhanVienData.totalSoTinChiTichLuy >= Number(KhuyenCao)
          : false, // Xử lý logic Dat
      };
    });
    return sendResponse(
      res,
      200,
      true,
      result,
      null,
      "Get NhanVien with TinChiTichLuy successful"
    );
  }
);
nhanvienController.getAllNhanVienWithTinChiTichLuyByKhoa = catchAsync(
  async (req, res, next) => {
    const { FromDate, ToDate, KhuyenCao, khoaID } = req.query;

    // Kiểm tra sự hợp lệ của các tham số FromDate, ToDate và khoaID
    if (!FromDate || !ToDate || !khoaID) {
      throw new AppError(
        400,
        "FromDate, ToDate and khoaID are required",
        "Get NhanVien Error"
      );
    }

    const fromDate = convertToVietnamDate(FromDate);
    const toDate = convertToVietnamDate(ToDate, true);
    console.log("khoaID", khoaID);

    // Lấy danh sách nhân viên từ LopDaoTaoNhanVien với các điều kiện
    const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({
      isDeleted: false,
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          TrangThai: true,
          NgayKetThuc: {
            $gte: fromDate,
            $lte: toDate,
          },
          MaHinhThucCapNhat: { $not: { $regex: "^ĐT06" } }, // Điều kiện không bắt đầu bằng 'ĐT06'
        },
      })
      .populate({
        path: "NhanVienID",
        match: { KhoaID: khoaID }, // Chỉ lấy những nhân viên thuộc khoaID
        populate: { path: "KhoaID" },
      });

    const nhanVienMap = new Map();

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVien
    for (const lopDaoTaoNhanVien of lopDaoTaoNhanVienList) {
      const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } = lopDaoTaoNhanVien;
      if (LopDaoTaoID && NhanVienID && !NhanVienID.isDeleted) {
        // Chỉ tính những bản ghi hợp lệ
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
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
        $lte: toDate,
      },
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          MaHinhThucCapNhat: { $regex: "^ĐT06" }, // Điều kiện bắt đầu bằng 'ĐT06'
        },
      })
      .populate({
        path: "NhanVienID",
        match: { KhoaID: khoaID }, // Chỉ lấy những nhân viên thuộc khoaID
        populate: { path: "KhoaID" },
      });

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVienDT06
    for (const lopDaoTaoNhanVienDT06 of lopDaoTaoNhanVienDT06List) {
      const { NhanVienID, SoTinChiTichLuy } = lopDaoTaoNhanVienDT06;
      if (NhanVienID && !NhanVienID.isDeleted) {
        // Chỉ tính những bản ghi hợp lệ
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
          });
        }
        const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
        nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;
      }
    }

    // Lấy tất cả các nhân viên không bị xóa và thuộc khoaID
    const allNhanVien = await NhanVien.find({
      isDeleted: false,
      KhoaID: khoaID,
    }).populate("KhoaID");

    // Thêm những nhân viên không có trong lopDaoTaoNhanVienList và lopDaoTaoNhanVienDT06List vào kết quả với totalSoTinChiTichLuy = 0
    for (const nhanVien of allNhanVien) {
      if (!nhanVienMap.has(nhanVien._id.toString())) {
        nhanVienMap.set(nhanVien._id.toString(), {
          nhanVien: nhanVien,
          totalSoTinChiTichLuy: 0,
        });
      }
    }

    // Chuyển đổi Map thành mảng kết quả
    const result = Array.from(nhanVienMap.values()).map((nhanVienData) => {
      return {
        ...nhanVienData,
        Dat: KhuyenCao
          ? nhanVienData.totalSoTinChiTichLuy >= Number(KhuyenCao)
          : false, // Xử lý logic Dat
      };
    });

    return sendResponse(
      res,
      200,
      true,
      result,
      null,
      "Get NhanVien with TinChiTichLuy by Khoa successful"
    );
  }
);

nhanvienController.getTongHopSoLuongThucHien = catchAsync(
  async (req, res, next) => {
    const { FromDate, ToDate } = req.query;

    // Kiểm tra sự hợp lệ của các tham số FromDate và ToDate
    if (!FromDate || !ToDate) {
      throw new AppError(
        400,
        "FromDate and ToDate are required",
        "Get Summary Error"
      );
    }

    const fromDate = new Date(FromDate);
    const toDate = new Date(ToDate);

    // Lấy danh sách HinhThucCapNhat
    const hinhThucCapNhatList = await HinhThucCapNhat.find({});

    const result = [];

    for (const hinhThuc of hinhThucCapNhatList) {
      const maHinhThucCapNhat = hinhThuc.Ma;

      // Tính tổng số lượng và số bản ghi từ bảng LopDaoTao
      const lopDaoTaoList = await LopDaoTao.find({
        MaHinhThucCapNhat: maHinhThucCapNhat,
        isDeleted: false,

        NgayBatDau: {
          $gte: fromDate,
          $lte: toDate,
        },
      });

      const totalSoThanhVien = lopDaoTaoList.reduce(
        (acc, curr) => acc + curr.SoThanhVien,
        0
      );
      const lopDaoTaoCount = lopDaoTaoList.length;

      result.push({
        MaHinhThucCapNhat: maHinhThucCapNhat,
        Ten: hinhThuc.TenBenhVien,
        Loai: hinhThuc.Loai,
        totalSoThanhVien,
        lopDaoTaoCount,
      });
    }
    // Sắp xếp kết quả theo lopDaoTaoCount từ lớn đến bé
    result.sort((a, b) => b.lopDaoTaoCount - a.lopDaoTaoCount);

    return sendResponse(
      res,
      200,
      true,
      result,
      null,
      "Get Summary by HinhThucCapNhat successful"
    );
  }
);

nhanvienController.getCoCauNguonNhanLuc1 = catchAsync(
  async (req, res, next) => {
    // Lấy thông tin các nhóm QuyDoi từ DaTaFix
    const dataFix = await DaTaFix.findOne(); // Giả sử chỉ có một document trong DaTaFix
    const nhomQuyDoi1 = [
      ...new Set(
        dataFix.TrinhDoChuyenMon.map((td) => td.QuyDoi1).filter(
          (quyDoi) => quyDoi
        )
      ),
    ];
    const nhomQuyDoi2 = [
      ...new Set(
        dataFix.TrinhDoChuyenMon.map((td) => td.QuyDoi2).filter(
          (quyDoi) => quyDoi
        )
      ),
    ];

    // Lấy toàn bộ danh sách NhanVien
    const nhanViens = await NhanVien.find({ isDeleted: false });

    // Nhóm lại theo QuyDoi1 với nhóm 'Khác' nếu không ánh xạ được
    const resultQuyDoi1 = nhomQuyDoi1.map((quyDoi1) => {
      const soLuong = nhanViens.filter((nv) => {
        const trinhDo = nv.TrinhDoChuyenMon;
        return dataFix.TrinhDoChuyenMon.some(
          (td) => td.QuyDoi1 === quyDoi1 && td.TrinhDoChuyenMon === trinhDo
        );
      }).length;
      return { QuyDoi: quyDoi1, SoLuong: soLuong };
    });

    // Xử lý nhóm 'Khác' cho QuyDoi1
    const soLuongKhacQuyDoi1 = nhanViens.filter((nv) => {
      const trinhDo = nv.TrinhDoChuyenMon;
      return !dataFix.TrinhDoChuyenMon.some((td) => td.QuyDoi1 === trinhDo);
    }).length;
    resultQuyDoi1.push({ QuyDoi: "Khác", SoLuong: soLuongKhacQuyDoi1 });

    // Nhóm lại theo QuyDoi2 với nhóm 'Khác' nếu không ánh xạ được
    const resultQuyDoi2 = nhomQuyDoi2.map((quyDoi2) => {
      const soLuong = nhanViens.filter((nv) => {
        const trinhDo = nv.TrinhDoChuyenMon;
        return dataFix.TrinhDoChuyenMon.some(
          (td) => td.QuyDoi2 === quyDoi2 && td.TrinhDoChuyenMon === trinhDo
        );
      }).length;
      return { QuyDoi: quyDoi2, SoLuong: soLuong };
    });

    // Xử lý nhóm 'Khác' cho QuyDoi2
    const soLuongKhacQuyDoi2 = nhanViens.filter((nv) => {
      const trinhDo = nv.TrinhDoChuyenMon;
      return !dataFix.TrinhDoChuyenMon.some((td) => td.QuyDoi2 === trinhDo);
    }).length;
    resultQuyDoi2.push({ QuyDoi: "Khác", SoLuong: soLuongKhacQuyDoi2 });

    // Trả về kết quả với 2 key nhomQuyDoi1 và nhomQuyDoi2
    return sendResponse(
      res,
      200,
      true,
      { nhomQuyDoi1: resultQuyDoi1, nhomQuyDoi2: resultQuyDoi2 },
      null,
      "Lấy dữ liệu nhân viên theo QuyDoi thành công"
    );
  }
);

nhanvienController.getCoCauNguonNhanLuc = catchAsync(async (req, res, next) => {
  // Lấy thông tin các nhóm QuyDoi từ DaTaFix
  const dataFix = await DaTaFix.findOne();
  if (!dataFix) {
    throw new AppError(404, "DataFix not found", "Get CoCauNguonNhanLuc error");
  }

  const nhomQuyDoi1 = [
    ...new Set(
      dataFix.TrinhDoChuyenMon.map((td) => td.QuyDoi1).filter(
        (quyDoi) => quyDoi
      )
    ),
  ];
  const nhomQuyDoi2 = [
    ...new Set(
      dataFix.TrinhDoChuyenMon.map((td) => td.QuyDoi2).filter(
        (quyDoi) => quyDoi
      )
    ),
  ];

  // Lấy toàn bộ danh sách NhanVien
  const nhanViens = await NhanVien.find({ isDeleted: false });

  // Hàm hỗ trợ để nhóm nhân viên theo QuyDoi
  const groupByQuyDoi = (nhanViens, nhomQuyDoi, quyDoiType) => {
    const result = nhomQuyDoi.map((quyDoi) => {
      const soLuong = nhanViens.filter((nv) => {
        const trinhDo = nv.TrinhDoChuyenMon;
        return dataFix.TrinhDoChuyenMon.some(
          (td) => td[quyDoiType] === quyDoi && td.TrinhDoChuyenMon === trinhDo
        );
      }).length;
      return { label: quyDoi, value: soLuong };
    });

    // Xử lý nhóm 'Khác'
    const soLuongKhac = nhanViens.filter((nv) => {
      const trinhDo = nv.TrinhDoChuyenMon;
      return !dataFix.TrinhDoChuyenMon.some(
        (td) =>
          td[quyDoiType] &&
          nhomQuyDoi.includes(td[quyDoiType]) &&
          td.TrinhDoChuyenMon === trinhDo
      );
    }).length;

    const khacIndex = result.findIndex((item) => item.label === "Khác");
    if (khacIndex !== -1) {
      result[khacIndex].value += soLuongKhac;
    } else {
      result.push({ label: "Khác", value: soLuongKhac });
    }

    return result;
  };

  const resultQuyDoi1 = groupByQuyDoi(nhanViens, nhomQuyDoi1, "QuyDoi1");
  const resultQuyDoi2 = groupByQuyDoi(nhanViens, nhomQuyDoi2, "QuyDoi2");

  // Sắp xếp kết quả
  const sortOrderQuyDoi1 = ["Bác sĩ", "Điều dưỡng", "Kỹ thuật viên", "Dược sĩ"];
  const sortOrderQuyDoi2 = [
    "PGS - Tiến sĩ y học",
    "Tiến sĩ y học",
    "Bác sĩ CKII",
    "Bác sĩ CKI",
    "Thạc sĩ bác sĩ",
    "Bác sĩ nội trú",
    "Bác sĩ",
    "Điều dưỡng CKI",
    "Điều dưỡng đại học",
    "Điều dưỡng cao đẳng",
    "Thạc sĩ khác",
    "CKI khác",
    "Kỹ sư",
    "Cử nhân",
  ];

  const sortResult = (result, sortOrder) => {
    const sorted = result.sort((a, b) => {
      const indexA = sortOrder.indexOf(a.label);
      const indexB = sortOrder.indexOf(b.label);

      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    // Đưa nhóm 'Khác' xuống cuối cùng
    const khacIndex = sorted.findIndex((item) => item.label === "Khác");
    if (khacIndex !== -1) {
      const khacItem = sorted.splice(khacIndex, 1)[0];
      sorted.push(khacItem);
    }

    return sorted;
  };

  const sortedResultQuyDoi1 = sortResult(resultQuyDoi1, sortOrderQuyDoi1);
  const sortedResultQuyDoi2 = sortResult(resultQuyDoi2, sortOrderQuyDoi2);

  // Hàm hỗ trợ để đếm số NhanVien có và không có ChungChiHanhNghe
  const countNhanVienChungChiHanhNghe = (nhanViens) => {
    const coChungChi = nhanViens.filter(
      (nv) => nv.SoCCHN && nv.SoCCHN.trim() !== "" && !nv.isDeleted
    ).length;
    const khongChungChi = nhanViens.filter(
      (nv) => (!nv.SoCCHN || nv.SoCCHN.trim() === "") && !nv.isDeleted
    ).length;
    return [
      { label: "Có CCHN", value: coChungChi },
      { label: "Không có CCHN", value: khongChungChi },
    ];
  };

  const resultChungChiHanhNghe = countNhanVienChungChiHanhNghe(nhanViens);

  return sendResponse(
    res,
    200,
    true,
    {
      resultQuyDoi1: sortedResultQuyDoi1,
      resultQuyDoi2: sortedResultQuyDoi2,
      resultChungChiHanhNghe,
    },
    null,
    "Get CoCauNguonNhanLuc successful"
  );
});

nhanvienController.getCoCauNguonNhanLucByKhoa = catchAsync(
  async (req, res, next) => {
    const { khoaID } = req.params;

    // Lấy thông tin các nhóm QuyDoi từ DaTaFix
    const dataFix = await DaTaFix.findOne();
    if (!dataFix) {
      throw new AppError(
        404,
        "DataFix not found",
        "Get CoCauNguonNhanLuc error"
      );
    }

    const nhomQuyDoi1 = [
      ...new Set(
        dataFix.TrinhDoChuyenMon.map((td) => td.QuyDoi1).filter(
          (quyDoi) => quyDoi
        )
      ),
    ];
    const nhomQuyDoi2 = [
      ...new Set(
        dataFix.TrinhDoChuyenMon.map((td) => td.QuyDoi2).filter(
          (quyDoi) => quyDoi
        )
      ),
    ];

    // Lấy danh sách NhanVien của khoa cụ thể
    const nhanViens = await NhanVien.find({ isDeleted: false, KhoaID: khoaID });

    // Hàm hỗ trợ để nhóm nhân viên theo QuyDoi
    const groupByQuyDoi = (nhanViens, nhomQuyDoi, quyDoiType) => {
      const result = nhomQuyDoi.map((quyDoi) => {
        const soLuong = nhanViens.filter((nv) => {
          const trinhDo = nv.TrinhDoChuyenMon;
          return dataFix.TrinhDoChuyenMon.some(
            (td) => td[quyDoiType] === quyDoi && td.TrinhDoChuyenMon === trinhDo
          );
        }).length;
        return { label: quyDoi, value: soLuong };
      });

      // Xử lý nhóm 'Khác'
      const soLuongKhac = nhanViens.filter((nv) => {
        const trinhDo = nv.TrinhDoChuyenMon;
        return !dataFix.TrinhDoChuyenMon.some(
          (td) =>
            td[quyDoiType] &&
            nhomQuyDoi.includes(td[quyDoiType]) &&
            td.TrinhDoChuyenMon === trinhDo
        );
      }).length;

      const khacIndex = result.findIndex((item) => item.label === "Khác");
      if (khacIndex !== -1) {
        result[khacIndex].value += soLuongKhac;
      } else {
        result.push({ label: "Khác", value: soLuongKhac });
      }

      return result;
    };

    const resultQuyDoi1 = groupByQuyDoi(nhanViens, nhomQuyDoi1, "QuyDoi1");
    const resultQuyDoi2 = groupByQuyDoi(nhanViens, nhomQuyDoi2, "QuyDoi2");

    // Sắp xếp kết quả
    const sortOrderQuyDoi1 = [
      "Bác sĩ",
      "Điều dưỡng",
      "Kỹ thuật viên",
      "Dược sĩ",
    ];
    const sortOrderQuyDoi2 = [
      "PGS - Tiến sĩ y học",
      "Tiến sĩ y học",
      "Bác sĩ CKII",
      "Bác sĩ CKI",
      "Thạc sĩ bác sĩ",
      "Bác sĩ nội trú",
      "Bác sĩ",
      "Điều dưỡng CKI",
      "Điều dưỡng đại học",
      "Điều dưỡng cao đẳng",
      "Thạc sĩ khác",
      "CKI khác",
      "Kỹ sư",
      "Cử nhân",
    ];

    const sortResult = (result, sortOrder) => {
      const sorted = result.sort((a, b) => {
        const indexA = sortOrder.indexOf(a.label);
        const indexB = sortOrder.indexOf(b.label);

        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });

      // Đưa nhóm 'Khác' xuống cuối cùng
      const khacIndex = sorted.findIndex((item) => item.label === "Khác");
      if (khacIndex !== -1) {
        const khacItem = sorted.splice(khacIndex, 1)[0];
        sorted.push(khacItem);
      }

      return sorted;
    };

    const sortedResultQuyDoi1 = sortResult(resultQuyDoi1, sortOrderQuyDoi1);
    const sortedResultQuyDoi2 = sortResult(resultQuyDoi2, sortOrderQuyDoi2);

    // Hàm hỗ trợ để đếm số NhanVien có và không có ChungChiHanhNghe
    const countNhanVienChungChiHanhNghe = (nhanViens) => {
      const coChungChi = nhanViens.filter(
        (nv) => nv.SoCCHN && nv.SoCCHN.trim() !== "" && !nv.isDeleted
      ).length;
      const khongChungChi = nhanViens.filter(
        (nv) => (!nv.SoCCHN || nv.SoCCHN.trim() === "") && !nv.isDeleted
      ).length;
      return [
        { label: "Có CCHN", value: coChungChi },
        { label: "Không có CCHN", value: khongChungChi },
      ];
    };

    const resultChungChiHanhNghe = countNhanVienChungChiHanhNghe(nhanViens);

    return sendResponse(
      res,
      200,
      true,
      {
        resultQuyDoi1: sortedResultQuyDoi1,
        resultQuyDoi2: sortedResultQuyDoi2,
        resultChungChiHanhNghe,
      },
      null,
      "Get CoCauNguonNhanLuc successful"
    );
  }
);

nhanvienController.getTongHopSoLuongTheoKhoa = catchAsync(
  async (req, res, next) => {
    const { FromDate, ToDate, KhuyenCao } = req.query;

    // Kiểm tra sự hợp lệ của các tham số FromDate và ToDate
    if (!FromDate || !ToDate) {
      throw new AppError(
        400,
        "FromDate and ToDate are required",
        "Get Khoa Summary Error"
      );
    }

    const fromDate = new Date(FromDate);
    const toDate = new Date(ToDate);

    // Lấy tất cả các khoa
    const khoaList = await Khoa.find({});
    let result = [];

    // Lấy danh sách nhân viên từ LopDaoTaoNhanVien với các điều kiện
    const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({
      isDeleted: false,
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          TrangThai: true,
          NgayKetThuc: {
            $gte: fromDate,
            $lte: toDate,
          },
          MaHinhThucCapNhat: { $not: { $regex: "^ĐT06" } }, // Điều kiện không bắt đầu bằng 'ĐT06'
        },
      })
      .populate({
        path: "NhanVienID",
        populate: { path: "KhoaID" },
      });

    const nhanVienMap = new Map();

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVien
    for (const lopDaoTaoNhanVien of lopDaoTaoNhanVienList) {
      const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } = lopDaoTaoNhanVien;
      if (LopDaoTaoID && NhanVienID && !NhanVienID.isDeleted) {
        // Chỉ tính những bản ghi hợp lệ
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
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
        $lte: toDate,
      },
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          MaHinhThucCapNhat: { $regex: "^ĐT06" }, // Điều kiện bắt đầu bằng 'ĐT06'
        },
      })
      .populate({
        path: "NhanVienID",
        populate: { path: "KhoaID" },
      });

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVienDT06
    for (const lopDaoTaoNhanVienDT06 of lopDaoTaoNhanVienDT06List) {
      const { NhanVienID, SoTinChiTichLuy } = lopDaoTaoNhanVienDT06;
      if (NhanVienID && !NhanVienID.isDeleted) {
        // Chỉ tính những bản ghi hợp lệ
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
          });
        }
        const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
        nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;
      }
    }

    // Lấy tất cả các nhân viên không bị xóa
    const allNhanVien = await NhanVien.find({ isDeleted: false }).populate(
      "KhoaID"
    );

    // Thêm những nhân viên không có trong lopDaoTaoNhanVienList và lopDaoTaoNhanVienDT06List vào kết quả với totalSoTinChiTichLuy = 0
    for (const nhanVien of allNhanVien) {
      if (!nhanVienMap.has(nhanVien._id.toString())) {
        nhanVienMap.set(nhanVien._id.toString(), {
          nhanVien: nhanVien,
          totalSoTinChiTichLuy: 0,
        });
      }
    }

    // Tính tổng số nhân viên trong mỗi khoa, số nhân viên Dat=true và Dat=false
    for (const khoa of khoaList) {
      const khoaId = khoa._id;
      const nhanVienList = Array.from(nhanVienMap.values()).filter(
        (nvData) => nvData.nhanVien.KhoaID._id.toString() === khoaId.toString()
      );

      const totalNhanVien = nhanVienList.length;
      const countDatTrue = nhanVienList.filter((nvData) =>
        KhuyenCao ? nvData.totalSoTinChiTichLuy >= Number(KhuyenCao) : false
      ).length;

      // Thêm logic kiểm tra SoCCHN không null hoặc không rỗng
      const countSoCCHN = nhanVienList.filter(
        (nvData) =>
          nvData.nhanVien.SoCCHN && nvData.nhanVien.SoCCHN.trim() !== ""
      ).length;
      const countDatFalse = countSoCCHN - countDatTrue;
      result.push({
        KhoaID: khoaId,
        TenKhoa: khoa.TenKhoa,
        totalNhanVien,
        countDatTrue,
        countDatFalse,
        countSoCCHN,
      });
    }
    result = result.filter((item) => item.totalNhanVien > 0);
    result.sort((a, b) => b.totalNhanVien - a.totalNhanVien);

    // Tính tổng các giá trị
    const totalSummary = result.reduce(
      (acc, item) => {
        acc.totalNhanVien += item.totalNhanVien;
        acc.countDatTrue += item.countDatTrue;
        acc.countDatFalse += item.countDatFalse;
        acc.countSoCCHN += item.countSoCCHN;
        return acc;
      },
      { totalNhanVien: 0, countDatTrue: 0, countDatFalse: 0, countSoCCHN: 0 }
    );

    // Thêm dòng tổng cộng vào đầu kết quả
    result.unshift({
      KhoaID: null,
      TenKhoa: "Tổng cộng",
      ...totalSummary,
    });

    return sendResponse(
      res,
      200,
      true,
      result,
      null,
      "Get Summary by Khoa successful"
    );
  }
);
nhanvienController.getAllNhanVienWithTinChiTichLuy = catchAsync(
  async (req, res, next) => {
    const {
      FromDate,
      ToDate,
      KhuyenCao,
      MaHinhThucCapNhatList = [],
    } = req.query;

    // Kiểm tra sự hợp lệ của các tham số FromDate và ToDate
    if (!FromDate || !ToDate) {
      throw new AppError(
        400,
        "FromDate and ToDate are required",
        "Get NhanVien Error"
      );
    }

    const fromDate = convertToVietnamDate(FromDate);
    const toDate = convertToVietnamDate(ToDate, true);

    // Lấy danh sách nhân viên từ LopDaoTaoNhanVien với các điều kiện
    const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({
      isDeleted: false,
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          TrangThai: true,
          NgayKetThuc: {
            $gte: fromDate,
            $lte: toDate,
          },
          MaHinhThucCapNhat: { $not: { $regex: "^ĐT06" } },
        },
      })
      .populate({
        path: "NhanVienID",
        populate: { path: "KhoaID" },
      });

    const nhanVienMap = new Map();

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVien
    for (const lopDaoTaoNhanVien of lopDaoTaoNhanVienList) {
      const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } = lopDaoTaoNhanVien;
      if (LopDaoTaoID && NhanVienID && !NhanVienID.isDeleted) {
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
            ...MaHinhThucCapNhatList.reduce(
              (acc, ma) => ({ ...acc, [ma]: 0 }),
              {}
            ),
          });
        }
        const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
        nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;

        // Cập nhật số lần tham gia cho các mã hình thức cập nhật
        if (
          LopDaoTaoID.MaHinhThucCapNhat &&
          MaHinhThucCapNhatList.includes(LopDaoTaoID.MaHinhThucCapNhat)
        ) {
          nhanVienData[LopDaoTaoID.MaHinhThucCapNhat] += 1;
        }
      }
    }

    // Lấy danh sách nhân viên từ bảng LopDaoTaoNhanVienDT06 với các điều kiện
    const lopDaoTaoNhanVienDT06List = await LopDaoTaoNhanVienDT06.find({
      isDeleted: false,
      DenNgay: {
        $gte: fromDate,
        $lte: toDate,
      },
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          MaHinhThucCapNhat: { $regex: "^ĐT06" },
        },
      })
      .populate({
        path: "NhanVienID",
        populate: { path: "KhoaID" },
      });

    // Tính tổng số tín chỉ tích lũy cho mỗi nhân viên từ bảng LopDaoTaoNhanVienDT06
    for (const lopDaoTaoNhanVienDT06 of lopDaoTaoNhanVienDT06List) {
      const { NhanVienID, LopDaoTaoID, SoTinChiTichLuy } =
        lopDaoTaoNhanVienDT06;
      if (NhanVienID && LopDaoTaoID && !NhanVienID.isDeleted) {
        if (!nhanVienMap.has(NhanVienID._id.toString())) {
          nhanVienMap.set(NhanVienID._id.toString(), {
            nhanVien: NhanVienID,
            totalSoTinChiTichLuy: 0,
            ...MaHinhThucCapNhatList.reduce(
              (acc, ma) => ({ ...acc, [ma]: 0 }),
              {}
            ),
          });
        }
        const nhanVienData = nhanVienMap.get(NhanVienID._id.toString());
        nhanVienData.totalSoTinChiTichLuy += SoTinChiTichLuy;

        // Cập nhật số lần tham gia cho các mã hình thức cập nhật
        if (
          LopDaoTaoID.MaHinhThucCapNhat &&
          MaHinhThucCapNhatList.includes(LopDaoTaoID.MaHinhThucCapNhat)
        ) {
          nhanVienData[LopDaoTaoID.MaHinhThucCapNhat] += 1;
        }
      }
    }

    // Lấy tất cả các nhân viên không bị xóa
    const allNhanVien = await NhanVien.find({ isDeleted: false }).populate(
      "KhoaID"
    );

    // Thêm những nhân viên không có trong danh sách vào kết quả với totalSoTinChiTichLuy = 0
    for (const nhanVien of allNhanVien) {
      if (!nhanVienMap.has(nhanVien._id.toString())) {
        nhanVienMap.set(nhanVien._id.toString(), {
          nhanVien: nhanVien,
          totalSoTinChiTichLuy: 0,
          ...MaHinhThucCapNhatList.reduce(
            (acc, ma) => ({ ...acc, [ma]: 0 }),
            {}
          ),
        });
      }
    }

    // Chuyển đổi Map thành mảng kết quả
    const result = Array.from(nhanVienMap.values()).map((nhanVienData) => {
      return {
        ...nhanVienData,
        Dat: KhuyenCao
          ? nhanVienData.totalSoTinChiTichLuy >= Number(KhuyenCao)
          : false, // Xử lý logic Dat
      };
    });

    return sendResponse(
      res,
      200,
      true,
      result,
      null,
      "Get NhanVien with TinChiTichLuy successful"
    );
  }
);

// Hàm đơn giản chỉ trả thông tin cơ bản nhân viên cho QuanLyNhanVien
nhanvienController.getOneByNhanVienID = catchAsync(async (req, res, next) => {
  const nhanvienID = req.params.nhanvienID;

  let nhanvien = await NhanVien.findById(nhanvienID).populate("KhoaID");
  if (!nhanvien) {
    throw new AppError(400, "NhanVien not found");
  }

  return sendResponse(
    res,
    200,
    true,
    nhanvien,
    null,
    "Get NhanVien successful"
  );
});

module.exports = nhanvienController;
