const {
  DanhGiaKPI,
  DanhGiaNhiemVuThuongQuy,
  TieuChiDanhGia,
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

const kpiController = {};

/**
 * @route POST /api/workmanagement/kpi
 * @desc Tạo đánh giá KPI mới cho nhân viên
 * @access Private (Manager)
 */
kpiController.taoDanhGiaKPI = catchAsync(async (req, res, next) => {
  const { ChuKyID, NhanVienID } = req.body;
  const NguoiDanhGiaID = req.user.NhanVienID;

  // 1. Kiểm tra quyền chấm KPI
  const quanLy = await QuanLyNhanVien.findOne({
    NhanVienQuanLy: NguoiDanhGiaID,
    NhanVien: NhanVienID,
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

  // 1. Lấy đánh giá nhiệm vụ
  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.findOne({
    _id: nhiemVuId,
    isDeleted: false,
  }).populate("DanhGiaKPIID");

  if (!danhGiaNhiemVu) {
    throw new AppError(404, "Không tìm thấy đánh giá nhiệm vụ", "Not Found");
  }

  // 2. Kiểm tra quyền chấm điểm
  const danhGiaKPI = danhGiaNhiemVu.DanhGiaKPIID;
  const isOwner = danhGiaKPI.NguoiDanhGiaID.toString() === req.user.NhanVienID;
  const isAdmin = req.user.PhanQuyen === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      403,
      "Bạn không có quyền chấm điểm nhiệm vụ này",
      "Forbidden"
    );
  }

  // 3. Kiểm tra trạng thái
  if (danhGiaKPI.TrangThai !== "CHUA_DUYET") {
    throw new AppError(
      400,
      "Không thể chấm điểm sau khi đã duyệt",
      "Bad Request"
    );
  }

  // 4. Validate và chấm điểm
  await danhGiaNhiemVu.chamDiem(ChiTietDiem, MucDoKho, GhiChu);

  // 5. Tính lại tổng điểm KPI
  const tongDiemKPI = await danhGiaKPI.tinhTongDiemKPI();

  // 6. Populate trước khi trả về
  await danhGiaNhiemVu.populate([
    { path: "NhiemVuThuongQuyID", select: "TenNhiemVu MoTa" },
    { path: "ChiTietDiem.TieuChiID", select: "TenTieuChi LoaiTieuChi" },
  ]);

  return sendResponse(
    res,
    200,
    true,
    {
      danhGiaNhiemVu,
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

  // Kiểm tra quyền duyệt
  const isOwner =
    danhGiaKPI.NguoiDanhGiaID._id.toString() === req.user.NhanVienID;
  const isAdmin = req.user.PhanQuyen === "admin";

  if (!isOwner && !isAdmin) {
    throw new AppError(
      403,
      "Bạn không có quyền duyệt đánh giá KPI này",
      "Forbidden"
    );
  }

  // Kiểm tra đã chấm điểm hết chưa
  const danhGiaNhiemVu = await DanhGiaNhiemVuThuongQuy.find({
    DanhGiaKPIID: id,
    isDeleted: false,
  });

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

  // Duyệt
  await danhGiaKPI.duyet(NhanXetNguoiDanhGia);

  return sendResponse(
    res,
    200,
    true,
    { danhGiaKPI },
    null,
    "Duyệt đánh giá KPI thành công"
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

module.exports = kpiController;
