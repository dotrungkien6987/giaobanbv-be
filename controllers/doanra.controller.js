const { sendResponse, AppError, catchAsync } = require("../helpers/utils");
const DoanRa = require("../models/DoanRa");

const doanRaController = {};

// Tạo mới đoàn ra
doanRaController.createDoanRa = catchAsync(async (req, res, next) => {
  const doanRa = await DoanRa.create(req.body);
  sendResponse(
    res,
    200,
    true,
    doanRa,
    null,
    "Tạo thông tin đoàn ra thành công"
  );
});

// Lấy tất cả đoàn ra (không phân trang, không filter)
doanRaController.getAllDoanRas = catchAsync(async (req, res, next) => {
  const doanRas = await DoanRa.find({ isDeleted: false })
    
    .sort({ NgayKyVanBan: -1 });
  sendResponse(res, 200, true, doanRas, null, "Lấy tất cả đoàn ra thành công");
});

// Lấy chi tiết đoàn ra
doanRaController.getDoanRaById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const doanRa = await DoanRa.findById(id).populate("NhanVienID", "HoTen");
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
  const doanRa = await DoanRa.findByIdAndUpdate(id, req.body, {
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

// (Bỏ các hàm thống kê)

module.exports = doanRaController;
