const {
  catchAsync,
  sendResponse,
  AppError,
  escapeRegex,
} = require("../helpers/utils");
const mongoose = require("mongoose");
const QuyTrinhISO = require("../models/QuyTrinhISO");
const QuyTrinhISO_KhoaPhanPhoi = require("../models/QuyTrinhISO_KhoaPhanPhoi");
const QuyTrinhISO_AuditLog = require("../models/QuyTrinhISO_AuditLog");
const TepTin = require("../modules/workmanagement/models/TepTin");
const path = require("path");
const fs = require("fs-extra");
const config = require("../modules/workmanagement/helpers/uploadConfig");

const controller = {};

// ==================== AUDIT LOG HELPER ====================
function logAudit(quyTrinhISOID, hanhDong, nguoiThucHienID, chiTiet) {
  // Fire-and-forget: audit logging should not block the response
  QuyTrinhISO_AuditLog.create({
    QuyTrinhISOID: quyTrinhISOID,
    HanhDong: hanhDong,
    NguoiThucHienID: nguoiThucHienID,
    ChiTiet: chiTiet,
  }).catch((err) => console.error("Audit log error:", err.message));
}

// ==================== BATCH HELPERS ====================
async function batchFileCounts(quyTrinhIds) {
  const counts = await TepTin.aggregate([
    {
      $match: {
        OwnerType: "quytrinhiso",
        OwnerID: { $in: quyTrinhIds.map(String) },
        TrangThai: "ACTIVE",
      },
    },
    {
      $group: {
        _id: { OwnerID: "$OwnerID", OwnerField: "$OwnerField" },
        count: { $sum: 1 },
      },
    },
  ]);
  return counts.reduce((acc, c) => {
    if (!acc[c._id.OwnerID]) acc[c._id.OwnerID] = { pdf: 0, word: 0 };
    if (c._id.OwnerField === "filepdf") acc[c._id.OwnerID].pdf = c.count;
    if (c._id.OwnerField === "fileword") acc[c._id.OwnerID].word = c.count;
    return acc;
  }, {});
}

async function batchDistributions(quyTrinhIds) {
  const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
    QuyTrinhISOID: { $in: quyTrinhIds },
  })
    .populate("KhoaID", "TenKhoa MaKhoa")
    .lean();
  return phanPhoi.reduce((acc, p) => {
    const key = p.QuyTrinhISOID.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(p.KhoaID);
    return acc;
  }, {});
}

// ==================== LIST ====================
controller.list = catchAsync(async (req, res) => {
  const {
    page = 1,
    size = 20,
    search,
    MaQuyTrinh,
    KhoaXayDungID,
    KhoaPhanPhoiID,
    TrangThai: filterTrangThai,
    includeDistribution,
  } = req.query;
  const currentUser = req.user;
  const isQLCL = ["qlcl", "admin", "superadmin"].includes(
    currentUser.PhanQuyen,
  );

  // Base query — QLCL thấy mọi trạng thái non-deleted, user thường chỉ thấy ACTIVE
  let query = isQLCL
    ? { IsDeleted: false }
    : { IsDeleted: false, TrangThai: "ACTIVE" };

  // QLCL có thể lọc theo TrangThai
  if (isQLCL && filterTrangThai) {
    query.TrangThai = filterTrangThai;
  }

  // Search
  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { TenQuyTrinh: { $regex: escaped, $options: "i" } },
      { MaQuyTrinh: { $regex: escaped, $options: "i" } },
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

  // Filter by KhoaPhanPhoiID (QLCL only) — find all quy trình distributed to this department
  if (KhoaPhanPhoiID && isQLCL) {
    const distributed = await QuyTrinhISO_KhoaPhanPhoi.find({
      KhoaID: KhoaPhanPhoiID,
    })
      .select("QuyTrinhISOID")
      .lean();
    const distributedIds = distributed.map((p) => p.QuyTrinhISOID);
    // Intersect with existing _id filter if present
    if (query._id) {
      const existing = query._id.$in.map(String);
      query._id = {
        $in: distributedIds.filter((id) => existing.includes(String(id))),
      };
    } else {
      query._id = { $in: distributedIds };
    }
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

  // Attach file counts using batch query (single aggregate instead of N queries)
  const ids = items.map((i) => i._id);
  const fileCountsMap = await batchFileCounts(ids);
  const itemsWithCounts = items.map((item) => ({
    ...item.toJSON(),
    _fileCounts: fileCountsMap[item._id.toString()] || { pdf: 0, word: 0 },
  }));

  // Optionally attach distribution info (QLCL only)
  let finalItems = itemsWithCounts;
  if (includeDistribution === "true" && isQLCL) {
    const itemIds = items.map((item) => item._id);
    const allPhanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
      QuyTrinhISOID: { $in: itemIds },
    })
      .populate("KhoaID", "TenKhoa MaKhoa")
      .lean();

    // Group by QuyTrinhISOID
    const phanPhoiMap = allPhanPhoi.reduce((acc, p) => {
      const key = p.QuyTrinhISOID.toString();
      if (!acc[key]) acc[key] = [];
      acc[key].push(p.KhoaID);
      return acc;
    }, {});

    finalItems = itemsWithCounts.map((item) => ({
      ...item,
      KhoaPhanPhoi: phanPhoiMap[item._id.toString()] || [],
    }));
  }

  return sendResponse(
    res,
    200,
    true,
    { items: finalItems, total, page: +page, size: +size },
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

  if (!quyTrinh || quyTrinh.IsDeleted) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  // Permission check for non-QLCL: only see ACTIVE docs they have distribution for
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

  // Input validation
  if (!TenQuyTrinh?.trim())
    throw new AppError(400, "Tên quy trình là bắt buộc", "VALIDATION_ERROR");
  if (!MaQuyTrinh?.trim())
    throw new AppError(400, "Mã quy trình là bắt buộc", "VALIDATION_ERROR");
  if (MaQuyTrinh.length > 50)
    throw new AppError(400, "Mã quy trình tối đa 50 ký tự", "VALIDATION_ERROR");
  if (!/^[A-Z0-9._-]+$/i.test(MaQuyTrinh))
    throw new AppError(
      400,
      "Mã quy trình chỉ chứa chữ cái, số, dấu chấm, gạch ngang",
      "VALIDATION_ERROR",
    );
  if (!PhienBan?.trim())
    throw new AppError(400, "Phiên bản là bắt buộc", "VALIDATION_ERROR");
  if (TenQuyTrinh.length > 500)
    throw new AppError(
      400,
      "Tên quy trình tối đa 500 ký tự",
      "VALIDATION_ERROR",
    );
  if (!KhoaXayDungID)
    throw new AppError(400, "Khoa xây dựng là bắt buộc", "VALIDATION_ERROR");
  if (!mongoose.Types.ObjectId.isValid(KhoaXayDungID))
    throw new AppError(400, "KhoaXayDungID không hợp lệ", "VALIDATION_ERROR");
  if (!NgayHieuLuc)
    throw new AppError(400, "Ngày hiệu lực là bắt buộc", "VALIDATION_ERROR");
  if (GhiChu && GhiChu.length > 2000)
    throw new AppError(400, "Ghi chú tối đa 2000 ký tự", "VALIDATION_ERROR");

  // Check duplicate MaQuyTrinh + PhienBan
  const exists = await QuyTrinhISO.exists({
    MaQuyTrinh: MaQuyTrinh.toUpperCase(),
    PhienBan,
    IsDeleted: false,
  });

  if (exists) {
    throw new AppError(
      400,
      `Mã quy trình ${MaQuyTrinh} phiên bản ${PhienBan} đã tồn tại`,
      "DUPLICATE",
    );
  }

  // Create
  let quyTrinh;
  try {
    quyTrinh = await QuyTrinhISO.create({
      TenQuyTrinh,
      MaQuyTrinh: MaQuyTrinh.toUpperCase(),
      PhienBan,
      KhoaXayDungID,
      NgayHieuLuc,
      GhiChu,
      NguoiTaoID: currentUser.userId,
    });
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(
        400,
        `Mã quy trình ${MaQuyTrinh.toUpperCase()} phiên bản ${PhienBan} đã tồn tại`,
        "DUPLICATE",
      );
    }
    throw err;
  }

  // Sync distribution
  if (KhoaPhanPhoi.length > 0) {
    await QuyTrinhISO_KhoaPhanPhoi.syncPhanPhoi(quyTrinh._id, KhoaPhanPhoi);
  }

  logAudit(quyTrinh._id, "CREATED", currentUser.userId, {
    MaQuyTrinh: quyTrinh.MaQuyTrinh,
    PhienBan: quyTrinh.PhienBan,
    TenQuyTrinh: quyTrinh.TenQuyTrinh,
  });

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
  if (!quyTrinh || quyTrinh.IsDeleted) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  // Optimistic locking via If-Unmodified-Since header
  const ifUnmodifiedSince = req.headers["if-unmodified-since"];
  if (ifUnmodifiedSince) {
    const serverVersion = quyTrinh.updatedAt?.toISOString();
    if (serverVersion && serverVersion !== ifUnmodifiedSince) {
      throw new AppError(
        409,
        "Dữ liệu đã bị thay đổi bởi người khác. Vui lòng tải lại trang.",
        "VERSION_CONFLICT",
      );
    }
  }

  // Input validation (only validate fields that are present)
  if (TenQuyTrinh !== undefined && !TenQuyTrinh?.trim())
    throw new AppError(
      400,
      "Tên quy trình không được để trống",
      "VALIDATION_ERROR",
    );
  if (TenQuyTrinh && TenQuyTrinh.length > 500)
    throw new AppError(
      400,
      "Tên quy trình tối đa 500 ký tự",
      "VALIDATION_ERROR",
    );
  if (MaQuyTrinh !== undefined && !MaQuyTrinh?.trim())
    throw new AppError(
      400,
      "Mã quy trình không được để trống",
      "VALIDATION_ERROR",
    );
  if (MaQuyTrinh && MaQuyTrinh.length > 50)
    throw new AppError(400, "Mã quy trình tối đa 50 ký tự", "VALIDATION_ERROR");
  if (MaQuyTrinh && !/^[A-Z0-9._-]+$/i.test(MaQuyTrinh))
    throw new AppError(
      400,
      "Mã quy trình chỉ chứa chữ cái, số, dấu chấm, gạch ngang",
      "VALIDATION_ERROR",
    );
  if (PhienBan !== undefined && !PhienBan?.trim())
    throw new AppError(
      400,
      "Phiên bản không được để trống",
      "VALIDATION_ERROR",
    );
  if (KhoaXayDungID && !mongoose.Types.ObjectId.isValid(KhoaXayDungID))
    throw new AppError(400, "KhoaXayDungID không hợp lệ", "VALIDATION_ERROR");
  if (GhiChu && GhiChu.length > 2000)
    throw new AppError(400, "Ghi chú tối đa 2000 ký tự", "VALIDATION_ERROR");

  // Check duplicate if changing MaQuyTrinh or PhienBan
  if (
    (MaQuyTrinh && MaQuyTrinh.toUpperCase() !== quyTrinh.MaQuyTrinh) ||
    (PhienBan && PhienBan !== quyTrinh.PhienBan)
  ) {
    const exists = await QuyTrinhISO.exists({
      _id: { $ne: id },
      MaQuyTrinh: (MaQuyTrinh || quyTrinh.MaQuyTrinh).toUpperCase(),
      PhienBan: PhienBan || quyTrinh.PhienBan,
      IsDeleted: false,
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
  try {
    await quyTrinh.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new AppError(400, "Mã + phiên bản đã tồn tại", "DUPLICATE");
    }
    throw err;
  }

  // Sync distribution if provided
  if (Array.isArray(KhoaPhanPhoi)) {
    await QuyTrinhISO_KhoaPhanPhoi.syncPhanPhoi(quyTrinh._id, KhoaPhanPhoi);
  }

  logAudit(quyTrinh._id, "UPDATED", currentUser.userId, {
    MaQuyTrinh: quyTrinh.MaQuyTrinh,
    PhienBan: quyTrinh.PhienBan,
  });

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

  quyTrinh.IsDeleted = true;
  quyTrinh.NguoiCapNhatID = req.user.userId;
  await quyTrinh.save();

  // Soft delete files
  await TepTin.updateMany(
    { OwnerType: "quytrinhiso", OwnerID: String(id) },
    { TrangThai: "DELETED" },
  );

  // Clean up distribution records
  await QuyTrinhISO_KhoaPhanPhoi.deleteMany({ QuyTrinhISOID: id });

  logAudit(id, "DELETED", req.user.userId, {
    MaQuyTrinh: quyTrinh.MaQuyTrinh,
    PhienBan: quyTrinh.PhienBan,
    TenQuyTrinh: quyTrinh.TenQuyTrinh,
  });

  return sendResponse(res, 200, true, null, null, "Xóa quy trình thành công");
});

// ==================== GET VERSIONS ====================
controller.getVersions = catchAsync(async (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;
  const isQLCL = ["qlcl", "admin", "superadmin"].includes(
    currentUser.PhanQuyen,
  );

  const current = await QuyTrinhISO.findById(id).lean();
  if (!current || current.IsDeleted) {
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

  // QLCL sees all versions, regular users only see ACTIVE versions
  const versionQuery = {
    MaQuyTrinh: current.MaQuyTrinh,
    IsDeleted: false,
  };
  if (!isQLCL) {
    versionQuery.TrangThai = "ACTIVE";
  }

  const { page = 1, limit = 20 } = req.query;

  const versions = await QuyTrinhISO.find(versionQuery)
    .populate("KhoaXayDungID", "TenKhoa")
    .sort({ PhienBan: -1 })
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .lean();

  const total = await QuyTrinhISO.countDocuments(versionQuery);

  return sendResponse(res, 200, true, { versions, total }, null, "OK");
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

  logAudit(targetId, "FILES_COPIED", currentUser.userId, {
    sourceVersionId,
    sourcePhienBan: source.PhienBan,
    copied: results.copied,
    skipped: results.skipped,
  });

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

  let baseQuery = { IsDeleted: false, TrangThai: "ACTIVE" };

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

  let query = { IsDeleted: false };

  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { TenQuyTrinh: { $regex: escaped, $options: "i" } },
      { MaQuyTrinh: { $regex: escaped, $options: "i" } },
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

  // Batch query distribution and file counts (2 queries instead of 2N)
  const itemIds = items.map((item) => item._id);
  const [distributionMap, fileCountsMap] = await Promise.all([
    batchDistributions(itemIds),
    batchFileCounts(itemIds),
  ]);

  const itemsWithDistribution = items.map((item) => {
    const key = item._id.toString();
    return {
      ...item,
      KhoaPhanPhoi: distributionMap[key] || [],
      _fileCounts: fileCountsMap[key] || { pdf: 0, word: 0 },
    };
  });

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
  if (!quyTrinh || quyTrinh.IsDeleted) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  // Sync distribution (khoa xây dựng được phép nhận phân phối)
  await QuyTrinhISO_KhoaPhanPhoi.syncPhanPhoi(
    quyTrinh._id,
    khoaPhanPhoiIds || [],
  );

  // Get updated distribution list
  const phanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({ QuyTrinhISOID: id })
    .populate("KhoaID", "TenKhoa MaKhoa")
    .lean();

  logAudit(id, "DISTRIBUTION_UPDATED", req.user.userId, {
    MaQuyTrinh: quyTrinh.MaQuyTrinh,
    PhienBan: quyTrinh.PhienBan,
    khoaPhanPhoiIds: khoaPhanPhoiIds,
  });

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
  }).select("QuyTrinhISOID createdAt");

  const allowedIds = phanPhoi.map((p) => p.QuyTrinhISOID);
  const phanPhoiMap = phanPhoi.reduce((acc, p) => {
    acc[p.QuyTrinhISOID.toString()] = p.createdAt;
    return acc;
  }, {});

  let query = {
    _id: { $in: allowedIds },
    IsDeleted: false,
    TrangThai: "ACTIVE",
  };

  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { TenQuyTrinh: { $regex: escaped, $options: "i" } },
      { MaQuyTrinh: { $regex: escaped, $options: "i" } },
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

  // Add NgayPhanPhoi and check if new (within 30 days)
  const sevenDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  // Batch query files cho tất cả quy trình (optimize: 1 query thay vì N queries)
  const quyTrinhIds = items.map((item) => item._id.toString());
  const files = await TepTin.find({
    OwnerType: "quytrinhiso",
    OwnerID: { $in: quyTrinhIds },
    TrangThai: "ACTIVE",
    OwnerField: { $in: ["filepdf", "fileword"] },
  })
    .select("OwnerID OwnerField TenFile TenGoc KichThuoc _id")
    .lean();

  // Group files by OwnerID and OwnerField
  const filesMap = files.reduce((acc, file) => {
    const key = file.OwnerID;
    if (!acc[key]) acc[key] = { pdf: null, word: null };
    if (file.OwnerField === "filepdf" && !acc[key].pdf) {
      acc[key].pdf = file;
    } else if (file.OwnerField === "fileword" && !acc[key].word) {
      acc[key].word = file;
    }
    return acc;
  }, {});

  const itemsWithInfo = items.map((item) => {
    const itemFiles = filesMap[item._id.toString()] || {};
    return {
      ...item,
      NgayPhanPhoi: phanPhoiMap[item._id.toString()],
      isNew: phanPhoiMap[item._id.toString()] > sevenDaysAgo,
      FilePDF: itemFiles.pdf || null,
      FileWord: itemFiles.word || null,
    };
  });

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

  let query = { KhoaXayDungID: currentUser.KhoaID, IsDeleted: false };

  if (search) {
    const escaped = escapeRegex(search);
    query.$or = [
      { TenQuyTrinh: { $regex: escaped, $options: "i" } },
      { MaQuyTrinh: { $regex: escaped, $options: "i" } },
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
  const itemIds = items.map((item) => item._id.toString());

  // Batch query files (1 query thay vì N)
  const files = await TepTin.find({
    OwnerType: "quytrinhiso",
    OwnerID: { $in: itemIds },
    TrangThai: "ACTIVE",
    OwnerField: { $in: ["filepdf", "fileword"] },
  })
    .select("OwnerID OwnerField TenFile TenGoc KichThuoc _id")
    .lean();

  // Group files by OwnerID
  const filesMap = files.reduce((acc, file) => {
    const key = file.OwnerID;
    if (!acc[key]) acc[key] = { pdf: null, word: null };
    if (file.OwnerField === "filepdf" && !acc[key].pdf) {
      acc[key].pdf = file;
    } else if (file.OwnerField === "fileword" && !acc[key].word) {
      acc[key].word = file;
    }
    return acc;
  }, {});

  // Batch query distribution (1 query instead of N)
  const distributionMap = await batchDistributions(itemIds);

  const itemsWithDistribution = items.map((item) => {
    const key = item._id.toString();
    const itemFiles = filesMap[key] || {};
    const distribution = distributionMap[key] || [];

    return {
      ...item,
      KhoaPhanPhoi: distribution,
      soKhoaPhanPhoi: distribution.length,
      FilePDF: itemFiles.pdf || null,
      FileWord: itemFiles.word || null,
    };
  });

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

// ==================== ACTIVATE ====================
// Phát hành quy trình: DRAFT/INACTIVE → ACTIVE
// Auto-deactivate các phiên bản khác cùng MaQuyTrinh
controller.activate = catchAsync(async (req, res) => {
  const { id } = req.params;

  const quyTrinh = await QuyTrinhISO.findById(id);
  if (!quyTrinh || quyTrinh.IsDeleted) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  if (quyTrinh.TrangThai === "ACTIVE") {
    return sendResponse(
      res,
      200,
      true,
      { quyTrinh },
      null,
      "Quy trình đang ở trạng thái ACTIVE",
    );
  }

  // Tìm phiên bản ACTIVE cũ cùng MaQuyTrinh để copy phân phối
  const oldActiveVersions = await QuyTrinhISO.find({
    MaQuyTrinh: quyTrinh.MaQuyTrinh,
    _id: { $ne: id },
    IsDeleted: false,
    TrangThai: "ACTIVE",
  }).select("_id");

  // Lấy danh sách phân phối từ phiên bản cũ (trước khi deactivate)
  let oldDistributionKhoaIds = [];
  if (oldActiveVersions.length > 0) {
    const oldPhanPhoi = await QuyTrinhISO_KhoaPhanPhoi.find({
      QuyTrinhISOID: { $in: oldActiveVersions.map((v) => v._id) },
    }).select("KhoaID");
    oldDistributionKhoaIds = [
      ...new Set(oldPhanPhoi.map((p) => p.KhoaID.toString())),
    ];
  }

  // Atomic activate — only succeeds if status hasn't changed since we checked
  const activated = await QuyTrinhISO.findOneAndUpdate(
    { _id: id, TrangThai: { $ne: "ACTIVE" }, IsDeleted: false },
    { $set: { TrangThai: "ACTIVE", NguoiCapNhatID: req.user.userId } },
    { new: true },
  );
  if (!activated) {
    throw new AppError(
      409,
      "Quy trình đã được thay đổi bởi người khác. Vui lòng tải lại trang.",
      "VERSION_CONFLICT",
    );
  }

  // Deactivate các phiên bản ACTIVE khác cùng MaQuyTrinh (sau khi activate thành công)
  await QuyTrinhISO.updateMany(
    {
      MaQuyTrinh: activated.MaQuyTrinh,
      _id: { $ne: id },
      IsDeleted: false,
      TrangThai: "ACTIVE",
    },
    { $set: { TrangThai: "INACTIVE" } },
  );

  // Auto-copy phân phối từ phiên bản cũ nếu phiên bản mới chưa có
  if (oldDistributionKhoaIds.length > 0) {
    const existingPhanPhoi = await QuyTrinhISO_KhoaPhanPhoi.countDocuments({
      QuyTrinhISOID: id,
    });
    if (existingPhanPhoi === 0) {
      await QuyTrinhISO_KhoaPhanPhoi.syncPhanPhoi(
        activated._id,
        oldDistributionKhoaIds,
      );
    }
  }

  logAudit(id, "ACTIVATED", req.user.userId, {
    MaQuyTrinh: activated.MaQuyTrinh,
    PhienBan: activated.PhienBan,
  });

  return sendResponse(
    res,
    200,
    true,
    { quyTrinh: activated },
    null,
    "Phát hành quy trình thành công. Các phiên bản cũ đã được thu hồi.",
  );
});

// ==================== DEACTIVATE ====================
// Thu hồi quy trình: ACTIVE → INACTIVE
controller.deactivate = catchAsync(async (req, res) => {
  const { id } = req.params;

  const quyTrinh = await QuyTrinhISO.findById(id);
  if (!quyTrinh || quyTrinh.IsDeleted) {
    throw new AppError(404, "Không tìm thấy quy trình", "NOT_FOUND");
  }

  if (quyTrinh.TrangThai === "INACTIVE") {
    return sendResponse(
      res,
      200,
      true,
      { quyTrinh },
      null,
      "Quy trình đã ở trạng thái INACTIVE",
    );
  }

  quyTrinh.TrangThai = "INACTIVE";
  quyTrinh.NguoiCapNhatID = req.user.userId;
  await quyTrinh.save();

  logAudit(id, "DEACTIVATED", req.user.userId, {
    MaQuyTrinh: quyTrinh.MaQuyTrinh,
    PhienBan: quyTrinh.PhienBan,
  });

  return sendResponse(
    res,
    200,
    true,
    { quyTrinh },
    null,
    "Thu hồi quy trình thành công",
  );
});

// ==================== AUDIT LOG ====================
controller.getAuditLog = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 30 } = req.query;

  const logs = await QuyTrinhISO_AuditLog.find({ QuyTrinhISOID: id })
    .populate("NguoiThucHienID", "HoTen UserName")
    .sort({ ThoiGian: -1 })
    .skip((+page - 1) * +limit)
    .limit(+limit)
    .lean();

  const total = await QuyTrinhISO_AuditLog.countDocuments({
    QuyTrinhISOID: id,
  });

  return sendResponse(
    res,
    200,
    true,
    { logs, total, page: +page, limit: +limit },
    null,
    "OK",
  );
});

module.exports = controller;
