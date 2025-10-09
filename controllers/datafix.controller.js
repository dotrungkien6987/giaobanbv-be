const { body } = require("express-validator");
const { sendResponse, catchAsync, AppError } = require("../helpers/utils");
const DaTaFix = require("../models/DaTaFix");

const datafixController = {};

datafixController.getDataFix = catchAsync(async (req, res, next) => {
  let datafix = await DaTaFix.find();
  if (!datafix)
    throw new AppError(400, "Không có DataFix", "Get DataFix Error");

  // Thêm index vào từng item trong các mảng
  const addIndexToItems = (array) => {
    if (!Array.isArray(array)) return [];
    return array.map((item, index) => ({
      ...item,
      index: index + 1,
    }));
  };
  console.log("datafix1", datafix);
  // Chuyển đổi mỗi document thành plain object để có thể chỉnh sửa
  datafix = datafix.map((item) => item.toObject());
  console.log("datafix2", datafix);
  // Giả sử bạn muốn thêm index vào từng item trong một mảng của mỗi document
  // Ví dụ: Chỉnh sửa cho mỗi document trong itemes
  datafix = datafix.map((item) => {
    item.NhomHinhThucCapNhat = addIndexToItems(item.NhomHinhThucCapNhat);
    item.VaiTro = addIndexToItems(item.VaiTro);
    item.DonVi = addIndexToItems(item.DonVi);
    item.ChucDanh = addIndexToItems(item.ChucDanh);
    item.ChucVu = addIndexToItems(item.ChucVu);
    // New fields
    item.LoaiHinhYHTH = addIndexToItems(item.LoaiHinhYHTH);
    item.ChuyenDeTTT = addIndexToItems(item.ChuyenDeTTT);
    item.MucDichXuatCanh = addIndexToItems(item.MucDichXuatCanh);
    item.DonViGioiThieu = addIndexToItems(item.DonViGioiThieu);
    item.TrinhDoChuyenMon = addIndexToItems(item.TrinhDoChuyenMon);
    item.NguonKinhPhi = addIndexToItems(item.NguonKinhPhi);
    item.NoiDaoTao = addIndexToItems(item.NoiDaoTao);
    item.HinhThucDaoTao = addIndexToItems(item.HinhThucDaoTao);
    item.DanToc = addIndexToItems(item.DanToc);
    item.PhamViHanhNghe = addIndexToItems(item.PhamViHanhNghe);

    item.Tinh = addIndexToItems(item.Tinh);
    item.Huyen = addIndexToItems(item.Huyen);
    item.Xa = addIndexToItems(item.Xa);
    item.QuocGia = addIndexToItems(item.QuocGia);
    item.KhoaBinhQuanBenhAn = addIndexToItems(item.KhoaBinhQuanBenhAn);
    return item; // Trả về document sau khi đã chỉnh sửa
  });

  return sendResponse(res, 200, true, { datafix }, null, "Get DataFix Success");
});

datafixController.insertOrUpdateDataFix = catchAsync(async (req, res, next) => {
  let { datafix } = req.body;
  console.log("body", datafix);
  let datafixUpdate = await DaTaFix.findById(datafix._id);
  if (datafixUpdate) {
    const id = datafixUpdate._id;
    datafixUpdate = await DaTaFix.findByIdAndUpdate(id, datafix, { new: true });
  } else {
    datafixUpdate = await DaTaFix.create(datafix);
  }

  // Thêm index vào từng item trong các mảng
  const addIndexToItems = (array) => {
    if (!Array.isArray(array)) return [];
    return array.map((item, index) => ({
      ...item,
      index: index + 1,
    }));
  };

  datafixUpdate = datafixUpdate.toObject(); // Chuyển đổi document thành plain object để có thể chỉnh sửa

  datafixUpdate.NhomHinhThucCapNhat = addIndexToItems(
    datafixUpdate.NhomHinhThucCapNhat
  );
  datafixUpdate.VaiTro = addIndexToItems(datafixUpdate.VaiTro);
  datafixUpdate.DonVi = addIndexToItems(datafixUpdate.DonVi);
  datafixUpdate.ChucDanh = addIndexToItems(datafixUpdate.ChucDanh);
  datafixUpdate.ChucVu = addIndexToItems(datafixUpdate.ChucVu);
  // New fields
  datafixUpdate.LoaiHinhYHTH = addIndexToItems(datafixUpdate.LoaiHinhYHTH);
  datafixUpdate.ChuyenDeTTT = addIndexToItems(datafixUpdate.ChuyenDeTTT);
  datafixUpdate.MucDichXuatCanh = addIndexToItems(
    datafixUpdate.MucDichXuatCanh
  );
  datafixUpdate.DonViGioiThieu = addIndexToItems(datafixUpdate.DonViGioiThieu);
  datafixUpdate.TrinhDoChuyenMon = addIndexToItems(
    datafixUpdate.TrinhDoChuyenMon
  );
  datafixUpdate.NguonKinhPhi = addIndexToItems(datafixUpdate.NguonKinhPhi);
  datafixUpdate.NoiDaoTao = addIndexToItems(datafixUpdate.NoiDaoTao);
  datafixUpdate.HinhThucDaoTao = addIndexToItems(datafixUpdate.HinhThucDaoTao);
  datafixUpdate.DanToc = addIndexToItems(datafixUpdate.DanToc);
  datafixUpdate.PhamViHanhNghe = addIndexToItems(datafixUpdate.PhamViHanhNghe);

  datafixUpdate.Tinh = addIndexToItems(datafixUpdate.Tinh);
  datafixUpdate.Huyen = addIndexToItems(datafixUpdate.Huyen);
  datafixUpdate.Xa = addIndexToItems(datafixUpdate.Xa);
  datafixUpdate.QuocGia = addIndexToItems(datafixUpdate.QuocGia);
  datafixUpdate.KhoaBinhQuanBenhAn = addIndexToItems(
    datafixUpdate.KhoaBinhQuanBenhAn
  );
  console.log("datafixUpdate", datafixUpdate);
  //response
  sendResponse(
    res,
    200,
    true,
    { datafixUpdate },
    null,
    "Cập nhật datafix thành công"
  );
});
module.exports = datafixController;
