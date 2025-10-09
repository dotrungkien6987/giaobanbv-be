const { TieuChiDanhGia } = require("../models");
const {
  catchAsync,
  sendResponse,
  AppError,
} = require("../../../helpers/utils");

const tieuChiDanhGiaController = {};

tieuChiDanhGiaController.layDanhSach = catchAsync(async (req, res, next) => {
  const { loaiTieuChi, trangThaiHoatDong } = req.query;
  const query = { isDeleted: false };
  if (loaiTieuChi) query.LoaiTieuChi = loaiTieuChi;
  if (trangThaiHoatDong !== undefined) {
    query.TrangThaiHoatDong = trangThaiHoatDong === "true";
  }
  const tieuChis = await TieuChiDanhGia.find(query).sort({ TenTieuChi: 1 });
  return sendResponse(
    res,
    200,
    true,
    { tieuChis, count: tieuChis.length },
    null,
    "Lấy danh sách tiêu chí đánh giá thành công"
  );
});

tieuChiDanhGiaController.layChiTiet = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const tieuChi = await TieuChiDanhGia.findOne({ _id: id, isDeleted: false });
  if (!tieuChi) {
    throw new AppError(404, "Không tìm thấy tiêu chí đánh giá", "Not Found");
  }
  return sendResponse(
    res,
    200,
    true,
    { tieuChi },
    null,
    "Lấy chi tiết tiêu chí đánh giá thành công"
  );
});

tieuChiDanhGiaController.taoMoi = catchAsync(async (req, res, next) => {
  const {
    TenTieuChi,
    MoTa,
    LoaiTieuChi,
    GiaTriMin,
    GiaTriMax,
    TrongSoMacDinh,
  } = req.body;
  if (!TenTieuChi) {
    throw new AppError(400, "Tên tiêu chí là bắt buộc", "Bad Request");
  }
  if (GiaTriMin >= GiaTriMax) {
    throw new AppError(
      400,
      "Giá trị min phải nhỏ hơn giá trị max",
      "Bad Request"
    );
  }
  const tieuChi = await TieuChiDanhGia.create({
    TenTieuChi,
    MoTa,
    LoaiTieuChi,
    GiaTriMin,
    GiaTriMax,
    TrongSoMacDinh,
  });
  return sendResponse(
    res,
    201,
    true,
    { tieuChi },
    null,
    "Tạo tiêu chí đánh giá thành công"
  );
});

tieuChiDanhGiaController.capNhat = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const {
    TenTieuChi,
    MoTa,
    LoaiTieuChi,
    GiaTriMin,
    GiaTriMax,
    TrongSoMacDinh,
    TrangThaiHoatDong,
  } = req.body;
  const tieuChi = await TieuChiDanhGia.findOne({ _id: id, isDeleted: false });
  if (!tieuChi) {
    throw new AppError(404, "Không tìm thấy tiêu chí đánh giá", "Not Found");
  }
  if (GiaTriMin !== undefined && GiaTriMax !== undefined) {
    if (GiaTriMin >= GiaTriMax) {
      throw new AppError(
        400,
        "Giá trị min phải nhỏ hơn giá trị max",
        "Bad Request"
      );
    }
  }
  if (TenTieuChi !== undefined) tieuChi.TenTieuChi = TenTieuChi;
  if (MoTa !== undefined) tieuChi.MoTa = MoTa;
  if (LoaiTieuChi !== undefined) tieuChi.LoaiTieuChi = LoaiTieuChi;
  if (GiaTriMin !== undefined) tieuChi.GiaTriMin = GiaTriMin;
  if (GiaTriMax !== undefined) tieuChi.GiaTriMax = GiaTriMax;
  if (TrongSoMacDinh !== undefined) tieuChi.TrongSoMacDinh = TrongSoMacDinh;
  if (TrangThaiHoatDong !== undefined)
    tieuChi.TrangThaiHoatDong = TrangThaiHoatDong;
  await tieuChi.save();
  return sendResponse(
    res,
    200,
    true,
    { tieuChi },
    null,
    "Cập nhật tiêu chí đánh giá thành công"
  );
});

tieuChiDanhGiaController.xoa = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const tieuChi = await TieuChiDanhGia.findOne({ _id: id, isDeleted: false });
  if (!tieuChi) {
    throw new AppError(404, "Không tìm thấy tiêu chí đánh giá", "Not Found");
  }
  tieuChi.isDeleted = true;
  await tieuChi.save();
  return sendResponse(
    res,
    200,
    true,
    { tieuChiId: id },
    null,
    "Xóa tiêu chí đánh giá thành công"
  );
});

module.exports = tieuChiDanhGiaController;
