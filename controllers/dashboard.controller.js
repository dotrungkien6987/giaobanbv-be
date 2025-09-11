const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const DashBoard = require("../models/DashBoard");
const LopDaoTao = require("../models/LopDaoTao");
const HinhThucCapNhat = require("../models/HinhThucCapNhat");

const dashboardController = {};
const moment = require("moment-timezone");
// dashboardController.getOneNewestByNgay = catchAsync(async (req, res, next) => {
//     // Lấy dữ liệu từ request
//     console.log("reqbody", req.query);
//     const NgayISO = req.query.Ngay;

//     // Tạo đối tượng Date từ NgayISO
//     const NgayStart = new Date(NgayISO);
//     NgayStart.setHours(0, 0, 0, 0); // Đặt thời gian bắt đầu của ngày

//     const NgayEnd = new Date(NgayISO);
//     NgayEnd.setHours(23, 59, 59, 999); // Đặt thời gian kết thúc của ngày

//     console.log("Ngày bắt đầu", NgayStart);
//     console.log("Ngày kết thúc", NgayEnd);

//     // Tìm bản ghi mới nhất trong ngày
//     let dashboard = await DashBoard.findOne({
//       Ngay: { $gte: NgayStart, $lte: NgayEnd }
//     }).sort({ Ngay: -1 }); // Sắp xếp giảm dần theo Ngay

//     console.log("dashboard", dashboard);

//     if (!dashboard) {
//       dashboard = {
//         Ngay: NgayStart, // Hoặc sử dụng NgayISO nếu bạn muốn
//         // Thêm các trường khác nếu cần
//       };

//       throw new AppError(400, "dashboard not found", "Chưa có dữ liệu dashboard");
//     } else {
//       // Phản hồi
//       sendResponse(res, 200, true, { dashboard }, null, "Get dashboard success, dashboard đã có trong DB");
//     }
//   });

// dashboardController.getOneNewestByNgay = catchAsync(async (req, res, next) => {
//   console.log("reqbody", req.query);
//   const NgayISO = req.query.Ngay;

//   const NgayStart = new Date(NgayISO);
//   NgayStart.setHours(0, 0, 0, 0); // Đặt thời gian bắt đầu của ngày

//   const NgayEnd = new Date(NgayISO);
//   NgayEnd.setHours(23, 59, 59, 999); // Đặt thời gian kết thúc của ngày

//   // Điều chỉnh cho giờ Việt Nam (UTC+7)
//   const offset = NgayStart.getTimezoneOffset() + 420; // 420 phút = 7 giờ
//   NgayStart.setMinutes(NgayStart.getMinutes() - offset);
//   NgayEnd.setMinutes(NgayEnd.getMinutes() - offset);

//   console.log("Ngày bắt đầu", NgayStart);
//   console.log("Ngày kết thúc", NgayEnd);

//   let dashboard = await DashBoard.findOne({
//     Ngay: { $gte: NgayStart, $lte: NgayEnd }
//   }).sort({ Ngay: -1 });

//   console.log("dashboard", dashboard);

//   if (!dashboard) {
//     dashboard = {
//       Ngay: NgayStart,
//     };

//     throw new AppError(400, "dashboard not found", "Chưa có dữ liệu dashboard");
//   } else {
//     sendResponse(res, 200, true, { dashboard }, null, "Get dashboard success, dashboard đã có trong DB");
//   }
// });

dashboardController.getAllByNgay = catchAsync(async (req, res, next) => {
  //get data from request
  console.log("reqbody", req.query);
  const NgayISO = req.query.Ngay;

  const Ngay = new Date(NgayISO);

  //Business Logic Validation
  let dashBoards = await DashBoard.find({ Ngay }).populate("KhoaID");
  console.log("dashboard", dashBoards);
  if (!dashBoards) {
    (dashBoards = []),
      sendResponse(
        res,
        200,
        true,
        { dashBoards },
        null,
        "Get dashBoard All success, Chưa có dữ lệu nào"
      );
  } else {
    //Response
    sendResponse(
      res,
      200,
      true,
      { dashBoards },
      null,
      "Get BaoCaoNgay All success,"
    );
  }

  //Process
});

dashboardController.getOneNewestByNgay = catchAsync(async (req, res, next) => {
  console.log("reqbody", req.query);
  const NgayISO = req.query.Ngay;

  // Chuyển đổi NgayISO sang giờ Việt Nam và thiết lập thời gian bắt đầu và kết thúc của ngày
  const NgayStart = moment
    .tz(NgayISO, "Asia/Ho_Chi_Minh")
    .startOf("day")
    .toDate();
  const NgayEnd = moment.tz(NgayISO, "Asia/Ho_Chi_Minh").endOf("day").toDate();

  console.log("Ngày bắt đầu", NgayStart);
  console.log("Ngày kết thúc", NgayEnd);

  // Aggregation để lấy tài liệu có thời gian mới nhất và loại bỏ dữ liệu không cần thiết
  const dashboard = await DashBoard.aggregate([
    {
      $match: {
        Ngay: { $gte: NgayStart, $lte: NgayEnd }, // Lọc trong khoảng thời gian
      },
    },
    {
      $sort: { Ngay: -1 }, // Sắp xếp theo thời gian giảm dần
    },
    {
      $project: {
        Ngay: 1, // Giữ lại trường Ngay
        ChiSoDashBoard: {
          $filter: {
            input: "$ChiSoDashBoard", // Lọc dữ liệu không mong muốn
            as: "chiSo",
            cond: {
              $not: {
                $in: [
                  "$$chiSo.Code", // Loại bỏ các Code không mong muốn
                  [
                    "json_doanhthu_toanvien_bacsi_duyetketoan",
                    "json_doanhthu_toanvien_bacsi_theochidinh",
                    "json_doanhthu_canlamsang_duyetketoan_khoa",
                    "json_doanhthu_canlamsang_theochidinh_khoa",
                    "json_doanhthu_chuaduyetkt_thanghientai_theovienphi_daravien",
                    "json_doanhthu_chuaduyetkt_thanghientai_theovienphi_chuaravien",
                    "json_doanhthu_chuaduyetkt_thangtruoc_theovienphi_daravien",
                    "json_doanhthu_chuaduyetkt_thangtruoc_theovienphi_chuaravien",
                  ],
                ],
              },
            },
          },
        },
      },
    },
    {
      $limit: 1, // Lấy tài liệu có thời gian mới nhất
    },
  ]);

  if (dashboard && dashboard.length > 0) {
    sendResponse(
      res,
      200,
      true,
      { dashboard: dashboard[0] },
      null,
      "Get dashboard success, dashboard đã có trong DB"
    );
  } else {
    throw new AppError(400, "dashboard not found", "Chưa có dữ liệu dashboard");
  }
});

dashboardController.getOneNewestByNgayKhoa = catchAsync(
  async (req, res, next) => {
    console.log("reqbody", req.query);
    const NgayISO = req.query.Ngay;
    const KhoaID = req.query.KhoaID;

    // Chuyển đổi NgayISO sang giờ Việt Nam và thiết lập thời gian bắt đầu và kết thúc của ngày
    const NgayStart = moment
      .tz(NgayISO, "Asia/Ho_Chi_Minh")
      .startOf("day")
      .toDate();
    const NgayEnd = moment
      .tz(NgayISO, "Asia/Ho_Chi_Minh")
      .endOf("day")
      .toDate();

    console.log("Ngày bắt đầu", NgayStart);
    console.log("Ngày kết thúc", NgayEnd);

    // Aggregation để lấy tài liệu có thời gian mới nhất và loại bỏ dữ liệu không cần thiết
    const dashboard = await DashBoard.aggregate([
      {
        $match: {
          Ngay: { $gte: NgayStart, $lte: NgayEnd }, // Lọc trong khoảng thời gian
        },
      },
      {
        $sort: { Ngay: -1 }, // Sắp xếp theo thời gian giảm dần
      },
      {
        $project: {
          Ngay: 1, // Giữ lại trường Ngay
          ChiSoDashBoard: {
            $filter: {
              input: "$ChiSoDashBoard", // Lọc dữ liệu không mong muốn
              as: "chiSo",
              cond: {
                $in: [
                  "$$chiSo.Code", // Loại bỏ các Code không mong muốn
                  [
                    "json_doanhthu_toanvien_bacsi_duyetketoan",
                    "json_doanhthu_toanvien_bacsi_theochidinh",
                    "json_doanhthu_canlamsang_duyetketoan_khoa",
                    "json_doanhthu_canlamsang_theochidinh_khoa",
                    "json_doanhthu_chuaduyetkt_thanghientai_theovienphi_daravien",
                    "json_doanhthu_chuaduyetkt_thanghientai_theovienphi_chuaravien",
                    "json_doanhthu_chuaduyetkt_thangtruoc_theovienphi_daravien",
                    "json_doanhthu_chuaduyetkt_thangtruoc_theovienphi_chuaravien",
                    "json_doanhthu_chuaduyetketoan_thanghientai_theokhoa",
                    "json_doanhthu_chuaduyetketoan_thangtruoc_theokhoa",
                  ],
                ],
              },
            },
          },
        },
      },
      {
        $limit: 1, // Lấy tài liệu có thời gian mới nhất
      },
    ]);

    if (
      !dashboard ||
      dashboard.length === 0 ||
      dashboard[0].ChiSoDashBoard.length === 0
    ) {
      throw new AppError(
        404,
        "Data not found",
        "Không tìm thấy dữ liệu cho ngày và khoaid này"
      );
    }
    console.log("dashboard 2", dashboard[0].ChiSoDashBoard);

    const chisoKhoa = {};

    dashboard[0].ChiSoDashBoard.forEach((item) => {
      const chiSoJson = item.Value !== "null" ? JSON.parse(item.Value) : []; // Chuyển đổi từ chuỗi JSON thành đối tượng
      const chiSoTheoKhoaid = chiSoJson.filter(
        (item) => item.khoaid === parseInt(KhoaID, 10) // Lọc theo khoaid
      );
      chisoKhoa[item.Code] = chiSoTheoKhoaid;
      chisoKhoa["Ngay"] = dashboard[0].Ngay;
    });

    // Trả về kết quả
    sendResponse(res, 200, true, { chisoKhoa }, null, "Lấy dữ liệu thành công");
  }
);

dashboardController.deleteByNgay = catchAsync(async (req, res, next) => {
  const NgayISO = req.query.Ngay;

  // Chuyển đổi NgayISO sang giờ Việt Nam và thiết lập thời gian bắt đầu và kết thúc của ngày
  const NgayStart = moment
    .tz(NgayISO, "Asia/Ho_Chi_Minh")
    .startOf("day")
    .toDate();
  const NgayEnd = moment.tz(NgayISO, "Asia/Ho_Chi_Minh").endOf("day").toDate();

  // Tìm _id của bản ghi mới nhất trong ngày
  const latestRecord = await DashBoard.findOne({
    Ngay: { $gte: NgayStart, $lte: NgayEnd },
  })
    .sort({ Ngay: -1 })
    .select("_id");

  if (!latestRecord) {
    return next(
      new AppError(
        404,
        "No records found for the given date",
        "Không tìm thấy bản ghi"
      )
    );
  }

  // Xóa các bản ghi không phải là mới nhất
  const deleteResult = await DashBoard.deleteMany({
    _id: { $ne: latestRecord._id },
    Ngay: { $gte: NgayStart, $lte: NgayEnd },
  });

  if (deleteResult.deletedCount === 0) {
    sendResponse(res, 404, false, null, "No old records were deleted");
  } else {
    sendResponse(
      res,
      200,
      true,
      { deletedCount: deleteResult.deletedCount },
      null,
      "Old records deleted successfully"
    );
  }
});

module.exports = dashboardController;
// Đếm số lớp đào tạo theo năm và mã hình thức cập nhật
dashboardController.getLopDaoTaoCountByYear = catchAsync(
  async (req, res, next) => {
    const tz = req.query.tz || "Asia/Ho_Chi_Minh";
    const toInt = (v, def = null) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : def;
    };
    const fromYear = toInt(req.query.fromYear, null);
    const toYear = toInt(req.query.toYear, null);
    const onlyCompleted = String(req.query.onlyCompleted ?? "false") === "true";
    const includeMeta = String(req.query.includeMeta ?? "true") === "true";

    const match = { isDeleted: false };
    if (onlyCompleted) match.TrangThai = true;

    const pipeline = [
      { $match: match },
      {
        $addFields: {
          eventDate: {
            $ifNull: [
              "$NgayKetThuc",
              { $ifNull: ["$NgayBatDau", "$createdAt"] },
            ],
          },
        },
      },
    ];

    if (fromYear || toYear) {
      const range = {};
      if (fromYear) range.$gte = new Date(Date.UTC(fromYear, 0, 1, 0, 0, 0, 0));
      if (toYear)
        range.$lte = new Date(Date.UTC(toYear, 11, 31, 23, 59, 59, 999));
      pipeline.push({ $match: { eventDate: range } });
    }

    pipeline.push(
      {
        $addFields: {
          yearStr: {
            $dateToString: { date: "$eventDate", format: "%Y", timezone: tz },
          },
        },
      },
      {
        $group: {
          _id: { Ma: "$MaHinhThucCapNhat", year: "$yearStr" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          MaHinhThucCapNhat: "$_id.Ma",
          year: { $toInt: "$_id.year" },
          count: 1,
        },
      },
      { $sort: { year: 1, MaHinhThucCapNhat: 1 } }
    );

    let data = await LopDaoTao.aggregate(pipeline);

    if (includeMeta && data.length) {
      const maSet = [...new Set(data.map((d) => d.MaHinhThucCapNhat))];
      const meta = await HinhThucCapNhat.find(
        { Ma: { $in: maSet } },
        { Ma: 1, Ten: 1, TenBenhVien: 1, MaNhomHinhThucCapNhat: 1, Loai: 1 }
      ).lean();
      const metaByMa = Object.fromEntries(meta.map((m) => [m.Ma, m]));
      data = data.map((d) => ({
        ...d,
        Ten: metaByMa[d.MaHinhThucCapNhat]?.Ten || "",
        TenBenhVien: metaByMa[d.MaHinhThucCapNhat]?.TenBenhVien || "",
        Nhom: metaByMa[d.MaHinhThucCapNhat]?.MaNhomHinhThucCapNhat || "",
        Loai: metaByMa[d.MaHinhThucCapNhat]?.Loai || "",
      }));
    }

    return sendResponse(
      res,
      200,
      true,
      { data, filters: { fromYear, toYear, onlyCompleted, tz } },
      null,
      "Thống kê số lớp theo năm và mã hình thức thành công"
    );
  }
);
