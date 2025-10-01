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
    "Lấy danh sách tệp (admin) thành công"
  );
});

controller.stats = catchAsync(async (req, res) => {
  const [byType, sizeStatsArr] = await Promise.all([
    TepTin.thongKeTheoLoaiFile(),
    TepTin.thongKeKichThuoc(),
  ]);
  const sizeStats = (sizeStatsArr && sizeStatsArr[0]) || {
    tongKichThuoc: 0,
    soLuongFile: 0,
    kichThuocTrungBinh: 0,
  };
  return sendResponse(
    res,
    200,
    true,
    { byType, sizeStats },
    null,
    "Thống kê tệp (admin) thành công"
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
      "Không tìm thấy tệp"
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
    "Phục hồi tệp thành công"
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
      "Không tìm thấy tệp"
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
    "Đã xóa mềm tệp"
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
          { $set: { TrangThai: "DELETED" } }
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
    "Dọn dẹp xong"
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
      "Không tìm thấy tệp"
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
      "File không tồn tại trên ổ đĩa"
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
    `inline; filename="${sanitized}"; filename*=UTF-8''${encoded}`
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
      "Không tìm thấy tệp"
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
      "File không tồn tại trên ổ đĩa"
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
    `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`
  );
  fs.createReadStream(filePath).pipe(res);
});

module.exports = controller;
