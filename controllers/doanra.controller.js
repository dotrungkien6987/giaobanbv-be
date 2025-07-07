const { sendResponse, AppError, catchAsync } = require("../helpers/utils");
const DoanRa = require("../models/DoanRa");

const doanRaController = {};

// Tạo mới đoàn ra
doanRaController.createDoanRa = catchAsync(async (req, res, next) => {
  const {
    NgayKyVanBan,
    NhanVienID,
    SoVanBanChoPhep,
    MucDichXuatCanh,
    ThoiGianXuatCanh,
    NguonKinhPhi,
    QuocGiaDen,
    BaoCao,
    TaiLieuKemTheo,
    GhiChu,
  } = req.body;

  const doanRa = await DoanRa.create({
    NgayKyVanBan,
    NhanVienID,
    SoVanBanChoPhep,
    MucDichXuatCanh,
    ThoiGianXuatCanh,
    NguonKinhPhi,
    QuocGiaDen,
    BaoCao,
    TaiLieuKemTheo,
    GhiChu,
  });

  sendResponse(
    res,
    200,
    true,
    doanRa,
    null,
    "Tạo thông tin đoàn ra thành công"
  );
});

// Lấy danh sách đoàn ra
doanRaController.getDoanRas = catchAsync(async (req, res, next) => {
  const { page = 1, limit = 10, search, fromDate, toDate, quocGia } = req.query;
  const options = { page: parseInt(page), limit: parseInt(limit) };

  let filter = { isDeleted: false };

  // Tìm kiếm
  if (search) {
    filter.$or = [
      { SoVanBanChoPhep: { $regex: search, $options: "i" } },
      { MucDichXuatCanh: { $regex: search, $options: "i" } },
      { QuocGiaDen: { $regex: search, $options: "i" } },
    ];
  }

  // Lọc theo quốc gia
  if (quocGia) {
    filter.QuocGiaDen = { $regex: quocGia, $options: "i" };
  }

  // Lọc theo khoảng thời gian
  if (fromDate || toDate) {
    filter.NgayKyVanBan = {};
    if (fromDate) filter.NgayKyVanBan.$gte = new Date(fromDate);
    if (toDate) filter.NgayKyVanBan.$lte = new Date(toDate);
  }

  const doanRas = await DoanRa.find(filter)
    .populate("NhanVienID", "HoTen")
    .sort({ NgayKyVanBan: -1 })
    .limit(options.limit * 1)
    .skip((options.page - 1) * options.limit);

  const totalDocs = await DoanRa.countDocuments(filter);
  const totalPages = Math.ceil(totalDocs / options.limit);

  sendResponse(
    res,
    200,
    true,
    { doanRas, totalPages, totalDocs },
    null,
    "Lấy danh sách đoàn ra thành công"
  );
});

// Lấy tất cả đoàn ra không phân trang, không filter
doanRaController.getAllDoanRas = catchAsync(async (req, res, next) => {
  const doanRas = await DoanRa.find({ isDeleted: false })
    .populate("NhanVienID", "HoTen")
    .sort({ NgayKyVanBan: -1 });

  sendResponse(
    res,
    200,
    true,
    { doanRas, totalDocs: doanRas.length },
    null,
    "Lấy tất cả đoàn ra thành công"
  );
});

// Lấy chi tiết đoàn ra
doanRaController.getDoanRaById = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doanRa = await DoanRa.findById(id)
    .populate("NhanVienID", "HoTen KhoaID")
    .populate({
      path: "NhanVienID",
      populate: {
        path: "KhoaID",
        select: "TenKhoa",
      },
    });

  if (!doanRa) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn ra",
      "Get DoanRa Error"
    );
  }

  sendResponse(res, 200, true, doanRa, null, "Lấy chi tiết đoàn ra thành công");
});

// Cập nhật đoàn ra
doanRaController.updateDoanRa = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  const doanRa = await DoanRa.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  }).populate("NhanVienID", "HoTen");

  if (!doanRa) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn ra",
      "Update DoanRa Error"
    );
  }

  sendResponse(res, 200, true, doanRa, null, "Cập nhật đoàn ra thành công");
});

// Xóa đoàn ra (soft delete)
doanRaController.deleteDoanRa = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doanRa = await DoanRa.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true }
  );

  if (!doanRa) {
    throw new AppError(
      404,
      "Không tìm thấy thông tin đoàn ra",
      "Delete DoanRa Error"
    );
  }

  sendResponse(res, 200, true, {}, null, "Xóa đoàn ra thành công");
});

// Thống kê đoàn ra theo quốc gia
doanRaController.getDoanRaStatsByCountry = catchAsync(
  async (req, res, next) => {
    const { year = new Date().getFullYear() } = req.query;

    const stats = await DoanRa.aggregate([
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
          _id: "$QuocGiaDen",
          count: { $sum: 1 },
          latestTrip: { $max: "$NgayKyVanBan" },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    sendResponse(
      res,
      200,
      true,
      { stats },
      null,
      "Lấy thống kê đoàn ra theo quốc gia thành công"
    );
  }
);

// Thống kê đoàn ra theo tháng
doanRaController.getDoanRaStatsByMonth = catchAsync(async (req, res, next) => {
  const { year = new Date().getFullYear() } = req.query;

  const stats = await DoanRa.aggregate([
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
    "Lấy thống kê đoàn ra theo tháng thành công"
  );
});

module.exports = doanRaController;
