const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const Khoa = require("../models/Khoa");
const QuyTrinhISO_KhoaPhanPhoi = require("../models/QuyTrinhISO_KhoaPhanPhoi");

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
  const { khoaIds, isISORelevant, cascade = false } = req.body;

  // Validation
  if (!Array.isArray(khoaIds) || khoaIds.length === 0) {
    throw new AppError(400, "Danh sách khoa không hợp lệ", "Bulk Update Error");
  }

  if (typeof isISORelevant !== "boolean") {
    throw new AppError(
      400,
      "Giá trị IsISORelevant phải là true hoặc false",
      "Bulk Update Error",
    );
  }

  // Cascade: xóa bản ghi phân phối khi bỏ cấu hình khoa ISO
  let deletedDistributionCount = 0;
  if (!isISORelevant && cascade) {
    const deleteResult = await QuyTrinhISO_KhoaPhanPhoi.deleteMany({
      KhoaID: { $in: khoaIds },
    });
    deletedDistributionCount = deleteResult.deletedCount;
  }

  // Bulk update using bulkWrite for performance
  const bulkOps = khoaIds.map((id) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { IsISORelevant: isISORelevant } },
    },
  }));

  const result = await Khoa.bulkWrite(bulkOps);

  // Fetch updated khoas to return
  const updatedKhoas = await Khoa.find({ _id: { $in: khoaIds } }).sort({
    STT: 1,
  });

  sendResponse(
    res,
    200,
    true,
    {
      khoas: updatedKhoas,
      modifiedCount: result.modifiedCount,
      deletedDistributionCount,
    },
    null,
    `Cập nhật ${result.modifiedCount} khoa thành công${
      deletedDistributionCount > 0
        ? `, xóa ${deletedDistributionCount} bản ghi phân phối`
        : ""
    }`,
  );
});

// Check distributions for ISO khoa before unconfiguring (QLCL only)
// GET /khoa/iso/check-distributions?khoaIds=id1,id2,...
khoaController.checkDistributions = catchAsync(async (req, res, next) => {
  const { khoaIds } = req.query;

  if (!khoaIds) {
    return sendResponse(res, 200, true, { affected: [], total: 0 }, null, "OK");
  }

  const khoaIdList = Array.isArray(khoaIds)
    ? khoaIds
    : khoaIds.split(",").filter(Boolean);

  if (khoaIdList.length === 0) {
    return sendResponse(res, 200, true, { affected: [], total: 0 }, null, "OK");
  }

  // Aggregate distribution count per khoa
  const distributions = await QuyTrinhISO_KhoaPhanPhoi.aggregate([
    {
      $match: {
        KhoaID: {
          $in: khoaIdList.map((id) =>
            require("mongoose").Types.ObjectId.createFromHexString(id),
          ),
        },
      },
    },
    { $group: { _id: "$KhoaID", soTaiLieu: { $sum: 1 } } },
  ]);

  // Get khoa names
  const khoaMap = {};
  const khoas = await Khoa.find({ _id: { $in: khoaIdList } })
    .select("_id TenKhoa MaKhoa")
    .lean();
  khoas.forEach((k) => {
    khoaMap[k._id.toString()] = k;
  });

  const affected = distributions
    .filter((d) => d.soTaiLieu > 0)
    .map((d) => ({
      khoaId: d._id,
      TenKhoa: khoaMap[d._id.toString()]?.TenKhoa || "N/A",
      MaKhoa: khoaMap[d._id.toString()]?.MaKhoa || "",
      soTaiLieu: d.soTaiLieu,
    }));

  const total = affected.reduce((sum, a) => sum + a.soTaiLieu, 0);

  return sendResponse(res, 200, true, { affected, total }, null, "OK");
});

module.exports = khoaController;
