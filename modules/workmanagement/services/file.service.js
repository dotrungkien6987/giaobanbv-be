const path = require("path");
const fs = require("fs-extra");
const mime = require("mime-types");
const mongoose = require("mongoose");
const TepTin = require("../models/TepTin");
const CongViec = require("../models/CongViec");
const BinhLuan = require("../models/BinhLuan");
const { AppError } = require("../../../helpers/utils");
const {
  canAccessCongViec,
  canDeleteFile,
} = require("../helpers/filePermissions");
const config = require("../helpers/uploadConfig");

function toObjectId(id) {
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
}

async function assertAccess(congViecId, req) {
  const userModel = require("../../../models/User");
  const user = await userModel.findById(req.userId).lean();
  if (!user) throw new AppError(401, "Không xác thực người dùng");
  const isAdmin = user.PhanQuyen === "admin" || user.PhanQuyen === "manager";
  const nhanVienId = user.NhanVienID;
  const ok = await canAccessCongViec(congViecId, nhanVienId, isAdmin);
  if (!ok) throw new AppError(403, "Không có quyền truy cập công việc này");
  return { user, isAdmin, nhanVienId };
}

const service = {};

function decodeOriginalNameToUtf8(name) {
  try {
    if (!name) return "file";
    // If the string round-trips as UTF-8, assume it's already correct
    const round = Buffer.from(name, "utf8").toString("utf8");
    if (round === name) return name;
    // Otherwise try latin1 -> utf8
    const converted = Buffer.from(name, "latin1").toString("utf8");
    return converted || name;
  } catch (e) {
    return name;
  }
}

function encodeRFC5987ValueChars(str) {
  return encodeURIComponent(str)
    .replace(/['()]/g, escape)
    .replace(/\*/g, "%2A");
}

function toAsciiFilename(name, fallback = "file") {
  try {
    if (!name) return fallback;
    // Remove CR/LF just in case
    let s = String(name).replace(/[\r\n]/g, " ");
    // Strip accents
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    // Remove any non-ASCII
    s = s.replace(/[^\x20-\x7E]/g, "");
    // Collapse spaces
    s = s.replace(/\s+/g, " ").trim();
    const sanitized = require("sanitize-filename")(s);
    return sanitized || fallback;
  } catch {
    return fallback;
  }
}

service.uploadForTask = async (
  congViecId,
  files,
  { moTa },
  req,
  binhLuanId = null
) => {
  if (!mongoose.Types.ObjectId.isValid(congViecId))
    throw new AppError(400, "CongViecID không hợp lệ");
  const cv = await CongViec.findById(congViecId);
  if (!cv || cv.isDeleted) throw new AppError(404, "Không tìm thấy công việc");
  const { nhanVienId } = await assertAccess(congViecId, req);

  const items = [];
  for (const f of files || []) {
    // Prefer name normalized by upload middleware if provided
    const tenGocUtf8 = decodeOriginalNameToUtf8(
      f.originalnameUtf8 || f.originalname
    );
    let doc = await TepTin.create({
      TenFile: path.basename(f.filename || f.path),
      TenGoc: (tenGocUtf8 || "file").trim(),
      LoaiFile: f.mimetype,
      KichThuoc: f.size,
      DuongDan: f.path,
      CongViecID: toObjectId(congViecId),
      BinhLuanID: binhLuanId ? toObjectId(binhLuanId) : undefined,
      NguoiTaiLenID: toObjectId(nhanVienId),
      MoTa: moTa || "",
    });
    // Populate uploader so FE can display name/avatar immediately after upload
    doc = await doc.populate(
      "NguoiTaiLenID",
      "Ten HoTen MaNhanVien AnhDaiDien"
    );
    items.push(doc);
  }

  return items.map((d) => service.toDTO(d));
};

service.createCommentWithFiles = async (
  congViecId,
  noiDung,
  files,
  req,
  parentId = null
) => {
  const { nhanVienId } = await assertAccess(congViecId, req);
  const comment = await BinhLuan.create({
    NoiDung: typeof noiDung === "string" ? noiDung.trim() : "",
    CongViecID: toObjectId(congViecId),
    NguoiBinhLuanID: toObjectId(req.userId),
    BinhLuanChaID: parentId ? toObjectId(parentId) : undefined,
  });
  const filesDTO = await service.uploadForTask(
    congViecId,
    files,
    { moTa: "" },
    req,
    comment._id
  );
  // Enrich commenter display name from NhanVien or fallback to User
  const userModel = require("../../../models/User");
  const user = await userModel
    .findById(req.userId)
    .populate({ path: "NhanVienID", select: "Ten" })
    .lean();
  const tenNguoiBinhLuan =
    (user && user.NhanVienID && user.NhanVienID.Ten) ||
    (user && user.HoTen) ||
    (user && user.UserName) ||
    "Người dùng";
  const base = comment.toObject();
  return {
    _id: String(base._id),
    CongViecID: String(base.CongViecID),
    BinhLuanChaID: base.BinhLuanChaID ? String(base.BinhLuanChaID) : null,
    NguoiBinhLuanID: String(req.userId),
    NoiDung: base.NoiDung,
    NguoiBinhLuan: { Ten: tenNguoiBinhLuan },
    NgayBinhLuan: base.NgayBinhLuan || base.createdAt || new Date(),
    TrangThai: base.TrangThai || "ACTIVE",
    Files: filesDTO,
  };
};

service.listByTask = async (congViecId, { page = 1, size = 50 } = {}, req) => {
  await assertAccess(congViecId, req);
  const skip = (Math.max(1, +page) - 1) * Math.max(1, +size);
  const [items, total] = await Promise.all([
    TepTin.find({ CongViecID: congViecId, TrangThai: "ACTIVE" })
      // Populate uploader employee fields used by FE
      .populate("NguoiTaiLenID", "Ten HoTen MaNhanVien AnhDaiDien")
      .sort({ NgayTaiLen: -1 })
      .skip(skip)
      .limit(Math.max(1, +size)),
    TepTin.countDocuments({ CongViecID: congViecId, TrangThai: "ACTIVE" }),
  ]);
  return { items: items.map(service.toDTO), total };
};

service.listByComment = async (binhLuanId, req) => {
  const file = await BinhLuan.findById(binhLuanId).lean();
  if (!file) throw new AppError(404, "Không tìm thấy bình luận");
  await assertAccess(file.CongViecID, req);
  const items = await TepTin.find({
    BinhLuanID: binhLuanId,
    TrangThai: "ACTIVE",
  })
    .populate("NguoiTaiLenID", "Ten HoTen MaNhanVien AnhDaiDien")
    .sort({ NgayTaiLen: -1 });
  return items.map(service.toDTO);
};

service.countByTask = async (congViecId, req) => {
  await assertAccess(congViecId, req);
  return TepTin.countDocuments({ CongViecID: congViecId, TrangThai: "ACTIVE" });
};

service.softDelete = async (fileId, req) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  const { isAdmin, nhanVienId } = await (async () => {
    const user = await require("../../../models/User")
      .findById(req.userId)
      .lean();
    return {
      isAdmin:
        user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager"),
      nhanVienId: user && user.NhanVienID,
    };
  })();
  if (!canDeleteFile(doc, nhanVienId, isAdmin))
    throw new AppError(403, "Không có quyền xóa");
  doc.TrangThai = "DELETED";
  await doc.save();
  return service.toDTO(doc);
};

service.renameOrUpdateDesc = async (fileId, { TenGoc, MoTa }, req) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  const { isAdmin, nhanVienId } = await (async () => {
    const user = await require("../../../models/User")
      .findById(req.userId)
      .lean();
    return {
      isAdmin:
        user && (user.PhanQuyen === "admin" || user.PhanQuyen === "manager"),
      nhanVienId: user && user.NhanVienID,
    };
  })();
  if (!canDeleteFile(doc, nhanVienId, isAdmin))
    throw new AppError(403, "Không có quyền cập nhật");
  if (typeof TenGoc === "string" && TenGoc.trim()) doc.TenGoc = TenGoc.trim();
  if (typeof MoTa === "string") doc.MoTa = MoTa;
  await doc.save();
  return service.toDTO(doc);
};

service.streamInline = async (fileId, req, res) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  await assertAccess(doc.CongViecID, req);
  const filePath = doc.DuongDan;
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
  return fs.createReadStream(filePath);
};

service.streamDownload = async (fileId, req, res) => {
  const doc = await TepTin.findById(fileId);
  if (!doc || doc.TrangThai === "DELETED")
    throw new AppError(404, "Không tìm thấy tệp");
  await assertAccess(doc.CongViecID, req);
  const filePath = doc.DuongDan;
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
  return fs.createReadStream(filePath);
};

service.toDTO = (doc) => {
  const d = doc.toObject ? doc.toObject() : doc;
  // If populated, NguoiTaiLenID will be an object; otherwise it's an id
  const uploaderPop =
    d &&
    d.NguoiTaiLenID &&
    typeof d.NguoiTaiLenID === "object" &&
    d.NguoiTaiLenID._id
      ? d.NguoiTaiLenID
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
    : d.NguoiTaiLenID
    ? String(d.NguoiTaiLenID)
    : null;

  return {
    _id: String(d._id),
    TenFile: d.TenFile,
    TenGoc: d.TenGoc,
    LoaiFile: d.LoaiFile,
    KichThuoc: d.KichThuoc,
    DuongDan: d.DuongDan,
    CongViecID: d.CongViecID ? String(d.CongViecID) : null,
    BinhLuanID: d.BinhLuanID ? String(d.BinhLuanID) : null,
    NguoiTaiLenID: uploaderId,
    // New: structured uploader info for FE display
    NguoiTaiLen: uploader,
    // Convenience fallback name (for legacy FE)
    NguoiTaiLenName:
      uploader && (uploader.Ten || uploader.HoTen)
        ? uploader.Ten || uploader.HoTen
        : undefined,
    MoTa: d.MoTa || "",
    TrangThai: d.TrangThai,
    NgayTaiLen: d.NgayTaiLen || d.createdAt,
    inlineUrl: `/api/workmanagement/files/${d._id}/inline`,
    downloadUrl: `/api/workmanagement/files/${d._id}/download`,
  };
};

module.exports = service;
