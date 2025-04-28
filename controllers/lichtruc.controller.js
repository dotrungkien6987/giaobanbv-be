const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const LichTruc = require("../models/LichTruc");
const Khoa = require("../models/Khoa");

const lichTrucController = {};

// Hàm kiểm tra quyền truy cập
const checkPermission = async (req, khoaId) => {
  // Lấy thông tin người dùng từ middleware xác thực
  const userId = req.userId;
  const userRole = req.role;
  
  // Admin có quyền truy cập tất cả
  if (userRole === "admin") return true;
  
  // Người dùng chỉ có quyền chỉnh sửa lịch trực của khoa mình
  if (req.khoaId && req.khoaId.toString() === khoaId.toString()) {
    return true;
  }
  
  return false;
};

// Hàm kiểm tra ngày trong quá khứ
const isPastDate = (date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);
  
  return checkDate < today;
};

// API lấy tất cả lịch trực
lichTrucController.getAllLichTruc = catchAsync(async (req, res, next) => {
  // Tìm tất cả lịch trực, sắp xếp theo ngày giảm dần
  const lichTrucs = await LichTruc.find({})
    .populate("KhoaID", "TenKhoa")
    .populate("UserID", "username")
    .sort({ Ngay: -1 })
    .limit(100); // Giới hạn kết quả để tránh quá tải
  
  sendResponse(res, 200, true, { lichTrucs }, null, "Lấy tất cả lịch trực thành công");
});

// API lấy lịch trực theo ngày và khoa (tương tự getByNgay trong bcgiaoban.controller.js)
lichTrucController.getByNgayKhoa = catchAsync(async (req, res, next) => {
  // Lấy fromDate, toDate và khoaId từ tham số truy vấn
  const { fromDate, toDate, khoaId } = req.query;
  
  if (!fromDate || !toDate || !khoaId) {
    throw new AppError(400, "Thiếu tham số cần thiết: fromDate, toDate, khoaId", "Get LichTruc Error");
  }

  // Chuyển thành đối tượng Date
  const fromDateObj = new Date(fromDate);
  const toDateObj = new Date(toDate);

  // Tìm tất cả bản ghi LichTruc giữa fromDate và toDate và thuộc khoa
  const lichTrucs = await LichTruc.find({
    Ngay: {
      $gte: fromDateObj,
      $lte: toDateObj,
    },
    KhoaID: khoaId
  }).populate("KhoaID", "TenKhoa");

  // Tạo danh sách các ngày giữa fromDate và toDate
  const dateList = [];
  for (let d = new Date(fromDateObj); d <= toDateObj; d.setDate(d.getDate() + 1)) {
    dateList.push(new Date(d));
  }

  // Tạo mảng cuối cùng với các ngày thiếu được điền vào
  const lichTrucsWithDay = dateList.map((date) => {
    // Tìm bản ghi tồn tại
    const existingRecord = lichTrucs.find(
      (record) => record.Ngay.toDateString() === date.toDateString()
    );
    
    // Lấy thứ trong tuần
    const dayOfWeek = new Intl.DateTimeFormat("vi-VN", {
      weekday: "long",
    }).format(date);

    if (existingRecord) {
      return {
        _id: existingRecord._id,
        Ngay: existingRecord.Ngay,
        KhoaID: existingRecord.KhoaID,
        DieuDuong: existingRecord.DieuDuong || "",
        BacSi: existingRecord.BacSi || "",
        GhiChu: existingRecord.GhiChu || "",
        UserID: existingRecord.UserID,
        Thu: dayOfWeek,
      };
    } else {
      // Tạo bản ghi tạm cho ngày chưa có dữ liệu
      return {
        _id: 0, // ID = 0 đánh dấu là bản ghi tạm
        Ngay: date,
        KhoaID: khoaId,
        DieuDuong: "",
        BacSi: "",
        GhiChu: "",
        Thu: dayOfWeek,
      };
    }
  });

  // Gửi phản hồi
  sendResponse(
    res,
    200,
    true,
    lichTrucsWithDay,
    null,
    "Lấy lịch trực theo ngày và khoa thành công"
  );
});

// API cập nhật hoặc thêm mới nhiều lịch trực cùng lúc (tương tự updateOrInsert trong bcgiaoban.controller.js)
lichTrucController.updateOrInsert = catchAsync(async (req, res, next) => {
  const records = req.body;
  
  if (!Array.isArray(records) || records.length === 0) {
    throw new AppError(400, "Dữ liệu không hợp lệ", "Update or Insert LichTruc Error");
  }
  
  const updatedRecords = [];
  const errors = [];

  for (const record of records) {
    try {
      // Kiểm tra quyền truy cập
      // const hasPermission = await checkPermission(req, record.KhoaID);
      // if (!hasPermission) {
      //   errors.push(`Không có quyền cập nhật lịch trực cho khoa ${record.KhoaID}`);
      //   continue;
      // }
      
      // Nếu không phải admin, kiểm tra ngày trong quá khứ
      // if (req.role !== "admin" && isPastDate(record.Ngay)) {
      //   errors.push(`Không thể cập nhật lịch trực của ngày đã qua ${new Date(record.Ngay).toLocaleDateString('vi-VN')}`);
      //   continue;
      // }
      
      let updatedRecord;

      // Nếu _id = 0, thêm bản ghi mới
      if (record._id === 0) {
        updatedRecord = await LichTruc.create({
          Ngay: record.Ngay,
          KhoaID: record.KhoaID,
          DieuDuong: record.DieuDuong || "",
          BacSi: record.BacSi || "",
          GhiChu: record.GhiChu || "",
          UserID: req.userId
        });
      }
      // Nếu _id khác 0, cập nhật bản ghi
      else {
        updatedRecord = await LichTruc.findByIdAndUpdate(record._id, {
          DieuDuong: record.DieuDuong,
          BacSi: record.BacSi,
          GhiChu: record.GhiChu,
          UserID: req.userId
        }, {
          new: true,
          runValidators: true,
        });
      }
      
      // Populate thông tin khoa
      const populatedRecord = await LichTruc.findById(updatedRecord._id)
        .populate("KhoaID", "TenKhoa")
        .populate("UserID", "username");

      // Thêm thông tin thứ trong tuần
      const dayOfWeek = new Intl.DateTimeFormat("vi-VN", {
        weekday: "long",
      }).format(new Date(populatedRecord.Ngay));
      
      updatedRecords.push({
        ...populatedRecord._doc,
        Thu: dayOfWeek,
      });
    } catch (error) {
      errors.push(`Lỗi cập nhật bản ghi: ${error.message}`);
    }
  }

  sendResponse(
    res,
    200,
    true,
    { updatedRecords, errors },
    null,
    `Cập nhật ${updatedRecords.length} lịch trực thành công, ${errors.length} lỗi`
  );
});

// API lấy danh sách lịch trực theo khoảng thời gian và khoa
lichTrucController.getLichTrucByDateRange = catchAsync(async (req, res, next) => {
  const { fromDate, toDate, khoaId } = req.query;
  
  // Kiểm tra tham số bắt buộc
  if (!fromDate || !toDate || !khoaId) {
    throw new AppError(400, "Thiếu tham số cần thiết", "Get LichTruc Error");
  }
  
  // Tìm tất cả lịch trực trong khoảng thời gian và thuộc khoa
  const lichTrucs = await LichTruc.find({
    Ngay: {
      $gte: new Date(fromDate),
      $lte: new Date(toDate)
    },
    KhoaID: khoaId
  })
  .populate("KhoaID", "TenKhoa")
  .populate("UserID", "username");
  
  // Tạo danh sách ngày trong khoảng thời gian
  const dateList = [];
  const startDate = new Date(fromDate);
  const endDate = new Date(toDate);
  
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    dateList.push(new Date(d));
  }
  
  // Tạo danh sách lịch trực với cả những ngày chưa có lịch trực
  const lichTrucWithDays = dateList.map(date => {
    const existingRecord = lichTrucs.find(record => {
      const recordDate = new Date(record.Ngay);
      return recordDate.toDateString() === date.toDateString();
    });
    
    if (existingRecord) {
      return existingRecord;
    } else {
      // Trả về mẫu dữ liệu cho ngày chưa có lịch trực
      return {
        _id: `temp_${date.getTime()}`,
        Ngay: date,
        KhoaID: { _id: khoaId },
        DieuDuong: "",
        BacSi: "",
        GhiChu: "",
        isTemp: true  // Đánh dấu là bản ghi tạm thời
      };
    }
  });
  
  sendResponse(res, 200, true, { lichTrucs: lichTrucWithDays }, null, "Lấy danh sách lịch trực thành công");
});

// API thêm nhiều lịch trực cùng lúc
lichTrucController.createMultipleLichTruc = catchAsync(async (req, res, next) => {
  const { lichTrucs } = req.body;
  
  if (!lichTrucs || !Array.isArray(lichTrucs) || lichTrucs.length === 0) {
    throw new AppError(400, "Dữ liệu không hợp lệ", "Create LichTruc Error");
  }
  
  const createdLichTrucs = [];
  const errors = [];
  
  // Xử lý từng lịch trực
  for (const lichTruc of lichTrucs) {
    try {
      const { Ngay, KhoaID, DieuDuong, BacSi, GhiChu } = lichTruc;
      
      // Kiểm tra quyền truy cập
      const hasPermission = await checkPermission(req, KhoaID);
      if (!hasPermission) {
        errors.push(`Không có quyền thêm lịch trực cho khoa ${KhoaID}`);
        continue;
      }
      
      // Kiểm tra ngày trong quá khứ
      if (isPastDate(Ngay)) {
        errors.push(`Không thể thêm lịch trực cho ngày đã qua ${new Date(Ngay).toLocaleDateString('vi-VN')}`);
        continue;
      }
      
      // Kiểm tra xem lịch trực đã tồn tại chưa
      const existingLichTruc = await LichTruc.findOne({
        Ngay: new Date(Ngay),
        KhoaID
      });
      
      if (existingLichTruc) {
        errors.push(`Lịch trực ngày ${new Date(Ngay).toLocaleDateString('vi-VN')} đã tồn tại`);
        continue;
      }
      
      // Thêm mới lịch trực
      const newLichTruc = await LichTruc.create({
        Ngay,
        KhoaID,
        DieuDuong: DieuDuong || "",
        BacSi: BacSi || "",
        GhiChu: GhiChu || "",
        UserID: req.userId
      });
      
      // Populate data
      const populatedLichTruc = await LichTruc.findById(newLichTruc._id)
        .populate("KhoaID", "TenKhoa")
        .populate("UserID", "username");
      
      createdLichTrucs.push(populatedLichTruc);
    } catch (error) {
      errors.push(`Lỗi: ${error.message}`);
    }
  }
  
  sendResponse(
    res, 
    201, 
    true, 
    { createdLichTrucs, errors }, 
    null, 
    `Đã thêm ${createdLichTrucs.length} lịch trực, ${errors.length} lỗi`
  );
});

// API cập nhật lịch trực
lichTrucController.updateLichTruc = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { DieuDuong, BacSi, GhiChu } = req.body;
  
  // Kiểm tra lịch trực tồn tại
  const lichTruc = await LichTruc.findById(id);
  if (!lichTruc) {
    throw new AppError(404, "Không tìm thấy lịch trực", "Update LichTruc Error");
  }
  
  // Kiểm tra quyền truy cập
  const hasPermission = await checkPermission(req, lichTruc.KhoaID);
  if (!hasPermission) {
    throw new AppError(403, "Không có quyền cập nhật lịch trực này", "Update LichTruc Error");
  }
  
  // Kiểm tra ngày trong quá khứ
  if (isPastDate(lichTruc.Ngay)) {
    throw new AppError(400, "Không thể cập nhật lịch trực của ngày đã qua", "Update LichTruc Error");
  }
  
  // Cập nhật lịch trực
  lichTruc.DieuDuong = DieuDuong !== undefined ? DieuDuong : lichTruc.DieuDuong;
  lichTruc.BacSi = BacSi !== undefined ? BacSi : lichTruc.BacSi;
  lichTruc.GhiChu = GhiChu !== undefined ? GhiChu : lichTruc.GhiChu;
  
  await lichTruc.save();
  
  // Populate data
  const updatedLichTruc = await LichTruc.findById(id)
    .populate("KhoaID", "TenKhoa")
    .populate("UserID", "username");
  
  sendResponse(res, 200, true, { updatedLichTruc }, null, "Cập nhật lịch trực thành công");
});

// API xóa lịch trực
lichTrucController.deleteLichTruc = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  
  // Kiểm tra lịch trực tồn tại
  const lichTruc = await LichTruc.findById(id);
  if (!lichTruc) {
    throw new AppError(404, "Không tìm thấy lịch trực", "Delete LichTruc Error");
  }
  
  // Kiểm tra quyền truy cập
  const hasPermission = await checkPermission(req, lichTruc.KhoaID);
  if (!hasPermission) {
    throw new AppError(403, "Không có quyền xóa lịch trực này", "Delete LichTruc Error");
  }
  
  // Kiểm tra ngày trong quá khứ
  if (isPastDate(lichTruc.Ngay)) {
    throw new AppError(400, "Không thể xóa lịch trực của ngày đã qua", "Delete LichTruc Error");
  }
  
  // Xóa lịch trực
  await LichTruc.findByIdAndDelete(id);
  
  sendResponse(res, 200, true, { deletedId: id }, null, "Xóa lịch trực thành công");
});

// API lấy lịch trực theo khoa
lichTrucController.getLichTrucByKhoa = catchAsync(async (req, res, next) => {
  const { khoaId } = req.params;
  
  // Kiểm tra đầu vào
  if (!khoaId) {
    throw new AppError(400, "Thiếu ID khoa", "Get LichTruc Error");
  }
  
  // Tìm lịch trực theo khoa, sắp xếp theo ngày giảm dần
  const lichTrucs = await LichTruc.find({ KhoaID: khoaId })
    .populate("KhoaID", "TenKhoa")
    .populate("UserID", "username")
    .sort({ Ngay: -1 })
    .limit(50); // Giới hạn kết quả
  
  sendResponse(res, 200, true, { lichTrucs }, null, "Lấy lịch trực theo khoa thành công");
});

// API lấy lịch trực theo ngày
lichTrucController.getLichTrucByDate = catchAsync(async (req, res, next) => {
  const { date } = req.params;
  
  // Kiểm tra đầu vào
  if (!date) {
    throw new AppError(400, "Thiếu ngày tìm kiếm", "Get LichTruc Error");
  }
  
  // Chuyển string thành Date
  const searchDate = new Date(date);
  
  // Tạo khoảng thời gian trong ngày (từ 00:00:00 đến 23:59:59)
  const startOfDay = new Date(searchDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(searchDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Tìm lịch trực theo ngày
  const lichTrucs = await LichTruc.find({
    Ngay: {
      $gte: startOfDay,
      $lte: endOfDay
    }
  })
  .populate("KhoaID", "TenKhoa")
  .populate("UserID", "username");
  
  sendResponse(res, 200, true, { lichTrucs }, null, "Lấy lịch trực theo ngày thành công");
});

// API thêm lịch trực mới
lichTrucController.createLichTruc = catchAsync(async (req, res, next) => {
  const { Ngay, KhoaID, DieuDuong, BacSi, GhiChu } = req.body;
  
  // Kiểm tra dữ liệu bắt buộc
  if (!Ngay || !KhoaID) {
    throw new AppError(400, "Thiếu thông tin bắt buộc: Ngày, KhoaID", "Create LichTruc Error");
  }
  
  // Kiểm tra quyền truy cập
  const hasPermission = await checkPermission(req, KhoaID);
  if (!hasPermission) {
    throw new AppError(403, "Không có quyền thêm lịch trực cho khoa này", "Create LichTruc Error");
  }
  
  // Kiểm tra ngày trong quá khứ
  if (isPastDate(Ngay)) {
    throw new AppError(400, "Không thể thêm lịch trực cho ngày đã qua", "Create LichTruc Error");
  }
  
  // Kiểm tra lịch trực đã tồn tại
  const existingLichTruc = await LichTruc.findOne({
    Ngay: new Date(Ngay),
    KhoaID
  });
  
  if (existingLichTruc) {
    throw new AppError(400, "Lịch trực cho ngày và khoa này đã tồn tại", "Create LichTruc Error");
  }
  
  // Tạo lịch trực mới
  const newLichTruc = await LichTruc.create({
    Ngay,
    KhoaID,
    DieuDuong: DieuDuong || "",
    BacSi: BacSi || "",
    GhiChu: GhiChu || "",
    UserID: req.userId
  });
  
  // Populate data
  const populatedLichTruc = await LichTruc.findById(newLichTruc._id)
    .populate("KhoaID", "TenKhoa")
    .populate("UserID", "username");
  
  sendResponse(res, 201, true, { lichTruc: populatedLichTruc }, null, "Thêm lịch trực thành công");
});

module.exports = lichTrucController;