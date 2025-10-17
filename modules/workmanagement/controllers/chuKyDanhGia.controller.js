const { ChuKyDanhGia } = require("../models");
const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");

const chuKyDanhGiaController = {};

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia
 * @desc Lấy danh sách chu kỳ đánh giá (không bao gồm đã xóa)
 * @access Private
 */
chuKyDanhGiaController.layDanhSach = catchAsync(async (req, res, next) => {
  const { isDong, thang, nam, page = 1, limit = 20, search } = req.query;

  const query = { isDeleted: false };

  if (isDong !== undefined) {
    query.isDong = isDong === "true";
  }
  if (thang) query.Thang = parseInt(thang);
  if (nam) query.Nam = parseInt(nam);
  if (search) {
    query.TenChuKy = { $regex: search, $options: "i" };
  }

  const danhSach = await ChuKyDanhGia.find(query)
    .populate("NguoiTaoID", "HoTen MaNhanVien")
    .sort({ Nam: -1, Thang: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await ChuKyDanhGia.countDocuments(query);

  return sendResponse(
    res,
    200,
    true,
    {
      danhSach,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      count: total,
    },
    null,
    "Lấy danh sách chu kỳ đánh giá thành công"
  );
});

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/dang-mo
 * @desc Lấy chu kỳ đánh giá đang mở
 * @access Private
 */
chuKyDanhGiaController.layChuKyDangMo = catchAsync(async (req, res, next) => {
  const chuKy = await ChuKyDanhGia.layChuKyDangMo();

  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá đang mở");
  }

  return sendResponse(
    res,
    200,
    true,
    { chuKy },
    null,
    "Lấy chu kỳ đánh giá đang mở thành công"
  );
});

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/:id
 * @desc Lấy chi tiết chu kỳ đánh giá
 * @access Private
 */
chuKyDanhGiaController.layChiTiet = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const chuKy = await ChuKyDanhGia.findOne({
    _id: id,
    isDeleted: false,
  }).populate("NguoiTaoID", "HoTen MaNhanVien");

  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  return sendResponse(
    res,
    200,
    true,
    { chuKy },
    null,
    "Lấy chi tiết chu kỳ đánh giá thành công"
  );
});

/**
 * @route POST /api/workmanagement/chu-ky-danh-gia
 * @desc Tạo chu kỳ đánh giá mới
 * @access Private/Admin
 */
chuKyDanhGiaController.taoChuKy = catchAsync(async (req, res, next) => {
  const {
    TenChuKy,
    Thang,
    Nam,
    NgayBatDau,
    NgayKetThuc,
    MoTa,
    TieuChiCauHinh,
  } = req.body;

  // Validate required fields
  if (!Thang || !Nam || !NgayBatDau || !NgayKetThuc) {
    throw new AppError(
      400,
      "Vui lòng cung cấp đầy đủ thông tin: Tháng, Năm, Ngày bắt đầu, Ngày kết thúc"
    );
  }

  // Check duplicate Thang/Nam
  const existing = await ChuKyDanhGia.findOne({
    Thang: parseInt(Thang),
    Nam: parseInt(Nam),
    isDeleted: false,
  });

  if (existing) {
    throw new AppError(400, `Chu kỳ đánh giá tháng ${Thang}/${Nam} đã tồn tại`);
  }

  // Validate dates
  const batDau = new Date(NgayBatDau);
  const ketThuc = new Date(NgayKetThuc);

  if (batDau >= ketThuc) {
    throw new AppError(400, "Ngày kết thúc phải lớn hơn ngày bắt đầu");
  }

  const chuKyMoi = await ChuKyDanhGia.create({
    TenChuKy,
    Thang: parseInt(Thang),
    Nam: parseInt(Nam),
    NgayBatDau: batDau,
    NgayKetThuc: ketThuc,
    MoTa,
    TieuChiCauHinh: TieuChiCauHinh || [], // CRITICAL: Thêm tiêu chí cấu hình
    NguoiTaoID: req.userId,
    isDong: false,
  });

  const chuKy = await ChuKyDanhGia.findById(chuKyMoi._id).populate(
    "NguoiTaoID",
    "HoTen MaNhanVien"
  );

  return sendResponse(
    res,
    201,
    true,
    { chuKy },
    null,
    "Tạo chu kỳ đánh giá thành công"
  );
});

/**
 * @route PUT /api/workmanagement/chu-ky-danh-gia/:id
 * @desc Cập nhật chu kỳ đánh giá
 * @access Private/Admin
 */
chuKyDanhGiaController.capNhat = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    TenChuKy,
    Thang,
    Nam,
    NgayBatDau,
    NgayKetThuc,
    MoTa,
    TieuChiCauHinh,
  } = req.body;

  const chuKy = await ChuKyDanhGia.findOne({ _id: id, isDeleted: false });

  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  // Check duplicate if Thang/Nam changed
  if (Thang && Nam && (Thang != chuKy.Thang || Nam != chuKy.Nam)) {
    const existing = await ChuKyDanhGia.findOne({
      Thang: parseInt(Thang),
      Nam: parseInt(Nam),
      isDeleted: false,
      _id: { $ne: id },
    });

    if (existing) {
      throw new AppError(
        400,
        `Chu kỳ đánh giá tháng ${Thang}/${Nam} đã tồn tại`
      );
    }
  }

  // Validate dates if provided
  const batDau = NgayBatDau ? new Date(NgayBatDau) : chuKy.NgayBatDau;
  const ketThuc = NgayKetThuc ? new Date(NgayKetThuc) : chuKy.NgayKetThuc;

  if (batDau >= ketThuc) {
    throw new AppError(400, "Ngày kết thúc phải lớn hơn ngày bắt đầu");
  }

  // Update fields
  if (TenChuKy !== undefined) chuKy.TenChuKy = TenChuKy;
  if (Thang !== undefined) chuKy.Thang = parseInt(Thang);
  if (Nam !== undefined) chuKy.Nam = parseInt(Nam);
  if (NgayBatDau) chuKy.NgayBatDau = batDau;
  if (NgayKetThuc) chuKy.NgayKetThuc = ketThuc;
  if (MoTa !== undefined) chuKy.MoTa = MoTa;

  // CRITICAL: Update TieuChiCauHinh
  if (Array.isArray(TieuChiCauHinh)) {
    chuKy.TieuChiCauHinh = TieuChiCauHinh;
    chuKy.markModified("TieuChiCauHinh"); // Force Mongoose to detect changes
  }

  await chuKy.save();

  const updated = await ChuKyDanhGia.findById(id).populate(
    "NguoiTaoID",
    "HoTen MaNhanVien"
  );

  return sendResponse(
    res,
    200,
    true,
    { chuKy: updated },
    null,
    "Cập nhật chu kỳ đánh giá thành công"
  );
});

/**
 * @route PUT /api/workmanagement/chu-ky-danh-gia/:id/dong
 * @desc Đóng chu kỳ đánh giá
 * @access Private/Admin
 */
chuKyDanhGiaController.dongChuKy = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const chuKy = await ChuKyDanhGia.findOne({ _id: id, isDeleted: false });

  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  if (chuKy.isDong) {
    throw new AppError(400, "Chu kỳ đánh giá đã đóng");
  }

  chuKy.isDong = true;
  await chuKy.save();

  const updated = await ChuKyDanhGia.findById(id).populate(
    "NguoiTaoID",
    "HoTen MaNhanVien"
  );

  return sendResponse(
    res,
    200,
    true,
    { chuKy: updated },
    null,
    "Đóng chu kỳ đánh giá thành công"
  );
});

/**
 * @route PUT /api/workmanagement/chu-ky-danh-gia/:id/mo
 * @desc Mở lại chu kỳ đánh giá
 * @access Private/Admin
 */
chuKyDanhGiaController.moChuKy = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const chuKy = await ChuKyDanhGia.findOne({ _id: id, isDeleted: false });

  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  if (!chuKy.isDong) {
    throw new AppError(400, "Chu kỳ đánh giá đang mở");
  }

  // Check if there's already an open cycle
  const chuKyDangMo = await ChuKyDanhGia.findOne({
    isDong: false,
    isDeleted: false,
    _id: { $ne: id },
  });

  if (chuKyDangMo) {
    throw new AppError(
      400,
      `Đã có chu kỳ ${chuKyDangMo.TenChuKy} đang mở. Vui lòng đóng chu kỳ đó trước.`
    );
  }

  chuKy.isDong = false;
  await chuKy.save();

  const updated = await ChuKyDanhGia.findById(id).populate(
    "NguoiTaoID",
    "HoTen MaNhanVien"
  );

  return sendResponse(
    res,
    200,
    true,
    { chuKy: updated },
    null,
    "Mở lại chu kỳ đánh giá thành công"
  );
});

/**
 * @route DELETE /api/workmanagement/chu-ky-danh-gia/:id
 * @desc Xóa chu kỳ đánh giá (soft delete với validation cascade)
 * @access Private/Admin
 *
 * Business Rules:
 * 1. Không cho xóa chu kỳ đã hoàn thành (isDong = true) - giữ audit trail
 * 2. Kiểm tra có DanhGiaKPI liên quan không
 * 3. Nếu đang mở nhưng không có đánh giá → tự động đóng trước khi xóa
 */
chuKyDanhGiaController.xoa = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { DanhGiaKPI } = require("../models");

  const chuKy = await ChuKyDanhGia.findOne({ _id: id, isDeleted: false });

  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  // Quy tắc 1: Không cho xóa chu kỳ đã hoàn thành (giữ lịch sử audit)
  if (chuKy.isDong === true) {
    throw new AppError(
      400,
      "Không thể xóa chu kỳ đã hoàn thành. Chu kỳ này cần được lưu giữ để báo cáo và kiểm toán"
    );
  }

  // Quy tắc 2: Kiểm tra có bản đánh giá KPI nào không
  const soDanhGia = await DanhGiaKPI.countDocuments({
    ChuKyID: id,
    isDeleted: { $ne: true },
  });

  if (soDanhGia > 0) {
    throw new AppError(
      400,
      `Không thể xóa chu kỳ đánh giá vì đã có ${soDanhGia} bản đánh giá liên quan. Vui lòng xóa các đánh giá trước hoặc liên hệ quản trị viên`
    );
  }

  // Quy tắc 3: Nếu đang mở nhưng không có đánh giá → tự động đóng trước khi xóa
  if (chuKy.isDong === false) {
    chuKy.isDong = true;
    await chuKy.save();
  }

  // Soft delete - giữ dữ liệu trong database
  chuKy.isDeleted = true;
  await chuKy.save();

  return sendResponse(
    res,
    200,
    true,
    { chuKy },
    null,
    "Xóa chu kỳ đánh giá thành công"
  );
});

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/auto-select
 * @desc Tự động chọn chu kỳ phù hợp nhất dựa theo thời gian hiện tại
 * @access Private
 *
 * Logic (3-tier priority):
 * 1. Chu kỳ ACTIVE (today nằm trong khoảng TuNgay-DenNgay)
 * 2. Chu kỳ GẦN NHẤT: Vừa kết thúc hoặc sắp bắt đầu (trong vòng 5 ngày)
 * 3. Chu kỳ MỚI NHẤT (fallback nếu không có chu kỳ trong 5 ngày)
 *
 * Ưu tiên: Active > Gần nhất > Mới nhất
 * Sắp xếp: isDong ASC (chưa đóng trước), TuNgay DESC (gần nhất trước)
 */
chuKyDanhGiaController.autoSelect = catchAsync(async (req, res, next) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset to midnight for accurate comparison

  // Bước 1: Tìm chu kỳ ACTIVE (today nằm trong khoảng)
  let chuKy = await ChuKyDanhGia.findOne({
    isDeleted: false,
    TuNgay: { $lte: today },
    DenNgay: { $gte: today },
  })
    .sort({ isDong: 1, TuNgay: -1 })
    .populate("NguoiTaoID", "HoTen MaNhanVien");

  let selectionReason = "active"; // For debugging

  // Bước 2: Nếu không có active, tìm chu kỳ GẦN NHẤT (trong vòng 5 ngày)
  if (!chuKy) {
    const fiveDaysBefore = new Date(today);
    fiveDaysBefore.setDate(today.getDate() - 5);

    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(today.getDate() + 5);

    chuKy = await ChuKyDanhGia.findOne({
      isDeleted: false,
      $or: [
        // Chu kỳ vừa kết thúc (trong vòng 5 ngày)
        {
          DenNgay: { $gte: fiveDaysBefore, $lt: today },
        },
        // Chu kỳ sắp bắt đầu (trong vòng 5 ngày)
        {
          TuNgay: { $gt: today, $lte: fiveDaysLater },
        },
      ],
    })
      .sort({ isDong: 1, TuNgay: -1 })
      .populate("NguoiTaoID", "HoTen MaNhanVien");

    selectionReason = chuKy ? "nearby" : null;
  }

  // Bước 3: Fallback - Lấy chu kỳ MỚI NHẤT (bất kể khoảng cách)
  if (!chuKy) {
    chuKy = await ChuKyDanhGia.findOne({
      isDeleted: false,
    })
      .sort({ isDong: 1, TuNgay: -1 })
      .populate("NguoiTaoID", "HoTen MaNhanVien");

    selectionReason = chuKy ? "latest-fallback" : null;
  }

  // Bước 4: Nếu vẫn không có chu kỳ nào → Suggest tạo mới
  if (!chuKy) {
    return sendResponse(
      res,
      200,
      true,
      {
        chuKy: null,
        suggestion: {
          message:
            "Không tìm thấy chu kỳ đánh giá nào. Vui lòng tạo chu kỳ mới.",
          suggestedDates: {
            TuNgay: new Date(today.getFullYear(), today.getMonth(), 1), // Đầu tháng
            DenNgay: new Date(today.getFullYear(), today.getMonth() + 1, 0), // Cuối tháng
          },
        },
      },
      null,
      "Không tìm thấy chu kỳ đánh giá"
    );
  }

  // Bước 5: Trả về chu kỳ đã chọn với thông tin debug
  return sendResponse(
    res,
    200,
    true,
    {
      chuKy,
      info: {
        today: today.toISOString(),
        selectionReason,
        message: `Đã chọn chu kỳ: ${chuKy.TenChuKy}`,
      },
    },
    null,
    "Tự động chọn chu kỳ thành công"
  );
});

/**
 * @route GET /api/workmanagement/chu-ky-danh-gia/previous-criteria
 * @desc Lấy tiêu chí từ chu kỳ trước gần nhất để copy
 * @access Private/Admin
 */
chuKyDanhGiaController.getPreviousCriteria = catchAsync(
  async (req, res, next) => {
    // Tìm chu kỳ gần nhất có tiêu chí
    const previousChuKy = await ChuKyDanhGia.findOne({
      isDeleted: false,
      TieuChiCauHinh: { $exists: true, $ne: [] },
    })
      .sort({ NgayKetThuc: -1 })
      .select("TenChuKy TieuChiCauHinh")
      .lean();

    if (!previousChuKy) {
      return sendResponse(
        res,
        404,
        false,
        null,
        null,
        "Không tìm thấy chu kỳ trước có tiêu chí"
      );
    }

    return sendResponse(
      res,
      200,
      true,
      {
        chuKyName: previousChuKy.TenChuKy,
        tieuChi: previousChuKy.TieuChiCauHinh,
      },
      null,
      `Lấy tiêu chí từ "${previousChuKy.TenChuKy}" thành công`
    );
  }
);

module.exports = chuKyDanhGiaController;
