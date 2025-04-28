const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const BCGiaoBan = require("../models/BCGiaoBan");

const bcgiaobanController = {};

bcgiaobanController.insertOne = catchAsync(async (req, res, next) => {
  //get data from request
  let { Ngay, TTHeNoi, TTHeNgoai, TrangThai } = req.body;

  //Business Logic Validation
  let bcgiaoban = await BCGiaoBan.findOne({ Ngay });
  console.log(bcgiaoban);
  if (bcgiaoban)
    throw new AppError(
      400,
      "BC Giao ban đã tồn tại ngaỳ này",
      "Insert BC giao ban error"
    );

  //Process

  bcgiaoban = await BCGiaoBan.create({ Ngay, TTHeNoi, TTHeNgoai, TrangThai });

  //Response
  sendResponse(res, 200, true, { bcgiaoban }, null, "Created User success");
});

//api get by fromdate and toDate
bcgiaobanController.getByNgay = catchAsync(async (req, res, next) => {
  // Get fromDate and toDate from query parameters
  const { fromDate, toDate } = req.query;
  console.log("fromdate", fromDate);
  console.log("todate", toDate);
  // Convert them to Date objects
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);

  // Business Logic: Find BCGiaoBan records between fromDate and toDate
  const bcgiaobans = await BCGiaoBan.find({
    Ngay: {
      $gte: fromDateObj,
      $lte: toDateObj,
    },
  });

  // Create a list of dates between fromDate and toDate
  const dateList = [];
  for (
    let d = new Date(fromDateObj);
    d <= toDateObj;
    d.setDate(d.getDate() + 1)
  ) {
    dateList.push(new Date(d));
  }

  // Create the final array of bcgiaobans with missing dates filled in
  const bcgiaobansWithDay = dateList.map((date) => {
    const existingRecord = bcgiaobans.find(
      (record) => record.Ngay.toDateString() === date.toDateString()
    );
    const dayOfWeek = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
    }).format(date);

    if (existingRecord) {
      return {
        _id: existingRecord._id,
        Ngay: existingRecord.Ngay,
        TrucLanhDao: existingRecord.TrucLanhDao,
        TTHeNoi: existingRecord.TTHeNoi,
        TTHeNgoai: existingRecord.TTHeNgoai,
        TrangThai: existingRecord.TrangThai,
        DienNuoc: existingRecord.DienNuoc || "",
        LaiXe: existingRecord.LaiXe || "",
        Thu: dayOfWeek,
      };
    } else {
      return {
        _id: 0,
        Ngay: date,
        TrucLanhDao: "",
        TTHeNoi: "",
        TTHeNgoai: "",
        TrangThai: false,
        DienNuoc: "",
        LaiXe: "",
        Thu: dayOfWeek,
      };
    }
  });

  // Send Response
  sendResponse(
    res,
    200,
    true,
    bcgiaobansWithDay,
    null,
    "Get BCGiaoBans records by fromDate and toDate success"
  );
});

bcgiaobanController.updateOrInsert = catchAsync(async (req, res, next) => {
  const records = req.body;
  console.log("body update insert", req.body);
  const updatedRecords = [];
  for (const record of records) {
    let updatedRecord;

    // Nếu _id = 0, thêm bản ghi mới
    if (record._id === 0) {
      updatedRecord = await BCGiaoBan.create({
        Ngay: record.Ngay,
        TrucLanhDao: record.TrucLanhDao,
        TTHeNoi: record.TTHeNoi,
        TTHeNgoai: record.TTHeNgoai,
        TrangThai: record.TrangThai,
        DienNuoc: record.DienNuoc || "",
        LaiXe: record.LaiXe || "",
      });
    }
    // Nếu _id khác 0, cập nhật bản ghi
    else {
      updatedRecord = await BCGiaoBan.findByIdAndUpdate(record._id, record, {
        new: true,
        runValidators: true,
      });
    }

    const dayOfWeek = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
    }).format(new Date(updatedRecord.Ngay));
    updatedRecords.push({
      ...updatedRecord._doc,
      Thu: dayOfWeek,
    });
  }

  sendResponse(
    res,
    200,
    true,
    updatedRecords,
    null,
    "Update or Insert BCGiaoBan records success"
  );
});

bcgiaobanController.updateOrInsertTrangThai = catchAsync(
  async (req, res, next) => {
    const { ngay, trangthai } = req.body;

    let updatedRecord;

    // Tìm bản ghi có Ngay = ngay
    const existingRecord = await BCGiaoBan.findOne({ Ngay: new Date(ngay) });

    // Nếu tồn tại, cập nhật TrangThai
    if (existingRecord) {
      updatedRecord = await BCGiaoBan.findByIdAndUpdate(
        existingRecord._id,
        { TrangThai: trangthai },
        {
          new: true,
          runValidators: true,
        }
      );
    } else {
      // Nếu không tồn tại, tạo bản ghi mới
      updatedRecord = await BCGiaoBan.create({
        Ngay: new Date(ngay),
        TrucLanhDao: "",
        TTHeNoi: "",
        TTHeNgoai: "",
        TrangThai: trangthai,
      });
    }

    // Lấy tên thứ trong tuần
    const dayOfWeek = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
    }).format(new Date(updatedRecord.Ngay));

    // Gửi phản hồi
    sendResponse(
      res,
      200,
      true,
      {
        ...updatedRecord._doc,
        Thu: dayOfWeek,
      },
      null,
      "Update or Insert TrangThai success"
    );
  }
);

module.exports = bcgiaobanController;
