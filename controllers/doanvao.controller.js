const { sendResponse, AppError, catchAsync } = require("../helpers/utils");
const DoanVao = require("../models/DoanVao");

const doanVaoController = {};

// Tạo mới đoàn vào
doanVaoController.createDoanVao = catchAsync(async (req, res, next) => {
  const {
    NgayKyVanBan,
    SoVanBanChoPhep,
    MucDichXuatCanh,
    ThoiGianVaoLamViec,
    BaoCao,

    GhiChu,
    ThanhVien,
  } = req.body;

  const doanVao = await DoanVao.create({
    NgayKyVanBan,
    SoVanBanChoPhep,
    MucDichXuatCanh,
    ThoiGianVaoLamViec,
    BaoCao,

    GhiChu,
    ThanhVien,
  });

  sendResponse(
    res,
    200,
    true,
    doanVao,
    null,
    "Tạo thông tin đoàn vào thành công"
  );
});

// Lấy danh sách đoàn vào
doanVaoController.getDoanVaos = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search, fromDate, toDate } = req.query;
  const options = { page: parseInt(page), limit: parseInt(limit) };

  let filter = { isDeleted: false };

  // Tìm kiếm theo số văn bản
  if (search) {
    filter.$or = [
      { SoVanBanChoPhep: { $regex: search, $options: "i" } },
      { MucDichXuatCanh: { $regex: search, $options: "i" } },
      { "ThanhVien.Ten": { $regex: search, $options: "i" } },
    ];
  }

  // Lọc theo khoảng thời gian
  if (fromDate || toDate) {
    filter.NgayKyVanBan = {};
    if (fromDate) filter.NgayKyVanBan.$gte = new Date(fromDate);
    if (toDate) filter.NgayKyVanBan.$lte = new Date(toDate);
  }

  const doanVaos = await DoanVao.find(filter)
    .sort({ NgayKyVanBan: -1 })
    .limit(options.limit * 1)
    .skip((options.page - 1) * options.limit);

  const totalDocs = await DoanVao.countDocuments(filter);
  const totalPages = Math.ceil(totalDocs / options.limit);

  sendResponse(
    res,
    200,
    true,
    { doanVaos, totalPages, totalDocs },
    null,
    "Lấy danh sách đoàn vào thành công"
  );
});

// Lấy chi tiết đoàn vào
doanVaoController.getDoanVaoById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doanVao = await DoanVao.findById(id);
  if (!doanVao) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn vào",
      "Get DoanVao Error"
    );
  }

  sendResponse(
    res,
    200,
    true,
    doanVao,
    null,
    "Lấy chi tiết đoàn vào thành công"
  );
});

// Cập nhật đoàn vào
doanVaoController.updateDoanVao = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  const doanVao = await DoanVao.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!doanVao) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn vào",
      "Update DoanVao Error"
    );
  }

  sendResponse(res, 200, true, doanVao, null, "Cập nhật đoàn vào thành công");
});

// Xóa đoàn vào (soft delete)
doanVaoController.deleteDoanVao = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doanVao = await DoanVao.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  if (!doanVao) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn vào",
      "Delete DoanVao Error"
    );
  }

  sendResponse(res, 200, true, {}, null, "Xóa đoàn vào thành công");
});

// Thống kê đoàn vào theo tháng
doanVaoController.getDoanVaoStats = catchAsync(async (req, res, next) => {
  const { year = new Date().getFullYear() } = req.query;

  const stats = await DoanVao.aggregate([
    {
      $match: {
        isDeleted: false,
        NgayKyVanBan: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`),
        },
      },
    },
    {
      $group: {
        _id: { $month: "$NgayKyVanBan" },
        count: { $sum: 1 },
        thanhVienCount: { $sum: { $size: "$ThanhVien" } },
      },
    },
    {
      $sort: { _id: 1 },
    },
  ]);

  sendResponse(
    res,
    200,
    true,
    { stats },
    null,
    "Lấy thống kê đoàn vào thành công"
  );
});

module.exports = doanVaoController;
