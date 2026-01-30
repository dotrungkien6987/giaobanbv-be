const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const Khoa = require("../models/Khoa");

const khoaController = {};

// Create a new Khoa
khoaController.insertOne = catchAsync(async (req, res, next) => {
  // Get data from request
  const {
    TenKhoa,
    MaKhoa,
    LoaiKhoa,
    STT,
    HisDepartmentID,
    HisDepartmentGroupID,
    HisDepartmentType,
  } = req.body;

  // Check if MaKhoa already exists
  let existingKhoa = await Khoa.findOne({ MaKhoa });
  if (existingKhoa)
    throw new AppError(400, "Mã khoa đã tồn tại", "Insert Khoa Error");

  // Create new Khoa
  const newKhoa = await Khoa.create({
    TenKhoa,
    MaKhoa,
    LoaiKhoa,
    STT,
    HisDepartmentID,
    HisDepartmentGroupID,
    HisDepartmentType,
  });

  // Response
  sendResponse(res, 201, true, { newKhoa }, null, "Tạo khoa thành công");
});

// Get all Khoas
khoaController.getAll = catchAsync(async (req, res, next) => {
  const khoas = await Khoa.find().sort({ STT: 1 });
  sendResponse(
    res,
    200,
    true,
    { khoas },
    null,
    "Lấy danh sách khoa thành công",
  );
});

// Get ISO-relevant Khoas only
khoaController.getISORelevant = catchAsync(async (req, res, next) => {
  const khoas = await Khoa.find({ IsISORelevant: true }).sort({ STT: 1 });
  sendResponse(
    res,
    200,
    true,
    { khoas },
    null,
    "Lấy danh sách khoa liên quan ISO thành công",
  );
});

// Get Khoa with pagination
khoaController.getKhoasPhanTrang = catchAsync(async (req, res, next) => {
  let { page, limit, TenKhoa, LoaiKhoa, ...filter } = { ...req.query };
  page = parseInt(page) || 1;
  limit = parseInt(limit) || 300;

  const filterConditions = [];

  if (TenKhoa) {
    filterConditions.push({
      TenKhoa: { $regex: TenKhoa, $options: "i" },
    });
  }

  if (LoaiKhoa) {
    filterConditions.push({
      LoaiKhoa: LoaiKhoa,
    });
  }

  const filterCriteria = filterConditions.length
    ? { $and: filterConditions }
    : {};

  const count = await Khoa.countDocuments(filterCriteria);
  const totalPages = Math.ceil(count / limit);
  const offset = limit * (page - 1);

  const khoas = await Khoa.find(filterCriteria)
    .sort({ STT: 1 })
    .skip(offset)
    .limit(limit);

  sendResponse(
    res,
    200,
    true,
    { khoas, totalPages, count },
    null,
    "Lấy danh sách khoa thành công",
  );
});

// Get a single Khoa by ID
khoaController.getById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const khoa = await Khoa.findById(id);
  if (!khoa) throw new AppError(404, "Không tìm thấy khoa", "Get Khoa Error");
  sendResponse(res, 200, true, { khoa }, null, "Lấy thông tin khoa thành công");
});

// Update a Khoa by ID
khoaController.updateOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  // Kiểm tra xem khoa cần update có tồn tại không
  const khoa = await Khoa.findById(id);
  if (!khoa)
    throw new AppError(404, "Không tìm thấy khoa", "Update Khoa Error");
  console.log("updateData", updateData);
  console.log("khoa", khoa);
  // Nếu đang cập nhật MaKhoa và MaKhoa đã thay đổi
  if (updateData.MaKhoa && updateData.MaKhoa !== khoa.MaKhoa) {
    // Kiểm tra xem MaKhoa mới đã tồn tại chưa
    const existingKhoa = await Khoa.findOne({ MaKhoa: updateData.MaKhoa });
    if (existingKhoa)
      throw new AppError(400, "Mã khoa đã tồn tại 1", "Update Khoa Error");
  }

  // Cập nhật khoa
  const updatedKhoa = await Khoa.findByIdAndUpdate(id, updateData, {
    new: true,
  });

  sendResponse(
    res,
    200,
    true,
    { updatedKhoa },
    null,
    "Cập nhật khoa thành công",
  );
});

// Delete a Khoa by ID
khoaController.deleteOne = catchAsync(async (req, res, next) => {
  const { id } = req.params;

  const deletedKhoa = await Khoa.findByIdAndDelete(id);
  if (!deletedKhoa)
    throw new AppError(404, "Không tìm thấy khoa", "Delete Khoa Error");

  sendResponse(res, 200, true, { deletedKhoa }, null, "Xóa khoa thành công");
});

// Bulk update IsISORelevant for multiple Khoas (QLCL only)
khoaController.bulkUpdateISO = catchAsync(async (req, res, next) => {
  console.log(
    "🔍 bulkUpdateISO called - req.body:",
    JSON.stringify(req.body, null, 2),
  );

  const { khoaIds, isISORelevant } = req.body;

  console.log("🔍 khoaIds:", khoaIds);
  console.log(
    "🔍 khoaIds type:",
    typeof khoaIds,
    "isArray:",
    Array.isArray(khoaIds),
  );
  console.log("🔍 isISORelevant:", isISORelevant);
  console.log("🔍 isISORelevant type:", typeof isISORelevant);

  // Validation
  if (!Array.isArray(khoaIds) || khoaIds.length === 0) {
    console.error("❌ Validation failed: khoaIds not array or empty");
    throw new AppError(400, "Danh sách khoa không hợp lệ", "Bulk Update Error");
  }

  if (typeof isISORelevant !== "boolean") {
    console.error("❌ Validation failed: isISORelevant not boolean");
    throw new AppError(
      400,
      "Giá trị IsISORelevant phải là true hoặc false",
      "Bulk Update Error",
    );
  }

  console.log("✅ Validation passed, executing bulkWrite...");

  // Bulk update using bulkWrite for performance
  const bulkOps = khoaIds.map((id) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { IsISORelevant: isISORelevant } },
    },
  }));

  const result = await Khoa.bulkWrite(bulkOps);

  console.log("✅ bulkWrite result:", result);

  // Fetch updated khoas to return
  const updatedKhoas = await Khoa.find({ _id: { $in: khoaIds } }).sort({
    STT: 1,
  });

  sendResponse(
    res,
    200,
    true,
    { khoas: updatedKhoas, modifiedCount: result.modifiedCount },
    null,
    `Cập nhật ${result.modifiedCount} khoa thành công`,
  );
});

module.exports = khoaController;
