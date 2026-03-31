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
 * @desc Đánh dấu hàng loạt (hỗ trợ chunk tự động, tối đa 10000 bản ghi)
 */
xacNhanManTinhController.batchCreateManTinh = catchAsync(
  async (req, res, next) => {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError(400, "items phải là mảng không rỗng", "INVALID_ITEMS");
    }

    if (items.length > 10000) {
      throw new AppError(400, "Tối đa 10000 bản ghi mỗi lần", "BATCH_LIMIT");
    }

    // 1. Validate + phân loại valid vs invalid
    const invalidItems = [];
    const docs = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (
        typeof item.dangkykhamid !== "number" ||
        item.dangkykhamid <= 0 ||
        typeof item.patientid_old !== "number" ||
        item.patientid_old <= 0
      ) {
        invalidItems.push({
          row: i + 1,
          dangkykhamid: item.dangkykhamid ?? null,
          patientid_old: item.patientid_old ?? null,
          reason: "dangkykhamid và patientid_old phải là số nguyên > 0",
        });
        continue;
      }
      docs.push({
        dangkykhamid: item.dangkykhamid,
        patientid_old: item.patientid_old,
        vienphiid: item.vienphiid ?? null,
        nguoigioithieuid: item.nguoigioithieuid ?? null,
        ghiChu: item.ghiChu || "",
        snapshot: item.snapshot || {},
        nguoiTao: req.userId,
      });
    }

    // 2. Nếu không có doc hợp lệ → trả về ngay
    if (docs.length === 0) {
      return sendResponse(res, 200, true, {
        totalRequested: items.length,
        totalImported: 0,
        totalSkipped: 0,
        totalInvalid: invalidItems.length,
        duplicateCount: 0,
        errorCount: 0,
        invalidItems,
        partialSuccess: false,
      }, null, "Không có bản ghi hợp lệ để đánh dấu");
    }

    // 3. Chunk-based insert: 500 items mỗi batch
    const CHUNK_SIZE = 500;
    let totalInserted = 0;
    let totalDuplicate = 0;
    let totalError = 0;
    const errors = [];

    for (let i = 0; i < docs.length; i += CHUNK_SIZE) {
      const chunk = docs.slice(i, i + CHUNK_SIZE);

      try {
        const result = await XacNhanManTinh.insertMany(chunk, { ordered: false });
        totalInserted += result.insertedCount ?? chunk.length;
      } catch (err) {
        if (err.code === 11000 || err.writeErrors) {
          // insertedCount: số doc được insert thành công trong chunk (kể cả trước dup đầu tiên)
          const inserted = err.insertedCount ?? err.writeResult?.insertedCount ?? 0;
          const dupCount = (err.writeErrors || []).length;
          totalInserted += inserted;
          totalDuplicate += dupCount;
        } else {
          totalError += chunk.length;
          if (errors.length < 10) {
            errors.push({ chunk: Math.floor(i / CHUNK_SIZE) + 1, message: err.message });
          }
        }
      }
    }

    const totalSkipped = docs.length - totalInserted;

    return sendResponse(res, 200, true, {
      totalRequested: items.length,
      totalAttempted: docs.length,
      totalImported: totalInserted,
      totalSkipped,
      totalInvalid: invalidItems.length,
      duplicateCount: totalDuplicate,
      errorCount: totalError,
      errors,
      invalidItems: invalidItems.slice(0, 50),
      partialSuccess: totalInserted < docs.length,
    }, null, "Hoàn tất đánh dấu mãn tính");
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
 * @desc Bỏ đánh dấu hàng loạt (tối đa 10000)
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

    if (dangkykhamids.length > 10000) {
      throw new AppError(
        400,
        "Tối đa 10000 bản ghi mỗi lần",
        "BATCH_LIMIT",
      );
    }

    // Validate: chỉ chấp nhận số nguyên dương
    const invalidIds = [];
    const validIds = [];
    for (let i = 0; i < dangkykhamids.length; i++) {
      const id = Number(dangkykhamids[i]);
      if (!Number.isInteger(id) || id <= 0) {
        invalidIds.push({ index: i + 1, value: dangkykhamids[i] });
      } else {
        validIds.push(id);
      }
    }

    if (validIds.length === 0) {
      return sendResponse(res, 200, true, {
        totalRequested: dangkykhamids.length,
        totalDeleted: 0,
        notFound: 0,
        invalidCount: invalidIds.length,
        invalidIds: invalidIds.slice(0, 50),
      }, null, "Không có ID hợp lệ để xóa");
    }

    const result = await XacNhanManTinh.deleteMany({
      dangkykhamid: { $in: validIds },
    });

    return sendResponse(res, 200, true, {
      totalRequested: dangkykhamids.length,
      totalDeleted: result.deletedCount,
      notFound: validIds.length - result.deletedCount,
      invalidCount: invalidIds.length,
      invalidIds: invalidIds.slice(0, 50),
      partialSuccess: result.deletedCount < validIds.length,
    }, null, "Hoàn tất bỏ đánh dấu mãn tính");
  },
);

module.exports = xacNhanManTinhController;
