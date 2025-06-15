const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const BaoCaoNgay = require("../models/BaoCaoNgay");

const baocaongayController = {};

baocaongayController.insertOrUpdateOne_Rieng = catchAsync(
  async (req, res, next) => {
    //get data from request
    // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
    console.log("reqbody", req.body);
    let { Ngay, KhoaID, bcGiaoBanTheoNgay } = req.body;

    //Business Logic Validation
    let baocaongay = await BaoCaoNgay.findOne({
      Ngay,
      KhoaID,
      IsForKhoa: true,
    });
    console.log(baocaongay);
    if (baocaongay) {
      const id = baocaongay._id;
      baocaongay = await BaoCaoNgay.findByIdAndUpdate(id, bcGiaoBanTheoNgay, {
        new: true,
      });
    } else {
      baocaongay = await BaoCaoNgay.create(bcGiaoBanTheoNgay);
    }

    //Process

    // baocaongay = await BaoCaoNgay.create({Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo });

    //Response
    sendResponse(
      res,
      200,
      true,
      { baocaongay },
      null,
      "Cap nhat BaoCaoNgay success"
    );
  }
);

baocaongayController.insertOrUpdateOne = catchAsync(async (req, res, next) => {
  //get data from request
  // let { Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo } = req.body;
  console.log("reqbody", req.body);
  let { Ngay, KhoaID, bcGiaoBanTheoNgay } = req.body;

  //Business Logic Validation
  let baocaongay = await BaoCaoNgay.findOne({ 
    Ngay, 
    KhoaID,
    IsForKhoa: { $ne: true } // Tìm những bản ghi có IsForKhoa khác true (bao gồm cả false và null/undefined)
   });
  console.log(baocaongay);
  if (baocaongay) {
    const id = baocaongay._id;
    baocaongay = await BaoCaoNgay.findByIdAndUpdate(id, bcGiaoBanTheoNgay, {
      new: true,
    });
  } else {
    baocaongay = await BaoCaoNgay.create(bcGiaoBanTheoNgay);
  }

  //Process

  // baocaongay = await BaoCaoNgay.create({Ngay,KhoaID, BSTruc, DDTruc, GhiChu,CBThemGio,UserID,ChiTietBenhNhan,ChiTietChiSo });

  //Response
  sendResponse(
    res,
    200,
    true,
    { baocaongay },
    null,
    "Cap nhat BaoCaoNgay success"
  );
});

baocaongayController.getOneByNgayKhoaID = catchAsync(async (req, res, next) => {
  //get data from request
  console.log("reqbody", req.query);
  const NgayISO = req.query.Ngay;
  const KhoaID = req.query.KhoaID;
  const Ngay = new Date(NgayISO);
  console.log("ngay", Ngay);
  console.log("Koa", KhoaID);

  //Business Logic Validation
  // Thêm điều kiện IsForKhoa không bằng true
  let baocaongay = await BaoCaoNgay.findOne({
    KhoaID,
    Ngay,
    IsForKhoa: { $ne: true }, // Tìm những bản ghi có IsForKhoa khác true (bao gồm cả false và null/undefined)
  });

  console.log("baocaongay", baocaongay);

  if (!baocaongay) {
    baocaongay = {
      KhoaID: KhoaID,
      Ngay: Ngay,
      IsForKhoa: false, // Đặt giá trị mặc định là false cho bản ghi mới
      // Thêm các trường khác nếu cần
    };
    console.log("BCngay insert", baocaongay);
    sendResponse(
      res,
      200,
      true,
      { baocaongay },
      null,
      "Get BaoCaoNgay success, BaoCaoNgay chưa có trong DB"
    );
  } else {
    //Response
    sendResponse(
      res,
      200,
      true,
      { baocaongay },
      null,
      "Get BaoCaoNgay success, BaoCaoNgay đã có trong DB"
    );
  }
});

baocaongayController.getOneByNgayKhoaID_Rieng = catchAsync(
  async (req, res, next) => {
    //get data from request
    console.log("reqbody", req.query);
    const NgayISO = req.query.Ngay;
    const KhoaID = req.query.KhoaID;
    const Ngay = new Date(NgayISO);
    console.log("ngay", Ngay);
    console.log("Koa", KhoaID);

    //Business Logic Validation
    // Thêm điều kiện IsForKhoa không bằng true
    let baocaongay = await BaoCaoNgay.findOne({
      KhoaID,
      Ngay,
      IsForKhoa: true, // Tìm những bản ghi có IsForKhoa = true (riêng cho khoa đó)
    });

    console.log("baocaongay", baocaongay);

    if (!baocaongay) {
      baocaongay = {
        KhoaID: KhoaID,
        Ngay: Ngay,
        IsForKhoa: true, // Đặt giá trị mặc định là true cho bản ghi mới
        // Thêm các trường khác nếu cần
      };
      console.log("BCngay insert", baocaongay);
      sendResponse(
        res,
        200,
        true,
        { baocaongay },
        null,
        "Get BaoCaoNgay success, BaoCaoNgay chưa có trong DB"
      );
    } else {
      //Response
      sendResponse(
        res,
        200,
        true,
        { baocaongay },
        null,
        "Get BaoCaoNgay success, BaoCaoNgay đã có trong DB"
      );
    }
  }
);

baocaongayController.getAllByNgay = catchAsync(async (req, res, next) => {
  //get data from request
  console.log("reqbody", req.query);
  const NgayISO = req.query.Ngay;

  const Ngay = new Date(NgayISO);

  //Business Logic Validation
  // Thêm điều kiện IsForKhoa không bằng true, tương tự như hàm getOneByNgayKhoaID
  let baocaongays = await BaoCaoNgay.find({
    Ngay,
    IsForKhoa: { $ne: true }, // Tìm những bản ghi có IsForKhoa khác true (bao gồm cả false và null/undefined)
  }).populate("KhoaID");

  console.log("baocaongay", baocaongays);

  if (!baocaongays || baocaongays.length === 0) {
    baocaongays = [];
    sendResponse(
      res,
      200,
      true,
      { baocaongays },
      null,
      "Get BaoCaoNgay All success, Chưa có dữ liệu nào"
    );
  } else {
    //Response
    sendResponse(
      res,
      200,
      true,
      { baocaongays },
      null,
      "Get BaoCaoNgay All success,"
    );
  }
});

module.exports = baocaongayController;
