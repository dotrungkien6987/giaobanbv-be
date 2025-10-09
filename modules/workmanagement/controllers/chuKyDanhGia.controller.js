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
  const { TenChuKy, Thang, Nam, NgayBatDau, NgayKetThuc, MoTa } = req.body;

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
    throw new AppError(
      400,
      `Chu kỳ đánh giá tháng ${Thang}/${Nam} đã tồn tại`
    );
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
  const { TenChuKy, Thang, Nam, NgayBatDau, NgayKetThuc, MoTa } = req.body;

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
 * @desc Xóa chu kỳ đánh giá (soft delete)
 * @access Private/Admin
 */
chuKyDanhGiaController.xoa = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const chuKy = await ChuKyDanhGia.findOne({ _id: id, isDeleted: false });

  if (!chuKy) {
    throw new AppError(404, "Không tìm thấy chu kỳ đánh giá");
  }

  // Không cho phép xóa chu kỳ đang mở
  if (!chuKy.isDong) {
    throw new AppError(400, "Không thể xóa chu kỳ đánh giá đang mở");
  }

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

module.exports = chuKyDanhGiaController;
