const { catchAsync, sendResponse, AppError } = require("../../helpers/utils");
const CongThucManTinh = require("../../models/CongThucManTinh");

const congThucManTinhController = {};

/**
 * Validate cấu trúc cây điều kiện (recursive)
 */
function validateDieuKien(node) {
  if (!node || typeof node !== "object") return false;

  if (node.loai === "AND" || node.loai === "OR") {
    if (!Array.isArray(node.children) || node.children.length === 0)
      return false;
    return node.children.every(validateDieuKien);
  }

  if (node.loai === "dieu_kien") {
    return (
      typeof node.bienSo === "string" &&
      node.bienSo.length > 0 &&
      typeof node.toanTu === "string" &&
      node.toanTu.length > 0 &&
      node.giaTri !== undefined
    );
  }

  return false;
}

const VALID_STEP_TYPES = ["loc", "loaiTru"];

/**
 * Validate cấu trúc pipeline (array of steps)
 */
function validatePipeline(pipeline) {
  if (!Array.isArray(pipeline) || pipeline.length === 0) return false;

  return pipeline.every((step) => {
    if (!step || typeof step !== "object") return false;
    if (typeof step.thuTu !== "number") return false;
    if (!VALID_STEP_TYPES.includes(step.loaiStep)) return false;
    if (!step.dieuKien || !validateDieuKien(step.dieuKien)) return false;
    return true;
  });
}

/**
 * Backward compat: wrap dieuKien cũ thành pipeline 1 bước
 */
function ensurePipeline(doc) {
  if (doc.pipeline && doc.pipeline.length > 0) return doc;
  if (doc.dieuKien) {
    doc.pipeline = [
      {
        thuTu: 1,
        loaiStep: "loc",
        tenStep: "Điều kiện chính",
        dieuKien: doc.dieuKien,
      },
    ];
  }
  return doc;
}

/**
 * @route GET /api/his/congthuc-mantinh
 * @desc Lấy tất cả công thức
 */
congThucManTinhController.getAll = catchAsync(async (req, res, next) => {
  const docs = await CongThucManTinh.find()
    .sort({ updatedAt: -1 })
    .populate("nguoiTao", "UserName HoTen")
    .lean();

  const result = docs.map(ensurePipeline);

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy danh sách công thức thành công",
  );
});

/**
 * @route GET /api/his/congthuc-mantinh/active
 * @desc Lấy công thức đang active (dùng cho frontend evaluate)
 */
congThucManTinhController.getActive = catchAsync(async (req, res, next) => {
  const docs = await CongThucManTinh.find({ isActive: true })
    .sort({ updatedAt: -1 })
    .populate("nguoiTao", "UserName HoTen")
    .lean();

  const result = docs.map(ensurePipeline);

  return sendResponse(
    res,
    200,
    true,
    result,
    null,
    "Lấy công thức active thành công",
  );
});

/**
 * @route POST /api/his/congthuc-mantinh
 * @desc Tạo công thức mới
 */
congThucManTinhController.create = catchAsync(async (req, res, next) => {
  const { tenCongThuc, moTa, pipeline, isActive } = req.body;

  if (!tenCongThuc) {
    throw new AppError(400, "tenCongThuc là bắt buộc", "MISSING_FIELDS");
  }

  if (!pipeline || !validatePipeline(pipeline)) {
    throw new AppError(
      400,
      "Cấu trúc pipeline không hợp lệ",
      "INVALID_PIPELINE",
    );
  }

  const doc = await CongThucManTinh.create({
    tenCongThuc,
    moTa: moTa || "",
    pipeline,
    isActive: isActive !== undefined ? isActive : true,
    nguoiTao: req.userId,
  });

  return sendResponse(res, 201, true, doc, null, "Tạo công thức thành công");
});

/**
 * @route PUT /api/his/congthuc-mantinh/:id
 * @desc Cập nhật công thức
 */
congThucManTinhController.update = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { tenCongThuc, moTa, pipeline, isActive } = req.body;

  const doc = await CongThucManTinh.findById(id);
  if (!doc) {
    throw new AppError(404, "Không tìm thấy công thức", "NOT_FOUND");
  }

  if (pipeline !== undefined) {
    if (!validatePipeline(pipeline)) {
      throw new AppError(
        400,
        "Cấu trúc pipeline không hợp lệ",
        "INVALID_PIPELINE",
      );
    }
    doc.pipeline = pipeline;
    doc.markModified("pipeline");
    // Clear legacy field
    doc.dieuKien = undefined;
    doc.markModified("dieuKien");
  }

  if (tenCongThuc !== undefined) doc.tenCongThuc = tenCongThuc;
  if (moTa !== undefined) doc.moTa = moTa;
  if (isActive !== undefined) doc.isActive = isActive;

  await doc.save();

  return sendResponse(
    res,
    200,
    true,
    doc,
    null,
    "Cập nhật công thức thành công",
  );
});

/**
 * @route DELETE /api/his/congthuc-mantinh/:id
 * @desc Xóa công thức
 */
congThucManTinhController.delete = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const doc = await CongThucManTinh.findByIdAndDelete(id);
  if (!doc) {
    throw new AppError(404, "Không tìm thấy công thức", "NOT_FOUND");
  }

  return sendResponse(res, 200, true, doc, null, "Xóa công thức thành công");
});

module.exports = congThucManTinhController;
