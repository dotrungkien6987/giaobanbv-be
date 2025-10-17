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
  const { ChuKyID, NhanVienID } = req.body;
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
  const chuKy = await ChuKyDanhGia.findById(ChuKyID);
  if (!chuKy) {
    throw new AppError(404, "Chu kỳ đánh giá không tồn tại", "Not Found");
  }

  // 3. Kiểm tra đã tồn tại đánh giá chưa
  const existing = await DanhGiaKPI.findOne({
    ChuKyID,
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

  // 4. Lấy danh sách nhiệm vụ thường quy của nhân viên
  const danhSachNhiemVu = await NhanVienNhiemVu.find({
    NhanVienID,
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
    ChuKyID,
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
        MucDoKho: nv.NhiemVuThuongQuyID.MucDoKho || 5,
        ChiTietDiem: [],
        SoCongViecLienQuan: soCongViec,
      });
    })
  );

  // 7. Populate trước khi trả về
  await danhGiaKPI.populate([
    { path: "ChuKyID", select: "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy" },
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

  if (ChuKyDanhGiaID) query.ChuKyID = ChuKyDanhGiaID;
  if (NhanVienID) query.NhanVienID = NhanVienID;
  if (TrangThai) query.TrangThai = TrangThai;

  // Lấy danh sách
  const danhGiaKPIs = await DanhGiaKPI.find(query)
    .populate([
      { path: "ChuKyID", select: "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy" },
      { path: "NhanVienID", select: "HoTen MaNhanVien" },
      { path: "NguoiDanhGiaID", select: "HoTen UserName" },
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
    { path: "ChuKyID", select: "TenChuKy NgayBatDau NgayKetThuc LoaiChuKy" },
    { path: "NhanVienID", select: "HoTen MaNhanVien" },
    { path: "NguoiDanhGiaID", select: "HoTen UserName" },
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
  const danhGiaNhiemVu =
    await DanhGiaNhiemVuThuongQuy.layDanhSachTheoDanhGiaKPI(id);

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
    ChuKyID: chuKyId,
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
    { path: "ChuKyID", select: "TenChuKy NgayBatDau NgayKetThuc" },
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

  // ✅ FIX: Calculate scores for all tasks before approving
  for (const nv of danhGiaNhiemVu) {
    // Calculate TongDiemTieuChi (sum of TANG_DIEM - GIAM_DIEM)
    let tongDiemTieuChi = 0;
    for (const tc of nv.ChiTietDiem || []) {
      const diemDat = tc.DiemDat || 0;
      if (tc.LoaiTieuChi === "TANG_DIEM") {
        tongDiemTieuChi += diemDat;
      } else if (tc.LoaiTieuChi === "GIAM_DIEM") {
        tongDiemTieuChi -= diemDat;
      }
    }

    // Calculate DiemNhiemVu = (MucDoKho × TongDiemTieuChi) / 100
    const mucDoKho = nv.MucDoKho || 1;
    const diemNhiemVu = (mucDoKho * tongDiemTieuChi) / 100;

    // Update scores
    nv.TongDiemTieuChi = tongDiemTieuChi;
    nv.DiemNhiemVu = diemNhiemVu;
    await nv.save();
  }

  // Calculate total KPI score (sum of all DiemNhiemVu)
  await danhGiaKPI.tinhTongDiemKPI();

  // Duyệt (update status and NgayDuyet)
  await danhGiaKPI.duyet(NhanXetNguoiDanhGia);

  // ✅ FIX: Refresh danhGiaKPI to get updated TongDiemKPI
  const updatedDanhGiaKPI = await DanhGiaKPI.findById(id).populate([
    { path: "ChuKyID", select: "TenChuKy NgayBatDau NgayKetThuc" },
    { path: "NhanVienID", select: "HoTen MaNhanVien" },
    { path: "NguoiDanhGiaID", select: "HoTen" },
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
    ChuKyID: chuKyId,
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
    ChuKyID: chuKyId,
    NhanVienID: { $in: nhanVienIds },
    isDeleted: { $ne: true },
  })
    .populate("NhanVienID", "Ten MaNhanVien")
    .populate("NguoiDanhGiaID", "Ten");

  // 3. Tính progress cho từng đánh giá KPI
  const danhGiaKPIMap = {};
  for (const dg of danhGiaKPIs) {
    // Lấy số nhiệm vụ đã chấm
    const nhiemVuList = await DanhGiaNhiemVuThuongQuy.find({
      DanhGiaKPIID: dg._id,
      isDeleted: { $ne: true },
    });

    const totalTasks = nhiemVuList.length;
    const scoredTasks = nhiemVuList.filter(
      (nv) => nv.TongDiemTieuChi > 0
    ).length;
    const percentage = totalTasks > 0 ? (scoredTasks / totalTasks) * 100 : 0;

    danhGiaKPIMap[dg.NhanVienID._id.toString()] = {
      danhGiaKPI: dg,
      progress: {
        scored: scoredTasks,
        total: totalTasks,
        percentage: Math.round(percentage),
      },
    };
  }

  // 4. Kết hợp dữ liệu
  const nhanVienList = quanHeQuanLy.map((qh) => {
    const nhanVienId = qh.NhanVienDuocQuanLy._id.toString();
    const kpiData = danhGiaKPIMap[nhanVienId];

    return {
      nhanVien: qh.NhanVienDuocQuanLy,
      danhGiaKPI: kpiData?.danhGiaKPI || null,
      progress: kpiData?.progress || { scored: 0, total: 0, percentage: 0 },
    };
  });

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
 * @route GET /api/workmanagement/kpi/cham-diem
 * @desc Lấy hoặc tạo đánh giá KPI cho nhân viên (V2 - Simplified)
 * @access Private (Manager)
 * @query chuKyId, nhanVienId
 */
kpiController.getChamDiemDetail = catchAsync(async (req, res, next) => {
  const { chuKyId, nhanVienId } = req.query;
  const currentNhanVienID = req.currentNhanVienID;

  // 1. Validate params (trust middleware for permission)
  if (!chuKyId || !nhanVienId) {
    throw new AppError(400, "Thiếu thông tin chu kỳ hoặc nhân viên");
  }

  // 2. Upsert DanhGiaKPI
  const danhGiaKPI = await DanhGiaKPI.findOneAndUpdate(
    {
      ChuKyID: chuKyId,
      NhanVienID: nhanVienId,
      isDeleted: { $ne: true },
    },
    {
      $setOnInsert: {
        ChuKyID: chuKyId,
        NhanVienID: nhanVienId,
        NguoiDanhGiaID: currentNhanVienID,
        TrangThai: "CHUA_DUYET",
        TongDiemKPI: 0,
      },
    },
    { upsert: true, new: true }
  );

  // 3. Load active assignments
  const raw = await NhanVienNhiemVu.find({
    NhanVienID: nhanVienId,
    isDeleted: { $ne: true },
  })
    .populate({
      path: "NhiemVuThuongQuyID",
      select: "TenNhiemVu MoTa MucDoKho",
    })
    .lean();

  const assignments = raw.filter(
    (nv) =>
      nv?.TrangThaiHoatDong !== false &&
      nv?.NhiemVuThuongQuyID &&
      nv.NhiemVuThuongQuyID.isDeleted !== true &&
      nv.NhiemVuThuongQuyID.TrangThaiHoatDong !== false
  );

  // 4. Get tiêu chí từ ChuKy configuration (NOT from TieuChiDanhGia)
  const chuKy = await ChuKyDanhGia.findById(chuKyId).lean();
  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  const tieuChiList = (chuKy.TieuChiCauHinh || []).sort(
    (a, b) => (a.ThuTu || 0) - (b.ThuTu || 0)
  );

  if (!tieuChiList.length) {
    throw new AppError(
      400,
      "Chu kỳ này chưa cấu hình tiêu chí đánh giá. Vui lòng liên hệ quản trị viên."
    );
  }

  // 5. Differential sync (preserve existing scores)
  const existingTasks = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: danhGiaKPI._id,
    isDeleted: { $ne: true },
  }).lean();

  const existingMap = new Map(
    existingTasks.map((t) => [t.NhiemVuThuongQuyID.toString(), t])
  );
  const assignmentIds = new Set(
    assignments.map((a) => a.NhiemVuThuongQuyID._id.toString())
  );

  // 5.1 Remove tasks no longer assigned
  const toRemove = existingTasks.filter(
    (t) => !assignmentIds.has(t.NhiemVuThuongQuyID.toString())
  );
  if (toRemove.length) {
    await DanhGiaNhiemVuThuongQuy.deleteMany({
      _id: { $in: toRemove.map((t) => t._id) },
    });
  }

  // 5.2 Add newly assigned tasks
  const toAdd = assignments.filter(
    (a) => !existingMap.has(a.NhiemVuThuongQuyID._id.toString())
  );
  if (toAdd.length) {
    const payloads = toAdd.map((nvItem) => ({
      DanhGiaKPIID: danhGiaKPI._id,
      NhiemVuThuongQuyID: nvItem.NhiemVuThuongQuyID._id,
      NhanVienID: nhanVienId,
      MucDoKho: nvItem.NhiemVuThuongQuyID.MucDoKho || 5,
      // Copy criteria from ChuKy configuration (self-contained, no TieuChiID, no TrongSo)
      ChiTietDiem: tieuChiList.map((tc) => ({
        TenTieuChi: tc.TenTieuChi,
        LoaiTieuChi: tc.LoaiTieuChi,
        DiemDat: 0,
        GiaTriMin: tc.GiaTriMin || 0,
        GiaTriMax: tc.GiaTriMax || 100,
        DonVi: tc.DonVi || "%",
        ThuTu: tc.ThuTu || 0,
        GhiChu: "",
      })),
      TongDiemTieuChi: 0,
      DiemNhiemVu: 0,
    }));
    await DanhGiaNhiemVuThuongQuy.insertMany(payloads);
  }

  // 5.3 Update MucDoKho if changed (preserve ChiTietDiem & scores)
  await Promise.all(
    assignments.map(async (a) => {
      const exist = existingMap.get(a.NhiemVuThuongQuyID._id.toString());
      if (exist && exist.MucDoKho !== a.NhiemVuThuongQuyID.MucDoKho) {
        await DanhGiaNhiemVuThuongQuy.updateOne(
          { _id: exist._id },
          { $set: { MucDoKho: a.NhiemVuThuongQuyID.MucDoKho } }
        );
      }
    })
  );

  // 6. Populate and return
  const result = await DanhGiaKPI.findById(danhGiaKPI._id)
    .populate("ChuKyID", "TenChuKy TuNgay DenNgay")
    .populate("NhanVienID", "Ten MaNhanVien")
    .populate("NguoiDanhGiaID", "Ten");

  const nhiemVuList = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: danhGiaKPI._id,
    isDeleted: { $ne: true },
  }).populate("NhiemVuThuongQuyID", "TenNhiemVu MoTa MucDoKho");

  // 7. Detect criteria changes (compare existing ChiTietDiem with ChuKy.TieuChiCauHinh)
  let syncWarning = null;
  if (nhiemVuList.length > 0 && nhiemVuList[0].ChiTietDiem) {
    const detection = detectCriteriaChanges(
      nhiemVuList[0].ChiTietDiem || [],
      chuKy.TieuChiCauHinh || []
    );

    if (detection.hasChanges) {
      syncWarning = {
        hasChanges: true,
        added: detection.changes.added,
        removed: detection.changes.removed,
        modified: detection.changes.modified,
        canReset: result.TrangThai !== "DA_DUYET", // Only allow reset if not approved
      };
    }
  }

  return sendResponse(
    res,
    200,
    true,
    {
      danhGiaKPI: result,
      nhiemVuList,
      syncWarning, // ← New field with criteria change detection
    },
    null,
    "Lấy thông tin chấm điểm KPI thành công"
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
  const chuKy = await ChuKyDanhGia.findById(danhGiaKPI.ChuKyID).lean();
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
      chuKyId: danhGiaKPI.ChuKyID, // ✅ FIX: Return for frontend refresh
      nhanVienId: danhGiaKPI.NhanVienID, // ✅ FIX: Return for frontend refresh
      syncedCount: nhiemVuList.length,
    },
    null,
    `Đã đồng bộ tiêu chí cho ${nhiemVuList.length} nhiệm vụ. Điểm đã chấm được giữ nguyên.`
  );
});

module.exports = kpiController;
