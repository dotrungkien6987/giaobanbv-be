const mongoose = require("mongoose");
const {
  DanhGiaKPI,
  DanhGiaNhiemVuThuongQuy,
  ChuKyDanhGia,
  NhanVienNhiemVu,
  NhiemVuThuongQuy,
  QuanLyNhanVien,
} = require("../models");
const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");
const {
  detectCriteriaChanges,
  mergeCriteriaWithPreservedScores,
} = require("../helpers/criteriaSync.helper");

const kpiController = {};

/**
 * @route POST /api/workmanagement/kpi
 * @desc Tạo đánh giá KPI mới cho nhân viên
 * @access Private (Manager)
 */
kpiController.taoDanhGiaKPI = catchAsync(async (req, res, next) => {
  const {
    ChuKyDanhGiaID: _ChuKyDanhGiaID,
    ChuKyID: _ChuKyID,
    NhanVienID,
  } = req.body;
  const ChuKyDanhGiaID = _ChuKyDanhGiaID || _ChuKyID; // Back-compat aliasing
  const NguoiDanhGiaID = req.currentNhanVienID; // ✅ Fix: Từ validateQuanLy middleware

  // 1. Kiểm tra quyền chấm KPI
  const quanLy = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: NguoiDanhGiaID,
    NhanVienDuocQuanLy: NhanVienID,
    LoaiQuanLy: "KPI",
    isDeleted: false,
  });

  if (!quanLy) {
    throw new AppError(
      403,
      "Bạn không có quyền đánh giá KPI cho nhân viên này",
      "Forbidden"
    );
  }

  // 2. Kiểm tra chu kỳ đánh giá
  const chuKy = await ChuKyDanhGia.findById(ChuKyDanhGiaID);
  if (!chuKy) {
    throw new AppError(404, "Chu kỳ đánh giá không tồn tại", "Not Found");
  }

  // 3. Kiểm tra đã tồn tại đánh giá chưa
  const existing = await DanhGiaKPI.findOne({
    ChuKyDanhGiaID,
    NhanVienID,
    isDeleted: false,
  });

  if (existing) {
    throw new AppError(
      400,
      "Đã tồn tại đánh giá KPI cho nhân viên này trong chu kỳ này",
      "Bad Request"
    );
  }

  // 4. Lấy danh sách nhiệm vụ thường quy của nhân viên (CHỈ trong chu kỳ này)
  const danhSachNhiemVu = await NhanVienNhiemVu.find({
    NhanVienID,
    ChuKyDanhGiaID: ChuKyDanhGiaID, // ✅ CHỈ lấy nhiệm vụ của chu kỳ đang đánh giá
    isDeleted: false,
  }).populate("NhiemVuThuongQuyID");

  if (danhSachNhiemVu.length === 0) {
    throw new AppError(
      400,
      "Nhân viên chưa được gán nhiệm vụ thường quy nào",
      "Bad Request"
    );
  }

  // 5. Tạo DanhGiaKPI
  const danhGiaKPI = await DanhGiaKPI.create({
    ChuKyDanhGiaID,
    NhanVienID,
    NguoiDanhGiaID,
    TongDiemKPI: 0,
    TrangThai: "CHUA_DUYET",
  });

  // 6. Tạo danh sách DanhGiaNhiemVuThuongQuy (chưa chấm điểm)
  const danhGiaNhiemVu = await Promise.all(
    danhSachNhiemVu.map(async (nv) => {
      // Tính số công việc liên quan trong chu kỳ
      const soCongViec = await DanhGiaNhiemVuThuongQuy.tinhSoCongViecLienQuan(
        nv._id,
        chuKy.NgayBatDau,
        chuKy.NgayKetThuc
      );

      return DanhGiaNhiemVuThuongQuy.create({
        DanhGiaKPIID: danhGiaKPI._id,
        NhiemVuThuongQuyID: nv.NhiemVuThuongQuyID._id,
        NhanVienID,
        MucDoKho: nv.MucDoKho || nv.NhiemVuThuongQuyID.MucDoKho || 5, // ✅ Ưu tiên dùng MucDoKho thực tế từ assignment
        ChiTietDiem: [],
        SoCongViecLienQuan: soCongViec,
      });
    })
  );

  // 7. Populate trước khi trả về
  await danhGiaKPI.populate([
    {
      path: "ChuKyDanhGiaID",
      select: "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy",
    },
    { path: "NhanVienID", select: "HoTen MaNhanVien" },
    { path: "NguoiDanhGiaID", select: "HoTen" },
  ]);

  const danhGiaNhiemVuPopulated = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: danhGiaKPI._id,
  }).populate("NhiemVuThuongQuyID", "TenNhiemVu MoTa MucDoKho");

  return sendResponse(
    res,
    201,
    true,
    {
      danhGiaKPI,
      danhGiaNhiemVu: danhGiaNhiemVuPopulated,
    },
    null,
    "Tạo đánh giá KPI thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi
 * @desc Lấy danh sách tất cả đánh giá KPI (với filter)
 * @access Private
 * @query ChuKyDanhGiaID, NhanVienID, TrangThai
 */
kpiController.layDanhSachDanhGiaKPI = catchAsync(async (req, res, next) => {
  const { ChuKyDanhGiaID, NhanVienID, TrangThai } = req.query;

  // Build query
  const query = { isDeleted: false };

  if (ChuKyDanhGiaID) query.ChuKyDanhGiaID = ChuKyDanhGiaID;
  if (NhanVienID) query.NhanVienID = NhanVienID;
  if (TrangThai) query.TrangThai = TrangThai;

  // Lấy danh sách
  const danhGiaKPIs = await DanhGiaKPI.find(query)
    .populate([
      {
        path: "ChuKyDanhGiaID",
        select: "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy",
      },
      { path: "NhanVienID", select: "Ten MaNhanVien Email" },
      { path: "NguoiDanhGiaID", select: "Ten MaNhanVien Email" },
      { path: "NguoiDuyet", select: "Ten MaNhanVien" },
      { path: "LichSuDuyet.NguoiDuyet", select: "Ten MaNhanVien" },
    ])
    .sort({ createdAt: -1 });

  return sendResponse(
    res,
    200,
    true,
    { danhGiaKPIs, count: danhGiaKPIs.length },
    null,
    "Lấy danh sách đánh giá KPI thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/:id
 * @desc Lấy chi tiết đánh giá KPI
 * @access Private
 */
kpiController.layChiTietDanhGiaKPI = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const danhGiaKPI = await DanhGiaKPI.findOne({
    _id: id,
    isDeleted: false,
  }).populate([
    {
      path: "ChuKyDanhGiaID",
      select: "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy",
    },
    { path: "NhanVienID", select: "Ten MaNhanVien Email" },
    { path: "NguoiDanhGiaID", select: "Ten MaNhanVien Email" },
    { path: "NguoiDuyet", select: "Ten MaNhanVien" },
    { path: "LichSuDuyet.NguoiDuyet", select: "Ten MaNhanVien" },
  ]);

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "Not Found");
  }

  // Kiểm tra quyền xem
  const isOwner =
    danhGiaKPI.NguoiDanhGiaID._id.toString() === req.user.NhanVienID;
  const isEmployee =
    danhGiaKPI.NhanVienID._id.toString() === req.user.NhanVienID;
  const isAdmin = req.user.PhanQuyen === "admin";

  if (!isOwner && !isEmployee && !isAdmin) {
    throw new AppError(
      403,
      "Bạn không có quyền xem đánh giá KPI này",
      "Forbidden"
    );
  }

  // Lấy danh sách đánh giá nhiệm vụ
  let danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.layDanhSachTheoDanhGiaKPI(
    id
  );

  // ✅ ENHANCEMENT: Load DiemTuDanhGia from NhanVienNhiemVu
  // Get all NhiemVuThuongQuyIDs from evaluations
  const nhiemVuIds = danhGiaNhiemVu.map((item) => item.NhiemVuThuongQuyID?._id);

  // Load assignments with DiemTuDanhGia
  const NhanVienNhiemVu = require("../models/NhanVienNhiemVu");
  const assignments = await NhanVienNhiemVu.find({
    NhiemVuThuongQuyID: { $in: nhiemVuIds },
    NhanVienID: danhGiaKPI.NhanVienID._id,
    ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID._id,
    isDeleted: false,
  })
    .select("NhiemVuThuongQuyID DiemTuDanhGia")
    .lean();

  // Map assignments by NhiemVuThuongQuyID
  const assignmentMap = assignments.reduce((acc, assignment) => {
    acc[assignment.NhiemVuThuongQuyID.toString()] = assignment;
    return acc;
  }, {});

  // Enhance danhGiaNhiemVu with DiemTuDanhGia
  danhGiaNhiemVu = danhGiaNhiemVu.map((item) => {
    const itemObj = item.toObject ? item.toObject() : item;
    const nhiemVuId = itemObj.NhiemVuThuongQuyID?._id?.toString();
    const assignment = assignmentMap[nhiemVuId];

    return {
      ...itemObj,
      DiemTuDanhGia: assignment?.DiemTuDanhGia ?? 0,
    };
  });

  return sendResponse(
    res,
    200,
    true,
    {
      danhGiaKPI,
      danhGiaNhiemVu,
    },
    null,
    "Lấy chi tiết đánh giá KPI thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/chu-ky/:chuKyId
 * @desc Lấy danh sách đánh giá KPI theo chu kỳ
 * @access Private (Manager/Admin)
 */
kpiController.layDanhSachKPITheoChuKy = catchAsync(async (req, res, next) => {
  const { chuKyId } = req.params;
  const { page = 1, limit = 20, trangThai } = req.query;

  const danhSachKPI = await DanhGiaKPI.timTheoChuKy(chuKyId, {
    page: parseInt(page),
    limit: parseInt(limit),
    trangThai,
  });

  const total = await DanhGiaKPI.countDocuments({
    ChuKyDanhGiaID: chuKyId,
    isDeleted: false,
    ...(trangThai && { TrangThai: trangThai }),
  });

  return sendResponse(
    res,
    200,
    true,
    {
      danhSachKPI,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      count: total,
    },
    null,
    "Lấy danh sách đánh giá KPI thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/nhan-vien/:nhanVienId
 * @desc Lấy lịch sử đánh giá KPI của nhân viên
 * @access Private
 */
kpiController.layLichSuKPINhanVien = catchAsync(async (req, res, next) => {
  const { nhanVienId } = req.params;

  // Kiểm tra quyền
  const isOwnHistory = nhanVienId === req.user.NhanVienID;
  const isAdmin = req.user.PhanQuyen === "admin";
  const isManager = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: req.user.NhanVienID,
    NhanVien: nhanVienId,
    LoaiQuanLy: "KPI",
    isDeleted: false,
  });

  if (!isOwnHistory && !isAdmin && !isManager) {
    throw new AppError(
      403,
      "Bạn không có quyền xem lịch sử KPI của nhân viên này",
      "Forbidden"
    );
  }

  const lichSuKPI = await DanhGiaKPI.timTheoNhanVien(nhanVienId);

  return sendResponse(
    res,
    200,
    true,
    { lichSuKPI },
    null,
    "Lấy lịch sử KPI thành công"
  );
});

/**
 * @route PUT /api/workmanagement/kpi/nhiem-vu/:nhiemVuId
 * @desc Chấm điểm một nhiệm vụ thường quy
 * @access Private (Manager)
 */
kpiController.chamDiemNhiemVu = catchAsync(async (req, res, next) => {
  const { nhiemVuId } = req.params;
  const { ChiTietDiem, MucDoKho, GhiChu } = req.body;
  const currentNhanVienID = req.currentNhanVienID; // Từ validateQuanLy middleware

  if (!Array.isArray(ChiTietDiem) || ChiTietDiem.length === 0) {
    throw new AppError(400, "Payload ChiTietDiem không hợp lệ", "Bad Request");
  }

  // 1. Lấy đánh giá nhiệm vụ
  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.findOne({
    _id: nhiemVuId,
    isDeleted: false,
  });

  if (!danhGiaNhiemVu) {
    throw new AppError(404, "Không tìm thấy đánh giá nhiệm vụ", "Not Found");
  }

  // 2. Lấy DanhGiaKPI để kiểm tra NhanVienID
  const danhGiaKPI = await DanhGiaKPI.findById(
    danhGiaNhiemVu.DanhGiaKPIID
  ).lean();

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "Not Found");
  }

  // 3. Kiểm tra quyền chấm điểm qua QuanLyNhanVien
  const quanLy = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: currentNhanVienID,
    NhanVienDuocQuanLy: danhGiaKPI.NhanVienID,
    LoaiQuanLy: "KPI",
    isDeleted: false,
  }).lean();

  if (!quanLy) {
    throw new AppError(
      403,
      "Bạn không có quyền chấm điểm nhiệm vụ của nhân viên này",
      "Forbidden"
    );
  }

  // 4. Guard: Prevent editing approved KPI
  if (danhGiaKPI.TrangThai === "DA_DUYET") {
    throw new AppError(
      403,
      "KPI đã được duyệt - không thể chỉnh sửa",
      "Forbidden"
    );
  }

  // 5. Update ChiTietDiem (self-contained, match by TenTieuChi)
  const chiTietMap = new Map(ChiTietDiem.map((c) => [c.TenTieuChi, c]));

  danhGiaNhiemVu.ChiTietDiem = danhGiaNhiemVu.ChiTietDiem.map((tc) => {
    const updated = chiTietMap.get(tc.TenTieuChi);
    if (updated) {
      // Validate range
      if (
        typeof updated.DiemDat !== "number" ||
        updated.DiemDat < tc.GiaTriMin ||
        updated.DiemDat > tc.GiaTriMax
      ) {
        throw new AppError(
          400,
          `Điểm "${tc.TenTieuChi}" phải trong khoảng ${tc.GiaTriMin}-${tc.GiaTriMax}`,
          "Bad Request"
        );
      }
      return {
        ...tc.toObject(),
        DiemDat: updated.DiemDat,
        GhiChu: updated.GhiChu || tc.GhiChu || "",
      };
    }
    return tc;
  });
  danhGiaNhiemVu.markModified("ChiTietDiem");

  if (MucDoKho !== undefined) {
    danhGiaNhiemVu.MucDoKho = MucDoKho;
  }

  if (GhiChu !== undefined) {
    danhGiaNhiemVu.GhiChu = GhiChu;
  }

  // 6. Save (pre-save hook auto-calculates TongDiemTieuChi & DiemNhiemVu)
  await danhGiaNhiemVu.save();

  // 7. Tính lại tổng điểm KPI
  const allNhiemVu = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: danhGiaKPI._id,
    isDeleted: false,
  });

  const tongDiemKPI = allNhiemVu.reduce(
    (sum, nv) => sum + (nv.DiemNhiemVu || 0),
    0
  );

  await DanhGiaKPI.findByIdAndUpdate(danhGiaKPI._id, {
    TongDiemKPI: tongDiemKPI,
  });

  return sendResponse(
    res,
    200,
    true,
    {
      danhGiaNhiemVu: {
        _id: danhGiaNhiemVu._id,
        TongDiemTieuChi: danhGiaNhiemVu.TongDiemTieuChi,
        DiemNhiemVu: danhGiaNhiemVu.DiemNhiemVu,
        ChiTietDiem: danhGiaNhiemVu.ChiTietDiem,
      },
      tongDiemKPI,
    },
    null,
    "Chấm điểm nhiệm vụ thành công"
  );
});

/**
 * @route PUT /api/workmanagement/kpi/:id/duyet
 * @desc Duyệt đánh giá KPI
 * @access Private (Manager)
 */
kpiController.duyetDanhGiaKPI = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { NhanXetNguoiDanhGia } = req.body;

  const danhGiaKPI = await DanhGiaKPI.findOne({
    _id: id,
    isDeleted: false,
  }).populate([
    { path: "ChuKyDanhGiaID", select: "TenChuKy NgayBatDau NgayKetThuc" },
    { path: "NhanVienID", select: "HoTen MaNhanVien" },
    { path: "NguoiDanhGiaID", select: "HoTen" },
  ]);

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "Not Found");
  }

  if (danhGiaKPI.TrangThai === "DA_DUYET") {
    throw new AppError(400, "KPI đã được duyệt trước đó", "Bad Request");
  }

  // Chuẩn hoá ID nhân viên được đánh giá
  const nhanVienBeingEvaluatedId =
    danhGiaKPI.NhanVienID && danhGiaKPI.NhanVienID._id
      ? danhGiaKPI.NhanVienID._id.toString()
      : danhGiaKPI.NhanVienID
      ? danhGiaKPI.NhanVienID.toString()
      : null;

  if (!nhanVienBeingEvaluatedId) {
    throw new AppError(
      400,
      "Thiếu thông tin nhân viên trong KPI",
      "Bad Request"
    );
  }

  // ✅ FIX: Permission check theo QuanLyNhanVien với LoaiQuanLy = "KPI"
  // ✅ FIX: Destructure từ req.user (đã được populate đầy đủ bởi auth middleware)
  const { NhanVienID: currentNhanVienID, PhanQuyen: userPhanQuyen } = req.user;

  // Kiểm tra user chưa có NhanVienID (chỉ admin mới được bypass)
  if (
    !currentNhanVienID &&
    userPhanQuyen !== "admin" &&
    userPhanQuyen !== "superadmin"
  ) {
    throw new AppError(
      401,
      "Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên. Vui lòng liên hệ quản trị viên để cập nhật thông tin.",
      "Unauthorized"
    );
  }

  const isAdmin = userPhanQuyen === "admin" || userPhanQuyen === "superadmin";
  let hasPermission = false;

  if (isAdmin) {
    // Admin/SuperAdmin có quyền duyệt tất cả
    hasPermission = true;
  } else if (currentNhanVienID) {
    // ✅ FIX: Dùng đúng field names theo schema QuanLyNhanVien
    const quanLyRelation = await QuanLyNhanVien.findOne({
      NhanVienQuanLy: currentNhanVienID, // ✅ Đúng field
      NhanVienDuocQuanLy: nhanVienBeingEvaluatedId, // ✅ Đúng field
      LoaiQuanLy: "KPI",
      isDeleted: { $ne: true },
    }).lean();

    if (quanLyRelation) {
      hasPermission = true;
    }
  }

  if (!hasPermission) {
    throw new AppError(
      403,
      "Bạn không có quyền duyệt KPI của nhân viên này. Vui lòng kiểm tra phân quyền quản lý.",
      "Forbidden"
    );
  }

  // Kiểm tra đã chấm điểm hết chưa
  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: id,
    isDeleted: false,
  });

  if (!danhGiaNhiemVu || danhGiaNhiemVu.length === 0) {
    throw new AppError(
      400,
      "Không thể duyệt KPI chưa có nhiệm vụ được chấm điểm",
      "Bad Request"
    );
  }

  const chuaChamDiem = danhGiaNhiemVu.some(
    (nv) => !nv.ChiTietDiem || nv.ChiTietDiem.length === 0
  );

  if (chuaChamDiem) {
    throw new AppError(
      400,
      "Vui lòng chấm điểm tất cả nhiệm vụ trước khi duyệt",
      "Bad Request"
    );
  }

  // ✅ NEW: Call duyet() on all tasks to calculate scores
  // This applies formula for IsMucDoHoanThanh criteria: (DiemQuanLy × 2 + DiemTuDanhGia) / 3
  for (const nv of danhGiaNhiemVu) {
    await nv.duyet(); // Method handles calculation + snapshot
  }

  // Calculate total KPI score (sum of all DiemNhiemVu)
  await danhGiaKPI.tinhTongDiemKPI();

  // Duyệt (update status, NgayDuyet, NguoiDuyet và LichSuDuyet)
  await danhGiaKPI.duyet(
    NhanXetNguoiDanhGia,
    req.user.NhanVienID || req.user._id
  );

  // ✅ FIX: Refresh danhGiaKPI to get updated TongDiemKPI
  const updatedDanhGiaKPI = await DanhGiaKPI.findById(id).populate([
    { path: "ChuKyDanhGiaID", select: "TenChuKy NgayBatDau NgayKetThuc" },
    { path: "NhanVienID", select: "HoTen MaNhanVien" },
    { path: "NguoiDanhGiaID", select: "HoTen" },
    { path: "NguoiDuyet", select: "HoTen Ten MaNhanVien" },
    { path: "LichSuDuyet.NguoiDuyet", select: "HoTen Ten MaNhanVien" },
  ]);

  return sendResponse(
    res,
    200,
    true,
    {
      danhGiaKPI: updatedDanhGiaKPI,
      soNhiemVu: danhGiaNhiemVu.length,
      tongDiem: updatedDanhGiaKPI.TongDiemKPI,
    },
    null,
    `Đã duyệt KPI thành công với tổng điểm ${updatedDanhGiaKPI.TongDiemKPI.toFixed(
      2
    )}`
  );
});

/**
 * @route PUT /api/workmanagement/kpi/:id/huy-duyet
 * @desc Hủy duyệt đánh giá KPI (Admin only)
 * @access Private (Admin)
 */
kpiController.huyDuyetDanhGiaKPI = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  if (req.user.PhanQuyen !== "admin") {
    throw new AppError(403, "Chỉ admin mới có quyền hủy duyệt", "Forbidden");
  }

  const danhGiaKPI = await DanhGiaKPI.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "Not Found");
  }

  // ✅ NEW: Hủy duyệt tất cả tasks trước
  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: id,
    isDeleted: false,
  });

  for (const nv of danhGiaNhiemVu) {
    await nv.huyDuyet();
  }

  // Hủy duyệt KPI
  await danhGiaKPI.huyDuyet();

  return sendResponse(
    res,
    200,
    true,
    { danhGiaKPI },
    null,
    "Hủy duyệt đánh giá KPI thành công"
  );
});

/**
 * @route PUT /api/workmanagement/kpi/:id/phan-hoi
 * @desc Nhân viên phản hồi đánh giá KPI
 * @access Private (Employee)
 */
kpiController.phanHoiDanhGiaKPI = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { PhanHoiNhanVien } = req.body;

  const danhGiaKPI = await DanhGiaKPI.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "Not Found");
  }

  // Kiểm tra quyền phản hồi
  if (danhGiaKPI.NhanVienID.toString() !== req.user.NhanVienID) {
    throw new AppError(
      403,
      "Bạn không có quyền phản hồi đánh giá KPI này",
      "Forbidden"
    );
  }

  // Chỉ phản hồi được khi đã duyệt
  if (danhGiaKPI.TrangThai !== "DA_DUYET") {
    throw new AppError(
      400,
      "Chỉ có thể phản hồi sau khi đánh giá được duyệt",
      "Bad Request"
    );
  }

  danhGiaKPI.PhanHoiNhanVien = PhanHoiNhanVien;
  await danhGiaKPI.save();

  return sendResponse(
    res,
    200,
    true,
    { danhGiaKPI },
    null,
    "Phản hồi đánh giá KPI thành công"
  );
});

/**
 * @route DELETE /api/workmanagement/kpi/:id
 * @desc Xóa đánh giá KPI (soft delete)
 * @access Private (Manager/Admin)
 */
kpiController.xoaDanhGiaKPI = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const danhGiaKPI = await DanhGiaKPI.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "Not Found");
  }

  // Kiểm tra quyền xóa
  const isOwner = danhGiaKPI.NguoiDanhGiaID.toString() === req.user.NhanVienID;
  const isAdmin = req.user.PhanQuyen === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      403,
      "Bạn không có quyền xóa đánh giá KPI này",
      "Forbidden"
    );
  }

  // Chỉ xóa được khi chưa duyệt
  if (danhGiaKPI.TrangThai === "DA_DUYET" && !isAdmin) {
    throw new AppError(
      400,
      "Không thể xóa đánh giá KPI đã duyệt",
      "Bad Request"
    );
  }

  // Soft delete
  danhGiaKPI.isDeleted = true;
  await danhGiaKPI.save();

  // Xóa các đánh giá nhiệm vụ con
  await DanhGiaNhiemVuThuongQuy.updateMany(
    { DanhGiaKPIID: id },
    { isDeleted: true }
  );

  return sendResponse(
    res,
    200,
    true,
    null,
    null,
    "Xóa đánh giá KPI thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/thong-ke/chu-ky/:chuKyId
 * @desc Lấy thống kê KPI theo chu kỳ
 * @access Private (Admin/Manager)
 */
kpiController.thongKeKPITheoChuKy = catchAsync(async (req, res, next) => {
  const { chuKyId } = req.params;

  // Top 10 nhân viên
  const topNhanVien = await DanhGiaKPI.layTopNhanVien(chuKyId, 10);

  // Phân bố xếp loại
  const danhSachKPI = await DanhGiaKPI.find({
    ChuKyDanhGiaID: chuKyId,
    TrangThai: "DA_DUYET",
    isDeleted: false,
  });

  const phanBoXepLoai = {
    xuatSac: 0, // >= 90%
    tot: 0, // 80-89%
    kha: 0, // 70-79%
    trungBinh: 0, // 60-69%
    yeu: 0, // < 60%
  };

  danhSachKPI.forEach((kpi) => {
    const percent = (kpi.TongDiemKPI / 10) * 100;
    if (percent >= 90) phanBoXepLoai.xuatSac++;
    else if (percent >= 80) phanBoXepLoai.tot++;
    else if (percent >= 70) phanBoXepLoai.kha++;
    else if (percent >= 60) phanBoXepLoai.trungBinh++;
    else phanBoXepLoai.yeu++;
  });

  // Điểm trung bình
  const diemTrungBinh =
    danhSachKPI.reduce((sum, kpi) => sum + kpi.TongDiemKPI, 0) /
    (danhSachKPI.length || 1);

  return sendResponse(
    res,
    200,
    true,
    {
      topNhanVien,
      phanBoXepLoai,
      diemTrungBinh,
      tongSoDanhGia: danhSachKPI.length,
    },
    null,
    "Lấy thống kê KPI thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/dashboard/:chuKyId
 * @desc Dashboard tổng quan KPI - Lấy danh sách nhân viên được quản lý + điểm KPI
 * @access Private (Manager)
 *
 * Trả về:
 * - nhanVienList: Array of { nhanVien, danhGiaKPI, progress }
 * - summary: { totalNhanVien, completed, inProgress, notStarted }
 */
kpiController.getDashboard = catchAsync(async (req, res, next) => {
  const { chuKyId } = req.params;
  const currentNhanVienID = req.currentNhanVienID; // Từ validateQuanLy middleware

  if (!currentNhanVienID) {
    throw new AppError(400, "Thiếu thông tin nhân viên");
  }

  // 1. Lấy danh sách nhân viên được quản lý (LoaiQuanLy = "KPI")
  const quanHeQuanLy = await QuanLyNhanVien.find({
    NhanVienQuanLy: currentNhanVienID,
    LoaiQuanLy: "KPI",
    isDeleted: { $ne: true },
  }).populate({
    path: "NhanVienDuocQuanLy",
    select: "Ten MaNhanVien Email KhoaID ChucDanh ChucVu Images",
    populate: {
      path: "KhoaID",
      select: "TenKhoa MaKhoa",
    },
  });

  const nhanVienIds = quanHeQuanLy.map((qh) => qh.NhanVienDuocQuanLy._id);

  // 2. Lấy đánh giá KPI của các nhân viên này trong chu kỳ
  const danhGiaKPIs = await DanhGiaKPI.find({
    ChuKyDanhGiaID: chuKyId,
    NhanVienID: { $in: nhanVienIds },
    isDeleted: { $ne: true },
  })
    .populate("NhanVienID", "Ten MaNhanVien")
    .populate("NguoiDanhGiaID", "Ten");

  // 3. Tính progress cho từng đánh giá KPI
  const danhGiaKPIMap = {};
  for (const dg of danhGiaKPIs) {
    // ✅ Lấy số nhiệm vụ đã chấm theo chu kỳ và nhân viên (không phụ thuộc DanhGiaKPIID)
    const scoredFilter = {
      NhanVienID: dg.NhanVienID,
      ChuKyDanhGiaID: chuKyId,
      isDeleted: { $ne: true },
      $or: [
        { ChiTietDiem: { $exists: true, $ne: [] } },
        { "ChiTietDiem.DiemDat": { $gt: 0 } },
        { "ChiTietDiem.DiemQuanLy": { $gt: 0 } },
        { "ChiTietDiem.DiemTuDanhGia": { $gt: 0 } },
        { DiemQuanLyDanhGia: { $gt: 0 } },
        { DiemTuDanhGia: { $gt: 0 } },
      ],
    };
    const scoredDistinct = await DanhGiaNhiemVuThuongQuy.distinct(
      "NhiemVuThuongQuyID",
      scoredFilter
    );
    const scoredTasks = scoredDistinct.length;

    // Tổng số nhiệm vụ được PHÂN CÔNG trong chu kỳ này (để bật nút Đánh giá/Xem KPI)
    const assignedTotal = await NhanVienNhiemVu.countDocuments({
      NhanVienID: dg.NhanVienID,
      ChuKyDanhGiaID: chuKyId,
      TrangThaiHoatDong: true,
      isDeleted: false,
    });

    const percentage =
      assignedTotal > 0 ? Math.round((scoredTasks / assignedTotal) * 100) : 0;

    danhGiaKPIMap[dg.NhanVienID._id.toString()] = {
      danhGiaKPI: dg,
      progress: {
        scored: scoredTasks,
        total: assignedTotal,
        percentage,
      },
    };
  }

  // 4. Kết hợp dữ liệu
  const nhanVienList = await Promise.all(
    quanHeQuanLy.map(async (qh) => {
      const nhanVienId = qh.NhanVienDuocQuanLy._id.toString();
      const kpiData = danhGiaKPIMap[nhanVienId];

      if (kpiData) {
        return {
          nhanVien: qh.NhanVienDuocQuanLy,
          danhGiaKPI: kpiData.danhGiaKPI,
          progress: kpiData.progress,
        };
      }

      // Nếu chưa có DanhGiaKPI trong chu kỳ, vẫn tính số nhiệm vụ đã được phân công và số đã chấm theo chu kỳ
      const assignedTotal = await NhanVienNhiemVu.countDocuments({
        NhanVienID: nhanVienId,
        ChuKyDanhGiaID: chuKyId,
        TrangThaiHoatDong: true,
        isDeleted: false,
      });

      const scoredFilterNoKPI = {
        NhanVienID: nhanVienId,
        ChuKyDanhGiaID: chuKyId,
        isDeleted: { $ne: true },
        $or: [
          { ChiTietDiem: { $exists: true, $ne: [] } },
          { "ChiTietDiem.DiemDat": { $gt: 0 } },
          { "ChiTietDiem.DiemQuanLy": { $gt: 0 } },
          { "ChiTietDiem.DiemTuDanhGia": { $gt: 0 } },
          { DiemQuanLyDanhGia: { $gt: 0 } },
          { DiemTuDanhGia: { $gt: 0 } },
        ],
      };
      const scoredDistinctNoKPI = await DanhGiaNhiemVuThuongQuy.distinct(
        "NhiemVuThuongQuyID",
        scoredFilterNoKPI
      );
      const scoredTasksNoKPI = scoredDistinctNoKPI.length;

      return {
        nhanVien: qh.NhanVienDuocQuanLy,
        danhGiaKPI: null,
        progress: {
          scored: scoredTasksNoKPI,
          total: assignedTotal,
          percentage:
            assignedTotal > 0
              ? Math.round((scoredTasksNoKPI / assignedTotal) * 100)
              : 0,
        },
      };
    })
  );

  // 5. Tính summary
  const completed = nhanVienList.filter(
    (item) => item.danhGiaKPI?.TrangThai === "DA_DUYET"
  ).length;
  const inProgress = nhanVienList.filter(
    (item) =>
      item.danhGiaKPI?.TrangThai === "CHUA_DUYET" && item.progress.scored > 0
  ).length;
  const notStarted = nhanVienList.filter(
    (item) => !item.danhGiaKPI || item.progress.scored === 0
  ).length;

  return sendResponse(
    res,
    200,
    true,
    {
      nhanVienList,
      summary: {
        totalNhanVien: nhanVienList.length,
        completed,
        inProgress,
        notStarted,
      },
    },
    null,
    "Lấy dashboard KPI thành công"
  );
});

/**
 * ❌ DEPRECATED: Old endpoint /cham-diem (không tương thích với model mới)
 * @route GET /api/workmanagement/kpi/cham-diem
 * @desc [REMOVED] Old logic - Model mới yêu cầu ChuKyDanhGiaID
 *
 * ✅ SỬ DỤNG ENDPOINT MỚI:
 * - GET /kpi/nhan-vien/:NhanVienID/nhiem-vu?chuKyId=xxx
 * - POST /kpi/nhan-vien/:NhanVienID/danh-gia
 * - GET /kpi/nhan-vien/:NhanVienID/diem-kpi?chuKyId=xxx
 */
kpiController.getChamDiemDetail = catchAsync(async (req, res, next) => {
  throw new AppError(
    410, // 410 Gone - Resource no longer available
    "Endpoint này đã ngưng hoạt động. Vui lòng sử dụng trang đánh giá KPI mới tại /quanlycongviec/kpi/danh-gia-nhan-vien"
  );
});

/**
 * @route POST /api/workmanagement/kpi/reset-criteria
 * @desc Reset ChiTietDiem to match ChuKy.TieuChiCauHinh (soft merge - preserve scores)
 * @access Private
 */
kpiController.resetCriteria = catchAsync(async (req, res, next) => {
  const { danhGiaKPIId } = req.body;

  if (!danhGiaKPIId) {
    throw new AppError(400, "Thiếu danhGiaKPIId");
  }

  // 1. Load DanhGiaKPI and check status
  const danhGiaKPI = await DanhGiaKPI.findById(danhGiaKPIId);
  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI");
  }

  // 2. Guard: Only allow reset if not approved
  if (danhGiaKPI.TrangThai === "DA_DUYET") {
    throw new AppError(403, "Không thể đồng bộ tiêu chí cho KPI đã được duyệt");
  }

  // 3. Load ChuKy configuration
  const chuKy = await ChuKyDanhGia.findById(danhGiaKPI.ChuKyDanhGiaID).lean();
  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  const tieuChiCauHinh = chuKy.TieuChiCauHinh || [];
  if (!tieuChiCauHinh.length) {
    throw new AppError(400, "Chu kỳ này chưa có cấu hình tiêu chí để đồng bộ");
  }

  // 4. Load all nhiemVu records
  const nhiemVuList = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: danhGiaKPIId,
    isDeleted: { $ne: true },
  });

  if (!nhiemVuList.length) {
    throw new AppError(404, "Không tìm thấy nhiệm vụ nào để đồng bộ tiêu chí");
  }

  // 5. Apply soft merge to each nhiemVu (preserve DiemDat + GhiChu)
  for (const nv of nhiemVuList) {
    nv.ChiTietDiem = mergeCriteriaWithPreservedScores(
      nv.ChiTietDiem || [],
      tieuChiCauHinh
    );
    nv.markModified("ChiTietDiem");
    await nv.save();
  }

  // 6. Return updated nhiemVuList with IDs for frontend refresh
  const updatedList = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: danhGiaKPIId,
    isDeleted: { $ne: true },
  }).populate("NhiemVuThuongQuyID", "TenNhiemVu MoTa MucDoKho");

  return sendResponse(
    res,
    200,
    true,
    {
      nhiemVuList: updatedList,
      danhGiaKPIId: danhGiaKPI._id,
      chuKyId: danhGiaKPI.ChuKyDanhGiaID, // ✅ FIX: Return for frontend refresh
      nhanVienId: danhGiaKPI.NhanVienID, // ✅ FIX: Return for frontend refresh
      syncedCount: nhiemVuList.length,
    },
    null,
    `Đã đồng bộ tiêu chí cho ${nhiemVuList.length} nhiệm vụ. Điểm đã chấm được giữ nguyên.`
  );
});

// ============================================================================
// ✅ NEW KPI EVALUATION FLOW - SIMPLIFIED
// ============================================================================

/**
 * @route GET /api/workmanagement/kpi/nhan-vien/:NhanVienID/nhiem-vu
 * @desc Lấy danh sách nhiệm vụ để đánh giá (theo chu kỳ)
 * @access Private (Manager)
 * @query chuKyId (required)
 */
kpiController.getTasksForEvaluation = catchAsync(async (req, res, next) => {
  const { NhanVienID } = req.params;
  const { chuKyId } = req.query;

  // ✅ VALIDATE: Chu kỳ bắt buộc
  if (!chuKyId) {
    throw new AppError(400, "Vui lòng chọn chu kỳ đánh giá", "Bad Request");
  }

  // ✅ VALIDATE: Chu kỳ tồn tại
  const chuKy = await ChuKyDanhGia.findById(chuKyId);
  if (!chuKy) {
    throw new AppError(404, "Chu kỳ đánh giá không tồn tại", "Not Found");
  }

  // ✅ VALIDATE: Quyền quản lý (từ middleware validateQuanLy)
  const nguoiQuanLyID = req.currentNhanVienID;
  const quanLy = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: nguoiQuanLyID,
    NhanVienDuocQuanLy: NhanVienID,
    LoaiQuanLy: "KPI",
    isDeleted: false,
  });

  if (!quanLy) {
    throw new AppError(
      403,
      "Bạn không có quyền đánh giá KPI cho nhân viên này",
      "Forbidden"
    );
  }

  // ✅ QUERY: Lấy assignments theo chu kỳ (CHỈ chu kỳ này)
  const assignments = await NhanVienNhiemVu.find({
    NhanVienID,
    ChuKyDanhGiaID: chuKyId, // ✅ CHỈ lấy nhiệm vụ của chu kỳ đang đánh giá
    isDeleted: false,
  })
    .populate({
      path: "NhiemVuThuongQuyID",
      select: "TenNhiemVu MoTa MucDoKhoDefault",
    })
    .lean();

  if (assignments.length === 0) {
    return sendResponse(
      res,
      200,
      true,
      { tasks: [], chuKy },
      null,
      "Nhân viên chưa được gán nhiệm vụ nào trong chu kỳ này"
    );
  }

  // ✅ FETCH: Điểm đánh giá đã có
  const evaluations = await DanhGiaNhiemVuThuongQuy.find({
    NhanVienID,
    ChuKyDanhGiaID: chuKyId,
    isDeleted: false,
  }).lean();

  // Map evaluations by nhiemVuId
  const evaluationMap = evaluations.reduce((acc, evaluation) => {
    acc[evaluation.NhiemVuThuongQuyID.toString()] = evaluation;
    return acc;
  }, {});

  // ✅ COMBINE: Assignments + Evaluations
  const tasksWithScores = assignments.map((assignment) => {
    const nhiemVuId = assignment.NhiemVuThuongQuyID._id.toString();
    const evaluation = evaluationMap[nhiemVuId];

    return {
      _id: assignment._id,
      NhiemVuThuongQuyID: assignment.NhiemVuThuongQuyID,
      MucDoKho: assignment.MucDoKho, // ✅ Độ khó từ assignment
      DiemTuDanhGia: evaluation?.DiemTuDanhGia ?? null,
      DiemQuanLyDanhGia: evaluation?.DiemQuanLyDanhGia ?? null,
      GhiChu: evaluation?.GhiChu ?? "",
      evaluationId: evaluation?._id ?? null,
    };
  });

  return sendResponse(
    res,
    200,
    true,
    { tasks: tasksWithScores, chuKy },
    null,
    "Lấy danh sách nhiệm vụ thành công"
  );
});

/**
 * @route POST /api/workmanagement/kpi/nhan-vien/:NhanVienID/danh-gia
 * @desc Lưu đánh giá nhiệm vụ (batch upsert)
 * @access Private (Manager)
 * @body { chuKyId, evaluations: [{ assignmentId, DiemTuDanhGia, DiemQuanLyDanhGia, GhiChu }] }
 */
kpiController.saveEvaluation = catchAsync(async (req, res, next) => {
  const { NhanVienID } = req.params;
  const { chuKyId, evaluations } = req.body;

  // ✅ VALIDATE: Chu kỳ bắt buộc
  if (!chuKyId) {
    throw new AppError(400, "Thiếu thông tin chu kỳ đánh giá", "Bad Request");
  }

  // ✅ VALIDATE: Chu kỳ tồn tại
  const chuKy = await ChuKyDanhGia.findById(chuKyId);
  if (!chuKy) {
    throw new AppError(404, "Chu kỳ đánh giá không tồn tại", "Not Found");
  }

  // ✅ VALIDATE: Quyền quản lý
  const nguoiQuanLyID = req.currentNhanVienID;
  const quanLy = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: nguoiQuanLyID,
    NhanVienDuocQuanLy: NhanVienID,
    LoaiQuanLy: "KPI",
    isDeleted: false,
  });

  if (!quanLy) {
    throw new AppError(
      403,
      "Bạn không có quyền đánh giá KPI cho nhân viên này",
      "Forbidden"
    );
  }

  // ✅ VALIDATE: Điểm hợp lệ
  if (!Array.isArray(evaluations) || evaluations.length === 0) {
    throw new AppError(400, "Danh sách đánh giá không hợp lệ", "Bad Request");
  }

  for (const evalData of evaluations) {
    if (
      evalData.DiemTuDanhGia < 0 ||
      evalData.DiemTuDanhGia > 10 ||
      evalData.DiemQuanLyDanhGia < 0 ||
      evalData.DiemQuanLyDanhGia > 10
    ) {
      throw new AppError(400, "Điểm đánh giá phải từ 0 đến 10", "Bad Request");
    }
  }

  // ✅ BATCH UPSERT: Lưu từng đánh giá
  const results = [];

  for (const evalData of evaluations) {
    // Lấy assignment để biết MucDoKho thực tế
    const assignment = await NhanVienNhiemVu.findById(evalData.assignmentId);

    if (!assignment) {
      throw new AppError(
        404,
        `Không tìm thấy assignment ${evalData.assignmentId}`,
        "Not Found"
      );
    }

    // Kiểm tra assignment thuộc đúng chu kỳ
    if (assignment.ChuKyDanhGiaID.toString() !== chuKyId) {
      throw new AppError(
        400,
        "Assignment không thuộc chu kỳ này",
        "Bad Request"
      );
    }

    // ✅ UPSERT: Tạo hoặc update đánh giá
    const danhGia = await DanhGiaNhiemVuThuongQuy.findOneAndUpdate(
      {
        NhanVienID,
        NhiemVuThuongQuyID: assignment.NhiemVuThuongQuyID,
        ChuKyDanhGiaID: chuKyId,
      },
      {
        NhanVienID,
        NhiemVuThuongQuyID: assignment.NhiemVuThuongQuyID,
        ChuKyDanhGiaID: chuKyId,
        DiemTuDanhGia: evalData.DiemTuDanhGia,
        DiemQuanLyDanhGia: evalData.DiemQuanLyDanhGia,
        MucDoKho: assignment.MucDoKho, // ✅ Lấy từ assignment
        GhiChu: evalData.GhiChu || "",
        NgayDanhGia: new Date(),
        isDeleted: false,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    results.push(danhGia);
  }

  return sendResponse(
    res,
    200,
    true,
    { evaluations: results },
    null,
    "Lưu đánh giá thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/nhan-vien/:NhanVienID/diem-kpi
 * @desc Tính điểm KPI cho nhân viên (theo chu kỳ)
 * @access Private (Manager)
 * @query chuKyId (required)
 */
kpiController.calculateKPIForEmployee = catchAsync(async (req, res, next) => {
  const { NhanVienID } = req.params;
  const { chuKyId } = req.query;

  // ✅ VALIDATE: Chu kỳ bắt buộc
  if (!chuKyId) {
    throw new AppError(400, "Vui lòng chọn chu kỳ đánh giá", "Bad Request");
  }

  // ✅ LẤY: Đánh giá theo chu kỳ
  const evaluations = await DanhGiaNhiemVuThuongQuy.find({
    NhanVienID,
    ChuKyDanhGiaID: chuKyId,
    isDeleted: false,
  })
    .populate("NhiemVuThuongQuyID")
    .lean();

  // Nếu chưa có đánh giá nào
  if (evaluations.length === 0) {
    return sendResponse(
      res,
      200,
      true,
      {
        DiemKPI: 0,
        XepLoai: "Chưa đánh giá",
        SoNhiemVuDanhGia: 0,
        TongTrongSo: 0,
        ChiTiet: [],
      },
      null,
      "Chưa có đánh giá nào"
    );
  }

  // ✅ TÍNH: Điểm trung bình có trọng số
  let tongDiemCoTrongSo = 0;
  let tongTrongSo = 0;
  const chiTiet = [];

  evaluations.forEach((evalData) => {
    // Điểm trung bình của tự đánh giá + quản lý đánh giá
    const diemTrungBinh =
      ((evalData.DiemTuDanhGia ?? 0) + (evalData.DiemQuanLyDanhGia ?? 0)) / 2;

    // ✅ Trọng số = MucDoKho đã lưu trong đánh giá
    const trongSo = evalData.MucDoKho;

    tongDiemCoTrongSo += diemTrungBinh * trongSo;
    tongTrongSo += trongSo;

    chiTiet.push({
      NhiemVu: evalData.NhiemVuThuongQuyID?.TenNhiemVu || "N/A",
      DiemTuDanhGia: evalData.DiemTuDanhGia,
      DiemQuanLyDanhGia: evalData.DiemQuanLyDanhGia,
      DiemTrungBinh: diemTrungBinh.toFixed(2),
      TrongSo: trongSo,
      DiemCoTrongSo: (diemTrungBinh * trongSo).toFixed(2),
    });
  });

  // ✅ Điểm KPI cuối cùng
  const diemKPI = tongTrongSo > 0 ? tongDiemCoTrongSo / tongTrongSo : 0;

  // ✅ XẾP LOẠI
  let xepLoai;
  if (diemKPI >= 9) xepLoai = "Xuất sắc";
  else if (diemKPI >= 8) xepLoai = "Giỏi";
  else if (diemKPI >= 7) xepLoai = "Khá";
  else if (diemKPI >= 5) xepLoai = "Trung bình";
  else xepLoai = "Yếu";

  return sendResponse(
    res,
    200,
    true,
    {
      DiemKPI: parseFloat(diemKPI.toFixed(2)),
      XepLoai: xepLoai,
      SoNhiemVuDanhGia: evaluations.length,
      TongTrongSo: tongTrongSo,
      ChiTiet: chiTiet,
    },
    null,
    "Tính điểm KPI thành công"
  );
});

// ============================================================================
// ✅ CRITERIA-BASED KPI EVALUATION (for v2 component)
// ============================================================================

/**
 * @route GET /api/workmanagement/kpi/cham-diem-tieu-chi
 * @desc Lấy chi tiết đánh giá KPI với tiêu chí (for v2 UI)
 * @access Private (Manager)
 * @query chuKyId (required), nhanVienId (required)
 */
kpiController.getChamDiemTieuChi = catchAsync(async (req, res, next) => {
  const { chuKyId, nhanVienId } = req.query;
  const nguoiDanhGiaID = req.currentNhanVienID;

  // ✅ VALIDATE: Required params
  if (!chuKyId || !nhanVienId) {
    throw new AppError(
      400,
      "Thiếu thông tin chu kỳ hoặc nhân viên",
      "Bad Request"
    );
  }

  // ✅ VALIDATE: Quyền chấm KPI
  // Cho phép: 1) Nhân viên xem KPI của chính mình, hoặc 2) Quản lý xem KPI của nhân viên được quản lý
  const isViewingOwnKPI = nhanVienId === nguoiDanhGiaID?.toString();

  if (!isViewingOwnKPI) {
    // Nếu không xem KPI của mình, kiểm tra quyền quản lý
    const quanLy = await QuanLyNhanVien.findOne({
      NhanVienQuanLy: nguoiDanhGiaID,
      NhanVienDuocQuanLy: nhanVienId,
      LoaiQuanLy: "KPI",
      isDeleted: false,
    });

    if (!quanLy) {
      throw new AppError(
        403,
        "Bạn không có quyền đánh giá KPI cho nhân viên này",
        "Forbidden"
      );
    }
  }

  // ✅ LOAD: Chu kỳ với tiêu chí cấu hình
  const chuKy = await ChuKyDanhGia.findById(chuKyId).lean();
  if (!chuKy) {
    throw new AppError(404, "Chu kỳ đánh giá không tồn tại", "Not Found");
  }

  const tieuChiCauHinh = chuKy.TieuChiCauHinh || [];
  if (tieuChiCauHinh.length === 0) {
    throw new AppError(
      400,
      "Chu kỳ này chưa có cấu hình tiêu chí đánh giá",
      "Bad Request"
    );
  }

  // ✅ LOAD: Danh sách nhiệm vụ được gán trong chu kỳ (CHỈ chu kỳ này)
  const assignments = await NhanVienNhiemVu.find({
    NhanVienID: nhanVienId,
    ChuKyDanhGiaID: chuKyId, // ✅ CHỈ lấy nhiệm vụ của chu kỳ đang đánh giá
    isDeleted: false,
  })
    .populate({
      path: "NhiemVuThuongQuyID",
      select: "TenNhiemVu MoTa MucDoKhoDefault",
    })
    .lean();

  if (assignments.length === 0) {
    return sendResponse(
      res,
      200,
      true,
      {
        danhGiaKPI: null,
        danhGiaNhiemVuList: [],
        chuKy,
      },
      null,
      "Nhân viên chưa được gán nhiệm vụ nào trong chu kỳ này"
    );
  }

  // ✅ LOAD or CREATE: DanhGiaKPI record
  let danhGiaKPI = await DanhGiaKPI.findOne({
    ChuKyDanhGiaID: chuKyId,
    NhanVienID: nhanVienId,
    isDeleted: false,
  });

  if (!danhGiaKPI) {
    // Auto-create DanhGiaKPI if not exists
    danhGiaKPI = await DanhGiaKPI.create({
      ChuKyDanhGiaID: chuKyId,
      NhanVienID: nhanVienId,
      NguoiDanhGiaID: nguoiDanhGiaID,
      TongDiemKPI: 0,
      TrangThai: "CHUA_DUYET",
    });
  }

  // ✅ LOAD: Existing evaluations
  const existingEvaluations = await DanhGiaNhiemVuThuongQuy.find({
    NhanVienID: nhanVienId,
    ChuKyDanhGiaID: chuKyId,
    isDeleted: false,
  }).lean();

  // Map existing evaluations by NhiemVuThuongQuyID
  const evaluationMap = existingEvaluations.reduce((acc, evaluation) => {
    acc[evaluation.NhiemVuThuongQuyID.toString()] = evaluation;
    return acc;
  }, {});

  // ✅ BUILD: Complete nhiemVu list with ChiTietDiem + DiemTuDanhGia
  const danhGiaNhiemVuList = assignments.map((assignment) => {
    const nhiemVuId = assignment.NhiemVuThuongQuyID._id.toString();
    const existingEval = evaluationMap[nhiemVuId];

    // Initialize ChiTietDiem from TieuChiCauHinh
    const chiTietDiem = tieuChiCauHinh.map((tc, index) => {
      // Find matching score from existing evaluation
      const existingScore = existingEval?.ChiTietDiem?.find(
        (cd) =>
          cd.TenTieuChi === tc.TenTieuChi && cd.LoaiTieuChi === tc.LoaiTieuChi
      );

      // ✅ V2: Detect if this is "Mức độ hoàn thành" criterion
      // Check both TenTieuChi name and LoaiTieuChi
      const isMucDoHoanThanh =
        tc.TenTieuChi === "Mức độ hoàn thành" ||
        tc.TenTieuChi === "Mức độ hoàn thành công việc" ||
        tc.TenTieuChi?.toLowerCase().includes("mức độ hoàn thành");

      return {
        TenTieuChi: tc.TenTieuChi,
        LoaiTieuChi: tc.LoaiTieuChi,
        GiaTriMin: tc.GiaTriMin,
        GiaTriMax: tc.GiaTriMax,
        DonVi: tc.DonVi,
        DiemDat: existingScore?.DiemDat ?? 0,
        GhiChu: existingScore?.GhiChu ?? "",
        IsMucDoHoanThanh: isMucDoHoanThanh, // ✅ V2: Flag for formula calculation
      };
    });

    return {
      _id: existingEval?._id || null,
      NhanVienID: nhanVienId,
      NhiemVuThuongQuyID: assignment.NhiemVuThuongQuyID,
      ChuKyDanhGiaID: chuKyId,
      MucDoKho: assignment.MucDoKho,
      ChiTietDiem: chiTietDiem,
      TongDiemTieuChi: existingEval?.TongDiemTieuChi ?? 0,
      DiemNhiemVu: existingEval?.DiemNhiemVu ?? 0,
      DiemTuDanhGia: assignment.DiemTuDanhGia ?? 0, // ✅ V2: Include self-assessment score
    };
  });

  // Populate ChuKyDanhGiaID in danhGiaKPI for frontend
  danhGiaKPI = await DanhGiaKPI.findById(danhGiaKPI._id)
    .populate("ChuKyDanhGiaID")
    .populate("NhanVienID")
    .populate("NguoiDanhGiaID")
    .populate({ path: "NguoiDuyet", select: "HoTen Ten MaNhanVien" })
    .populate({
      path: "LichSuDuyet.NguoiDuyet",
      select: "HoTen Ten MaNhanVien",
    })
    // ✅ Populate history user for FE display
    .populate({
      path: "LichSuHuyDuyet.NguoiHuyDuyet",
      select: "HoTen Ten MaNhanVien",
    })
    .lean();

  return sendResponse(
    res,
    200,
    true,
    {
      danhGiaKPI,
      danhGiaNhiemVuList,
      chuKy,
    },
    null,
    "Lấy chi tiết đánh giá KPI thành công"
  );
});

/**
 * ✅ ENHANCED: Duyệt KPI với TRANSACTION ATOMIC
 * @route POST /api/workmanagement/kpi/duyet-kpi-tieu-chi/:danhGiaKPIId
 * @desc Batch upsert + validate + approve trong 1 transaction
 * @access Private (Manager)
 * @body { nhiemVuList: [{ _id?, NhiemVuThuongQuyID, MucDoKho, ChiTietDiem, TongDiemTieuChi, DiemNhiemVu }] }
 */
kpiController.duyetKPITieuChi = catchAsync(async (req, res, next) => {
  const { danhGiaKPIId } = req.params;
  const { nhiemVuList } = req.body;
  const nguoiDanhGiaID = req.currentNhanVienID;

  // ========== STEP 1: PRE-VALIDATION (Before Transaction) ==========
  const danhGiaKPI = await DanhGiaKPI.findById(danhGiaKPIId).populate(
    "ChuKyDanhGiaID",
    "TenChuKy NgayBatDau NgayKetThuc TieuChiCauHinh"
  );

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "DANHGIA_NOT_FOUND");
  }

  // ✅ IDEMPOTENCY CHECK: Prevent double approval
  if (danhGiaKPI.TrangThai === "DA_DUYET") {
    return sendResponse(
      res,
      200,
      true,
      { danhGiaKPI },
      null,
      "Đánh giá KPI đã được duyệt trước đó"
    );
  }

  // ✅ VALIDATE: Quyền duyệt
  const quanLy = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: nguoiDanhGiaID,
    NhanVienDuocQuanLy: danhGiaKPI.NhanVienID,
    LoaiQuanLy: "KPI",
    isDeleted: false,
  });

  if (!quanLy) {
    throw new AppError(
      403,
      "Bạn không có quyền duyệt KPI cho nhân viên này",
      "FORBIDDEN"
    );
  }

  // ✅ VALIDATE: nhiemVuList không rỗng
  if (!Array.isArray(nhiemVuList) || nhiemVuList.length === 0) {
    throw new AppError(
      400,
      "Vui lòng chấm điểm ít nhất 1 nhiệm vụ",
      "EMPTY_NHIEMVU_LIST"
    );
  }

  // ✅ VALIDATE: Tất cả nhiệm vụ có điểm đầy đủ
  for (const nv of nhiemVuList) {
    const hasAllScores = nv.ChiTietDiem?.every(
      (cd) => cd.DiemDat !== null && cd.DiemDat !== undefined && cd.DiemDat >= 0
    );

    if (!hasAllScores) {
      const nvInfo = await NhiemVuThuongQuy.findById(nv.NhiemVuThuongQuyID);
      throw new AppError(
        400,
        `Nhiệm vụ "${nvInfo?.TenNhiemVu || "N/A"}" chưa chấm đầy đủ điểm`,
        "INCOMPLETE_SCORES"
      );
    }

    // ✅ VALIDATE: Điểm trong range hợp lệ
    for (const cd of nv.ChiTietDiem) {
      if (cd.DiemDat < cd.GiaTriMin || cd.DiemDat > cd.GiaTriMax) {
        throw new AppError(
          400,
          `Điểm "${cd.TenTieuChi}" phải từ ${cd.GiaTriMin} đến ${cd.GiaTriMax}`,
          "INVALID_SCORE_RANGE"
        );
      }
    }
  }

  // ========== STEP 2: BATCH UPSERT (No transaction for standalone MongoDB) ==========
  try {
    // ✅ V2: Normalize ChiTietDiem before upsert
    const upsertPromises = nhiemVuList.map((nv) => {
      // ✅ Ensure IsMucDoHoanThanh is correctly set
      const normalizedChiTietDiem = nv.ChiTietDiem.map((tc) => {
        const isMucDoHoanThanh =
          tc.IsMucDoHoanThanh === true || // Preserve if already true
          tc.TenTieuChi === "Mức độ hoàn thành" ||
          tc.TenTieuChi === "Mức độ hoàn thành công việc" ||
          tc.TenTieuChi?.toLowerCase().includes("mức độ hoàn thành");

        return {
          ...tc,
          IsMucDoHoanThanh: isMucDoHoanThanh,
        };
      });

      return DanhGiaNhiemVuThuongQuy.findOneAndUpdate(
        {
          NhanVienID: danhGiaKPI.NhanVienID,
          NhiemVuThuongQuyID: nv.NhiemVuThuongQuyID,
          ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
        },
        {
          $set: {
            DanhGiaKPIID: danhGiaKPI._id,
            MucDoKho: nv.MucDoKho,
            ChiTietDiem: normalizedChiTietDiem, // ✅ V2: Use normalized data
            NgayDanhGia: new Date(),
            isDeleted: false,
          },
        },
        { upsert: true, new: true }
      );
    });

    await Promise.all(upsertPromises);

    // ✅ V2 (Option B): Method duyet() tự tính TongDiemKPI
    // → Controller chỉ cần gọi method, không cần tính thủ công
    await danhGiaKPI.duyet(undefined, req.user.NhanVienID || req.user._id);

    // Populate for response (include history users)
    await danhGiaKPI.populate("ChuKyDanhGiaID NhanVienID");
    await danhGiaKPI.populate({
      path: "NguoiDuyet",
      select: "HoTen Ten MaNhanVien",
    });
    await danhGiaKPI.populate({
      path: "LichSuDuyet.NguoiDuyet",
      select: "HoTen Ten MaNhanVien",
    });
    await danhGiaKPI.populate({
      path: "LichSuHuyDuyet.NguoiHuyDuyet",
      select: "HoTen Ten MaNhanVien",
    });

    return sendResponse(
      res,
      200,
      true,
      { danhGiaKPI },
      null,
      `Duyệt KPI thành công! Tổng điểm: ${danhGiaKPI.TongDiemKPI.toFixed(1)}`
    );
  } catch (error) {
    // ========== ERROR HANDLING ==========
    throw new AppError(
      500,
      "Không thể duyệt KPI: " + error.message,
      "APPROVE_FAILED"
    );
  }
});

/**
 * @route POST /api/workmanagement/kpi/luu-tat-ca/:danhGiaKPIId
 * @desc Lưu tất cả nhiệm vụ (không duyệt) - Batch upsert
 * @access Private (Manager)
 * @body { nhiemVuList: [{ NhiemVuThuongQuyID, MucDoKho, ChiTietDiem }] }
 */
kpiController.luuTatCaNhiemVu = catchAsync(async (req, res, next) => {
  const { danhGiaKPIId } = req.params;
  const { nhiemVuList } = req.body;
  const nguoiDanhGiaID = req.currentNhanVienID;

  // ✅ VALIDATE: DanhGiaKPI exists
  const danhGiaKPI = await DanhGiaKPI.findById(danhGiaKPIId);
  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "Not Found");
  }

  // ✅ VALIDATE: Quyền chấm điểm
  const quanLy = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: nguoiDanhGiaID,
    NhanVienDuocQuanLy: danhGiaKPI.NhanVienID,
    LoaiQuanLy: "KPI",
    isDeleted: false,
  });

  if (!quanLy) {
    throw new AppError(
      403,
      "Bạn không có quyền chấm điểm KPI cho nhân viên này",
      "Forbidden"
    );
  }

  // ✅ GUARD: Prevent editing approved KPI
  if (danhGiaKPI.TrangThai === "DA_DUYET") {
    throw new AppError(
      403,
      "KPI đã được duyệt - không thể chỉnh sửa",
      "Forbidden"
    );
  }

  // ✅ VALIDATE: nhiemVuList
  if (!Array.isArray(nhiemVuList) || nhiemVuList.length === 0) {
    throw new AppError(400, "Danh sách nhiệm vụ không hợp lệ", "Bad Request");
  }

  // ✅ SAVE: Each nhiemVu evaluation with criteria scores (skip validation - frontend handles it)
  let tongDiemKPI = 0;
  const savedNhiemVu = [];
  const nhiemVuIdsWithScore = []; // ✅ Track nhiệm vụ có điểm > 0

  for (const nhiemVu of nhiemVuList) {
    // Skip tasks without ChiTietDiem
    if (!nhiemVu.ChiTietDiem || nhiemVu.ChiTietDiem.length === 0) {
      continue;
    }

    // ✅ V2: Normalize ChiTietDiem - Ensure IsMucDoHoanThanh is correctly set
    const normalizedChiTietDiem = nhiemVu.ChiTietDiem.map((tc) => {
      const isMucDoHoanThanh =
        tc.IsMucDoHoanThanh === true || // Preserve if already true
        tc.TenTieuChi === "Mức độ hoàn thành" ||
        tc.TenTieuChi === "Mức độ hoàn thành công việc" ||
        tc.TenTieuChi?.toLowerCase().includes("mức độ hoàn thành");

      return {
        ...tc,
        IsMucDoHoanThanh: isMucDoHoanThanh, // ✅ Always set correctly
      };
    });

    // Calculate TongDiemTieuChi = Σ(score/100) where GIAM_DIEM is negative
    const tongDiemTieuChi = normalizedChiTietDiem.reduce((sum, tc) => {
      const score = (tc.DiemDat || 0) / 100;
      return sum + (tc.LoaiTieuChi === "GIAM_DIEM" ? -score : score);
    }, 0);

    // ✅ NEW: Skip nhiệm vụ có tổng điểm = 0 (không lưu)
    if (tongDiemTieuChi === 0) {
      continue;
    }

    // Calculate DiemNhiemVu = TongDiemTieuChi × MucDoKho
    const diemNhiemVu = tongDiemTieuChi * (nhiemVu.MucDoKho || 5);

    const nhiemVuId =
      nhiemVu.NhiemVuThuongQuyID._id || nhiemVu.NhiemVuThuongQuyID;

    // ✅ Track nhiệm vụ có điểm
    nhiemVuIdsWithScore.push(nhiemVuId.toString());

    // Upsert DanhGiaNhiemVuThuongQuy
    const savedEval = await DanhGiaNhiemVuThuongQuy.findOneAndUpdate(
      {
        NhanVienID: danhGiaKPI.NhanVienID,
        NhiemVuThuongQuyID: nhiemVuId,
        ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
      },
      {
        NhanVienID: danhGiaKPI.NhanVienID,
        NhiemVuThuongQuyID: nhiemVuId,
        ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
        MucDoKho: nhiemVu.MucDoKho,
        ChiTietDiem: normalizedChiTietDiem, // ✅ V2: Use normalized data
        TongDiemTieuChi: tongDiemTieuChi,
        DiemNhiemVu: diemNhiemVu,
        isDeleted: false,
      },
      {
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );

    savedNhiemVu.push(savedEval);
    tongDiemKPI += diemNhiemVu;
  }

  // ✅ NEW: XÓA các nhiệm vụ có tổng điểm = 0 (user đã clear hết điểm)
  // Lấy tất cả assignments trong chu kỳ
  const allAssignments = await NhanVienNhiemVu.find({
    NhanVienID: danhGiaKPI.NhanVienID,
    ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
    isDeleted: false,
  }).lean();

  const allAssignmentIds = allAssignments.map((a) =>
    a.NhiemVuThuongQuyID.toString()
  );

  // Tìm nhiệm vụ cần xóa: có trong assignments nhưng không có trong danh sách đã lưu
  const nhiemVuIdsToDelete = allAssignmentIds.filter(
    (id) => !nhiemVuIdsWithScore.includes(id)
  );

  let deletedCount = 0;
  if (nhiemVuIdsToDelete.length > 0) {
    const deleteResult = await DanhGiaNhiemVuThuongQuy.deleteMany({
      NhanVienID: danhGiaKPI.NhanVienID,
      ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
      NhiemVuThuongQuyID: { $in: nhiemVuIdsToDelete },
    });
    deletedCount = deleteResult.deletedCount || 0;
  }

  // ✅ UPDATE: DanhGiaKPI with total score (không duyệt)
  danhGiaKPI.TongDiemKPI = tongDiemKPI;
  await danhGiaKPI.save();

  // ✅ REFRESH: Fetch full list như getChamDiemTieuChi để frontend có đầy đủ data
  const chuKy = await ChuKyDanhGia.findById(danhGiaKPI.ChuKyDanhGiaID);
  const tieuChiCauHinh = chuKy?.TieuChiCauHinh || [];

  // Get all assignments trong chu kỳ
  const assignments = await NhanVienNhiemVu.find({
    NhanVienID: danhGiaKPI.NhanVienID,
    ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
    isDeleted: false,
  })
    .populate({
      path: "NhiemVuThuongQuyID",
      select: "TenNhiemVu MoTa MucDoKhoDefault",
    })
    .lean();

  // Get all existing evaluations
  const existingEvaluations = await DanhGiaNhiemVuThuongQuy.find({
    NhanVienID: danhGiaKPI.NhanVienID,
    ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
    isDeleted: false,
  }).lean();

  const evaluationMap = existingEvaluations.reduce((acc, evaluation) => {
    acc[evaluation.NhiemVuThuongQuyID.toString()] = evaluation;
    return acc;
  }, {});

  // Build complete list
  const danhGiaNhiemVuList = assignments.map((assignment) => {
    const nhiemVuId = assignment.NhiemVuThuongQuyID._id.toString();
    const existingEval = evaluationMap[nhiemVuId];

    const chiTietDiem = tieuChiCauHinh.map((tc) => {
      const existingScore = existingEval?.ChiTietDiem?.find(
        (cd) =>
          cd.TenTieuChi === tc.TenTieuChi && cd.LoaiTieuChi === tc.LoaiTieuChi
      );

      // ✅ V2: Detect IsMucDoHoanThanh
      const isMucDoHoanThanh =
        existingScore?.IsMucDoHoanThanh ||
        tc.TenTieuChi === "Mức độ hoàn thành" ||
        tc.TenTieuChi === "Mức độ hoàn thành công việc" ||
        tc.TenTieuChi?.toLowerCase().includes("mức độ hoàn thành");

      return {
        TenTieuChi: tc.TenTieuChi,
        LoaiTieuChi: tc.LoaiTieuChi,
        GiaTriMin: tc.GiaTriMin,
        GiaTriMax: tc.GiaTriMax,
        DonVi: tc.DonVi,
        DiemDat: existingScore?.DiemDat ?? 0,
        GhiChu: existingScore?.GhiChu ?? "",
        IsMucDoHoanThanh: isMucDoHoanThanh, // ✅ V2: Add flag
      };
    });

    return {
      _id: existingEval?._id || null,
      NhanVienID: danhGiaKPI.NhanVienID,
      NhiemVuThuongQuyID: assignment.NhiemVuThuongQuyID,
      ChuKyDanhGiaID: danhGiaKPI.ChuKyDanhGiaID,
      MucDoKho: assignment.MucDoKho,
      ChiTietDiem: chiTietDiem,
      DiemTuDanhGia: assignment.DiemTuDanhGia ?? 0, // ✅ V2: Add DiemTuDanhGia from assignment
      TongDiemTieuChi: existingEval?.TongDiemTieuChi ?? 0,
      DiemNhiemVu: existingEval?.DiemNhiemVu ?? 0,
    };
  });

  // Populate danhGiaKPI (avoid reassigning const)
  const danhGiaKPIPopulated = await DanhGiaKPI.findById(danhGiaKPI._id)
    .populate("ChuKyDanhGiaID")
    .populate("NhanVienID")
    .populate("NguoiDanhGiaID")
    .lean();

  // ✅ Enhanced success message with deletion info
  let message = `Đã lưu ${savedNhiemVu.length} nhiệm vụ thành công`;
  if (deletedCount > 0) {
    message += ` (xóa ${deletedCount} nhiệm vụ có điểm 0)`;
  }

  return sendResponse(
    res,
    200,
    true,
    {
      danhGiaKPI: danhGiaKPIPopulated,
      danhGiaNhiemVuList,
      savedCount: savedNhiemVu.length,
      deletedCount,
    },
    null,
    message
  );
});

/**
 * ✅ NEW: Hủy duyệt KPI
 * @route POST /api/workmanagement/kpi/huy-duyet-kpi/:danhGiaKPIId
 * @desc Undo KPI approval với permission check + audit trail
 * @access Private (Admin hoặc Manager trong 7 ngày)
 * @body { lyDo: String (required) }
 */
kpiController.huyDuyetKPI = catchAsync(async (req, res, next) => {
  const { danhGiaKPIId } = req.params;
  const { lyDo } = req.body;
  const currentUser = req.user; // ← From isAuth middleware

  // ========== STEP 1: VALIDATION ==========
  const danhGiaKPI = await DanhGiaKPI.findById(danhGiaKPIId)
    .populate("ChuKyDanhGiaID", "TenChuKy NgayBatDau NgayKetThuc")
    .populate("NhanVienID", "Ten MaNhanVien KhoaID");

  if (!danhGiaKPI) {
    throw new AppError(404, "Không tìm thấy đánh giá KPI", "DANHGIA_NOT_FOUND");
  }

  if (danhGiaKPI.TrangThai !== "DA_DUYET") {
    throw new AppError(
      400,
      "KPI chưa được duyệt, không thể hủy duyệt",
      "NOT_APPROVED"
    );
  }

  if (!lyDo || lyDo.trim().length === 0) {
    throw new AppError(400, "Vui lòng nhập lý do hủy duyệt", "MISSING_REASON");
  }

  // ========== STEP 2: PERMISSION CHECK ==========
  const isAdmin = currentUser.PhanQuyen === "admin";
  let isManager = false;

  // Check if user is manager of this employee (via QuanLyNhanVien)
  if (!isAdmin && currentUser.NhanVienID) {
    const quanLy = await QuanLyNhanVien.findOne({
      NhanVienQuanLy: currentUser.NhanVienID,
      NhanVienDuocQuanLy: danhGiaKPI.NhanVienID._id,
      LoaiQuanLy: "KPI",
      isDeleted: false,
    });

    isManager = !!quanLy;
  }

  // Deny access if neither admin nor manager
  if (!isAdmin && !isManager) {
    throw new AppError(
      403,
      "Bạn không có quyền hủy duyệt KPI của nhân viên này",
      "PERMISSION_DENIED"
    );
  }

  // Manager: Check time constraint (7 days)
  if (isManager && !isAdmin) {
    const daysSinceApproval = danhGiaKPI.NgayDuyet
      ? Math.floor(
          (new Date() - new Date(danhGiaKPI.NgayDuyet)) / (1000 * 60 * 60 * 24)
        )
      : 0;

    if (daysSinceApproval > 7) {
      throw new AppError(
        403,
        `Đã quá ${daysSinceApproval} ngày kể từ khi duyệt. Quản lý chỉ được hủy trong vòng 7 ngày.`,
        "TIME_EXPIRED"
      );
    }
  }

  // ========== STEP 3: UPDATE DANHGIA KPI (No transaction for standalone MongoDB) ==========
  try {
    // ✅ V2: Gọi method huyDuyet() (đã có đầy đủ logic)
    await danhGiaKPI.huyDuyet(currentUser.NhanVienID || currentUser._id, lyDo);

    // Populate for response (include history users)
    const danhGiaKPIPopulated = await DanhGiaKPI.findById(danhGiaKPI._id)
      .populate("ChuKyDanhGiaID")
      .populate("NhanVienID")
      .populate("NguoiDanhGiaID")
      .populate({ path: "NguoiDuyet", select: "HoTen Ten MaNhanVien" })
      .populate({
        path: "LichSuDuyet.NguoiDuyet",
        select: "HoTen Ten MaNhanVien",
      })
      .populate({
        path: "LichSuHuyDuyet.NguoiHuyDuyet",
        select: "HoTen Ten MaNhanVien",
      })
      .lean();

    return sendResponse(
      res,
      200,
      true,
      { danhGiaKPI: danhGiaKPIPopulated },
      null,
      "Đã hủy duyệt KPI thành công. Có thể chỉnh sửa lại điểm."
    );
  } catch (error) {
    // If save fails, throw error
    throw new AppError(
      500,
      "Không thể hủy duyệt KPI: " + error.message,
      "UPDATE_FAILED"
    );
  }
});

/**
 * ✅ NEW API: Nhân viên tự chấm điểm tiêu chí "Mức độ hoàn thành"
 * @route PUT /api/workmanagement/kpi/danh-gia-nhiem-vu/:id/nhan-vien-cham-diem
 * @desc Nhân viên tự đánh giá mức độ hoàn thành công việc
 * @access Private (Employee only)
 */
kpiController.nhanVienChamDiem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { diemTuDanhGia } = req.body; // { "Mức độ hoàn thành công việc": 85 }
  const nhanVienId = req.user.NhanVienID;

  const danhGia = await DanhGiaNhiemVuThuongQuy.findOne({
    _id: id,
    isDeleted: false,
  });

  // Validation
  if (!danhGia) {
    throw new AppError(404, "Không tìm thấy đánh giá nhiệm vụ");
  }
  if (danhGia.NhanVienID.toString() !== nhanVienId.toString()) {
    throw new AppError(403, "Bạn chỉ có thể tự chấm điểm của mình");
  }
  if (!danhGia.coTheChamDiem()) {
    throw new AppError(400, "Không thể chấm điểm khi đã duyệt");
  }

  // Update DiemTuDanhGia cho tiêu chí IsMucDoHoanThanh = true
  danhGia.ChiTietDiem.forEach((tc) => {
    if (tc.IsMucDoHoanThanh && diemTuDanhGia[tc.TenTieuChi] !== undefined) {
      const diem = Number(diemTuDanhGia[tc.TenTieuChi]);

      // Validate range
      if (diem < tc.GiaTriMin || diem > tc.GiaTriMax) {
        throw new AppError(
          400,
          `Điểm tiêu chí "${tc.TenTieuChi}" phải trong khoảng ${tc.GiaTriMin}-${tc.GiaTriMax}`
        );
      }

      tc.DiemTuDanhGia = diem;
    }
  });

  await danhGia.save();

  return sendResponse(
    res,
    200,
    true,
    { danhGia },
    null,
    "Tự chấm điểm thành công"
  );
});

/**
 * ✅ NEW API: Quản lý chấm điểm tất cả tiêu chí
 * @route PUT /api/workmanagement/kpi/danh-gia-nhiem-vu/:id/quan-ly-cham-diem
 * @desc Quản lý chấm điểm cho tất cả tiêu chí
 * @access Private (Manager/Admin)
 */
kpiController.quanLyChamDiem = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { chiTietDiem } = req.body; // { "Mức độ hoàn thành công việc": 90, "Tiêu chí 1": 80, ... }

  const danhGia = await DanhGiaNhiemVuThuongQuy.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!danhGia) {
    throw new AppError(404, "Không tìm thấy đánh giá nhiệm vụ");
  }
  if (!danhGia.coTheChamDiem()) {
    throw new AppError(400, "Không thể chấm điểm khi đã duyệt");
  }

  // Update điểm
  danhGia.ChiTietDiem.forEach((tc) => {
    if (chiTietDiem[tc.TenTieuChi] !== undefined) {
      const diem = Number(chiTietDiem[tc.TenTieuChi]);

      // Validate
      if (diem < tc.GiaTriMin || diem > tc.GiaTriMax) {
        throw new AppError(
          400,
          `Điểm "${tc.TenTieuChi}" phải trong khoảng ${tc.GiaTriMin}-${tc.GiaTriMax}`
        );
      }

      // Nếu cho phép tự đánh giá → chấm DiemQuanLy
      // Nếu không → chấm DiemDat trực tiếp
      if (tc.IsMucDoHoanThanh) {
        tc.DiemQuanLy = diem;
      } else {
        tc.DiemDat = diem;
      }
    }
  });

  await danhGia.save();

  return sendResponse(
    res,
    200,
    true,
    { danhGia },
    null,
    "Chấm điểm thành công"
  );
});

/**
 * ✅ NEW: Lấy danh sách đánh giá nhiệm vụ (để check manager scores)
 * @route GET /api/workmanagement/kpi/danh-gia-nhiem-vu
 * @desc Get list of task evaluations for pre-validation
 * @access Private
 * @query nhanVienId, chuKyId
 */
kpiController.layDanhSachDanhGiaNhiemVu = catchAsync(async (req, res, next) => {
  const { nhanVienId, chuKyId } = req.query;

  console.log("🔍 API called with:", { nhanVienId, chuKyId });

  // Validate inputs
  if (!nhanVienId || !chuKyId) {
    throw new AppError(
      400,
      "Missing required query params: nhanVienId, chuKyId",
      "Bad Request"
    );
  }

  // ✅ FIX: Query trực tiếp DanhGiaNhiemVuThuongQuy (giống backend validation)
  // KHÔNG cần DanhGiaKPI record
  const danhGiaNhiemVuList = await DanhGiaNhiemVuThuongQuy.find(
    {
      NhanVienID: nhanVienId,
      ChuKyDanhGiaID: chuKyId,
      // Nếu hệ thống có soft delete, có thể cần: isDeleted: { $ne: true }
    },
    {
      // Chỉ trả về các trường cần thiết để FE build map nhanh
      _id: 1,
      NhanVienID: 1,
      ChuKyDanhGiaID: 1,
      NhiemVuThuongQuyID: 1,
    }
  ).lean();

  console.log("🔍 Total tasks found:", danhGiaNhiemVuList.length);

  // Trả thẳng danh sách các đánh giá nhiệm vụ (backend validation cũng chỉ cần tồn tại)
  console.log(
    "✅ Tasks with manager scores (by existence):",
    danhGiaNhiemVuList.length
  );

  return sendResponse(
    res,
    200,
    true,
    danhGiaNhiemVuList,
    null,
    `Found ${danhGiaNhiemVuList.length} task evaluations`
  );
});

/**
 * ✅ Check nhanh 1 nhiệm vụ đã có bản ghi DanhGiaNhiemVuThuongQuy hay chưa
 * @route GET /api/workmanagement/kpi/danh-gia-nhiem-vu/has-score
 * @query nhanVienId, chuKyId, nhiemVuId
 */
kpiController.hasManagerScoreForTask = catchAsync(async (req, res, next) => {
  const { nhanVienId, chuKyId, nhiemVuId } = req.query;

  if (!nhanVienId || !chuKyId || !nhiemVuId) {
    throw new AppError(
      400,
      "Missing query: nhanVienId, chuKyId, nhiemVuId",
      "Bad Request"
    );
  }

  const exists = await DanhGiaNhiemVuThuongQuy.exists({
    NhanVienID: nhanVienId,
    ChuKyDanhGiaID: chuKyId,
    NhiemVuThuongQuyID: nhiemVuId,
  });

  return sendResponse(res, 200, true, { has: !!exists }, null, "OK");
});

/**
 * ========================================
 * BÁO CÁO & THỐNG KÊ KPI
 * ========================================
 */

/**
 * @route GET /api/workmanagement/kpi/bao-cao/thong-ke
 * @desc Lấy thống kê tổng hợp KPI
 * @access Private (Manager xem khoa, Admin xem tất cả)
 * @query chuKyId, khoaId, startDate, endDate, groupBy
 */
kpiController.getBaoCaoThongKe = catchAsync(async (req, res, next) => {
  const { chuKyId, khoaId } = req.query;

  // ✅ Kiểm tra authentication
  const currentUser = req.user;
  if (!currentUser) {
    return next(
      new AppError(401, "Vui lòng đăng nhập", "AUTHENTICATION_REQUIRED")
    );
  }

  const { PhanQuyen, KhoaID: userKhoaId } = currentUser;

  // ✅ Kiểm tra quyền: CHỈ admin và manager
  const isAdmin = PhanQuyen === "admin";
  const isManager = PhanQuyen === "manager";

  if (!isAdmin && !isManager) {
    return next(
      new AppError(
        403,
        "Bạn không có quyền truy cập báo cáo này",
        "PERMISSION_DENIED"
      )
    );
  }

  // ✅ Build filter - CHỈ lấy đã duyệt
  let filter = {
    isDeleted: { $ne: true },
    TrangThai: "DA_DUYET", // ← CHỈ lấy đã duyệt
  };

  // ✅ Filter theo chu kỳ (optional)
  if (chuKyId) {
    filter.ChuKyDanhGiaID = new mongoose.Types.ObjectId(chuKyId);
  }

  // ✅ Filter theo khoa - Phân quyền
  if (isManager) {
    // Manager: CHỈ xem khoa của mình
    if (!userKhoaId) {
      return next(
        new AppError(
          403,
          "Tài khoản chưa được gán khoa/phòng. Vui lòng liên hệ quản trị viên.",
          "NO_DEPARTMENT"
        )
      );
    }
    filter.KhoaID = new mongoose.Types.ObjectId(userKhoaId);
  } else if (isAdmin && khoaId) {
    // Admin: Có thể chọn khoa cụ thể hoặc xem tất cả
    filter.KhoaID = new mongoose.Types.ObjectId(khoaId);
  }

  // ✅ Log filter để debug
  console.log("🔍 getBaoCaoThongKe - Filter:", JSON.stringify(filter, null, 2));

  // ============================================
  // 1. THỐNG KÊ TỔNG QUAN
  // ============================================
  const tongQuanPipeline = [
    { $match: filter }, // ✅ Áp dụng filter ngay từ đầu
    {
      $lookup: {
        from: "nhanviens",
        localField: "NhanVienID",
        foreignField: "_id",
        as: "nhanVien",
      },
    },
    { $unwind: "$nhanVien" },
    {
      $lookup: {
        from: "khoas",
        localField: "nhanVien.KhoaID",
        foreignField: "_id",
        as: "khoa",
      },
    },
    { $unwind: { path: "$khoa", preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: null,
        tongSoDanhGia: { $sum: 1 },
        tongSoNhanVien: { $addToSet: "$NhanVienID" }, // ✅ Distinct NhanVienID
        diemTrungBinh: { $avg: "$TongDiemKPI" },
        diemCaoNhat: { $max: "$TongDiemKPI" },
        diemThapNhat: { $min: "$TongDiemKPI" },
        soKhoaThamGia: { $addToSet: "$khoa._id" }, // ✅ Distinct Khoa
      },
    },
    {
      $project: {
        _id: 0,
        tongSoDanhGia: 1,
        tongSoNhanVien: { $size: "$tongSoNhanVien" },
        diemTrungBinh: { $round: ["$diemTrungBinh", 2] },
        diemCaoNhat: { $round: ["$diemCaoNhat", 2] },
        diemThapNhat: { $round: ["$diemThapNhat", 2] },
        soKhoaThamGia: { $size: "$soKhoaThamGia" },
      },
    },
  ];

  const tongQuanResult = await DanhGiaKPI.aggregate(tongQuanPipeline);
  const tongQuan = tongQuanResult[0] || {
    tongSoDanhGia: 0,
    tongSoNhanVien: 0,
    diemTrungBinh: 0,
    diemCaoNhat: 0,
    diemThapNhat: 0,
    soKhoaThamGia: 0,
  };

  console.log("✅ tongQuan:", tongQuan);

  // ============================================
  // 2. PHÂN BỔ MỨC ĐIỂM
  // ============================================
  const phanBoMucDiemPipeline = [
    { $match: filter },
    {
      $bucket: {
        groupBy: "$TongDiemKPI",
        boundaries: [0, 3, 5, 7, 9, 10],
        default: "other",
        output: {
          soLuong: { $sum: 1 },
        },
      },
    },
  ];

  const phanBoRaw = await DanhGiaKPI.aggregate(phanBoMucDiemPipeline);

  const mucDiemMap = {
    0: { muc: "Yếu", khoangDiem: "< 3.0" },
    3: { muc: "Trung bình", khoangDiem: "3.0 - 4.9" },
    5: { muc: "Khá", khoangDiem: "5.0 - 6.9" },
    7: { muc: "Tốt", khoangDiem: "7.0 - 8.9" },
    9: { muc: "Xuất sắc", khoangDiem: "9.0 - 10.0" },
  };

  const totalRecords = phanBoRaw.reduce((sum, item) => sum + item.soLuong, 0);
  const phanBoMucDiem = phanBoRaw.map((item) => ({
    ...mucDiemMap[item._id],
    soLuong: item.soLuong,
    tyLe:
      totalRecords > 0 ? ((item.soLuong / totalRecords) * 100).toFixed(1) : 0,
  }));

  console.log("✅ phanBoMucDiem:", phanBoMucDiem);

  // ============================================
  // 3. THỐNG KÊ THEO KHOA
  // ============================================
  const theoKhoaPipeline = [
    { $match: filter },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NhanVienID",
        foreignField: "_id",
        as: "nhanVien",
      },
    },
    { $unwind: "$nhanVien" },
    {
      $lookup: {
        from: "khoas",
        localField: "nhanVien.KhoaID",
        foreignField: "_id",
        as: "khoa",
      },
    },
    { $unwind: "$khoa" },
    {
      $group: {
        _id: "$khoa._id",
        tenKhoa: { $first: "$khoa.TenKhoa" },
        soNhanVien: { $sum: 1 },
        diemTrungBinh: { $avg: "$TongDiemKPI" },
        diemCaoNhat: { $max: "$TongDiemKPI" },
        diemThapNhat: { $min: "$TongDiemKPI" },
      },
    },
    {
      $project: {
        _id: 1,
        tenKhoa: 1,
        soNhanVien: 1,
        diemTrungBinh: { $round: ["$diemTrungBinh", 2] },
        diemCaoNhat: { $round: ["$diemCaoNhat", 2] },
        diemThapNhat: { $round: ["$diemThapNhat", 2] },
      },
    },
    { $sort: { diemTrungBinh: -1 } },
  ];

  const theoKhoa = await DanhGiaKPI.aggregate(theoKhoaPipeline);
  console.log("✅ theoKhoa:", theoKhoa.length);

  // ============================================
  // 4. TOP 10 NHÂN VIÊN XUẤT SẮC
  // ============================================
  const topPerformersPipeline = [
    { $match: filter },
    { $sort: { TongDiemKPI: -1 } },
    { $limit: 10 },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NhanVienID",
        foreignField: "_id",
        as: "nhanVien",
      },
    },
    { $unwind: "$nhanVien" },
    {
      $lookup: {
        from: "khoas",
        localField: "nhanVien.KhoaID",
        foreignField: "_id",
        as: "khoa",
      },
    },
    { $unwind: { path: "$khoa", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "chukydanhgias",
        localField: "ChuKyDanhGiaID",
        foreignField: "_id",
        as: "chuKy",
      },
    },
    { $unwind: { path: "$chuKy", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        nhanVienId: "$NhanVienID",
        tenNhanVien: "$nhanVien.Ten",
        maNhanVien: "$nhanVien.MaNhanVien",
        khoaPhong: "$khoa.TenKhoa",
        diemKPI: { $round: ["$TongDiemKPI", 2] },
        chuKy: "$chuKy.TenChuKy",
        ngayDuyet: "$NgayDuyet",
      },
    },
  ];

  const topNhanVienXuatSac = await DanhGiaKPI.aggregate(topPerformersPipeline);
  console.log("✅ topNhanVienXuatSac:", topNhanVienXuatSac.length);

  // ============================================
  // 5. TOP 10 NHÂN VIÊN CẦN CẢI THIỆN
  // ============================================
  const bottomPerformersPipeline = [
    { $match: filter },
    { $sort: { TongDiemKPI: 1 } }, // ✅ ASC
    { $limit: 10 },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NhanVienID",
        foreignField: "_id",
        as: "nhanVien",
      },
    },
    { $unwind: "$nhanVien" },
    {
      $lookup: {
        from: "khoas",
        localField: "nhanVien.KhoaID",
        foreignField: "_id",
        as: "khoa",
      },
    },
    { $unwind: { path: "$khoa", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "chukydanhgias",
        localField: "ChuKyDanhGiaID",
        foreignField: "_id",
        as: "chuKy",
      },
    },
    { $unwind: { path: "$chuKy", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        nhanVienId: "$NhanVienID",
        tenNhanVien: "$nhanVien.Ten",
        maNhanVien: "$nhanVien.MaNhanVien",
        khoaPhong: "$khoa.TenKhoa",
        diemKPI: { $round: ["$TongDiemKPI", 2] },
        chuKy: "$chuKy.TenChuKy",
        ngayDuyet: "$NgayDuyet",
      },
    },
  ];

  const nhanVienCanCaiThien = await DanhGiaKPI.aggregate(
    bottomPerformersPipeline
  );
  console.log("✅ nhanVienCanCaiThien:", nhanVienCanCaiThien.length);

  // ============================================
  // 6. PHÂN BỔ TRẠNG THÁI (Luôn 100% đã duyệt vì filter TrangThai = "DA_DUYET")
  // ============================================
  const phanBoTrangThai = {
    daDuyet: tongQuan.tongSoDanhGia,
    chuaDuyet: 0, // ✅ Luôn 0 vì đã filter TrangThai = "DA_DUYET"
    tyLeDaDuyet: 100, // ✅ Luôn 100%
  };

  // ============================================
  // RESPONSE
  // ============================================
  const data = {
    tongQuan,
    phanBoMucDiem,
    theoKhoa,
    topNhanVienXuatSac,
    nhanVienCanCaiThien,
    phanBoTrangThai,
  };

  console.log("✅ getBaoCaoThongKe - Response prepared successfully");

  return sendResponse(
    res,
    200,
    true,
    { data },
    null,
    "Lấy báo cáo thống kê thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/bao-cao/chi-tiet
 * @desc Lấy danh sách chi tiết KPI (cho table)
 * @access Private
 * @query chuKyId, khoaId, startDate, endDate, page, limit, search
 */
kpiController.getBaoCaoChiTiet = catchAsync(async (req, res, next) => {
  const {
    chuKyId,
    khoaId,
    startDate,
    endDate,
    page = 0,
    limit = 10,
    search = "",
  } = req.query;
  const currentUser = req.user;
  if (!currentUser) {
    return next(new AppError(401, "Login required", "Authentication Error"));
  }
  const role = currentUser.PhanQuyen;
  const userKhoaId = currentUser.KhoaID;
  const isAdmin =
    role === "admin" ||
    role === "superadmin" ||
    role === "supperadmin" ||
    role === 3 ||
    role === 4;

  // Base filter
  let baseFilter = {};

  if (!isAdmin) {
    if (userKhoaId)
      baseFilter.khoaFilter = new mongoose.Types.ObjectId(userKhoaId);
  } else if (khoaId) {
    baseFilter.khoaFilter = new mongoose.Types.ObjectId(khoaId);
  }

  if (chuKyId) {
    baseFilter.ChuKyDanhGiaID = new mongoose.Types.ObjectId(chuKyId);
  }

  if (startDate && endDate) {
    baseFilter.NgayDuyet = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Build pipeline
  const pipeline = [
    {
      $lookup: {
        from: "nhanviens",
        localField: "NhanVienID",
        foreignField: "_id",
        as: "nhanVien",
      },
    },
    { $unwind: "$nhanVien" },
  ];

  if (baseFilter.khoaFilter) {
    pipeline.push({
      $match: { "nhanVien.KhoaID": baseFilter.khoaFilter },
    });
  }

  const matchStage = {};
  if (baseFilter.ChuKyDanhGiaID)
    matchStage.ChuKyDanhGiaID = baseFilter.ChuKyDanhGiaID;
  if (baseFilter.NgayDuyet) matchStage.NgayDuyet = baseFilter.NgayDuyet;

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  // Search filter
  if (search) {
    pipeline.push({
      $match: {
        $or: [
          { "nhanVien.Ten": { $regex: search, $options: "i" } },
          { "nhanVien.MaNhanVien": { $regex: search, $options: "i" } },
          { "nhanVien.Email": { $regex: search, $options: "i" } },
        ],
      },
    });
  }

  // Lookups
  pipeline.push(
    {
      $lookup: {
        from: "khoas",
        localField: "nhanVien.KhoaID",
        foreignField: "_id",
        as: "khoa",
      },
    },
    { $unwind: { path: "$khoa", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "chukydanhgias",
        localField: "ChuKyDanhGiaID",
        foreignField: "_id",
        as: "chuKy",
      },
    },
    { $unwind: { path: "$chuKy", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "nhanviens",
        localField: "NguoiDanhGiaID",
        foreignField: "_id",
        as: "nguoiDuyet",
      },
    },
    { $unwind: { path: "$nguoiDuyet", preserveNullAndEmptyArrays: true } }
  );

  // Count total
  const countPipeline = [...pipeline, { $count: "total" }];
  const countResult = await DanhGiaKPI.aggregate(countPipeline);
  const total = countResult[0]?.total || 0;

  // Paginate
  pipeline.push(
    { $sort: { NgayDuyet: -1 } },
    { $skip: parseInt(page) * parseInt(limit) },
    { $limit: parseInt(limit) },
    {
      $project: {
        nhanVienId: "$NhanVienID",
        tenNhanVien: "$nhanVien.Ten",
        maNhanVien: "$nhanVien.MaNhanVien",
        khoaPhong: "$khoa.TenKhoa",
        email: "$nhanVien.Email",
        chuKyDanhGia: "$chuKy.TenChuKy",
        trangThai: "$TrangThai",
        diemKPI: { $round: ["$TongDiemKPI", 2] },
        ngayDuyet: "$NgayDuyet",
        nguoiDuyet: "$nguoiDuyet.Ten",
      },
    }
  );

  const danhSach = await DanhGiaKPI.aggregate(pipeline);

  const data = {
    danhSach,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };

  return sendResponse(
    res,
    200,
    true,
    { data },
    null,
    "Lấy danh sách chi tiết thành công"
  );
});

/**
 * @route GET /api/workmanagement/kpi/bao-cao/export-excel
 * @desc Xuất báo cáo Excel
 * @access Private
 * @query chuKyId, khoaId, startDate, endDate
 */
kpiController.exportBaoCaoExcel = catchAsync(async (req, res, next) => {
  const ExcelJS = require("exceljs");
  const { chuKyId, khoaId, startDate, endDate } = req.query;
  const currentUser = req.user;
  if (!currentUser) {
    return next(new AppError(401, "Login required", "Authentication Error"));
  }
  const role = currentUser.PhanQuyen;
  const userKhoaId = currentUser.KhoaID;
  const isAdmin =
    role === "admin" ||
    role === "superadmin" ||
    role === "supperadmin" ||
    role === 3 ||
    role === 4;

  // Get data (reuse getBaoCaoThongKe logic)
  let baseFilter = {};

  if (!isAdmin) {
    if (userKhoaId)
      baseFilter.khoaFilter = new mongoose.Types.ObjectId(userKhoaId);
  } else if (khoaId) {
    baseFilter.khoaFilter = new mongoose.Types.ObjectId(khoaId);
  }

  if (chuKyId) {
    baseFilter.ChuKyDanhGiaID = new mongoose.Types.ObjectId(chuKyId);
  }

  if (startDate && endDate) {
    baseFilter.NgayDuyet = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Get detailed data for export
  const pipeline = [
    {
      $lookup: {
        from: "nhanviens",
        localField: "NhanVienID",
        foreignField: "_id",
        as: "nhanVien",
      },
    },
    { $unwind: "$nhanVien" },
  ];

  if (baseFilter.khoaFilter) {
    pipeline.push({
      $match: { "nhanVien.KhoaID": baseFilter.khoaFilter },
    });
  }

  const matchStage = {};
  if (baseFilter.ChuKyDanhGiaID)
    matchStage.ChuKyDanhGiaID = baseFilter.ChuKyDanhGiaID;
  if (baseFilter.NgayDuyet) matchStage.NgayDuyet = baseFilter.NgayDuyet;

  if (Object.keys(matchStage).length > 0) {
    pipeline.push({ $match: matchStage });
  }

  pipeline.push(
    {
      $lookup: {
        from: "khoas",
        localField: "nhanVien.KhoaID",
        foreignField: "_id",
        as: "khoa",
      },
    },
    { $unwind: { path: "$khoa", preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: "chukydanhgias",
        localField: "ChuKyDanhGiaID",
        foreignField: "_id",
        as: "chuKy",
      },
    },
    { $unwind: { path: "$chuKy", preserveNullAndEmptyArrays: true } },
    { $sort: { "khoa.TenKhoa": 1, TongDiemKPI: -1 } },
    {
      $project: {
        stt: 1,
        maNhanVien: "$nhanVien.MaNhanVien",
        tenNhanVien: "$nhanVien.Ten",
        khoaPhong: "$khoa.TenKhoa",
        email: "$nhanVien.Email",
        chuKy: "$chuKy.TenChuKy",
        diemKPI: { $round: ["$TongDiemKPI", 2] },
        trangThai: {
          $cond: [
            { $eq: ["$TrangThai", "DA_DUYET"] },
            "Đã duyệt",
            "Chưa duyệt",
          ],
        },
        ngayDuyet: "$NgayDuyet",
      },
    }
  );

  const data = await DanhGiaKPI.aggregate(pipeline);

  // Create workbook
  const workbook = new ExcelJS.Workbook();

  // Sheet 1: Danh sách chi tiết
  const worksheet = workbook.addWorksheet("Danh sách KPI");

  // Header
  worksheet.columns = [
    { header: "STT", key: "stt", width: 10 },
    { header: "Mã NV", key: "maNhanVien", width: 15 },
    { header: "Họ và tên", key: "tenNhanVien", width: 25 },
    { header: "Khoa/Phòng", key: "khoaPhong", width: 20 },
    { header: "Email", key: "email", width: 30 },
    { header: "Chu kỳ", key: "chuKy", width: 20 },
    { header: "Điểm KPI", key: "diemKPI", width: 12 },
    { header: "Trạng thái", key: "trangThai", width: 15 },
    { header: "Ngày duyệt", key: "ngayDuyet", width: 15 },
  ];

  // Style header
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  worksheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
  };

  // Add data
  data.forEach((row, index) => {
    worksheet.addRow({
      stt: index + 1,
      maNhanVien: row.maNhanVien,
      tenNhanVien: row.tenNhanVien,
      khoaPhong: row.khoaPhong,
      email: row.email,
      chuKy: row.chuKy,
      diemKPI: row.diemKPI,
      trangThai: row.trangThai,
      ngayDuyet: row.ngayDuyet
        ? new Date(row.ngayDuyet).toLocaleDateString("vi-VN")
        : "",
    });
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: "A1",
    to: "I1",
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Set response headers
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=BaoCaoKPI_${Date.now()}.xlsx`
  );

  return res.send(buffer);
});

module.exports = kpiController;
