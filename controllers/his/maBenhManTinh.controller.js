const { catchAsync, sendResponse, AppError } = require("../../helpers/utils");
const MaBenhManTinh = require("../../models/MaBenhManTinh");

const maBenhManTinhController = {};

/**
 * @route GET /api/his/mabenh-mantinh
 * @desc Lấy danh sách mã bệnh mãn tính (có search + pagination)
 */
maBenhManTinhController.getAll = catchAsync(async (req, res, next) => {
  const { search, page = 1, limit = 200 } = req.query;

  const filter = {};
  if (search) {
    const regex = new RegExp(search, "i");
    filter.$or = [{ maBenh: regex }, { tenBenh: regex }, { nhomBenh: regex }];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [docs, total] = await Promise.all([
    MaBenhManTinh.find(filter)
      .sort({ maBenh: 1 })
      .skip(skip)
      .limit(Number(limit))
      .populate("nguoiTao", "UserName HoTen")
      .lean(),
    MaBenhManTinh.countDocuments(filter),
  ]);

  return sendResponse(
    res,
    200,
    true,
    { docs, total, page: Number(page), limit: Number(limit) },
    null,
    "Lấy danh sách mã bệnh mãn tính thành công",
  );
});

/**
 * @route POST /api/his/mabenh-mantinh
 * @desc Thêm 1 mã bệnh mãn tính
 */
maBenhManTinhController.create = catchAsync(async (req, res, next) => {
  const { maBenh, tenBenh, nhomBenh, ghiChu } = req.body;

  if (!maBenh || !tenBenh) {
    throw new AppError(400, "maBenh và tenBenh là bắt buộc", "MISSING_FIELDS");
  }

  const existing = await MaBenhManTinh.findOne({
    maBenh: maBenh.toUpperCase().trim(),
  });
  if (existing) {
    throw new AppError(409, `Mã bệnh ${maBenh} đã tồn tại`, "DUPLICATE");
  }

  const doc = await MaBenhManTinh.create({
    maBenh,
    tenBenh,
    nhomBenh: nhomBenh || "",
    ghiChu: ghiChu || "",
    nguoiTao: req.userId,
  });

  return sendResponse(
    res,
    201,
    true,
    doc,
    null,
    "Thêm mã bệnh mãn tính thành công",
  );
});

/**
 * @route POST /api/his/mabenh-mantinh/batch
 * @desc Import hàng loạt mã bệnh mãn tính
 */
maBenhManTinhController.batchCreate = catchAsync(async (req, res, next) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError(400, "items phải là mảng không rỗng", "INVALID_ITEMS");
  }

  if (items.length > 200) {
    throw new AppError(400, "Tối đa 200 mã bệnh mỗi lần", "BATCH_LIMIT");
  }

  // Validate từng dòng + phân loại: valid vs invalid
  const invalidItems = [];
  const docs = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (
      typeof item.maBenh !== "string" ||
      !item.maBenh.trim() ||
      typeof item.tenBenh !== "string" ||
      !item.tenBenh.trim()
    ) {
      invalidItems.push({
        row: i + 1,
        maBenh: item.maBenh ?? null,
        reason: "Thiếu hoặc sai định dạng maBenh/tenBenh",
      });
      continue;
    }
    docs.push({
      maBenh: item.maBenh.toUpperCase().trim(),
      tenBenh: item.tenBenh.trim(),
      nhomBenh: (item.nhomBenh || "").trim(),
      ghiChu: item.ghiChu || "",
      nguoiTao: req.userId,
    });
  }

  // Nếu không có doc nào hợp lệ → trả về ngay
  if (docs.length === 0) {
    return sendResponse(res, 200, true, {
      totalRequested: items.length,
      totalAttempted: 0,
      totalImported: 0,
      totalSkipped: 0,
      totalInvalid: invalidItems.length,
      duplicateCount: 0,
      invalidItems,
      partialSuccess: false,
    }, null, "Không có bản ghi hợp lệ để import");
  }

  let insertResult;
  let duplicateCount = 0;
  let totalImported = 0;

  try {
    insertResult = await MaBenhManTinh.insertMany(docs, { ordered: false });
    // insertedIds: object { index: _id } — CHỈ những doc THỰC SỰ được insert
    totalImported = Object.keys(insertResult.insertedIds || {}).length;
  } catch (err) {
    if (err.code === 11000 || err.writeErrors) {
      const insertedBeforeError =
        err.insertedCount ?? err.writeResult?.insertedCount ?? 0;
      const dupCount = (err.writeErrors || []).length;
      // insertedIds không có trong catch → ước tính từ err
      // Với ordered:false, doc sau dup đầu tiên vẫn được insert tiếp
      totalImported = insertedBeforeError + (docs.length - dupCount - insertedBeforeError);
      // Nếu ước tính âm → fallback về insertedBeforeError
      if (totalImported < 0) totalImported = insertedBeforeError;
      duplicateCount = dupCount;
      insertResult = { insertedCount: totalImported };
    } else {
      throw err;
    }
  }

  const totalAttempted = docs.length;
  const totalSkipped = totalAttempted - totalImported;

  return sendResponse(res, 200, true, {
    totalRequested: items.length,
    totalAttempted,
    totalImported,
    totalSkipped,
    totalInvalid: invalidItems.length,
    duplicateCount,
    invalidItems,
    partialSuccess: totalImported < totalAttempted,
  }, null, "Hoàn tất import");
});

/**
 * @route PUT /api/his/mabenh-mantinh/:id
 * @desc Cập nhật mã bệnh mãn tính
 */
maBenhManTinhController.update = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { maBenh, tenBenh, nhomBenh, ghiChu, isActive } = req.body;

  const doc = await MaBenhManTinh.findById(id);
  if (!doc) {
    throw new AppError(404, "Không tìm thấy mã bệnh", "NOT_FOUND");
  }

  if (maBenh !== undefined) doc.maBenh = maBenh;
  if (tenBenh !== undefined) doc.tenBenh = tenBenh;
  if (nhomBenh !== undefined) doc.nhomBenh = nhomBenh;
  if (ghiChu !== undefined) doc.ghiChu = ghiChu;
  if (isActive !== undefined) doc.isActive = isActive;

  await doc.save();

  return sendResponse(res, 200, true, doc, null, "Cập nhật mã bệnh thành công");
});

/**
 * @route DELETE /api/his/mabenh-mantinh/:id
 * @desc Xóa mã bệnh mãn tính
 */
maBenhManTinhController.delete = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doc = await MaBenhManTinh.findByIdAndDelete(id);
  if (!doc) {
    throw new AppError(404, "Không tìm thấy mã bệnh", "NOT_FOUND");
  }

  return sendResponse(res, 200, true, doc, null, "Xóa mã bệnh thành công");
});

module.exports = maBenhManTinhController;
