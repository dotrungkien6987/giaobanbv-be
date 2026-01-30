const { catchAsync, sendResponse, AppError } = require("../helpers/utils");
const QuyTrinhISO = require("../models/QuyTrinhISO");
const QuyTrinhISO_KhoaPhanPhoi = require("../models/QuyTrinhISO_KhoaPhanPhoi");
const TepTin = require("../modules/workmanagement/models/TepTin");
const path = require("path");
const fs = require("fs-extra");
const config = require("../modules/workmanagement/helpers/uploadConfig");

const controller = {};

// ==================== LIST ====================
controller.list = catchAsync(async (req, res) => {
  const { page = 1, size = 20, search, MaQuyTrinh, KhoaXayDungID } = req.query;
  const currentUser = req.user;
  const isQLCL = ["qlcl", "admin", "superadmin"].includes(
    currentUser.PhanQuyen,
  );

  // Base query
  let query = { TrangThai: "ACTIVE" };

  // Search
  if (search) {
    query.$or = [
      { TenQuyTrinh: { $regex: search, $options: "i" } },
      { MaQuyTrinh: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by MaQuyTrinh (for version listing)
  if (MaQuyTrinh) {
    query.MaQuyTrinh = MaQuyTrinh;
  }

  // Filter by KhoaXayDungID
  if (KhoaXayDungID) {
    query.KhoaXayDungID = KhoaXayDungID;
  }

  // Permission: Non-QLCL only sees distributed documents
  if (!isQLCL) {
    if (!currentUser.KhoaID) {
      // User không có khoa → không thấy gì
      return sendResponse(
        res,
        200,
        true,
        { items: [], total: 0, page, size },
        null,
        "OK",
      );
    }

    const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
      KhoaID: currentUser.KhoaID,
    }).select("QuyTrinhISOID");

    const allowedIds = phanPhoi.map((p) => p.QuyTrinhISOID);
    query._id = { $in: allowedIds };
  }

  // Pagination
  const skip = (Math.max(1, +page) - 1) * Math.max(1, +size);

  const [items, total] = await Promise.all([
    QuyTrinhISO.find(query)
      .populate("KhoaXayDungID", "TenKhoa MaKhoa")
      .populate("NguoiTaoID", "HoTen Email")
      .sort({ NgayHieuLuc: -1, PhienBan: -1 })
      .skip(skip)
      .limit(+size),
    QuyTrinhISO.countDocuments(query),
  ]);

  // Attach file counts using instance method
  const itemsWithCounts = await Promise.all(
    items.map(async (item) => ({
      ...item.toJSON(),
      _fileCounts: await item.getFileCounts(),
    })),
  );

  return sendResponse(
    res,
    200,
    true,
    { items: itemsWithCounts, total, page: +page, size: +size },
    null,
    "OK",
  );
});

// ==================== DETAIL ====================
controller.detail = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;
  const isQLCL = ["qlcl", "admin", "superadmin"].includes(
    currentUser.PhanQuyen,
  );

  const quyTrinh = await QuyTrinhISO.findById(id)
    .populate("KhoaXayDungID", "TenKhoa MaKhoa")
    .populate("NguoiTaoID", "HoTen Email")
    .populate("NguoiCapNhatID", "HoTen Email");

  if (!quyTrinh || quyTrinh.TrangThai === "DELETED") {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  // Permission check for non-QLCL
  if (!isQLCL) {
    const hasAccess = await QuyTrinhISO_KhoaPhanPhoi.exists({
      QuyTrinhISOID: id,
      KhoaID: currentUser.KhoaID,
    });
    if (!hasAccess) {
      throw new AppError(403, "Không có quyền xem quy trình này", "FORBIDDEN");
    }
  }

  // Get distribution list
  const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({ QuyTrinhISOID: id })
    .populate("KhoaID", "TenKhoa MaKhoa")
    .lean();

  // Get files using instance method
  const files = await quyTrinh.getFilesByType();

  return sendResponse(
    res,
    200,
    true,
    {
      quyTrinh: quyTrinh.toJSON(),
      danhSachKhoaPhanPhoi: phanPhoi.map((p) => p.KhoaID),
      files,
    },
    null,
    "OK",
  );
});

// ==================== CREATE ====================
controller.create = catchAsync(async (req, res) => {
  const {
    TenQuyTrinh,
    MaQuyTrinh,
    PhienBan,
    KhoaXayDungID,
    NgayHieuLuc,
    GhiChu,
    KhoaPhanPhoi = [],
  } = req.body;
  const currentUser = req.user;

  // Check duplicate MaQuyTrinh + PhienBan
  const exists = await QuyTrinhISO.exists({
    MaQuyTrinh: MaQuyTrinh.toUpperCase(),
    PhienBan,
    TrangThai: "ACTIVE",
  });

  if (exists) {
    throw new AppError(
      400,
      `Mã quy trình ${MaQuyTrinh} phiên bản ${PhienBan} đã tồn tại`,
      "DUPLICATE",
    );
  }

  // Create
  const quyTrinh = await QuyTrinhISO.create({
    TenQuyTrinh,
    MaQuyTrinh: MaQuyTrinh.toUpperCase(),
    PhienBan,
    KhoaXayDungID,
    NgayHieuLuc,
    GhiChu,
    NguoiTaoID: currentUser.userId,
  });

  // Sync distribution
  if (KhoaPhanPhoi.length > 0) {
    await QuyTrinhISO_KhoaPhanPhoi.syncPhanPhoi(quyTrinh._id, KhoaPhanPhoi);
  }

  return sendResponse(
    res,
    201,
    true,
    { quyTrinh },
    null,
    "Tạo quy trình thành công. Vui lòng upload file PDF.",
  );
});

// ==================== UPDATE ====================
controller.update = catchAsync(async (req, res) => {
  const { id } = req.params;
  const {
    TenQuyTrinh,
    MaQuyTrinh,
    PhienBan,
    KhoaXayDungID,
    NgayHieuLuc,
    GhiChu,
    KhoaPhanPhoi,
  } = req.body;
  const currentUser = req.user;

  const quyTrinh = await QuyTrinhISO.findById(id);
  if (!quyTrinh || quyTrinh.TrangThai === "DELETED") {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  // Check duplicate if changing MaQuyTrinh or PhienBan
  if (
    (MaQuyTrinh && MaQuyTrinh.toUpperCase() !== quyTrinh.MaQuyTrinh) ||
    (PhienBan && PhienBan !== quyTrinh.PhienBan)
  ) {
    const exists = await QuyTrinhISO.exists({
      _id: { $ne: id },
      MaQuyTrinh: (MaQuyTrinh || quyTrinh.MaQuyTrinh).toUpperCase(),
      PhienBan: PhienBan || quyTrinh.PhienBan,
      TrangThai: "ACTIVE",
    });

    if (exists) {
      throw new AppError(400, "Mã + phiên bản đã tồn tại", "DUPLICATE");
    }
  }

  // Update fields
  if (TenQuyTrinh) quyTrinh.TenQuyTrinh = TenQuyTrinh;
  if (MaQuyTrinh) quyTrinh.MaQuyTrinh = MaQuyTrinh.toUpperCase();
  if (PhienBan) quyTrinh.PhienBan = PhienBan;
  if (KhoaXayDungID) quyTrinh.KhoaXayDungID = KhoaXayDungID;
  if (NgayHieuLuc) quyTrinh.NgayHieuLuc = NgayHieuLuc;
  if (GhiChu !== undefined) quyTrinh.GhiChu = GhiChu;

  quyTrinh.NguoiCapNhatID = currentUser.userId;
  await quyTrinh.save();

  // Sync distribution if provided
  if (Array.isArray(KhoaPhanPhoi)) {
    await QuyTrinhISO_KhoaPhanPhoi.syncPhanPhoi(quyTrinh._id, KhoaPhanPhoi);
  }

  return sendResponse(
    res,
    200,
    true,
    { quyTrinh },
    null,
    "Cập nhật thành công",
  );
});

// ==================== DELETE (SOFT) ====================
controller.delete = catchAsync(async (req, res) => {
  const { id } = req.params;

  const quyTrinh = await QuyTrinhISO.findById(id);
  if (!quyTrinh) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  quyTrinh.TrangThai = "DELETED";
  quyTrinh.NguoiCapNhatID = req.user.userId;
  await quyTrinh.save();

  // Soft delete files
  await TepTin.updateMany(
    { OwnerType: "quytrinhiso", OwnerID: String(id) },
    { TrangThai: "DELETED" },
  );

  return sendResponse(res, 200, true, null, null, "Xóa quy trình thành công");
});

// ==================== GET VERSIONS ====================
controller.getVersions = catchAsync(async (req, res) => {
  const { id } = req.params;

  const current = await QuyTrinhISO.findById(id).lean();
  if (!current) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  const versions = await QuyTrinhISO.find({
    MaQuyTrinh: current.MaQuyTrinh,
    TrangThai: "ACTIVE",
  })
    .populate("KhoaXayDungID", "TenKhoa")
    .sort({ PhienBan: -1 })
    .lean();

  return sendResponse(res, 200, true, { versions }, null, "OK");
});

// ==================== COPY FILES FROM VERSION ====================
controller.copyFilesFromVersion = catchAsync(async (req, res) => {
  const { id: targetId, sourceVersionId } = req.params;
  const { field } = req.query; // "fileword" hoặc không truyền = tất cả
  const currentUser = req.user;

  // Validate
  const [target, source] = await Promise.all([
    QuyTrinhISO.findById(targetId),
    QuyTrinhISO.findById(sourceVersionId),
  ]);

  if (!target || !source) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  if (target.MaQuyTrinh !== source.MaQuyTrinh) {
    throw new AppError(
      400,
      "Chỉ copy giữa các phiên bản cùng mã quy trình",
      "INVALID_VERSION",
    );
  }

  // Get source files
  const query = {
    OwnerType: "quytrinhiso",
    OwnerID: String(sourceVersionId),
    TrangThai: "ACTIVE",
  };
  if (field) {
    query.OwnerField = String(field).toLowerCase();
  }

  const sourceFiles = await TepTin.find(query).lean();

  if (sourceFiles.length === 0) {
    return sendResponse(
      res,
      200,
      true,
      { copied: 0, skipped: 0, errors: [] },
      null,
      "Không có file để copy",
    );
  }

  // Copy files
  const results = { copied: 0, skipped: 0, errors: [] };

  for (const sourceFile of sourceFiles) {
    try {
      const sourcePath = path.join(config.UPLOAD_DIR, sourceFile.DuongDan);

      // Check source exists
      const exists = await fs.pathExists(sourcePath);
      if (!exists) {
        results.skipped++;
        results.errors.push({
          fileId: sourceFile._id,
          error: "File không tồn tại trên disk",
        });
        continue;
      }

      // Create destination path
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const destFolder = path.join(
        config.UPLOAD_DIR,
        "attachments",
        "quytrinhiso",
        String(targetId),
        sourceFile.OwnerField,
        String(yyyy),
        mm,
      );
      await fs.ensureDir(destFolder);

      // New filename
      const ext = path.extname(sourceFile.TenFile);
      const newFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
      const destPath = path.join(destFolder, newFileName);

      // Copy physical file
      await fs.copyFile(sourcePath, destPath);

      // Create TepTin record
      const relativePath = path.relative(config.UPLOAD_DIR, destPath);
      await TepTin.create({
        TenFile: newFileName,
        TenGoc: sourceFile.TenGoc,
        LoaiFile: sourceFile.LoaiFile,
        KichThuoc: sourceFile.KichThuoc,
        DuongDan: relativePath,
        OwnerType: "quytrinhiso",
        OwnerID: String(targetId),
        OwnerField: sourceFile.OwnerField,
        NguoiTaiLenID: currentUser.NhanVienID,
        MoTa: `Copy từ phiên bản ${source.PhienBan}`,
        TrangThai: "ACTIVE",
      });

      results.copied++;
    } catch (error) {
      results.skipped++;
      results.errors.push({ fileId: sourceFile._id, error: error.message });
    }
  }

  return sendResponse(
    res,
    200,
    true,
    results,
    null,
    `Đã copy ${results.copied} file${
      results.skipped > 0 ? `, bỏ qua ${results.skipped} file` : ""
    }`,
  );
});

// ==================== STATISTICS (Dashboard) ====================
controller.getStatistics = catchAsync(async (req, res) => {
  const currentUser = req.user;
  const isQLCL = ["qlcl", "admin", "superadmin"].includes(
    currentUser.PhanQuyen,
  );

  let baseQuery = { TrangThai: "ACTIVE" };

  // Permission filter
  if (!isQLCL && currentUser.KhoaID) {
    const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
      KhoaID: currentUser.KhoaID,
    }).select("QuyTrinhISOID");
    const allowedIds = phanPhoi.map((p) => p.QuyTrinhISOID);
    baseQuery._id = { $in: allowedIds };
  }

  // Get all matching document IDs for file counting
  const matchingDocs = await QuyTrinhISO.find(baseQuery).select("_id").lean();
  const docIds = matchingDocs.map((d) => String(d._id));

  // Statistics
  const [
    totalDocuments,
    uniqueProcesses,
    byDepartment,
    recentDocsCount,
    recentDocuments,
    fileCounts,
  ] = await Promise.all([
    QuyTrinhISO.countDocuments(baseQuery),
    QuyTrinhISO.distinct("MaQuyTrinh", baseQuery).then((arr) => arr.length),
    QuyTrinhISO.aggregate([
      { $match: baseQuery },
      { $group: { _id: "$KhoaXayDungID", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "khoas",
          localField: "_id",
          foreignField: "_id",
          as: "khoa",
        },
      },
      { $unwind: "$khoa" },
      { $project: { TenKhoa: "$khoa.TenKhoa", count: 1 } },
      { $sort: { count: -1 } },
    ]),
    QuyTrinhISO.countDocuments({
      ...baseQuery,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }),
    // Recent documents list (newest 10)
    QuyTrinhISO.find(baseQuery)
      .select("MaQuyTrinh TenQuyTrinh PhienBan updatedAt")
      .populate("KhoaXayDungID", "TenKhoa")
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean(),
    // File counts by type
    TepTin.aggregate([
      {
        $match: {
          OwnerType: "quytrinhiso",
          OwnerID: { $in: docIds },
          TrangThai: "ACTIVE",
        },
      },
      {
        $group: {
          _id: "$OwnerField",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  // Parse file counts
  const totalPDFFiles = fileCounts.find((f) => f._id === "filepdf")?.count || 0;
  const totalWordFiles =
    fileCounts.find((f) => f._id === "fileword")?.count || 0;

  return sendResponse(
    res,
    200,
    true,
    {
      summary: {
        totalDocuments,
        uniqueProcesses,
        recentDocsCount,
        totalPDFFiles,
        totalWordFiles,
      },
      byDepartment,
      recentDocuments,
    },
    null,
    "OK",
  );
});

// ==================== DISTRIBUTION MANAGEMENT ====================

// Get Distribution List (QLCL only)
controller.getDistributionList = catchAsync(async (req, res) => {
  const { search, khoaXayDungId, page = 1, limit = 20 } = req.query;

  let query = { TrangThai: "ACTIVE" };

  if (search) {
    query.$or = [
      { TenQuyTrinh: { $regex: search, $options: "i" } },
      { MaQuyTrinh: { $regex: search, $options: "i" } },
    ];
  }

  if (khoaXayDungId) {
    query.KhoaXayDungID = khoaXayDungId;
  }

  const skip = (Math.max(1, +page) - 1) * Math.max(1, +limit);

  const [items, total] = await Promise.all([
    QuyTrinhISO.find(query)
      .populate("KhoaXayDungID", "TenKhoa MaKhoa")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(+limit)
      .lean(),
    QuyTrinhISO.countDocuments(query),
  ]);

  // Get distribution info for each quy trinh
  const itemsWithDistribution = await Promise.all(
    items.map(async (item) => {
      const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
        QuyTrinhISOID: item._id,
      })
        .populate("KhoaID", "TenKhoa MaKhoa")
        .lean();

      // Get file counts
      const fileCounts = await TepTin.aggregate([
        {
          $match: {
            OwnerType: "quytrinhiso",
            OwnerID: String(item._id),
            TrangThai: "ACTIVE",
          },
        },
        { $group: { _id: "$OwnerField", count: { $sum: 1 } } },
      ]);

      return {
        ...item,
        KhoaPhanPhoi: phanPhoi.map((p) => p.KhoaID),
        _fileCounts: {
          pdf: fileCounts.find((f) => f._id === "filepdf")?.count || 0,
          word: fileCounts.find((f) => f._id === "fileword")?.count || 0,
        },
      };
    }),
  );

  return sendResponse(
    res,
    200,
    true,
    {
      items: itemsWithDistribution,
      total,
      page: +page,
      totalPages: Math.ceil(total / +limit),
    },
    null,
    "Lấy danh sách phân phối thành công",
  );
});

// Update Distribution (QLCL only)
controller.updateDistribution = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { khoaPhanPhoiIds } = req.body; // Array of khoa IDs

  const quyTrinh = await QuyTrinhISO.findById(id);
  if (!quyTrinh || quyTrinh.TrangThai === "DELETED") {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  // Validate: không tự phân phối cho khoa xây dựng
  const filteredIds = (khoaPhanPhoiIds || []).filter(
    (khoaId) => khoaId.toString() !== quyTrinh.KhoaXayDungID.toString(),
  );

  // Sync distribution
  await QuyTrinhISO_KhoaPhanPhoi.syncPhanPhoi(quyTrinh._id, filteredIds);

  // Get updated distribution list
  const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({ QuyTrinhISOID: id })
    .populate("KhoaID", "TenKhoa MaKhoa")
    .lean();

  return sendResponse(
    res,
    200,
    true,
    {
      quyTrinh: quyTrinh.toJSON(),
      KhoaPhanPhoi: phanPhoi.map((p) => p.KhoaID),
    },
    null,
    "Cập nhật phân phối thành công",
  );
});

// Get Distributed To Me (documents distributed to user's department)
controller.getDistributedToMe = catchAsync(async (req, res) => {
  const { search, khoaXayDungId, page = 1, limit = 20 } = req.query;
  const currentUser = req.user;

  if (!currentUser.KhoaID) {
    return sendResponse(
      res,
      200,
      true,
      { items: [], total: 0, page: 1, totalPages: 0 },
      null,
      "OK",
    );
  }

  // Get all quy trinh IDs distributed to this khoa
  const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
    KhoaID: currentUser.KhoaID,
  }).select("QuyTrinhISOID NgayPhanPhoi");

  const allowedIds = phanPhoi.map((p) => p.QuyTrinhISOID);
  const phanPhoiMap = phanPhoi.reduce((acc, p) => {
    acc[p.QuyTrinhISOID.toString()] = p.NgayPhanPhoi;
    return acc;
  }, {});

  let query = { _id: { $in: allowedIds }, TrangThai: "ACTIVE" };

  if (search) {
    query.$or = [
      { TenQuyTrinh: { $regex: search, $options: "i" } },
      { MaQuyTrinh: { $regex: search, $options: "i" } },
    ];
  }

  if (khoaXayDungId) {
    query.KhoaXayDungID = khoaXayDungId;
  }

  const skip = (Math.max(1, +page) - 1) * Math.max(1, +limit);

  const [items, total] = await Promise.all([
    QuyTrinhISO.find(query)
      .populate("KhoaXayDungID", "TenKhoa MaKhoa")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(+limit)
      .lean(),
    QuyTrinhISO.countDocuments(query),
  ]);

  // Add NgayPhanPhoi and check if new (within 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const itemsWithInfo = items.map((item) => ({
    ...item,
    NgayPhanPhoi: phanPhoiMap[item._id.toString()],
    isNew: phanPhoiMap[item._id.toString()] > sevenDaysAgo,
  }));

  return sendResponse(
    res,
    200,
    true,
    {
      items: itemsWithInfo,
      total,
      page: +page,
      totalPages: Math.ceil(total / +limit),
    },
    null,
    "Lấy danh sách quy trình được phân phối thành công",
  );
});

// Get Built By My Dept (documents created by user's department)
controller.getBuiltByMyDept = catchAsync(async (req, res) => {
  const { search, page = 1, limit = 20 } = req.query;
  const currentUser = req.user;

  if (!currentUser.KhoaID) {
    return sendResponse(
      res,
      200,
      true,
      { items: [], total: 0, page: 1, totalPages: 0 },
      null,
      "OK",
    );
  }

  let query = { KhoaXayDungID: currentUser.KhoaID, TrangThai: "ACTIVE" };

  if (search) {
    query.$or = [
      { TenQuyTrinh: { $regex: search, $options: "i" } },
      { MaQuyTrinh: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (Math.max(1, +page) - 1) * Math.max(1, +limit);

  const [items, total] = await Promise.all([
    QuyTrinhISO.find(query)
      .populate("KhoaXayDungID", "TenKhoa MaKhoa")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(+limit)
      .lean(),
    QuyTrinhISO.countDocuments(query),
  ]);

  // Get distribution count for each
  const itemsWithDistribution = await Promise.all(
    items.map(async (item) => {
      const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
        QuyTrinhISOID: item._id,
      })
        .populate("KhoaID", "TenKhoa MaKhoa")
        .lean();

      return {
        ...item,
        KhoaPhanPhoi: phanPhoi.map((p) => p.KhoaID),
        soKhoaPhanPhoi: phanPhoi.length,
      };
    }),
  );

  return sendResponse(
    res,
    200,
    true,
    {
      items: itemsWithDistribution,
      total,
      page: +page,
      totalPages: Math.ceil(total / +limit),
    },
    null,
    "Lấy danh sách quy trình khoa xây dựng thành công",
  );
});

module.exports = controller;
