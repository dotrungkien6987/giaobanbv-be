const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const { convertToVietnamDate } = require("../helpers/helpfunction");
const NhanVien = require("../models/NhanVien");
const path = require("path");
const fs = require("fs-extra");
const mime = require("mime-types");
const uploadConfig = require("../modules/workmanagement/helpers/uploadConfig");
const LopDaoTaoNhanVien = require("../models/LopDaoTaoNhanVien");
const LopDaoTao = require("../models/LopDaoTao");
const DaTaFix = require("../models/DaTaFix");
const HinhThucCapNhat = require("../models/HinhThucCapNhat");
const LopDaoTaoNhanVienDT06 = require("../models/LopDaoTaoNhanVienDT06");
const Khoa = require("../models/Khoa");
const moment = require("moment-timezone");
const nhanvienController = {};

function pickAllowedNhanVienSelfUpdate(payload = {}) {
  const allowed = [
    // core profile fields
    "Ten",
    "NgaySinh",
    "Loai",
    "LoaiChuyenMonID",
    "TrinhDoChuyenMon",
    "DanToc",
    "SoCCHN",
    "NgayCapCCHN",
    "PhamViHanhNghe",
    "PhamViHanhNgheBoSung",
    "ChucDanh",
    "ChucVu",
    "CMND",
    "SoHoChieu",
    "SoDienThoai",
    "Email",
    "GioiTinh",
    // user requested: allow other basic flags too
    "DaNghi",
    "LyDoNghi",
    "isDangVien",
    "TinChiBanDau",
    "LyDoNghi",
  ];

  const out = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      out[key] = payload[key];
    }
  }

  // Hard blocks: cannot change these via self-service
  delete out.KhoaID;
  delete out.MaNhanVien;
  delete out.isDeleted;
  delete out.Avatar;
  delete out.Images;

  return out;
}

function relAvatarPath(nhanVienId, filename) {
  // store POSIX-style relative path for portability
  return path.posix.join("avatars", String(nhanVienId), String(filename));
}

// ===== Self-service endpoints =====
nhanvienController.getMe = catchAsync(async (req, res, next) => {
  const nhanVienId = req.user?.NhanVienID;
  if (!nhanVienId) {
    throw new AppError(
      400,
      "User chưa được gán nhân viên",
      "NHANVIEN_NOT_LINKED"
    );
  }

  const nhanVien = await NhanVien.findOne({ _id: nhanVienId, isDeleted: false })
    .populate("KhoaID")
    .populate({ path: "LoaiChuyenMonID", select: "LoaiChuyenMon TrinhDo" });

  if (!nhanVien) {
    throw new AppError(404, "Không tìm thấy nhân viên", "NHANVIEN_NOT_FOUND");
  }

  return sendResponse(
    res,
    200,
    true,
    nhanVien,
    null,
    "Lấy thông tin nhân viên thành công"
  );
});

nhanvienController.updateMe = catchAsync(async (req, res, next) => {
  const nhanVienId = req.user?.NhanVienID;
  if (!nhanVienId) {
    throw new AppError(
      400,
      "User chưa được gán nhân viên",
      "NHANVIEN_NOT_LINKED"
    );
  }

  const updateData = pickAllowedNhanVienSelfUpdate(req.body || {});

  const updated = await NhanVien.findOneAndUpdate(
    { _id: nhanVienId, isDeleted: false },
    updateData,
    { new: true, runValidators: true }
  )
    .populate("KhoaID")
    .populate({ path: "LoaiChuyenMonID", select: "LoaiChuyenMon TrinhDo" });

  if (!updated) {
    throw new AppError(404, "Không tìm thấy nhân viên", "NHANVIEN_NOT_FOUND");
  }

  return sendResponse(
    res,
    200,
    true,
    updated,
    null,
    "Cập nhật thông tin nhân viên thành công"
  );
});

nhanvienController.uploadMyAvatar = catchAsync(async (req, res, next) => {
  const nhanVienId = req.user?.NhanVienID;
  if (!nhanVienId) {
    throw new AppError(
      400,
      "User chưa được gán nhân viên",
      "NHANVIEN_NOT_LINKED"
    );
  }
  if (!req.file?.filename) {
    throw new AppError(400, "Chưa có file avatar", "AVATAR_FILE_REQUIRED");
  }

  const nhanVien = await NhanVien.findOne({
    _id: nhanVienId,
    isDeleted: false,
  }).select("Avatar");
  if (!nhanVien) {
    throw new AppError(404, "Không tìm thấy nhân viên", "NHANVIEN_NOT_FOUND");
  }

  const oldAvatar = nhanVien.Avatar;
  const newRel = relAvatarPath(nhanVienId, req.file.filename);
  nhanVien.Avatar = newRel;
  await nhanVien.save();

  // Best-effort cleanup old avatar file
  if (oldAvatar) {
    try {
      await fs.remove(uploadConfig.toAbs(oldAvatar));
    } catch (_) {}
  }

  return sendResponse(
    res,
    200,
    true,
    { Avatar: nhanVien.Avatar },
    null,
    "Cập nhật avatar thành công"
  );
});

nhanvienController.getAvatarByNhanVienID = catchAsync(
  async (req, res, next) => {
    const nhanVienId = req.params.nhanvienID;

    const nhanVien = await NhanVien.findOne({
      _id: nhanVienId,
      isDeleted: false,
    })
      .select("Avatar")
      .lean();
    if (!nhanVien) {
      throw new AppError(404, "Không tìm thấy nhân viên", "NHANVIEN_NOT_FOUND");
    }
    if (!nhanVien.Avatar) {
      throw new AppError(404, "Nhân viên chưa có avatar", "NO_AVATAR");
    }

    const abs = uploadConfig.toAbs(nhanVien.Avatar);
    const exists = await fs.pathExists(abs);
    if (!exists) {
      throw new AppError(
        404,
        "Không tìm thấy file avatar",
        "AVATAR_FILE_NOT_FOUND"
      );
    }

    const contentType = mime.lookup(abs) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    return res.sendFile(abs);
  }
);

// Helper: build aggregated cơ cấu nguồn nhân lực (theo LoaiChuyenMon + CCHN)
function buildCoCauNguonNhanLuc(nhanViens, dataFix) {
  // Lọc bỏ những nhân viên đã nghỉ (DaNghi === true)
  const activeNhanViens = (nhanViens || []).filter((nv) => !nv?.DaNghi);

  // Helper: lấy mã LoaiChuyenMon từ document (hỗ trợ trường hợp populated hoặc đã thêm trường LoaiChuyenMon)
  const getLoaiCode = (nv) => {
    if (!nv) return undefined;
    if (nv.LoaiChuyenMon && typeof nv.LoaiChuyenMon === "string")
      return nv.LoaiChuyenMon;
    if (nv.LoaiChuyenMonID && typeof nv.LoaiChuyenMonID === "object")
      return nv.LoaiChuyenMonID.LoaiChuyenMon;
    return undefined;
  };

  const loaiMap = {
    BAC_SI: "Bác sĩ",
    DUOC_SI: "Dược sĩ",
    DIEU_DUONG: "Điều dưỡng",
    KTV: "Kỹ thuật viên",
    KHAC: "Khác",
  };

  // 1) cocauChung: đếm theo LoaiChuyenMon (theo 5 label cố định)
  const cocauChungCounts = {
    "Bác sĩ": 0,
    "Dược sĩ": 0,
    "Điều dưỡng": 0,
    "Kỹ thuật viên": 0,
    Khác: 0,
  };

  for (const nv of activeNhanViens) {
    const code = getLoaiCode(nv);
    const label = loaiMap[code] || "Khác";
    cocauChungCounts[label] = (cocauChungCounts[label] || 0) + 1;
  }

  const cocauChung = Object.keys(cocauChungCounts).map((label) => ({
    label,
    value: cocauChungCounts[label],
  }));

  // 2) Hàm xây cocau cho từng nhóm LoaiChuyenMon theo TrinhDo (lấy từ LoaiChuyenMonID.TrinhDo)
  const buildCocauTheoTrinhDo = (loaiCode) => {
    const group = activeNhanViens.filter((nv) => getLoaiCode(nv) === loaiCode);
    const map = new Map();
    let khac = 0;
    for (const nv of group) {
      const trinh = (
        (nv.LoaiChuyenMonID && typeof nv.LoaiChuyenMonID === "object"
          ? nv.LoaiChuyenMonID.TrinhDo
          : "") || ""
      )
        .toString()
        .trim();
      if (trinh) map.set(trinh, (map.get(trinh) || 0) + 1);
      else khac++;
    }
    const arr = [...map.entries()].map(([label, value]) => ({ label, value }));
    arr.push({ label: "Khác", value: khac });
    return arr;
  };

  const cocauBacSi = buildCocauTheoTrinhDo("BAC_SI");
  const cocauDuocSi = buildCocauTheoTrinhDo("DUOC_SI");
  const cocauDieuDuong = buildCocauTheoTrinhDo("DIEU_DUONG");
  const cocauKTV = buildCocauTheoTrinhDo("KTV");

  // cocauKhac: những nhân viên không thuộc 4 mã trên
  const otherCodes = new Set(["BAC_SI", "DUOC_SI", "DIEU_DUONG", "KTV"]);
  const groupKhac = activeNhanViens.filter(
    (nv) => !otherCodes.has(getLoaiCode(nv))
  );
  const mapKhac = new Map();
  let khacCount = 0;
  for (const nv of groupKhac) {
    const trinh = (
      (nv.LoaiChuyenMonID && typeof nv.LoaiChuyenMonID === "object"
        ? nv.LoaiChuyenMonID.TrinhDo
        : "") || ""
    )
      .toString()
      .trim();
    if (trinh) mapKhac.set(trinh, (mapKhac.get(trinh) || 0) + 1);
    else khacCount++;
  }
  const cocauKhac = [...mapKhac.entries()].map(([label, value]) => ({
    label,
    value,
  }));
  cocauKhac.push({ label: "Khác", value: khacCount });

  // 3) Thống kê chứng chỉ hành nghề (trên nhân viên active)
  const coChungChi = activeNhanViens.filter(
    (nv) => nv?.SoCCHN && nv.SoCCHN.toString().trim() !== ""
  ).length;
  const khongChungChi = activeNhanViens.length - coChungChi;
  const resultChungChiHanhNghe = [
    { label: "Có CCHN", value: coChungChi },
    { label: "Không có CCHN", value: khongChungChi },
  ];

  return {
    cocauChung,
    cocauBacSi,
    cocauDuocSi,
    cocauDieuDuong,
    cocauKTV,
    cocauKhac,
    resultChungChiHanhNghe,
  };
}

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

  // Prefetch toàn bộ HinhThucCapNhat theo danh sách mã xuất hiện (giảm N truy vấn)
  const maSet = new Set();
  const collectMa = (list) => {
    for (const item of list || []) {
      const ma = item?.LopDaoTaoID?.MaHinhThucCapNhat;
      if (ma) maSet.add(ma);
    }
  };
  collectMa(daotaos);
  collectMa(daotaosDT06);
  const maArray = Array.from(maSet);
  const hinhThucDocs = maArray.length
    ? await HinhThucCapNhat.find({ Ma: { $in: maArray } }).lean()
    : [];
  const hinhThucByMa = new Map(hinhThucDocs.map((d) => [d.Ma, d]));

  // Tính tổng số tín chỉ tích lũy cho mỗi năm (dùng dữ liệu đã prefetch và có guard null)
  const calculateTinChiTichLuy = async (daotaosList) => {
    for (const daoTao of daotaosList) {
      const lop = daoTao?.LopDaoTaoID;
      const ma = lop?.MaHinhThucCapNhat;
      if (!lop || !ma) continue;

      const loaiDoc = hinhThucByMa.get(ma) || null;
      const tenHinhThuc = loaiDoc?.TenBenhVien || "";
      const lopDaoTaoInfo = {
        ...lop.toObject(),
        VaiTro: daoTao.VaiTro,
        SoTinChiTichLuy: daoTao.SoTinChiTichLuy,
        Images: daoTao.Images,
        LopDaoTaoNhanVienID: daoTao._id,
        TenHinhThucCapNhat: tenHinhThuc,
      };

      // Phân loại: nếu thiếu thông tin, mặc định vào 'Đào tạo' để giữ cấu trúc cũ
      if (loaiDoc?.Loai === "Nghiên cứu khoa học")
        nghiencuukhoahocsFiltered.push(lopDaoTaoInfo);
      else daotaosFiltered.push(lopDaoTaoInfo);

      // Cộng tín chỉ theo năm
      if (ma.startsWith("ĐT06")) {
        const year = daoTao.DenNgay
          ? new Date(daoTao.DenNgay).getFullYear()
          : null;
        if (year !== null) {
          if (!tinChiTichLuys[year]) tinChiTichLuys[year] = 0;
          tinChiTichLuys[year] += daoTao.SoTinChiTichLuy;
        }
      } else if (lop.TrangThai && lop.NgayKetThuc) {
        const year = new Date(lop.NgayKetThuc).getFullYear();
        if (!tinChiTichLuys[year]) tinChiTichLuys[year] = 0;
        tinChiTichLuys[year] += daoTao.SoTinChiTichLuy;
      }

      // Đếm số lần theo mã hình thức cập nhật (giữ cấu trúc {ma,label,value})
      if (!hinhThuCapNhatMap.has(ma)) {
        hinhThuCapNhatMap.set(ma, {
          ma,
          label: loaiDoc?.TenBenhVien || "",
          value: 0,
        });
      }
      hinhThuCapNhatMap.get(ma).value += 1;
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
      .populate({ path: "LoaiChuyenMonID", select: "LoaiChuyenMon TrinhDo" })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean();

    // Flatten helper fields (non-breaking: keep original structure)
    nhanviens = nhanviens.map((nv) => ({
      ...nv,
      LoaiChuyenMon:
        nv.LoaiChuyenMon || nv.LoaiChuyenMonID?.LoaiChuyenMon || undefined,
      TrinhDo: nv.TrinhDo || nv.LoaiChuyenMonID?.TrinhDo || undefined,
    }));

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
    })
      .populate("KhoaID")
      .populate("LoaiChuyenMonID");
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

    // Chuẩn hóa cờ Đảng viên nếu có trong dữ liệu import
    if (typeof nhanvien.isDangVien !== "boolean") {
      const raw = nhanvien.isDangVien ?? nhanvien.DangVien;
      if (raw !== undefined) {
        const s = String(raw).trim().toLowerCase();
        const truthy = ["1", "true", "x", "co", "có", "yes", "y"];
        const falsy = ["0", "false", "khong", "không", "no", "n", ""];
        if (truthy.includes(s)) nhanvien.isDangVien = true;
        else if (falsy.includes(s)) nhanvien.isDangVien = false;
        else nhanvien.isDangVien = Boolean(raw);
      }
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
        match: { DaNghi: false },
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
        match: { DaNghi: false },
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
        match: { DaNghi: false },
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
    const allNhanVien = await NhanVien.find({
      isDeleted: false,
      DaNghi: false,
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
        match: { KhoaID: khoaID, DaNghi: false }, // Chỉ lấy nhân viên thuộc khoaID và chưa nghỉ
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
        match: { KhoaID: khoaID, DaNghi: false }, // Chỉ lấy nhân viên thuộc khoaID và chưa nghỉ
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
      DaNghi: false,
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

    // Lấy toàn bộ danh sách NhanVien (loại nhân viên đã nghỉ)
    const nhanViens = await NhanVien.find({ isDeleted: false, DaNghi: false });

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
  const dataFix = await DaTaFix.findOne();
  if (!dataFix) {
    throw new AppError(404, "DataFix not found", "Get CoCauNguonNhanLuc error");
  }
  const nhanViens = await NhanVien.find({ isDeleted: false })
    .select("SoCCHN LoaiChuyenMonID DaNghi")
    .populate({ path: "LoaiChuyenMonID", select: "LoaiChuyenMon TrinhDo" });
  const data = buildCoCauNguonNhanLuc(nhanViens, dataFix);
  return sendResponse(
    res,
    200,
    true,
    data,
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

    const nhanViens = await NhanVien.find({
      isDeleted: false,
      KhoaID: khoaID,
    })
      .select("SoCCHN LoaiChuyenMonID DaNghi")
      .populate({ path: "LoaiChuyenMonID", select: "LoaiChuyenMon TrinhDo" });
    const data = buildCoCauNguonNhanLuc(nhanViens, dataFix);
    return sendResponse(
      res,
      200,
      true,
      data,
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

    // Lấy tất cả các khoa hợp lệ
    const khoaList = await Khoa.find({});
    const validKhoaIdSet = new Set(khoaList.map((k) => k._id.toString()));

    const nhanVienMap = new Map();

    const pushOrAccumulate = (nvDoc, soTinChi = 0) => {
      if (!nvDoc) return;
      // isDeleted bị select:false trong schema, đảm bảo không lấy nhân viên đã xóa bằng match ở populate/find
      if (nvDoc.isDeleted) return;
      // Bỏ qua nhân viên đã nghỉ để không thống kê nhầm
      if (nvDoc.DaNghi) return;
      const key = nvDoc._id.toString();
      if (!nhanVienMap.has(key)) {
        nhanVienMap.set(key, {
          nhanVien: nvDoc,
          totalSoTinChiTichLuy: 0,
        });
      }
      nhanVienMap.get(key).totalSoTinChiTichLuy += soTinChi;
    };

    // 1. LopDaoTaoNhanVien (không ĐT06)
    const lopDaoTaoNhanVienList = await LopDaoTaoNhanVien.find({
      isDeleted: false,
    })
      .populate({
        path: "LopDaoTaoID",
        match: {
          isDeleted: false,
          TrangThai: true,
          NgayKetThuc: { $gte: fromDate, $lte: toDate },
          MaHinhThucCapNhat: { $not: { $regex: "^ĐT06" } },
        },
      })
      .populate({
        path: "NhanVienID",
        // Đồng bộ tiêu chí active: bao gồm cả trường hợp DaNghi chưa tồn tại (undefined)
        match: {
          isDeleted: false,
          $or: [{ DaNghi: false }, { DaNghi: { $exists: false } }],
        },
        select: "KhoaID SoCCHN isDeleted DaNghi",
        populate: { path: "KhoaID" },
      });

    for (const rec of lopDaoTaoNhanVienList) {
      if (rec.LopDaoTaoID && rec.NhanVienID) {
        pushOrAccumulate(rec.NhanVienID, rec.SoTinChiTichLuy);
      }
    }

    // 2. LopDaoTaoNhanVienDT06 (ĐT06)
    const lopDaoTaoNhanVienDT06List = await LopDaoTaoNhanVienDT06.find({
      isDeleted: false,
      DenNgay: { $gte: fromDate, $lte: toDate },
    })
      .populate({
        path: "LopDaoTaoID",
        match: { isDeleted: false, MaHinhThucCapNhat: { $regex: "^ĐT06" } },
      })
      .populate({
        path: "NhanVienID",
        // Đồng bộ tiêu chí active: bao gồm cả trường hợp DaNghi chưa tồn tại (undefined)
        match: {
          isDeleted: false,
          $or: [{ DaNghi: false }, { DaNghi: { $exists: false } }],
        },
        select: "KhoaID SoCCHN isDeleted DaNghi",
        populate: { path: "KhoaID" },
      });

    for (const rec of lopDaoTaoNhanVienDT06List) {
      if (rec.LopDaoTaoID && rec.NhanVienID) {
        pushOrAccumulate(rec.NhanVienID, rec.SoTinChiTichLuy);
      }
    }

    // 3. Bổ sung toàn bộ nhân viên active (đảm bảo không bỏ sót)
    // Đồng bộ tiêu chí active với getCoCauNguonNhanLuc: coi DaNghi undefined là đang làm
    const allNhanVien = await NhanVien.find({
      isDeleted: false,
      $or: [{ DaNghi: false }, { DaNghi: { $exists: false } }],
    })
      .select("KhoaID SoCCHN isDeleted DaNghi")
      .populate("KhoaID");
    for (const nv of allNhanVien) pushOrAccumulate(nv, 0);

    const nhanVienValues = Array.from(nhanVienMap.values());

    // 4. Gom theo khoa
    let result = [];
    for (const khoa of khoaList) {
      const khoaIdStr = khoa._id.toString();
      const nhanVienList = nhanVienValues.filter(
        (v) =>
          v.nhanVien.KhoaID && v.nhanVien.KhoaID._id.toString() === khoaIdStr
      );
      if (nhanVienList.length === 0) continue;

      const totalNhanVien = nhanVienList.length;
      const countSoCCHN = nhanVienList.filter((v) => {
        const so = v?.nhanVien?.SoCCHN;
        return so && so.toString().trim() !== "";
      }).length;
      const countDatTrue = nhanVienList.filter(
        (v) =>
          KhuyenCao &&
          v.nhanVien.SoCCHN &&
          v.nhanVien.SoCCHN.trim() !== "" &&
          v.totalSoTinChiTichLuy >= Number(KhuyenCao)
      ).length;
      const countDatFalse = countSoCCHN - countDatTrue;

      result.push({
        KhoaID: khoa._id,
        TenKhoa: khoa.TenKhoa,
        totalNhanVien,
        countSoCCHN,
        countDatTrue,
        countDatFalse,
      });
    }

    // 5. Nhóm nhân viên không có khoa hợp lệ (KhoaID null / không tồn tại trong danh sách khoa)
    const orphanList = nhanVienValues.filter(
      (v) =>
        !v.nhanVien.KhoaID ||
        !validKhoaIdSet.has(v.nhanVien.KhoaID._id?.toString())
    );
    if (orphanList.length > 0) {
      const totalNhanVien = orphanList.length;
      const countSoCCHN = orphanList.filter((v) => {
        const so = v?.nhanVien?.SoCCHN;
        return so && so.toString().trim() !== "";
      }).length;
      const countDatTrue = orphanList.filter(
        (v) =>
          KhuyenCao &&
          v.nhanVien.SoCCHN &&
          v.nhanVien.SoCCHN.trim() !== "" &&
          v.totalSoTinChiTichLuy >= Number(KhuyenCao)
      ).length;
      const countDatFalse = countSoCCHN - countDatTrue;
      result.push({
        KhoaID: null,
        TenKhoa: "Chưa gán khoa",
        totalNhanVien,
        countSoCCHN,
        countDatTrue,
        countDatFalse,
      });
    }

    // 6. Sắp xếp: đưa nhóm chưa gán khoa xuống cuối
    result.sort((a, b) => {
      if (a.TenKhoa === "Chưa gán khoa") return 1;
      if (b.TenKhoa === "Chưa gán khoa") return -1;
      return b.totalNhanVien - a.totalNhanVien;
    });

    // 7. Tính tổng
    const totalSummary = result.reduce(
      (acc, item) => {
        acc.totalNhanVien += item.totalNhanVien;
        acc.countSoCCHN += item.countSoCCHN;
        acc.countDatTrue += item.countDatTrue;
        acc.countDatFalse += item.countDatFalse;
        return acc;
      },
      { totalNhanVien: 0, countSoCCHN: 0, countDatTrue: 0, countDatFalse: 0 }
    );

    result.unshift({
      KhoaID: null, // giữ nguyên null để không phá giao diện cũ
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
        match: { DaNghi: false },
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
        match: { DaNghi: false },
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
    const allNhanVien = await NhanVien.find({
      isDeleted: false,
      DaNghi: false,
    }).populate("KhoaID");

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
          : false, // Xử lý logic DatDeEEEEE
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

// Lấy danh sách nhân viên đã xóa mềm (isDeleted = true)
nhanvienController.getNhanViensDeleted = catchAsync(async (req, res, next) => {
  let { page, limit, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 2000;

  const filterConditions = [{ isDeleted: true }];

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await NhanVien.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  let nhanviens = await NhanVien.find(filterCriteria)
    .populate("KhoaID")
    .populate({ path: "LoaiChuyenMonID", select: "LoaiChuyenMon TrinhDo" })
    .sort({ updatedAt: -1 }) // Sắp xếp theo thời gian xóa gần nhất
    .skip(offset)
    .limit(limit)
    .lean();

  // Flatten helper fields
  nhanviens = nhanviens.map((nv) => ({
    ...nv,
    LoaiChuyenMon:
      nv.LoaiChuyenMon || nv.LoaiChuyenMonID?.LoaiChuyenMon || undefined,
    TrinhDo: nv.TrinhDo || nv.LoaiChuyenMonID?.TrinhDo || undefined,
  }));

  return sendResponse(
    res,
    200,
    true,
    { nhanviens, totalPages, count },
    null,
    "Lấy danh sách nhân viên đã xóa thành công"
  );
});

// Phục hồi nhân viên đã xóa mềm (update isDeleted = false)
nhanvienController.restoreNhanVien = catchAsync(async (req, res, next) => {
  const nhanvienID = req.params.nhanvienID;

  const nhanvien = await NhanVien.findOneAndUpdate(
    {
      _id: nhanvienID,
      isDeleted: true, // Chỉ phục hồi những nhân viên đã bị xóa
    },
    { isDeleted: false },
    { new: true }
  )
    .populate("KhoaID")
    .populate("LoaiChuyenMonID");

  if (!nhanvien) {
    throw new AppError(
      404,
      "Nhân viên không tồn tại hoặc chưa bị xóa",
      "Not Found"
    );
  }

  return sendResponse(
    res,
    200,
    true,
    nhanvien,
    null,
    "Phục hồi nhân viên thành công"
  );
});

module.exports = nhanvienController;
