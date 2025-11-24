const path = require("path");
const fs = require("fs-extra");
const mime = require("mime-types");
const mongoose = require("mongoose");
const TepTin = require("../models/TepTin");
const { AppError } = require("../../../helpers/utils");
const config = require("../helpers/uploadConfig");

function toAsciiFilename(name, fallback = "file") {
  try {
    if (!name) return fallback;
    let s = String(name).replace(/[\r\n]/g, " ");
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/[^\x20-\x7E]/g, "");
    s = s.replace(/\s+/g, " ").trim();
    const sanitized = require("sanitize-filename")(s);
    return sanitized || fallback;
  } catch {
    return fallback;
  }
}

function encodeRFC5987ValueChars(str) {
  return encodeURIComponent(str)
    .replace(/[\'()]/g, escape)
    .replace(/\*/g, "%2A");
}

function canAccessGeneric(ownerType, ownerId, req) {
  // For now, generic attachments require login only; no further ACL
  // You can expand here per ownerType in future.
  if (!req.userId) return false;
  return Boolean(ownerType && ownerId);
}

const svc = {};

svc.upload = async (ownerType, ownerId, field, files, { moTa }, req) => {
  if (!canAccessGeneric(ownerType, ownerId, req))
    throw new AppError(403, "Không có quyền truy cập");
  const userModel = require("../../../models/User");
  const user = await userModel.findById(req.userId).lean();
  if (!user) throw new AppError(401, "Không xác thực người dùng");
  if (!user.NhanVienID)
    throw new AppError(
      400,
      "Tài khoản chưa liên kết nhân viên, không thể tải tệp"
    );

  const items = [];
  for (const f of files || []) {
    // Compute relative path similar to workmanagement service
    let relPath;
    try {
      const root = path.resolve(config.UPLOAD_DIR);
      const abs = path.resolve(f.path);
      const candidate = path.relative(root, abs);
      relPath =
        candidate && !candidate.startsWith("..")
          ? candidate
          : f.filename || path.basename(abs);
    } catch {
      relPath = f.filename || path.basename(f.path);
    }

    let doc = await TepTin.create({
      TenFile: path.basename(f.filename || f.path),
      TenGoc: (f.originalnameUtf8 || f.originalname || "file").trim(),
      LoaiFile: f.mimetype,
      KichThuoc: f.size,
      DuongDan: relPath,
      OwnerType: String(ownerType).toLowerCase(),
      OwnerID: String(ownerId),
      OwnerField: String(field || "default").toLowerCase(),
      NguoiTaiLenID: new mongoose.Types.ObjectId(user.NhanVienID),
      MoTa: moTa || "",
    });
    doc = await doc.populate(
      "NguoiTaiLenID",
      "Ten HoTen MaNhanVien AnhDaiDien"
    );
    items.push(svc.toDTO(doc));
  }
  return items;
};

svc.list = async (
  ownerType,
  ownerId,
  field,
  { page = 1, size = 50 } = {},
  req
) => {
  if (!canAccessGeneric(ownerType, ownerId, req))
    throw new AppError(403, "Không có quyền truy cập");
  const skip = (Math.max(1, +page) - 1) * Math.max(1, +size);
  const query = {
    OwnerType: String(ownerType).toLowerCase(),
    OwnerID: String(ownerId),
    TrangThai: "ACTIVE",
  };
  if (field) query.OwnerField = String(field).toLowerCase();
  const [items, total] = await Promise.all([
    TepTin.find(query)
      .populate("NguoiTaiLenID", "Ten HoTen MaNhanVien AnhDaiDien")
      .sort({ NgayTaiLen: -1 })
      .skip(skip)
      .limit(Math.max(1, +size)),
    TepTin.countDocuments(query),
  ]);
  return { items: items.map(svc.toDTO), total };
};

svc.count = async (ownerType, ownerId, field, req) => {
  if (!canAccessGeneric(ownerType, ownerId, req))
    throw new AppError(403, "Không có quyền truy cập");
  const query = {
    OwnerType: String(ownerType).toLowerCase(),
    OwnerID: String(ownerId),
    TrangThai: "ACTIVE",
  };
  if (field) query.OwnerField = String(field).toLowerCase();
  return TepTin.countDocuments(query);
};

// Batch count many ownerIDs
svc.batchCount = async (ownerType, field, ids, req) => {
  if (!req.userId) throw new AppError(401, "Không xác thực người dùng");
  const oType = String(ownerType || "").toLowerCase();
  const f = String(field || "default").toLowerCase();
  const out = {};
  if (!oType || !Array.isArray(ids) || !ids.length) return out;
  const cursor = await TepTin.aggregate([
    {
      $match: {
        OwnerType: oType,
        OwnerField: f,
        TrangThai: "ACTIVE",
        OwnerID: { $in: ids.map(String) },
      },
    },
    { $group: { _id: "$OwnerID", total: { $sum: 1 } } },
  ]);
  cursor.forEach((r) => {
    out[r._id] = r.total;
  });
  // Bảo đảm id nào không có tệp trả 0? → Frontend có thể coi undefined là 0.
  return out; // { ownerId: count }
};

// Batch preview first N files per ownerID
svc.batchPreview = async (ownerType, field, ids, limit, req) => {
  if (!req.userId) throw new AppError(401, "Không xác thực người dùng");
  const oType = String(ownerType || "").toLowerCase();
  const f = String(field || "default").toLowerCase();
  const lim = Math.max(1, Math.min(+limit || 3, 10));
  const out = {};
  if (!oType || !Array.isArray(ids) || !ids.length) return out;

  // Lấy gọn bằng $match + $sort + $group giữ topN: dùng $setWindowFields (Mongo >=5) hoặc fallback truy vấn nhiều.
  // Fallback dễ hiểu: query từng id (vì số ids thường nhỏ ở một trang) nhưng vẫn giảm số field trả về.
  // Nếu ids lớn, có thể tối ưu bằng aggregate pipeline phức tạp hơn.
  for (const ownerId of ids) {
    const docs = await TepTin.find({
      OwnerType: oType,
      OwnerField: f,
      OwnerID: String(ownerId),
      TrangThai: "ACTIVE",
    })
      .sort({ NgayTaiLen: -1 })
      .limit(lim)
      .select("TenGoc TenFile LoaiFile KichThuoc OwnerID OwnerType OwnerField")
      .lean();
    out[String(ownerId)] = docs.map((d) => ({
      _id: String(d._id),
      TenGoc: d.TenGoc,
      TenFile: d.TenFile,
      LoaiFile: d.LoaiFile,
      KichThuoc: d.KichThuoc,
    }));
  }
  return out; // { ownerId: [ { _id, TenGoc, ... } ] }
};

svc.softDelete = async (fileId, req) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  // Same rule as WM: uploader or admin can delete; for now, check user's role
  const user = await require("../../../models/User")
    .findById(req.userId)
    .lean();
  const isAdmin =
    user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager");
  const nhanVienId = user && user.NhanVienID;
  if (!isAdmin && String(doc.NguoiTaiLenID) !== String(nhanVienId || ""))
    throw new AppError(403, "Không có quyền xóa");
  doc.TrangThai = "DELETED";
  await doc.save();
  return svc.toDTO(doc);
};

svc.renameOrUpdateDesc = async (fileId, { TenGoc, MoTa }, req) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  const user = await require("../../../models/User")
    .findById(req.userId)
    .lean();
  const isAdmin =
    user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager");
  const nhanVienId = user && user.NhanVienID;
  if (!isAdmin && String(doc.NguoiTaiLenID) !== String(nhanVienId || ""))
    throw new AppError(403, "Không có quyền cập nhật");
  if (typeof TenGoc === "string" && TenGoc.trim()) doc.TenGoc = TenGoc.trim();
  if (typeof MoTa === "string") doc.MoTa = MoTa;
  await doc.save();
  return svc.toDTO(doc);
};

svc.streamInline = async (fileId, req, res) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  // For generic, only login required; optionally expand ACL by ownerType later
  if (!req.userId) throw new AppError(401, "Không xác thực người dùng");
  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);

  // Check file existence before streaming to prevent ENOENT crash
  const fileExists = await fs.pathExists(filePath);
  if (!fileExists) {
    throw new AppError(
      410,
      `Tệp không tồn tại trên hệ thống lưu trữ (ID: ${fileId})`
    );
  }

  const ctype =
    mime.lookup(doc.TenGoc) || doc.LoaiFile || "application/octet-stream";
  res.setHeader("Content-Type", ctype);
  const displayName = (
    doc.TenHienThi ||
    doc.TenGoc ||
    doc.TenFile ||
    "file"
  ).replace(/"/g, "'");
  const sanitized = toAsciiFilename(displayName, "file");
  const encoded = encodeRFC5987ValueChars(displayName);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${sanitized}"; filename*=UTF-8''${encoded}`
  );

  const stream = fs.createReadStream(filePath);
  // Prevent unhandled error crash
  stream.on("error", (err) => {
    console.error(`Stream error for file ${fileId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { message: "Lỗi khi đọc tệp" },
      });
    }
  });
  return stream;
};

svc.streamDownload = async (fileId, req, res) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  if (!req.userId) throw new AppError(401, "Không xác thực người dùng");
  const filePath = path.isAbsolute(doc.DuongDan)
    ? doc.DuongDan
    : config.toAbs(doc.DuongDan);

  // Check file existence before streaming to prevent ENOENT crash
  const fileExists = await fs.pathExists(filePath);
  if (!fileExists) {
    throw new AppError(
      410,
      `Tệp không tồn tại trên hệ thống lưu trữ (ID: ${fileId})`
    );
  }

  const ctype =
    mime.lookup(doc.TenGoc) || doc.LoaiFile || "application/octet-stream";
  res.setHeader("Content-Type", ctype);
  const displayName = (
    doc.TenHienThi ||
    doc.TenGoc ||
    doc.TenFile ||
    "download"
  ).replace(/"/g, "'");
  const sanitized = toAsciiFilename(displayName, "download");
  const encoded = encodeRFC5987ValueChars(displayName);
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${sanitized}"; filename*=UTF-8''${encoded}`
  );

  const stream = fs.createReadStream(filePath);
  // Prevent unhandled error crash
  stream.on("error", (err) => {
    console.error(`Stream error for file ${fileId}:`, err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { message: "Lỗi khi đọc tệp" },
      });
    }
  });
  return stream;
};

svc.toDTO = (d) => {
  const doc = d.toObject ? d.toObject() : d;
  const uploaderPop =
    doc &&
    doc.NguoiTaiLenID &&
    typeof doc.NguoiTaiLenID === "object" &&
    doc.NguoiTaiLenID._id
      ? doc.NguoiTaiLenID
      : null;
  const uploader = uploaderPop
    ? {
        _id: String(uploaderPop._id),
        Ten:
          uploaderPop.Ten ||
          uploaderPop.HoTen ||
          uploaderPop.name ||
          uploaderPop.FullName ||
          undefined,
        HoTen: uploaderPop.HoTen || undefined,
        MaNhanVien: uploaderPop.MaNhanVien || undefined,
        AnhDaiDien: uploaderPop.AnhDaiDien || undefined,
      }
    : null;
  const uploaderId = uploaderPop
    ? String(uploaderPop._id)
    : doc.NguoiTaiLenID
    ? String(doc.NguoiTaiLenID)
    : null;

  return {
    _id: String(doc._id),
    TenFile: doc.TenFile,
    TenGoc: doc.TenGoc,
    LoaiFile: doc.LoaiFile,
    KichThuoc: doc.KichThuoc,
    DuongDan: doc.DuongDan,
    OwnerType: doc.OwnerType || null,
    OwnerID: doc.OwnerID || null,
    OwnerField: doc.OwnerField || "default",
    NguoiTaiLenID: uploaderId,
    NguoiTaiLen: uploader,
    MoTa: doc.MoTa || "",
    TrangThai: doc.TrangThai,
    NgayTaiLen: doc.NgayTaiLen || doc.createdAt,
    inlineUrl: `/api/attachments/files/${doc._id}/inline`,
    downloadUrl: `/api/attachments/files/${doc._id}/download`,
  };
};

module.exports = svc;
