const { catchAsync, sendResponse, AppError } = require("../../helpers/utils");
const XacNhanManTinh = require("../../models/XacNhanManTinh");

const xacNhanManTinhController = {};

/**
 * @route POST /api/his/datlichkham/mantinh
 * @desc Đánh dấu 1 lượt đặt lịch là mãn tính
 */
xacNhanManTinhController.createManTinh = catchAsync(async (req, res, next) => {
  const {
    dangkykhamid,
    patientid_old,
    vienphiid,
    nguoigioithieuid,
    ghiChu,
    snapshot,
  } = req.body;

  if (!dangkykhamid || !patientid_old) {
    throw new AppError(
      400,
      "dangkykhamid và patientid_old là bắt buộc",
      "MISSING_FIELDS",
    );
  }

  const existing = await XacNhanManTinh.findOne({ dangkykhamid });
  if (existing) {
    throw new AppError(
      409,
      "Lượt đặt lịch này đã được đánh dấu mãn tính",
      "DUPLICATE",
    );
  }

  const doc = await XacNhanManTinh.create({
    dangkykhamid,
    patientid_old,
    vienphiid,
    nguoigioithieuid,
    ghiChu: ghiChu || "",
    snapshot: snapshot || {},
    nguoiTao: req.userId,
  });

  return sendResponse(
    res,
    201,
    true,
    doc,
    null,
    "Đánh dấu mãn tính thành công",
  );
});

/**
 * @route POST /api/his/datlichkham/mantinh/batch
 * @desc Đánh dấu hàng loạt
 */
xacNhanManTinhController.batchCreateManTinh = catchAsync(
  async (req, res, next) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "items phải là mảng không rỗng", "INVALID_ITEMS");
    }

    if (items.length > 100) {
      throw new AppError(400, "Tối đa 100 bản ghi mỗi lần", "BATCH_LIMIT");
    }

    const docs = items.map((item) => ({
      dangkykhamid: item.dangkykhamid,
      patientid_old: item.patientid_old,
      vienphiid: item.vienphiid,
      nguoigioithieuid: item.nguoigioithieuid,
      ghiChu: item.ghiChu || "",
      snapshot: item.snapshot || {},
      nguoiTao: req.userId,
    }));

    // insertMany with ordered:false to skip duplicates
    const result = await XacNhanManTinh.insertMany(docs, {
      ordered: false,
    }).catch((err) => {
      // Handle duplicate key errors gracefully
      if (err.code === 11000 || err.writeErrors) {
        return { insertedCount: err.insertedDocs?.length || 0, skipped: true };
      }
      throw err;
    });

    return sendResponse(
      res,
      201,
      true,
      result,
      null,
      "Đánh dấu hàng loạt thành công",
    );
  },
);

/**
 * @route POST /api/his/datlichkham/mantinh/list
 * @desc Lấy danh sách mãn tính theo mảng dangkykhamids
 */
xacNhanManTinhController.getByDangKyKhamIds = catchAsync(
  async (req, res, next) => {
    const { dangkykhamids } = req.body;

    if (!Array.isArray(dangkykhamids) || dangkykhamids.length === 0) {
      return sendResponse(res, 200, true, [], null, "Không có dữ liệu");
    }

    const docs = await XacNhanManTinh.find({
      dangkykhamid: { $in: dangkykhamids },
    })
      .populate("nguoiTao", "UserName HoTen")
      .lean();

    return sendResponse(
      res,
      200,
      true,
      docs,
      null,
      "Lấy danh sách mãn tính thành công",
    );
  },
);

/**
 * @route DELETE /api/his/datlichkham/mantinh/:dangkykhamid
 * @desc Bỏ đánh dấu mãn tính (hard delete)
 */
xacNhanManTinhController.deleteManTinh = catchAsync(async (req, res, next) => {
  const { dangkykhamid } = req.params;

  const result = await XacNhanManTinh.findOneAndDelete({
    dangkykhamid: Number(dangkykhamid),
  });

  if (!result) {
    throw new AppError(404, "Không tìm thấy bản ghi mãn tính", "NOT_FOUND");
  }

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Bỏ đánh dấu mãn tính thành công",
  );
});

/**
 * @route DELETE /api/his/datlichkham/mantinh/batch
 * @desc Bỏ đánh dấu hàng loạt
 */
xacNhanManTinhController.batchDeleteManTinh = catchAsync(
  async (req, res, next) => {
    const { dangkykhamids } = req.body;

    if (!Array.isArray(dangkykhamids) || dangkykhamids.length === 0) {
      throw new AppError(
        400,
        "dangkykhamids phải là mảng không rỗng",
        "INVALID_IDS",
      );
    }

    const result = await XacNhanManTinh.deleteMany({
      dangkykhamid: { $in: dangkykhamids },
    });

    return sendResponse(
      res,
      200,
      true,
      { deletedCount: result.deletedCount },
      null,
      "Bỏ đánh dấu hàng loạt thành công",
    );
  },
);

module.exports = xacNhanManTinhController;
