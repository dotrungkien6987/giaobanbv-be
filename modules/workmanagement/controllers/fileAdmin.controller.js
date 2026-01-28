const path = require("path");
const fsp = require("fs/promises");
const fs = require("fs");
const mime = require("mime-types");
const { catchAsync, sendResponse } = require("../../../helpers/utils");
const TepTin = require("../models/TepTin");
const config = require("../helpers/uploadConfig");
const fileService = require("../services/file.service");

function toDTO(doc) {
  return fileService.toDTO(doc);
}

const controller = {};

controller.list = catchAsync(async (req, res) => {
  const {
    page = 1,
    size = 50,
    q,
    TrangThai,
    LoaiFile,
    OwnerType,
    OwnerID,
    OwnerField,
    NguoiTaiLenID,
    sort = "-NgayTaiLen",
  } = req.query;

  const filter = {};
  if (TrangThai) filter.TrangThai = TrangThai;
  if (LoaiFile) filter.LoaiFile = LoaiFile;
  if (OwnerType) filter.OwnerType = OwnerType;
  if (OwnerID) filter.OwnerID = OwnerID;
  if (OwnerField) filter.OwnerField = OwnerField;
  if (NguoiTaiLenID) filter.NguoiTaiLenID = NguoiTaiLenID;
  if (q) {
    filter.$or = [
      { TenGoc: { $regex: q, $options: "i" } },
      { MoTa: { $regex: q, $options: "i" } },
    ];
  }

  const pageNum = Math.max(1, parseInt(page));
  const sizeNum = Math.max(1, parseInt(size));
  const skip = (pageNum - 1) * sizeNum;

  const [items, total] = await Promise.all([
    TepTin.find(filter)
      .populate("NguoiTaiLenID", "Ten HoTen MaNhanVien AnhDaiDien")
      .sort(sort)
      .skip(skip)
      .limit(sizeNum),
    TepTin.countDocuments(filter),
  ]);

  return sendResponse(
    res,
    200,
    true,
    {
      items: items.map((d) => ({
        ...toDTO(d),
        adminInlineUrl: `/api/workmanagement/admin/files/${d._id}/inline`,
        adminDownloadUrl: `/api/workmanagement/admin/files/${d._id}/download`,
      })),
      page: pageNum,
      size: sizeNum,
      total,
      totalPages: Math.ceil(total / sizeNum) || 1,
    },
    null,
    "Lấy danh sách tệp (admin) thành công",
  );
});

controller.stats = catchAsync(async (req, res) => {
  const [byType, sizeStatsArr, statusCounts] = await Promise.all([
    TepTin.thongKeTheoLoaiFile(),
    TepTin.thongKeKichThuoc(),
    TepTin.aggregate([
      {
        $group: {
          _id: "$TrangThai",
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const sizeStats = (sizeStatsArr && sizeStatsArr[0]) || {
    tongKichThuoc: 0,
    soLuongFile: 0,
    kichThuocTrungBinh: 0,
  };

  // Derive counts for clarity on UI (ACTIVE-only vs total)
  const countsMap = Object.fromEntries(
    (statusCounts || []).map((x) => [x._id || "UNKNOWN", x.count || 0]),
  );
  const activeCount = countsMap["ACTIVE"] || 0;
  const deletedCount = countsMap["DELETED"] || 0;
  const totalCount = activeCount + deletedCount;

  return sendResponse(
    res,
    200,
    true,
    {
      byType,
      sizeStats,
      counts: { active: activeCount, deleted: deletedCount, total: totalCount },
    },
    null,
    "Thống kê tệp (admin) thành công",
  );
});

controller.tree = catchAsync(async (req, res) => {
  const { by = "owner" } = req.query;
  if (by === "owner") {
    const rows = await TepTin.aggregate([
      { $match: {} },
      {
        $group: {
          _id: {
            OwnerType: "$OwnerType",
            OwnerID: "$OwnerID",
            OwnerField: "$OwnerField",
          },
          count: { $sum: 1 },
          size: { $sum: "$KichThuoc" },
        },
      },
      { $sort: { "_id.OwnerType": 1, "_id.OwnerID": 1, "_id.OwnerField": 1 } },
    ]);
    return sendResponse(res, 200, true, rows, null, "Cây theo owner");
  }

  // Build tree by path (DuongDan)
  const all = await TepTin.find({}, "DuongDan KichThuoc").lean();
  const tree = { count: 0, size: 0, children: {} };
  for (const f of all) {
    const parts = String(f.DuongDan || "")
      .split("/")
      .filter(Boolean);
    let cur = tree;
    cur.count += 1;
    cur.size += f.KichThuoc || 0;
    for (const p of parts) {
      cur.children[p] = cur.children[p] || { count: 0, size: 0, children: {} };
      cur = cur.children[p];
      cur.count += 1;
      cur.size += f.KichThuoc || 0;
    }
  }
  return sendResponse(res, 200, true, tree, null, "Cây theo đường dẫn");
});

controller.restore = catchAsync(async (req, res) => {
  const { id } = req.params;
  const doc = await TepTin.findById(id);
  if (!doc)
    return sendResponse(
      res,
      404,
      false,
      null,
      "NOT_FOUND",
      "Không tìm thấy tệp",
    );
  doc.TrangThai = "ACTIVE";
  await doc.save();
  return sendResponse(
    res,
    200,
    true,
    {
      ...toDTO(doc),
      adminInlineUrl: `/api/workmanagement/admin/files/${doc._id}/inline`,
      adminDownloadUrl: `/api/workmanagement/admin/files/${doc._id}/download`,
    },
    null,
    "Phục hồi tệp thành công",
  );
});

controller.delete = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { force } = req.query;
  const doc = await TepTin.findById(id);
  if (!doc)
    return sendResponse(
      res,
      404,
      false,
      null,
      "NOT_FOUND",
      "Không tìm thấy tệp",
    );

  if (String(force) === "1") {
    const abs = config.toAbs(doc.DuongDan);
    try {
      await fsp.unlink(abs);
    } catch (e) {
      // ignore if file not found
    }
    await TepTin.deleteOne({ _id: id });
    return sendResponse(res, 200, true, null, null, "Đã xóa vĩnh viễn");
  }

  doc.TrangThai = "DELETED";
  await doc.save();
  return sendResponse(
    res,
    200,
    true,
    {
      ...toDTO(doc),
      adminInlineUrl: `/api/workmanagement/admin/files/${doc._id}/inline`,
      adminDownloadUrl: `/api/workmanagement/admin/files/${doc._id}/download`,
    },
    null,
    "Đã xóa mềm tệp",
  );
});

controller.cleanup = catchAsync(async (req, res) => {
  const { fix } = req.query;
  const all = await TepTin.find({}, "DuongDan TrangThai").lean();
  let missingOnDisk = 0;
  let markedDeleted = 0;
  for (const f of all) {
    const abs = config.toAbs(f.DuongDan);
    const exists = await fsp
      .stat(abs)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      missingOnDisk += 1;
      if (String(fix) === "1" && f.TrangThai !== "DELETED") {
        await TepTin.updateOne(
          { _id: f._id },
          { $set: { TrangThai: "DELETED" } },
        );
        markedDeleted += 1;
      }
    }
  }
  return sendResponse(
    res,
    200,
    true,
    {
      total: all.length,
      missingOnDisk,
      markedDeleted,
      fixed: String(fix) === "1",
    },
    null,
    "Dọn dẹp xong",
  );
});

// =============== ORPHANED FILES MANAGEMENT ===============

/**
 * GET /files/orphaned - Preview files đã xóa mềm (DELETED) có thể xóa vĩnh viễn
 * Query params:
 *   - retentionDays: số ngày giữ lại (mặc định 90)
 *   - page, limit: phân trang
 */
controller.getOrphanedFiles = catchAsync(async (req, res) => {
  const { retentionDays = 90, page = 1, limit = 50 } = req.query;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(retentionDays));

  const query = {
    TrangThai: "DELETED",
    updatedAt: { $lt: cutoff },
  };

  const [files, total, totalSizeAgg] = await Promise.all([
    TepTin.find(query)
      .select(
        "TenGoc TenFile KichThuoc updatedAt DuongDan NguoiTaiLenID LoaiFile",
      )
      .populate("NguoiTaiLenID", "HoTen MaNhanVien")
      .sort({ updatedAt: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean(),
    TepTin.countDocuments(query),
    TepTin.aggregate([
      { $match: query },
      { $group: { _id: null, total: { $sum: "$KichThuoc" } } },
    ]),
  ]);

  const totalSize = totalSizeAgg[0]?.total || 0;

  return sendResponse(
    res,
    200,
    true,
    {
      files: files.map((f) => ({
        ...f,
        NguoiTaiLen: f.NguoiTaiLenID,
      })),
      total,
      totalSize,
      totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
      page: parseInt(page),
      limit: parseInt(limit),
      retentionDays: parseInt(retentionDays),
    },
    null,
    `Tìm thấy ${total} files có thể dọn dẹp`,
  );
});

/**
 * POST /files/orphaned/delete - Xóa vĩnh viễn files đã DELETED cũ
 * Body: { retentionDays, maxFiles }
 */
controller.deleteOrphanedFiles = catchAsync(async (req, res) => {
  const { retentionDays = 90, maxFiles = 1000 } = req.body;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(retentionDays));

  const files = await TepTin.find({
    TrangThai: "DELETED",
    updatedAt: { $lt: cutoff },
  }).limit(parseInt(maxFiles));

  let deleted = 0;
  let errors = 0;
  let freedSpace = 0;
  const errorDetails = [];

  for (const file of files) {
    try {
      const fullPath = config.toAbs(file.DuongDan);

      // Xóa file vật lý (ignore nếu không tồn tại)
      await fsp.unlink(fullPath).catch((e) => {
        if (e.code !== "ENOENT") throw e;
      });

      freedSpace += file.KichThuoc || 0;

      // Xóa record khỏi database
      await TepTin.deleteOne({ _id: file._id });
      deleted++;
    } catch (err) {
      errors++;
      errorDetails.push({
        file: file.TenGoc || file.TenFile,
        error: err.message,
      });
    }
  }

  return sendResponse(
    res,
    200,
    true,
    {
      deleted,
      errors,
      freedSpace,
      freedSpaceMB: (freedSpace / 1024 / 1024).toFixed(2),
      errorDetails: errorDetails.slice(0, 10), // Chỉ trả 10 lỗi đầu
    },
    null,
    `Đã xóa ${deleted} files, giải phóng ${(freedSpace / 1024 / 1024).toFixed(2)} MB`,
  );
});

/**
 * GET /files/storage-stats - Thống kê dung lượng chi tiết
 */
controller.getStorageStats = catchAsync(async (req, res) => {
  const stats = await TepTin.aggregate([
    {
      $facet: {
        byStatus: [
          {
            $group: {
              _id: "$TrangThai",
              count: { $sum: 1 },
              totalSize: { $sum: "$KichThuoc" },
            },
          },
        ],
        byType: [
          {
            $match: { TrangThai: "ACTIVE" },
          },
          {
            $group: {
              _id: "$LoaiFile",
              count: { $sum: 1 },
              totalSize: { $sum: "$KichThuoc" },
            },
          },
          {
            $sort: { totalSize: -1 },
          },
          {
            $limit: 10,
          },
        ],
        byMonth: [
          {
            $match: { TrangThai: "ACTIVE" },
          },
          {
            $group: {
              _id: {
                year: { $year: "$NgayTaiLen" },
                month: { $month: "$NgayTaiLen" },
              },
              count: { $sum: 1 },
              totalSize: { $sum: "$KichThuoc" },
            },
          },
          {
            $sort: { "_id.year": -1, "_id.month": -1 },
          },
          {
            $limit: 12,
          },
        ],
        byOwnerType: [
          {
            $match: { TrangThai: "ACTIVE" },
          },
          {
            $group: {
              _id: "$OwnerType",
              count: { $sum: 1 },
              totalSize: { $sum: "$KichThuoc" },
            },
          },
          {
            $sort: { totalSize: -1 },
          },
        ],
      },
    },
  ]);

  // Thử lấy disk space (Linux/Mac only)
  let diskSpace = null;
  if (process.platform !== "win32") {
    try {
      const { exec } = require("child_process");
      const util = require("util");
      const execAsync = util.promisify(exec);

      const { stdout } = await execAsync(
        `df -h ${config.UPLOAD_DIR || "."} | tail -1`,
      );
      const parts = stdout.trim().split(/\s+/);
      diskSpace = {
        total: parts[1],
        used: parts[2],
        available: parts[3],
        usedPercent: parts[4],
      };
    } catch (err) {
      // Ignore if df command fails
    }
  }

  return sendResponse(
    res,
    200,
    true,
    {
      ...stats[0],
      diskSpace,
    },
    null,
    "Thống kê dung lượng thành công",
  );
});

// Admin inline stream: bypass task access checks, admin-only via router middleware
controller.streamInline = catchAsync(async (req, res) => {
  const { id } = req.params;
  const doc = await TepTin.findById(id);
  if (!doc)
    return sendResponse(
      res,
      404,
      false,
      null,
      "NOT_FOUND",
      "Không tìm thấy tệp",
    );
  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);
  const exists = await fsp
    .stat(filePath)
    .then(() => true)
    .catch(() => false);
  if (!exists)
    return sendResponse(
      res,
      404,
      false,
      null,
      "NOT_FOUND",
      "File không tồn tại trên ổ đĩa",
    );

  const ctype =
    mime.lookup(doc.TenGoc) || doc.LoaiFile || "application/octet-stream";
  res.setHeader("Content-Type", ctype);
  const displayName = (
    doc.TenHienThi ||
    doc.TenGoc ||
    doc.TenFile ||
    "file"
  ).replace(/"/g, "'");
  const sanitized = require("sanitize-filename")(displayName) || "file";
  const encoded = encodeURIComponent(displayName)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitized}"; filename*=UTF-8''${encoded}`,
  );
  fs.createReadStream(filePath).pipe(res);
});

controller.streamDownload = catchAsync(async (req, res) => {
  const { id } = req.params;
  const doc = await TepTin.findById(id);
  if (!doc)
    return sendResponse(
      res,
      404,
      false,
      null,
      "NOT_FOUND",
      "Không tìm thấy tệp",
    );
  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);
  const exists = await fsp
    .stat(filePath)
    .then(() => true)
    .catch(() => false);
  if (!exists)
    return sendResponse(
      res,
      404,
      false,
      null,
      "NOT_FOUND",
      "File không tồn tại trên ổ đĩa",
    );

  const ctype =
    mime.lookup(doc.TenGoc) || doc.LoaiFile || "application/octet-stream";
  res.setHeader("Content-Type", ctype);
  const displayName = (
    doc.TenHienThi ||
    doc.TenGoc ||
    doc.TenFile ||
    "download"
  ).replace(/"/g, "'");
  const sanitized = require("sanitize-filename")(displayName) || "download";
  const encoded = encodeURIComponent(displayName)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`,
  );
  fs.createReadStream(filePath).pipe(res);
});

module.exports = controller;
