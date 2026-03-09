const { catchAsync, sendResponse, AppError } = require("../../helpers/utils");
const DatLichKhamService = require("../../models/his/datLichKham");
const dayjs = require("dayjs");

const datLichKhamController = {};

/**
 * Validate fromDate/toDate chung
 */
function validateDateRange(fromDate, toDate) {
  if (!fromDate || !toDate) {
    throw new AppError(400, "fromDate và toDate là bắt buộc", "MISSING_DATES");
  }
  const from = dayjs(fromDate);
  const to = dayjs(toDate);
  if (!from.isValid() || !to.isValid()) {
    throw new AppError(
      400,
      "Định dạng ngày không hợp lệ",
      "INVALID_DATE_FORMAT",
    );
  }
  if (to.isBefore(from)) {
    throw new AppError(
      400,
      "Ngày kết thúc phải sau ngày bắt đầu",
      "INVALID_DATE_RANGE",
    );
  }
  return { from, to };
}

/**
 * @route POST /api/his/datlichkham/tonghop
 * @desc Báo cáo tổng hợp theo người giới thiệu
 */
datLichKhamController.getBaoCaoTongHop = catchAsync(async (req, res, next) => {
  const { fromDate, toDate } = req.body;
  validateDateRange(fromDate, toDate);

  const data = await DatLichKhamService.getBaoCaoTongHop(fromDate, toDate);

  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy báo cáo tổng hợp thành công",
  );
});

/**
 * @route POST /api/his/datlichkham/chitiet
 * @desc Chi tiết từng lượt đặt lịch (không lịch sử khám)
 */
datLichKhamController.getChiTietDatLich = catchAsync(async (req, res, next) => {
  const { fromDate, toDate } = req.body;
  validateDateRange(fromDate, toDate);

  const data = await DatLichKhamService.getChiTietDatLich(fromDate, toDate);

  return sendResponse(
    res,
    200,
    true,
    data,
    null,
    "Lấy chi tiết đặt lịch thành công",
  );
});

/**
 * @route POST /api/his/datlichkham/chitiet-lichsu
 * @desc Chi tiết + lịch sử khám 1 năm gần nhất
 */
datLichKhamController.getChiTietVoiLichSu = catchAsync(
  async (req, res, next) => {
    const { fromDate, toDate } = req.body;
    validateDateRange(fromDate, toDate);

    const data = await DatLichKhamService.getChiTietVoiLichSu(fromDate, toDate);

    return sendResponse(
      res,
      200,
      true,
      data,
      null,
      "Lấy chi tiết + lịch sử thành công",
    );
  },
);

/**
 * @route POST /api/his/datlichkham/export
 * @desc Export toàn bộ chi tiết (không phân trang)
 */
datLichKhamController.exportChiTiet = catchAsync(async (req, res, next) => {
  const { fromDate, toDate } = req.body;
  validateDateRange(fromDate, toDate);

  const data = await DatLichKhamService.getChiTietVoiLichSu(fromDate, toDate);

  return sendResponse(res, 200, true, data, null, "Export dữ liệu thành công");
});

module.exports = datLichKhamController;
