const KhuyenCaoKhoaBQBA = require("../models/KhuyenCaoKhoaBQBA");
const { sendResponse, AppError, catchAsync } = require("../helpers/utils");

const khuyenCaoKhoaBQBAController = {};

/**
 * @route GET /api/khuyen-cao-khoa-bqba?nam=2025
 * @description Lấy danh sách khuyến cáo theo năm
 * @access Private (Admin, Manager)
 */
khuyenCaoKhoaBQBAController.getAll = catchAsync(async (req, res, next) => {
  const { nam } = req.query;
  const currentYear = new Date().getFullYear();
  const year = nam ? parseInt(nam) : currentYear;

  const filter = { isDeleted: false, Nam: year };

  const khuyenCaoList = await KhuyenCaoKhoaBQBA.find(filter).sort({
    KhoaID: 1,
    LoaiKhoa: 1,
  });

  return sendResponse(
    res,
    200,
    true,
    { khuyenCaoList, count: khuyenCaoList.length, nam: year },
    null,
    `Lấy danh sách khuyến cáo năm ${year} thành công`
  );
});

/**
 * @route GET /api/khuyen-cao-khoa-bqba/by-khoa/:khoaId/:loaiKhoa?nam=2025
 * @description Lấy khuyến cáo của 1 khoa cụ thể theo năm
 * @access Private
 */
khuyenCaoKhoaBQBAController.getByKhoa = catchAsync(async (req, res, next) => {
  const { khoaId, loaiKhoa } = req.params;
  const { nam } = req.query;
  const currentYear = new Date().getFullYear();
  const year = nam ? parseInt(nam) : currentYear;

  const khuyenCao = await KhuyenCaoKhoaBQBA.findOne({
    KhoaID: parseInt(khoaId),
    LoaiKhoa: loaiKhoa,
    Nam: year,
    isDeleted: false,
  });

  if (!khuyenCao) {
    return sendResponse(
      res,
      200,
      true,
      { khuyenCao: null },
      null,
      `Không tìm thấy khuyến cáo cho khoa này năm ${year}`
    );
  }

  return sendResponse(
    res,
    200,
    true,
    { khuyenCao },
    null,
    "Lấy khuyến cáo thành công"
  );
});

/**
 * @route POST /api/khuyen-cao-khoa-bqba
 * @description Tạo mới khuyến cáo
 * @access Private (Admin, Manager)
 */
khuyenCaoKhoaBQBAController.create = catchAsync(async (req, res, next) => {
  const {
    KhoaID,
    TenKhoa,
    LoaiKhoa,
    Nam,
    KhuyenCaoBinhQuanHSBA,
    KhuyenCaoTyLeThuocVatTu,
    GhiChu,
  } = req.body;

  // Validate
  if (!KhoaID || !TenKhoa || !LoaiKhoa) {
    throw new AppError(400, "Thiếu thông tin khoa", "Bad Request");
  }

  if (!["noitru", "ngoaitru"].includes(LoaiKhoa)) {
    throw new AppError(
      400,
      "LoaiKhoa phải là 'noitru' hoặc 'ngoaitru'",
      "Bad Request"
    );
  }

  const year = Nam || new Date().getFullYear();

  // Kiểm tra duplicate
  const existing = await KhuyenCaoKhoaBQBA.findOne({
    KhoaID,
    LoaiKhoa,
    Nam: year,
    isDeleted: false,
  });

  if (existing) {
    throw new AppError(
      400,
      `Khuyến cáo cho khoa này (${TenKhoa} - ${LoaiKhoa}) năm ${year} đã tồn tại`,
      "Duplicate"
    );
  }

  // Tạo mới
  const khuyenCao = await KhuyenCaoKhoaBQBA.create({
    KhoaID,
    TenKhoa,
    LoaiKhoa,
    Nam: year,
    KhuyenCaoBinhQuanHSBA: KhuyenCaoBinhQuanHSBA || 0,
    KhuyenCaoTyLeThuocVatTu: KhuyenCaoTyLeThuocVatTu || 0,
    GhiChu: GhiChu || "",
  });

  return sendResponse(
    res,
    200,
    true,
    { khuyenCao },
    null,
    "Tạo khuyến cáo thành công"
  );
});

/**
 * @route PUT /api/khuyen-cao-khoa-bqba/:id
 * @description Cập nhật khuyến cáo
 * @access Private (Admin, Manager)
 */
khuyenCaoKhoaBQBAController.update = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { KhuyenCaoBinhQuanHSBA, KhuyenCaoTyLeThuocVatTu, GhiChu } = req.body;

  const khuyenCao = await KhuyenCaoKhoaBQBA.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!khuyenCao) {
    throw new AppError(404, "Không tìm thấy khuyến cáo", "Not Found");
  }

  // Update
  if (KhuyenCaoBinhQuanHSBA !== undefined) {
    khuyenCao.KhuyenCaoBinhQuanHSBA = KhuyenCaoBinhQuanHSBA;
  }
  if (KhuyenCaoTyLeThuocVatTu !== undefined) {
    khuyenCao.KhuyenCaoTyLeThuocVatTu = KhuyenCaoTyLeThuocVatTu;
  }
  if (GhiChu !== undefined) {
    khuyenCao.GhiChu = GhiChu;
  }

  await khuyenCao.save();

  return sendResponse(
    res,
    200,
    true,
    { khuyenCao },
    null,
    "Cập nhật khuyến cáo thành công"
  );
});

/**
 * @route DELETE /api/khuyen-cao-khoa-bqba/:id
 * @description Xóa mềm khuyến cáo
 * @access Private (Admin)
 */
khuyenCaoKhoaBQBAController.delete = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const khuyenCao = await KhuyenCaoKhoaBQBA.findOne({
    _id: id,
    isDeleted: false,
  });

  if (!khuyenCao) {
    throw new AppError(404, "Không tìm thấy khuyến cáo", "Not Found");
  }

  // Soft delete
  khuyenCao.isDeleted = true;
  await khuyenCao.save();

  return sendResponse(
    res,
    200,
    true,
    { khuyenCao },
    null,
    "Xóa khuyến cáo thành công"
  );
});

/**
 * @route POST /api/khuyen-cao-khoa-bqba/bulk-create
 * @description Tạo nhiều khuyến cáo cùng lúc (copy từ năm trước)
 * @access Private (Admin)
 */
khuyenCaoKhoaBQBAController.bulkCreate = catchAsync(async (req, res, next) => {
  const { namGoc, namMoi } = req.body;

  if (!namGoc || !namMoi) {
    throw new AppError(
      400,
      "Thiếu thông tin năm gốc và năm mới",
      "Bad Request"
    );
  }

  // Lấy tất cả khuyến cáo của năm gốc
  const khuyenCaoGoc = await KhuyenCaoKhoaBQBA.find({
    Nam: parseInt(namGoc),
    isDeleted: false,
  });

  if (khuyenCaoGoc.length === 0) {
    throw new AppError(
      404,
      `Không có khuyến cáo nào của năm ${namGoc}`,
      "Not Found"
    );
  }

  // Tạo mảng khuyến cáo mới
  const khuyenCaoMoi = khuyenCaoGoc.map((item) => ({
    KhoaID: item.KhoaID,
    TenKhoa: item.TenKhoa,
    LoaiKhoa: item.LoaiKhoa,
    Nam: parseInt(namMoi),
    KhuyenCaoBinhQuanHSBA: item.KhuyenCaoBinhQuanHSBA,
    KhuyenCaoTyLeThuocVatTu: item.KhuyenCaoTyLeThuocVatTu,
    GhiChu: `Copy từ năm ${namGoc}`,
  }));

  // Insert nhiều (bỏ qua duplicate)
  const result = await KhuyenCaoKhoaBQBA.insertMany(khuyenCaoMoi, {
    ordered: false,
  }).catch((error) => {
    // Bỏ qua lỗi duplicate key
    if (error.code === 11000) {
      return { insertedCount: error.result.nInserted };
    }
    throw error;
  });

  return sendResponse(
    res,
    200,
    true,
    { count: result.length || result.insertedCount },
    null,
    `Đã copy ${
      result.length || result.insertedCount
    } khuyến cáo từ năm ${namGoc} sang năm ${namMoi}`
  );
});

module.exports = khuyenCaoKhoaBQBAController;
